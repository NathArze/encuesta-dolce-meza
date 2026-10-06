'use strict';

/* ============================================================
   Dolce Meza · Encuesta de experiencia
   Configuración: rellena estos dos valores antes de publicar.
   ============================================================ */

var CONFIG = {
  /* URL del web app de Google Apps Script (termina en /exec) */
  API_URL: '',
  /* Enlace de la ficha de Dolce Meza en Google Maps ( Places) */
  GOOGLE_MAPS_REVIEW_URL: 'https://g.page/rVWLuqAAAA'
};

var ETIQUETAS_ESTRELLA = {
  1: 'Lo lamentamos',
  2: 'Podemos mejorar',
  3: 'Aceptable',
  4: 'Nos encantó',
  5: '¡Excelente!'
};

var COLA_ALMACEN = 'dm_encuesta_pendientes';
var LIMITE_COMENTARIOS = 600;

/* ---------------- Elementos ---------------- */

var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };

var pantallaBienvenida = $('#pantallaBienvenida');
var pantallaFormulario = $('#pantallaFormulario');
var pantallaGracias = $('#pantallaGracias');

var formulario = $('#formulario');
var campoNombre = $('#nombre');
var campoFecha = $('#fechaVisita');
var campoComentarios = $('#comentarios');
var contadorComentarios = $('#contadorComentarios');
var grupoProducto = $('#grupoProducto');
var cajaOtro = $('#otroCaja');
var campoProductoOtro = $('#productoOtro');
var grupoConocimiento = $('#grupoConocimiento');
var grupoCalificacion = $('#grupoCalificacion');
var cajaEstrellas = $('#estrellas');
var textoCalificacion = $('#textoCalificacion');
var btnEnviar = $('#btnEnviar');
var envioNota = $('#envioNota');
var progresoBarra = $('#progresoBarra');
var progreso = $('#progreso');

/* ---------------- Estado ---------------- */

var estado = {
  productos: [],
  conocimiento: '',
  calificacion: 0,
  enviando: false,
  enviado: false
};

/* ---------------- Navegación ---------------- */

function mostrar(pantalla) {
  [pantallaBienvenida, pantallaFormulario, pantallaGracias].forEach(function (p) {
    p.hidden = p !== pantalla;
    p.classList.toggle('is-activa', p === pantalla);
  });
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function irAlFormulario() {
  estado.enviado = false;
  limpiarErrores();
  restaurarBoton();
  mostrar(pantallaFormulario);
  if (!campoFecha.value) campoFecha.value = hoyISO();
  actualizarProgreso();
  setTimeout(function () { campoNombre.focus({ preventScroll: true }); }, 320);
}

$('#btnComenzar').addEventListener('click', irAlFormulario);

$('#btnAtras').addEventListener('click', function () {
  if (estado.enviando) return;
  mostrar(pantallaBienvenida);
});

$('#btnOtraOpinion').addEventListener('click', function () {
  formulario.reset();
  estado.productos = [];
  estado.conocimiento = '';
  estado.calificacion = 0;
  estado.enviado = false;
  limpiarErrores();
  nota('', '');
  pintarChips();
  pintarEstrellas();
  contadorComentarios.textContent = '0';
  actualizarProgreso();
  irAlFormulario();
});

/* ---------------- Fecha ---------------- */

function hoyISO() {
  var d = new Date();
  return d.getFullYear() + '-' + dosDigitos(d.getMonth() + 1) + '-' + dosDigitos(d.getDate());
}

function dosDigitos(n) { return n < 10 ? '0' + n : String(n); }

function maxISO() {
  var d = new Date();
  d.setDate(d.getDate() + 1);
  return d.getFullYear() + '-' + dosDigitos(d.getMonth() + 1) + '-' + dosDigitos(d.getDate());
}

campoFecha.value = hoyISO();
campoFecha.max = maxISO();

/* ---------------- Estrellas ---------------- */

(function crearEstrellas() {
  var svg = '<svg viewBox="0 0 52 52" aria-hidden="true"><path d="M26 3.5l6.4 13 14.3 2.1-10.4 10.1 2.5 14.3L26 36.2 13.2 43l2.5-14.3L5.3 18.6l14.3-2.1z"/></svg>';
  for (var i = 1; i <= 5; i++) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'estrella';
    b.dataset.valor = String(i);
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', 'false');
    b.setAttribute('aria-label', i + ' de 5 estrellas');
    b.innerHTML = svg;
    cajaEstrellas.appendChild(b);
  }
})();

function botonesEstrella() {
  return cajaEstrellas.querySelectorAll('.estrella');
}

