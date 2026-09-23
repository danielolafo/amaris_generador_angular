export type FieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'password'
  | 'date'
  | 'time'
  | 'tel'
  | 'url'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'table';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type PageLayout = 'vertical' | 'twoColumns' | 'grid';

export type Theme = 'light' | 'dark';

export type ButtonAction = 'submit' | 'clean' | 'navigation';

export type ButtonStyle = 'primary' | 'secondary' | 'success' | 'danger';

export type SelectionMode = 'single' | 'multiple';

export type GetParamMode = 'fixed' | 'query';

export interface SelectOption {
  value: string;
  label: string;
}

export interface TableColumn {
  field: string;
  label: string;
  sortable: boolean;
  filterable: boolean;
}

export interface JsonEndpoint {
  url: string;
  method: HttpMethod;
  requestJson: string;
  responseJson: string;
  paramMode: GetParamMode;
  paramName: string;
  paramValue: string;
  headersJson: string;
}

export interface ConfirmConfig {
  enabled: boolean;
  title: string;
  message: string;
  okText: string;
  cancelText: string;
}

export interface Field {
  id: string;
  label: string;
  type: FieldType;
  placeholder: string;
  required: boolean;
  readonly: boolean;
  defaultValue: string;
  helpText: string;
  options: SelectOption[];
  multiple: boolean;
  optionsColumns: number;
  optionsFromUrl: boolean;
  tableUrl: string;
  tableColumns: TableColumn[];
  tableSelectable: boolean;
  tableSelectionMode: SelectionMode;
  tablePageSize: number;
  optionsUrl: string;
  optionsValueField: string;
  optionsLabelField: string;
  autocomplete: boolean;
  autocompleteUrl: string;
  loadField: string;
  submitField: string;
  requiredMessage: string;
  visibleWhen: string;
}

export interface Section {
  id: string;
  title: string;
  description: string;
  columns: number;
  fields: Field[];
  visibleWhen: string;
  paso: number;
}

export interface PageButton {
  id: string;
  label: string;
  action: ButtonAction;
  url: string;
  style: ButtonStyle;
  targetBlank: boolean;
}

export interface ModalConfig {
  enabled: boolean;
  successTitle: string;
  successMessage: string;
  errorTitle: string;
  errorMessage: string;
  warningTitle: string;
  warningMessage: string;
}

export interface PageConfig {
  pageTitle: string;
  layout: PageLayout;
  defaultColumns: number;
  theme: Theme;
  multiStep: boolean;
  includeFooter: boolean;
  footerText: string;
  load: JsonEndpoint;
  submit: JsonEndpoint;
  autocompleteUrl: string;
  autocompleteMinChars: number;
  messageSuccess: string;
  messageError: string;
  customCssUrl: string;
  modal: ModalConfig;
  confirm: ConfirmConfig;
  sections: Section[];
  buttons: PageButton[];
}

export const FIELD_TYPES: { value: FieldType; label: string; icon: string }[] = [
  { value: 'text', label: 'Texto', icon: 'Aa' },
  { value: 'email', label: 'Correo', icon: '@' },
  { value: 'number', label: 'Número', icon: '#1' },
  { value: 'password', label: 'Contraseña', icon: '••' },
  { value: 'date', label: 'Fecha', icon: '📅' },
  { value: 'time', label: 'Hora', icon: '🕒' },
  { value: 'tel', label: 'Teléfono', icon: '☎' },
  { value: 'url', label: 'URL', icon: '🔗' },
  { value: 'textarea', label: 'Área de texto', icon: '¶' },
  { value: 'select', label: 'SelectBox', icon: '▾' },
  { value: 'checkbox', label: 'Casilla', icon: '☑' },
  { value: 'radio', label: 'Radio', icon: '◉' },
  { value: 'table', label: 'Tabla de datos', icon: '▦' },
];

export const LAYOUT_OPTIONS: { value: PageLayout; label: string; hint: string }[] = [
  { value: 'vertical', label: 'Vertical', hint: 'Una columna' },
  { value: 'twoColumns', label: 'Dos columnas', hint: 'Elementos en pares' },
  { value: 'grid', label: 'Cuadrícula', hint: 'N columnas' },
];

