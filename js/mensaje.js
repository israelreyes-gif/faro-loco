import { api } from './api.js';
import { mostrarToast } from './toast.js';

const TEXTO_MAX_LENGTH = 500;
let categoriaActual = 'historia';
let temporizador = null;

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

  try {
    clearInterval(temporizador);
    await api.enviarMensaje({ categoria: categoriaActual, texto });
    mostrarToast('success', '¡Encendido!', 'Tu mensaje ya vuela hacia todo el mundo.');
    document.dispatchEvent(new CustomEvent('faro:mensaje-enviado'));
  } catch (err) {
    mostrarToast('error', 'No se pudo enviar', err.message || 'Prueba otra vez en unos segundos.');
  }
}

export function pintarMensajeDifundido(mensaje) {
  document.getElementById('msg-cat').textContent = mensaje.categoria.toUpperCase();
  document.getElementById('msg-text').textContent = mensaje.texto;
}
