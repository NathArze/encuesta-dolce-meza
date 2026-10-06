# Dolce Meza · Encuesta de experiencia

Web app móvil (HTML5 + CSS3 + JavaScript) para que los clientes califiquen su visita
y depois dejen una reseña en Google Maps. Las respuestas se guardan en **Google Sheets**
mediante **Google Apps Script** como API. No hay backend propio.

**Sitio publicado:** https://natharze.github.io/encuesta-dolce-meza/
Esa es la URL que debe codificar el código QR.

```
encuesta-dolce-meza/
├── index.html            App: bienvenida → formulario → agradecimiento
├── css/estilos.css       Diseño (crema, rosa suave, café, blanco)
├── js/app.js             Validación, envío y configuración
├── qr.html               Utilidad para generar e imprimir el código QR
└── appscript/Code.gs     API que escribe en Google Sheets
```

## 1. Configurar el almacenamiento (Google Sheets + Apps Script)

1. Crea un **Google Sheet** nuevo (por ejemplo `Opiniones Dolce Meza`).
2. Menú **Extensiones → Apps Script**.
3. Borra el contenido y pega el código de `appscript/Code.gs`.
4. **Guardar** y luego ejecuta la función `prepararHoja()` (selecciona la función en el
   desplegable superior y pulsa *Ejecutar*). Acepta los permisos: crea la pestaña
   `Respuestas` con sus encabezados.
5. Menú **Publicar → Nueva implementación**:
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Quién puede acceder: **Cualquier persona**
6. Copia la URL que empieza con `https://script.google.com/macros/s/.../exec`.

> Importante: la implementación debe quedar en modo producción. Si más adelante editas
> `Code.gs`, crea una **nueva versión** (Publicar → Nueva versión) y vuelve a usar su URL `/exec`.

Comprobación rápida: abre la URL `/exec` en el navegador. Debe responder algo como
`{"ok":true, ...}` con el número de filas guardadas.

## 2. Conectar la app

Al inicio de `js/app.js` está la configuración:

```js
var CONFIG = {
  API_URL: '',                                  // ← pega aquí la URL /exec
  GOOGLE_MAPS_REVIEW_URL: 'https://g.page/rVWLuqAAAA'
};
```

- `API_URL`: la URL `/exec` del paso anterior.
- `GOOGLE_MAPS_REVIEW_URL`: el enlace de la ficha de Dolce Meza en Google Maps.
  Se obtiene desde Google Maps → tu negocio → **Compartir** → **Copiar enlace**
  (o desde el botón *Escribir una reseña*, que ya abre la pantalla de reseña).

Si `API_URL` queda vacío, la app sigue funcionando: guarda la opinión en el
dispositivo y la envía sola cuando haya conexión y la API esté configurada.

## 3. Publicar la web

La app es estática: sirve en GitHub Pages, Netlify, Cloudflare Pages, Vercel o
cualquier hosting. **Debe publicarse con `https://`** porque las cámaras de los
celulares no abren páginas `http://` (salvo excepciones).

Estructura publicada:

```
/            → index.html
/css/estilos.css
/js/app.js
```

(`qr.html` es solo una herramienta interna de Dolce Meza; no hace falta publicarla.)

## 4. Código QR

1. Abre `qr.html` (o `qr.html?url=https://tu-dominio.com`).
2. Pega la URL publicada de la app y pulsa **Generar QR**.
3. **Descargar imagen** para imprimirlo, o **Imprimir cartel** para un cartel con
   el logo y el nombre.

Coloca el QR en la caja, el mostrador, la mesa de pedidos y también en la carta
o redes sociales (los clientes que escriban desde casa también pueden opinar).

## 5. Cómo se guarda cada respuesta

| Columna en la hoja | Origen |
| --- | --- |
| Fecha y hora de respuesta | Fecha real del envío (servidor) |
| Nombre | Campo opcional del cliente |
| Fecha de visita | Campo del cliente |
| Qué compraste | Puede traer varios: `Pastel, Cupcakes` |
| Cómo conoció Dolce Meza | Una sola opción |
| Calificación | 1 a 5 estrellas |
| Comentarios | Texto libre (máx. 600 caracteres) |

La hoja queda con la fila 1 fija, encabezados en color Dolce Meza y anchos de
columna ya ajustados.

## Notas técnicas

- **Validación en dos capas**: en el celular (mensajes claros, enfoque al primer
  error) y en el servidor (`Code.gs` vuelve a comprobar fecha, productos,
  conocimiento y calificación antes de escribir).
- **Sin envíos duplicados**: al pulsar *Enviar opinión* el botón se bloquea y
  muestra *Enviando...*; si el servidor falla, el botón queda como *Reintentar*.
- **Sin internet**: la opinión se guarda en `localStorage` y se reenvía sola al
  volver la conexión (evento `online`).
- **Privacidad**: solo se pide nombre si el cliente quiere dejarlo; la IP no se
  guarda y no hay cookies ni seguimiento.
- **Privacidad del Sheet**: el enlace de la API `/exec` es público para poder
  escribir desde la web; no expone datos del Sheet a quien no tenga el archivo.
- Diseño mobile-first, funciona en Android e iPhone (Safari included), con
  `theme-color`, ícono, `env(safe-area-inset-bottom)` y respeto a
  `prefers-reduced-motion`.