import { api, setToken, setSession } from './api.js';
import { mostrarToast } from './toast.js';

export function initAuthForms(onLoggedIn) {
  const loginBtn = document.getElementById('login-submit');

  loginBtn.addEventListener('click', async () => {
    const username = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pass').value;

    if (!username || !password) {
      mostrarToast('error', 'Falta algo', 'Escribe tu usuario y tu contraseña, anda.');
      return;
    }

    try {
      const { token, user } = await api.login({ username, password });
      setToken(token);
      setSession(user);
      onLoggedIn(user);
    } catch (err) {
      mostrarToast('error', 'Epa, eso no cuadra', 'Usuario o contraseña no coinciden, prueba otra vez.');
    }
  });

  const regBtn = document.getElementById('register-submit');

  regBtn.addEventListener('click', async () => {
    const payload = {
      username: document.getElementById('reg-user').value.trim(),
      password: document.getElementById('reg-pass').value,
      password2: document.getElementById('reg-pass2').value,
      nombre: document.getElementById('reg-name').value.trim(),
      fechaNacimiento: document.getElementById('reg-birthdate').value || null
    };

    if (!payload.username || !payload.password || !payload.nombre) {
      mostrarToast('error', 'Falta algo', 'Rellena al menos usuario, contraseña y nombre.');
      return;
    }
    if (payload.password !== payload.password2) {
      mostrarToast('error', 'Ojo con eso', 'Las contraseñas no coinciden, mira bien.');
      return;
    }

    try {
      await api.register(payload);
      mostrarToast('success', '¡Ya eres parte del clan!', 'Bienvenido al faro loco. Espera a que anochezca.');
    } catch (err) {
      const mensaje = err.status === 409
        ? 'Ese nombre ya está pillado por otro loco.'
        : (err.message || 'No se pudo completar el registro.');
      mostrarToast('error', 'No se pudo completar', mensaje);
    }
  });
}
