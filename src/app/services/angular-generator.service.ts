import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HtmlGeneratorService } from './html-generator.service';
import type { Field, PageConfig, PageButton, Section, SelectOption, TableColumn } from '../models';

export interface AngularOutput {
  selector: string;
  className: string;
  fileBase: string;
  ts: string;
  html: string;
  css: string;
  combined: string;
}

@Injectable({ providedIn: 'root' })
export class AngularGeneratorService {
  constructor(
    private htmlGen: HtmlGeneratorService,
    @Inject(DOCUMENT) private doc: Document,
  ) {}

  naming(config: PageConfig): { selector: string; className: string; fileBase: string } {
    const base = String(config.pageTitle || 'pagina')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'pagina';
    const camel = base
      .split('-')
      .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : ''))
      .join('');
    return { selector: 'app-' + base, className: camel + 'Component', fileBase: base };
  }

  generate(config: PageConfig): AngularOutput {
    const name = this.naming(config);
    const html = this.buildTemplate(config, name);
    const css = this.angularCss(config);
    const ts = this.buildTs(config, name, html, css, false);
    const combined = this.buildTs(config, name, html, css, true);
    return { selector: name.selector, className: name.className, fileBase: name.fileBase, ts, html, css, combined };
  }

  private key(id: string): string {
    return String(id).replace(/[^A-Za-z0-9_-]/g, '_');
  }

  private pasoOf(s: Section): number {
    return Math.max(0, Math.floor(Number((s as any).paso) || 0));
  }

  private stepsOf(c: PageConfig): number[] {
    const vals = c.sections.map((s) => this.pasoOf(s));
    const distinct = Array.from(new Set(vals));
    if (distinct.length <= 1) return c.sections.map((_, i) => i);
    return distinct.sort((a, b) => a - b);
  }

  private stepRankOf(c: PageConfig, i: number): number {
    const vals = c.sections.map((s) => this.pasoOf(s));
    const distinct = Array.from(new Set(vals));
    if (distinct.length <= 1) return i;
    return distinct.sort((a, b) => a - b).indexOf(vals[i]);
  }

  private pasosMeta(c: PageConfig): { id: string; label: string; autoSave: boolean; saveUrl: string }[] {
    return this.stepsOf(c).map((_, k) => {
      const p = c.pasos?.[k];
      return {
        id: String(p?.id ?? ''),
        label: String(p?.label ?? '') || `Paso ${k + 1}`,
        autoSave: !!p?.autoSave,
        saveUrl: String(p?.saveUrl ?? ''),
      };
    });
  }

  private buildTemplate(config: PageConfig, name: { fileBase: string }): string {
    const c = config;
    const defaultCols = c.layout === 'vertical' ? 1 : c.layout === 'twoColumns' ? 2 : Math.max(1, Math.min(6, Number(c.defaultColumns) || 2));
    const dark = c.theme === 'dark';
    const subtitle = `${c.sections.length} sección(es) · ${c.sections.reduce((t, s) => t + (s.fields?.length || 0), 0)} campo(s)`;
    const stepBar = c.multiStep
      ? `  <div class="pb-steps" *ngIf="multiPaso">
      <button *ngFor="let p of pasos; let i = index" type="button" class="pb-step" [class.active]="paso === i" [class.done]="i < paso" (click)="irPaso(i)">{{ p.label }}</button>
    </div>`
      : '';
    const sections = c.sections
      .map((s, i) => this.tSection(s, s.columns || defaultCols, this.stepRankOf(c, i), !!c.multiStep))
      .join('\n');
    const buttons = this.tButtons(c.buttons);
    const actions = c.multiStep
      ? `  <div class="pb-stepnav" *ngIf="multiPaso">
      <button type="button" class="pb-btn pb-btn-secondary" *ngIf="paso > 0" (click)="retroceder()">‹ Anterior</button>
      <button type="button" class="pb-btn pb-btn-secondary" *ngIf="guardadoManual" (click)="enviar(form)">Guardar</button>
      <div class="pb-actions" *ngIf="paso === pasos.length - 1">
${buttons}
      </div>
      <button type="button" class="pb-btn pb-btn-secondary" *ngIf="paso < pasos.length - 1" (click)="avanzar()">Siguiente ›</button>
    </div>
  <div class="pb-actions" *ngIf="!multiPaso">
${buttons}
    </div>`
      : `  <div class="pb-actions">
${buttons}
  </div>`;
    const footer = c.includeFooter
      ? `  <footer class="pb-footer">
    <div class="pb-wrap">${this.esc(c.footerText)}</div>
  </footer>`
      : '';
    const modal = `<div class="pb-modal" [class.show]="modalVisible" (mousedown)="cerrarModal($event)">
    <div class="pb-modal-box" [class.pb-modal-success]="modalTipo === 'success'" [class.pb-modal-error]="modalTipo === 'error'" [class.pb-modal-warning]="modalTipo === 'warning'">
      <div class="pb-modal-icon">{{ modalIcono }}</div>
      <h3>{{ modalTitulo }}</h3>
      <p>{{ modalMsg }}</p>
      <div class="pb-modal-actions">
        <button *ngIf="modalConfirm" type="button" class="pb-btn pb-btn-secondary" (click)="cerrarModal()">{{ modalCancelText }}</button>
        <button type="button" class="pb-btn pb-btn-primary" (click)="okModal()">{{ modalOkText }}</button>
      </div>
    </div>
  </div>`;

    return `<div class="pb-page${dark ? ' pb-dark' : ''}">
  <header class="pb-header">
    <div class="pb-wrap">
      <h1 class="pb-title">${this.esc(c.pageTitle)}</h1>
      <p class="pb-subtitle">${this.esc(subtitle)}</p>
    </div>
  </header>
  <main class="pb-wrap">
    <form #form="ngForm" (ngSubmit)="enviar(form)" novalidate>
${stepBar}
${sections}
      <div class="pb-status" [class.success]="tipoMensaje === 'success'" [class.error]="tipoMensaje === 'error'" [class.info]="tipoMensaje === 'info'" [style.display]="statusVisible ? 'block' : 'none'">{{ mensaje }}</div>
${actions}
    </form>
  </main>
${footer}
${modal}
</div>
`;
  }

  private tSection(section: Section, columns: number, idx = 0, multiStep = false): string {
    const secId = this.key(section.id);
    const conds: string[] = [];
    if (multiStep) conds.push(`paso === ${idx}`);
    if (section.visibleWhen) conds.push(`visSeccion('${secId}')`);
    const showIf = conds.length ? ` *ngIf="${conds.join(' && ')}"` : '';
    if (!section.fields || section.fields.length === 0) {
      return `    <section class="pb-card"${showIf}>
      <h2 class="pb-section-title">${this.esc(section.title)}</h2>
      <p class="pb-empty">Esta sección no tiene campos configurados.</p>
    </section>`;
    }
    const desc = section.description
      ? `      <p class="pb-section-desc">${this.esc(section.description)}</p>`
      : '      <p class="pb-section-desc"></p>';
    const fields = section.fields.map((f) => this.tField(f)).join('\n');
    return `    <section class="pb-card"${showIf}>
      <h2 class="pb-section-title">${this.esc(section.title)}</h2>
${desc}
      <div class="pb-grid" style="--pb-cols:${Math.max(1, Math.min(6, Number(columns) || 1))}">
${fields}
      </div>
    </section>`;
  }

  private tField(f: Field): string {
    const id = this.key(f.id);
    const cid = 'f_' + id;
    const key = "model['" + id + "']";
    const label = this.esc(f.label || f.id);
    const req = f.required ? ' <span class="pb-req">*</span>' : '';
    const ph = this.attr(f.placeholder);
    const requiredAttr = f.required ? ' required' : '';
    const readonlyAttr = f.readonly ? ' readonly' : '';
    const help = f.helpText ? `\n      <span class="pb-help">${this.esc(f.helpText)}</span>` : '';
    const err = `\n      <span class="pb-error" [class.show]="errores['${id}']">{{ errores['${id}'] }}</span>`;
    const showIf = f.visibleWhen
      ? ` *ngIf="visCampo('${id}')"`
      : '';

    switch (f.type) {
      case 'textarea': {
        const ac = f.autocomplete
          ? ` autocomplete="off" (input)="buscar($event, '${id}')" (keydown)="acKey($event, '${id}')" (blur)="ocultarAc('${id}')"`
          : ` (input)="limpiarErrorCS('${id}')"`;
        return `      <div class="pb-field"${showIf}>
        <label class="pb-label" for="${cid}">${label}${req}</label>
        <textarea class="pb-textarea" id="${cid}" name="${id}" [(ngModel)]="${key}" rows="4" placeholder="${ph}"${requiredAttr}${readonlyAttr}${ac} (change)="limpiarErrorCS('${id}')"></textarea>${f.autocomplete ? this.acBox(id) : ''}${err}${help}
      </div>`;
      }
      case 'select':
        return `      <div class="pb-field"${showIf}>
        <label class="pb-label" for="${cid}">${label}${req}</label>
        <select class="pb-select" id="${cid}" name="${id}" [(ngModel)]="${key}"${requiredAttr}${readonlyAttr} (change)="limpiarErrorCS('${id}')">
          <option value="">${ph || 'Seleccione...'}</option>
          <option *ngFor="let o of opciones['${id}']" [value]="o.value">{{ o.label }}</option>
        </select>${err}${help}
      </div>`;
      case 'checkbox': {
        if (f.multiple) {
          const cols = Math.max(1, Math.min(6, Number(f.optionsColumns) || 1));
          return `      <div class="pb-field"${showIf}>
        <span class="pb-label">${label}${req}</span>
        <fieldset class="pb-radio-group pb-check-grid" id="${cid}" style="--pb-check-cols:${cols}">
          <label class="pb-check" *ngFor="let o of opciones['${id}']">
            <input type="checkbox" name="${id}" [value]="o.value" [(ngModel)]="${key}" (change)="limpiarErrorCS('${id}')">
            <span>{{ o.label }}</span>
          </label>
        </fieldset>${err}${help}
      </div>`;
        }
        return `      <div class="pb-field"${showIf}>
        <label class="pb-check">
          <input type="checkbox" id="${cid}" name="${id}" [(ngModel)]="${key}" (change)="limpiarErrorCS('${id}')">
          <span>${label}${req}</span>
        </label>${err}${help}
      </div>`;
      }
      case 'radio':
        return `      <div class="pb-field"${showIf}>
        <span class="pb-label">${label}${req}</span>
        <fieldset class="pb-radio-group" id="${cid}">
          <label class="pb-check" *ngFor="let o of opciones['${id}']">
            <input type="radio" name="${id}" [value]="o.value" [(ngModel)]="${key}" (change)="limpiarErrorCS('${id}')">
            <span>{{ o.label }}</span>
          </label>
        </fieldset>${err}${help}
      </div>`;
      case 'table': {
        const tcols = (f.tableColumns || []).filter((c) => c.field);
        const hasSel = !!f.tableSelectable;
        const anyFilter = tcols.some((c) => c.filterable);
        const colCtl = `tabla['${id}'].columns`;
        const selHead = hasSel
          ? `          <th class="pb-tbl-sel"><input type="checkbox" [checked]="todosSeleccionados('${id}')" (change)="alternarTodos('${id}', $event)" aria-label="Seleccionar todos"></th>\n`
          : '';
        const headCells = tcols
          .map(
            (c) => `          <th class="pb-tbl-th" [class.pb-tbl-sort]="c.sortable" [class.sorted-asc]="orden('${id}') === c.field && dir('${id}') > 0" [class.sorted-desc]="orden('${id}') === c.field && dir('${id}') < 0" *ngFor="let c of ${colCtl}" (click)="ordenarTabla('${id}', c)"><span class="pb-tbl-caption">{{ c.label }}<span class="pb-tbl-arrow">{{ orden('${id}') === c.field ? (dir('${id}') > 0 ? '▲' : '▼') : '' }}</span></span></th>\n`,
          )
          .join('');
        const filterSelCell = hasSel ? `          <th class="pb-tbl-sel"></th>\n` : '';
        const filterCells = tcols
          .map(
            (c) =>
              c.filterable
                ? `          <th><input type="text" class="pb-input pb-tbl-filter" [(ngModel)]="filtrosT['${id}'][c.field]" (ngModelChange)="filtrarTabla('${id}')" placeholder="Filtrar…"></th>\n`
                : `          <th></th>\n`,
          )
          .join('');
        const filterRow = anyFilter
          ? `\n          <tr class="pb-tbl-filters">${filterSelCell}${filterCells}
          </tr>`
          : '';
        const columns = tcols.length
          ? tcols
              .map(
                (c) => `        <td *ngFor="let c of ${colCtl}">{{ valorCelda(r, c.field) }}</td>\n`,
              )
              .join('')
          : '';
        const selCell = hasSel
          ? `        <td class="pb-tbl-sel">
          <input *ngIf="tabla['${id}'].mode === 'multiple'" type="checkbox" [checked]="seleccionContiene('${id}', r)" (change)="alternarUno('${id}', r, $event)">
          <input *ngIf="tabla['${id}'].mode === 'single'" type="radio" name="tbl_${id}" [checked]="seleccionContiene('${id}', r)" (change)="alternarUno('${id}', r, $event)">
        </td>\n`
          : '';
        return `      <div class="pb-field"${showIf}>
        <span class="pb-label">${label}${req}</span>
        <div class="pb-table">
          <table class="pb-table-el">
            <thead>
            <tr>${selHead}${headCells}
            </tr>${filterRow}
            </thead>
            <tbody>
          <tr *ngFor="let r of filasVistas('${id}')">${selCell}${columns}
          </tr>
          <tr *ngIf="!filasVistas('${id}').length"><td class="pb-empty" [attr.colspan]="tabla['${id}'].columns.length + (tabla['${id}'].selectable ? 1 : 0)">{{ mensajeTablaVacia('${id}') }}</td></tr>
            </tbody>
          </table>
          <div class="pb-table-foot">
            <span class="pb-table-info">{{ infoTabla('${id}') }}</span>
            <div class="pb-tbl-pager">
              <span class="pb-tbl-pager-label">Pág.</span>
              <input type="number" class="pb-input pb-tbl-page" min="1" [value]="tabla['${id}'].pagina" (keydown.enter)="$event.target.blur()" (change)="paginaIr('${id}', $event)">
              <span class="pb-tbl-pager-label">de</span>
              <span class="pb-tbl-pages">{{ tabla['${id}'].paginas }}</span>
              <select class="pb-input pb-tbl-size" [value]="tabla['${id}'].pageSize" (change)="tamPagina('${id}', $event)">
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="30">30</option>
              </select>
            </div>
          </div>
        </div>${err}${help}
      </div>`;
      }
      default: {
        const ac = f.autocomplete
          ? ` autocomplete="off" (input)="buscar($event, '${id}')" (keydown)="acKey($event, '${id}')" (blur)="ocultarAc('${id}')"`
          : ` (input)="limpiarErrorCS('${id}')"`;
        return `      <div class="pb-field"${showIf}>
        <label class="pb-label" for="${cid}">${label}${req}</label>
        <input class="pb-input" id="${cid}" name="${id}" type="${f.type}" [(ngModel)]="${key}" placeholder="${ph}"${requiredAttr}${readonlyAttr}${ac}>
        ${f.autocomplete ? this.acBox(id) : ''}${err}${help}
      </div>`;
      }
    }
  }

  private acBox(id: string): string {
    return `
        <div class="pb-acdd" *ngIf="sugerencias['${id}'] && sugerencias['${id}'].length">
          <div class="pb-ac-item" *ngFor="let s of sugerencias['${id}']; let i = index" [class.active]="esActivo('${id}', i)" (mousedown)="elegir('${id}', i)">{{ s.label }}</div>
        </div>`;
  }

  private tButtons(buttons: PageButton[]): string {
    if (!buttons || !buttons.length) {
      return '        <button type="submit" class="pb-btn pb-btn-primary">Enviar</button>';
    }
    return buttons
      .map((b) => {
        const cls = 'pb-btn pb-btn-' + (b.style || 'primary');
        const label = this.esc(b.label || 'Botón');
        if (b.action === 'submit') return `        <button type="submit" class="${cls}">${label}</button>`;
        if (b.action === 'clean') return `        <button type="button" class="${cls}" (click)="limpiar()">${label}</button>`;
        return `        <button type="button" class="${cls}" (click)="navegar('${this.attr(b.url)}', ${b.targetBlank ? 'true' : 'false'})">${label}</button>`;
      })
      .join('\n');
  }

  private angularCss(config: PageConfig): string {
    let css = this.htmlGen
      .getBaseCss(config)
      .replace(/body\.pb-dark/g, '.pb-page.pb-dark')
      .replace(/(^|[^A-Za-z0-9_])body([^A-Za-z0-9_])/g, '$1.pb-page$2')
      .replace(/:root\s*\{/g, '.pb-page {');
    return `:host { display: block; }
.pb-page { min-height: 100vh; }
${css}`;
  }

  private ts(q: string): string {
    return JSON.stringify(q === undefined || q === null ? '' : String(q));
  }

  private buildTs(config: PageConfig, name: { selector: string; className: string; fileBase: string }, html: string, css: string, inline: boolean): string {
    const c = config;
    const epCfg = (ep: any) => {
      const method = ep?.method || 'GET';
      return {
        url: ep?.url || '',
        method,
        request: ep?.requestJson || '',
        response: ep?.responseJson || '',
        paramMode: ep?.paramMode === 'query' ? 'query' : 'fixed',
        paramName: ep?.paramName || (method === 'DELETE' ? 'id' : ''),
        paramValue: ep?.paramValue || '',
        headers: ep?.headersJson || '',
      };
    };
    const cfg = JSON.stringify({
      multiStep: !!c.multiStep,
      pasos: this.pasosMeta(c),
      pasoId: c.sharedId || '',
      load: epCfg(c.load),
      submit: epCfg(c.submit),
      autocomplete: { url: c.autocompleteUrl || '', minChars: c.autocompleteMinChars || 2 },
      messages: { success: c.messageSuccess || '', error: c.messageError || '' },
      customCssUrl: c.customCssUrl || '',
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

    const modelObj: Record<string, unknown> = {};
    const opcionesObj: Record<string, SelectOption[]> = {};
    const acUrlsObj: Record<string, string> = {};
    const selectJobs: { campo: string; url: string; vf: string; lf: string }[] = [];
    const fieldsArr: { key: string; load: string; submit: string; type: string; checkbox: boolean; required: boolean; msg: string; vis: string; paso: number }[] = [];

    c.sections.forEach((s, si) => {
      for (const f of s.fields || []) {
        const key = this.key(f.id);
        fieldsArr.push({
          key,
          load: f.loadField || f.id,
          submit: f.submitField || f.id,
          type: f.type,
          checkbox: f.type === 'checkbox',
          required: !!f.required,
          msg: f.requiredMessage || '',
          vis: String(f.visibleWhen || '').trim(),
          paso: this.stepRankOf(c, si),
        });
        if (f.type === 'checkbox') {
          modelObj[key] = f.multiple
            ? String(f.defaultValue || '')
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : ['true', '1', 'si', 'yes', 'checked'].includes(String(f.defaultValue || '').toLowerCase());
        } else {
          modelObj[key] = f.defaultValue ?? '';
        }
        if (f.type === 'select' || f.type === 'radio' || (f.type === 'checkbox' && f.multiple)) {
          opcionesObj[key] = f.optionsFromUrl ? [] : (f.options || []).map((o) => ({ value: o.value, label: o.label || o.value }));
        }
        if (f.autocomplete && f.autocompleteUrl) acUrlsObj[key] = f.autocompleteUrl;
        if ((f.type === 'select' || f.type === 'radio' || (f.type === 'checkbox' && f.multiple)) && f.optionsFromUrl) {
          selectJobs.push({
            campo: key,
            url: f.optionsUrl || '',
            vf: f.optionsValueField || 'value',
            lf: f.optionsLabelField || 'label',
          });
        }
      }
    });

    const modelJson = JSON.stringify(modelObj);
    const opcionesJson = JSON.stringify(opcionesObj);
    const acUrlsJson = JSON.stringify(acUrlsObj);
    const selectJobsJson = JSON.stringify(selectJobs);
    const fmapJson = JSON.stringify(fieldsArr);
    const secVisJson = JSON.stringify(
      c.sections
        .filter((s) => !!s.visibleWhen)
        .map((s) => ({ id: this.key(s.id), cond: String(s.visibleWhen).trim() })),
    );
    const tablesArr = c.sections
      .flatMap((s, si) =>
        (s.fields || []).filter((f: Field) => f.type === 'table').map((f: Field) => ({ f, si })),
      )
      .map(({ f, si }) => ({
        id: this.key(f.id),
        url: f.tableUrl || '',
        submit: f.submitField || f.id,
        pageSize: [10, 20, 30].includes(Number(f.tablePageSize)) ? Number(f.tablePageSize) : 10,
        dataField: f.tableDataField || '',
        pageField: f.tablePageField || '',
        totalField: f.tableTotalField || '',
        selectable: !!f.tableSelectable,
        mode: f.tableSelectionMode === 'single' ? 'single' : 'multiple',
        step: this.stepRankOf(c, si),
        columns: (f.tableColumns || [])
          .filter((c) => c.field)
          .map((c: TableColumn) => ({
            field: c.field,
            label: c.label || c.field,
            sortable: !!c.sortable,
            filterable: !!c.filterable,
          })),
      }));
    const tablesJson = JSON.stringify(tablesArr);

    const decorator = inline
      ? `@Component({
  selector: '${name.selector}',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  template: \`${this.escTpl(html)}\`,
  styles: [\`${this.escTpl(css)}\`],
})`
      : `@Component({
  selector: '${name.selector}',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  templateUrl: './${name.fileBase}.component.html',
  styleUrl: './${name.fileBase}.component.css',
})`;

    const classBody = `export class ${name.className} {
  model: Record<string, any> = ${modelJson};
  defaults: Record<string, any> = ${modelJson};
  TABLA = ${tablesJson};
  opciones: Record<string, { value: string; label: string }[]> = ${opcionesJson};
  acUrls: Record<string, string> = ${acUrlsJson};
  sugerencias: Record<string, any[]> = {};
  acIndice: Record<string, number> = {};
  errores: Record<string, string> = {};
  mensaje = '';
  tipoMensaje = 'info';
  statusVisible = false;
  multiPaso = ${c.multiStep ? 'true' : 'false'};
  paso = 0;
  pasoId = ${JSON.stringify(c.sharedId || '')};
  guardadoManual = ${c.multiStep ? JSON.stringify(this.pasosMeta(c).some((p) => !p.autoSave)) : 'false'};
  pasos: { id: string; label: string; autoSave: boolean; saveUrl: string }[] = ${JSON.stringify(
    this.pasosMeta(c),
  )};
  modalVisible = false;
  modalTipo = '';
  modalTitulo = '';
  modalMsg = '';
  modalIcono = '';
  modalConfirm = false;
  modalOkText = 'Aceptar';
  modalCancelText = 'Cancelar';
  tabla: Record<string, any> = {};
  filtrosT: Record<string, Record<string, string>> = {};
  private pendiente: (() => void) | null = null;
  private timer: any = null;

  ngOnInit() {
    if (CFG.customCssUrl) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = CFG.customCssUrl;
      document.head.appendChild(link);
    }
    this.cargarSelects();
    this.iniciarTablas();
    this.cargarDatos();
  }

  iniciarTablas() {
    this.TABLA.forEach((t: any) => {
      this.tabla[t.id] = {
        url: t.url,
        columns: t.columns || [],
        pageSize: t.pageSize || 10,
        selectable: !!t.selectable,
        mode: t.mode || 'multiple',
        all: [],
        pagina: 1,
        paginas: 1,
        total: 0,
        serverPaged: !!(t.dataField || t.pageField || t.totalField),
        dataField: t.dataField || '',
        pageField: t.pageField || '',
        totalField: t.totalField || '',
        orden: '',
        dir: 1,
        filtros: {},
        seleccion: t.mode === 'single' ? null : [],
      };
      this.filtrosT[t.id] = {};
      this.cargarTabla(t.id);
    });
  }

  cargarTabla(id: string) {
    const t = this.tabla[id];
    if (!t || !t.url) return;
    let url = t.url;
    if (t.serverPaged) {
      url = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'page=' + t.pagina + '&size=' + t.pageSize;
    }
    fetch(url, { headers: { 'Accept': 'application/json' } })
      .then((r: Response) => r.json())
      .then((data: any) => {
        const tbl = this.tabla[id];
        if (!tbl) return;
        if (tbl.serverPaged) {
          let rows = tbl.dataField ? this.pathGet(data, tbl.dataField) : data;
          if (!Array.isArray(rows)) rows = [];
          const total = tbl.totalField ? Number(this.pathGet(data, tbl.totalField)) : NaN;
          tbl.total = isNaN(total) ? rows.length : total;
          tbl.paginas = Math.max(1, Math.ceil(tbl.total / tbl.pageSize));
          const pg = tbl.pageField ? Number(this.pathGet(data, tbl.pageField)) : NaN;
          if (!isNaN(pg) && pg >= 1) tbl.pagina = Math.min(tbl.paginas, Math.floor(pg));
          if (tbl.pagina < 1) tbl.pagina = 1;
          tbl.all = rows;
        } else {
          tbl.all = this.pickList(data) || [];
          tbl.pagina = 1;
        }
        if (!tbl.columns || !tbl.columns.length) {
          const derivadas = this.derivarColumnas(tbl.all);
          if (derivadas.length) tbl.columns = derivadas;
        }
        this.tabla = Object.assign({}, this.tabla, { [id]: tbl });
      })
      .catch(() => {
        const tbl = this.tabla[id];
        if (!tbl) return;
        tbl.loadError = true;
        this.tabla = Object.assign({}, this.tabla, { [id]: tbl });
      });
  }

  mensajeTablaVacia(id: string): string {
    const t = this.tabla[id];
    if (!t) return '';
    if (t.loadError) return 'Error al cargar la tabla (' + t.url + '). Verifique la URL y que el servidor permita CORS.';
    if (!t.url) {
      return t.columns && t.columns.length
        ? 'Configure la URL de datos en el editor para cargar la tabla.'
        : 'Configure una URL de datos y detecte los campos para visualizar la tabla.';
    }
    return 'Sin registros.';
  }

  derivarColumnas(filas: any[]): any[] {
    if (!filas || !filas.length) return [];
    const first = filas[0];
    if (!first || typeof first !== 'object') return [];
    const keys = Object.keys(first);
    if (!keys.length) return [];
    return keys.map((k: string) => ({ field: k, label: k, sortable: true, filterable: true }));
  }

  filasFiltradas(id: string): any[] {
    const t = this.tabla[id];
    if (!t) return [];
    let filas = (t.all || []).filter((row: any) => {
      for (const c of t.columns || []) {
        if (!c.filterable) continue;
        const f = t.filtros[c.field];
        if (!f) continue;
        const v = this.pathGet(row, c.field);
        const sv = v === undefined || v === null ? '' : String(v);
        if (sv.toLowerCase().indexOf(String(f).toLowerCase()) < 0) return false;
      }
      return true;
    });
    if (t.orden) {
      const campo = t.orden;
      const d = t.dir;
      filas = filas.slice().sort((a: any, b: any) => {
        const av = this.pathGet(a, campo);
        const bv = this.pathGet(b, campo);
        const avs = av === undefined || av === null ? '' : typeof av === 'object' ? JSON.stringify(av) : String(av);
        const bvs = bv === undefined || bv === null ? '' : typeof bv === 'object' ? JSON.stringify(bv) : String(bv);
        if (avs < bvs) return -1 * d;
        if (avs > bvs) return 1 * d;
        return 0;
      });
    }
    if (!t.serverPaged) {
      t.paginas = Math.max(1, Math.ceil(filas.length / t.pageSize));
      if (t.pagina > t.paginas) t.pagina = t.paginas;
      if (t.pagina < 1) t.pagina = 1;
    }
    return filas;
  }

  filasVistas(id: string): any[] {
    const t = this.tabla[id];
    if (!t) return [];
    const filas = this.filasFiltradas(id);
    if (t.serverPaged) return filas.slice(0, t.pageSize);
    const inicio = (t.pagina - 1) * t.pageSize;
    return filas.slice(inicio, inicio + t.pageSize);
  }

  valorCelda(row: any, campo: string): string {
    const v = this.pathGet(row, campo);
    return v === undefined || v === null ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  }

  claveFila(row: any): string {
    return JSON.stringify(row);
  }

  seleccionContiene(id: string, row: any): boolean {
    const t = this.tabla[id];
    if (!t) return false;
    const k = this.claveFila(row);
    if (t.mode === 'single') return !!t.seleccion && this.claveFila(t.seleccion) === k;
    return (t.seleccion || []).some((s: any) => this.claveFila(s) === k);
  }

  alternarUno(id: string, row: any, ev: any) {
    const t = this.tabla[id];
    if (!t) return;
    const on = !!(ev && ev.target && ev.target.checked);
    if (t.mode === 'single') {
      if (on) t.seleccion = row;
    } else {
      const k = this.claveFila(row);
      const idx = t.seleccion.findIndex((s: any) => this.claveFila(s) === k);
      if (on && idx < 0) t.seleccion.push(row);
      if (!on && idx >= 0) t.seleccion.splice(idx, 1);
    }
    this.tabla = Object.assign({}, this.tabla);
  }

  todosSeleccionados(id: string): boolean {
    const filas = this.filasFiltradas(id);
    const t = this.tabla[id];
    if (!t || !filas.length) return false;
    return filas.every((r: any) => this.seleccionContiene(id, r));
  }

  alternarTodos(id: string, ev: any) {
    const t = this.tabla[id];
    if (!t) return;
    const on = !!(ev && ev.target && ev.target.checked);
    const filas = this.filasFiltradas(id);
    if (on) {
      filas.forEach((r: any) => {
        if (!this.seleccionContiene(id, r)) t.seleccion.push(r);
      });
    } else {
      filas.forEach((r: any) => {
        const k = this.claveFila(r);
        const idx = t.seleccion.findIndex((s: any) => this.claveFila(s) === k);
        if (idx >= 0) t.seleccion.splice(idx, 1);
      });
    }
    this.tabla = Object.assign({}, this.tabla);
  }

  ordenarTabla(id: string, c: any) {
    const t = this.tabla[id];
    if (!t || !c || !c.sortable) return;
    if (t.orden === c.field) t.dir = -t.dir;
    else { t.orden = c.field; t.dir = 1; }
    t.pagina = 1;
    this.tabla = Object.assign({}, this.tabla);
  }

  filtrarTabla(id: string) {
    const t = this.tabla[id];
    if (!t) return;
    t.filtros = Object.assign({}, this.filtrosT[id] || {});
    t.pagina = 1;
    this.tabla = Object.assign({}, this.tabla);
  }

  paginaIr(id: string, ev: any) {
    const t = this.tabla[id];
    if (!t) return;
    const v = Math.max(1, Math.min(parseInt(ev && ev.target && ev.target.value, 10) || 1, t.paginas || 1));
    if (v === t.pagina) return;
    t.pagina = v;
    if (t.serverPaged) this.cargarTabla(id);
    else this.tabla = Object.assign({}, this.tabla);
  }

  tamPagina(id: string, ev: any) {
    const t = this.tabla[id];
    if (!t) return;
    let v = parseInt(ev && ev.target && ev.target.value, 10);
    if ([10, 20, 30].indexOf(v) < 0) v = 10;
    if (v === t.pageSize) return;
    t.pageSize = v;
    t.pagina = 1;
    if (t.serverPaged) this.cargarTabla(id);
    else this.tabla = Object.assign({}, this.tabla);
  }

  infoTabla(id: string): string {
    const t = this.tabla[id];
    if (!t) return '';
    const total = t.serverPaged ? (t.total || 0) : this.filasFiltradas(id).length;
    const nSel = t.mode === 'single' ? (t.seleccion ? 1 : 0) : (t.seleccion || []).length;
    let txt = (t.pagina || 1) + ' de ' + (t.paginas || 1) + ' · ' + total + ' registro(s)';
    if (t.selectable && nSel) txt += ' · ' + nSel + ' seleccionado(s)';
    return txt;
  }

  seleccionValor(id: string): any {
    const t = this.tabla[id];
    if (!t || !t.selectable) return null;
    if (t.mode === 'single') return t.seleccion || null;
    return t.seleccion && t.seleccion.length ? t.seleccion.slice() : null;
  }

  orden(id: string): string {
    const t = this.tabla[id];
    return t && t.orden ? t.orden : '';
  }

  dir(id: string): number {
    const t = this.tabla[id];
    return t ? t.dir : 1;
  }

  esActivo(campo: string, i: number): boolean {
    return (this.acIndice[campo] ?? -1) === i;
  }

  opcionesDe(campo: string): { value: string; label: string }[] {
    return this.opciones[campo] || [];
  }

  mostrarStatus(msg: string, tipo: string) {
    this.mensaje = msg || '';
    this.tipoMensaje = tipo || 'info';
    this.statusVisible = !!msg;
  }

  limpiarErrorCS(campo: string) {
    if (this.errores[campo]) {
      this.errores = { ...this.errores, [campo]: '' };
    }
  }

  validarCampos(): string[] {
    const missing: string[] = [];
    const errs: Record<string, string> = {};
    FMAP.forEach((f: { key: string; required: boolean; msg: string }) => {
      if (!f.required) return;
      if (this.isOculto(f.key)) return;
      const v = this.model[f.key];
      const ok = v !== undefined && v !== null && String(v).trim() !== '';
      if (!ok) {
        errs[f.key] = f.msg || 'Este campo es obligatorio.';
        missing.push(f.key);
      }
    });
    this.errores = errs;
    return missing;
  }

  validarPaso(paso: number): string[] {
    const missing: string[] = [];
    const errs: Record<string, string> = {};
    FMAP.forEach((f: { key: string; required: boolean; msg: string; paso: number }) => {
      if (f.paso !== paso) return;
      if (!f.required) return;
      if (this.isOculto(f.key)) return;
      const v = this.model[f.key];
      const ok = v !== undefined && v !== null && String(v).trim() !== '';
      if (!ok) {
        errs[f.key] = f.msg || 'Este campo es obligatorio.';
        missing.push(f.key);
      }
    });
    this.errores = errs;
    return missing;
  }

  irPaso(i: number) {
    if (!this.multiPaso || !this.pasos.length) return;
    this.irA(i);
  }

  retroceder() {
    this.irA(this.paso - 1);
  }

  avanzar() {
    const missing = this.validarPaso(this.paso);
    if (missing.length) {
      const labels = missing
        .map((k) => {
          const m = FMAP.find((x: { key: string }) => x.key === k);
          return m ? m.key : k;
        })
        .join(', ');
      this.notify('warning', CFG.modal.warningTitle, (CFG.modal.warningMessage || 'Revise los campos marcados.') + (labels ? ' (' + labels + ')' : ''));
      return;
    }
    this.irA(this.paso + 1);
  }

  valorIdPaso(): string {
    if (!this.pasoId) return '';
    if (String(this.pasoId).indexOf('{{') >= 0) return this.interpolate(String(this.pasoId));
    return String(this.pasoId);
  }

  colectarPaso(paso: number): Record<string, any> {
    const out: Record<string, any> = {};
    FMAP.forEach((f: { key: string; submit: string; checkbox: boolean; paso: number }) => {
      if (f.paso !== paso) return;
      if (this.isOculto(f.key)) return;
      const val = this.model[f.key];
      if (val === undefined || val === null || val === '') return;
      const k = f.submit || f.key;
      const item = typeof val === 'object' ? JSON.parse(JSON.stringify(val)) : val;
      if (Object.prototype.hasOwnProperty.call(out, k)) {
        const prev = out[k];
        if (Array.isArray(prev)) prev.push(item);
        else out[k] = [prev, item];
      } else {
        out[k] = item;
      }
    });
    this.TABLA.forEach((t: any) => {
      if (t.step !== paso) return;
      const val: any = this.seleccionValor(t.id);
      if (val === undefined || val === null) return;
      out[t.submit || t.id] = val;
    });
    return out;
  }

  guardarPaso(paso: number, done: () => void) {
    const st = this.pasos[paso];
    if (!st || !st.saveUrl) {
      if (done) done();
      return;
    }
    const payload = this.colectarPaso(paso);
    let url = String(st.saveUrl);
    url += (url.indexOf('?') >= 0 ? '&' : '?') + 'paso=' + encodeURIComponent(st.id || ('paso' + (paso + 1)));
    const pid = this.valorIdPaso();
    if (pid) url += '&id=' + encodeURIComponent(pid);
    this.mostrarStatus('Guardando paso ' + (st.label || (paso + 1)) + '…', 'info');
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((r: Response) => r.text())
      .then((text: string) => {
        let m: any = null;
        try {
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === 'object') m = parsed.message || parsed.msg;
        } catch {
          m = null;
        }
        this.mostrarStatus(m ? String(m) : '', m ? 'success' : 'info');
        if (done) done();
      })
      .catch((err: any) => {
        this.mostrarStatus('Error al guardar el paso: ' + (err && err.message ? err.message : err), 'error');
        if (done) done();
      });
  }

  irA(i: number) {
    if (!this.multiPaso || !this.pasos.length) return;
    const destino = Math.max(0, Math.min(this.pasos.length - 1, i));
    if (destino === this.paso) return;
    const st = this.pasos[this.paso];
    if (!st || !st.autoSave || !st.saveUrl) {
      this.paso = destino;
      return;
    }
    this.guardarPaso(this.paso, () => {
      this.paso = destino;
    });
  }

  headersDe(cfg: any): Record<string, string> {
    let hdr: any = {};
    if (cfg && cfg.headers) {
      try { hdr = JSON.parse(cfg.headers) || {}; } catch { hdr = {}; }
    }
    if (Object.keys(hdr).length === 0) {
      hdr = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
    }
    for (const k of Object.keys(hdr)) {
      if (typeof hdr[k] === 'string') hdr[k] = this.interpolate(hdr[k]);
    }
    return hdr;
  }

  appendQuery(url: string, qs: string): string {
    if (!qs) return url;
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + qs;
  }

  appendParam(url: string, name: string, value: string): string {
    if (!name) return url;
    const s = String(value);
    if (s === '') return url;
    return this.appendQuery(url, encodeURIComponent(name) + '=' + encodeURIComponent(s));
  }

  prepararPeticion(cfg: any, bodyFor: string): { url: string; init: RequestInit } {
    const method = String(cfg.method || 'GET').toUpperCase();
    let url = this.interpolate(cfg.url || '');
    const init: RequestInit = { method, headers: this.headersDe(cfg) };
    if (method === 'GET') {
      if (cfg.paramMode === 'query') {
        url = this.appendParam(url, cfg.paramName, this.interpolate(String(cfg.paramValue || '')));
      }
      if (bodyFor) url = this.appendQuery(url, bodyFor);
    } else if (method === 'DELETE') {
      url = this.appendParam(url, cfg.paramName, this.interpolate(String(cfg.paramValue || '')));
    } else {
      init.body = bodyFor ? bodyFor : JSON.stringify(this.collect());
    }
    return { url, init };
  }

  mostrarModal(tipo: string, titulo: string, msg: string) {
    const icons: Record<string, string> = { success: '&#10003;', error: '&#10005;', warning: '&#33;' };
    this.modalTipo = tipo || 'info';
    this.modalIcono = icons[tipo] || '!';
    this.modalTitulo = titulo ? this.interpolate(titulo) : '';
    this.modalMsg = msg ? this.interpolate(msg) : '';
    this.modalConfirm = false;
    this.modalOkText = 'Aceptar';
    this.modalVisible = true;
  }

  confirmarEnvio(cb: () => void) {
    this.pendiente = cb;
    this.mostrarModal('warning', CFG.confirm.title || 'Confirmar envío', CFG.confirm.message || '¿Está seguro de que desea enviar los datos?');
    this.modalConfirm = true;
    this.modalOkText = CFG.confirm.okText || 'Aceptar';
    this.modalCancelText = CFG.confirm.cancelText || 'Cancelar';
  }

  okModal() {
    if (this.pendiente) {
      const fn = this.pendiente;
      this.pendiente = null;
      this.modalConfirm = false;
      fn();
      return;
    }
    this.cerrarModal();
  }

  cerrarModal(ev?: Event) {
    if (ev) {
      const target = ev.target as HTMLElement;
      if (target && ev.target !== ev.currentTarget) return;
    }
    this.pendiente = null;
    this.modalConfirm = false;
    this.modalVisible = false;
  }

  notify(tipo: 'success' | 'error' | 'warning', titulo: string, msg: string) {
    if (!CFG.modal.enabled) {
      this.mostrarStatus(msg, tipo === 'success' ? 'success' : tipo === 'error' ? 'error' : 'info');
      return;
    }
    this.mostrarModal(tipo, titulo, msg);
  }

  pathGet(obj: any, path: string): any {
    if (obj === null || obj === undefined) return undefined;
    path = String(path || '');
    if (obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, path)) return obj[path];
    if (path.indexOf('.') >= 0 || path.indexOf('[') >= 0) {
      const parts = path.replace(/[[]/g, '.').replace(/[]]/g, '').split('.');
      let cur: any = obj;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (cur === null || cur === undefined) return undefined;
        if (Array.isArray(cur) && /^\\d+$/.test(p)) cur = cur[Number(p)];
        else cur = cur[p];
      }
      return cur;
    }
    if (Array.isArray(obj)) return undefined;
    const pathLower = path.toLowerCase();
    for (const k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k) && String(k).toLowerCase() === pathLower) return obj[k];
    }
    return undefined;
  }

  interpolate(tpl: string): string {
    if (!tpl) return '';
    if (tpl.indexOf('{{') < 0) return tpl;
    return tpl.replace(/\\{\\{\\s*([\\w.]+)\\s*\\}\\}/g, (m: string, key: string) => {
      const tb = this.TABLA.find((x: any) => x.id === key || x.submit === key);
      if (tb) {
        const tv = this.seleccionValor(tb.id);
        return (tv === undefined || tv === null) ? '' : typeof tv === 'object' ? JSON.stringify(tv) : String(tv);
      }
      const f = FMAP.find((x: { key: string; submit: string }) => x.submit === key || x.key === key);
      if (f) {
        const v = this.model[f.key];
        return (v === undefined || v === null) ? '' : String(v);
      }
      const v2 = this.pathGet(this.model, key);
      if (v2 === undefined || v2 === null) return '';
      return typeof v2 === 'object' ? JSON.stringify(v2) : String(v2);
    });
  }

  collect(): Record<string, any> {
    const out: Record<string, any> = {};
    FMAP.forEach((f: { key: string; submit: string; checkbox: boolean }) => {
      if (this.isOculto(f.key)) return;
      let val: any = this.model[f.key];
      if (val === undefined || val === null) return;
      if (val === '') return;
      if (f.checkbox && val === false) return;
      const k = f.submit || f.key;
      const item = typeof val === 'object' ? JSON.parse(JSON.stringify(val)) : val;
      if (Object.prototype.hasOwnProperty.call(out, k)) {
        const prev = out[k];
        if (Array.isArray(prev)) prev.push(item);
        else out[k] = [prev, item];
      } else {
        out[k] = item;
      }
    });
    this.TABLA.filter((t: any) => t.selectable).forEach((t: any) => {
      if (this.isOculto(t.id)) return;
      const val: any = this.seleccionValor(t.id);
      if (val === undefined || val === null) return;
      const k = t.submit || t.id;
      const item = typeof val === 'object' ? JSON.parse(JSON.stringify(val)) : val;
      if (Object.prototype.hasOwnProperty.call(out, k)) {
        const prev = out[k];
        if (Array.isArray(prev)) prev.push(item);
        else out[k] = [prev, item];
      } else {
        out[k] = item;
      }
    });
    return out;
  }

  mapResponse(data: any) {
    if (!data || typeof data !== 'object') return;
    FMAP.forEach((f: { key: string; load: string }) => {
      const v = this.pathGet(data, f.load || f.key);
      if (v !== undefined && v !== null) this.model[f.key] = v;
    });
  }

  pickList(data: any): any[] {
    if (Array.isArray(data)) return data;
    if (data && data.data && Array.isArray(data.data)) return data.data;
    if (data && data.items && Array.isArray(data.items)) return data.items;
    if (data && data.results && Array.isArray(data.results)) return data.results;
    if (data && data.list && Array.isArray(data.list)) return data.list;
    return [];
  }

  cargarSelects() {
    const jobs = ${selectJobsJson};
    const pendientes = [...jobs];
    if (!pendientes.length) return;
    pendientes.forEach((job: { campo: string; url: string; vf: string; lf: string }) => {
      if (!job.url) return;
      fetch(job.url, { headers: { 'Accept': 'application/json' } })
        .then((r: Response) => r.json())
        .then((data: any) => {
          const list = this.pickList(data);
          this.opciones[job.campo] = list
            .map((item: any) => {
              const it = item && typeof item === 'object' ? item : { value: item, label: item };
              let v = this.pathGet(it, job.vf);
              let l = this.pathGet(it, job.lf);
              if (v === undefined || v === null) v = typeof item === 'object' ? this.pathGet(item, job.campo) : item;
              if (l === undefined || l === null) l = typeof item === 'object' ? it.label || it.name || it.id || v : item;
              return { value: String(v ?? ''), label: String(l ?? '') };
            });
          this.model = { ...this.model };
        })
        .catch(() => {});
    });
  }

  cargarDatos() {
    if (!CFG.load || !CFG.load.url) return;
    const tpl = CFG.load.request || '';
    const body = tpl.indexOf('{{') >= 0 ? this.interpolate(tpl) : tpl.trim() ? tpl : '';
    const req = this.prepararPeticion(CFG.load, body);
    this.mostrarStatus('Cargando datos...', 'info');
    fetch(req.url, req.init)
      .then((r: Response) => r.text())
      .then((text: string) => {
        let parsed: any;
        try { parsed = JSON.parse(text); } catch { parsed = text; }
        if (parsed && typeof parsed === 'object') {
          this.mapResponse(parsed);
          this.mostrarStatus(parsed.message ? String(parsed.message) : 'Datos cargados correctamente.', 'success');
        } else {
          this.mostrarStatus('Datos cargados correctamente.', 'success');
        }
      })
      .catch((err: any) => {
        this.mostrarStatus('Error al cargar los datos: ' + (err && err.message ? err.message : err), 'error');
      });
  }

  buscar(ev: any, campo: string) {
    this.limpiarErrorCS(campo);
    if (this.timer) clearTimeout(this.timer);
    const v = String(ev && ev.target ? ev.target.value : ev || '');
    const min = CFG.autocomplete.minChars > 0 ? CFG.autocomplete.minChars : 2;
    if (!v || v.length < min) { this.sugerencias[campo] = []; return; }
    this.timer = setTimeout(() => {
      const url = this.acUrls[campo] || (CFG.autocomplete ? CFG.autocomplete.url : '');
      if (!url) return;
      const u = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'q=' + encodeURIComponent(v) + '&field=' + encodeURIComponent(campo);
      fetch(u, { headers: { 'Accept': 'application/json' } })
        .then((r: Response) => r.json())
        .then((data: any) => {
          const list = this.pickList(data);
          this.sugerencias[campo] = list
            .map((item: any) => {
              const it = item && typeof item === 'object' ? item : { label: item, value: item };
              const l = it.label || it.text || it.name || it.id || it.value;
              if (l === undefined || l === null) return null;
              return { label: String(l), value: it.value === undefined || it.value === null ? String(l) : String(it.value) };
            })
            .filter((x: any) => !!x);
          this.acIndice[campo] = -1;
        })
        .catch(() => { this.sugerencias[campo] = []; });
    }, 250);
  }

  acKey(ev: KeyboardEvent, campo: string) {
    const items = this.sugerencias[campo];
    if (!items || !items.length) return;
    let idx = this.acIndice[campo] ?? -1;
    if (ev.key === 'ArrowDown') { ev.preventDefault(); idx = Math.min(idx + 1, items.length - 1); this.acIndice[campo] = idx; }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); idx = Math.max(idx - 1, 0); this.acIndice[campo] = idx; }
    else if (ev.key === 'Enter') { ev.preventDefault(); if (idx >= 0 && idx < items.length) this.elegir(campo, idx); }
    else if (ev.key === 'Escape') { this.sugerencias[campo] = []; }
  }

  elegir(campo: string, idx: number) {
    const items = this.sugerencias[campo];
    if (!items || !items[idx]) return;
    this.model[campo] = items[idx].value;
    this.sugerencias[campo] = [];
    this.acIndice[campo] = -1;
    this.limpiarErrorCS(campo);
  }

  ocultarAc(campo: string) {
    setTimeout(() => { this.sugerencias[campo] = []; }, 180);
  }

  enviar(f: any) {
    const invalidos = this.validarCampos();
    if (invalidos.length) {
      const labels = invalidos
        .map((k) => {
          const m = FMAP.find((x: { key: string }) => x.key === k);
          return m ? m.key : k;
        })
        .join(', ');
      this.notify('warning', CFG.modal.warningTitle, (CFG.modal.warningMessage || 'Revise los campos marcados.') + (labels ? ' (' + labels + ')' : ''));
      return;
    }
    if (!CFG.submit || !CFG.submit.url) {
      this.notify('error', CFG.modal.errorTitle, CFG.modal.errorMessage || 'No se ha configurado una URL para el envío de datos.');
      return;
    }
    if (CFG.confirm && CFG.confirm.enabled) {
      this.confirmarEnvio(() => this.enviarAhora());
      return;
    }
    this.enviarAhora();
  }

  enviarAhora() {
    const tpl = CFG.submit.request || '';
    const body = tpl.indexOf('{{') >= 0 ? this.interpolate(tpl) : tpl.trim() ? tpl : '';
    const req = this.prepararPeticion(CFG.submit, body);
    this.mostrarStatus('Enviando datos...', 'info');
    fetch(req.url, req.init)
      .then((r: Response) => r.text())
      .then((text: string) => {
        let parsed: any;
        try { parsed = JSON.parse(text); } catch { parsed = text; }
        if (parsed && typeof parsed === 'object') {
          this.mapResponse(parsed);
          const m = parsed.message || parsed.msg;
          this.notify('success', CFG.modal.successTitle, m ? String(m) : CFG.modal.successMessage);
        } else {
          this.notify('success', CFG.modal.successTitle, CFG.modal.successMessage);
        }
      })
      .catch((err: any) => {
        this.notify('error', CFG.modal.errorTitle, CFG.modal.errorMessage || ('Error al enviar los datos: ' + (err && err.message ? err.message : err)));
      });
  }

  limpiar() {
    this.model = JSON.parse(JSON.stringify(this.defaults));
    this.paso = 0;
    this.sugerencias = {};
    this.acIndice = {};
    this.errores = {};
    this.TABLA.forEach((t: any) => {
      if (this.tabla[t.id]) {
        this.tabla[t.id].seleccion = t.mode === 'single' ? null : [];
        this.tabla[t.id].pagina = 1;
        this.tabla[t.id].orden = '';
        this.tabla[t.id].dir = 1;
        this.tabla[t.id].filtros = {};
      }
      this.filtrosT[t.id] = {};
    });
    this.tabla = Object.assign({}, this.tabla);
    this.mostrarStatus('', 'info');
  }

  pbFieldVal(id: string): any {
    const v = this.model[id];
    if (v === undefined || v === null || v === '') return null;
    if (typeof v === 'number') return v;
    const s = String(v);
    if (s.trim() !== '' && !isNaN(Number(s))) return Number(s);
    return s;
  }

  pbTokenize(expr: string): any[] | null {
    const toks: any[] = [];
    let i = 0;
    const n = expr.length;
    const isDigit = (c: string) => c >= '0' && c <= '9';
    const isAlpha = (c: string) => (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c === '_';
    while (i < n) {
      const ch = expr[i];
      if (ch === ' ' || ch === '\\t' || ch === '\\n' || ch === '\\r') { i++; continue; }
      if (ch === '(' || ch === ')') { toks.push(ch); i++; continue; }
      if (ch === "'") {
        const j = expr.indexOf("'", i + 1);
        if (j < 0) return null;
        toks.push(expr.slice(i, j + 1)); i = j + 1; continue;
      }
      if (ch === '"') {
        const j2 = expr.indexOf('"', i + 1);
        if (j2 < 0) return null;
        toks.push(expr.slice(i, j2 + 1)); i = j2 + 1; continue;
      }
      if (isDigit(ch)) {
        let j3 = i;
        while (j3 < n && (isDigit(expr[j3]) || expr[j3] === '.')) j3++;
        const numText = expr.slice(i, j3);
        if (!isNaN(Number(numText))) { toks.push(Number(numText)); i = j3; continue; }
      }
      const ops2 = ['==', '!=', '<=', '>=', '&&', '||'];
      let matched = '';
      for (const op of ops2) {
        if (expr.slice(i, i + op.length) === op) { matched = op; break; }
      }
      if (matched) { toks.push(matched); i += matched.length; continue; }
      if (ch === '<' || ch === '>' || ch === '!') { toks.push(ch); i++; continue; }
      if (isAlpha(ch)) {
        let j4 = i + 1;
        while (j4 < n && (isAlpha(expr[j4]) || isDigit(expr[j4]) || expr[j4] === '.' || expr[j4] === '-' || expr[j4] === '_')) j4++;
        toks.push(expr.slice(i, j4)); i = j4; continue;
      }
      return null;
    }
    return toks;
  }

  pbCompare(a: any, op: string, b: any): boolean {
    const same = (a === b) || (String(a) === String(b));
    if (op === '==') return same;
    if (op === '!=') return !same;
    if (typeof a === 'number' && typeof b === 'number') {
      if (op === '<') return a < b;
      if (op === '>') return a > b;
      if (op === '<=') return a <= b;
      if (op === '>=') return a >= b;
    }
    const as = String(a);
    const bs = String(b);
    if (op === '<') return as < bs;
    if (op === '>') return as > bs;
    if (op === '<=') return as <= bs;
    if (op === '>=') return as >= bs;
    return false;
  }

  evalCond(expr: string): boolean {
    const toks = this.pbTokenize(expr);
    if (!toks) return false;
    let pos = 0;
    const peek = () => toks[pos];
    const parseOr = (): any => {
      let l = parseAnd();
      while (peek() === '||') { pos++; const r = parseAnd(); l = l || r; }
      return l;
    };
    const parseAnd = (): any => {
      let l = parseNot();
      while (peek() === '&&') { pos++; const r = parseNot(); l = l && r; }
      return l;
    };
    const parseNot = (): any => {
      if (peek() === '!') { pos++; return !parseNot(); }
      return parseCmp();
    };
    const parseCmp = (): any => {
      const l = parsePrim();
      const op = peek();
      if (op === '==' || op === '!=' || op === '<' || op === '>' || op === '<=' || op === '>=') {
        pos++;
        const r = parsePrim();
        return this.pbCompare(l, op, r);
      }
      return l;
    };
    const parsePrim = (): any => {
      const t = peek();
      if (t === undefined) return null;
      pos++;
      if (t === '(') {
        const v = parseOr();
        if (peek() === ')') pos++;
        return v;
      }
      if (typeof t === 'number') return t;
      if (typeof t === 'string') {
        if (t.charAt(0) === "'") return t.slice(1, -1);
        if (t.charAt(0) === '"') return t.slice(1, -1);
        return this.pbFieldVal(t);
      }
      return null;
    };
    return parseOr();
  }

  isOculto(key: string): boolean {
    const f = FMAP.find((x: { key: string; vis: string }) => x.key === key);
    if (f && f.vis) {
      try { return !this.evalCond(f.vis); } catch { return false; }
    }
    return false;
  }

  visCampo(id: string): boolean {
    return !this.isOculto(id);
  }

  visSeccion(id: string): boolean {
    const s = SECVIS.find((x: { id: string; cond: string }) => x.id === id);
    if (!s || !s.cond) return true;
    try { return this.evalCond(s.cond); } catch { return false; }
  }

  navegar(url: string, nueva: boolean) {
    if (!url) {
      this.mostrarStatus('El botón de navegación no tiene URL.', 'error');
      return;
    }
    if (nueva) window.open(url, '_blank');
    else window.location.href = url;
  }
}`;

    return `import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';

const CFG = ${cfg};

const FMAP = ${fmapJson};

const SECVIS = ${secVisJson};

${decorator}
${classBody}
`;
  }

  private escTpl(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  }

  downloadCombined(config: PageConfig, out: AngularOutput | null) {
    const o = out ?? this.generate(config);
    this.downloadFile(o.combined, `${o.fileBase}.component.ts`, 'text/typescript');
  }

  downloadSeparate(config: PageConfig, out: AngularOutput | null) {
    const o = out ?? this.generate(config);
    const files: [string, string, string][] = [
      [o.ts, `${o.fileBase}.component.ts`, 'text/typescript'],
      [o.html, `${o.fileBase}.component.html`, 'text/html'],
      [o.css, `${o.fileBase}.component.css`, 'text/css'],
    ];
    files.forEach(([content, name2, type], i) => {
      setTimeout(() => this.downloadFile(content, name2, type), i * 400);
    });
  }

  downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type: type + ';charset=utf-8' });
    const a = this.doc.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 20000);
  }

  private esc(text: string | number | boolean | null | undefined): string {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\$\{/g, '&#36;{');
  }

  private attr(text: string | number | boolean | null | undefined): string {
    return this.esc(text);
  }
}