import { Component, effect, input, OnDestroy, output, signal } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FIELD_TYPES } from '../../models';

function collectResponseKeys(obj: any, prefix = ''): string[] {
  const out: string[] = [];
  const walk = (o: any, p: string) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) {
      if (o.length) walk(o[0], p);
      return;
    }
    for (const k of Object.keys(o)) {
      const path = p ? `${p}.${k}` : k;
      if (!out.includes(path)) out.push(path);
      walk(o[k], path);
    }
  };
  walk(obj, prefix);
  return out;
}

function responseItemKeys(data: any): string[] {
  let item: any = data;
  if (Array.isArray(data)) item = data[0];
  else if (data && typeof data === 'object') {
    for (const k of ['data', 'items', 'results', 'list']) {
      if (Array.isArray(data[k]) && data[k].length) {
        item = data[k][0];
        break;
      }
    }
  }
  return collectResponseKeys(item);
}

function tryParseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

@Component({
  selector: 'app-field-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './field-editor.html',
  styleUrl: './field-editor.css',
})
export class FieldEditor implements OnDestroy {
  readonly field = input.required<FormGroup>();
  readonly index = input.required<number>();

  readonly loadJsonKeys = input<string[]>([]);
  readonly submitJsonKeys = input<string[]>([]);

  readonly delete = output<void>();
  readonly duplicate = output<void>();
  readonly moveUp = output<void>();
  readonly moveDown = output<void>();
  readonly toggleReadonly = output<void>();

  readonly open = signal(true);
  readonly fieldTypes = FIELD_TYPES;

  private readonly customLoad = signal(false);
  private readonly customSubmit = signal(false);

  readonly optionKeys = signal<string[]>([]);
  readonly optionKeysLoading = signal(false);
  readonly optionKeysError = signal('');
  private readonly customValueKey = signal(false);
  private readonly customLabelKey = signal(false);
  private fetchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly detectedTableFields = signal<{ field: string; label: string }[]>([]);
  readonly tableDetectLoading = signal(false);
  readonly tableDetectError = signal('');

  constructor() {
    effect(() => {
      const g = this.field();
      if (!g) return;
      this.customLoad.set(false);
      this.customSubmit.set(false);
      this.customValueKey.set(false);
      this.customLabelKey.set(false);
      const urlCtl = g.get('optionsUrl') as AbstractControl | null;
      const enCtl = g.get('optionsFromUrl') as AbstractControl | null;
      const subs: { unsubscribe(): void }[] = [];
      const onChange = () => this.scheduleOptionFetch();
      this.scheduleOptionFetch();
      if (urlCtl) subs.push(urlCtl.valueChanges.subscribe(onChange));
      if (enCtl) subs.push(enCtl.valueChanges.subscribe(onChange));
      return () => subs.forEach((s) => s.unsubscribe());
    });
  }

  ngOnDestroy() {
    if (this.fetchTimer) clearTimeout(this.fetchTimer);
  }

  f(): FormGroup {
    return this.field();
  }

  optionsArr(): FormArray {
    return this.f().get('options') as FormArray;
  }

  tableColumnsArr(): FormArray {
    return this.f().get('tableColumns') as FormArray;
  }

  tblColGroup(field: string): FormGroup | null {
    for (const c of this.tableColumnsArr().controls) {
      if ((c as FormGroup).get('field')?.value === field) return c as FormGroup;
    }
    return null;
  }

  tblColIncluded(field: string): boolean {
    return !!this.tblColGroup(field);
  }

  tblToggleCol(field: string, label: string, on: boolean) {
    if (on) {
      if (!this.tblColGroup(field)) {
        this.tableColumnsArr().push(
          new FormGroup({
            field: new FormControl(field),
            label: new FormControl(label || field),
            sortable: new FormControl(true),
            filterable: new FormControl(false),
          }),
        );
      }
    } else {
      const idx = this.tableColumnsArr().controls.findIndex(
        (c) => (c as FormGroup).get('field')?.value === field,
      );
      if (idx >= 0) this.tableColumnsArr().removeAt(idx);
    }
  }

