import { api } from './api.js';
import { mostrarToast } from './toast.js';

const TEXTO_MAX_LENGTH = 500;
const FOTO_MAX_DIMENSION = 1280; // px, en el lado más largo
const FOTO_MAX_BYTES = 900 * 1024; // tras comprimir, antes de pasar a base64

let categoriaActual = 'historia';
let temporizador = null;
let fotoSeleccionada = null; // { base64, mime } o null

export function initEscritura() {
  document.querySelectorAll('.cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      categoriaActual = pill.dataset.cat;
    });
  });

  const textarea = document.getElementById('write-text');
  textarea.addEventListener('input', actualizarContador);
  actualizarContador();

  initSelectorFoto();

  document.getElementById('write-submit').addEventListener('click', enviarMensaje);
}

function actualizarContador() {
  const textarea = document.getElementById('write-text');
  const contador = document.getElementById('write-char-counter');
  const longitud = textarea.value.length;

  contador.textContent = `${longitud} / ${TEXTO_MAX_LENGTH}`;
  contador.classList.remove('cerca-limite', 'en-limite');

  if (longitud >= TEXTO_MAX_LENGTH) {
    contador.classList.add('en-limite');
  } else if (longitud >= TEXTO_MAX_LENGTH - 50) {
    contador.classList.add('cerca-limite');
  }
}

// ---------------------------------------------------------------
// Foto opcional: se comprime en el propio móvil antes de enviarla,
// para que nunca ocupe demasiado espacio en el servidor.
// ---------------------------------------------------------------
function initSelectorFoto() {
  const btn = document.getElementById('write-photo-btn');
  const input = document.getElementById('write-photo-input');
  const preview = document.getElementById('write-photo-preview');
  const previewImg = document.getElementById('write-photo-preview-img');
  const removeBtn = document.getElementById('write-photo-remove');

  btn.addEventListener('click', () => input.click());

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;

    try {
      const { base64, mime } = await comprimirImagen(file);
      fotoSeleccionada = { base64, mime };
      previewImg.src = `data:${mime};base64,${base64}`;
      preview.style.display = 'flex';
      btn.style.display = 'none';
    } catch {
      mostrarToast('error', 'Esa foto no ha colado', 'Prueba con otra imagen.');
    } finally {
      input.value = '';
    }
  });

  removeBtn.addEventListener('click', () => {
    fotoSeleccionada = null;
    preview.style.display = 'none';
    btn.style.display = 'block';
  });
}

function comprimirImagen(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > FOTO_MAX_DIMENSION) {
          height = Math.round(height * (FOTO_MAX_DIMENSION / width));
          width = FOTO_MAX_DIMENSION;
        } else if (height > FOTO_MAX_DIMENSION) {
          width = Math.round(width * (FOTO_MAX_DIMENSION / height));
          height = FOTO_MAX_DIMENSION;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

        let calidad = 0.8;
        let dataUrl = canvas.toDataURL('image/jpeg', calidad);

        while (dataUrl.length > FOTO_MAX_BYTES * 1.37 && calidad > 0.35) {
          calidad -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', calidad);
        }

        resolve({ base64: dataUrl.split(',')[1], mime: 'image/jpeg' });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export function iniciarCuentaAtras(segundosRestantes, onExpirar) {
  clearInterval(temporizador);
  const fill = document.getElementById('write-progress-fill');
  const label = document.getElementById('write-progress-label');
  const segundosTotal = Math.max(segundosRestantes, 1);

  const tick = () => {
    if (segundosRestantes <= 0) {
      clearInterval(temporizador);
      onExpirar();
      return;
    }

    const porcentaje = Math.max(0, Math.min(100, (segundosRestantes / segundosTotal) * 100));
    fill.style.width = porcentaje + '%';
    label.textContent = textoRestante(segundosRestantes);

    segundosRestantes--;
  };

  tick();
  temporizador = setInterval(tick, 1000);
}

function textoRestante(segundos) {
  const minutos = Math.ceil(segundos / 60);
  if (minutos >= 60) return 'te queda 1 hora, no la desperdicies';
  if (minutos <= 1) return '¡corre, queda menos de 1 minuto!';
  return `te quedan ${minutos} minutitos`;
}

async function enviarMensaje() {
  const texto = document.getElementById('write-text').value.trim();

  if (!texto) {
    mostrarToast('error', 'Oye, escribe algo', 'No puedes encender el faro loco sin soltar nada.');
    return;
  }

  const payload = { categoria: categoriaActual, texto };
  if (fotoSeleccionada) {
    payload.foto = fotoSeleccionada.base64;
    payload.fotoMime = fotoSeleccionada.mime;
  }

  try {
    clearInterval(temporizador);
    await api.enviarMensaje(payload);
    mostrarToast('success', '¡Encendido!', 'Tu mensaje ya vuela hacia todo el mundo.');
    fotoSeleccionada = null;
    document.dispatchEvent(new CustomEvent('faro:mensaje-enviado'));
  } catch (err) {
    mostrarToast('error', 'No se pudo enviar', err.message || 'Prueba otra vez en unos segundos.');
  }
}

export function pintarMensajeDifundido(mensaje) {
  document.getElementById('msg-cat').textContent = mensaje.categoria.toUpperCase();
  document.getElementById('msg-text').textContent = mensaje.texto;

  const foto = document.getElementById('msg-photo');
  if (mensaje.foto) {
    foto.src = `data:${mensaje.fotoMime};base64,${mensaje.foto}`;
    foto.style.display = 'block';
  } else {
    foto.style.display = 'none';
    foto.removeAttribute('src');
  }
}
