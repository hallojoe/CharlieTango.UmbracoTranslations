import { LitElement as I, html as s, css as B, state as h, customElement as w } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as E } from "@umbraco-cms/backoffice/element-api";
import { tryExecute as y } from "@umbraco-cms/backoffice/resources";
import { c as _ } from "./client.gen-Y78mL-dz.js";
class p {
  static getFromUmbraco(t) {
    return (t?.client ?? _).get({
      security: [
        {
          scheme: "bearer",
          type: "http"
        }
      ],
      url: "/umbraco/umbracotranslations/api/v1/cms",
      ...t
    });
  }
  static saveDictionaryItem(t) {
    return (t?.client ?? _).post({
      security: [
        {
          scheme: "bearer",
          type: "http"
        }
      ],
      url: "/umbraco/umbracotranslations/api/v1/dictionary",
      ...t,
      headers: {
        "Content-Type": "application/json",
        ...t?.headers
      }
    });
  }
  static getFromFrontend(t) {
    return (t?.client ?? _).get({
      security: [
        {
          scheme: "bearer",
          type: "http"
        }
      ],
      url: "/umbraco/umbracotranslations/api/v1/frontend",
      ...t
    });
  }
  static getFromHybrid(t) {
    return (t?.client ?? _).get({
      security: [
        {
          scheme: "bearer",
          type: "http"
        }
      ],
      url: "/umbraco/umbracotranslations/api/v1/hybrid",
      ...t
    });
  }
  static getLanguages(t) {
    return (t?.client ?? _).get({
      security: [
        {
          scheme: "bearer",
          type: "http"
        }
      ],
      url: "/umbraco/umbracotranslations/api/v1/languages",
      ...t
    });
  }
}
var $ = Object.defineProperty, k = Object.getOwnPropertyDescriptor, c = (e, t, r, a) => {
  for (var i = a > 1 ? void 0 : a ? k(t, r) : t, o = e.length - 1, d; o >= 0; o--)
    (d = e[o]) && (i = (a ? d(t, r, i) : d(i)) || i);
  return a && i && $(t, r, i), i;
};
let n = class extends E(I) {
  constructor() {
    super(...arguments), this._rows = [], this._languages = [], this._frontendData = {}, this._umbracoData = {}, this._editingById = {}, this._draftById = {}, this._savingById = {}, this._rowErrorsById = {}, this._loading = !1, this._filterText = "";
  }
  connectedCallback() {
    super.connectedCallback(), this._load();
  }
  async _load() {
    this._loading = !0, this._error = void 0;
    const [e, t, r] = await Promise.all([
      y(this, p.getLanguages()),
      y(this, p.getFromFrontend()),
      y(this, p.getFromUmbraco())
    ]);
    if (!e.data) {
      this._loading = !1, this._error = e.error?.message ?? "Failed to load languages.";
      return;
    }
    if (!t.data) {
      this._loading = !1, this._error = t.error?.message ?? "Failed to load frontend dictionary items.";
      return;
    }
    this._languages = e.data ?? [], this._defaultLanguage = this._languages[0], this._frontendData = t.data, this._umbracoData = r.data ?? {}, this._rows = this._buildRows(), this._editingById = {}, this._draftById = {}, this._savingById = {}, this._rowErrorsById = {}, this._loading = !1;
  }
  _buildRows() {
    const e = [], t = /* @__PURE__ */ new Set();
    for (const a of Object.values(this._frontendData))
      for (const i of Object.keys(a))
        t.add(i);
    const r = this._defaultLanguage ? this._frontendData[this._defaultLanguage] ?? {} : {};
    for (const a of t)
      e.push({
        key: a,
        frontendValue: String(r[a] ?? "")
      });
    return e.sort((a, i) => a.key.localeCompare(i.key)), e;
  }
  _getRowId(e) {
    return e.key;
  }
  _getFrontendValue(e, t) {
    return String(this._frontendData[t]?.[e] ?? "");
  }
  _getUmbracoValue(e, t) {
    return String(this._umbracoData[t]?.[e] ?? "");
  }
  _isMissingUmbracoValue(e, t) {
    return this._getUmbracoValue(e, t).trim().length === 0;
  }
  _startOverride(e) {
    const t = this._getRowId(e);
    if (this._editingById = { ...this._editingById, [t]: !0 }, !this._draftById[t]) {
      const r = {};
      for (const a of this._languages)
        r[a] = this._getFrontendValue(e.key, a);
      this._draftById = { ...this._draftById, [t]: r };
    }
    this._rowErrorsById = { ...this._rowErrorsById, [t]: void 0 };
  }
  _startEdit(e) {
    const t = this._getRowId(e);
    this._editingById = { ...this._editingById, [t]: !0 };
    const r = {};
    for (const a of this._languages)
      r[a] = this._getUmbracoValue(e.key, a);
    this._draftById = { ...this._draftById, [t]: r }, this._rowErrorsById = { ...this._rowErrorsById, [t]: void 0 };
  }
  _cancelOverride(e) {
    const t = this._getRowId(e), r = { ...this._editingById };
    delete r[t], this._editingById = r;
    const a = { ...this._draftById };
    delete a[t], this._draftById = a;
    const i = { ...this._rowErrorsById };
    delete i[t], this._rowErrorsById = i;
  }
  _onDraftChange(e, t, r) {
    const i = r.target?.value ?? "", o = this._getRowId(e), d = this._draftById[o] ?? {};
    this._draftById = {
      ...this._draftById,
      [o]: { ...d, [t]: i }
    };
  }
  async _saveOverride(e) {
    const t = this._getRowId(e), r = this._draftById[t] ?? {};
    for (const l of this._languages)
      if (!(r[l] ?? "").trim()) {
        this._rowErrorsById = {
          ...this._rowErrorsById,
          [t]: `Value is required for ${l}.`
        };
        return;
      }
    this._savingById = { ...this._savingById, [t]: !0 }, this._rowErrorsById = { ...this._rowErrorsById, [t]: void 0 };
    for (const l of this._languages) {
      const u = await y(
        this,
        p.saveDictionaryItem({
          body: {
            key: e.key,
            culture: l,
            value: (r[l] ?? "").trim()
          }
        })
      );
      if (!u.data) {
        this._rowErrorsById = {
          ...this._rowErrorsById,
          [t]: u.error?.message ?? "Failed to save dictionary item."
        }, this._savingById = { ...this._savingById, [t]: !1 };
        return;
      }
    }
    const a = { ...this._umbracoData };
    for (const l of this._languages)
      a[l] = {
        ...a[l] ?? {},
        [e.key]: (r[l] ?? "").trim()
      };
    this._umbracoData = a;
    const i = { ...this._editingById };
    delete i[t], this._editingById = i;
    const o = { ...this._savingById };
    delete o[t], this._savingById = o;
    const d = { ...this._draftById };
    delete d[t], this._draftById = d;
    const g = { ...this._rowErrorsById };
    delete g[t], this._rowErrorsById = g;
  }
  render() {
    const e = this._filterText.trim().toLowerCase(), t = e ? this._rows.filter(
      (r) => r.key.toLowerCase().includes(e) || r.frontendValue.toLowerCase().includes(e)
    ) : this._rows;
    return s`
      <uui-box headline="Dictionary Items">
        <div class="table-actions">
          <input
            class="filter-input"
            type="text"
            placeholder="Filter by key or value"
            .value=${this._filterText}
            @input=${(r) => {
      const a = r.target;
      this._filterText = a?.value ?? "";
    }}
          />
          <uui-button
            look="primary"
            ?disabled=${this._loading}
            @click=${() => this._load()}
          >
            ${this._loading ? "Loading..." : "Refresh"}
          </uui-button>
        </div>

        ${this._error ? s`<p class="error">${this._error}</p>` : s`
              <div class="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Frontend Value</th>
                      ${this._languages.map(
      (r) => s`<th>Umbraco ${r}</th>`
    )}
                      <th class="override-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${t.map(
      (r) => {
        const a = this._getRowId(r), i = !!this._editingById[a], o = !!this._savingById[a], d = this._rowErrorsById[a], g = this._languages.some(
          (u) => this._isMissingUmbracoValue(r.key, u)
        ), l = this._languages.some(
          (u) => !this._isMissingUmbracoValue(r.key, u)
        );
        return s`
                          <tr>
                            <td title=${r.key}>${r.frontendValue}</td>
                            ${this._languages.map((u) => {
          const f = this._isMissingUmbracoValue(r.key, u), b = this._getUmbracoValue(r.key, u), m = this._draftById[a]?.[u] ?? "";
          return s`
                                <td>
                                  ${i ? s`
                                        <div class="override-row">
                                          <input
                                            type="text"
                                            .value=${m}
                                            ?disabled=${o}
                                            @input=${(v) => this._onDraftChange(r, u, v)}
                                          />
                                        </div>
                                      ` : f ? s`
                                          <span class="empty">-</span>
                                        ` : s`${b}`}
                                </td>
                              `;
        })}
                            <td>
                              ${i ? s`
                                    <uui-button
                                      look="primary"
                                      ?disabled=${o}
                                      @click=${() => this._saveOverride(r)}
                                    >
                                      ${o ? "Saving..." : "Save"}
                                    </uui-button>
                                    <uui-button
                                      look="secondary"
                                      ?disabled=${o}
                                      @click=${() => this._cancelOverride(r)}
                                    >
                                      Cancel
                                    </uui-button>
                                    ${d ? s`<p class="row-error">${d}</p>` : null}
                                  ` : s`
                                    ${g ? s`
                                          <uui-button
                                            look="primary"
                                            @click=${() => this._startOverride(r)}
                                          >
                                            Override
                                          </uui-button>
                                        ` : null}
                                    ${!g && l ? s`
                                          <uui-button
                                            look="primary"
                                            @click=${() => this._startEdit(r)}
                                          >
                                            Edit
                                          </uui-button>
                                        ` : null}
                                    ${d ? s`<p class="row-error">${d}</p>` : null}
                                  `}
                            </td>
                          </tr>
                        `;
      }
    )}
                  </tbody>
                </table>
              </div>
              ${t.length === 0 ? s`<p class="empty">No items match the current filter.</p>` : null}
            `}
      </uui-box>
    `;
  }
};
n.styles = [
  B`
      :host {
        display: block;
        padding: var(--uui-size-layout-1);
      }

      .table-actions {
        display: flex;
        gap: var(--uui-size-2);
        justify-content: flex-end;
        margin-bottom: var(--uui-size-2);
      }

      .filter-input {
        min-width: 240px;
        padding: var(--uui-size-1) var(--uui-size-2);
        border-radius: var(--uui-border-radius);
        border: 1px solid var(--uui-color-border);
        background: var(--uui-color-surface);
        color: inherit;
        font: inherit;
      }

      .table-wrapper {
        overflow: auto;
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
      }

      table {
        width: 100%;
        border-collapse: collapse;
        background: var(--uui-color-surface);
        table-layout: fixed;
      }

      thead {
        background: var(--uui-color-surface-alt);
      }

      th,
      td {
        text-align: left;
        padding: var(--uui-size-2) var(--uui-size-3);
        border-bottom: 1px solid var(--uui-color-border);
        white-space: normal;
        word-break: break-word;
        overflow-wrap: anywhere;
        vertical-align: top;
        max-width: 280px;
      }

      td {
        font-family: var(--uui-font-family);
      }

      .override-row {
        display: flex;
        align-items: center;
        gap: var(--uui-size-2);
        flex-wrap: wrap;
      }

      .override-row input {
        min-width: 220px;
        padding: var(--uui-size-1) var(--uui-size-2);
        border-radius: var(--uui-border-radius);
        border: 1px solid var(--uui-color-border);
        background: var(--uui-color-surface);
        color: inherit;
        font: inherit;
      }

      .row-error {
        margin: var(--uui-size-1) 0 0;
        color: var(--uui-color-danger);
        font-size: var(--uui-font-size-1);
      }

      .override-actions {
        width: 160px;
      }

      tbody tr:hover {
        background: var(--uui-color-surface-alt);
      }

      .error {
        color: var(--uui-color-danger);
        margin: 0;
      }

      .empty {
        color: var(--uui-color-text-alt);
      }
    `
];
c([
  h()
], n.prototype, "_rows", 2);
c([
  h()
], n.prototype, "_languages", 2);
c([
  h()
], n.prototype, "_editingById", 2);
c([
  h()
], n.prototype, "_draftById", 2);
c([
  h()
], n.prototype, "_savingById", 2);
c([
  h()
], n.prototype, "_rowErrorsById", 2);
c([
  h()
], n.prototype, "_loading", 2);
c([
  h()
], n.prototype, "_error", 2);
c([
  h()
], n.prototype, "_filterText", 2);
n = c([
  w("example-dashboard")
], n);
const F = n;
export {
  n as ExampleDashboardElement,
  F as default
};
//# sourceMappingURL=dashboard.element-ZbnDM_Jx.js.map
