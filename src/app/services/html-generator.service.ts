import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import type { Field, PageConfig, PageButton, Section } from '../models';

@Injectable({ providedIn: 'root' })
export class HtmlGeneratorService {
  constructor(@Inject(DOCUMENT) private doc: Document) {}

  generate(config: PageConfig): string {
    const c = config;
    const defaultCols = this.defaultColumns(c);
    const head = this.buildHead(c);
    const sections = c.sections
      .map((s) => this.renderSection(s, s.columns || defaultCols))
      .join('');
    const buttons = this.renderButtons(c.buttons);
    const footer = this.renderFooter(c);
    const script = this.buildScript(c);
    const bodyClasses =
      c.theme === 'dark' ? ' class="pb-dark"' : '';
    const headerMain = `
  <header class="pb-header">
    <div class="pb-wrap">
      <h1 class="pb-title">${this.esc(c.pageTitle)}</h1>
      <p class="pb-subtitle">${this.esc(this.subtitle(c))}</p>
    </div>
  </header>`;

    return `<!doctype html>
<html lang="es">
<head>
${head}
</head>
<body${bodyClasses}>
${headerMain}
  <main class="pb-wrap">
    <form id="pb-form" novalidate>
${sections}
      <div id="pb-status" class="pb-status"></div>
      <div class="pb-actions">${buttons}</div>
    </form>
  </main>
${footer}
${this.renderModal(c)}
<script>
${script}
</script>
</body>
</html>
`;
  }

  private renderModal(c: PageConfig): string {
    return `<div id="pb-modal" class="pb-modal" role="dialog" aria-modal="true">
  <div class="pb-modal-box">
    <div class="pb-modal-icon" id="pb-modal-icon"></div>
    <h3 id="pb-modal-title"></h3>
    <p id="pb-modal-msg"></p>
    <div class="pb-modal-actions">
      <button type="button" class="pb-btn pb-btn-secondary" id="pb-modal-cancel" style="display:none">Cancelar</button>
      <button type="button" class="pb-btn pb-btn-primary" id="pb-modal-ok">Aceptar</button>
    </div>
  </div>
</div>`;
  }

  private subtitle(c: PageConfig): string {
    const secs = c.sections.length;
    const fields = c.sections.reduce((t, s) => t + (s.fields?.length || 0), 0);
    return `${secs} sección(es) · ${fields} campo(s)`;
  }

  private defaultColumns(c: PageConfig): number {
    if (c.layout === 'vertical') return 1;
    if (c.layout === 'twoColumns') return 2;
    return Math.max(1, Math.min(6, Number(c.defaultColumns) || 2));
  }

