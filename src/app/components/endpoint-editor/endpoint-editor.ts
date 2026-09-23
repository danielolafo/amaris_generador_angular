import { Component, input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ConfigService } from '../../services/config.service';
import { PageConfig } from '../../models';

function collectFlatValues(config: PageConfig): Record<string, string> {
  const out: Record<string, string> = {};
  for (const section of config.sections || []) {
    for (const field of section.fields || []) {
      out[field.id] = field.defaultValue || '';
    }
  }
  return out;
}

function interpolateLocal(tpl: string, data: Record<string, string>): string {
  if (!tpl) return '';
  if (tpl.indexOf('{{') < 0) return tpl;
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    const v = data[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

@Component({
  selector: 'app-endpoint-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './endpoint-editor.html',
  styleUrl: './endpoint-editor.css',
})
export class EndpointEditor {
  readonly title = input.required<string>();
  readonly group = input.required<FormGroup>();
  readonly fieldIds = input<string[]>([]);
  readonly isSubmit = input(false);

  readonly state = signal<'idle' | 'testing' | 'ok' | 'error'>('idle');
  readonly testResult = signal('');
  readonly testMessage = signal('');
  readonly token = signal('');
  readonly showJson = signal(false);
  readonly campoToken = '{{campo}}';
  readonly idToken = '{{id}}';
  readonly headerExample = '{ "Authorization": "Bearer {{token}}", "X-Tenant": "acme" }';

  constructor(private configSvc: ConfigService) {}

  tokenValue(id: string): string {
    return `{{${id}}}`;
  }

  onTokenChange(event: Event) {
    this.token.set((event.target as HTMLSelectElement).value);
  }

  requestPlaceholder(): string {
    return '{\n  "nombre": "{{campo}}",\n  "activo": true\n}';
  }

  responsePlaceholder(): string {
    return '{\n  "ok": true,\n  "message": "Registro creado",\n  "registro": { "id": 123 }\n}';
  }

  onInsertToken() {
    const t = this.token();
    if (!t) return;
    const ctrl = this.group().get('requestJson');
    if (!ctrl) return;
    const cur: string = ctrl.value || '';
    const sep = cur && !cur.endsWith('\n') ? '\n' : '';
    ctrl.setValue(cur + sep + t);
    this.token.set('');
  }

  async runTest() {
    const g = this.group();
    const url: string = g.get('url')?.value || '';
    const method: string = (g.get('method')?.value || 'GET').toUpperCase();
    const tpl: string = g.get('requestJson')?.value || '';
    const paramMode: string = g.get('paramMode')?.value || 'fixed';
    const paramName: string = g.get('paramName')?.value || '';
    const paramValue: string = g.get('paramValue')?.value || '';
    const headersJson: string = g.get('headersJson')?.value || '';
    this.testResult.set('');
    if (!url) {
      this.state.set('error');
      this.testMessage.set('Indique una URL antes de probar.');
      return;
    }
    this.state.set('testing');
    this.testMessage.set('Ejecutando petición…');
    try {
      const data = collectFlatValues(this.configSvc.getValue());
      const body = interpolateLocal(tpl, data);
      const headers: Record<string, string> = {};
      if (headersJson && headersJson.trim()) {
        try {
          const parsed = JSON.parse(headersJson);
          for (const k of Object.keys(parsed)) {
            headers[k] = interpolateLocal(String(parsed[k]), data);
          }
        } catch {
          /* headers JSON inválido: se usan los por defecto */
        }
      }
      if (!Object.keys(headers).length) {
        headers['Accept'] = 'application/json';
        headers['Content-Type'] = 'application/json';
      }
      let target = interpolateLocal(url, data);
      const appendParam = () => {
        const pv = interpolateLocal(paramValue, data);
        if (paramName && pv) {
          target = target + (target.includes('?') ? '&' : '?') + encodeURIComponent(paramName) + '=' + encodeURIComponent(pv);
        }
      };
      const init: RequestInit = { headers };
      if (method === 'GET') {
        init.method = 'GET';
        if (paramMode === 'query') appendParam();
        if (body) target = target + (target.includes('?') ? '&' : '?') + body;
      } else if (method === 'DELETE') {
        init.method = 'DELETE';
        appendParam();
      } else {
        init.method = method;
        init.body = body ? body : JSON.stringify(data);
      }
      const res = await fetch(target, init);
      const text = await res.text();
      this.testResult.set(text || '(sin contenido)');
      this.state.set(res.ok ? 'ok' : 'error');
      this.testMessage.set(
        res.ok
          ? `Respuesta ${res.status} ${res.statusText}`
          : `HTTP ${res.status} ${res.statusText}`,
      );
    } catch (e: any) {
      this.state.set('error');
      this.testMessage.set(
        `No se pudo conectar (¿CORS o servidor caído?): ${e?.message || e}`,
      );
    }
  }
}