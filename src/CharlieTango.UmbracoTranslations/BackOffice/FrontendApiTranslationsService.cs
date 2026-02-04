using CharlieTango.UmbracoTranslations.Extensions;
using Umbraco.Cms.Core.Services;

namespace CharlieTango.UmbracoTranslations.BackOffice;

public sealed class FrontendApiTranslationsService(ApiClient.UmbracoTranslationsApiClient frontendUmbracoTranslationsApiClient, ILanguageService languageService) : IStringTranslationsService
{
    public async Task<Dictionary<string, Dictionary<string, string>>> GetManyAsync(CancellationToken cancellationToken = default)
    {
        var languages = await languageService.GetAllAsync();
        var cultures = languages.Select(language => language.IsoCode).ToArray();
        var dictionary = await frontendUmbracoTranslationsApiClient.GetTranslationsAsync(cultures, cancellationToken);

        return dictionary.ToDictionary(
            kvp => kvp.Key,
            kvp => kvp.Value!.FlattenToSortedDictionary().ToDictionary(
                kv => kv.Key,
                kv => kv.Value!.ToString()));
    }

    public async Task<Dictionary<string, string>> GetManyAsync(string culture, CancellationToken cancellationToken = default)
    {
        return (await GetManyAsync(cancellationToken)).GetValueOrDefault(culture, new Dictionary<string, string>());
    }

    public async Task<string> GetAsync(string key, string culture, CancellationToken cancellationToken = default)
    {
        return (await GetManyAsync(culture, cancellationToken)).GetValueOrDefault(key, string.Empty);
    }

    /// <summary>
    /// Flattens a nested dictionary into a single-level dictionary
    /// using dot-separated key paths.
    /// </summary>
    /// <param name="source">The source dictionary to flatten.</param>
    /// <returns>
    /// A flattened dictionary where keys represent the full dot-separated path.
    /// </returns>
    public static IDictionary<string, object> Flatten(
        IDictionary<string, object> source)
    {
        if (source is null)
        {
            throw new ArgumentNullException(nameof(source));
        }

        var result = new Dictionary<string, object>(StringComparer.Ordinal);
        FlattenInternal(source, parentPath: null, result);
        return result;
    }

    private static void FlattenInternal(
        IDictionary<string, object> source,
        string? parentPath,
        IDictionary<string, object> result)
    {
        foreach (var (key, value) in source)
        {
            var currentPath = parentPath is null
                ? key
                : $"{parentPath}.{key}";

            if (value is IDictionary<string, object> nested)
            {
                FlattenInternal(nested, currentPath, result);
                continue;
            }

            result[currentPath] = value;
        }
    }

}
