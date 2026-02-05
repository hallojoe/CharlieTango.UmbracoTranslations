using System.Diagnostics.CodeAnalysis;

namespace CharlieTango.UmbracoTranslations.ApiClient.Configuration;

/// <summary>
/// Represents the configuration settings required for the API client used to interact
/// with UmbracoTranslations. This class provides properties to define the base URL,
/// endpoints, timeout values, and headers needed for communicating with the API.
/// </summary>
public class ApiSettings
{
    /// <summary>
    /// The key used to locate the configuration section for API settings,
    /// e.g., "UmbracoTranslations.UmbracoTranslationsApiClient".
    /// </summary>
    public const string Key = "UmbracoTranslations:UmbracoTranslationsApiClient";

    /// <summary>
    /// Base URL of the API, e.g., "https://example.com/api/TranslationsApi/"
    /// </summary>
    [NotNull]
    public string? BaseUrl { get; set; }

    /// <summary>
    /// The relative path or URI segment that specifies the API endpoint for fetching translations.
    /// This property is used to construct the complete request URL by combining it with the base URL.
    /// </summary>
    [NotNull]
    public string? TranslationsEndpoint { get; set; }

    /// <summary>
    /// Timeout duration in seconds for API requests. Determines the maximum time to wait for a response.
    /// </summary>
    public int TimeoutInSeconds { get; set; } = 10;

    /// <summary>
    /// A collection of key-value pairs representing the headers to be included in API requests.
    /// Example headers include content type and custom headers such as "X-Umbraco-Request".
    /// </summary>
    public Dictionary<string, string> Headers { get; set; } = new()
    {
        ["Accept"] = "application/json",
        ["X-Umbraco-Request"] = "true",
    };
}
