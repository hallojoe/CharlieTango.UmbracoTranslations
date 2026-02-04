namespace CharlieTango.UmbracoTranslations.ApiClient.Models;

public sealed class ThemeResponseModel
{
    public int Count { get; set; }
    public List<ThemeModel> Themes { get; set; } = [];
}

public sealed class ThemeModel
{
    public string Title { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}
