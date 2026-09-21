import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';

const CFG = {"load":{"url":"https://example.com/api/registro/1","method":"GET","request":"","response":"{\n  \"nombre\": \"Ana\",\n  \"correo\": \"ana@ejemplo.com\",\n  \"ciudad\": \"medellin\",\n  \"observaciones\": \"Cliente desde 2023\",\n  \"estado\": \"activo\"\n}"},"submit":{"url":"https://example.com/api/registro","method":"POST","request":"{\n  \"nombre\": \"{{nombre}}\",\n  \"correo\": \"{{correo}}\",\n  \"ciudad\": \"{{ciudad}}\",\n  \"observaciones\": \"{{observaciones}}\",\n  \"estado\": \"{{estado}}\"\n}","response":"{\n  \"success\": true,\n  \"message\": \"Registro guardado correctamente\",\n  \"id\": \"R-1234\"\n}"},"autocomplete":{"url":"https://example.com/api/buscar","minChars":2},"messages":{"success":"Datos enviados correctamente.","error":"Ocurrió un error al enviar los datos."},"customCssUrl":"","modal":{"enabled":true,"successTitle":"Carga exitosa","successMessage":"Los datos se enviaron correctamente.","errorTitle":"Ocurrió un error","errorMessage":"No fue posible enviar los datos. Inténtelo de nuevo.","warningTitle":"Atención","warningMessage":"Revise los campos marcados y vuelva a intentarlo."}};

const FMAP = [{"key":"nombre","load":"nombre","submit":"nombre","type":"text","checkbox":false,"required":true,"msg":""},{"key":"ciudad","load":"ciudad","submit":"ciudad","type":"select","checkbox":false,"required":true,"msg":""},{"key":"correo","load":"correo","submit":"correo","type":"email","checkbox":false,"required":true,"msg":""},{"key":"observaciones","load":"observaciones","submit":"observaciones","type":"textarea","checkbox":false,"required":false,"msg":""},{"key":"estado","load":"estado","submit":"estado","type":"radio","checkbox":false,"required":false,"msg":""}];

