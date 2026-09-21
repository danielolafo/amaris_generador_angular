import { Component, inject, signal } from '@angular/core';
import { Builder } from './components/builder/builder';
import { Preview } from './components/preview/preview';
import { CodeView } from './components/codeview/codeview';
import { ConfigService } from './services/config.service';
import { HtmlGeneratorService } from './services/html-generator.service';
import { AngularGeneratorService } from './services/angular-generator.service';

type Tab = 'builder' | 'preview' | 'code';

@Component({
  selector: 'app-root',
  imports: [Builder, Preview, CodeView],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private configSvc = inject(ConfigService);
  private generator = inject(HtmlGeneratorService);
  private angGen = inject(AngularGeneratorService);

  readonly tab = signal<Tab>('builder');
  readonly copied = signal(false);
  readonly imported = signal(false);

  switchTab(t: Tab) {
    this.tab.set(t);
  }

  downloadComponent() {
    this.angGen.downloadSeparate(this.configSvc.getValue(), null);
  }

  downloadHtml() {
    this.generator.download(this.configSvc.getValue());
  }

  async copyComponent() {
    try {
      await navigator.clipboard.writeText(this.angGen.generate(this.configSvc.getValue()).combined);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = this.angGen.generate(this.configSvc.getValue()).combined;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1600);
  }

  exportJson() {
    const content = this.configSvc.exportJson();
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'configuracion-pagina.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 20000);
  }

  onImportFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = this.configSvc.importJson(String(reader.result || ''));
      this.imported.set(result.ok);
      setTimeout(() => this.imported.set(false), 2000);
      if (result.ok) this.tab.set('builder');
      else alert(result.message);
    };
    reader.readAsText(file, 'utf-8');
    input.value = '';
  }

  resetAll() {
    if (window.confirm('¿Reiniciar toda la configuración y volver al ejemplo inicial?')) {
      this.configSvc.resetConfig();
      this.tab.set('builder');
    }
  }

  downloadSampleJson() {
    this.exportJson();
  }
}