using Umbraco.Cms.Core.Services;

namespace CharlieTango.UmbracoTranslations.BackOffice;

#pragma warning disable CS0618
public sealed class CmsTranslationsService(ILocalizationService localizationService)
#pragma warning restore CS0618 // Type or member is obsolete, but we need to use it anyway because umbraco does not provide alternative.
    : IStringTranslationsService
{
    public Task<Dictionary<string, Dictionary<string, string>>> GetManyAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

#pragma warning disable CS0618 // Type or member is obsolete, but we need to use it anyway because umbraco does not provide alternative.
        var dictionaryItemDescendants = localizationService.GetDictionaryItemDescendants(parentId: null);
#pragma warning restore CS0618 // Type or member is obsolete, but we need to use it anyway because umbraco does not provide alternative.

        var result = new Dictionary<string, Dictionary<string, string>>(StringComparer.OrdinalIgnoreCase);

        foreach (var dictionaryItem in dictionaryItemDescendants)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var itemKey = dictionaryItem.ItemKey;

            foreach (var dictionaryTranslation in dictionaryItem.Translations)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var culture = dictionaryTranslation.LanguageIsoCode;
                if (string.IsNullOrWhiteSpace(culture))
                {
                    continue;
                }

                if (!result.TryGetValue(culture, out var cultureDictionary))
                {
                    cultureDictionary = new Dictionary<string, string>(StringComparer.Ordinal);
                    result[culture] = cultureDictionary;
                }

                // Last write wins within Umbraco’s own set (should be unique anyway)
                cultureDictionary[itemKey] = dictionaryTranslation.Value;
            }
        }

        return Task.FromResult(result);
    }

    public Task<Dictionary<string, string>> GetManyAsync(string culture, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(culture))
        {
            throw new ArgumentException("Culture must be provided.", nameof(culture));
        }

        cancellationToken.ThrowIfCancellationRequested();

#pragma warning disable CS0618 // Type or member is obsolete, but we need to use it anyway because Umbraco does not provide alternative.
        var dictionaryItemDescendants = localizationService.GetDictionaryItemDescendants(parentId: null);
#pragma warning restore CS0618 // Type or member is obsolete, but we need to use it anyway because Umbraco does not provide alternative.
        var result = new Dictionary<string, string>(StringComparer.Ordinal);

        foreach (var dictionaryItem in dictionaryItemDescendants)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var dictionaryTranslation = (dictionaryItem.Translations)
                .FirstOrDefault(x => string.Equals(x.LanguageIsoCode, culture, StringComparison.OrdinalIgnoreCase));

            if (dictionaryTranslation is null)
            {
                continue;
            }

            result[dictionaryItem.ItemKey] = dictionaryTranslation.Value;
        }

        return Task.FromResult(result);
    }

    public Task<string> GetAsync(string key, string culture, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new ArgumentException("Key must be provided.", nameof(key));
        }

        if (string.IsNullOrWhiteSpace(culture))
        {
            throw new ArgumentException("Culture must be provided.", nameof(culture));
        }

        cancellationToken.ThrowIfCancellationRequested();

#pragma warning disable CS0618 // Type or member is obsolete, but we need to use it anyway because umbraco does not provide alternative.
        var dictionaryItem = localizationService.GetDictionaryItemByKey(key); 
#pragma warning restore CS0618 // Type or member is obsolete, but we need to use it anyway because umbraco does not provide alternative.

        if (dictionaryItem is null)
        {
            throw new KeyNotFoundException($"No Umbraco dictionary item exists with key '{key}'.");
        }

        var dictionaryTranslation = (dictionaryItem.Translations)
            .FirstOrDefault(x => string.Equals(x.LanguageIsoCode, culture, StringComparison.OrdinalIgnoreCase));

        if (dictionaryTranslation is null)
        {
            throw new KeyNotFoundException($"No Umbraco dictionary translation exists for key '{key}' and culture '{culture}'.");
        }

        return Task.FromResult(dictionaryTranslation.Value);
    }
}