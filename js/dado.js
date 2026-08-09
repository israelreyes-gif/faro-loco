let spinInterval = null;

export function iniciarGiroVisual(totalUsuarios) {
  const die = document.getElementById('die');
  clearInterval(spinInterval);
  die.classList.add('spinning');
  spinInterval = setInterval(() => {
    die.textContent = 1 + Math.floor(Math.random() * Math.max(totalUsuarios, 1));
  }, 90);
}

export function detenerGiroVisual() {
  clearInterval(spinInterval);
  document.getElementById('die').classList.remove('spinning');
}

export function mostrarResultado({ esGanador, numero }) {
  detenerGiroVisual();
  const die = document.getElementById('die');
  const result = document.getElementById('dado-result');
  const sub = document.getElementById('dado-sub');

  die.textContent = numero;
  die.classList.add('settled');

  if (esGanador) {
    result.textContent = '¡Te ha tocado a ti, campeón!';
    result.classList.remove('no-agraciado');
    sub.style.display = 'none';
    lanzarConfeti();
  } else {
    result.textContent = `¡Le ha tocado al número ${numero}!`;
    result.classList.add('no-agraciado');
    sub.textContent = 'Tú, esta noche, a esperar sentadito.';
    sub.style.display = 'block';
  }
}

export function lanzarConfeti() {
  const wrap = document.getElementById('confetti-wrap');
  if (!wrap) return;
  const colors = ['#5ec8e8', '#bfe7f5', '#9aa1a6', '#f2efe6'];
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = Math.random() * 100 + '%';
    p.style.background = colors[i % colors.length];
    p.style.animationDuration = (2 + Math.random() * 1.5) + 's';
    p.style.animationDelay = (Math.random() * 0.4) + 's';
    wrap.appendChild(p);
  }
  setTimeout(() => { wrap.innerHTML = ''; }, 3500);
}
