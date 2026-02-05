using Asp.Versioning;
using CharlieTango.UmbracoTranslations.BackOffice;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.Services;

namespace CharlieTango.UmbracoTranslations.Controllers;

[ApiVersion(Constants.ApiVersion1)]
[ApiExplorerSettings(GroupName = Constants.ApiGroupName)]
public class SstCmsBackofficeExtensionsDictionaryApiController(
    ILanguageService languageService,
    CmsTranslationsService cmsTranslationsService,
    FrontendApiTranslationsService frontendApiTranslationsService,
    IStringTranslationsService stringTranslationsService,
    ICmsDictionaryService cmsDictionaryService) : UmbracoTranslationsApiControllerBase
{
    [HttpGet("frontend")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFromFrontend(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await frontendApiTranslationsService.GetManyAsync(cancellationToken);
            return Ok(response);

        }
        catch (Exception exception)
        {
            return BadRequest(exception.Message);
        }
    }

    [HttpGet("cms")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFromUmbraco(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await cmsTranslationsService.GetManyAsync(cancellationToken);
            return Ok(response);

        }
        catch (Exception exception)
        {
            return BadRequest(exception.Message);
        }
    }


    [HttpGet("hybrid")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFromHybrid(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await stringTranslationsService.GetManyAsync(cancellationToken);
            return Ok(response);

        }
        catch (Exception exception)
        {
            return BadRequest(exception.Message);
        }
    }

    [HttpGet("languages")]
    [ProducesResponseType(typeof(string[]), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLanguages(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await languageService.GetAllAsync();
            var languageCodes = response.Select(language => language.IsoCode).ToArray();
            return Ok(languageCodes);

        }
        catch (Exception exception)
        {
            return BadRequest(exception.Message);
        }
    }

    [HttpPost("dictionary")]
    [ProducesResponseType(typeof(SaveDictionaryItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SaveDictionaryItem([FromBody] SaveDictionaryItemRequest request)
    {
        try
        {
            var response = await cmsDictionaryService.SaveAsync(request);
            return Ok(response);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(exception.Message);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(exception.Message);
        }
    }
}

