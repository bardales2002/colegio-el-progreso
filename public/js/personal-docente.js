/* Lista de personal (usa tus mismas imágenes; ajusta la ruta si las tienes en /img/docentes/) */
const maestros = [
  { nombre: 'Silvia Alejandra Rivas Escobar',           foto: 'img/Alejandra.png' },
  { nombre: 'Sandra Lorena Flores Roldán de Mejía',     foto: 'img/Sandra.jpg' },
  { nombre: 'Zoila Margarita Monzón Morales de Portillo', foto: 'img/Margarita.png' },
  { nombre: 'Cesia Corina Monterroso Beltetón',         foto: 'img/Cesia.png' },
  { nombre: 'Aura Estela Pérez Alonzo',                 foto: 'img/Aura.png' },
  { nombre: 'Melissa Anahí Macal Aldana',               foto: 'img/Melissa.png' },
  { nombre: 'María Belén Amado López',                  foto: 'img/Belen.png' },
  { nombre: 'Sandy Maribel Mayén Contreras',            foto: 'img/Sandy.png' },
  { nombre: 'Dayri Luseth López Crúz',                  foto: 'img/Dayri.png' },
  { nombre: 'Samuel Mejía Gómez',                       foto: 'img/Samuel.png' },
  { nombre: 'Elvis Sting Batz Pérez',                   foto: 'img/Elvis.png' },
  { nombre: 'Luis Pedro García Grajeda',                foto: 'img/Pedro.png' },
  { nombre: 'Juan Manuel Sosa Cruz',                    foto: 'img/Manuel.png' },
  { nombre: 'Bryan Rocael Bardales Castillo',           foto: 'img/Bryan.png' },
  { nombre: 'Oscar Eugenio Aroche Hernández',           foto: 'img/Oscar.png' },
  { nombre: 'Edgar Eduardo De León Ajin',               foto: 'img/Edgar.png' },
];

/* Render de tarjetas */
function loadMaestros(){
  const grid = document.getElementById('maestrosGrid');
  maestros.forEach(m => {
    const card = document.createElement('article');
    card.className = 'person';
    card.innerHTML = `
      <img class="person__img" src="${m.foto}" alt="${m.nombre}" onerror="this.src='img/docentes/placeholder.jpg'">
      <h3 class="person__name">${m.nombre}</h3>
    `;
    grid.appendChild(card);
  });
}
document.addEventListener('DOMContentLoaded', loadMaestros);
