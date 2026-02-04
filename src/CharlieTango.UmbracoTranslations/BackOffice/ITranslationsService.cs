namespace CharlieTango.UmbracoTranslations.BackOffice;

/// <summary>
/// Defines an interface for fetching string-based translations.
/// </summary>
public interface IStringTranslationsService : ITranslationsService<string> { }

/// <summary>
/// Represents a specialized service for fetching translation differences.
/// This interface provides functionality for identifying differences between two translation sets.
/// </summary>
public interface IDiffedStringTranslationsService : IStringTranslationsService { }

/// <summary>
/// Provides a common interface for fetching translations from multiple sources.
/// </summary>
/// <typeparam name="T"></typeparam>
public interface ITranslationsService<T>
{
    /// <summary>
    /// Retrieves translations for multiple cultures and merges them, prioritizing one data source over another in case of conflicts.
    /// </summary>
    /// <param name="cancellationToken">The token to monitor for cancellation requests.</param>
    /// <returns>A dictionary containing cultures as keys and their corresponding translations as nested dictionaries with translation keys and values.</returns>
    Task<Dictionary<string, Dictionary<string, T>>> GetManyAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a set of translations for a specified culture.
    /// </summary>
    /// <param name="culture">The culture identifier for which translations are to be retrieved.</param>
    /// <param name="cancellationToken">The token to monitor for cancellation requests.</param>
    /// <returns>A dictionary containing translation keys and their values for the specified culture.</returns>
    Task<Dictionary<string, T>> GetManyAsync(string culture, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a single translation for the specified key and culture.
    /// </summary>
    /// <param name="key">The unique key identifying the translation.</param>
    /// <param name="culture">The culture code for the desired translation (e.g., "en-US").</param>
    /// <param name="cancellationToken">A cancellation token that can be used to cancel the operation.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains the requested translation.</returns>
    Task<T> GetAsync(string key, string culture, CancellationToken cancellationToken = default);
}
