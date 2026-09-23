import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ConfigService } from '../../services/config.service';
import { HtmlGeneratorService } from '../../services/html-generator.service';

@Component({
  selector: 'app-preview',
  imports: [],
  templateUrl: './preview.html',
  styleUrl: './preview.css',
})
export class Preview {
  private configSvc = inject(ConfigService);
  private generator = inject(HtmlGeneratorService);

  private frame = viewChild<ElementRef<HTMLIFrameElement>>('frame');
  readonly html = computed(() => this.generator.generate(this.configSvc.config()));
  readonly size = computed(() => new Blob([this.html()]).size);
  readonly device = signal<'desktop' | 'mobile'>('desktop');

  constructor() {
    effect(() => {
      const frame = this.frame();
      if (frame) {
        const doc = frame.nativeElement.contentDocument;
        if (doc) {
          doc.open();
          doc.write(this.html());
          doc.close();
        }
      }
    });
  }

  openInNewTab() {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.open();
    win.document.write(this.html());
    win.document.close();
  }
}