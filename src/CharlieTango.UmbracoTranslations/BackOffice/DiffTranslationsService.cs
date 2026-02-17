namespace CharlieTango.UmbracoTranslations.BackOffice;

/// <summary>
/// Returns only the difference between translation set 1 (left) and set 2 (right).
/// "Difference" means: keys where left has a non-null value and either
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

    public async Task<Dictionary<string, Dictionary<string, string?>>> GetManyAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var leftTask = _left.GetManyAsync(cancellationToken);
        var rightTask = _right.GetManyAsync(cancellationToken);

        await Task.WhenAll(leftTask, rightTask).ConfigureAwait(false);

        var left = await leftTask.ConfigureAwait(false);
        var right = await rightTask.ConfigureAwait(false);

        var result = new Dictionary<string, Dictionary<string, string?>>(StringComparer.OrdinalIgnoreCase);

        foreach (var (culture, leftTranslations) in left)
        {
            right.TryGetValue(culture, out var rightTranslations);
            rightTranslations ??= new Dictionary<string, string?>(StringComparer.Ordinal);

            var diff = BuildDiff(leftTranslations, rightTranslations);
            if (diff.Count > 0)
            {
                result[culture] = diff;
            }
        }

        return result;
    }

    public async Task<Dictionary<string, string?>> GetManyAsync(string culture, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var leftTask = _left.GetManyAsync(culture, cancellationToken);
        var rightTask = _right.GetManyAsync(culture, cancellationToken);

        await Task.WhenAll(leftTask, rightTask).ConfigureAwait(false);

        var left = await leftTask.ConfigureAwait(false);
        var right = await rightTask.ConfigureAwait(false);

        return BuildDiff(left, right);
    }

    public async Task<string?> GetAsync(string key, string culture, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        // Fetch left value (must exist to be considered part of the diff).
        var leftValue = await _left.GetAsync(key, culture, cancellationToken).ConfigureAwait(false);

        if (leftValue is null)
        {
            return null;
        }

        // If right is missing, it's a diff => return left value.
        var rightValue = await _right.GetAsync(key, culture, cancellationToken).ConfigureAwait(false);

        if (rightValue is null)
        {
            return leftValue;
        }

        // If equal => NOT a diff => return null.
        if (EqualityComparer<string?>.Default.Equals(leftValue, rightValue))
        {
            return null;
        }

        // Different => diff => return left.
        return leftValue;
    }

    private static Dictionary<string, string?> BuildDiff(
        Dictionary<string, string?> left,
        Dictionary<string, string?> right)
    {
        var result = new Dictionary<string, string?>(StringComparer.Ordinal);
        var comparer = EqualityComparer<string?>.Default;

        foreach (var (key, leftValue) in left)
        {
            if (leftValue is null)
            {
                continue;
            }

            // Include if right is missing, null, or differs.
            if (!right.TryGetValue(key, out var rightValue) || rightValue is null || !comparer.Equals(leftValue, rightValue))
            {
                result[key] = leftValue;
            }
        }

        return result;
    }
}
