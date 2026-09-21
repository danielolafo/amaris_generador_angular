import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';

const CFG = {"load":{"url":"https://example.com/api/registro/1","method":"GET","request":"","response":"{\n  \"nombre\": \"Ana\",\n  \"correo\": \"ana@ejemplo.com\",\n  \"ciudad\": \"medellin\",\n  \"observaciones\": \"Cliente desde 2023\",\n  \"estado\": \"activo\"\n}"},"submit":{"url":"https://example.com/api/registro","method":"POST","request":"{\n  \"nombre\": \"{{nombre}}\",\n  \"correo\": \"{{correo}}\",\n  \"ciudad\": \"{{ciudad}}\",\n  \"observaciones\": \"{{observaciones}}\",\n  \"estado\": \"{{estado}}\"\n}","response":"{\n  \"success\": true,\n  \"message\": \"Registro guardado correctamente\",\n  \"id\": \"R-1234\"\n}"},"autocomplete":{"url":"https://example.com/api/buscar","minChars":2},"messages":{"success":"Datos enviados correctamente.","error":"Ocurrió un error al enviar los datos."},"customCssUrl":"","modal":{"enabled":true,"successTitle":"Carga exitosa","successMessage":"Los datos se enviaron correctamente.","errorTitle":"Ocurrió un error","errorMessage":"No fue posible enviar los datos. Inténtelo de nuevo.","warningTitle":"Atención","warningMessage":"Revise los campos marcados y vuelva a intentarlo."}};

const FMAP = [{"key":"nombre","load":"nombre","submit":"nombre","type":"text","checkbox":false,"required":true,"msg":""},{"key":"ciudad","load":"ciudad","submit":"ciudad","type":"select","checkbox":false,"required":true,"msg":""},{"key":"correo","load":"correo","submit":"correo","type":"email","checkbox":false,"required":true,"msg":""},{"key":"observaciones","load":"observaciones","submit":"observaciones","type":"textarea","checkbox":false,"required":false,"msg":""},{"key":"estado","load":"estado","submit":"estado","type":"radio","checkbox":false,"required":false,"msg":""}];

@Component({
  selector: 'app-formulario-de-registro',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  templateUrl: './formulario-de-registro.component.html',
  styleUrl: './formulario-de-registro.component.css',
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
