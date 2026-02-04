using System.Collections;
using System.Globalization;
using System.Text.Json;

namespace CharlieTango.UmbracoTranslations.Extensions;

public static class DictionaryExtensions
{
    /// <summary>
    /// Flattens a Dictionary&lt;string, object?&gt; into
    /// Dictionary&lt;string, string?&gt; using dot and index notation.
    /// </summary>
    public static Dictionary<string, string?> FlattenToSortedDictionary(
        this IReadOnlyDictionary<string, object?> source,
        IFormatProvider? formatProvider = null)
    {
        ArgumentNullException.ThrowIfNull(source);

        formatProvider ??= CultureInfo.InvariantCulture;

        var buffer = new Dictionary<string, string?>(StringComparer.Ordinal);

        foreach (var (key, value) in source)
        {
            FlattenNode(value, key, buffer, formatProvider);
        }

        // Sort by key (Ordinal) before returning
        return buffer
            .OrderBy(kv => kv.Key, StringComparer.Ordinal)
            .ToDictionary(kv => kv.Key, kv => kv.Value, StringComparer.Ordinal);
    }

    private static void FlattenNode(
        object? node,
        string key,
        Dictionary<string, string?> output,
        IFormatProvider formatProvider)
    {
        if (node is null)
        {
            output[key] = null;
            return;
        }

        switch (node)
        {
            case JsonElement je:
                FlattenJsonElement(je, key, output, formatProvider);
                return;

            case JsonDocument jd:
                FlattenJsonElement(jd.RootElement, key, output, formatProvider);
                return;

            case IReadOnlyDictionary<string, object?> readOnlyDictionary:
                foreach (var (k, v) in readOnlyDictionary)
                {
                    FlattenNode(v, $"{key}.{k}", output, formatProvider);
                }

                return;

            case IDictionary dictionary:
                foreach (DictionaryEntry e in dictionary)
                {
                    if (e.Key is not string k)
                    {
                        throw new ArgumentException($"Only string dictionary keys are supported. Got: {e.Key?.GetType().FullName}");
                    }

                    FlattenNode(e.Value, $"{key}.{k}", output, formatProvider);
                }
                return;

            case IEnumerable enumerable when node is not string:
                {
                    var i = 0;
                    foreach (var item in enumerable)
                    {
                        FlattenNode(item, $"{key}[{i++}]", output, formatProvider);
                    }

                    return;
                }

            default:
                output[key] = ConvertScalarToString(node, formatProvider);
                return;
        }
    }

    private static void FlattenJsonElement(
        JsonElement element,
        string key,
        Dictionary<string, string?> output,
        IFormatProvider formatProvider)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (var prop in element.EnumerateObject())
                {
                    FlattenJsonElement(prop.Value, $"{key}.{prop.Name}", output, formatProvider);
                }

                return;

            case JsonValueKind.Array:
                {
                    int i = 0;
                    foreach (var item in element.EnumerateArray())
                    {
                        FlattenJsonElement(item, $"{key}[{i++}]", output, formatProvider);
                    }

                    return;
                }

            case JsonValueKind.String:
                output[key] = element.GetString();
                return;

            case JsonValueKind.Number:
                if (element.TryGetInt64(out var l))
                {
                    output[key] = l.ToString(formatProvider);
                    return;
                }
                if (element.TryGetDecimal(out var dec))
                {
                    output[key] = dec.ToString(formatProvider);
                    return;
                }
                output[key] = element.GetDouble().ToString(formatProvider);
                return;

            case JsonValueKind.True:
                output[key] = "True";
                return;

            case JsonValueKind.False:
                output[key] = "False";
                return;

            case JsonValueKind.Null:
            case JsonValueKind.Undefined:
                output[key] = null;
                return;

            default:
                throw new ArgumentException($"Unsupported JsonElement ValueKind '{element.ValueKind}' at key '{key}'.");
        }
    }

    private static string ConvertScalarToString(object value, IFormatProvider formatProvider) =>
        value switch
        {
            string s => s,
            bool b => b ? "True" : "False",
            int i => i.ToString(formatProvider),
            long l => l.ToString(formatProvider),
            decimal d => d.ToString(formatProvider),
            double d => d.ToString(formatProvider),
            float f => f.ToString(formatProvider),
            Guid g => g.ToString(),
            DateTime dt => dt.ToString("O", formatProvider),
            DateTimeOffset dto => dto.ToString("O", formatProvider),
            TimeSpan ts => ts.ToString("c", formatProvider),
            _ => throw new ArgumentException($"Unsupported value type '{value.GetType().FullName}'.")
        };
}
