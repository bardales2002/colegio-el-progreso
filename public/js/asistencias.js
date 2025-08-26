const API = '/api/asistencias';

const frmScan = document.getElementById('frmScan');
const scanInp = document.getElementById('scan');
const lastBox  = document.getElementById('lastEvent');

const fecha   = document.getElementById('fecha');
const btnHoy  = document.getElementById('btnHoy');
const btnSem  = document.getElementById('btnSemana');
const buscar  = document.getElementById('buscar');

const tbody   = document.querySelector('#tablaAsist tbody');

const btnPdf   = document.getElementById('btnPdf');
const btnExcel = document.getElementById('btnExcel');

let cache = [];
let range = null;

/* ======== Helpers ======== */
function todayStr(d = new Date()){
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0,10); // YYYY-MM-DD
}
function mondayOf(dateStr){
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return todayStr(d);
}
function addDays(dateStr, n){
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return todayStr(d);
}
function showLast(message, kind='ok'){
  lastBox.className = `last-event ${kind}`;
  lastBox.innerHTML = message;
  lastBox.classList.remove('hidden');
}

/* ==== NUEVO: formatear fecha a DD-MM-YYYY para UI y exportaciones ==== */
function fmtFechaDDMMYYYY(s){
  if (!s) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); // extrae YYYY-MM-DD de “YYYY-MM-DD” o “YYYY-MM-DDTHH…”
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
}

/* ======== Escaneo (limpieza) ======== */
scanInp.addEventListener('input', () => {
  scanInp.value = scanInp.value.replace(/\D/g,'').slice(0,13);
});

/* ======== Registrar scan ======== */
frmScan.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const dpi = scanInp.value.replace(/\D/g,'');
  if (!/^\d{13}$/.test(dpi)) {
    showLast('DPI inválido. Debe contener exactamente 13 dígitos.', 'err');
    scanInp.focus(); scanInp.select();
    return;
  }

  try {
    const res = await fetch(`${API}/scan`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ dpi })
    });
    const json = await res.json();

    if (!json.ok && json.action === 'completo') {
      showLast(`✅ <b>${json.docente.nombres} ${json.docente.apellidos}</b> — La asistencia de hoy ya está completa.`, 'warn');
    } else if (!json.ok) {
      showLast(`❌ ${json.message || 'Error al registrar'}`, 'err');
    } else if (json.action === 'entrada') {
      showLast(`🟢 Entrada registrada: <b>${json.docente.nombres} ${json.docente.apellidos}</b> a las <b>${json.time}</b>.`, 'ok');
    } else if (json.action === 'salida') {
      showLast(`🟠 Salida registrada: <b>${json.docente.nombres} ${json.docente.apellidos}</b> a las <b>${json.time}</b>.`, 'ok');
    }

    scanInp.value = '';
    await load();
    scanInp.focus();

  } catch (err) {
    console.error(err);
    showLast('❌ Error de conexión con el servidor', 'err');
  }
});

/* ======== Listado ======== */
async function fetchList(){
  const params = new URLSearchParams();
  if (range?.from && range?.to) {
    params.set('from', range.from);
    params.set('to',   range.to);
  } else {
    params.set('date', fecha.value || todayStr());
  }
  if (buscar.value.trim()) params.set('q', buscar.value.trim());

  const res = await fetch(`${API}?${params.toString()}`);
  const rows = await res.json();
  cache = rows;
  return rows;
}

function render(rows){
  tbody.innerHTML = '';
  rows.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fmtFechaDDMMYYYY(r.fecha)}</td>
      <td>${r.nombres} ${r.apellidos}</td>
      <td>${r.docente_codigo}</td>
      <td>${r.dpi}</td>
      <td>${r.hora_entrada ?? '-'}</td>
      <td>${r.hora_salida ?? '-'}</td>
      <td><button class="btn-del" data-id="${r.id}">Eliminar</button></td>
    `;
    tbody.appendChild(tr);
  });
}

async function load(){
  const rows = await fetchList();
  render(rows);
}

tbody.addEventListener('click', async (e)=>{
  const btn = e.target.closest('[data-id]');
  if (!btn) return;
  const id = btn.dataset.id;
  if (confirm('¿Eliminar este registro de asistencia?')) {
    const res = await fetch(`${API}/${id}`, { method:'DELETE' });
    const json = await res.json();
    if (!json.ok) return alert(json.message || 'No se pudo eliminar');
    await load();
  }
});

/* ======== Filtros ======== */
fecha.value = todayStr();

btnHoy.addEventListener('click', ()=>{
  range = null;
  fecha.value = todayStr();
  load();
});

btnSem.addEventListener('click', ()=>{
  const base = fecha.value || todayStr();
  const from = mondayOf(base);
  const to   = addDays(from, 4); // lunes a viernes
  range = { from, to };
  load();
});

fecha.addEventListener('change', ()=>{ range = null; load(); });
buscar.addEventListener('input', ()=> load());

/* ======== Exportaciones ======== */
btnPdf.addEventListener('click', ()=>{
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'landscape' });
  doc.setFontSize(14);
  doc.text('Asistencias', 14, 12);

  const head = [['Fecha','Docente','Código','DPI','Entrada','Salida']];
  const body = cache.map(r => [
    fmtFechaDDMMYYYY(r.fecha),
    `${r.nombres} ${r.apellidos}`,
    r.docente_codigo,
    r.dpi,
    r.hora_entrada ?? '-',
    r.hora_salida ?? '-'
  ]);

  doc.autoTable({ head, body, startY:18, styles:{ fontSize:9 }, headStyles:{ fillColor:[255,122,0] } });
  doc.save('asistencias.pdf');
});

btnExcel.addEventListener('click', ()=>{
  const rows = cache.map(r => ({
    Fecha:   fmtFechaDDMMYYYY(r.fecha),
    Docente: `${r.nombres} ${r.apellidos}`,
    Codigo:  r.docente_codigo,
    DPI:     r.dpi,
    Entrada: r.hora_entrada ?? '',
    Salida:  r.hora_salida ?? ''
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Asistencias');
  XLSX.writeFile(wb, 'asistencias.xlsx');
});

/* ======== Init ======== */
(async function init(){
  setTimeout(()=>{ scanInp.focus(); }, 200);
  await load();
})();
