using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace CharlieTango.UmbracoTranslations.ApiClient.Configuration;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddFrontendApiClient(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<ApiSettings>(configuration.GetSection(ApiSettings.Key));

        services.AddHttpClient<UmbracoTranslationsApiClient>((serviceProvider, httpClient) =>
        {
            var settings = serviceProvider.GetRequiredService<IOptions<ApiSettings>>().Value;

            httpClient.BaseAddress = new Uri(settings.BaseUrl.TrimEnd('/') + "/");
            if (settings.Headers.Count > 0)
            {
                foreach (var header in settings.Headers)
                {
                    httpClient.DefaultRequestHeaders.Add(header.Key, header.Value);
                }
            }

            httpClient.Timeout = TimeSpan.FromSeconds(settings.TimeoutInSeconds > 0 ? settings.TimeoutInSeconds : 10);

        });

        return services;
    }
}
