using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;

namespace CharlieTango.UmbracoTranslations.BackOffice;

public interface ICmsDictionaryService
{
    Task<SaveDictionaryItemResponse> SaveAsync(
        SaveDictionaryItemRequest request,
        CancellationToken cancellationToken = default);

    Task<DeleteDictionaryItemResponse> DeleteAsync(
        DeleteDictionaryItemRequest request,
        CancellationToken cancellationToken = default);

    Task<SaveDictionaryItemResponse> SaveManyAsync(
        AlternativeSaveDictionaryItemRequest request,
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

        var normalizedKey = NormalizeKey(request.Key);
        if (string.IsNullOrWhiteSpace(normalizedKey))
        {
            throw new ArgumentException("Key is required.", nameof(request.Key));
        }

        var language = await languageService.GetAsync(request.Culture);
        if (language is null)
        {
            throw new InvalidOperationException($"Culture '{request.Culture}' is not configured in Umbraco.");
        }

        var normalizedValue = request.Value?.Trim();
        var isDelete = string.IsNullOrEmpty(normalizedValue);

        if (isDelete)
        {
            await DeleteAsync(new DeleteDictionaryItemRequest(normalizedKey, request.Culture), cancellationToken);
            return new SaveDictionaryItemResponse(request.Key, request.Culture, string.Empty);
        }

        if (!isDelete)
        {
            await EnsureDictionaryItemPathAsync(normalizedKey, cancellationToken);
        }

        var dictionaryItem = await GetDictionaryItemAsync(normalizedKey);
        if (dictionaryItem is null)
        {
            if (isDelete)
            {
                return new SaveDictionaryItemResponse(request.Key, request.Culture, string.Empty);
            }

            throw new InvalidOperationException($"Failed to resolve dictionary item '{request.Key}'.");
        }

        var translations = dictionaryItem.Translations.ToList();
        var existingTranslation = translations.FirstOrDefault(
            translation => string.Equals(
                translation.LanguageIsoCode,
                language.IsoCode,
                StringComparison.OrdinalIgnoreCase));

        if (isDelete)
        {
            if (existingTranslation is not null)
            {
                translations.Remove(existingTranslation);
            }
        }
        else if (existingTranslation is null)
        {
            translations.Add(new DictionaryTranslation(language, normalizedValue));
        }
        else
        {
            existingTranslation.Value = normalizedValue;
        }

        translations.RemoveAll(translation => string.IsNullOrWhiteSpace(translation.Value));
        dictionaryItem.Translations = translations;

        if (translations.Count == 0)
        {
            var deleteAttempt = await dictionaryItemService.DeleteAsync(dictionaryItem.Key, Umbraco.Cms.Core.Constants.Security.SuperUserKey);
            if (!deleteAttempt.Success)
            {
                throw new InvalidOperationException($"Failed to delete dictionary item ({deleteAttempt.Status}).");
            }

            return new SaveDictionaryItemResponse(request.Key, request.Culture, string.Empty);
        }

        var saveAttempt = await dictionaryItemService.UpdateAsync(dictionaryItem, Umbraco.Cms.Core.Constants.Security.SuperUserKey);

        if (!saveAttempt.Success)
        {
            throw new InvalidOperationException($"Failed to save dictionary item ({saveAttempt.Status}).");
        }

        return new SaveDictionaryItemResponse(request.Key, request.Culture, normalizedValue ?? string.Empty);
    }