  async detectTableFields() {
    const url = String(this.ctrl('tableUrl').value || '').trim();
    if (!url) {
      this.tableDetectError.set('Escriba primero la URL de datos.');
      return;
    }
    this.tableDetectLoading.set(true);
    this.tableDetectError.set('');
    this.detectedTableFields.set([]);
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const keys = responseItemKeys(tryParseJson(await res.text()));
      const fields = keys.map((k: string) => {
        const cur = this.tblColGroup(k);
        return { field: k, label: cur ? cur.get('label')?.value || k : k };
      });
      this.detectedTableFields.set(fields);
      if (!fields.length) this.tableDetectError.set('El JSON no tiene campos detectables.');
    } catch {
      this.tableDetectError.set('No se pudieron leer los campos. Verifique la URL o los permisos CORS.');
    } finally {
      this.tableDetectLoading.set(false);
    }
  }

  ctrl(name: string): FormControl {
    return this.f().get(name) as FormControl;
  }

  optCtrl(opt: AbstractControl, name: string): FormControl {
    return (opt as FormGroup).get(name) as FormControl;
  }

  private displayFor(keys: string[], value: string, custom: boolean): string {
    if (value && keys.includes(value)) return value;
    if (value || custom) return '__custom__';
    return '';
  }

  loadDisplay(): string {
    return this.displayFor(this.loadJsonKeys(), this.ctrl('loadField').value, this.customLoad());
  }

  submitDisplay(): string {
    return this.displayFor(this.submitJsonKeys(), this.ctrl('submitField').value, this.customSubmit());
  }

  onLoadChange(event: Event) {
    const v = (event.target as HTMLSelectElement).value;
    this.customLoad.set(v === '__custom__');
    this.ctrl('loadField').setValue(v === '__custom__' ? '' : v);
  }

  onSubmitChange(event: Event) {
    const v = (event.target as HTMLSelectElement).value;
    this.customSubmit.set(v === '__custom__');
    this.ctrl('submitField').setValue(v === '__custom__' ? '' : v);
  }

  private optionKeysDisplayFor(keys: string[], value: string, custom: boolean): string {
    if (value && keys.includes(value)) return value;
    if (value || custom) return '__custom__';
    return '';
  }

  optionKeysDisplay(which: 'value' | 'label'): string {
    const ctl = which === 'value' ? 'optionsValueField' : 'optionsLabelField';
    const custom = which === 'value' ? this.customValueKey() : this.customLabelKey();
    return this.optionKeysDisplayFor(this.optionKeys(), this.ctrl(ctl).value, custom);
  }

  onOptionKeyChange(event: Event, which: 'value' | 'label') {
    const v = (event.target as HTMLSelectElement).value;
    if (which === 'value') this.customValueKey.set(v === '__custom__');
    else this.customLabelKey.set(v === '__custom__');
    this.ctrl(which === 'value' ? 'optionsValueField' : 'optionsLabelField').setValue(
      v === '__custom__' ? '' : v,
    );
  }

  private scheduleOptionFetch() {
    if (this.fetchTimer) clearTimeout(this.fetchTimer);
    const g = this.f();
    if (!g) return;
    const enabled = !!g.get('optionsFromUrl')?.value;
    const url = String(g.get('optionsUrl')?.value || '').trim();
    if (!enabled || !url) {
      this.optionKeys.set([]);
      this.optionKeysError.set('');
      this.optionKeysLoading.set(false);
      return;
    }
    this.fetchTimer = setTimeout(() => this.loadOptionKeys(url), 350);
  }

  private async loadOptionKeys(url: string) {
    if (this.fetchTimer) {
      clearTimeout(this.fetchTimer);
      this.fetchTimer = null;
    }
    this.optionKeysLoading.set(true);
    this.optionKeysError.set('');
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const keys = responseItemKeys(tryParseJson(await res.text()));
      this.optionKeys.set(keys);
      this.optionKeysError.set(keys.length ? '' : 'El JSON no tiene campos detectables.');
    } catch {
      this.optionKeys.set([]);
      this.optionKeysError.set('No se pudieron leer los campos. Verifique la URL o los permisos CORS.');
    } finally {
      this.optionKeysLoading.set(false);
    }
  }

  typeLabel(): string {
    const t = this.ctrl('type').value;
    return FIELD_TYPES.find((x) => x.value === t)?.label ?? t;
  }

  typeSymbol(): string {
    const t = this.ctrl('type').value;
    return FIELD_TYPES.find((x) => x.value === t)?.icon ?? 'Aa';
  }

  addOption() {
    this.optionsArr().push(
      new FormGroup({
        value: new FormControl(''),
        label: new FormControl(''),
      }),
    );
  }

  removeOption(i: number) {
    this.optionsArr().removeAt(i);
  }

  moveOption(i: number, dir: number) {
    const arr = this.optionsArr();
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    const cur = arr.at(i);
    arr.removeAt(i);
    arr.insert(j, cur);
  }
}