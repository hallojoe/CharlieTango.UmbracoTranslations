@ECHO OFF
:: This file can now be deleted!
:: It was used when setting up the package solution (using https://github.com/LottePitcher/opinionated-package-starter)

:: set up git
git init
git branch -M main
git remote add origin https://github.com/hallojoe/CharlieTango.UmbracoTranslations.git

:: ensure latest Umbraco templates used
dotnet new install Umbraco.Templates --force

:: use the umbraco-extension dotnet template to add the package project
cd src
dotnet new umbraco-extension -n "CharlieTango.UmbracoTranslations" --site-domain "https://localhost:44313" --include-example

:: replace package .csproj with the one from the template so has nuget info
cd CharlieTango.UmbracoTranslations
del CharlieTango.UmbracoTranslations.csproj
ren CharlieTango.UmbracoTranslations_nuget.csproj CharlieTango.UmbracoTranslations.csproj

:: add project to solution
cd..
dotnet sln add "CharlieTango.UmbracoTranslations"

:: add reference to project from test site
dotnet add "CharlieTango.UmbracoTranslations.TestSite/CharlieTango.UmbracoTranslations.TestSite.csproj" reference "CharlieTango.UmbracoTranslations/CharlieTango.UmbracoTranslations.csproj"