    public async Task<DeleteDictionaryItemResponse> DeleteAsync(
        DeleteDictionaryItemRequest request,
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

        cancellationToken.ThrowIfCancellationRequested();

        var normalizedKey = NormalizeKey(request.Key);
        if (string.IsNullOrWhiteSpace(normalizedKey))
        {
            throw new ArgumentException("Key is required.", nameof(request.Key));
        }

        var dictionaryItem = await GetDictionaryItemAsync(normalizedKey);
        if (dictionaryItem is null)
        {
            return new DeleteDictionaryItemResponse(request.Key, request.Culture, false);
        }

        var translations = dictionaryItem.Translations.ToList();
        var existingTranslation = translations.FirstOrDefault(
            translation => string.Equals(
                translation.LanguageIsoCode,
                request.Culture,
                StringComparison.OrdinalIgnoreCase));

        if (existingTranslation is null)
        {
            return new DeleteDictionaryItemResponse(request.Key, request.Culture, false);
        }

        translations.Remove(existingTranslation);
        dictionaryItem.Translations = translations;

        var userKey = Umbraco.Cms.Core.Constants.Security.SuperUserKey;

        if (translations.Count == 0)
        {
            var deleteAttempt = await dictionaryItemService.DeleteAsync(dictionaryItem.Key, userKey);
            if (!deleteAttempt.Success)
            {
                throw new InvalidOperationException($"Failed to delete dictionary item ({deleteAttempt.Status}).");
            }

            return new DeleteDictionaryItemResponse(request.Key, request.Culture, true);
        }

        var saveAttempt = await dictionaryItemService.UpdateAsync(dictionaryItem, userKey);
        if (!saveAttempt.Success)
        {
            throw new InvalidOperationException($"Failed to save dictionary item ({saveAttempt.Status}).");
        }

        return new DeleteDictionaryItemResponse(request.Key, request.Culture, true);
    }

    public async Task<SaveDictionaryItemResponse> SaveManyAsync(
        AlternativeSaveDictionaryItemRequest request,
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

        if (request.Translations is null)
        {
            throw new ArgumentException("Translations are required.", nameof(request.Translations));
        }

        var normalizedKey = NormalizeKey(request.Key);
        if (string.IsNullOrWhiteSpace(normalizedKey))
        {
            throw new ArgumentException("Key is required.", nameof(request.Key));
        }

        var normalizedTranslations = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        foreach (var (culture, value) in request.Translations)
        {
            if (string.IsNullOrWhiteSpace(culture))
            {
                throw new ArgumentException("Culture keys must be provided.", nameof(request.Translations));
            }

            normalizedTranslations[culture] = value?.Trim();
        }

        var responseCulture = normalizedTranslations.Keys.FirstOrDefault() ?? string.Empty;

        if (normalizedTranslations.Count == 0 ||
            normalizedTranslations.Values.All(value => string.IsNullOrEmpty(value)))
        {
            var dictionaryItem = await GetDictionaryItemAsync(normalizedKey);
            if (dictionaryItem is not null)
            {
                var userKey = Umbraco.Cms.Core.Constants.Security.SuperUserKey;
                var deleteAttempt = await dictionaryItemService.DeleteAsync(dictionaryItem.Key, userKey);
                if (!deleteAttempt.Success)
                {
                    throw new InvalidOperationException($"Failed to delete dictionary item ({deleteAttempt.Status}).");
                }
            }

            return new SaveDictionaryItemResponse(request.Key, responseCulture, string.Empty);
        }

        foreach (var culture in normalizedTranslations.Keys)
        {
            var language = await languageService.GetAsync(culture);
            if (language is null)
            {
                throw new InvalidOperationException($"Culture '{culture}' is not configured in Umbraco.");
            }
        }

        await EnsureDictionaryItemPathAsync(normalizedKey, cancellationToken);

        var item = await GetDictionaryItemAsync(normalizedKey);
        if (item is null)
        {
            throw new InvalidOperationException($"Failed to resolve dictionary item '{request.Key}'.");
        }

        var translations = item.Translations.ToList();

        foreach (var (culture, value) in normalizedTranslations)
        {
            var existingTranslation = translations.FirstOrDefault(
                translation => string.Equals(
                    translation.LanguageIsoCode,
                    culture,
                    StringComparison.OrdinalIgnoreCase));

            if (string.IsNullOrEmpty(value))
            {
                if (existingTranslation is not null)
                {
                    translations.Remove(existingTranslation);
                }
                continue;
            }

            if (existingTranslation is null)
            {
                var language = await languageService.GetAsync(culture);
                if (language is null)
                {
                    throw new InvalidOperationException($"Culture '{culture}' is not configured in Umbraco.");
                }

                translations.Add(new DictionaryTranslation(language, value));
            }
            else
            {
                existingTranslation.Value = value;
            }
        }

        translations.RemoveAll(translation => string.IsNullOrWhiteSpace(translation.Value));
        item.Translations = translations;

        if (translations.Count == 0)
        {
            var deleteAttempt = await dictionaryItemService.DeleteAsync(item.Key, Umbraco.Cms.Core.Constants.Security.SuperUserKey);
            if (!deleteAttempt.Success)
            {
                throw new InvalidOperationException($"Failed to delete dictionary item ({deleteAttempt.Status}).");
            }

            return new SaveDictionaryItemResponse(request.Key, responseCulture, string.Empty);
        }

        var saveAttempt = await dictionaryItemService.UpdateAsync(item, Umbraco.Cms.Core.Constants.Security.SuperUserKey);
        if (!saveAttempt.Success)
        {
            throw new InvalidOperationException($"Failed to save dictionary item ({saveAttempt.Status}).");
        }

        return new SaveDictionaryItemResponse(request.Key, responseCulture, string.Empty);
    }