export const BUTTON_ACTIONS: { value: ButtonAction; label: string }[] = [
  { value: 'submit', label: 'Enviar formulario' },
  { value: 'clean', label: 'Limpiar formulario' },
  { value: 'navigation', label: 'Navegación' },
];

export const BUTTON_STYLES: { value: ButtonStyle; label: string }[] = [
  { value: 'primary', label: 'Principal' },
  { value: 'secondary', label: 'Secundario' },
  { value: 'success', label: 'Éxito' },
  { value: 'danger', label: 'Peligro' },
];

let UID_COUNTER = 0;

export function uid(prefix = 'id'): string {
  UID_COUNTER += 1;
  return `${prefix}_${Date.now().toString(36)}${UID_COUNTER.toString(36)}`;
}

export function defaultEndpoint(): JsonEndpoint {
  return { url: '', method: 'GET', requestJson: '', responseJson: '', paramMode: 'fixed', paramName: '', paramValue: '', headersJson: '' };
}

export function defaultModal(): ModalConfig {
  return {
    enabled: true,
    successTitle: 'Carga exitosa',
    successMessage: 'Los datos se enviaron correctamente.',
    errorTitle: 'Ocurrió un error',
    errorMessage: 'No fue posible enviar los datos. Inténtelo de nuevo.',
    warningTitle: 'Atención',
    warningMessage: 'Revise los campos marcados y vuelva a intentarlo.',
  };
}

export function defaultConfirm(): ConfirmConfig {
  return {
    enabled: false,
    title: 'Confirmar envío',
    message: '¿Está seguro de que desea enviar los datos?',
    okText: 'Aceptar',
    cancelText: 'Cancelar',
  };
}

