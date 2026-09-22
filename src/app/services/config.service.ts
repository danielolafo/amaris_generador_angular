import { Injectable, signal } from '@angular/core';
import {
  Field,
  FieldType,
  PageConfig,
  defaultConfig,
  uid,
} from '../models';

const STORAGE_KEY = 'pagebuilder.config.v1';

function clone<T>(value: T | null | undefined, fallback: T): T {
  if (!value) return fallback;
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeEndpoint(raw: any) {
  const ep = raw || {};
  return {
    url: String(ep.url || ''),
    method: ['GET', 'POST', 'PUT'].includes(ep.method) ? ep.method : 'GET',
    requestJson: String(ep.requestJson || ''),
    responseJson: String(ep.responseJson || ''),
  };
}

function normalizeField(raw: any): Field {
  const f = raw || {};
  const type: FieldType = [
    'text',
    'email',
    'number',
    'password',
    'date',
    'time',
    'tel',
    'url',
    'textarea',
    'select',
    'checkbox',
    'radio',
  ].includes(f.type)
    ? f.type
    : 'text';
  const options = Array.isArray(f.options)
    ? f.options.map((o: any) => ({
        value: String(o?.value ?? ''),
        label: String(o?.label ?? ''),
      }))
    : [];
  return {
    id: String(f.id || `campo_${Date.now()}`),
    label: String(f.label ?? ''),
    type,
    placeholder: String(f.placeholder ?? ''),
    required: !!f.required,
    readonly: !!f.readonly,
    defaultValue: String(f.defaultValue ?? ''),
    helpText: String(f.helpText ?? ''),
    options,
    optionsFromUrl: !!f.optionsFromUrl,
    optionsUrl: String(f.optionsUrl ?? ''),
    optionsValueField: String(f.optionsValueField || 'value'),
    optionsLabelField: String(f.optionsLabelField || 'label'),
    autocomplete: !!f.autocomplete,
    autocompleteUrl: String(f.autocompleteUrl ?? ''),
    loadField: String(f.loadField ?? f.id ?? ''),
    submitField: String(f.submitField ?? f.id ?? ''),
    requiredMessage: String(f.requiredMessage ?? ''),
    visibleWhen: String(f.visibleWhen ?? ''),
  };
}

export function normalizeConfig(raw: any): PageConfig {
  const c = raw && typeof raw === 'object' ? raw : defaultConfig();
  const sections = Array.isArray(c.sections)
    ? c.sections.map((s: any) => ({
        id: String(s?.id || uid('sec')),
        title: String(s?.title ?? ''),
        description: String(s?.description ?? ''),
        columns: Math.min(6, Math.max(1, Number(s?.columns) || 1)),
        visibleWhen: String(s?.visibleWhen ?? ''),
        fields: Array.isArray(s?.fields) ? s.fields.map(normalizeField) : [],
      }))
    : [];
  const buttons = Array.isArray(c.buttons)
    ? c.buttons.map((b: any) => ({
        id: String(b?.id || uid('btn')),
        label: String(b?.label ?? ''),
        action: ['submit', 'clean', 'navigation'].includes(b?.action) ? b.action : 'submit',
        url: String(b?.url ?? ''),
        style: ['primary', 'secondary', 'success', 'danger'].includes(b?.style)
          ? b.style
          : 'secondary',
        targetBlank: !!b?.targetBlank,
      }))
    : [];
  return {
    pageTitle: String(c.pageTitle ?? 'Página generada'),
    layout: ['vertical', 'twoColumns', 'grid'].includes(c.layout) ? c.layout : 'twoColumns',
    defaultColumns: Math.min(6, Math.max(1, Number(c.defaultColumns) || 2)),
    theme: ['light', 'dark'].includes(c.theme) ? c.theme : 'light',
    includeFooter: c.includeFooter !== false,
    footerText: String(c.footerText ?? ''),
    load: normalizeEndpoint(c.load),
    submit: normalizeEndpoint(c.submit),
    autocompleteUrl: String(c.autocompleteUrl ?? ''),
    autocompleteMinChars: Math.max(1, Number(c.autocompleteMinChars) || 2),
    messageSuccess: String(c.messageSuccess ?? 'Datos enviados correctamente.'),
    messageError: String(c.messageError ?? 'Ocurrió un error al enviar los datos.'),
    customCssUrl: String(c.customCssUrl ?? ''),
    modal: {
      enabled: c.modal?.enabled !== false,
      successTitle: String(c.modal?.successTitle ?? 'Carga exitosa'),
      successMessage: String(c.modal?.successMessage ?? 'Los datos se enviaron correctamente.'),
      errorTitle: String(c.modal?.errorTitle ?? 'Ocurrió un error'),
      errorMessage: String(c.modal?.errorMessage ?? 'No fue posible enviar los datos.'),
      warningTitle: String(c.modal?.warningTitle ?? 'Atención'),
      warningMessage: String(c.modal?.warningMessage ?? 'Revise los campos marcados.'),
    },
    confirm: {
      enabled: !!c.confirm?.enabled,
      title: String(c.confirm?.title ?? 'Confirmar envío'),
      message: String(c.confirm?.message ?? '¿Está seguro de que desea enviar los datos?'),
      okText: String(c.confirm?.okText || 'Aceptar'),
      cancelText: String(c.confirm?.cancelText || 'Cancelar'),
    },
    sections,
    buttons,
  };
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  readonly config = signal<PageConfig>(defaultConfig());

  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const saved = this.loadFromStorage();
    this.config.set(saved);
  }

  getValue(): PageConfig {
    return this.config();
  }

  setConfig(value: PageConfig) {
    this.config.set(normalizeConfig(value));
    this.schedulePersist();
  }

  resetConfig() {
    this.config.set(defaultConfig());
    this.clearStorage();
  }

  importJson(text: string): { ok: boolean; message: string } {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.sections)) {
        this.setConfig(parsed);
        return { ok: true, message: 'Configuración importada correctamente.' };
      }
      return { ok: false, message: 'El JSON no tiene la estructura esperada (falta "sections").' };
    } catch (e: any) {
      return { ok: false, message: `JSON inválido: ${e?.message || e}` };
    }
  }

  exportJson(): string {
    return JSON.stringify(this.config(), null, 2);
  }

  private schedulePersist() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.persist(), 400);
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config()));
    } catch {
      /* storage not available */
    }
  }

  private loadFromStorage(): PageConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultConfig();
      return normalizeConfig(JSON.parse(raw));
    } catch {
      return defaultConfig();
    }
  }

  private clearStorage() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}