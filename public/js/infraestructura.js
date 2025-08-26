// Inicialización del mapa con Leaflet
var map = L.map('map').setView([14.85611547061137, -90.06889607568283], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

L.marker([14.85611547061137, -90.06889607568283]).addTo(map)
  .bindPopup('Colegio Ciencias Comerciales, El Progreso')
  .openPopup();