    private async Task EnsureDictionaryItemPathAsync(string key, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var rootKey = Constants.FrontendTranslationsRootKey;
        var rootItem = await dictionaryItemService.GetAsync(rootKey);
        if (rootItem is null)
        {
            var newRootItem = new DictionaryItem(parentId: null, rootKey);
            var rootAttempt = await dictionaryItemService.CreateAsync(newRootItem, Umbraco.Cms.Core.Constants.Security.SuperUserKey);
            if (!rootAttempt.Success)
            {
                throw new InvalidOperationException($"Failed to create root dictionary item '{rootKey}'.");
            }
            rootItem = rootAttempt.Result;
        }

        if (string.IsNullOrWhiteSpace(key))
        {
            return;
        }

        var segments = key.Split('.', StringSplitOptions.RemoveEmptyEntries);
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
                var createAttempt = await dictionaryItemService.CreateAsync(newItem, Umbraco.Cms.Core.Constants.Security.SuperUserKey);
                if (!createAttempt.Success)
                {
                    throw new InvalidOperationException($"Failed to create dictionary item '{cumulativeKey}'.");
                }

                item = createAttempt.Result;
            }

            parentItem = item;
        }
    }

    private static string NormalizeKey(string key)
    {
        var rootKey = Constants.FrontendTranslationsRootKey;
        if (key.StartsWith($"{rootKey}.", StringComparison.OrdinalIgnoreCase))
        {
            return key[(rootKey.Length + 1)..];
        }

        if (string.Equals(key, rootKey, StringComparison.OrdinalIgnoreCase))
        {
            return string.Empty;
        }

        return key;
    }

    private async Task<IDictionaryItem?> GetDictionaryItemAsync(string normalizedKey)
    {
        var dictionaryItem = await dictionaryItemService.GetAsync(normalizedKey);
        if (dictionaryItem is not null)
        {
            return dictionaryItem;
        }

        var rootKey = Constants.FrontendTranslationsRootKey;
        if (normalizedKey.StartsWith($"{rootKey}.", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(normalizedKey, rootKey, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var prefixedKey = $"{rootKey}.{normalizedKey}";
        return await dictionaryItemService.GetAsync(prefixedKey);
    }
}

public sealed record SaveDictionaryItemRequest(string Key, string Culture, string Value);

public sealed record AlternativeSaveDictionaryItemRequest(string Key, Dictionary<string, string?> Translations);


public sealed record SaveDictionaryItemResponse(string Key, string Culture, string Value);

public sealed record DeleteDictionaryItemRequest(string Key, string Culture);

public sealed record DeleteDictionaryItemResponse(string Key, string Culture, bool Deleted);
