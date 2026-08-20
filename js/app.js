import { api, getToken, getSession, clearToken, clearSession } from './api.js';
import { initAuthForms } from './auth.js';
import { iniciarGiroVisual, mostrarResultado } from './dado.js';
import { initEscritura, iniciarCuentaAtras, pintarMensajeDifundido } from './mensaje.js';
import { registrarServiceWorker, pedirPermisoYSuscribir } from './push.js';

const SCREENS = [
  'landing', 'login', 'register', 'install',
  'apagado', 'dado', 'esperando', 'escribiendo', 'sinmensaje', 'mensaje'
];

const POLL_MS = 20000;
let pollTimer = null;
let faseAnterior = null;

export function go(nombre) {
  SCREENS.forEach(s => document.getElementById(`screen-${s}`)?.classList.remove('active'));
  document.getElementById(`screen-${nombre}`)?.classList.add('active');
  gestionarVideoIntro(nombre);
  animarTarjeta(nombre);
}

function animarTarjeta(nombre) {
  const screen = document.getElementById(`screen-${nombre}`);
  const card = screen?.querySelector('.card');
  if (!card) return;

  card.classList.remove('entrando');
  void card.offsetWidth; // fuerza el reflow para poder repetir la animación
  card.classList.add('entrando');
}

function gestionarVideoIntro(nombre) {
  const video = document.getElementById('intro-video');
  if (!video) return;

  if (nombre === 'install') {
    video.currentTime = 0;
    video.play().catch(() => {});
  } else {
    video.pause();
  }
}

function esModoPWA() {
  const iosStandalone = window.navigator.standalone === true;
  const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;
  return iosStandalone || displayModeStandalone;
}

function mostrarMenuSegunModo() {
  const menuPwa = document.getElementById('menu-pwa');
  const menuBrowser = document.getElementById('menu-browser');

  if (esModoPWA()) {
    menuPwa.style.display = 'flex';
    menuBrowser.style.display = 'none';
  } else {
    menuPwa.style.display = 'none';
    menuBrowser.style.display = 'flex';
  }
}

function cerrarSesion() {
  clearInterval(pollTimer);
  clearToken();
  clearSession();
  faseAnterior = null;
  go('landing');
}

function bindBackButtons() {
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.back === 'logout') cerrarSesion();
      else go(btn.dataset.back);
    });
  });
  document.getElementById('nav-login')?.addEventListener('click', () => go('login'));
  document.getElementById('nav-register')?.addEventListener('click', () => go('register'));
  document.getElementById('nav-install-browser')?.addEventListener('click', () => go('install'));
}

function bindInstallTabs() {
  document.getElementById('tab-ios')?.addEventListener('click', () => setInstallTab('ios'));
  document.getElementById('tab-android')?.addEventListener('click', () => setInstallTab('android'));
}

function bindSoundToggle() {
  const video = document.getElementById('intro-video');
  const btn = document.getElementById('sound-toggle');
  if (!video || !btn) return;

  btn.addEventListener('click', () => {
    video.muted = !video.muted;
    btn.textContent = video.muted ? '🔇' : '🔊';
    btn.title = video.muted ? 'Activar sonido' : 'Silenciar';
    if (!video.muted) video.play().catch(() => {});
  });
}

function setInstallTab(which) {
  document.getElementById('tab-ios').classList.toggle('active', which === 'ios');
  document.getElementById('tab-android').classList.toggle('active', which === 'android');
  document.getElementById('steps-ios').style.display = which === 'ios' ? 'flex' : 'none';
  document.getElementById('steps-android').style.display = which === 'android' ? 'flex' : 'none';
}

// ---------------------------------------------------------------
// Vídeos de fondo y etiquetas narrativas del "estado del faro"
// ---------------------------------------------------------------
function setVideoSrc(videoEl, ruta) {
  if (!videoEl) return;
  if (videoEl.getAttribute('src') === ruta) return;
  videoEl.setAttribute('src', ruta);
  videoEl.load();
  videoEl.play().catch(() => {});
}

function actualizarEstadoApagado() {
  const video = document.getElementById('bg-video-apagado');
  if (!video) return;

  const hora = new Date().getHours();
  const esAtardecer = hora >= 20; // 20:00–21:49 aprox., dentro de la fase "apagado"

  setVideoSrc(video, esAtardecer ? './video/atardecer.mp4' : './video/dia.mp4');
}

function actualizarEstadoDado(fase) {
  const video = document.getElementById('bg-video-dado');
  if (!video) return;

  setVideoSrc(video, fase === 'girando' ? './video/buscando.mp4' : './video/encontrado.mp4');
}

async function refrescarEstado() {
  const session = getSession();
  if (!session) return;

  if (document.getElementById('screen-apagado')?.classList.contains('active')) {
    actualizarEstadoApagado();
  }

  try {
    const estado = await api.estado();

    if (estado.fase !== faseAnterior) {
      aplicarFase(estado);
      faseAnterior = estado.fase;
    }
  } catch (err) {
    console.error('No se pudo consultar el estado del faro:', err);
  }
}

function aplicarFase(estado) {
  const session = getSession();

  switch (estado.fase) {
    case 'apagado':
      actualizarEstadoApagado();
      go('apagado');
      break;

    case 'girando':
      actualizarEstadoDado('girando');
      go('dado');
      iniciarGiroVisual(estado.totalUsuarios);
      break;

    case 'elegido': {
      const esGanador = estado.ganador?.id === session.id;
      actualizarEstadoDado('elegido');
      go('dado');
      mostrarResultado({ esGanador, numero: estado.numeroElegido });
      break;
    }

    case 'escribiendo': {
      const esGanador = estado.ganador?.id === session.id;
      if (esGanador) {
        go('escribiendo');
        iniciarCuentaAtras(estado.segundosRestantes ?? 3600, () => {
          faseAnterior = null;
          refrescarEstado();
        });
      } else {
        document.getElementById('esperando-title').textContent =
          'Esta noche el faro loco no te ha elegido a ti.';
        go('esperando');
      }
      break;
    }

    case 'mensaje':
      pintarMensajeDifundido(estado.mensaje);
      go('mensaje');
      break;

    case 'sin_mensaje':
      go('sinmensaje');
      break;
  }
}

function onLoggedIn() {
  actualizarEstadoApagado();
  go('apagado');
  faseAnterior = null;
  refrescarEstado();
  clearInterval(pollTimer);
  pollTimer = setInterval(refrescarEstado, POLL_MS);
  pedirPermisoYSuscribir().catch(() => {});
}

function initSesionExistente() {
  if (getToken() && getSession()) {
    onLoggedIn();
  }
}

document.addEventListener('faro:mensaje-enviado', () => {
  faseAnterior = null;
  refrescarEstado();
});

document.addEventListener('DOMContentLoaded', () => {
  registrarServiceWorker();
  mostrarMenuSegunModo();
  bindBackButtons();
  bindInstallTabs();
  bindSoundToggle();
  initEscritura();
  initAuthForms(onLoggedIn);
  initSesionExistente();
});
