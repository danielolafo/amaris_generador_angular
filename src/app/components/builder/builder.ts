import { Component, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BUTTON_ACTIONS,
  BUTTON_STYLES,
  FIELD_TYPES,
  FieldType,
  LAYOUT_OPTIONS,
  PageButton,
  Section,
  uid,
} from '../../models';
import { ConfigService } from '../../services/config.service';
import { EndpointEditor } from '../endpoint-editor/endpoint-editor';
import { FieldEditor } from '../field-editor/field-editor';

export function extractJsonKeys(tpl: string | null | undefined): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const add = (k: string) => {
    if (k && !seen.has(k)) {
      seen.add(k);
      keys.push(k);
    }
  };
  const s = String(tpl ?? '');
  const re = /"([A-Za-z0-9_\-]+)"\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) add(m[1]);
  const reTpl = /{{\s*([A-Za-z0-9_.\-]+)\s*}}/g;
  while ((m = reTpl.exec(s))) add(m[1]);
  return keys;
}

@Component({
  selector: 'app-builder',
  imports: [ReactiveFormsModule, EndpointEditor, FieldEditor],
  templateUrl: './builder.html',
  styleUrl: './builder.css',
})
export class Builder implements OnInit {
  private configSvc = inject(ConfigService);
  private destroyRef = inject(DestroyRef);

  protected readonly fieldTypes = FIELD_TYPES;
  protected readonly layouts = LAYOUT_OPTIONS;
  protected readonly buttonActions = BUTTON_ACTIONS;
  protected readonly buttonStyles = BUTTON_STYLES;

  protected form!: FormGroup;
  protected selectedSection = signal(0);

  private readonly syncEnabled = signal(true);
  private lastPushed: any = null;

  constructor() {
    effect(() => {
      const c = this.configSvc.config();
      if (!this.form || !this.lastPushed || c === this.lastPushed) return;
      this.syncEnabled.set(false);
      this.form = this.buildForm(c);
      this.selectedSection.set(0);
      this.syncEnabled.set(true);
      this.lastPushed = c;
    });
  }

