import { Component, computed, inject, signal } from '@angular/core';
import { ConfigService } from '../../services/config.service';
import { AngularGeneratorService } from '../../services/angular-generator.service';
import { HtmlGeneratorService } from '../../services/html-generator.service';

type FileKind = 'ts' | 'html' | 'css';

@Component({
  selector: 'app-codeview',
  imports: [],
  templateUrl: './codeview.html',
  styleUrl: './codeview.css',
})
export class CodeView {
  private configSvc = inject(ConfigService);
  private angGen = inject(AngularGeneratorService);
  private htmlGen = inject(HtmlGeneratorService);

  readonly file = signal<FileKind>('ts');
  readonly single = signal(false);

  readonly out = computed(() => this.angGen.generate(this.configSvc.config()));
  readonly content = computed(() =>
    this.single() ? this.out().combined : this.out()[this.file()],
  );
  readonly fileName = computed(() => {
    const o = this.out();
    if (this.single()) return o.fileBase + '.component.ts';
    return o.fileBase + '.component.' + this.file();
  });
  readonly lines = computed(() => this.content().split('\n').length);
  readonly size = computed(() => new Blob([this.content()]).size);
  readonly copied = signal(false);

  setFile(f: FileKind) {
    this.file.set(f);
    if (this.single()) this.single.set(false);
  }

  toggleSingle() {
    this.single.set(!this.single());
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.content());
    } catch {
      const ta = document.createElement('textarea');
      ta.value = this.content();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1600);
  }

  download() {
    this.angGen.downloadFile(this.content(), this.fileName(), this.mime());
  }

  downloadAll() {
    this.angGen.downloadSeparate(this.configSvc.config(), this.out());
  }

  downloadHtml() {
    this.htmlGen.download(this.configSvc.config());
  }

  private mime(): string {
    if (this.file() === 'html') return 'text/html';
    if (this.file() === 'css') return 'text/css';
    return 'text/typescript';
  }
}