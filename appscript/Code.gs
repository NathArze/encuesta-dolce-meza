/**
 * Dolce Meza · API de opiniones
 * ---------------------------------------------------------------------------
 * Uso:
 *  1. Crea un Google Sheet nuevo.
 *  2. Menú Extensiones > Apps Script > pega este código > Guardar.
 *  3. Ejecuta la función `prepararHoja()` una vez y acepta los permisos.
 *  4. Menú Publicar > Nueva implementación > tipo "Aplicación web".
 *     - Ejecutar como: "Yo"
 *     - Quién puede acceder: "Cualquier persona"
 *  5. Copia la URL /exec y pégala en CONFIG.API_URL dentro de js/app.js
 */

var CONFIG = {
  NOMBRE_HOJA: 'Respuestas',
  ENCABEZADOS: [
    'Fecha y hora de respuesta',
    'Nombre',
    'Fecha de visita',
    'Qué compraste',
    'Cómo conoció Dolce Meza',
    'Calificación',
    'Comentarios'
  ],
  MAX_NOMBRE: 80,
  MAX_COMENTARIOS: 600,
  MAX_PRODUCTOS: 6
};

var PRODUCTOS_VALIDOS = ['Pastel', 'Cupcakes', 'Galletas', 'Postres', 'Otro'];
var CONOCIMIENTO_VALIDOS = [
  'Instagram', 'Facebook', 'Google', 'Recomendación', 'Ya soy cliente', 'Otro'
];

/* --------------------------------------------------------------------------
   Entrada
   -------------------------------------------------------------------------- */

function doGet(e) {
  return json({
    ok: true,
    servicio: 'Dolce Meza · API de opiniones',
    hoja: CONFIG.NOMBRE_HOJA,
    filas: contarFilas(),
    fecha: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')
  });
}

function doPost(e) {
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(20000);
  } catch (error) {
    return json({ ok: false, error: 'El servidor está ocupado. Intenta de nuevo en un momento.' });
  }

  try {
    var datos = leerDatos(e);
    if (datos.error) return json({ ok: false, error: datos.error });

    var revisados = validar(datos.datos);
    if (revisados.error) return json({ ok: false, error: revisados.error });

    var hoja = obtenerHoja();
    var fila = [
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss'),
      revisados.datos.nombre,
      revisados.datos.fechaVisita,
      revisados.datos.producto,
      revisados.datos.conocimiento,
      revisados.datos.calificacion,
      revisados.datos.comentarios
    ];

    hoja.appendRow(fila);
    hoja.getRange(hoja.getLastRow(), 1).setNumberFormat('dd/mm/yyyy hh:mm:ss');

    return json({ ok: true, mensaje: '¡Gracias por tu opinión!' });
  } catch (error) {
    return json({ ok: false, error: 'Ocurrió un error al guardar. Intenta de nuevo.' });
  } finally {
    lock.releaseLock();
  }
}

function doOptions() {
  return json({ ok: true });
}

/* --------------------------------------------------------------------------
   Lectura y normalización de la petición
   -------------------------------------------------------------------------- */

function leerDatos(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return { error: 'No se recibieron datos.' };
  }

  var crudo = e.postData.contents;

  try {
    var datos = JSON.parse(crudo);
    return { datos: datos || {} };
  } catch (error) {
    var salida = {};
    crudo.split('&').forEach(function (par) {
      if (!par) return;
      var partes = par.split('=');
      salida[decodeURIComponent(partes[0]).replace(/\+/g, ' ')] =
        decodeURIComponent((partes[1] || '').replace(/\+/g, ' '));
    });
    return { datos: salida };
  }
}

/* --------------------------------------------------------------------------
   Validación en el servidor
   -------------------------------------------------------------------------- */

