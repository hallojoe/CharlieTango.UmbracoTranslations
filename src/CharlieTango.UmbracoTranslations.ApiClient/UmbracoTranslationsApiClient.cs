using System.Diagnostics;
using System.Text.Json;
using CharlieTango.UmbracoTranslations.ApiClient.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CharlieTango.UmbracoTranslations.ApiClient;

public sealed class UmbracoTranslationsApiClient(
    ILogger<UmbracoTranslationsApiClient> logger,
    IOptions<ApiSettings> frontendApiOptions,
    HttpClient httpClient)
{
    private static string Truncate(string value, int maxLength)
    {
        if (string.IsNullOrEmpty(value))
        {
            return value;
        }

        return value.Length <= maxLength ? value : value[..maxLength] + "...(truncated)";
    }

    private static double GetElapsedMilliseconds(long startTimestamp)
    {
        var elapsedTicks = Stopwatch.GetTimestamp() - startTimestamp;
        return elapsedTicks * 1000.0 / Stopwatch.Frequency;
    }

    private async Task<string> GetStringAsync(
        string requestUri,
        string operationName,
        CancellationToken cancellationToken = default)
    {
        var correlationId = Guid.NewGuid().ToString("N");
        var method = HttpMethod.Get;
        var startTimestamp = Stopwatch.GetTimestamp();

        var effectiveUri = httpClient.BaseAddress != null
            ? new Uri(httpClient.BaseAddress, requestUri)
            : new Uri(requestUri, UriKind.RelativeOrAbsolute);

        logger.LogInformation(
            "Starting {Operation} (CorrelationId: {CorrelationId}). Method: {Method}, RequestUri: {RequestUri}, Timeout: {Timeout}",
            operationName,
            correlationId,
            method,
            effectiveUri,
            httpClient.Timeout);

        try
        {
            using var response = await httpClient.GetAsync(requestUri, cancellationToken);
            var elapsedMs = GetElapsedMilliseconds(startTimestamp);

            var content = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var snippet = Truncate(content, 2000);

                logger.LogWarning(
                    "Non-success HTTP status during {Operation} (CorrelationId: {CorrelationId}). " +
                    "StatusCode: {StatusCode} ({ReasonPhrase}). ElapsedMs: {ElapsedMs}. " +
                    "ResponseHeaders: {ResponseHeaders}. ContentSnippet: {ContentSnippet}",
                    operationName,
                    correlationId,
                    (int)response.StatusCode,
                    response.ReasonPhrase,
                    elapsedMs,
                    response.Headers.ToString(),
                    snippet);

                throw new HttpRequestException(
                    $"HTTP {response.StatusCode} ({(int)response.StatusCode}) while performing {operationName}.");
            }

            logger.LogInformation(
                "Completed {Operation} successfully (CorrelationId: {CorrelationId}). StatusCode: {StatusCode}. ElapsedMs: {ElapsedMs}. ContentLength: {ContentLength}",
                operationName,
                correlationId,
                (int)response.StatusCode,
                elapsedMs,
                content.Length);

            return content;
        }
        catch (HttpRequestException httpEx)
        {
            var elapsedMs = GetElapsedMilliseconds(startTimestamp);

            logger.LogError(
                httpEx,
                "HTTP request exception during {Operation} (CorrelationId: {CorrelationId}). ElapsedMs: {ElapsedMs}. " +
                "InnerException: {InnerExceptionType} - {InnerExceptionMessage}",
                operationName,
                correlationId,
                elapsedMs,
                httpEx.InnerException?.GetType().FullName,
                httpEx.InnerException?.Message);

            throw;
        }
        catch (TaskCanceledException taskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            // Most likely a timeout
            var elapsedMs = GetElapsedMilliseconds(startTimestamp);

            logger.LogError(
                taskCanceledException,
                "HTTP timeout during {Operation} (CorrelationId: {CorrelationId}). Timeout: {Timeout}. ElapsedMs: {ElapsedMs}.",
                operationName,
                correlationId,
                httpClient.Timeout,
                elapsedMs);

            throw;
        }
        catch (Exception ex)
        {
            var elapsedMs = GetElapsedMilliseconds(startTimestamp);

            logger.LogError(
                ex,
                "Unexpected error during {Operation} (CorrelationId: {CorrelationId}). ElapsedMs: {ElapsedMs}.",
                operationName,
                correlationId,
                elapsedMs);

            throw;
        }
    }

    private async Task<string> GetTranslationsJsonTextAsync(string culture, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(culture))
        {
            const string msg = "Provided culture string is null or empty.";

            logger.LogWarning(msg);
            throw new ArgumentException(msg, nameof(culture));
        }

        var endpointPath = frontendApiOptions.Value.TranslationsEndpoint.Trim('/');
        if (string.IsNullOrWhiteSpace(endpointPath))
        {
            const string msg = "TranslationsEndpoint is not configured.";
            logger.LogError(msg);
            throw new InvalidOperationException(msg);
        }

        var requestUri = $"{endpointPath}/{Uri.EscapeDataString(culture)}";

        return await GetStringAsync(requestUri, $"GetTranslationsJson({culture})", cancellationToken);
    }

    public async Task<Dictionary<string, object>> GetTranslationsAsync(
        string culture,
        CancellationToken cancellationToken = default)
    {
        var jsonText = await GetTranslationsJsonTextAsync(culture, cancellationToken);

        try
        {
            var result = JsonSerializer.Deserialize<Dictionary<string, object>>(jsonText);

            if (result is { Count: > 0 } is false)
            {
                logger.LogWarning(
                    "Translation response for culture '{Culture}' was successfully received but deserialized to null or empty. RawContent: {Content}",
                    culture,
                    Truncate(jsonText, 2000));
            }
            else
            {
                logger.LogInformation("Successfully fetched and deserialized translations for culture '{Culture}'. Count: {Count}",
                    culture,
                    result.Count);
            }

            return result ?? new Dictionary<string, object>();
        }
        catch (Exception exception)
        {
            logger.LogError(
                exception,
                "Failed to deserialize JSON response for culture '{Culture}'. RawContent: {Content}",
                culture,
                Truncate(jsonText, 2000));

            throw new InvalidOperationException(
                $"Deserialization failed for translations JSON for culture '{culture}'",
                exception);
        }
    }

    public async Task<Dictionary<string, Dictionary<string, object>>> GetTranslationsAsync(
        string[] cultures,
        CancellationToken cancellationToken = default)
    {
        var result = new Dictionary<string, Dictionary<string, object>>();

        foreach (var culture in cultures)
        {
            var cultureResult = await GetTranslationsAsync(culture, cancellationToken);
            result[culture] = cultureResult;
        }

        return result;
    }
}
