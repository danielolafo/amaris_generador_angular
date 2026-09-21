# PageBuilder — Asistente visual de páginas Angular

Webapp (Angular) que permite **diseñar páginas y generar su código como un componente Angular**
(formularios con secciones, distribución de elementos, conexión a una API de carga/consulta, URLs
de selectBox, autocompletado y botones de navegación/limpieza). También produce una **versión
HTML clásica autocontenida** equivalente.

## Características

- **Menú de elementos**: añada campos de todo tipo (texto, correo, número, fecha, teléfono, URL,
  área de texto, SelectBox, casilla, radio, contraseña, hora).
- **Secciones dentro de la página**: cada sección tiene título, descripción y su propia
  **distribución** (1 a 6 columnas). A nivel de página puede elegir distribución vertical,
  dos columnas o cuadrícula.
- **URL principal para cargar datos**: al abrir la página generada se pide esta URL (GET/POST/PUT)
  y se rellenan los campos con la respuesta. Incluye edición del **JSON de request y de respuesta**,
  con placeholders `{{campo}}` y botón **“Probar URL”**.
- **URL de envío de datos**: igual que la anterior (método + JSON de request/respuesta).
- **URL para poblar los SelectBox**: por campo, proporcione la URL de opciones y las claves de
  valor/texto.
- **URL para los botones**: botones de envío, limpieza de formulario y navegación (con URL destino
  y apertura en pestaña nueva o no).
- **Autocompletado opcional**: URL global o por campo; la página consulta `?q=texto&field=id` y
  muestra sugerencias.
- **Mapeo de campos a JSON**: cada campo define (a) la clave que lee al **cargar** datos
  (loadField) y (b) la clave con la que se **envía** al JSON de request (submitField); las
  plantillas `{{clave}}` usan el mapeo de envío.
- **Mensaje de error por campo**: campo requerido con mensaje propio; al intentar enviar con
  obligatorios vacíos se muestran los mensajes y un **modal de advertencia**.
- **Modal de resultados** (tres tipos, configurable y activable/desactivable): confirmación de
  **éxito**, de **error** y de **advertencia** tras validar/enviar.
- **CSS personalizado opcional**: pegue la URL de una hoja de estilos; se añade como
  `<link>` en la página generada (HTML clásico) o se inyecta en `ngOnInit` (componente Angular).
- **Vista previa en vivo**, **HTML generado** (copiar/descargar) e **importar/exportar** la
  configuración en JSON. Configuración persistente en `localStorage`.

## Ejecutar

```bash
npm install          # primera vez
npm start            # servidor de desarrollo -> http://localhost:4200
```

## Compilar para desplegar

```bash
npm run build        # genera dist/page-builder/browser
```

Despliegue el contenido de `dist/page-builder/browser` en cualquier servidor estático
(Apache, Nginx, GitHub Pages, IIS, S3…). No requiere backend: es una SPA estática.

## La salida generada

El asistente genera el boceto **como una página Angular**: un componente `standalone`
(HTML + CSS + TypeScript) listo para integrar en su proyecto, más una versión clásica
autocontenida.

### Componente Angular (salida principal)

En la pestaña **Código generado** encontrará tres archivos (pestañas `component.ts`,
`component.html`, `component.css`) o la variante **Archivo único (.ts)**, que incrusta el
template y los estilos en el propio TypeScript:

```
formulario-de-registro.component.ts     (lógica: ngOnInit, envío, autocompletado, selectBox)
formulario-de-registro.component.html   (template con [(ngModel)], *ngFor, secciones y botones)
formulario-de-registro.component.css    (diseño con variables CSS, temas claro/oscuro)
```

Para usarlo, guarde los archivos en `src/app/pages/formulario-de-registro/` y declárelo:

```ts
// app.routes.ts
{ path: 'registro', loadComponent: () =>
  import('./pages/formulario-de-registro/formulario-de-registro.component').then(m => m.FormularioDeRegistroComponent)
}
```

El componente:
- Se conecta en `ngOnInit` a la **URL de carga** (request interpolado con `{{campo}}`) y a la
  **URL de los selectBox** (rellena las opciones con un `*ngFor`). Los campos se rellenan según su
  **loadField** (`mapResponse`).
- Envía por la **URL de envío** el request JSON interpolado (GET/POST/PUT) usando el **submitField**
  de cada campo (`collect`) y muestra un **modal de éxito/error/advertencia** o el mensaje
  configurado.
- Valida los campos requeridos con su **mensaje de error propio** (`errores` + `validarCampos`) y
  muestra un **modal de advertencia** cuando faltan obligatorios.
- Hace **autocompletado** por campo o global con debounce de 250 ms (`buscar`, `acKey`, `elegir`),
  con navegación por teclado.
- Ofrece **limpiar** y **navegación** según los botones configurados.
- Mantiene todo en el formulario con `[(ngModel)]` y usa `fetch` directamente (sin HttpClient).
- Si se configura una **URL de CSS personalizado**, la inyecta como `<link>` en `document.head`.

> **Descargar el componente**: el botón de la cabecera y el de **Descargar 3 archivos** descargan
> el `.ts`, `.html` y `.css` del componente **por separado** (predeterminado). Existe el checkbox
> **Archivo único (.ts)** para juntar template y estilos en un solo TypeScript.

### HTML simple (clásico)

El botón **HTML simple** descarga el archivo `.html` **autocontenido** (CSS y JavaScript
integrados, sin dependencias). Es el que alimenta la **Vista previa**; la lógica es equivalente a
la del componente Angular y expone `window.PB_PAGE_API` (`getValues`, `setValues`, `submit`,
`clean`, `reload`, `populateSelects`, `showModal`, `closeModal`, `notify`).

Vea los ejemplos generados en `ejemplo-componente-angular/` (componente) y
`ejemplo-pagina-generada.html` (versión clásica).

## Estructura

```
src/app/
  models.ts                        tipos del modelo (secciones, campos, endpoints, botones)
  services/
    config.service.ts              estado, persistencia e importar/exportar JSON
    html-generator.service.ts      genera el HTML clásico autocontenido (vista previa)
    angular-generator.service.ts   genera el componente Angular (ts/html/css y archivo único)
  components/
    builder/                       pantalla principal: menú, secciones, URLs y botones
    field-editor/                  editor de un campo (opciones, URL select, autocompletado)
    endpoint-editor/               editor de URL + JSON de request/respuesta + “Probar URL”
    preview/                       vista previa en vivo (iframe)
    codeview/                      código Angular generado (por archivo y archivo único)
```

## Requisitos

Node.js ≥ 20.19. Se usa Angular 21 con la nueva API de señales (zoneless).