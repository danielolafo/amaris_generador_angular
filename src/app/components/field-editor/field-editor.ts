import { Component, input, output, signal } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FIELD_TYPES } from '../../models';

@Component({
  selector: 'app-field-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './field-editor.html',
  styleUrl: './field-editor.css',
})
export class FieldEditor {
  readonly field = input.required<FormGroup>();
  readonly index = input.required<number>();

  readonly delete = output<void>();
  readonly duplicate = output<void>();
  readonly moveUp = output<void>();
  readonly moveDown = output<void>();
  readonly toggleReadonly = output<void>();

  readonly open = signal(true);
  readonly fieldTypes = FIELD_TYPES;

  f(): FormGroup {
    return this.field();
  }

  optionsArr(): FormArray {
    return this.f().get('options') as FormArray;
  }

  ctrl(name: string): FormControl {
    return this.f().get(name) as FormControl;
  }

  optCtrl(opt: AbstractControl, name: string): FormControl {
    return (opt as FormGroup).get(name) as FormControl;
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