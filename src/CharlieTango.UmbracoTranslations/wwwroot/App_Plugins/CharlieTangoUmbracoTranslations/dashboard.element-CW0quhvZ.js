import { LitElement as x, html as o, css as k, state as h, customElement as $ } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as E } from "@umbraco-cms/backoffice/element-api";
import { tryExecute as f } from "@umbraco-cms/backoffice/resources";
import { c as _ } from "./client.gen-Y78mL-dz.js";
class b {
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
  static deleteDictionaryItem(t) {
    return (t?.client ?? _).delete({
      security: [
        {
          scheme: "bearer",
          type: "http"
        }
      ],
      url: "/umbraco/umbracotranslations/api/v1/dictionary",
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
  static saveDictionaryItemAlternative(t) {
    return (t?.client ?? _).post({
      security: [
        {
          scheme: "bearer",
          type: "http"
        }
      ],
      url: "/umbraco/umbracotranslations/api/v1/dictionary/alternative",
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
var D = Object.defineProperty, z = Object.getOwnPropertyDescriptor, l = (r, t, i, e) => {
  for (var s = e > 1 ? void 0 : e ? z(t, i) : t, a = r.length - 1, n; a >= 0; a--)
    (n = r[a]) && (s = (e ? n(t, i, s) : n(s)) || s);
  return e && s && D(t, i, s), s;
};
let d = class extends E(x) {
  constructor() {
    super(...arguments), this._rows = [], this._languages = [], this._frontendData = {}, this._umbracoData = {}, this._editingById = {}, this._draftById = {}, this._savingById = {}, this._rowErrorsById = {}, this._loading = !1, this._filterText = "";
  }
  connectedCallback() {
    super.connectedCallback(), this._load();
  }
  async _load() {
    this._loading = !0, this._error = void 0;
    const [r, t, i] = await Promise.all([
      f(this, b.getLanguages()),
      f(this, b.getFromFrontend()),
      f(this, b.getFromUmbraco())
    ]);
    if (!r.data) {
      this._loading = !1, this._error = r.error?.message ?? "Failed to load languages.";
      return;
    }
    if (!t.data) {
      this._loading = !1, this._error = t.error?.message ?? "Failed to load frontend dictionary items.";
      return;
    }
    this._languages = r.data ?? [], this._defaultLanguage = this._languages[0], this._frontendData = t.data, this._umbracoData = i.data ?? {}, this._rows = this._buildRows(), this._editingById = {}, this._draftById = {}, this._savingById = {}, this._rowErrorsById = {}, this._loading = !1;
  }
  _buildRows() {
    const r = [], t = /* @__PURE__ */ new Set();
    for (const e of Object.values(this._frontendData))
      for (const s of Object.keys(e))
        t.add(s);
    const i = this._defaultLanguage ? this._frontendData[this._defaultLanguage] ?? {} : {};
    for (const e of t)
      r.push({
        key: e,
        frontendValue: String(i[e] ?? "")
      });
    return r.sort((e, s) => e.key.localeCompare(s.key)), r;
  }
  _getRowId(r) {
    return r.key;
  }
  _getGroupKey(r) {
    const t = r.indexOf(".");
    return t === -1 ? r : r.slice(0, t);
  }
  _getFrontendValue(r, t) {
    return String(this._frontendData[t]?.[r] ?? "");
  }
  _getUmbracoValue(r, t) {
    return String(this._umbracoData[t]?.[r] ?? "");
  }
  _isMissingUmbracoValue(r, t) {
    return this._getUmbracoValue(r, t).trim().length === 0;
  }
  _startOverride(r) {
    const t = this._getRowId(r);
    if (this._editingById = { ...this._editingById, [t]: !0 }, !this._draftById[t]) {
      const i = {};
      for (const e of this._languages)
        i[e] = this._getFrontendValue(r.key, e);
      this._draftById = { ...this._draftById, [t]: i };
    }
    this._rowErrorsById = { ...this._rowErrorsById, [t]: void 0 };
  }
  _startEdit(r) {
    const t = this._getRowId(r);
    this._editingById = { ...this._editingById, [t]: !0 };
    const i = {};
    for (const e of this._languages)
      i[e] = this._getUmbracoValue(r.key, e);
    this._draftById = { ...this._draftById, [t]: i }, this._rowErrorsById = { ...this._rowErrorsById, [t]: void 0 };
  }
  _cancelOverride(r) {
    const t = this._getRowId(r), i = { ...this._editingById };
    delete i[t], this._editingById = i;
    const e = { ...this._draftById };
    delete e[t], this._draftById = e;
    const s = { ...this._rowErrorsById };
    delete s[t], this._rowErrorsById = s;
  }
  _onDraftChange(r, t, i) {
    const s = i.target?.value ?? "", a = this._getRowId(r), n = this._draftById[a] ?? {};
    this._draftById = {
      ...this._draftById,
      [a]: { ...n, [t]: s }
    };
  }
  async _saveOverride(r) {
    const t = this._getRowId(r), i = this._draftById[t] ?? {}, e = {};
    for (const c of this._languages)
      e[c] = (i[c] ?? "").trim();
    this._savingById = { ...this._savingById, [t]: !0 }, this._rowErrorsById = { ...this._rowErrorsById, [t]: void 0 };
    const s = await f(
      this,
      b.saveDictionaryItemAlternative({
        body: {
          key: r.key,
          translations: e
        }
      })
    );
    if (!s.data) {
      this._rowErrorsById = {
        ...this._rowErrorsById,
        [t]: s.error?.message ?? "Failed to save dictionary item."
      }, this._savingById = { ...this._savingById, [t]: !1 };
      return;
    }
    const a = { ...this._umbracoData };
    for (const c of this._languages) {
      const m = { ...a[c] ?? {} }, u = e[c];
      u ? m[r.key] = u : delete m[r.key], a[c] = m;
    }
    this._umbracoData = a;
    const n = { ...this._editingById };
    delete n[t], this._editingById = n;
    const p = { ...this._savingById };
    delete p[t], this._savingById = p;
    const g = { ...this._draftById };
    delete g[t], this._draftById = g;
    const y = { ...this._rowErrorsById };
    delete y[t], this._rowErrorsById = y;
  }
  render() {
    const r = this._filterText.trim().toLowerCase(), t = r ? this._rows.filter(
      (e) => e.key.toLowerCase().includes(r) || e.frontendValue.toLowerCase().includes(r)
    ) : this._rows, i = /* @__PURE__ */ new Map();
    for (const e of t) {
      const s = this._getGroupKey(e.key), a = i.get(s);
      a ? a.push(e) : i.set(s, [e]);
    }
    return o`
      <uui-box headline="Dictionary Items">
        <div class="table-actions">
          <input
            class="filter-input"
            type="text"
            placeholder="Filter by key or value"
            .value=${this._filterText}
            @input=${(e) => {
      const s = e.target;
      this._filterText = s?.value ?? "";
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

        ${this._error ? o`<p class="error">${this._error}</p>` : o`
              ${i.size === 0 ? o`<p class="empty">No items match the current filter.</p>` : o`
                    ${Array.from(i.entries()).map(([e, s]) => o`
                      <div class="group-block">
                        <div class="group-title">${e}</div>
                        <div class="table-wrapper">
                          <table>
                            <thead>
                              <tr>
                                <th>Key</th>
                                ${this._languages.map(
      (a) => o`<th>Umbraco ${a}</th>`
    )}
                                <th class="override-actions">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${s.map((a) => {
      const n = this._getRowId(a), p = !!this._editingById[n], g = !!this._savingById[n], y = this._rowErrorsById[n], c = this._languages.some(
        (u) => this._isMissingUmbracoValue(a.key, u)
      ), m = this._languages.some(
        (u) => !this._isMissingUmbracoValue(a.key, u)
      );
      return o`
                                  <tr>
                                    <td title=${a.key}>${a.key}</td>
                                    ${this._languages.map((u) => {
        const v = this._isMissingUmbracoValue(a.key, u), I = this._getUmbracoValue(a.key, u), B = this._draftById[n]?.[u] ?? "";
        return o`
                                        <td>
                                          ${p ? o`
                                                <div class="override-row">
                                                  <input
                                                    type="text"
                                                    .value=${B}
                                                    ?disabled=${g}
                                                    @input=${(w) => this._onDraftChange(a, u, w)}
                                                  />
                                                </div>
                                              ` : v ? o`
                                                  <span class="empty">-</span>
                                                ` : o`${I}`}
                                        </td>
                                      `;
      })}
                                    <td>
                                      ${p ? o`
                                            <uui-button
                                              look="primary"
                                              ?disabled=${g}
                                              @click=${() => this._saveOverride(a)}
                                            >
                                              ${g ? "Saving..." : "Save"}
                                            </uui-button>
                                            <uui-button
                                              look="secondary"
                                              ?disabled=${g}
                                              @click=${() => this._cancelOverride(a)}
                                            >
                                              Cancel
                                            </uui-button>
                                            ${y ? o`<p class="row-error">${y}</p>` : null}
                                          ` : o`
                                            ${c ? o`
                                                  <uui-button
                                                    look="primary"
                                                    @click=${() => this._startOverride(a)}
                                                  >
                                                    <uui-icon name="add"></uui-icon>
                                                  </uui-button>
                                                ` : null}
                                            ${!c && m ? o`
                                                  <uui-button
                                                    look="primary"
                                                    @click=${() => this._startEdit(a)}
                                                  >
                                                    <uui-icon name="edit"></uui-icon>
                                                  </uui-button>
                                                ` : null}
                                            ${y ? o`<p class="row-error">${y}</p>` : null}
                                          `}
                                    </td>
                                  </tr>
                                `;
    })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    `)}
                  `}
            `}
      </uui-box>
    `;
  }
};
d.styles = [
  k`
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

      .group-block {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-2);
        margin-bottom: var(--uui-size-4);
      }

      .group-title {
        font-weight: 600;
        letter-spacing: 0.02em;
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
l([
  h()
], d.prototype, "_rows", 2);
l([
  h()
], d.prototype, "_languages", 2);
l([
  h()
], d.prototype, "_editingById", 2);
l([
  h()
], d.prototype, "_draftById", 2);
l([
  h()
], d.prototype, "_savingById", 2);
l([
  h()
], d.prototype, "_rowErrorsById", 2);
l([
  h()
], d.prototype, "_loading", 2);
l([
  h()
], d.prototype, "_error", 2);
l([
  h()
], d.prototype, "_filterText", 2);
d = l([
  $("example-dashboard")
], d);
const F = d;
export {
  d as ExampleDashboardElement,
  F as default
};
//# sourceMappingURL=dashboard.element-CW0quhvZ.js.map
