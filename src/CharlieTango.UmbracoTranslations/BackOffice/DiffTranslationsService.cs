namespace CharlieTango.UmbracoTranslations.BackOffice;

/// <summary>
/// Returns only the difference between translation set 1 (left) and set 2 (right).
/// "Difference" means: keys where left has a value and either
///  - right is missing the key, OR
///  - right has a different value.
/// The returned value is always the LEFT value.
/// </summary>
public sealed class DiffTranslationsService(
    IStringTranslationsService translationsServiceOne,
    IStringTranslationsService translationsServiceTwo) : IDiffedStringTranslationsService
{
    private readonly IStringTranslationsService _left = translationsServiceOne
        ?? throw new ArgumentNullException(nameof(translationsServiceOne));

    private readonly IStringTranslationsService _right = translationsServiceTwo
        ?? throw new ArgumentNullException(nameof(translationsServiceTwo));

    // Only these two are implemented per your request.
    // Everything else throws NotImplementedException.

    public Task<Dictionary<string, Dictionary<string, string>>> GetManyAsync(CancellationToken cancellationToken = default)
        => throw new NotImplementedException("This diff service only supports culture-scoped reads.");

    public async Task<Dictionary<string, string>> GetManyAsync(string culture, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var leftTask = _left.GetManyAsync(culture, cancellationToken);
        var rightTask = _right.GetManyAsync(culture, cancellationToken);

        await Task.WhenAll(leftTask, rightTask).ConfigureAwait(false);

        var left = await leftTask.ConfigureAwait(false);
        var right = await rightTask.ConfigureAwait(false);

        var result = new Dictionary<string, string>(StringComparer.Ordinal);
        var comparer = EqualityComparer<string>.Default;

        foreach (var (key, leftValue) in left)
        {
            // Include if right is missing OR differs.
            if (!right.TryGetValue(key, out var rightValue) || !comparer.Equals(leftValue, rightValue))
            {
                result[key] = leftValue;
            }
        }

        return result;
    }

    public async Task<string> GetAsync(string key, string culture, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        // Fetch left value (must exist to be considered part of the diff).
        var leftValue = await _left.GetAsync(key, culture, cancellationToken).ConfigureAwait(false);

        // If right is missing, it's a diff => return left value.
        try
        {
            var rightValue = await _right.GetAsync(key, culture, cancellationToken).ConfigureAwait(false);

            // If equal => NOT a diff => throw.
            if (EqualityComparer<string>.Default.Equals(leftValue, rightValue))
            {
                throw new KeyNotFoundException(
                    $"Key '{key}' is not part of the diff for culture '{culture}' (values are equal in both sets).");
            }

            // Different => diff => return left.
            return leftValue;
        }
        catch (KeyNotFoundException)
        {
            // Missing in right => diff => return left.
            return leftValue;
        }
    }
}