function validar(datos) {
  var fechaVisita = limpiar(datos.fechaVisita, 10);
  var calificacion = parseInt(datos.calificacion, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaVisita)) {
    return { error: 'La fecha de visita no es válida.' };
  }

  if (!esFechaReal(fechaVisita)) {
    return { error: 'La fecha de visita no es válida.' };
  }

  if (!esNumero(calificacion) || calificacion < 1 || calificacion > 5) {
    return { error: 'La calificación debe ser de 1 a 5 estrellas.' };
  }

  var productos = limpiar(datos.producto, 200)
    .split(',')
    .map(function (p) { return p.trim(); })
    .filter(String);

  if (!productos.length) {
    return { error: 'Falta indicar qué compraste.' };
  }

  if (productos.length > CONFIG.MAX_PRODUCTOS) {
    return { error: 'Demasiadas opciones de producto.' };
  }

  for (var i = 0; i < productos.length; i++) {
    if (PRODUCTOS_VALIDOS.indexOf(productos[i]) === -1) {
      return { error: 'Opción de producto no válida: ' + productos[i] };
    }
  }

  var conocimiento = limpiar(datos.conocimiento, 40);
  if (CONOCIMIENTO_VALIDOS.indexOf(conocimiento) === -1) {
    return { error: 'Falta indicar cómo conociste Dolce Meza.' };
  }

  var nombre = limpiar(datos.nombre, CONFIG.MAX_NOMBRE + 20);
  if (nombre.length > CONFIG.MAX_NOMBRE) nombre = nombre.substring(0, CONFIG.MAX_NOMBRE);

  var comentarios = limpiar(datos.comentarios, CONFIG.MAX_COMENTARIOS + 100);
  if (comentarios.length > CONFIG.MAX_COMENTARIOS) {
    comentarios = comentarios.substring(0, CONFIG.MAX_COMENTARIOS);
  }

  comentarios = comentarios.replace(/\r?\n/g, ' ');

  return {
    datos: {
      nombre: nombre,
      fechaVisita: fechaVisita,
      producto: productos.join(', '),
      conocimiento: conocimiento,
      calificacion: calificacion,
      comentarios: comentarios
    }
  };
}

function esFechaReal(iso) {
  var partes = iso.split('-');
  var fecha = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  return fecha.getFullYear() === Number(partes[0]) &&
         fecha.getMonth() === Number(partes[1]) - 1 &&
         fecha.getDate() === Number(partes[2]);
}

function esNumero(n) {
  return typeof n === 'number' && isFinite(n);
}

function limpiar(valor, maximo) {
  var texto = valor === undefined || valor === null ? '' : String(valor);
  texto = texto.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  texto = texto.replace(/[<>]/g, '');
  return texto.trim().substring(0, maximo);
}

/* --------------------------------------------------------------------------
   Hoja de cálculo
   -------------------------------------------------------------------------- */

function obtenerHoja() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No hay una hoja activa.');

  var hoja = ss.getSheetByName(CONFIG.NOMBRE_HOJA);
  if (!hoja) {
    hoja = ss.insertSheet(CONFIG.NOMBRE_HOJA);
    inicializar(hoja);
  }
  return hoja;
}

function inicializar(hoja) {
  hoja.getRange(1, 1, 1, CONFIG.ENCABEZADOS.length).setValues([CONFIG.ENCABEZADOS]);
  hoja.getRange(1, 1, 1, CONFIG.ENCABEZADOS.length)
    .setFontWeight('bold')
    .setBackground('#A7144B')
    .setFontColor('#FFFFFF');

  hoja.setFrozenRows(1);
  hoja.setColumnWidth(1, 165);
  hoja.setColumnWidth(2, 150);
  hoja.setColumnWidth(3, 110);
  hoja.setColumnWidth(4, 170);
  hoja.setColumnWidth(5, 190);
  hoja.setColumnWidth(6, 95);
  hoja.setColumnWidth(7, 420);
  hoja.getRange('A:G').setVerticalAlignment('middle');
  hoja.getRange('G:G').setWrap(true);
  hoja.getRange('A:A').setNumberFormat('dd/mm/yyyy hh:mm:ss');
  hoja.getRange('C:C').setNumberFormat('dd/mm/yyyy');
  hoja.getRange('F:F').setHorizontalAlignment('center');
}

function contarFilas() {
  try {
    var hoja = obtenerHoja();
    return Math.max(0, hoja.getLastRow() - 1);
  } catch (error) {
    return 0;
  }
}

/* --------------------------------------------------------------------------
   Utilidades
   -------------------------------------------------------------------------- */

function json(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Ejecuta esta función una sola vez para crear la hoja y los encabezados.
 * Después puedes inspeccionar la hoja desde el menú Ver > Registros de ejecución.
 */
function prepararHoja() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Abre primero el Google Sheet desde este proyecto.');

  var hoja = ss.getSheetByName(CONFIG.NOMBRE_HOJA);
  if (hoja && hoja.getLastRow() > 0) {
    Logger.log('La hoja "' + CONFIG.NOMBRE_HOJA + '" ya existe. No se modificó.');
    return;
  }

  if (!hoja) hoja = ss.insertSheet(CONFIG.NOMBRE_HOJA);
  inicializar(hoja);

  Logger.log('Hoja "' + CONFIG.NOMBRE_HOJA + '" lista con los encabezados.');
}