export function defaultConfig(): PageConfig {
  const firstName: Field = {
    id: 'nombre',
    label: 'Nombre',
    type: 'text',
    placeholder: 'Escriba su nombre',
    required: true,
    readonly: false,
    defaultValue: '',
    helpText: '',
    options: [],
    multiple: false,
    optionsColumns: 1,
    optionsFromUrl: false,
    tableUrl: '',
    tableColumns: [],
    tableSelectable: false,
    tableSelectionMode: 'multiple',
    tablePageSize: 10,
    optionsUrl: '',
    optionsValueField: 'value',
    optionsLabelField: 'label',
    autocomplete: false,
    autocompleteUrl: '',
    loadField: 'nombre',
    submitField: 'nombre',
    requiredMessage: '',
    visibleWhen: '',
  };
  const city: Field = {
    id: 'ciudad',
    label: 'Ciudad',
    type: 'select',
    placeholder: 'Seleccione una ciudad',
    required: true,
    readonly: false,
    defaultValue: '',
    helpText: '',
    options: [
      { value: 'bogota', label: 'Bogotá' },
      { value: 'medellin', label: 'Medellín' },
      { value: 'cali', label: 'Cali' },
    ],
    multiple: false,
    optionsColumns: 1,
    optionsFromUrl: false,
    tableUrl: '',
    tableColumns: [],
    tableSelectable: false,
    tableSelectionMode: 'multiple',
    tablePageSize: 10,
    optionsUrl: 'https://example.com/api/ciudades',
    optionsValueField: 'codigo',
    optionsLabelField: 'nombre',
    autocomplete: false,
    autocompleteUrl: '',
    loadField: 'ciudad',
    submitField: 'ciudad',
    requiredMessage: '',
    visibleWhen: '',
  };
  const email: Field = {
    id: 'correo',
    label: 'Correo electrónico',
    type: 'email',
    placeholder: 'usuario@ejemplo.com',
    required: true,
    readonly: false,
    defaultValue: '',
    helpText: '',
    options: [],
    multiple: false,
    optionsColumns: 1,
    optionsFromUrl: false,
    tableUrl: '',
    tableColumns: [],
    tableSelectable: false,
    tableSelectionMode: 'multiple',
    tablePageSize: 10,
    optionsUrl: '',
    optionsValueField: 'value',
    optionsLabelField: 'label',
    autocomplete: false,
    autocompleteUrl: '',
    loadField: 'correo',
    submitField: 'correo',
    requiredMessage: '',
    visibleWhen: '',
  };
  const notes: Field = {
    id: 'observaciones',
    label: 'Observaciones',
    type: 'textarea',
    placeholder: 'Escriba comentarios',
    required: false,
    readonly: false,
    defaultValue: '',
    helpText: '',
    options: [],
    multiple: false,
    optionsColumns: 1,
    optionsFromUrl: false,
    tableUrl: '',
    tableColumns: [],
    tableSelectable: false,
    tableSelectionMode: 'multiple',
    tablePageSize: 10,
    optionsUrl: '',
    optionsValueField: 'value',
    optionsLabelField: 'label',
    autocomplete: false,
    autocompleteUrl: '',
    loadField: 'observaciones',
    submitField: 'observaciones',
    requiredMessage: '',
    visibleWhen: '',
  };
  const status: Field = {
    id: 'estado',
    label: 'Estado',
    type: 'radio',
    placeholder: '',
    required: false,
    readonly: false,
    defaultValue: 'activo',
    helpText: '',
    options: [
      { value: 'activo', label: 'Activo' },
      { value: 'inactivo', label: 'Inactivo' },
    ],
    multiple: false,
    optionsColumns: 1,
    optionsFromUrl: false,
    tableUrl: '',
    tableColumns: [],
    tableSelectable: false,
    tableSelectionMode: 'multiple',
    tablePageSize: 10,
    optionsUrl: '',
    optionsValueField: 'value',
    optionsLabelField: 'label',
    autocomplete: false,
    autocompleteUrl: '',
    loadField: 'estado',
    submitField: 'estado',
    requiredMessage: '',
    visibleWhen: '',
  };

  return {
    pageTitle: 'Formulario de registro',
    layout: 'twoColumns',
    defaultColumns: 3,
    theme: 'light',
    multiStep: false,
    includeFooter: true,
    footerText: 'Generado con PageBuilder',
    load: {
      url: 'https://example.com/api/registro/1',
      method: 'GET',
      requestJson: '',
      responseJson: JSON.stringify(
        {
          nombre: 'Ana',
          correo: 'ana@ejemplo.com',
          ciudad: 'medellin',
          observaciones: 'Cliente desde 2023',
          estado: 'activo',
        },
        null,
        2,
      ),
      paramMode: 'fixed',
      paramName: '',
      paramValue: '',
      headersJson: '',
    },
    submit: {
      url: 'https://example.com/api/registro',
      method: 'POST',
      requestJson: JSON.stringify(
        {
          nombre: '{{nombre}}',
          correo: '{{correo}}',
          ciudad: '{{ciudad}}',
          observaciones: '{{observaciones}}',
          estado: '{{estado}}',
        },
        null,
        2,
      ),
      responseJson: JSON.stringify(
        { success: true, message: 'Registro guardado correctamente', id: 'R-1234' },
        null,
        2,
      ),
      paramMode: 'fixed',
      paramName: '',
      paramValue: '',
      headersJson: '',
    },
    autocompleteUrl: 'https://example.com/api/buscar',
    autocompleteMinChars: 2,
    messageSuccess: 'Datos enviados correctamente.',
    messageError: 'Ocurrió un error al enviar los datos.',
    customCssUrl: '',
    modal: defaultModal(),
    confirm: defaultConfirm(),
    sections: [
      {
        id: uid('sec'),
        title: 'Datos personales',
        description: '',
        columns: 2,
        visibleWhen: '',
        paso: 0,
        fields: [firstName, city, email, notes, status],
      },
    ],
    buttons: [
      { id: uid('btn'), label: 'Enviar', action: 'submit', url: '', style: 'primary', targetBlank: false },
      { id: uid('btn'), label: 'Limpiar', action: 'clean', url: '', style: 'secondary', targetBlank: false },
    ],
  };
}