  ngOnInit() {
    this.form = this.buildForm(this.configSvc.getValue());
    this.lastPushed = this.configSvc.getValue();
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!this.syncEnabled()) return;
      this.configSvc.setConfig(this.buildConfig(this.form.getRawValue()));
      this.lastPushed = this.configSvc.config();
    });
  }

  // ---------- form shape ----------

  private buildForm(config: any): FormGroup {
    const sections = new FormArray(
      (config.sections || []).map((s: Section) => this.sectionGroup(s)),
    );
    const buttons = new FormArray(
      (config.buttons || []).map((b: PageButton) => this.buttonGroup(b)),
    );
    return new FormGroup({
      pageTitle: new FormControl(config.pageTitle || ''),
      layout: new FormControl(config.layout || 'twoColumns'),
      defaultColumns: new FormControl(config.defaultColumns || 2),
      theme: new FormControl(config.theme || 'light'),
      includeFooter: new FormControl(config.includeFooter !== false),
      footerText: new FormControl(config.footerText || ''),
      messageSuccess: new FormControl(config.messageSuccess || ''),
      messageError: new FormControl(config.messageError || ''),
      customCssUrl: new FormControl(config.customCssUrl || ''),
      modal: new FormGroup({
        enabled: new FormControl(!!config.modal?.enabled),
        successTitle: new FormControl(config.modal?.successTitle || 'Carga exitosa'),
        successMessage: new FormControl(config.modal?.successMessage || 'Los datos se enviaron correctamente.'),
        errorTitle: new FormControl(config.modal?.errorTitle || 'Ocurrió un error'),
        errorMessage: new FormControl(config.modal?.errorMessage || 'No fue posible enviar los datos.'),
        warningTitle: new FormControl(config.modal?.warningTitle || 'Atención'),
        warningMessage: new FormControl(config.modal?.warningMessage || 'Revise los campos marcados.'),
      }),
      confirm: new FormGroup({
        enabled: new FormControl(!!config.confirm?.enabled),
        title: new FormControl(config.confirm?.title || 'Confirmar envío'),
        message: new FormControl(config.confirm?.message || '¿Está seguro de que desea enviar los datos?'),
        okText: new FormControl(config.confirm?.okText || 'Aceptar'),
        cancelText: new FormControl(config.confirm?.cancelText || 'Cancelar'),
      }),
      autocompleteUrl: new FormControl(config.autocompleteUrl || ''),
      autocompleteMinChars: new FormControl(config.autocompleteMinChars || 2),
      load: this.endpointGroup(config.load),
      submit: this.endpointGroup(config.submit),
      sections,
      buttons,
    });
  }

  private endpointGroup(ep: any): FormGroup {
    return new FormGroup({
      url: new FormControl(ep?.url || ''),
      method: new FormControl(ep?.method || 'GET'),
      requestJson: new FormControl(ep?.requestJson || ''),
      responseJson: new FormControl(ep?.responseJson || ''),
    });
  }

  private sectionGroup(section: Section): FormGroup {
    return new FormGroup({
      id: new FormControl(section?.id || uid('sec'), Validators.required),
      title: new FormControl(section?.title || ''),
      description: new FormControl(section?.description || ''),
      columns: new FormControl(section?.columns || 1),
      visibleWhen: new FormControl(section?.visibleWhen || ''),
      fields: new FormArray((section?.fields || []).map((f) => this.fieldGroup(f))),
    });
  }

  private fieldGroup(field: any): FormGroup {
    return new FormGroup({
      id: new FormControl(field?.id || uid('campo'), Validators.required),
      label: new FormControl(field?.label || ''),
      type: new FormControl(field?.type || 'text'),
      placeholder: new FormControl(field?.placeholder || ''),
      required: new FormControl(!!field?.required),
      readonly: new FormControl(!!field?.readonly),
      defaultValue: new FormControl(field?.defaultValue || ''),
      helpText: new FormControl(field?.helpText || ''),
      optionsFromUrl: new FormControl(!!field?.optionsFromUrl),
      optionsUrl: new FormControl(field?.optionsUrl || ''),
      optionsValueField: new FormControl(field?.optionsValueField || 'value'),
      optionsLabelField: new FormControl(field?.optionsLabelField || 'label'),
      autocomplete: new FormControl(!!field?.autocomplete),
      autocompleteUrl: new FormControl(field?.autocompleteUrl || ''),
      loadField: new FormControl(field?.loadField || field?.id || ''),
      submitField: new FormControl(field?.submitField || field?.id || ''),
      requiredMessage: new FormControl(field?.requiredMessage || ''),
      visibleWhen: new FormControl(field?.visibleWhen || ''),
      options: new FormArray(
        (field?.options || []).map((o: any) => this.optionGroup(o)),
      ),
    });
  }

  private optionGroup(opt: any): FormGroup {
    return new FormGroup({
      value: new FormControl(opt?.value || ''),
      label: new FormControl(opt?.label || ''),
    });
  }

  private buttonGroup(btn: PageButton): FormGroup {
    return new FormGroup({
      id: new FormControl(btn?.id || uid('btn')),
      label: new FormControl(btn?.label || ''),
      action: new FormControl(btn?.action || 'submit'),
      url: new FormControl(btn?.url || ''),
      style: new FormControl(btn?.style || 'primary'),
      targetBlank: new FormControl(!!btn?.targetBlank),
    });
  }

  // ---------- arrays ----------

  loadGroup(): FormGroup {
    return this.form.get('load') as FormGroup;
  }

  submitGroup(): FormGroup {
    return this.form.get('submit') as FormGroup;
  }

  sectionAt(i: number): FormGroup {
    return this.sectionsArr().at(i) as FormGroup;
  }

  fieldAt(si: number, fi: number): FormGroup {
    return this.fieldsArr(si).at(fi) as FormGroup;
  }

  buttonAt(i: number): FormGroup {
    return this.buttonsArr().at(i) as FormGroup;
  }

  sectionsArr(): FormArray {
    return this.form.get('sections') as FormArray;
  }

  fieldsArr(sectionIdx: number): FormArray {
    return this.sectionsArr().at(sectionIdx).get('fields') as FormArray;
  }

  buttonsArr(): FormArray {
    return this.form.get('buttons') as FormArray;
  }

  fieldIds(): string[] {
    const ids: string[] = [];
    for (const s of this.sectionsArr().controls) {
      for (const f of (s.get('fields') as FormArray).controls) {
        ids.push(f.get('id')?.value);
      }
    }
    return ids;
  }

  jsonKeysLoad(): string[] {
    return extractJsonKeys(this.form?.get('load')?.get('responseJson')?.value);
  }

  jsonKeysSubmit(): string[] {
    return extractJsonKeys(this.form?.get('submit')?.get('requestJson')?.value);
  }

  layoutColumns(): number {
    const layout = this.form.get('layout')?.value;
    if (layout === 'vertical') return 1;
    if (layout === 'twoColumns') return 2;
    return Math.max(1, Math.min(6, Number(this.form.get('defaultColumns')?.value) || 2));
  }

  totalFields(): number {
    let total = 0;
    for (const s of this.sectionsArr().controls) {
      total += (s.get('fields') as FormArray).length;
    }
    return total;
  }

  setLayout(layout: string) {
    this.form.get('layout')?.setValue(layout);
    this.onLayoutChange();
  }

  onSectionSelect(event: Event) {
    this.selectSection(Number((event.target as HTMLSelectElement).value));
  }

  onLayoutChange() {
    const layout = this.form.get('layout')?.value;
    if (layout === 'vertical') this.form.get('defaultColumns')?.setValue(1);
    else if (layout === 'twoColumns') this.form.get('defaultColumns')?.setValue(2);
    else this.form.get('defaultColumns')?.setValue(3);
  }

  selectSection(i: number) {
    this.selectedSection.set(i);
  }

  // ---------- sections ----------

  addSection() {
    this.sectionsArr().push(
      this.sectionGroup({
        id: uid('sec'),
        title: `Sección ${this.sectionsArr().length + 1}`,
        description: '',
        columns: this.layoutColumns(),
        visibleWhen: '',
        fields: [],
      }),
    );
    this.selectedSection.set(this.sectionsArr().length - 1);
  }

  removeSection(i: number) {
    this.sectionsArr().removeAt(i);
    if (this.selectedSection() >= this.sectionsArr().length) {
      this.selectedSection.set(Math.max(0, this.sectionsArr().length - 1));
    }
  }

  moveSection(i: number, dir: number) {
    const arr = this.sectionsArr();
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    const cur = arr.at(i);
    arr.removeAt(i);
    arr.insert(j, cur);
    this.selectedSection.set(j);
  }

  protected draggingSection = signal(-1);

  onSectionDragStart(i: number) {
    this.draggingSection.set(i);
  }

  onSectionDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  }

  onSectionDrop(target: number) {
    const from = this.draggingSection();
    const arr = this.sectionsArr();
    if (from < 0 || from === target || from >= arr.length) {
      this.draggingSection.set(-1);
      return;
    }
    const cur = arr.at(from);
    arr.removeAt(from);
    const adjusted = target > from ? target - 1 : target;
    arr.insert(Math.max(0, Math.min(arr.length, adjusted)), cur);
    this.selectedSection.set(adjusted);
    this.draggingSection.set(-1);
  }

  onSectionDragEnd() {
    this.draggingSection.set(-1);
  }

  // ---------- organizer (right sidebar) ----------

  protected dragItem = signal<
    { kind: 'section'; src: number } | { kind: 'field'; srcSec: number; srcIdx: number } | null
  >(null);

  onOrgSectionDragStart(i: number) {
    this.dragItem.set({ kind: 'section', src: i });
  }

  onOrgFieldDragStart(event: Event, si: number, fi: number) {
    event.stopPropagation();
    this.dragItem.set({ kind: 'field', srcSec: si, srcIdx: fi });
  }

  onOrgDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  }

  onOrgDragEnd() {
    this.dragItem.set(null);
  }

  onOrgSectionDrop(target: number) {
    const d = this.dragItem();
    if (!d) return;
    if (d.kind === 'section' && d.src !== target) {
      const arr = this.sectionsArr();
      const cur = arr.at(d.src);
      arr.removeAt(d.src);
      const idx = target > d.src ? target - 1 : target;
      arr.insert(Math.max(0, Math.min(arr.length, idx)), cur);
      this.selectedSection.set(idx);
    }
    this.dragItem.set(null);
  }

  onOrgFieldDrop(targetSec: number, targetIdx: number) {
    const d = this.dragItem();
    if (!d) return;
    if (d.kind === 'field') {
      const srcArr = this.fieldsArr(d.srcSec);
      const cur = srcArr.at(d.srcIdx);
      const same = d.srcSec === targetSec;
      srcArr.removeAt(d.srcIdx);
      const tgtArr = same ? srcArr : this.fieldsArr(targetSec);
      let idx = targetIdx;
      if (same) idx = targetIdx < 0 ? tgtArr.length : targetIdx > d.srcIdx ? targetIdx - 1 : targetIdx;
      else idx = targetIdx < 0 ? tgtArr.length : targetIdx;
      idx = Math.max(0, Math.min(tgtArr.length, idx));
      tgtArr.insert(idx, cur);
    }
    this.dragItem.set(null);
  }

  fieldsCount(i: number): number {
    return this.fieldsArr(i).length;
  }

  isOrgSectionDragging(i: number): boolean {
    const d = this.dragItem();
    return !!d && d.kind === 'section' && d.src === i;
  }

  isOrgFieldDragging(si: number, fi: number): boolean {
    const d = this.dragItem();
    return !!d && d.kind === 'field' && d.srcSec === si && d.srcIdx === fi;
  }

  fieldTypeLabel(field: AbstractControl): string {
    const v = field.get('type')?.value;
    return this.fieldTypes.find((t) => t.value === v)?.label || v || '';
  }

  confirmGroup(): FormGroup {
    return this.form.get('confirm') as FormGroup;
  }

  insertToken(target: HTMLInputElement | HTMLTextAreaElement, token: string) {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const value = target.value;
    target.value = value.slice(0, start) + token + value.slice(end);
    target.focus();
    const cursor = start + token.length;
    target.setSelectionRange(cursor, cursor);
    target.dispatchEvent(new Event('input', { bubbles: true }));
  }

  insertFieldToken(target: HTMLInputElement | HTMLTextAreaElement, id: string) {
    if (!id) return;
    this.insertToken(target, '{{' + id + '}}');
  }

  sectionColumns(i: number): number {
    return Math.max(1, Math.min(6, Number(this.sectionsArr().at(i).get('columns')?.value) || 1));
  }

  // ---------- fields ----------

  addField(sectionIdx: number, type: FieldType) {
    const defaults: any = { type, label: '', required: false, options: [] };
    const labelMap: Record<string, string> = {
      text: 'Texto',
      email: 'Correo',
      number: 'Número',
      password: 'Contraseña',
      date: 'Fecha',
      time: 'Hora',
      tel: 'Teléfono',
      url: 'URL',
      textarea: 'Observaciones',
      select: 'Seleccione',
      checkbox: 'Acepta los términos',
      radio: 'Opción',
    };
    defaults.label = labelMap[type] || 'Campo';
    defaults.placeholder =
      type === 'select' ? 'Seleccione una opción' : type === 'textarea' ? 'Escriba aquí…' : '';
    if (type === 'select') {
      defaults.options = [
        { value: 'opcion_1', label: 'Opción 1' },
        { value: 'opcion_2', label: 'Opción 2' },
      ];
    }
    if (type === 'radio') {
      defaults.options = [
        { value: 'si', label: 'Sí' },
        { value: 'no', label: 'No' },
      ];
      defaults.defaultValue = 'si';
    }
    this.fieldsArr(sectionIdx).push(this.fieldGroup(defaults));
  }

  removeField(si: number, fi: number) {
    this.fieldsArr(si).removeAt(fi);
  }

  moveField(si: number, fi: number, dir: number) {
    const arr = this.fieldsArr(si);
    const j = fi + dir;
    if (j < 0 || j >= arr.length) return;
    const cur = arr.at(fi);
    arr.removeAt(fi);
    arr.insert(j, cur);
  }

  duplicateField(si: number, fi: number) {
    const src = this.fieldsArr(si).at(fi);
    const clone = this.fieldGroup(src.getRawValue());
    clone.get('id')?.setValue(uid('campo'));
    this.fieldsArr(si).insert(fi + 1, clone);
  }

  // ---------- buttons ----------

  addButton(action = 'submit') {
    const labels: Record<string, string> = {
      submit: 'Enviar',
      clean: 'Limpiar',
      navigation: 'Ir a…',
    };
    const styles: Record<string, string> = {
      submit: 'primary',
      clean: 'secondary',
      navigation: 'secondary',
    };
    this.buttonsArr().push(
      this.buttonGroup({
        id: uid('btn'),
        label: labels[action] || 'Botón',
        action,
        url: action === 'navigation' ? 'https://ejemplo.com/pagina-destino' : '',
        style: styles[action] || 'secondary',
        targetBlank: false,
      } as PageButton),
    );
  }

  removeButton(i: number) {
    this.buttonsArr().removeAt(i);
  }

  moveButton(i: number, dir: number) {
    const arr = this.buttonsArr();
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    const cur = arr.at(i);
    arr.removeAt(i);
    arr.insert(j, cur);
  }

  // ---------- config mapping ----------

  private buildConfig(raw: any): any {
    return {
      pageTitle: raw.pageTitle,
      layout: raw.layout,
      defaultColumns: Number(raw.defaultColumns) || 2,
      theme: raw.theme,
      includeFooter: raw.includeFooter,
      footerText: raw.footerText,
      messageSuccess: raw.messageSuccess,
      messageError: raw.messageError,
      customCssUrl: raw.customCssUrl || '',
      modal: {
        enabled: raw.modal?.enabled !== false,
        successTitle: raw.modal?.successTitle || 'Carga exitosa',
        successMessage: raw.modal?.successMessage || 'Los datos se enviaron correctamente.',
        errorTitle: raw.modal?.errorTitle || 'Ocurrió un error',
        errorMessage: raw.modal?.errorMessage || 'No fue posible enviar los datos.',
        warningTitle: raw.modal?.warningTitle || 'Atención',
        warningMessage: raw.modal?.warningMessage || 'Revise los campos marcados.',
      },
      confirm: {
        enabled: !!raw.confirm?.enabled,
        title: raw.confirm?.title || 'Confirmar envío',
        message: raw.confirm?.message || '¿Está seguro de que desea enviar los datos?',
        okText: raw.confirm?.okText || 'Aceptar',
        cancelText: raw.confirm?.cancelText || 'Cancelar',
      },
      autocompleteUrl: raw.autocompleteUrl,
      autocompleteMinChars: Number(raw.autocompleteMinChars) || 2,
      load: {
        url: raw.load.url,
        method: raw.load.method,
        requestJson: raw.load.requestJson,
        responseJson: raw.load.responseJson,
      },
      submit: {
        url: raw.submit.url,
        method: raw.submit.method,
        requestJson: raw.submit.requestJson,
        responseJson: raw.submit.responseJson,
      },
      sections: (raw.sections || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        columns: Number(s.columns) || 1,
        visibleWhen: s.visibleWhen || '',
        fields: (s.fields || []).map((f: any) => ({
          id: f.id,
          label: f.label,
          type: f.type,
          placeholder: f.placeholder,
          required: !!f.required,
          readonly: !!f.readonly,
          defaultValue: f.defaultValue,
          helpText: f.helpText,
          optionsFromUrl: !!f.optionsFromUrl,
          optionsUrl: f.optionsUrl,
          optionsValueField: f.optionsValueField,
          optionsLabelField: f.optionsLabelField,
          autocomplete: !!f.autocomplete,
          autocompleteUrl: f.autocompleteUrl,
          loadField: f.loadField || f.id || '',
          submitField: f.submitField || f.id || '',
          requiredMessage: f.requiredMessage || '',
          visibleWhen: f.visibleWhen || '',
          options: (f.options || []).map((o: any) => ({ value: o.value, label: o.label })),
        })),
      })),
      buttons: (raw.buttons || []).map((b: any) => ({
        id: b.id,
        label: b.label,
        action: b.action,
        url: b.url,
        style: b.style,
        targetBlank: !!b.targetBlank,
      })),
    };
  }
}