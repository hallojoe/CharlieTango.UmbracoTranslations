namespace CharlieTango.UmbracoTranslations.BackOffice;

public sealed class HybridTranslationService(
    IStringTranslationsService translationsServiceOne,
    IStringTranslationsService translationsServiceTwo) : IStringTranslationsService
{
    private readonly IStringTranslationsService _left = translationsServiceOne
        ?? throw new ArgumentNullException(nameof(translationsServiceOne));

    private readonly IStringTranslationsService _right = translationsServiceTwo
        ?? throw new ArgumentNullException(nameof(translationsServiceTwo));

    // Fetch from both, then merge with RIGHT overriding LEFT on conflicts.
    // (So pass Frontend API as the left, Umbraco as the right if you want Umbraco to win.)

    public async Task<Dictionary<string, Dictionary<string, string>>> GetManyAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var leftTask = _left.GetManyAsync(cancellationToken);
        var rightTask = _right.GetManyAsync(cancellationToken);

        await Task.WhenAll(leftTask, rightTask).ConfigureAwait(false);

        var left = await leftTask.ConfigureAwait(false);
        var right = await rightTask.ConfigureAwait(false);

        // cultures union
        var result = new Dictionary<string, Dictionary<string, string>>(StringComparer.OrdinalIgnoreCase);

        MergeIn(left, overwrite: true);   // start with the left
        MergeIn(right, overwrite: true);  // the right overwrites the left

        return result;

        void MergeIn(Dictionary<string, Dictionary<string, string>> src, bool overwrite)
        {
            foreach (var (culture, dict) in src)
            {
                if (!result.TryGetValue(culture, out var target))
                {
                    target = new Dictionary<string, string>(StringComparer.Ordinal);
                    result[culture] = target;
                }

                foreach (var (key, value) in dict)
                {
                    if (overwrite || !target.ContainsKey(key))
                    {
                        target[key] = value;
                    }
                }
            }
        }
    }

    public async Task<Dictionary<string, string>> GetManyAsync(string culture, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var leftTask = _left.GetManyAsync(culture, cancellationToken);
        var rightTask = _right.GetManyAsync(culture, cancellationToken);

        await Task.WhenAll(leftTask, rightTask).ConfigureAwait(false);

        var left = await leftTask.ConfigureAwait(false);
        var right = await rightTask.ConfigureAwait(false);

        var result = new Dictionary<string, string>(StringComparer.Ordinal);

        foreach (var (key, value) in left)
        {
            result[key] = value;
        }

        // right wins
        foreach (var (key, value) in right)
        {
            result[key] = value;
        }

        return result;
    }

    public async Task<string> GetAsync(string key, string culture, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        // Right wins: try right first, then left as fallback.
        try
        {
            return await _right.GetAsync(key, culture, cancellationToken).ConfigureAwait(false);
        }
        catch (KeyNotFoundException)
        {
            return await _left.GetAsync(key, culture, cancellationToken).ConfigureAwait(false);
        }
    }

}
