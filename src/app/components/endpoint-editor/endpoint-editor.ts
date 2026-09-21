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
      let target = url;
      const init: RequestInit = {
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      };
      if (method === 'GET') {
        init.method = 'GET';
        if (body) target = url + (url.includes('?') ? '&' : '?') + body;
      } else if (method === 'POST' || method === 'PUT') {
        init.method = method;
        init.body = body ? body : JSON.stringify(data);
      } else {
        init.method = 'GET';
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