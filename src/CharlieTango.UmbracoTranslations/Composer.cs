using Asp.Versioning;
using CharlieTango.UmbracoTranslations.ApiClient.Configuration;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;
using Umbraco.Cms.Api.Common.OpenApi;
using Umbraco.Cms.Api.Management.OpenApi;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace CharlieTango.UmbracoTranslations;

public class Composer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {

        builder.Services.AddUmbracoTranslationsApiClient(builder.Config);

        builder.Services.AddSingleton<IOperationIdHandler, CustomOperationHandler>();

        builder.Services.Configure<SwaggerGenOptions>(opt =>
        {
            // Related documentation:
            // https://docs.umbraco.com/umbraco-cms/tutorials/creating-a-backoffice-api
            // https://docs.umbraco.com/umbraco-cms/tutorials/creating-a-backoffice-api/adding-a-custom-swagger-document
            // https://docs.umbraco.com/umbraco-cms/tutorials/creating-a-backoffice-api/versioning-your-api
            // https://docs.umbraco.com/umbraco-cms/tutorials/creating-a-backoffice-api/access-policies

            opt.SwaggerDoc(Constants.ApiName, new OpenApiInfo
            {
                Title = Constants.ApiTitle,
                Version = Constants.ApiVersion1,
                Contact = new OpenApiContact
                {
                    Name = Constants.CharlieTangoAuthors,
                    Email = Constants.CharlieTangoEmail,
                    Url = new Uri(Constants.CharlieTangoUrl)
                }
            });

            // Enable Umbraco authentication for the "Example" Swagger document
            // PR: https://github.com/umbraco/Umbraco-CMS/pull/15699
            opt.OperationFilter<UmbracoTranslationsOperationSecurityFilter>();
        });
    }

    public class UmbracoTranslationsOperationSecurityFilter : BackOfficeSecurityRequirementsOperationFilterBase
    {
        protected override string ApiName => Constants.ApiName;
    }

    // This is used to generate nice operation IDs in our swagger json file
    // So that the gnerated TypeScript client has nice method names and not too verbose
    // https://docs.umbraco.com/umbraco-cms/tutorials/creating-a-backoffice-api/umbraco-schema-and-operation-ids#operation-ids
    public class CustomOperationHandler(IOptions<ApiVersioningOptions> apiVersioningOptions)
        : OperationIdHandler(apiVersioningOptions)
    {
        protected override bool CanHandle(ApiDescription apiDescription, ControllerActionDescriptor controllerActionDescriptor)
        {
            return controllerActionDescriptor.ControllerTypeInfo.Namespace?.StartsWith(Constants.ApiControllerNamespace, comparisonType: StringComparison.InvariantCultureIgnoreCase) is true;
        }

        public override string Handle(ApiDescription apiDescription) => $"{apiDescription.ActionDescriptor.RouteValues["action"]}";
    }
}
