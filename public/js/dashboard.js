/* ----------------- Carrusel ----------------- */
let currentIndex = 0;
const images = document.querySelectorAll('.image-slider img');
const dots   = document.querySelectorAll('.dot');

function showSlide(index){
  images.forEach((img,i)=>{
    img.classList.toggle('active', i===index);
    dots[i]?.classList.toggle('active-dot', i===index);
  });
}

window.currentSlide = function(index){
  currentIndex = index;
  showSlide(currentIndex);
};

document.addEventListener('keydown', e=>{
  if(e.key === 'ArrowRight'){
    currentIndex = (currentIndex + 1) % images.length;
    showSlide(currentIndex);
  }
  if(e.key === 'ArrowLeft'){
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    showSlide(currentIndex);
  }
});

setInterval(()=>{
  currentIndex = (currentIndex + 1) % images.length;
  showSlide(currentIndex);
}, 5000);

showSlide(0);

/* ----------------- Sesión: nombre/rol/correo + logout ----------------- */

const BADGE_ID   = 'user-badge';
const LOGOUT_URL = '/api/logout';

// Toma el primer string no vacío
function take(...vals){
  for (const v of vals){
    if (v !== undefined && v !== null){
      const s = String(v).trim();
      if (s) return s;
    }
  }
  return '';
}

// Intenta varios endpoints posibles para /me
async function fetchMe(){
  const candidates = ['/api/me', '/me', '/api/session', '/session'];
  for (const url of candidates){
    try{
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) continue;
      const data = await res.json();

      // Muchos backends devuelven { ok:true, user:{...} }
      const user = (data?.user ?? data) || {};
      if (Object.keys(user).length) return user;
    }catch(_){}
  }
  return null;
}

async function renderUserBadge(){
  const badge = document.getElementById(BADGE_ID);
  if (!badge) return;

  // placeholder mientras llega la info
  badge.innerHTML = `<span class="usr-ico">👤</span> (user) | correo`;

  const u = await fetchMe();

  if (!u){
    badge.innerHTML = `<span class="usr-ico">👤</span> (Invitado)`;
    return;
  }

  // Normaliza
  const first = take(u.name, u.nombres, u.first_name);
  const last  = take(u.apellidos, u.last_name);
  const name  = take(`${first} ${last}`.trim(), first);
  const email = take(u.email, u.correo, u.username);
  const role  = take(u.role, u.rol, 'usuario');

  // Construye el texto:
  // - si hay nombre => "Nombre Apellido (rol) | correo"
  // - si no hay nombre => "(rol) correo" (sin '|')
  let label = '';

  if (name && role && email){
    label = `${name} (${role}) | ${email}`;
  } else if (name && role){
    label = `${name} (${role})`;
  } else if (name && email){
    label = `${name} | ${email}`;
  } else if (role && email){
    // <- esto es lo que quieres ver mínimo: (rol) correo
    label = `(${role}) ${email}`;
  } else if (email){
    label = email;
  } else {
    label = '(Invitado)';
  }

  badge.innerHTML = `<span class="usr-ico">👤</span> ${label}`;
}

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', async ()=>{
  try{
    await fetch(LOGOUT_URL, { method:'POST', credentials:'include' });
  }catch(_){}
  location.href = '/';
});

// Init
renderUserBadge();
