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
        frame.nativeElement.srcdoc = this.html();
      }
    });
  }

  openInNewTab() {
    const blob = new Blob([this.html()], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 20000);
  }
}