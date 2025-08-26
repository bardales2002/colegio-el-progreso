// Define aquí tus plataformas (puedes añadir/quitar sin tocar el HTML)
const plataformas = [
  { nombre: 'Geducar',      url: 'https://www.geducar.com',                         logo: 'img/geducar.png' },
  { nombre: 'Jasperactive', url: 'https://www.jasperactive.com',                    logo: 'img/jasperative.png' },
  { nombre: 'Santillana',   url: 'https://identity.santillanaconnect.com',          logo: 'img/santillana.png' },
  { nombre: 'Progrentis',   url: 'https://www.progrentis.com',                      logo: 'img/progrentis.png' },
  { nombre: 'Richmond',     url: 'https://richmondlp.com',                          logo: 'img/richmond.png' },
  // agrega más si lo necesitas:
  // { nombre: 'English Attack', url: 'https://www.english-attack.com', logo: 'img/plataformas/english-attack.png' },
];

function renderPlataformas(){
  const grid = document.getElementById('platformsGrid');
  plataformas.forEach(p => {
    const el = document.createElement('article');
    el.className = 'platform';
    el.innerHTML = `
      <img class="platform__logo" src="${p.logo}" alt="${p.nombre}" onerror="this.src='img/plataformas/placeholder.png'">
      <div class="platform__body">
        <h3 class="platform__name" title="${p.nombre}">${p.nombre}</h3>
        <a class="platform__link" href="${p.url}" target="_blank" rel="noopener">Abrir</a>
      </div>
    `;
    grid.appendChild(el);
  });
}

document.addEventListener('DOMContentLoaded', renderPlataformas);
