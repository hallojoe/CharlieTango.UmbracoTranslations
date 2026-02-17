import { LitElement as w, html as c, css as I, state as g, customElement as x } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as B } from "@umbraco-cms/backoffice/element-api";
import { tryExecute as m } from "@umbraco-cms/backoffice/resources";
import { c as p } from "./client.gen-Y78mL-dz.js";
class _ {
  static getFromUmbraco(t) {
    return (t?.client ?? p).get({
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
    return (t?.client ?? p).delete({
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
    return (t?.client ?? p).post({
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
    return (t?.client ?? p).post({
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
    return (t?.client ?? p).get({
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
    return (t?.client ?? p).get({
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
    return (t?.client ?? p).get({
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
var k = Object.defineProperty, D = Object.getOwnPropertyDescriptor, u = (r, t, e, s) => {
  for (var a = s > 1 ? void 0 : s ? D(t, e) : t, o = r.length - 1, i; o >= 0; o--)
    (i = r[o]) && (a = (s ? i(t, e, a) : i(a)) || a);
  return s && a && k(t, e, a), a;
};
let l = class extends B(w) {
  constructor() {
    super(...arguments), this._rows = [], this._languages = [], this._frontendData = {}, this._umbracoData = {}, this._groupPartCount = 1, this._draftById = {}, this._savingById = {}, this._rowErrorsById = {}, this._loading = !1, this._filterText = "";
  }
  connectedCallback() {
    super.connectedCallback(), this._load();
  }
  async _load() {
    this._loading = !0, this._error = void 0;
    const [r, t, e] = await Promise.all([
      m(this, _.getLanguages()),
      m(this, _.getFromFrontend()),
      m(this, _.getFromUmbraco())
    ]);
    if (!r.data) {
      this._loading = !1, this._error = r.error?.message ?? "Failed to load languages.";
      return;
    }
    if (!t.data) {
      this._loading = !1, this._error = t.error?.message ?? "Failed to load frontend dictionary items.";
      return;
    }
    this._languages = r.data ?? [], this._defaultLanguage = this._languages[0], this._frontendData = t.data, this._umbracoData = e.data ?? {}, this._rows = this._buildRows(), this._draftById = this._buildDrafts(), this._savingById = {}, this._rowErrorsById = {}, this._loading = !1;
  }
  _buildRows() {
    const r = [], t = /* @__PURE__ */ new Set();
    for (const s of Object.values(this._frontendData))
      for (const a of Object.keys(s))
        t.add(a);
    const e = this._defaultLanguage ? this._frontendData[this._defaultLanguage] ?? {} : {};
    for (const s of t)
      r.push({
        key: s,
        frontendValue: String(e[s] ?? "")
      });
    return r.sort((s, a) => s.key.localeCompare(a.key)), r;
  }
  _buildDrafts() {
    const r = {};
    for (const t of this._rows) {
      const e = {};
      for (const s of this._languages)
        e[s] = this._getInitialDraftValue(t.key, s);
      r[this._getRowId(t)] = e;
    }
    return r;
  }
  _getRowId(r) {
    return r.key;
  }
  _getGroupKey(r, t = this._groupPartCount) {
    const e = r.split(".");
    return e.length <= t ? r : e.slice(0, t).join(".");
  }
  _getFrontendValue(r, t) {
    return String(this._frontendData[t]?.[r] ?? "");
  }
  _getUmbracoValue(r, t) {
    return String(this._umbracoData[t]?.[r] ?? "");
  }
  _getInitialDraftValue(r, t) {
    const e = this._getUmbracoValue(r, t);
    return e.trim().length > 0 ? e : this._getFrontendValue(r, t);
  }
  _isMissingUmbracoValue(r, t) {
    return this._getUmbracoValue(r, t).trim().length === 0;
  }
  _clearDraft(r) {
    const t = this._getRowId(r), e = {};
    for (const s of this._languages)
      e[s] = "";
    this._draftById = { ...this._draftById, [t]: e }, this._rowErrorsById = { ...this._rowErrorsById, [t]: void 0 };
  }
  _clearDraftValue(r, t) {
    const e = this._getRowId(r), s = this._draftById[e] ?? {};
    this._draftById = {
      ...this._draftById,
      [e]: { ...s, [t]: "" }
    }, this._rowErrorsById = { ...this._rowErrorsById, [e]: void 0 };
  }
  _closeDetails(r) {
    const e = r.currentTarget?.closest("details");
    e && (e.open = !1);
  }
  _onDraftChange(r, t, e) {
    const a = e.target?.value ?? "", o = this._getRowId(r), i = this._draftById[o] ?? {};
    this._draftById = {
      ...this._draftById,
      [o]: { ...i, [t]: a }
    };
  }
  async _saveOverride(r) {
    const t = this._getRowId(r), e = this._draftById[t] ?? {}, s = {};
    for (const n of this._languages)
      s[n] = (e[n] ?? "").trim();
    this._savingById = { ...this._savingById, [t]: !0 }, this._rowErrorsById = { ...this._rowErrorsById, [t]: void 0 };
    const a = await m(
      this,
      _.saveDictionaryItemAlternative({
        body: {
          key: r.key,
          translations: s
        }
      })
    );
    if (!a.data) {
      this._rowErrorsById = {
        ...this._rowErrorsById,
        [t]: a.error?.message ?? "Failed to save dictionary item."
      }, this._savingById = { ...this._savingById, [t]: !1 };
      return;
    }
    const o = { ...this._umbracoData };
    for (const n of this._languages) {
      const y = { ...o[n] ?? {} }, f = s[n];
      f ? y[r.key] = f : delete y[r.key], o[n] = y;
    }
    this._umbracoData = o;
    const i = { ...this._savingById };
    delete i[t], this._savingById = i, this._draftById = { ...this._draftById, [t]: s };
    const h = { ...this._rowErrorsById };
    delete h[t], this._rowErrorsById = h;
  }
  render() {
    const r = this._filterText.trim().toLowerCase(), t = r ? this._rows.filter(
      (a) => a.key.toLowerCase().includes(r) || a.frontendValue.toLowerCase().includes(r)
    ) : this._rows, e = /* @__PURE__ */ new Map();
    for (const a of t) {
      const o = this._getGroupKey(a.key), i = e.get(o);
      i ? i.push(a) : e.set(o, [a]);
    }
    const s = Array.from(e.entries()).sort(
      ([a], [o]) => a.localeCompare(o)
    );
    return c`
      <uui-box headline="Dictionary Items">
        <div class="table-actions">
          <input
            class="filter-input"
            type="text"
            placeholder="Filter by key or value"
            .value=${this._filterText}
            @input=${(a) => {
      const o = a.target;
      this._filterText = o?.value ?? "";
    }}
          />
          <uui-button
            look="secondary"
            label="Group by"
            aria-pressed=${this._groupPartCount === 2}
            @click=${() => {
      this._groupPartCount = this._groupPartCount === 1 ? 2 : 1;
    }}
          >
            ${this._groupPartCount === 1 ? "Group: 1-part" : "Group: 2-part"}
          </uui-button>
          <uui-button
            class="refresh-button"
            look="primary"
            label="Refresh"
            ?disabled=${this._loading}
            @click=${() => this._load()}
          >
            <uui-icon name="sync"></uui-icon>
            ${this._loading ? "Loading..." : "Refresh"}
          </uui-button>
        </div>

        ${this._error ? c`<p class="error">${this._error}</p>` : c`
              ${e.size === 0 ? c`<p class="empty">No items match the current filter.</p>` : c`
                    <div class="list">
                      ${s.map(([a, o]) => c`
                        <details class="group-details" open>
                          <summary class="group-summary">
                            <span class="twisty" aria-hidden="true">▸</span>
                            <span class="group-title">${a}</span>
                            <span class="meta">${o.length} keys</span>
                          </summary>

                          <div class="group-content">
                            ${o.map((i) => {
      const h = this._getRowId(i), n = !!this._savingById[h], y = this._rowErrorsById[h], f = this._languages.filter(
        (d) => !this._isMissingUmbracoValue(i.key, d)
      ).length;
      return c`
                                <details class="key-details">
                                  <summary class="key-summary">
                                    <span class="twisty" aria-hidden="true">▸</span>
                                    <span class="key-title" title=${i.key}>${i.key}</span>
                                    <span class="meta">
                                      <span
                                        class="progress"
                                        title="${f} of ${this._languages.length} translations has been overridden."
                                      >
                                        ${f}/${this._languages.length}
                                      </span>
                                    </span>
                                  </summary>

                                  <div class="key-content">
                                    <div class="translations">
                                      ${this._languages.map((d) => {
        const v = this._draftById[h]?.[d] ?? this._getInitialDraftValue(i.key, d);
        return c`
                                          <div class="lang-row">
                                            <div class="lang">
                                              <strong>${d}</strong>
                                              <span>Umbraco</span>
                                            </div>
                                            <div class="value">
                                              <div class="value-controls">
                                                <input
                                                  type="text"
                                                  .value=${v}
                                                  ?disabled=${n}
                                                  @input=${(b) => this._onDraftChange(i, d, b)}
                                                />
                                                <uui-button
                                                  look="secondary"
                                                  label="Clear"
                                                  ?disabled=${n}
                                                  @click=${() => this._clearDraftValue(i, d)}
                                                >
                                                  Clear
                                                </uui-button>
                                              </div>
                                            </div>
                                          </div>
                                        `;
      })}
                                    </div>
                                    <div class="actions">
                                      <uui-button
                                        look="primary"
                                        label="Save"
                                        ?disabled=${n}
                                        @click=${() => this._saveOverride(i)}
                                      >
                                        ${n ? "Saving..." : "Save"}
                                      </uui-button>
                                      <uui-button
                                        look="secondary"
                                        label="Cancel"
                                        ?disabled=${n}
                                        @click=${(d) => this._closeDetails(d)}
                                      >
                                        Cancel
                                      </uui-button>
                                      <uui-button
                                        look="secondary"
                                        label="Clear all"
                                        ?disabled=${n}
                                        @click=${() => this._clearDraft(i)}
                                      >
                                        Clear all
                                      </uui-button>
                                    </div>
                                    ${y ? c`<p class="row-error">${y}</p>` : null}
                                  </div>
                                </details>
                              `;
    })}
                          </div>
                        </details>
                      `)}
                    </div>
                  `}
            `}
      </uui-box>
    `;
  }
};
l.styles = [
  I`
      :host {
        display: block;
        padding: var(--uui-size-layout-1);
      }

      .table-actions {
        display: flex;
        gap: var(--uui-size-2);
        justify-content: flex-start;
        margin-bottom: var(--uui-size-2);
      }

      .refresh-button {
        margin-left: auto;
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

      .list {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-2);
      }

      details {
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        background: var(--uui-color-surface);
      }

      summary {
        list-style: none;
        cursor: pointer;
        padding: var(--uui-size-2) var(--uui-size-3);
        display: flex;
        align-items: center;
        gap: var(--uui-size-2);
      }

      summary::-webkit-details-marker {
        display: none;
      }

      details[open] > summary {
        border-bottom: 1px solid var(--uui-color-border);
        background: var(--uui-color-surface-alt);
      }

      .twisty {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        font-size: 12px;
        border: 1px solid var(--uui-color-border);
        border-radius: 4px;
        color: var(--uui-color-text-alt);
        flex: 0 0 auto;
        transform: rotate(0deg);
        transition: transform 120ms ease;
      }

      details[open] > summary .twisty {
        transform: rotate(90deg);
        color: var(--uui-color-text);
      }

      .group-title {
        font-weight: 600;
        letter-spacing: 0.02em;
      }

      .key-title {
        font-family: var(--uui-font-family-monospace);
        font-size: var(--uui-font-size-2);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .meta {
        margin-left: auto;
        display: inline-flex;
        align-items: center;
        gap: var(--uui-size-2);
        color: var(--uui-color-text-alt);
        font-size: var(--uui-font-size-1);
      }

      .actions {
        display: inline-flex;
        align-items: center;
        gap: var(--uui-size-1);
      }

      .group-content {
        padding: var(--uui-size-2);
        display: grid;
        gap: var(--uui-size-2);
      }

      .key-content {
        padding: var(--uui-size-2);
        display: grid;
        gap: var(--uui-size-2);
      }

      .translations {
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        background: var(--uui-color-surface-alt);
        padding: var(--uui-size-2);
        display: grid;
        gap: var(--uui-size-1);
      }

      .lang-row {
        display: grid;
        grid-template-columns: 160px 1fr;
        gap: var(--uui-size-2);
        align-items: center;
        padding: var(--uui-size-1) 0;
        border-top: 1px solid var(--uui-color-border);
      }

      .lang-row:first-child {
        border-top: none;
        padding-top: 0;
      }

      .lang {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      .lang strong {
        font-size: var(--uui-font-size-2);
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .lang span {
        font-size: var(--uui-font-size-1);
        color: var(--uui-color-text-alt);
      }

      .value {
        min-width: 0;
      }

      .value-controls {
        display: flex;
        align-items: center;
        gap: var(--uui-size-1);
      }

      .value input {
        flex: 1 1 auto;
        width: 100%;
        box-sizing: border-box;
        padding: var(--uui-size-1) var(--uui-size-2);
        border-radius: var(--uui-border-radius);
        border: 1px solid var(--uui-color-border);
        background: var(--uui-color-surface);
        color: inherit;
        font: inherit;
      }

      .row-error {
        margin: 0;
        color: var(--uui-color-danger);
        font-size: var(--uui-font-size-1);
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
u([
  g()
], l.prototype, "_rows", 2);
u([
  g()
], l.prototype, "_languages", 2);
u([
  g()
], l.prototype, "_groupPartCount", 2);
u([
  g()
], l.prototype, "_draftById", 2);
u([
  g()
], l.prototype, "_savingById", 2);
u([
  g()
], l.prototype, "_rowErrorsById", 2);
u([
  g()
], l.prototype, "_loading", 2);
u([
  g()
], l.prototype, "_error", 2);
u([
  g()
], l.prototype, "_filterText", 2);
l = u([
  x("example-dashboard")
], l);
const V = l;
export {
  l as ExampleDashboardElement,
  V as default
};
//# sourceMappingURL=dashboard.element-BHppiLd4.js.map