@Component({
  selector: 'app-formulario-de-registro',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  template: `<div class="pb-page">
  <header class="pb-header">
    <div class="pb-wrap">
      <h1 class="pb-title">Formulario de registro</h1>
      <p class="pb-subtitle">1 sección(es) · 5 campo(s)</p>
    </div>
  </header>
  <main class="pb-wrap">
    <form #form="ngForm" (ngSubmit)="enviar(form)" novalidate>
    <section class="pb-card">
      <h2 class="pb-section-title">Datos personales</h2>
      <p class="pb-section-desc"></p>
      <div class="pb-grid" style="--pb-cols:2">
      <div class="pb-field">
        <label class="pb-label" for="f_nombre">Nombre <span class="pb-req">*</span></label>
        <input class="pb-input" id="f_nombre" name="nombre" type="text" [(ngModel)]="model['nombre']" placeholder="Escriba su nombre" required (input)="limpiarErrorCS('nombre')">
        
      <span class="pb-error" [class.show]="errores['nombre']">{{ errores['nombre'] }}</span>
      </div>
      <div class="pb-field">
        <label class="pb-label" for="f_ciudad">Ciudad <span class="pb-req">*</span></label>
        <select class="pb-select" id="f_ciudad" name="ciudad" [(ngModel)]="model['ciudad']" required (change)="limpiarErrorCS('ciudad')">
          <option value="">Seleccione una ciudad</option>
          <option *ngFor="let o of opciones['ciudad']" [value]="o.value">{{ o.label }}</option>
        </select>
      <span class="pb-error" [class.show]="errores['ciudad']">{{ errores['ciudad'] }}</span>
      </div>
      <div class="pb-field">
        <label class="pb-label" for="f_correo">Correo electrónico <span class="pb-req">*</span></label>
        <input class="pb-input" id="f_correo" name="correo" type="email" [(ngModel)]="model['correo']" placeholder="usuario@ejemplo.com" required (input)="limpiarErrorCS('correo')">
        
      <span class="pb-error" [class.show]="errores['correo']">{{ errores['correo'] }}</span>
      </div>
      <div class="pb-field">
        <label class="pb-label" for="f_observaciones">Observaciones</label>
        <textarea class="pb-textarea" id="f_observaciones" name="observaciones" [(ngModel)]="model['observaciones']" rows="4" placeholder="Escriba comentarios" (input)="limpiarErrorCS('observaciones')" (change)="limpiarErrorCS('observaciones')"></textarea>
      <span class="pb-error" [class.show]="errores['observaciones']">{{ errores['observaciones'] }}</span>
      </div>
      <div class="pb-field">
        <span class="pb-label">Estado</span>
        <fieldset class="pb-radio-group" id="f_estado">
          <label class="pb-check" *ngFor="let o of opciones['estado']">
            <input type="radio" name="estado" [value]="o.value" [(ngModel)]="model['estado']" (change)="limpiarErrorCS('estado')">
            <span>{{ o.label }}</span>
          </label>
        </fieldset>
      <span class="pb-error" [class.show]="errores['estado']">{{ errores['estado'] }}</span>
      </div>
      </div>
    </section>
      <div class="pb-status" [class.success]="tipoMensaje === 'success'" [class.error]="tipoMensaje === 'error'" [class.info]="tipoMensaje === 'info'" [style.display]="statusVisible ? 'block' : 'none'">{{ mensaje }}</div>
      <div class="pb-actions">
        <button type="submit" class="pb-btn pb-btn-primary">Enviar</button>
        <button type="button" class="pb-btn pb-btn-secondary" (click)="limpiar()">Limpiar</button>
      </div>
    </form>
  </main>
  <footer class="pb-footer">
    <div class="pb-wrap">Generado con PageBuilder</div>
  </footer>
<div class="pb-modal" [class.show]="modalVisible" (mousedown)="cerrarModal($event)">
    <div class="pb-modal-box" [class.pb-modal-success]="modalTipo === 'success'" [class.pb-modal-error]="modalTipo === 'error'" [class.pb-modal-warning]="modalTipo === 'warning'">
      <div class="pb-modal-icon">{{ modalIcono }}</div>
      <h3>{{ modalTitulo }}</h3>
      <p>{{ modalMsg }}</p>
      <button type="button" class="pb-btn pb-btn-primary" (click)="cerrarModal()">Aceptar</button>
    </div>
  </div>
</div>
`,
  styles: [`:host { display: block; }
.pb-page { min-height: 100vh; }
.pb-page {
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
  --pb-primary-dark: #3b7bf0;
  --pb-danger: #dc2626;
  --pb-success: #16a34a;
  --pb-warning: #f59e0b;
  --pb-radius: 10px;
  --pb-shadow: 0 6px 24px rgba(28,35,51,.08);
  --pb-shadow-dark: 0 6px 24px rgba(0,0,0,.35);
  --pb-bg-var: var(--pb-bg);
}
* { box-sizing: border-box; }
.pb-page {
  margin: 0;
  font-family: 'Segoe UI', system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif;
  background: var(--pb-bg-var);
  color: var(--pb-text);
  line-height: 1.5;
  transition: background .2s, color .2s;
}
.pb-page.pb-dark {
  background: var(--pb-dark-bg);
  color: var(--pb-text-dark);
}
.pb-wrap { max-width: 1080px; margin: 0 auto; padding: 0 16px; }
.pb-header {
  background: linear-gradient(120deg, var(--pb-primary) 0%, #7b3ff2 100%);
  color: #fff; padding: 26px 0; margin-bottom: 8px;
}
.pb-title { margin: 0; font-size: 26px; font-weight: 700; }
.pb-subtitle { margin: 6px 0 0; opacity: .85; font-size: 14px; }
.pb-card {
  background: var(--pb-card);
  border: 1px solid var(--pb-border);
  border-radius: var(--pb-radius);
  box-shadow: var(--pb-shadow);
  padding: 22px;
  margin: 18px 0;
}
.pb-page.pb-dark .pb-card { background: var(--pb-card-dark); border-color: var(--pb-border-dark); box-shadow: var(--pb-shadow-dark); }
.pb-section-title { margin: 0 0 2px; font-size: 18px; font-weight: 700; }
.pb-section-desc { margin: 0 0 14px; font-size: 13px; color: var(--pb-muted); }
.pb-page.pb-dark .pb-section-desc { color: var(--pb-muted-dark); }
.pb-grid {
  display: grid; gap: 16px;
  grid-template-columns: repeat(var(--pb-cols, 1), minmax(0, 1fr));
}
@media (max-width: 720px) { .pb-grid { grid-template-columns: 1fr !important; } }
.pb-field { position: relative; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.pb-label { font-size: 13px; font-weight: 600; color: inherit; }
.pb-req { color: var(--pb-danger); }
.pb-input, .pb-select, .pb-textarea {
  width: 100%; padding: 10px 12px;
  border: 1px solid var(--pb-border);
  border-radius: 8px; font-size: 14px; color: inherit;
  background: var(--pb-card);
  font-family: inherit;
  transition: border-color .15s, box-shadow .15s;
}
.pb-page.pb-dark .pb-input, .pb-page.pb-dark .pb-select, .pb-page.pb-dark .pb-textarea {
  border-color: var(--pb-border-dark); background: #121a2b; color: var(--pb-text-dark);
}
.pb-input:focus, .pb-select:focus, .pb-textarea:focus {
  outline: none; border-color: var(--pb-primary);
  box-shadow: 0 0 0 3px rgba(37,99,235,.18);
}
.pb-help { font-size: 12px; color: var(--pb-muted); }
.pb-page.pb-dark .pb-help { color: var(--pb-muted-dark); }
.pb-check { display: flex; gap: 8px; align-items: center; font-size: 14px; cursor: pointer; padding: 4px 0; }
.pb-check input { width: 17px; height: 17px; accent-color: var(--pb-primary); }
.pb-radio-group { border: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2px; }
.pb-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; }
.pb-btn {
  padding: 10px 20px; border: none; border-radius: 8px;
  font-size: 14px; font-weight: 600; cursor: pointer;
  text-decoration: none; display: inline-flex; align-items: center; gap: 6px;
  transition: filter .15s, transform .05s;
}
.pb-btn:active { transform: translateY(1px); }
.pb-btn-primary { background: var(--pb-primary); color: #fff; }
.pb-btn-secondary { background: var(--pb-border); color: var(--pb-text); }
.pb-page.pb-dark .pb-btn-secondary { background: var(--pb-border-dark); color: var(--pb-text-dark); }
.pb-btn-success { background: var(--pb-success); color: #fff; }
.pb-btn-danger { background: var(--pb-danger); color: #fff; }
.pb-btn:hover { filter: brightness(1.06); }
.pb-status { padding: 12px 14px; border-radius: 8px; margin-top: 16px; display: none; font-size: 14px; }
.pb-status.success { display: block; background: rgba(22,163,74,.12); color: var(--pb-success); border: 1px solid rgba(22,163,74,.35); }
.pb-status.error { display: block; background: rgba(220,38,38,.10); color: var(--pb-danger); border: 1px solid rgba(220,38,38,.35); }
.pb-status.info { display: block; background: rgba(37,99,235,.10); color: var(--pb-primary-dark); border: 1px solid rgba(37,99,235,.35); }
.pb-footer { text-align: center; padding: 20px 0 28px; font-size: 12px; color: var(--pb-muted); }
.pb-page.pb-dark .pb-footer { color: var(--pb-muted-dark); }
.pb-acdd {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 50;
  margin-top: 4px; background: var(--pb-card); border: 1px solid var(--pb-border);
  border-radius: 8px; box-shadow: var(--pb-shadow); max-height: 220px; overflow: auto;
}
.pb-page.pb-dark .pb-acdd { background: var(--pb-card-dark); border-color: var(--pb-border-dark); }
.pb-ac-item { padding: 9px 12px; cursor: pointer; font-size: 14px; }
.pb-ac-item:hover, .pb-ac-item.active { background: rgba(37,99,235,.10); }
.pb-error { display: none; font-size: 12px; color: var(--pb-danger); }
.pb-error.show { display: block; }
.pb-input.invalid { border-color: var(--pb-danger); }
.pb-page.pb-dark .pb-input.invalid { border-color: var(--pb-danger); }
.pb-modal {
  position: fixed; inset: 0; z-index: 100; display: none;
  align-items: center; justify-content: center;
  background: rgba(10,15,25,.55); padding: 20px;
}
.pb-modal.show { display: flex; }
.pb-modal-box {
  background: var(--pb-card); border-radius: var(--pb-radius);
  box-shadow: var(--pb-shadow); max-width: 420px; width: 100%;
  padding: 26px; text-align: center; border: 1px solid var(--pb-border);
}
.pb-page.pb-dark .pb-modal-box { background: var(--pb-card-dark); border-color: var(--pb-border-dark); box-shadow: var(--pb-shadow-dark); }
.pb-modal-icon {
  width: 54px; height: 54px; margin: 0 auto 12px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; color: #fff;
}
.pb-modal-success .pb-modal-icon { background: var(--pb-success); }
.pb-modal-error .pb-modal-icon { background: var(--pb-danger); }
.pb-modal-warning .pb-modal-icon { background: var(--pb-warning); }
.pb-modal-box h3 { margin: 0 0 8px; font-size: 18px; }
.pb-modal-box p { margin: 0 0 18px; font-size: 14px; color: var(--pb-muted); }
.pb-page.pb-dark .pb-modal-box p { color: var(--pb-muted-dark); }
.pb-empty { padding: 26px; text-align: center; color: var(--pb-muted); font-size: 14px; }
`],
})
export class FormularioDeRegistroComponent {
  model: Record<string, any> = {"nombre":"","ciudad":"","correo":"","observaciones":"","estado":"activo"};
  defaults: Record<string, any> = {"nombre":"","ciudad":"","correo":"","observaciones":"","estado":"activo"};
  opciones: Record<string, { value: string; label: string }[]> = {"ciudad":[{"value":"bogota","label":"Bogotá"},{"value":"medellin","label":"Medellín"},{"value":"cali","label":"Cali"}],"estado":[{"value":"activo","label":"Activo"},{"value":"inactivo","label":"Inactivo"}]};
  acUrls: Record<string, string> = {};
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
        if (Array.isArray(cur) && /^\d+$/.test(p)) cur = cur[Number(p)];
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
    return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m: string, key: string) => {
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
    const jobs = [];
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
}