function pintarEstrellas() {
  var valor = parseInt(estado.calificacion, 10) || 0;
  Array.prototype.forEach.call(botonesEstrella(), function (btn, i) {
    var n = i + 1;
    var sel = n <= valor;
    btn.classList.toggle('sel', n === valor);
    btn.classList.toggle('volada', sel);
    btn.setAttribute('aria-checked', n === valor ? 'true' : 'false');
    btn.tabIndex = n === valor || (valor === 0 && n === 1) ? 0 : -1;
  });
}

function ponerEstrella(n) {
  estado.calificacion = n;
  pintarEstrellas();
  textoCalificacion.textContent = ETIQUETAS_ESTRELLA[n]
    ? ETIQUETAS_ESTRELLA[n] + ' · ' + n + ' de 5'
    : '';
  limpiarError(grupoCalificacion, '#errorCalificacion');
  actualizarProgreso();
}

cajaEstrellas.addEventListener('click', function (ev) {
  var btn = ev.target.closest('.estrella');
  if (btn) ponerEstrella(parseInt(btn.dataset.valor, 10));
});

cajaEstrellas.addEventListener('keydown', function (ev) {
  var teclas = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
  var salto = teclas[ev.key];
  if (!salto) return;
  ev.preventDefault();
  var actual = estado.calificacion || 1;
  var nuevo = Math.min(5, Math.max(1, actual + salto));
  ponerEstrella(nuevo);
  botonesEstrella()[nuevo - 1].focus();
});

cajaEstrellas.addEventListener('mouseover', function (ev) {
  var btn = ev.target.closest('.estrella');
  if (!btn || estado.calificacion) return;
  previewEstrellas(parseInt(btn.dataset.valor, 10));
});

cajaEstrellas.addEventListener('mouseleave', function () {
  if (!estado.calificacion) previewEstrellas(0);
});

function previewEstrellas(n) {
  Array.prototype.forEach.call(botonesEstrella(), function (btn, i) {
    btn.classList.toggle('volada', i < n);
  });
}

pintarEstrellas();

/* ---------------- Chips ---------------- */

