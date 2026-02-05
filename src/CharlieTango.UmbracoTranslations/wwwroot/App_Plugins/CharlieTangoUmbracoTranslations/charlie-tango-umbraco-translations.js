const a = [
  {
    name: "Charlie Tango Umbraco Translations Entrypoint",
    alias: "CharlieTango.UmbracoTranslations.Entrypoint",
    type: "backofficeEntryPoint",
    js: () => import("./entrypoint-GDDVW1fv.js")
  }
], n = [
  {
    name: "Charlie Tango Umbraco Translations Dashboard",
    alias: "CharlieTango.UmbracoTranslations.Dashboard",
    type: "dashboard",
    js: () => import("./dashboard.element-ZbnDM_Jx.js"),
    meta: {
      label: "Example Dashboard",
      pathname: "example-dashboard"
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: "Umb.Section.Translation"
      }
    ]
  }
], o = [
  ...a,
  ...n
];
export {
  o as manifests
};
//# sourceMappingURL=charlie-tango-umbraco-translations.js.map
