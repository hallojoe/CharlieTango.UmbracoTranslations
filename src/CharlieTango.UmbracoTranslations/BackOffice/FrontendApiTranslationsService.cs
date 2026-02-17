using CharlieTango.UmbracoTranslations.Extensions;
using Umbraco.Cms.Core.Services;

namespace CharlieTango.UmbracoTranslations.BackOffice;

public sealed class FrontendApiTranslationsService(ApiClient.UmbracoTranslationsApiClient frontendUmbracoTranslationsApiClient, ILanguageService languageService) : IStringTranslationsService
{
    public async Task<Dictionary<string, Dictionary<string, string?>>> GetManyAsync(CancellationToken cancellationToken = default)
    {
        // ILanguageService.GetAllAsync() has no CancellationToken overload; guard before/after.
        cancellationToken.ThrowIfCancellationRequested();
        var languages = await languageService.GetAllAsync();
        cancellationToken.ThrowIfCancellationRequested();
        var cultures = languages.Select(language => language.IsoCode).ToArray();
        var dictionary = await frontendUmbracoTranslationsApiClient.GetTranslationsAsync(cultures, cancellationToken);

        return dictionary.ToDictionary(
            kvp => kvp.Key,
            kvp =>
            {
                if (kvp.Value is null)
                {
                    return new Dictionary<string, string?>(StringComparer.Ordinal);
                }

                return kvp.Value
                    .FlattenToSortedDictionary()
                    .ToDictionary(kv => kv.Key, kv => kv.Value, StringComparer.Ordinal);
            });
    }

    public async Task<Dictionary<string, string?>> GetManyAsync(string culture, CancellationToken cancellationToken = default)
    {
        return (await GetManyAsync(cancellationToken)).GetValueOrDefault(culture, new Dictionary<string, string?>());
    }

    public async Task<string?> GetAsync(string key, string culture, CancellationToken cancellationToken = default)
    {
        var cultureDictionary = await GetManyAsync(culture, cancellationToken);
        return cultureDictionary.GetValueOrDefault(key);
    }
}
