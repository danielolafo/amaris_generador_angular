import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HtmlGeneratorService } from './html-generator.service';
import type { Field, PageConfig, PageButton, Section, SelectOption } from '../models';

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

  private buildTemplate(config: PageConfig, name: { fileBase: string }): string {
    const c = config;
    const defaultCols = c.layout === 'vertical' ? 1 : c.layout === 'twoColumns' ? 2 : Math.max(1, Math.min(6, Number(c.defaultColumns) || 2));
    const dark = c.theme === 'dark';
    const subtitle = `${c.sections.length} sección(es) · ${c.sections.reduce((t, s) => t + (s.fields?.length || 0), 0)} campo(s)`;
    const sections = c.sections
      .map((s) => this.tSection(s, s.columns || defaultCols))
      .join('\n');
    const buttons = this.tButtons(c.buttons);
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
      <button type="button" class="pb-btn pb-btn-primary" (click)="cerrarModal()">Aceptar</button>
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
${sections}
      <div class="pb-status" [class.success]="tipoMensaje === 'success'" [class.error]="tipoMensaje === 'error'" [class.info]="tipoMensaje === 'info'" [style.display]="statusVisible ? 'block' : 'none'">{{ mensaje }}</div>
      <div class="pb-actions">
${buttons}
      </div>
    </form>
  </main>
${footer}
${modal}
</div>
`;
  }

  private tSection(section: Section, columns: number): string {
    if (!section.fields || section.fields.length === 0) {
      return `    <section class="pb-card">
      <h2 class="pb-section-title">${this.esc(section.title)}</h2>
      <p class="pb-empty">Esta sección no tiene campos configurados.</p>
    </section>`;
    }
    const desc = section.description
      ? `      <p class="pb-section-desc">${this.esc(section.description)}</p>`
      : '      <p class="pb-section-desc"></p>';
    const fields = section.fields.map((f) => this.tField(f)).join('\n');
    return `    <section class="pb-card">
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

    switch (f.type) {
      case 'textarea': {
        const ac = f.autocomplete
          ? ` autocomplete="off" (input)="buscar($event, '${id}')" (keydown)="acKey($event, '${id}')" (blur)="ocultarAc('${id}')"`
          : ` (input)="limpiarErrorCS('${id}')"`;
        return `      <div class="pb-field">
        <label class="pb-label" for="${cid}">${label}${req}</label>
        <textarea class="pb-textarea" id="${cid}" name="${id}" [(ngModel)]="${key}" rows="4" placeholder="${ph}"${requiredAttr}${readonlyAttr}${ac} (change)="limpiarErrorCS('${id}')"></textarea>${f.autocomplete ? this.acBox(id) : ''}${err}${help}
      </div>`;
      }
      case 'select':
        return `      <div class="pb-field">
        <label class="pb-label" for="${cid}">${label}${req}</label>
        <select class="pb-select" id="${cid}" name="${id}" [(ngModel)]="${key}"${requiredAttr}${readonlyAttr} (change)="limpiarErrorCS('${id}')">
          <option value="">${ph || 'Seleccione...'}</option>
          <option *ngFor="let o of opciones['${id}']" [value]="o.value">{{ o.label }}</option>
        </select>${err}${help}
      </div>`;
      case 'checkbox':
        return `      <div class="pb-field">
        <label class="pb-check">
          <input type="checkbox" id="${cid}" name="${id}" [(ngModel)]="${key}" (change)="limpiarErrorCS('${id}')">
          <span>${label}${req}</span>
        </label>${err}${help}
      </div>`;
      case 'radio':
        return `      <div class="pb-field">
        <span class="pb-label">${label}${req}</span>
        <fieldset class="pb-radio-group" id="${cid}">
          <label class="pb-check" *ngFor="let o of opciones['${id}']">
            <input type="radio" name="${id}" [value]="o.value" [(ngModel)]="${key}" (change)="limpiarErrorCS('${id}')">
            <span>{{ o.label }}</span>
          </label>
        </fieldset>${err}${help}
      </div>`;
      default: {
        const ac = f.autocomplete
          ? ` autocomplete="off" (input)="buscar($event, '${id}')" (keydown)="acKey($event, '${id}')" (blur)="ocultarAc('${id}')"`
          : ` (input)="limpiarErrorCS('${id}')"`;
        return `      <div class="pb-field">
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
    const cfg = JSON.stringify({
      load: { url: c.load.url || '', method: c.load.method, request: c.load.requestJson || '', response: c.load.responseJson || '' },
      submit: { url: c.submit.url || '', method: c.submit.method, request: c.submit.requestJson || '', response: c.submit.responseJson || '' },
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
    });

    const modelObj: Record<string, unknown> = {};
    const opcionesObj: Record<string, SelectOption[]> = {};
    const acUrlsObj: Record<string, string> = {};
    const selectJobs: { campo: string; url: string; vf: string; lf: string }[] = [];
    const fieldsArr: { key: string; load: string; submit: string; type: string; checkbox: boolean; required: boolean; msg: string }[] = [];

    for (const s of c.sections) {
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
        });
        if (f.type === 'checkbox') {
          modelObj[key] = ['true', '1', 'si', 'yes', 'checked'].includes(String(f.defaultValue || '').toLowerCase());
        } else {
          modelObj[key] = f.defaultValue ?? '';
        }
        if (f.type === 'select' || f.type === 'radio') {
          opcionesObj[key] = f.optionsFromUrl ? [] : (f.options || []).map((o) => ({ value: o.value, label: o.label || o.value }));
        }
        if (f.autocomplete && f.autocompleteUrl) acUrlsObj[key] = f.autocompleteUrl;
        if ((f.type === 'select' || f.type === 'radio') && f.optionsFromUrl) {
          selectJobs.push({
            campo: key,
            url: f.optionsUrl || '',
            vf: f.optionsValueField || 'value',
            lf: f.optionsLabelField || 'label',
          });
        }
      }
    }

    const modelJson = JSON.stringify(modelObj);
    const opcionesJson = JSON.stringify(opcionesObj);
    const acUrlsJson = JSON.stringify(acUrlsObj);
    const selectJobsJson = JSON.stringify(selectJobs);
    const fmapJson = JSON.stringify(fieldsArr);

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
  opciones: Record<string, { value: string; label: string }[]> = ${opcionesJson};
  acUrls: Record<string, string> = ${acUrlsJson};
  sugerencias: Record<string, any[]> = {};
  acIndice: Record<string, number> = {};
  errores: Record<string, string> = {};
  mensaje = '';
  tipoMensaje = 'info';
  statusVisible = false;
  modalVisible = false;
  modalTipo = '';
  modalTitulo = '';
  modalMsg = '';
  modalIcono = '';
  private timer: any = null;

  ngOnInit() {
    if (CFG.customCssUrl) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = CFG.customCssUrl;
      document.head.appendChild(link);
    }
    this.cargarSelects();
    this.cargarDatos();
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

  mostrarModal(tipo: string, titulo: string, msg: string) {
    const icons: Record<string, string> = { success: '&#10003;', error: '&#10005;', warning: '&#33;' };
    this.modalTipo = tipo || 'info';
    this.modalIcono = icons[tipo] || '!';
    this.modalTitulo = titulo || '';
    this.modalMsg = msg || '';
    this.modalVisible = true;
  }

  cerrarModal(ev?: Event) {
    if (ev) {
      const target = ev.target as HTMLElement;
      if (target && ev.target !== ev.currentTarget) return;
    }
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
    const method = (CFG.load.method || 'GET').toUpperCase();
    let url = CFG.load.url;
    const init: RequestInit = { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' } };
    if (method === 'GET') {
      init.method = 'GET';
      if (body) url = url + (url.indexOf('?') >= 0 ? '&' : '?') + body;
    } else {
      init.method = method;
      init.body = body ? body : JSON.stringify(this.collect());
    }
    this.mostrarStatus('Cargando datos...', 'info');
    fetch(url, init)
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
    const tpl = CFG.submit.request || '';
    const body = tpl.indexOf('{{') >= 0 ? this.interpolate(tpl) : tpl.trim() ? tpl : '';
    const method = (CFG.submit.method || 'POST').toUpperCase();
    let url = CFG.submit.url;
    const init: RequestInit = { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' } };
    if (method === 'GET') {
      init.method = 'GET';
      if (body) url = url + (url.indexOf('?') >= 0 ? '&' : '?') + body;
    } else {
      init.method = method;
      init.body = body ? body : JSON.stringify(this.collect());
    }
    this.mostrarStatus('Enviando datos...', 'info');
    fetch(url, init)
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
    this.sugerencias = {};
    this.acIndice = {};
    this.errores = {};
    this.mostrarStatus('', 'info');
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