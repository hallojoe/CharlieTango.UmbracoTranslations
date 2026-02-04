using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;

namespace CharlieTango.UmbracoTranslations.BackOffice;

public interface ICmsDictionaryService
{
    Task<SaveDictionaryItemResponse> SaveAsync(
        SaveDictionaryItemRequest request,
        CancellationToken cancellationToken = default);
}

public sealed class CmsDictionaryService(
    ILanguageService languageService,
    IDictionaryItemService dictionaryItemService) : ICmsDictionaryService
{
    public async Task<SaveDictionaryItemResponse> SaveAsync(
        SaveDictionaryItemRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            throw new ArgumentNullException(nameof(request));
        }

        if (string.IsNullOrWhiteSpace(request.Key))
        {
            throw new ArgumentException("Key is required.", nameof(request.Key));
        }

        if (string.IsNullOrWhiteSpace(request.Culture))
        {
            throw new ArgumentException("Culture is required.", nameof(request.Culture));
        }

        if (string.IsNullOrWhiteSpace(request.Value))
        {
            throw new ArgumentException("Value is required.", nameof(request.Value));
        }

        var language = await languageService.GetAsync(request.Culture);
        if (language is null)
        {
            throw new InvalidOperationException($"Culture '{request.Culture}' is not configured in Umbraco.");
        }

        var userKey = Umbraco.Cms.Core.Constants.Security.SuperUserKey;
        await EnsureDictionaryItemPathAsync(request.Key, userKey, cancellationToken);

        var dictionaryItem = await dictionaryItemService.GetAsync(request.Key);
        if (dictionaryItem is null)
        {
            throw new InvalidOperationException($"Failed to resolve dictionary item '{request.Key}'.");
        }

        var translations = dictionaryItem.Translations.ToList();
        var existingTranslation = translations.FirstOrDefault(
            translation => string.Equals(
                translation.LanguageIsoCode,
                language.IsoCode,
                StringComparison.OrdinalIgnoreCase));

        if (existingTranslation is null)
        {
            translations.Add(new DictionaryTranslation(language, request.Value));
        }
        else
        {
            existingTranslation.Value = request.Value;
        }

        dictionaryItem.Translations = translations;
        var saveAttempt = await dictionaryItemService.UpdateAsync(dictionaryItem, userKey);

        if (!saveAttempt.Success)
        {
            throw new InvalidOperationException($"Failed to save dictionary item ({saveAttempt.Status}).");
        }

        return new SaveDictionaryItemResponse(request.Key, request.Culture, request.Value);
    }

    private async Task EnsureDictionaryItemPathAsync(string key, Guid userKey, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var rootKey = Constants.FrontendTranslationsRootKey;
        var rootItem = await dictionaryItemService.GetAsync(rootKey);
        if (rootItem is null)
        {
            var newRootItem = new DictionaryItem(parentId: null, rootKey);
            var rootAttempt = await dictionaryItemService.CreateAsync(newRootItem, userKey);
            if (!rootAttempt.Success)
            {
                throw new InvalidOperationException($"Failed to create root dictionary item '{rootKey}'.");
            }
            rootItem = rootAttempt.Result;
        }

        var normalizedKey = key;
        if (normalizedKey.StartsWith($"{rootKey}.", StringComparison.OrdinalIgnoreCase))
        {
            normalizedKey = normalizedKey[(rootKey.Length + 1)..];
        }
        else if (string.Equals(normalizedKey, rootKey, StringComparison.OrdinalIgnoreCase))
        {
            normalizedKey = string.Empty;
        }

        if (string.IsNullOrWhiteSpace(normalizedKey))
        {
            return;
        }

        var segments = normalizedKey.Split('.', StringSplitOptions.RemoveEmptyEntries);
        var cumulativeKey = string.Empty;
        var parentItem = rootItem;

        foreach (var segment in segments)
        {
            cancellationToken.ThrowIfCancellationRequested();

            cumulativeKey = string.IsNullOrEmpty(cumulativeKey)
                ? segment
                : $"{cumulativeKey}.{segment}";

            var item = await dictionaryItemService.GetAsync(cumulativeKey);
            if (item is null)
            {
                var newItem = new DictionaryItem(parentItem.Key, cumulativeKey);
                var createAttempt = await dictionaryItemService.CreateAsync(newItem, userKey);
                if (!createAttempt.Success)
                {
                    throw new InvalidOperationException($"Failed to create dictionary item '{cumulativeKey}'.");
                }

                item = createAttempt.Result;
            }

            parentItem = item;
        }
    }
}

public sealed record SaveDictionaryItemRequest(string Key, string Culture, string Value);

public sealed record SaveDictionaryItemResponse(string Key, string Culture, string Value);