  private buildHead(c: PageConfig): string {
    const cssLink = c.customCssUrl
      ? `<link rel="stylesheet" href="${this.esc(c.customCssUrl)}">\n`
      : '';
    return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${this.esc(c.pageTitle)}</title>
${cssLink}<style>
${this.getBaseCss(c)}
</style>`;
  }

  getBaseCss(c: PageConfig): string {
    const darkVar = c.theme === 'dark' ? 'var(--pb-dark-bg);' : 'var(--pb-bg);';
    return `:root {
  --pb-bg: #eef1f7;
  --pb-dark-bg: #0f1420;
  --pb-card: #ffffff;
  --pb-card-dark: #1a2233;
  --pb-text: #1c2333;
  --pb-text-dark: #e6ebf5;
  --pb-muted: #65708a;
  --pb-muted-dark: #8b96ae;
  --pb-border: #dde2ec;
  --pb-border-dark: #2c3750;
  --pb-primary: #2563eb;
  --pb-primary-soft: rgba(37,99,235,.10);
  --pb-primary-dark: #3b7bf0;
  --pb-danger: #dc2626;
  --pb-success: #16a34a;
  --pb-warning: #f59e0b;
  --pb-radius: 12px;
  --pb-shadow: 0 6px 24px rgba(28,35,51,.08);
  --pb-shadow-dark: 0 6px 24px rgba(0,0,0,.35);
  --pb-bg-var: ${darkVar}
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: 'Segoe UI', system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif;
  background: var(--pb-bg-var);
  color: var(--pb-text);
  line-height: 1.55;
  min-height: 100vh;
  transition: background .2s, color .2s;
}
body.pb-dark {
  background:
    radial-gradient(1100px 520px at 85% -10%, rgba(123,63,242,.12), transparent 60%),
    radial-gradient(900px 480px at -10% 10%, rgba(37,99,235,.10), transparent 55%) fixed,
    var(--pb-dark-bg);
  color: var(--pb-text-dark);
}
body:not(.pb-dark) {
  background:
    radial-gradient(1100px 520px at 85% -10%, rgba(123,63,242,.10), transparent 60%),
    radial-gradient(900px 480px at -10% 10%, rgba(37,99,235,.08), transparent 55%) fixed,
    var(--pb-bg);
}
.pb-wrap { max-width: 1120px; margin: 0 auto; padding: 0 20px; }
.pb-header {
  background: linear-gradient(120deg, var(--pb-primary) 0%, #7b3ff2 100%);
  color: #fff;
  padding: 30px 0 26px;
  margin-bottom: 10px;
  box-shadow: 0 6px 24px rgba(37,99,235,.22);
  border-radius: 0 0 18px 18px;
}
.pb-title { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -.01em; }
.pb-subtitle { margin: 8px 0 0; opacity: .9; font-size: 14px; }
.pb-card {
  background: var(--pb-card);
  border: 1px solid var(--pb-border);
  border-radius: var(--pb-radius);
  box-shadow: var(--pb-shadow);
  padding: 24px;
  margin: 20px 0;
  position: relative;
}
body.pb-dark .pb-card { background: var(--pb-card-dark); border-color: var(--pb-border-dark); box-shadow: var(--pb-shadow-dark); }
.pb-section-title {
  margin: 0 0 2px;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -.01em;
  padding-left: 14px;
  position: relative;
}
.pb-section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 5px;
  border-radius: 4px;
  background: linear-gradient(180deg, var(--pb-primary), #7b3ff2);
}
.pb-section-desc { margin: 6px 0 16px; font-size: 13px; color: var(--pb-muted); }
body.pb-dark .pb-section-desc { color: var(--pb-muted-dark); }
.pb-grid {
  display: grid; gap: 18px;
  grid-template-columns: repeat(var(--pb-cols, 1), minmax(0, 1fr));
}
@media (max-width: 720px) { .pb-grid { grid-template-columns: 1fr !important; } }
.pb-field { position: relative; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.pb-label { font-size: 13px; font-weight: 600; color: inherit; }
.pb-req { color: var(--pb-danger); }
.pb-input, .pb-select, .pb-textarea {
  width: 100%; padding: 11px 13px;
  border: 1px solid var(--pb-border);
  border-radius: 9px; font-size: 14px; color: inherit;
  background: var(--pb-card);
  font-family: inherit;
  transition: border-color .15s, box-shadow .15s, background .15s;
}
body.pb-dark .pb-input, body.pb-dark .pb-select, body.pb-dark .pb-textarea {
  border-color: var(--pb-border-dark); background: #121a2b; color: var(--pb-text-dark);
}
.pb-input:hover, .pb-select:hover, .pb-textarea:hover { border-color: rgba(37,99,235,.5); }
.pb-input:focus, .pb-select:focus, .pb-textarea:focus {
  outline: none; border-color: var(--pb-primary);
  box-shadow: 0 0 0 3px rgba(37,99,235,.18);
}
.pb-help { font-size: 12px; color: var(--pb-muted); margin-top: -2px; }
body.pb-dark .pb-help { color: var(--pb-muted-dark); }
.pb-check { display: flex; gap: 8px; align-items: center; font-size: 14px; cursor: pointer; padding: 5px 0; border-radius: 6px; }
.pb-check:hover { color: var(--pb-primary); }
.pb-check input { width: 17px; height: 17px; accent-color: var(--pb-primary); cursor: pointer; }
.pb-radio-group { border: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2px; }
.pb-check-grid { display: grid; grid-template-columns: repeat(var(--pb-check-cols, 1), minmax(0, 1fr)); gap: 2px 18px; }
@media (max-width: 720px) { .pb-check-grid { grid-template-columns: 1fr !important; } }
.pb-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 24px; }
.pb-btn {
  padding: 11px 22px; border: none; border-radius: 9px;
  font-size: 14px; font-weight: 600; cursor: pointer;
  text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  min-height: 42px;
  box-shadow: 0 2px 8px rgba(28,35,51,.10);
  transition: filter .15s, transform .05s, box-shadow .15s;
}
.pb-btn:active { transform: translateY(1px); box-shadow: 0 1px 4px rgba(28,35,51,.12); }
.pb-btn:hover { filter: brightness(1.07); box-shadow: 0 4px 14px rgba(28,35,51,.16); }
.pb-btn-primary { background: linear-gradient(135deg, var(--pb-primary), #4f46e5); color: #fff; }
.pb-btn-secondary { background: var(--pb-border); color: var(--pb-text); }
body.pb-dark .pb-btn-secondary { background: var(--pb-border-dark); color: var(--pb-text-dark); }
.pb-btn-success { background: linear-gradient(135deg, var(--pb-success), #15803d); color: #fff; }
.pb-btn-danger { background: linear-gradient(135deg, var(--pb-danger), #b91c1c); color: #fff; }
.pb-status { padding: 13px 15px; border-radius: 9px; margin-top: 18px; display: none; font-size: 14px; }
.pb-status.success { display: block; background: rgba(22,163,74,.12); color: var(--pb-success); border: 1px solid rgba(22,163,74,.35); }
.pb-status.error { display: block; background: rgba(220,38,38,.10); color: var(--pb-danger); border: 1px solid rgba(220,38,38,.35); }
.pb-status.info { display: block; background: rgba(37,99,235,.10); color: var(--pb-primary); border: 1px solid rgba(37,99,235,.35); }
.pb-footer { text-align: center; padding: 26px 0 32px; font-size: 12px; color: var(--pb-muted); }
body.pb-dark .pb-footer { color: var(--pb-muted-dark); }
.pb-acdd {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 50;
  margin-top: 4px; background: var(--pb-card); border: 1px solid var(--pb-border);
  border-radius: 9px; box-shadow: 0 12px 32px rgba(28,35,51,.18); max-height: 220px; overflow: auto;
}
body.pb-dark .pb-acdd { background: var(--pb-card-dark); border-color: var(--pb-border-dark); }
.pb-ac-item { padding: 10px 12px; cursor: pointer; font-size: 14px; transition: background .12s; }
.pb-ac-item:hover, .pb-ac-item.active { background: var(--pb-primary-soft); }
.pb-error { display: none; font-size: 12px; color: var(--pb-danger); margin-top: -2px; }
.pb-error.show { display: block; }
.pb-input.invalid { border-color: var(--pb-danger); box-shadow: 0 0 0 3px rgba(220,38,38,.12); }
body.pb-dark .pb-input.invalid { border-color: var(--pb-danger); }
.pb-modal {
  position: fixed; inset: 0; z-index: 100; display: none;
  align-items: center; justify-content: center;
  background: rgba(10,15,25,.55); padding: 20px;
}
.pb-modal.show { display: flex; animation: pbFade .18s ease-out; }
@keyframes pbFade { from { opacity: 0; } to { opacity: 1; } }
.pb-modal-box {
  background: var(--pb-card); border-radius: 14px;
  box-shadow: 0 24px 64px rgba(10,15,25,.35); max-width: 420px; width: 100%;
  padding: 28px; text-align: center; border: 1px solid var(--pb-border);
  animation: pbPop .2s cubic-bezier(.2,.8,.3,1.2);
}
@keyframes pbPop { from { transform: scale(.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
body.pb-dark .pb-modal-box { background: var(--pb-card-dark); border-color: var(--pb-border-dark); box-shadow: 0 24px 64px rgba(0,0,0,.55); }
.pb-modal-icon {
  width: 56px; height: 56px; margin: 0 auto 14px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; color: #fff;
  box-shadow: 0 6px 18px rgba(28,35,51,.18);
}
.pb-modal-success .pb-modal-icon { background: var(--pb-success); }
.pb-modal-error .pb-modal-icon { background: var(--pb-danger); }
.pb-modal-warning .pb-modal-icon { background: var(--pb-warning); }
.pb-modal-box h3 { margin: 0 0 8px; font-size: 19px; }
.pb-modal-box p { margin: 0 0 20px; font-size: 14px; color: var(--pb-muted); }
body.pb-dark .pb-modal-box p { color: var(--pb-muted-dark); }
.pb-modal-actions { display: flex; gap: 10px; justify-content: center; }
.pb-hide { display: none !important; }
.pb-empty { padding: 26px; text-align: center; color: var(--pb-muted); font-size: 14px; }
`;
  }

  private renderSection(section: Section, columns: number): string {
    const secId = String(section.id).replace(/[^A-Za-z0-9_-]+/g, '_');
    const showIf = section.visibleWhen
      ? ` data-show-if="${this.attr(String(section.visibleWhen).trim())}"`
      : '';
    if (!section.fields || section.fields.length === 0) {
      return `<section class="pb-card" data-sec="${secId}"${showIf}>
  <h2 class="pb-section-title">${this.esc(section.title)}</h2>
  <p class="pb-empty">Esta sección no tiene campos configurados.</p>
</section>`;
    }
    const desc = section.description
      ? `<p class="pb-section-desc">${this.esc(section.description)}</p>`
      : '';
    const fields = section.fields.map((f) => this.renderField(f)).join('\n');
    return `<section class="pb-card" data-sec="${secId}"${showIf}>
  <h2 class="pb-section-title">${this.esc(section.title)}</h2>
${desc}  <div class="pb-grid" style="--pb-cols:${Math.max(1, Math.min(6, Number(columns) || 1))}">
${fields}
  </div>
</section>`;
  }

  private renderField(field: Field): string {
    const id = String(field.id).replace(/[^A-Za-z0-9_-]+/g, '_');
    const cid = 'f_' + id;
    const label = this.esc(field.label || field.id);
    const req = field.required ? ' <span class="pb-req">*</span>' : '';
    const ph = this.attr(field.placeholder);
    const dv = field.type === 'textarea' ? '' : this.attr(field.defaultValue);
    const requiredAttr = field.required ? ' required' : '';
    const readonlyAttr = field.readonly ? ' readonly' : '';
    const help = field.helpText
      ? `\n      <span class="pb-help">${this.esc(field.helpText)}</span>`
      : '';
    const ac = field.autocomplete ? ' data-ac="1"' : '';
    const acUrl = field.autocomplete && field.autocompleteUrl
      ? ` data-ac-url="${this.attr(field.autocompleteUrl)}"`
      : '';
    const showIf = field.visibleWhen
      ? ` data-show-if="${this.attr(String(field.visibleWhen).trim())}"`
      : '';

    switch (field.type) {
      case 'textarea':
        return `      <div class="pb-field"${showIf}>
        <label class="pb-label" for="${cid}">${label}${req}</label>
        <textarea class="pb-textarea" id="${cid}" name="${id}" data-field="${id}" rows="4" placeholder="${ph}"${requiredAttr}${readonlyAttr}>${this.esc(field.defaultValue)}</textarea>
        <span class="pb-error" data-error-for="${id}"></span>${help}
      </div>`;
      case 'select':
        return `      <div class="pb-field"${showIf}>
        <label class="pb-label" for="${cid}">${label}${req}</label>
        <select class="pb-select" id="${cid}" name="${id}" data-field="${id}"${requiredAttr}${this.selectAttrs(field)}>
          <option value="">${ph || 'Seleccione...'}</option>${this.renderOptions(field)}
        </select>
        <span class="pb-error" data-error-for="${id}"></span>${help}
      </div>`;
      case 'checkbox': {
        if (field.multiple) {
          const checked = new Set(
            String(field.defaultValue || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          );
          const cols = Math.max(1, Math.min(6, Number(field.optionsColumns) || 1));
          const urlAttrs = field.optionsFromUrl
            ? ` data-check-url="${this.attr(field.optionsUrl)}" data-value-field="${this.attr(
                field.optionsValueField || 'value',
              )}" data-label-field="${this.attr(field.optionsLabelField || 'label')}"`
            : '';
          return `      <div class="pb-field"${showIf}>
        <span class="pb-label">${label}${req}</span>
        <fieldset class="pb-radio-group pb-check-grid" id="${cid}" style="--pb-check-cols:${cols}"${urlAttrs}>${this.renderCheckboxes(field, id, checked)}
        </fieldset>
        <span class="pb-error" data-error-for="${id}"></span>${help}
      </div>`;
        }
        return `      <div class="pb-field"${showIf}>
        <label class="pb-check">
          <input type="checkbox" id="${cid}" name="${id}" data-field="${id}"${this._checked(field)}>
          <span>${label}${req}</span>
        </label>
        <span class="pb-error" data-error-for="${id}"></span>${help}
      </div>`;
      }
      case 'radio':
        return `      <div class="pb-field"${showIf}>
        <span class="pb-label">${label}${req}</span>
        <fieldset class="pb-radio-group" id="${cid}">${this.renderRadios(field, id)}
        </fieldset>
        <span class="pb-error" data-error-for="${id}"></span>${help}
      </div>`;
      default:
        return `      <div class="pb-field"${showIf}>
        <label class="pb-label" for="${cid}">${label}${req}</label>
        <input class="pb-input" id="${cid}" name="${id}" data-field="${id}" data-type="${field.type}" type="${field.type}" placeholder="${ph}" value="${dv}"${requiredAttr}${readonlyAttr}${ac}${acUrl}>
        <span class="pb-error" data-error-for="${id}"></span>${help}
      </div>`;
    }
  }

  private _checked(field: Field): string {
    return ['true', '1', 'si', 'yes', 'checked'].includes(String(field.defaultValue || '').toLowerCase())
      ? ' checked'
      : '';
  }

  private renderCheckboxes(field: Field, id: string, checked: Set<string>): string {
    if (field.optionsFromUrl) return '';
    const opts = field.options && field.options.length ? field.options : [];
    return opts
      .map((o) => {
        const sel = checked.has(String(o.value)) ? ' checked' : '';
        return `
          <label class="pb-check">
            <input type="checkbox" name="${id}" value="${this.attr(o.value)}" data-field="${id}"${sel}>
            <span>${this.esc(o.label || o.value)}</span>
          </label>`;
      })
      .join('');
  }

  private renderRadios(field: Field, id: string): string {
    const opts = field.options && field.options.length ? field.options : [];
    const current = field.defaultValue;
    return opts
      .map((o) => {
        const sel = String(o.value) === String(current) ? ' checked' : '';
        return `
          <label class="pb-check">
            <input type="radio" name="${id}" value="${this.attr(o.value)}" data-field="${id}"${sel}>
            <span>${this.esc(o.label || o.value)}</span>
          </label>`;
      })
      .join('');
  }

  private renderOptions(field: Field): string {
    if (field.optionsFromUrl) return '';
    if (!field.options || !field.options.length) return '';
    return field.options
      .map((o) => {
        const sel =
          field.defaultValue && String(o.value) === String(field.defaultValue)
            ? ' selected'
            : '';
        return `<option value="${this.attr(o.value)}"${sel}>${this.esc(o.label || o.value)}</option>`;
      })
      .join('');
  }

  private selectAttrs(field: Field): string {
    if (!field.optionsFromUrl) return '';
    return ` data-select-url="${this.attr(field.optionsUrl)}" data-value-field="${this.attr(
      field.optionsValueField || 'value',
    )}" data-label-field="${this.attr(field.optionsLabelField || 'label')}" data-placeholder="${this.attr(
      field.placeholder || 'Seleccione...',
    )}"`;
  }

  private renderButtons(buttons: PageButton[]): string {
    if (!buttons || !buttons.length) {
      return '<button type="submit" class="pb-btn pb-btn-primary">Enviar</button>';
    }
    return buttons
      .map((b) => {
        const actionAttr = `data-pb-action="${b.action}"`;
        const urlAttr = b.url ? ` data-url="${this.attr(b.url)}"` : '';
        const newTab = b.targetBlank ? ' data-newtab="1"' : '';
        const typeAttr = b.action === 'submit' ? 'type="submit"' : 'type="button"';
        return `<button class="pb-btn pb-btn-${b.style}" ${typeAttr} ${actionAttr}${urlAttr}${newTab}>${this.esc(
          b.label || 'Botón',
        )}</button>`;
      })
      .join('\n      ');
  }

  private renderFooter(c: PageConfig): string {
    if (!c.includeFooter) return '';
    return `<footer class="pb-footer">
  <div class="pb-wrap">${this.esc(c.footerText || '')}</div>
</footer>`;
  }

  private buildScript(c: PageConfig): string {
    const cfg = JSON.stringify({
      load: {
        url: c.load.url || '',
        method: c.load.method,
        request: c.load.requestJson || '',
        response: c.load.responseJson || '',
      },
      submit: {
        url: c.submit.url || '',
        method: c.submit.method,
        request: c.submit.requestJson || '',
        response: c.submit.responseJson || '',
      },
      autocomplete: { url: c.autocompleteUrl || '', minChars: c.autocompleteMinChars || 2 },
      messages: { success: c.messageSuccess || '', error: c.messageError || '' },
      modal: {
        enabled: c.modal?.enabled !== false,
        successTitle: c.modal?.successTitle || 'Éxito',
        successMessage: c.modal?.successMessage || c.messageSuccess || 'Datos enviados correctamente.',
        errorTitle: c.modal?.errorTitle || 'Error',
        errorMessage: c.modal?.errorMessage || c.messageError || 'Ocurrió un error al enviar los datos.',
        warningTitle: c.modal?.warningTitle || 'Advertencia',
        warningMessage: c.modal?.warningMessage || 'Revise los campos marcados y vuelva a intentarlo.',
      },
      confirm: {
        enabled: !!c.confirm?.enabled,
        title: c.confirm?.title || 'Confirmar envío',
        message: c.confirm?.message || '¿Está seguro de que desea enviar los datos?',
        okText: c.confirm?.okText || 'Aceptar',
        cancelText: c.confirm?.cancelText || 'Cancelar',
      },
    });
    const fmap = c.sections
      .flatMap((s) => s.fields || [])
      .map((f: Field) => ({
        id: String(f.id).replace(/[^A-Za-z0-9_-]+/g, '_'),
        load: f.loadField || f.id,
        submit: f.submitField || f.id,
        type: f.type,
        required: !!f.required,
        msg: f.requiredMessage || '',
      }));
    const visSections = c.sections
      .filter((s) => !!s.visibleWhen)
      .map((s) => ({
        id: String(s.id).replace(/[^A-Za-z0-9_-]+/g, '_'),
        cond: String(s.visibleWhen).trim(),
      }));
    const visFields = c.sections
      .flatMap((s) => s.fields || [])
      .filter((f: Field) => !!f.visibleWhen)
      .map((f: Field) => ({
        id: String(f.id).replace(/[^A-Za-z0-9_-]+/g, '_'),
        cond: String(f.visibleWhen).trim(),
      }));

    return `'use strict';
var CFG = ${cfg};
var FMAP = ${JSON.stringify(fmap)};
var VIS = { sections: ${JSON.stringify(visSections)}, fields: ${JSON.stringify(visFields)} };
var PENDING_SUBMIT = null;

function $(s){ return document.querySelector(s); }
function $$(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }

function valueOf(el){
  if(!el) return null;
  if(el.type === 'checkbox'){
    var name = el.name || el.getAttribute('name');
    var boxes = name ? document.getElementsByName(name) : null;
    var count = boxes ? boxes.length : 0;
    var isGroup = false;
    for(var b=0;b<count;b++){ if(boxes[b].type === 'checkbox' && boxes[b] !== el){ isGroup = true; break; } }
    if(isGroup){
      var vals = [];
      for(var c=0;c<count;c++){
        var cb = boxes[c];
        if(cb.type === 'checkbox' && cb.checked){ vals.push(cb.value); }
      }
      return vals.length ? vals : null;
    }
    return el.checked ? true : null;
  }
  if(el.type === 'radio') return el.checked ? el.value : null;
  if(el.tagName === 'SELECT') return (el.value === '') ? null : el.value;
  return el.value || null;
}

function setValue(el, v){
  if(!el) return;
  if(v === undefined || v === null) v = '';
  if(el.type === 'checkbox'){
    var name = el.name || el.getAttribute('name');
    var boxes = name ? document.getElementsByName(name) : null;
    var count = boxes ? boxes.length : 0;
    var isGroup = false;
    for(var b=0;b<count;b++){ if(boxes[b].type === 'checkbox' && boxes[b] !== el){ isGroup = true; break; } }
    if(isGroup){
      var list = Array.isArray(v) ? v : String(v).split(',').map(function(x){ return String(x).trim(); }).filter(Boolean);
      for(var c=0;c<count;c++){
        var cb = boxes[c];
        if(cb.type === 'checkbox'){ cb.checked = (list.indexOf(cb.value) >= 0); }
      }
      return;
    }
    el.checked = !!(v === true || v === 'true' || v === 1 || v === '1');
    return;
  }
  if(el.type === 'radio'){
    var name = el.name || el.getAttribute('name');
    var radios = document.getElementsByName(name);
    for(var i=0;i<radios.length;i++){ radios[i].checked = (String(radios[i].value) === String(v)); }
    return;
  }
  if(el.tagName === 'SELECT'){
    var hit = null;
    for(var j=0;j<el.options.length;j++){ if(el.options[j].value === String(v)){ hit = el.options[j]; break; } }
    if(hit){ el.value = String(v); } else { el.dataset.pendingValue = String(v); }
    return;
  }
  el.value = v;
  if(el.dispatchEvent){ try{ el.dispatchEvent(new Event('input',{bubbles:true})); }catch(e){} }
}

function elementFor(f){
  var el = document.querySelector('[data-field="' + f.id + '"]');
  if(el && el.type === 'radio' && !el.checked){
    var radios = document.getElementsByName(el.name || el.getAttribute('name'));
    for(var i=0;i<radios.length;i++){ if(radios[i].checked) return radios[i]; }
  }
  return el;
}

function fieldValue(f){
  return valueOf(elementFor(f));
}

function markError(f, on){
  var el = document.querySelector('[data-field="' + f.id + '"]');
  if(el) el.classList.toggle('invalid', !!on);
  var span = document.querySelector('[data-error-for="' + f.id + '"]');
  if(span){
    if(on){ span.textContent = f.msg || 'Este campo es obligatorio.'; }
    span.classList.toggle('show', !!on);
  }
}

function clearFieldError(id){
  var span = document.querySelector('[data-error-for="' + id + '"]');
  if(span) span.classList.remove('show');
  var el = document.querySelector('[data-field="' + id + '"]');
  if(el) el.classList.remove('invalid');
}

function validateFields(){
  var missing = [];
  FMAP.forEach(function(f){
    if(!f.required) return;
    if(isFieldHidden(f.id)) return;
    var v = fieldValue(f);
    var ok = (v !== undefined && v !== null && String(v).trim() !== '');
    markError(f, !ok);
    if(!ok) missing.push(f);
  });
  return missing;
}

function pathGet(obj, path){
  if(obj === null || obj === undefined) return undefined;
  path = String(path || '');
  if(obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, path)) return obj[path];
  if(path.indexOf('.') >= 0 || path.indexOf('[') >= 0){
    var parts = path.replace(/\\[/g, '.').replace(/\\]/g, '').split('.');
    var cur = obj;
    for(var i=0;i<parts.length;i++){
      var p = parts[i];
      if(cur === null || cur === undefined) return undefined;
      if(cur instanceof Array && /^\\d+$/.test(p)) cur = cur[Number(p)];
      else cur = cur[p];
    }
    return cur;
  }
  if(obj instanceof Array){ return undefined; }
  for(var k in obj){
    if(Object.prototype.hasOwnProperty.call(obj, k) && String(k).toLowerCase() === path.toLowerCase()) return obj[k];
  }
  return undefined;
}

function mapResponse(data){
  if(!data || typeof data !== 'object') return;
  FMAP.forEach(function(f){
    var v = pathGet(data, f.load || f.id);
    if(v !== undefined && v !== null){
      var el = document.querySelector('[data-field="' + f.id + '"]');
      setValue(el, v);
    }
  });
}

function interpolate(tpl, data){
  if(!tpl) return '';
  if(tpl.indexOf('{{') < 0) return tpl;
  return tpl.replace(/\\{\\{\\s*([\\w.]+)\\s*\\}\\}/g, function(m, key){
    var f = null;
    for(var i=0;i<FMAP.length;i++){
      if(FMAP[i].submit === key || FMAP[i].id === key){ f = FMAP[i]; break; }
    }
    if(f){
      var v = fieldValue(f);
      return (v === undefined || v === null) ? '' : String(v);
    }
    var v2 = pathGet(data, key);
    if(v2 === undefined || v2 === null) return '';
    if(typeof v2 === 'object') return JSON.stringify(v2);
    return String(v2);
  });
}

function pbFieldVal(id){
  var el = document.querySelector('[data-field="' + id + '"]');
  var v = valueOf(el);
  if(v === undefined || v === null || v === '') return null;
  if(typeof v === 'number') return v;
  var s = String(v);
  if(s.trim() !== '' && !isNaN(Number(s))) return Number(s);
  return s;
}

function pbTokenize(expr){
  var toks = [];
  var i = 0;
  var n = expr.length;
  while(i < n){
    var ch = expr[i];
    if(ch === ' ' || ch === '\\t' || ch === '\\n' || ch === '\\r'){ i++; continue; }
    if(ch === '(' || ch === ')'){ toks.push(ch); i++; continue; }
    if(ch === "'"){
      var j = expr.indexOf("'", i + 1);
      if(j < 0) return null;
      toks.push(expr.slice(i, j + 1)); i = j + 1; continue;
    }
    if(ch === '"'){
      var j2 = expr.indexOf('"', i + 1);
      if(j2 < 0) return null;
      toks.push(expr.slice(i, j2 + 1)); i = j2 + 1; continue;
    }
    if(!isNaN(ch) || ch === '.'){
      var m = /^[0-9]+(?:\\.[0-9]+)?/.exec(expr.slice(i));
      if(m){ toks.push(Number(m[0])); i += m[0].length; continue; }
    }
    var ops = ['==', '!=', '<=', '>=', '&&', '||'];
    var matched = null;
    for(var oi = 0; oi < ops.length; oi++){
      if(expr.slice(i, i + ops[oi].length) === ops[oi]){ matched = ops[oi]; break; }
    }
    if(matched){ toks.push(matched); i += matched.length; continue; }
    if(ch === '<' || ch === '>'){ toks.push(ch); i++; continue; }
    if(ch === '!'){ toks.push(ch); i++; continue; }
    if(/[A-Za-z]/.test(ch)){
      var m2 = /^[A-Za-z][A-Za-z0-9_.-]*/.exec(expr.slice(i));
      if(m2){ toks.push(m2[0]); i += m2[0].length; continue; }
    }
    return null;
  }
  return toks;
}

function pbCompare(a, op, b){
  var same = (a === b) || (String(a) === String(b));
  if(op === '==') return same;
  if(op === '!=') return !same;
  if(typeof a === 'number' && typeof b === 'number'){
    if(op === '<') return a < b;
    if(op === '>') return a > b;
    if(op === '<=') return a <= b;
    if(op === '>=') return a >= b;
  }
  var as = String(a), bs = String(b);
  if(op === '<') return as < bs;
  if(op === '>') return as > bs;
  if(op === '<=') return as <= bs;
  if(op === '>=') return as >= bs;
  return false;
}

function pbEval(expr, data){
  var toks = pbTokenize(expr);
  if(!toks) return false;
  var pos = 0;
  function peek(){ return toks[pos]; }
  function parseOr(){
    var l = parseAnd();
    while(peek() === '||'){ pos++; var r = parseAnd(); l = l || r; }
    return l;
  }
  function parseAnd(){
    var l = parseNot();
    while(peek() === '&&'){ pos++; var r = parseNot(); l = l && r; }
    return l;
  }
  function parseNot(){
    if(peek() === '!'){ pos++; return !parseNot(); }
    return parseCmp();
  }
  function parseCmp(){
    var l = parsePrim();
    var op = peek();
    if(op === '==' || op === '!=' || op === '<' || op === '>' || op === '<=' || op === '>='){
      pos++;
      var r = parsePrim();
      return pbCompare(l, op, r);
    }
    return l;
  }
  function parsePrim(){
    var t = peek();
    if(t === undefined) return null;
    pos++;
    if(t === '('){
      var v = parseOr();
      if(peek() === ')') pos++;
      return v;
    }
    if(typeof t === 'number') return t;
    if(typeof t === 'string'){
      if(t.charAt(0) === "'") return t.slice(1, -1);
      if(t.charAt(0) === '"') return t.slice(1, -1);
      return pbFieldVal(t);
    }
    return null;
  }
  return parseOr();
}

function isFieldHidden(id){
  var el = document.querySelector('[data-field="' + id + '"]');
  if(!el) return false;
  if(el.closest && el.closest('.pb-hide')) return true;
  var wrap = el.closest ? el.closest('.pb-field') : null;
  return !!(wrap && wrap.dataset.pbHidden === '1');
}

function refreshVisibility(){
  var sandbox = collectForm();
  VIS.sections.forEach(function(it){
    var el = document.querySelector('[data-sec="' + it.id + '"]');
    if(!el) return;
    var show = it.cond ? pbEval(it.cond, sandbox) : true;
    el.classList.toggle('pb-hide', !show);
    el.dataset.pbHidden = show ? '' : '1';
  });
  VIS.fields.forEach(function(it){
    var el = document.querySelector('[data-field="' + it.id + '"]');
    var wrap = (el && el.closest) ? el.closest('.pb-field') : null;
    if(!wrap) return;
    var show = it.cond ? pbEval(it.cond, sandbox) : true;
    wrap.classList.toggle('pb-hide', !show);
    wrap.dataset.pbHidden = show ? '' : '1';
  });
}

function collectForm(){
  var out = {};
  FMAP.forEach(function(f){
    if(isFieldHidden(f.id)) return;
    var v = fieldValue(f);
    if(v === undefined || v === null) return;
    var key = f.submit || f.id;
    if(Object.prototype.hasOwnProperty.call(out, key)){
      var prev = out[key];
      var item = (typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v;
      if(Array.isArray(prev)){ prev.push(item); }
      else { out[key] = [prev, item]; }
    } else {
      out[key] = (typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v;
    }
  });
  return out;
}

function mostrarModal(tipo, titulo, msg){
  var mdl = document.getElementById('pb-modal');
  if(!mdl) return;
  var data = collectForm();
  if(titulo) titulo = interpolate(titulo, data);
  if(msg) msg = interpolate(msg, data);
  var icons = { success: '&#10003;', error: '&#10005;', warning: '&#33;' };
  var box = mdl.querySelector('.pb-modal-box');
  box.className = 'pb-modal-box pb-modal-' + (tipo || 'info');
  document.getElementById('pb-modal-icon').innerHTML = icons[tipo] || '!';
  document.getElementById('pb-modal-title').textContent = titulo || '';
  document.getElementById('pb-modal-msg').textContent = msg || '';
  mdl.classList.add('show');
}

function mostrarConfirm(onOk){
  if(!CFG.confirm || !CFG.confirm.enabled) return;
  PENDING_SUBMIT = onOk;
  var cancel = document.getElementById('pb-modal-cancel');
  if(cancel){ cancel.style.display = 'inline-flex'; cancel.textContent = CFG.confirm.cancelText || 'Cancelar'; }
  var ok = document.getElementById('pb-modal-ok');
  if(ok) ok.textContent = CFG.confirm.okText || 'Aceptar';
  mostrarModal('warning', CFG.confirm.title || 'Confirmar envío', CFG.confirm.message || '¿Está seguro de que desea enviar los datos?');
}

function cerrarModal(){
  PENDING_SUBMIT = null;
  var mdl = document.getElementById('pb-modal');
  if(mdl) mdl.classList.remove('show');
}

function notify(tipo, titulo, msg){
  if(titulo) titulo = interpolate(titulo, collectForm());
  if(msg) msg = interpolate(msg, collectForm());
  if(!CFG.modal.enabled){
    showStatus(msg, tipo === 'success' ? 'success' : (tipo === 'error' ? 'error' : 'info'));
    return;
  }
  mostrarModal(tipo, titulo, msg);
}

function showStatus(msg, kind){
  var st = document.getElementById('pb-status');
  if(!st) return;
  if(msg){ st.textContent = msg; st.className = 'pb-status ' + (kind || 'info'); st.style.display = 'block'; }
  else { st.textContent = ''; st.style.display = 'none'; }
}

function clearStatus(){ showStatus('', ''); }

function pickList(data){
  if(Array.isArray(data)) return data;
  if(data && data.data && Array.isArray(data.data)) return data.data;
  if(data && data.items && Array.isArray(data.items)) return data.items;
  if(data && data.results && Array.isArray(data.results)) return data.results;
  if(data && data.list && Array.isArray(data.list)) return data.list;
  return [];
}

function loadSelects(){
  $$('select[data-select-url]').forEach(function(sel){
    var url = sel.getAttribute('data-select-url');
    if(!url) return;
    var vf = sel.getAttribute('data-value-field') || 'value';
    var lf = sel.getAttribute('data-label-field') || 'label';
    var field = sel.getAttribute('data-field');
    var pending = sel.dataset.pendingValue;
    sel.disabled = true;
    fetch(url, { headers: { 'Accept': 'application/json' } })
      .then(function(r){ return r.json(); })
      .then(function(data){
        var list = pickList(data);
        var cur = sel.value;
        sel.innerHTML = '';
        var phOpt = document.createElement('option');
        phOpt.value = '';
        phOpt.textContent = sel.getAttribute('data-placeholder') || 'Seleccione...';
        sel.appendChild(phOpt);
        list.forEach(function(item){
          var it = (item && typeof item === 'object') ? item : { value: item, label: item };
          var ov = pathGet(it, vf);
          var ol = pathGet(it, lf);
          if(ov === undefined || ov === null) ov = (typeof item === 'object') ? pathGet(item, field) : item;
          if(ol === undefined || ol === null) ol = (typeof item === 'object') ? (it.label || it.name || it.id || ov) : item;
          var opt = document.createElement('option');
          opt.value = (ov === undefined || ov === null) ? '' : String(ov);
          opt.textContent = (ol === undefined || ol === null) ? '' : String(ol);
          sel.appendChild(opt);
        });
        var want = (pending !== undefined && pending !== null) ? pending : cur;
        sel.dataset.pendingValue = '';
        setValue(sel, want);
        sel.disabled = false;
        try{ sel.dispatchEvent(new Event('change', { bubbles: true })); }catch(e){}
      })
      .catch(function(){
        sel.disabled = false;
        sel.setAttribute('data-load-error', '1');
      });
  });
}

function loadCheckGroups(){
  $$('fieldset[data-check-url]').forEach(function(fs){
    var url = fs.getAttribute('data-check-url');
    if(!url) return;
    var vf = fs.getAttribute('data-value-field') || 'value';
    var lf = fs.getAttribute('data-label-field') || 'label';
    var checked = [];
    var fid = null;
    var boxes = fs.querySelectorAll('input[type="checkbox"]');
    for(var i=0;i<boxes.length;i++){
      if(boxes[i].checked) checked.push(boxes[i].value);
      if(!fid) fid = boxes[i].getAttribute('data-field');
    }
    fetch(url, { headers: { 'Accept': 'application/json' } })
      .then(function(r){ return r.json(); })
      .then(function(data){
        var list = pickList(data);
        fs.innerHTML = '';
        list.forEach(function(item){
          var it = (item && typeof item === 'object') ? item : { value: item, label: item };
          var ov = pathGet(it, vf);
          var ol = pathGet(it, lf);
          if(ov === undefined || ov === null) ov = (typeof item === 'object') ? pathGet(item, fid) : item;
          if(ol === undefined || ol === null) ol = (typeof item === 'object') ? (it.label || it.name || it.id || ov) : item;
          var lb = document.createElement('label');
          lb.className = 'pb-check';
          var cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.name = fid || 'pb_cb';
          cb.value = (ov === undefined || ov === null) ? '' : String(ov);
          if(fid) cb.setAttribute('data-field', fid);
          if(checked.indexOf(cb.value) >= 0) cb.checked = true;
          var sp = document.createElement('span');
          sp.textContent = (ol === undefined || ol === null) ? '' : String(ol);
          lb.appendChild(cb);
          lb.appendChild(sp);
          fs.appendChild(lb);
        });
      })
      .catch(function(){
        fs.setAttribute('data-load-error', '1');
      });
  });
}

function runLoad(){
  if(!CFG.load || !CFG.load.url) { loadSelects(); loadCheckGroups(); return; }
  var data = collectForm();
  var tpl = CFG.load.request || '';
  var body = /\\{\\{/.test(tpl) ? interpolate(tpl, data) : (tpl.trim() ? tpl : '');
  var method = (CFG.load.method || 'GET').toUpperCase();
  var url = CFG.load.url;
  var init = { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' } };
  if(method === 'GET'){
    init.method = 'GET';
    if(body){ url = url + (url.indexOf('?') >= 0 ? '&' : '?') + body; }
  } else {
    init.method = method;
    init.body = body ? body : JSON.stringify(data);
  }
  showStatus('Cargando datos...', 'info');
  fetch(url, init)
    .then(function(r){ return r.text(); })
    .then(function(text){
      var parsed;
      try { parsed = JSON.parse(text); } catch(e){ parsed = text; }
      if(parsed && typeof parsed === 'object'){ mapResponse(parsed); loadSelects(); loadCheckGroups(); }
      else { loadSelects(); loadCheckGroups(); }
      var msg = (parsed && typeof parsed === 'object' && parsed.message) ? parsed.message : 'Datos cargados correctamente.';
      showStatus(msg, 'success');
    })
    .catch(function(err){
      loadSelects();
      loadCheckGroups();
      showStatus('Error al cargar los datos: ' + (err && err.message ? err.message : err), 'error');
    });
}

function bindAutocomplete(){
  var min = (CFG.autocomplete.minChars > 0) ? CFG.autocomplete.minChars : 2;
  $$('[data-ac]').forEach(function(input){
    var inputUrl = input.getAttribute('data-ac-url');
    var url = inputUrl || (CFG.autocomplete ? CFG.autocomplete.url : '');
    if(!url) return;
    input.setAttribute('autocomplete', 'off');
    var box = document.createElement('div');
    box.className = 'pb-acdd';
    box.style.display = 'none';
    var holder = input.parentNode;
    holder.appendChild(box);
    var timer = null;
    var lastQ = input.value;
    function hide(){ box.style.display = 'none'; }
    function search(v){
      var url2 = url + (url.indexOf('?') >= 0 ? '&' : '?')
        + 'q=' + encodeURIComponent(v)
        + '&field=' + encodeURIComponent(input.getAttribute('data-field') || '');
      fetch(url2, { headers: { 'Accept': 'application/json' } })
        .then(function(r){ return r.json(); })
        .then(function(data){
          if(lastQ !== input.value) return;
          var list = pickList(data);
          if(!list.length){ hide(); return; }
          box.innerHTML = '';
          list.forEach(function(item, ix){
            var it = (item && typeof item === 'object') ? item : { label: item, value: item };
            var lb = it.label || it.text || it.name || it.id || it.value;
            if(lb === undefined || lb === null) return;
            var row = document.createElement('div');
            row.className = 'pb-ac-item';
            row.textContent = String(lb);
            row.tabIndex = 0;
            row.addEventListener('mousedown', function(ev){
              ev.preventDefault();
              input.value = String(lb);
              hide();
              try{ input.dispatchEvent(new Event('input', { bubbles: true })); }catch(e){}
            });
            box.appendChild(row);
          });
          box.style.display = 'block';
        })
        .catch(function(){ hide(); });
    }
    input.addEventListener('input', function(){
      var v = input.value;
      lastQ = v;
      if(timer) clearTimeout(timer);
      if(v.length < min){ hide(); return; }
      timer = setTimeout(function(){ search(v); }, 250);
    });
    input.addEventListener('focus', function(){
      if(input.value && input.value.length >= min) search(input.value);
    });
    input.addEventListener('blur', function(){ setTimeout(hide, 200); });
    input.addEventListener('keydown', function(e){
      var items = box.querySelectorAll('.pb-ac-item');
      var idx = -1;
      for(var i=0;i<items.length;i++){ if(items[i].className.indexOf('active') >= 0){ idx = i; } }
      if(e.key === 'ArrowDown' && items.length){
        e.preventDefault();
        for(var j=0;j<items.length;j++){ items[j].className = 'pb-ac-item' + (j === Math.min(idx + 1, items.length - 1) ? ' active' : ''); }
      } else if(e.key === 'ArrowUp' && items.length){
        e.preventDefault();
        var newIdx = (idx <= 0) ? 0 : idx - 1;
        for(var k=0;k<items.length;k++){ items[k].className = 'pb-ac-item' + (k === newIdx ? ' active' : ''); }
      } else if(e.key === 'Enter' && idx >= 0 && items.length){
        e.preventDefault();
        var target = items[idx];
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      } else if(e.key === 'Escape'){ hide(); }
    });
  });
}

function submitForm(e){
  if(e) e.preventDefault();
  var missing = validateFields();
  if(missing.length){
    var labels = [];
    for(var mi=0; mi<missing.length; mi++){
      var fieldEl = document.querySelector('[data-field="' + missing[mi].id + '"]');
      var lb = fieldEl && fieldEl.closest ? fieldEl.closest('.pb-field') : null;
      var txt = lb ? lb.querySelector('label, span.pb-label') : null;
      labels.push(txt ? String(txt.textContent || '').trim().replace(/\\s*\\*\\s*$/, '') : missing[mi].id);
    }
    notify('warning', CFG.modal.warningTitle, (CFG.modal.warningMessage || 'Revise los campos marcados.') + (labels.length ? ' (' + labels.join(', ') + ')' : ''));
    return;
  }
  if(!CFG.submit || !CFG.submit.url){
    notify('error', CFG.modal.errorTitle, CFG.modal.errorMessage || 'No se ha configurado una URL para el envío de datos.');
    return;
  }
  if(CFG.confirm && CFG.confirm.enabled){
    mostrarConfirm(submitNow);
    return;
  }
  submitNow();
}

function submitNow(){
  var data = collectForm();
  var tpl = CFG.submit.request || '';
  var body = /\\{\\{/.test(tpl) ? interpolate(tpl, data) : (tpl.trim() ? tpl : '');
  var method = (CFG.submit.method || 'POST').toUpperCase();
  var url = CFG.submit.url;
  var init = { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' } };
  if(method === 'GET'){
    init.method = 'GET';
    if(body){ url = url + (url.indexOf('?') >= 0 ? '&' : '?') + body; }
  } else {
    init.method = method;
    init.body = body ? body : JSON.stringify(data);
  }
  showStatus('Enviando datos...', 'info');
  fetch(url, init)
    .then(function(r){ return r.text(); })
    .then(function(text){
      var parsed;
      try { parsed = JSON.parse(text); } catch(e){ parsed = text; }
      if(parsed && typeof parsed === 'object'){
        mapResponse(parsed);
        var m = parsed.message || parsed.msg;
        notify('success', CFG.modal.successTitle, m ? String(m) : CFG.modal.successMessage);
      } else {
        notify('success', CFG.modal.successTitle, CFG.modal.successMessage);
      }
    })
    .catch(function(err){
      notify('error', CFG.modal.errorTitle, CFG.modal.errorMessage || ('Error al enviar los datos: ' + (err && err.message ? err.message : err)));
    });
}

function cleanForm(){
  var form = document.getElementById('pb-form');
  if(form) form.reset();
  $$('[data-field]').forEach(function(el){
    if(el.type === 'checkbox'){ el.checked = false; return; }
    if(el.type === 'radio'){ el.checked = false; return; }
    if('value' in el) el.value = '';
  });
  $$('.pb-error.show').forEach(function(sp){ sp.classList.remove('show'); });
  $$('.pb-input.invalid').forEach(function(el){ el.classList.remove('invalid'); });
  clearStatus();
}

function wire(){
  var form = document.getElementById('pb-form');
  if(form) form.addEventListener('submit', submitForm);
  var okBtn = document.getElementById('pb-modal-ok');
  if(okBtn) okBtn.addEventListener('click', function(){
    if(PENDING_SUBMIT){
      var fn = PENDING_SUBMIT;
      PENDING_SUBMIT = null;
      var cancel = document.getElementById('pb-modal-cancel');
      if(cancel) cancel.style.display = 'none';
      fn();
      return;
    }
    cerrarModal();
  });
  var cancelBtn = document.getElementById('pb-modal-cancel');
  if(cancelBtn) cancelBtn.addEventListener('click', function(){
    cerrarModal();
  });
  var overlay = document.getElementById('pb-modal');
  if(overlay) overlay.addEventListener('mousedown', function(ev){
    if(ev.target === overlay) cerrarModal();
  });
  $$('[data-field]').forEach(function(el){
    function clearMe(){
      var id = el.getAttribute('data-field');
      clearFieldError(id);
      refreshVisibility();
    }
    el.addEventListener('input', clearMe);
    el.addEventListener('change', clearMe);
  });
  $$('[data-pb-action]').forEach(function(btn){
    var action = btn.getAttribute('data-pb-action');
    if(action === 'submit') return;
    btn.addEventListener('click', function(){
      if(btn.getAttribute('type') === 'submit') return;
      if(action === 'clean'){ cleanForm(); refreshVisibility(); return; }
      if(action === 'navigation'){
        var u = btn.getAttribute('data-url');
        if(!u){ showStatus('El botón de navegación no tiene URL.', 'error'); return; }
        if(btn.getAttribute('data-newtab') === '1'){ window.open(u, '_blank'); }
        else { window.location.href = u; }
      }
    });
  });
  bindAutocomplete();
  runLoad();
  refreshVisibility();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wire);
} else {
  wire();
}

window.PB_PAGE_API = {
  getValues: collectForm,
  setValues: function(data){ mapResponse(data); },
  submit: submitForm,
  clean: cleanForm,
  reload: runLoad,
  populateSelects: loadSelects,
  populateCheckGroups: loadCheckGroups,
  showModal: mostrarModal,
  closeModal: cerrarModal,
  notify: notify
};`;
  }

  download(config: PageConfig) {
    const html = this.generate(config);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const a = this.doc.createElement('a');
    const name = (config.pageTitle || 'pagina')
      .toLowerCase()
      .replace(/[^\w]+/g, '-')
      .replace(/^-|-$/g, '') || 'pagina';
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  private esc(text: string | number | boolean | null | undefined): string {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private attr(text: string | number | boolean | null | undefined): string {
    return this.esc(text);
  }
}