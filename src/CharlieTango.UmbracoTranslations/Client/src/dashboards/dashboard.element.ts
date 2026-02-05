import { LitElement, css, html, customElement, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { tryExecute } from '@umbraco-cms/backoffice/resources';
import { CharlieTangoUmbracoTranslationsService } from '../api/sdk.gen.ts';

type DictionaryResponse = Record<string, Record<string, string>>;

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
  private _editingById: Record<string, boolean> = {};

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
    this._editingById = {};
    this._draftById = {};
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

  private _getRowId(row: DictionaryRow) {
    return row.key;
  }

  private _getFrontendValue(key: string, language: string) {
    return String(this._frontendData[language]?.[key] ?? '');
  }

  private _getUmbracoValue(key: string, language: string) {
    return String(this._umbracoData[language]?.[key] ?? '');
  }

  private _isMissingUmbracoValue(key: string, language: string) {
    const value = this._getUmbracoValue(key, language);
    return value.trim().length === 0;
  }

  private _startOverride(row: DictionaryRow) {
    const rowId = this._getRowId(row);
    this._editingById = { ...this._editingById, [rowId]: true };
    if (!this._draftById[rowId]) {
      const drafts: Record<string, string> = {};
      for (const language of this._languages) {
        drafts[language] = this._getFrontendValue(row.key, language);
      }
      this._draftById = { ...this._draftById, [rowId]: drafts };
    }
    this._rowErrorsById = { ...this._rowErrorsById, [rowId]: undefined };
  }

  private _startEdit(row: DictionaryRow) {
    const rowId = this._getRowId(row);
    this._editingById = { ...this._editingById, [rowId]: true };
    const drafts: Record<string, string> = {};
    for (const language of this._languages) {
      drafts[language] = this._getUmbracoValue(row.key, language);
    }
    this._draftById = { ...this._draftById, [rowId]: drafts };
    this._rowErrorsById = { ...this._rowErrorsById, [rowId]: undefined };
  }
  private _cancelOverride(row: DictionaryRow) {
    const rowId = this._getRowId(row);
    const updatedEditing = { ...this._editingById };
    delete updatedEditing[rowId];
    this._editingById = updatedEditing;

    const updatedDrafts = { ...this._draftById };
    delete updatedDrafts[rowId];
    this._draftById = updatedDrafts;

    const updatedErrors = { ...this._rowErrorsById };
    delete updatedErrors[rowId];
    this._rowErrorsById = updatedErrors;
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

    for (const language of this._languages) {
      const value = (drafts[language] ?? '').trim();
      if (!value) {
        this._rowErrorsById = {
          ...this._rowErrorsById,
          [rowId]: `Value is required for ${language}.`,
        };
        return;
      }
    }

    this._savingById = { ...this._savingById, [rowId]: true };
    this._rowErrorsById = { ...this._rowErrorsById, [rowId]: undefined };

    for (const language of this._languages) {
      const result = await tryExecute(
        this,
        CharlieTangoUmbracoTranslationsService.saveDictionaryItem({
          body: {
            key: row.key,
            culture: language,
            value: (drafts[language] ?? '').trim(),
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
    }

    const updatedUmbracoData = { ...this._umbracoData };
    for (const language of this._languages) {
      updatedUmbracoData[language] = {
        ...(updatedUmbracoData[language] ?? {}),
        [row.key]: (drafts[language] ?? '').trim(),
      };
    }
    this._umbracoData = updatedUmbracoData;

    const updatedEditing = { ...this._editingById };
    delete updatedEditing[rowId];
    this._editingById = updatedEditing;

    const updatedSaving = { ...this._savingById };
    delete updatedSaving[rowId];
    this._savingById = updatedSaving;

    const updatedDrafts = { ...this._draftById };
    delete updatedDrafts[rowId];
    this._draftById = updatedDrafts;

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
            look="primary"
            ?disabled=${this._loading}
            @click=${() => this._load()}
          >
            ${this._loading ? 'Loading...' : 'Refresh'}
          </uui-button>
        </div>

        ${this._error
          ? html`<p class="error">${this._error}</p>`
          : html`
              <div class="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Frontend Value</th>
                      ${this._languages.map(
                        (language) => html`<th>Umbraco ${language}</th>`
                      )}
                      <th class="override-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${filteredRows.map(
                      (row) => {
                        const rowId = this._getRowId(row);
                        const isEditing = Boolean(this._editingById[rowId]);
                        const isSaving = Boolean(this._savingById[rowId]);
                        const rowError = this._rowErrorsById[rowId];
                        const hasMissingUmbraco = this._languages.some((language) =>
                          this._isMissingUmbracoValue(row.key, language)
                        );
                        const hasAnyUmbracoValue = this._languages.some((language) =>
                          !this._isMissingUmbracoValue(row.key, language)
                        );

                        return html`
                          <tr>
                            <td title=${row.key}>${row.frontendValue}</td>
                            ${this._languages.map((language) => {
                              const umbracoValueMissing = this._isMissingUmbracoValue(row.key, language);
                              const umbracoValue = this._getUmbracoValue(row.key, language);
                              const draftValue = this._draftById[rowId]?.[language] ?? '';

                              return html`
                                <td>
                                  ${isEditing
                                    ? html`
                                        <div class="override-row">
                                          <input
                                            type="text"
                                            .value=${draftValue}
                                            ?disabled=${isSaving}
                                            @input=${(event: Event) =>
                                              this._onDraftChange(row, language, event)}
                                          />
                                        </div>
                                      `
                                    : umbracoValueMissing
                                      ? html`
                                          <span class="empty">-</span>
                                        `
                                      : html`${umbracoValue}`}
                                </td>
                              `;
                            })}
                            <td>
                              ${isEditing
                                ? html`
                                    <uui-button
                                      look="primary"
                                      ?disabled=${isSaving}
                                      @click=${() => this._saveOverride(row)}
                                    >
                                      ${isSaving ? 'Saving...' : 'Save'}
                                    </uui-button>
                                    <uui-button
                                      look="secondary"
                                      ?disabled=${isSaving}
                                      @click=${() => this._cancelOverride(row)}
                                    >
                                      Cancel
                                    </uui-button>
                                    ${rowError ? html`<p class="row-error">${rowError}</p>` : null}
                                  `
                                : html`
                                    ${hasMissingUmbraco
                                      ? html`
                                          <uui-button
                                            look="primary"
                                            @click=${() => this._startOverride(row)}
                                          >
                                            Override
                                          </uui-button>
                                        `
                                      : null}
                                    ${!hasMissingUmbraco && hasAnyUmbracoValue
                                      ? html`
                                          <uui-button
                                            look="primary"
                                            @click=${() => this._startEdit(row)}
                                          >
                                            Edit
                                          </uui-button>
                                        `
                                      : null}
                                    ${rowError ? html`<p class="row-error">${rowError}</p>` : null}
                                  `}
                            </td>
                          </tr>
                        `;
                      }
                    )}
                  </tbody>
                </table>
              </div>
              ${filteredRows.length === 0
                ? html`<p class="empty">No items match the current filter.</p>`
                : null}
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
    `,
  ];
}

export default ExampleDashboardElement;

declare global {
  interface HTMLElementTagNameMap {
    'example-dashboard': ExampleDashboardElement;
  }
}
