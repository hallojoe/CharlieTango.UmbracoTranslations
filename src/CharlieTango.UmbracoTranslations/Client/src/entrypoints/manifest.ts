export const manifests: Array<UmbExtensionManifest> = [
  {
    name: "Charlie Tango Umbraco Translations Entrypoint",
    alias: "CharlieTango.UmbracoTranslations.Entrypoint",
    type: "backofficeEntryPoint",
    js: () => import("./entrypoint.js"),
  },
];
