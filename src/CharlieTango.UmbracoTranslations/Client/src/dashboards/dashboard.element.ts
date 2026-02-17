import { LitElement, css, html, customElement, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { tryExecute } from '@umbraco-cms/backoffice/resources';
import { CharlieTangoUmbracoTranslationsService } from '../api/sdk.gen.ts';

type DictionaryResponse = Record<string, Record<string, string | null>>;

type DictionaryRow = {
  key: string;
  frontendValue: string;
};

@customElement('example-dashboard')
export class ExampleDashboardElement extends UmbElementMixin(LitElement) {
  @state()
  private _rows: DictionaryRow[] = [];

  @state()
  private _languages: string[] = [];

  private _frontendData: DictionaryResponse = {};
  private _umbracoData: DictionaryResponse = {};

  private _defaultLanguage?: string;

  @state()
  private _groupPartCount: 1 | 2 = 1;

  @state()
  private _draftById: Record<string, Record<string, string>> = {};

  @state()
  private _savingById: Record<string, boolean> = {};

  @state()
  private _rowErrorsById: Record<string, string | undefined> = {};

  @state()
  private _loading = false;

  @state()
  private _error?: string;

  @state()
  private _filterText = '';

  connectedCallback(): void {
    super.connectedCallback();
    void this._load();
  }

  private async _load() {
    this._loading = true;
    this._error = undefined;

    const [languagesResult, frontendResult, umbracoResult] = await Promise.all([
      tryExecute(this, CharlieTangoUmbracoTranslationsService.getLanguages()),
      tryExecute(this, CharlieTangoUmbracoTranslationsService.getFromFrontend()),
      tryExecute(this, CharlieTangoUmbracoTranslationsService.getFromUmbraco()),
    ]);

    if (!languagesResult.data) {
      this._loading = false;
      this._error = languagesResult.error?.message ?? 'Failed to load languages.';
      return;
    }

    if (!frontendResult.data) {
      this._loading = false;
      this._error = frontendResult.error?.message ?? 'Failed to load frontend dictionary items.';
      return;
    }

    this._languages = (languagesResult.data ?? []) as string[];
    this._defaultLanguage = this._languages[0];

    this._frontendData = frontendResult.data as DictionaryResponse;
    this._umbracoData = (umbracoResult.data ?? {}) as DictionaryResponse;

    this._rows = this._buildRows();
    this._draftById = this._buildDrafts();
    this._savingById = {};
    this._rowErrorsById = {};
    this._loading = false;
  }

  private _buildRows() {
    const rows: DictionaryRow[] = [];
    const allKeys = new Set<string>();

    for (const cultureDictionary of Object.values(this._frontendData)) {
      for (const key of Object.keys(cultureDictionary)) {
        allKeys.add(key);
      }
    }

    const defaultCultureDictionary = this._defaultLanguage
      ? this._frontendData[this._defaultLanguage] ?? {}
      : {};

    for (const key of allKeys) {
      rows.push({
        key,
        frontendValue: String(defaultCultureDictionary[key] ?? ''),
      });
    }

    rows.sort((left, right) => {
      return left.key.localeCompare(right.key);
    });

    return rows;
  }

  private _buildDrafts() {
    const drafts: Record<string, Record<string, string>> = {};
    for (const row of this._rows) {
      const rowDrafts: Record<string, string> = {};
      for (const language of this._languages) {
        rowDrafts[language] = this._getInitialDraftValue(row.key, language);
      }
      drafts[this._getRowId(row)] = rowDrafts;
    }
    return drafts;
  }

  private _getRowId(row: DictionaryRow) {
    return row.key;
  }

  private _getGroupKey(key: string, parts: 1 | 2 = this._groupPartCount) {
    const segments = key.split('.');
    if (segments.length <= parts) {
      return key;
    }
    return segments.slice(0, parts).join('.');
  }

  private _getFrontendValue(key: string, language: string) {
    return String(this._frontendData[language]?.[key] ?? '');
  }

  private _getUmbracoValue(key: string, language: string) {
    return String(this._umbracoData[language]?.[key] ?? '');
  }

  private _getInitialDraftValue(key: string, language: string) {
    const umbracoValue = this._getUmbracoValue(key, language);
    if (umbracoValue.trim().length > 0) {
      return umbracoValue;
    }
    return this._getFrontendValue(key, language);
  }

  private _isMissingUmbracoValue(key: string, language: string) {
    const value = this._getUmbracoValue(key, language);
    return value.trim().length === 0;
  }

  private _clearDraft(row: DictionaryRow) {
    const rowId = this._getRowId(row);
    const cleared: Record<string, string> = {};
    for (const language of this._languages) {
      cleared[language] = '';
    }
    this._draftById = { ...this._draftById, [rowId]: cleared };
    this._rowErrorsById = { ...this._rowErrorsById, [rowId]: undefined };
  }

  private _clearDraftValue(row: DictionaryRow, language: string) {
    const rowId = this._getRowId(row);
    const currentDrafts = this._draftById[rowId] ?? {};
    this._draftById = {
      ...this._draftById,
      [rowId]: { ...currentDrafts, [language]: '' },
    };
    this._rowErrorsById = { ...this._rowErrorsById, [rowId]: undefined };
  }

  private _closeDetails(event: Event) {
    const target = event.currentTarget as HTMLElement | null;
    const details = target?.closest('details');
    if (details) {
      details.open = false;
    }
  }

  private _onDraftChange(row: DictionaryRow, language: string, event: Event) {
    const target = event.target as HTMLInputElement | null;
    const value = target?.value ?? '';
    const rowId = this._getRowId(row);
    const currentDrafts = this._draftById[rowId] ?? {};
    this._draftById = {
      ...this._draftById,
      [rowId]: { ...currentDrafts, [language]: value },
    };
  }

  private async _saveOverride(row: DictionaryRow) {
    const rowId = this._getRowId(row);
    const drafts = this._draftById[rowId] ?? {};

    const normalizedByLanguage: Record<string, string> = {};
    for (const language of this._languages) {
      normalizedByLanguage[language] = (drafts[language] ?? '').trim();
    }

    this._savingById = { ...this._savingById, [rowId]: true };
    this._rowErrorsById = { ...this._rowErrorsById, [rowId]: undefined };

    const result = await tryExecute(
      this,
      CharlieTangoUmbracoTranslationsService.saveDictionaryItemAlternative({
        body: {
          key: row.key,
          translations: normalizedByLanguage,
        },
      })
    );

    if (!result.data) {
      this._rowErrorsById = {
        ...this._rowErrorsById,
        [rowId]: result.error?.message ?? 'Failed to save dictionary item.',
      };
      this._savingById = { ...this._savingById, [rowId]: false };
      return;
    }

    const updatedUmbracoData = { ...this._umbracoData };
    for (const language of this._languages) {
      const current = { ...(updatedUmbracoData[language] ?? {}) };
      const normalizedValue = normalizedByLanguage[language];

      if (!normalizedValue) {
        delete current[row.key];
      } else {
        current[row.key] = normalizedValue;
      }

      updatedUmbracoData[language] = current;
    }
    this._umbracoData = updatedUmbracoData;

    const updatedSaving = { ...this._savingById };
    delete updatedSaving[rowId];
    this._savingById = updatedSaving;

    this._draftById = { ...this._draftById, [rowId]: normalizedByLanguage };

    const updatedErrors = { ...this._rowErrorsById };
    delete updatedErrors[rowId];
    this._rowErrorsById = updatedErrors;
  }

  render() {
    const filter = this._filterText.trim().toLowerCase();
    const filteredRows = filter
      ? this._rows.filter(
          (row) =>
            row.key.toLowerCase().includes(filter) ||
            row.frontendValue.toLowerCase().includes(filter)
        )
      : this._rows;

    const groupedRows = new Map<string, DictionaryRow[]>();
    for (const row of filteredRows) {
      const groupKey = this._getGroupKey(row.key);
      const existing = groupedRows.get(groupKey);
      if (existing) {
        existing.push(row);
      } else {
        groupedRows.set(groupKey, [row]);
      }
    }

    const sortedGroups = Array.from(groupedRows.entries()).sort(([left], [right]) =>
      left.localeCompare(right)
    );

    return html`
      <uui-box headline="Dictionary Items">
        <div class="table-actions">
          <input
            class="filter-input"
            type="text"
            placeholder="Filter by key or value"
            .value=${this._filterText}
            @input=${(event: Event) => {
              const target = event.target as HTMLInputElement | null;
              this._filterText = target?.value ?? '';
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
            ${this._groupPartCount === 1 ? 'Group: 1-part' : 'Group: 2-part'}
          </uui-button>
          <uui-button
            class="refresh-button"
            look="primary"
            label="Refresh"
            ?disabled=${this._loading}
            @click=${() => this._load()}
          >
            <uui-icon name="sync"></uui-icon>
            ${this._loading ? 'Loading...' : 'Refresh'}
          </uui-button>
        </div>

        ${this._error
          ? html`<p class="error">${this._error}</p>`
          : html`
              ${groupedRows.size === 0
                ? html`<p class="empty">No items match the current filter.</p>`
                : html`
                    <div class="list">
                      ${sortedGroups.map(([groupKey, groupRows]) => html`
                        <details class="group-details" open>
                          <summary class="group-summary">
                            <span class="twisty" aria-hidden="true">▸</span>
                            <span class="group-title">${groupKey}</span>
                            <span class="meta">${groupRows.length} keys</span>
                          </summary>

                          <div class="group-content">
                            ${groupRows.map((row) => {
                              const rowId = this._getRowId(row);
                              const isSaving = Boolean(this._savingById[rowId]);
                              const rowError = this._rowErrorsById[rowId];
                              const completed = this._languages.filter(
                                (language) => !this._isMissingUmbracoValue(row.key, language)
                              ).length;

                              return html`
                                <details class="key-details">
                                  <summary class="key-summary">
                                    <span class="twisty" aria-hidden="true">▸</span>
                                    <span class="key-title" title=${row.key}>${row.key}</span>
                                    <span class="meta">
                                      <span
                                        class="progress"
                                        title="${completed} of ${this._languages.length} translations has been overridden."
                                      >
                                        ${completed}/${this._languages.length}
                                      </span>
                                    </span>
                                  </summary>

                                  <div class="key-content">
                                    <div class="translations">
                                      ${this._languages.map((language) => {
                                        const draftValue =
                                          this._draftById[rowId]?.[language] ??
                                          this._getInitialDraftValue(row.key, language);

                                        return html`
                                          <div class="lang-row">
                                            <div class="lang">
                                              <strong>${language}</strong>
                                              <span>Umbraco</span>
                                            </div>
                                            <div class="value">
                                              <div class="value-controls">
                                                <input
                                                  type="text"
                                                  .value=${draftValue}
                                                  ?disabled=${isSaving}
                                                  @input=${(event: Event) =>
                                                    this._onDraftChange(row, language, event)}
                                                />
                                                <uui-button
                                                  look="secondary"
                                                  label="Clear"
                                                  ?disabled=${isSaving}
                                                  @click=${() => this._clearDraftValue(row, language)}
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
                                        ?disabled=${isSaving}
                                        @click=${() => this._saveOverride(row)}
                                      >
                                        ${isSaving ? 'Saving...' : 'Save'}
                                      </uui-button>
                                      <uui-button
                                        look="secondary"
                                        label="Cancel"
                                        ?disabled=${isSaving}
                                        @click=${(event: Event) => this._closeDetails(event)}
                                      >
                                        Cancel
                                      </uui-button>
                                      <uui-button
                                        look="secondary"
                                        label="Clear all"
                                        ?disabled=${isSaving}
                                        @click=${() => this._clearDraft(row)}
                                      >
                                        Clear all
                                      </uui-button>
                                    </div>
                                    ${rowError ? html`<p class="row-error">${rowError}</p>` : null}
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

  static styles = [
    css`
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
    `,
  ];
}

export default ExampleDashboardElement;

declare global {
  interface HTMLElementTagNameMap {
    'example-dashboard': ExampleDashboardElement;
  }
}