function pintarChips() {
  Array.prototype.forEach.call($('#chipsProducto').children, function (chip) {
    var on = estado.productos.indexOf(chip.dataset.valor) > -1;
    chip.classList.toggle('activo', on);
    chip.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  cajaOtro.hidden = estado.productos.indexOf('Otro') === -1;
  Array.prototype.forEach.call($('#chipsConocimiento').children, function (chip) {
    var on = estado.conocimiento === chip.dataset.valor;
    chip.classList.toggle('activo', on);
    chip.setAttribute('aria-checked', on ? 'true' : 'false');
    chip.tabIndex = on || (!estado.conocimiento && chip === $('#chipsConocimiento').firstElementChild) ? 0 : -1;
  });
}

$('#chipsProducto').addEventListener('click', function (ev) {
  var chip = ev.target.closest('.chip');
  if (!chip) return;
  var valor = chip.dataset.valor;
  var i = estado.productos.indexOf(valor);
  if (i > -1) {
    estado.productos.splice(i, 1);
    if (valor === 'Otro') {
      campoProductoOtro.value = '';
      limpiarError(cajaOtro, '#errorProductoOtro');
    }
  } else {
    estado.productos.push(valor);
    if (valor === 'Otro') setTimeout(function () { campoProductoOtro.focus({ preventScroll: true }); }, 120);
  }
  pintarChips();
  limpiarError(grupoProducto, '#errorProducto');
  actualizarProgreso();
});

campoProductoOtro.addEventListener('input', function () {
  if (campoProductoOtro.value.trim()) limpiarError(cajaOtro, '#errorProductoOtro');
});

$('#chipsConocimiento').addEventListener('click', function (ev) {
  var chip = ev.target.closest('.chip');
  if (!chip) return;
  estado.conocimiento = chip.dataset.valor;
  pintarChips();
  limpiarError(grupoConocimiento, '#errorConocimiento');
  actualizarProgreso();
});

$('#chipsConocimiento').addEventListener('keydown', function (ev) {
  if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
  ev.preventDefault();
  var chips = Array.prototype.slice.call(this.children);
  var i = chips.indexOf(document.activeElement);
  var sig = chips[(i + (ev.key === 'ArrowRight' ? 1 : chips.length - 1)) % chips.length];
  sig.focus();
  sig.click();
});

pintarChips();

/* ---------------- Comentarios ---------------- */

campoComentarios.addEventListener('input', function () {
  contadorComentarios.textContent = String(campoComentarios.value.length);
});

campoComentarios.addEventListener('blur', function () {
  campoComentarios.value = campoComentarios.value.trim();
  contadorComentarios.textContent = String(campoComentarios.value.length);
  if (campoComentarios.value.length <= LIMITE_COMENTARIOS) {
    limpiarError(campoComentarios.closest('.campo'), '#errorComentarios');
  }
});

campoFecha.addEventListener('change', function () { limpiarError(campoFecha.closest('.campo'), '#errorFechaVisita'); });
campoNombre.addEventListener('input', function () { limpiarError(campoNombre.closest('.campo'), '#errorNombre'); });

/* ---------------- Progreso ---------------- */

function actualizarProgreso() {
  var listos = 0;
  if (campoFecha.value) listos++;
  if (estado.productos.length) listos++;
  if (estado.conocimiento) listos++;
  if (estado.calificacion) listos++;
  var pct = Math.round((listos / 4) * 100);
  progresoBarra.style.width = pct + '%';
  progreso.setAttribute('aria-valuenow', String(pct));
}

/* ---------------- Validación ---------------- */

function limpiarError(contenedor, idError) {
  var caja = $(idError);
  if (caja) caja.hidden = true;
  if (contenedor) contenedor.classList.remove('es-error');
}

function limpiarErrores() {
  Array.prototype.forEach.call(document.querySelectorAll('.error'), function (e) { e.hidden = true; });
  Array.prototype.forEach.call(document.querySelectorAll('.es-error'), function (e) { e.classList.remove('es-error'); });
}

function mostrarError(contenedor, idError, texto) {
  var caja = $(idError);
  caja.textContent = texto;
  caja.hidden = false;
  if (contenedor) contenedor.classList.add('es-error');
}

function validar() {
  limpiarErrores();
  var errores = [];

  if (campoNombre.value.length > 80) {
    mostrarError(campoNombre.closest('.campo'), '#errorNombre', 'El nombre es demasiado largo (máximo 80 caracteres).');
    errores.push(campoNombre);
  }

  if (!campoFecha.value) {
    mostrarError(campoFecha.closest('.campo'), '#errorFechaVisita', 'Por favor elige la fecha de tu visita.');
    errores.push(campoFecha);
  } else if (campoFecha.value > hoyISO()) {
    mostrarError(campoFecha.closest('.campo'), '#errorFechaVisita', 'La fecha de visita no puede ser futura.');
    errores.push(campoFecha);
  }

  if (!estado.productos.length) {
    mostrarError(grupoProducto, '#errorProducto', 'Selecciona al menos una opción de lo que compraste.');
    errores.push($('#chipsProducto').querySelector('.chip'));
  } else if (estado.productos.indexOf('Otro') > -1 && !campoProductoOtro.value.trim()) {
    mostrarError(cajaOtro, '#errorProductoOtro', 'Escribe qué otro producto compraste.');
    errores.push(campoProductoOtro);
  }

  if (!estado.conocimiento) {
    mostrarError(grupoConocimiento, '#errorConocimiento', 'Elige cómo conociste Dolce Meza.');
    errores.push($('#chipsConocimiento').querySelector('.chip'));
  }

  if (!estado.calificacion) {
    mostrarError(grupoCalificacion, '#errorCalificacion', 'Por favor califica tu experiencia con estrellas.');
    errores.push(cajaEstrellas.querySelector('.estrella'));
  }

  if (campoComentarios.value.length > LIMITE_COMENTARIOS) {
    mostrarError(campoComentarios.closest('.campo'), '#errorComentarios', 'Tus comentarios son demasiado largos.');
    errores.push(campoComentarios);
  }

  return errores;
}

/* ---------------- Envío ---------------- */

formulario.addEventListener('submit', function (ev) {
  ev.preventDefault();
  if (estado.enviando || estado.enviado) return;

  var errores = validar();
  if (errores.length) {
    var primero = errores[0];
    primero.focus({ preventScroll: true });
    primero.scrollIntoView({ behavior: 'smooth', block: 'center' });
    nota('Revisa los campos marcados, por favor.', 'error');
    return;
  }

  var datos = {
    nombre: campoNombre.value.trim(),
    fechaVisita: campoFecha.value,
    producto: estado.productos.join(', '),
    productoOtro: estado.productos.indexOf('Otro') > -1 ? campoProductoOtro.value.trim() : '',
    conocimiento: estado.conocimiento,
    calificacion: estado.calificacion,
    comentarios: campoComentarios.value.trim()
  };

  estado.enviando = true;
  btnEnviar.classList.add('enviando');
  btnEnviar.disabled = true;
  $('.btn__texto', btnEnviar).textContent = 'Enviando...';
  nota('Guardando tu opinión, un momento...', '');

  guardar(datos)
    .then(function (resultado) {
      estado.enviado = true;
      mostrarGracias(datos, resultado);
    })
    .catch(function (err) {
      restaurarBoton();
      $('.btn__texto', btnEnviar).textContent = 'Reintentar';
      nota(err.message || 'No pudimos guardar tu opinión.', 'error');
    });
});

function guardar(datos) {
  var api = (CONFIG.API_URL || '').trim();

  if (!api) {
    encolar(datos);
    return Promise.resolve({ encolado: true });
  }

  if (!navigator.onLine) {
    encolar(datos);
    return Promise.resolve({ encolado: true });
  }

  var control = new AbortController();
  var temporizador = setTimeout(function () { control.abort(); }, 15000);

  return fetch(api, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(datos),
    signal: control.signal
  })
    .then(function (r) {
      clearTimeout(temporizador);
      return r.text().then(function (texto) {
        var json = null;
        try { json = JSON.parse(texto); } catch (e) { json = null; }
        if (!r.ok) {
          throw new Error((json && json.error) || 'El servidor respondió con un error (' + r.status + '). Intenta de nuevo.');
        }
        if (json && json.ok === false) {
          throw new Error(json.error || 'No se pudo guardar la opinión. Intenta de nuevo.');
        }
        return json || { ok: true };
      });
    })
    .catch(function (err) {
      clearTimeout(temporizador);

      if (err && err.name === 'AbortError') {
        encolar(datos);
        return { encolado: true };
      }

      if (err instanceof TypeError) {
        encolar(datos);
        return { encolado: true };
      }

      throw err;
    });
}

/* ---------------- Cola local (sin internet / API caída) ---------------- */

function leerCola() {
  try {
    var raw = localStorage.getItem(COLA_ALMACEN);
    var lista = raw ? JSON.parse(raw) : [];
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return [];
  }
}

function encolar(datos) {
  var lista = leerCola();
  var registro = datos;
  registro.creado = new Date().toISOString();
  lista.push(registro);
  try {
    localStorage.setItem(COLA_ALMACEN, JSON.stringify(lista));
  } catch (e) { /* almacenamiento lleno o bloqueado */ }
}

function vaciarCola() {
  try { localStorage.removeItem(COLA_ALMACEN); } catch (e) {}
}

/* ---------------- Pantalla de agradecimiento ---------------- */

function mostrarGracias(datos, resultado) {
  estado.enviado = true;
  restaurarBoton();
  formulario.reset();
  estado.productos = [];
  estado.conocimiento = '';
  estado.calificacion = 0;
  pintarChips();
  pintarEstrellas();
  contadorComentarios.textContent = '0';
  actualizarProgreso();
  limpiarErrores();

  $('#verProducto').textContent = datos.producto.replace(/,\s*Otro$/, '') + (datos.productoOtro ? ' · Otro: ' + datos.productoOtro : '');
  $('#verCalificacion').textContent = new Array(datos.calificacion + 1).join('★') + new Array(6 - datos.calificacion).join('☆');
  $('#verFecha').textContent = formatearFecha(datos.fechaVisita);
  $('#resumenRespuesta').hidden = false;

  var enlace = $('#btnGoogle');
  if (CONFIG.GOOGLE_MAPS_REVIEW_URL) {
    enlace.href = CONFIG.GOOGLE_MAPS_REVIEW_URL;
    enlace.hidden = false;
  } else {
    enlace.href = 'https://www.google.com/maps/search/?api=1&query=Dolce%20Meza';
  }

  var nota = $('#graciasNota');
  if (resultado && resultado.encolado) {
    nota.textContent = 'Guardamos tu opinión en este dispositivo. Se enviará automáticamente cuando tengas conexión.';
    nota.hidden = false;
  } else {
    nota.hidden = true;
  }

  mostrar(pantallaGracias);
}

function formatearFecha(iso) {
  if (!iso) return '—';
  var partes = iso.split('-');
  if (partes.length !== 3) return iso;
  var meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var mes = meses[parseInt(partes[1], 10) - 1] || partes[1];
  return parseInt(partes[2], 10) + ' de ' + mes + ' de ' + partes[0];
}

/* ---------------- Nota de envío ---------------- */

function restaurarBoton() {
  estado.enviando = false;
  btnEnviar.classList.remove('enviando');
  btnEnviar.disabled = false;
  $('.btn__texto', btnEnviar).textContent = 'Enviar opinión';
}

function nota(texto, tipo) {
  envioNota.textContent = texto;
  envioNota.className = 'envio__nota' + (tipo ? ' ' + tipo + '-nota' : '');
}

/* ---------------- Reintento automático de la cola ---------------- */

function intentarVaciarCola() {
  var api = (CONFIG.API_URL || '').trim();
  if (!api || !navigator.onLine) return;
  var lista = leerCola();
  if (!lista.length) return;

  lista.reduce(function (promesa, registro) {
    return promesa.then(function () {
      return fetch(api, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(registro)
      }).then(function (r) { if (!r.ok) throw new Error('fallo'); });
    });
  }, Promise.resolve())
    .then(vaciarCola)
    .catch(function () {});
}

window.addEventListener('online', intentarVaciarCola);
window.addEventListener('load', function () { actualizarProgreso(); intentarVaciarCola(); });
actualizarProgreso();
intentarVaciarCola();