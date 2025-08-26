/* ========= Endpoints existentes ========= */
const API_DOC_MIN     = '/api/docentes/min';      // para el combo
const API_CARNETS     = '/api/carnets';           // ?q=
const API_ASISTENCIAS = '/api/asistencias';       // ?date=YYYY-MM-DD
const API_PERMISOS    = '/api/permisos';          // ?from=YYYY-MM-DD&to=YYYY-MM-DD&docente=COD

/* ========= Helpers ========= */
const $ = (s, r=document)=>r.querySelector(s);
const $all = (s, r=document)=>[...r.querySelectorAll(s)];

const fmtDate = (iso) => {
  if (!iso) return '';
  const s = String(iso);
  const d = s.includes('T') ? s.split('T')[0] : s;
  const [y,m,da] = d.split('-');
  return (y && m && da) ? `${da}-${m}-${y}` : s;
};
const firstDay = (ym) => `${ym}-01`;
const lastDay  = (ym) => {
  const [y,m] = ym.split('-').map(Number);
  const dd = new Date(y, m, 0).getDate();
  return `${ym}-${String(dd).padStart(2,'0')}`;
};
const take = (...vals)=>{
  for (const v of vals){
    if (v!==undefined && v!==null){
      const s = String(v).trim();
      if (s) return s;
    }
  }
  return '';
};
async function fetchJSON(url){
  const r = await fetch(url);
  if(!r.ok) return [];
  return await r.json();
}
const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
// SIN desfase por zona horaria
function ddmmyyParts(iso){
  if(!iso) return {d:'',m:'',y:''};
  const [y,m,d] = iso.split('-').map(Number);
  return { d: String(d), m: MONTHS[m-1], y: String(y) };
}
function fillAll(map){
  for(const k in map){
    $all(`[data-f="${k}"]`).forEach(el => el.textContent = map[k] ?? '');
  }
}

/* ========= Cache de DPI por código de docente ========= */
const DPI_CACHE = new Map();

async function buildDpiCache(){
  try{
    const data = await fetchJSON(API_CARNETS); // trae todos los carnets
    (data||[]).forEach(r=>{
      const code = take(r.docente_codigo, r.codigo, r.code);
      const dpi  = take(
        r.dpi, r.codigo_barras, r.barcode, r.codigoBarra,
        r.codigoBarras, r.codigobarras, r.codigo_barra
      );
      if(code && dpi) DPI_CACHE.set(code, dpi);
    });
  }catch(_){}
}

async function autoFillDpiFromDocente(){
  const val = $('#solDocente').value;
  if(!val) return;
  let code = '';
  try { code = JSON.parse(val).code || ''; } catch(_) {}
  if(!code) return;

  // Asegura cache y coloca el DPI si existe
  if(!DPI_CACHE.size) await buildDpiCache();

  const dpi = DPI_CACHE.get(code);
  if(dpi) $('#solDpi').value = dpi;
}

/* ========= Exportación genérica para tablas ========= */
async function exportCardAsImage(card, filename){
  const canvas = await html2canvas(card, {scale:2});
  const link = document.createElement('a');
  link.download = filename.endsWith('.png')?filename:`${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
function exportTableAsPDF(table, title, filename){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'landscape' });
  doc.setFontSize(14);
  doc.text(title, 14, 12);
  const head = [ [...table.tHead.rows[0].cells].map(th=>th.textContent.trim()) ];
  const body = [...table.tBodies[0].rows].map(tr => [...tr.cells].map(td=>td.textContent.trim()));
  doc.autoTable({ head, body, startY:18, styles:{ fontSize:9 }, headStyles:{ fillColor:[255,122,0] }});
  doc.save(filename.endsWith('.pdf')?filename:`${filename}.pdf`);
}
function exportTableAsXLSX(table, filename){
  const rows = [];
  rows.push([...table.tHead.rows[0].cells].map(th=>th.textContent.trim()));
  [...table.tBodies[0].rows].forEach(tr=>{
    rows.push([...tr.cells].map(td=>td.textContent.trim()));
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  XLSX.writeFile(wb, filename.endsWith('.xlsx')?filename:`${filename}.xlsx`);
}
function hookExports(cardId, tableId, title, baseName){
  const card = document.getElementById(cardId);
  const table = document.getElementById(tableId);
  card.querySelectorAll('button[data-export]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const t = btn.dataset.export;
      if (t==='img')  return exportCardAsImage(card, `${baseName}.png`);
      if (t==='pdf')  return exportTableAsPDF(table, title, `${baseName}.pdf`);
      if (t==='xlsx') return exportTableAsXLSX(table, `${baseName}.xlsx`);
    });
  });
}

/* ========= Exportación de la Solicitud (div A4) ========= */
async function exportSolicitud(type){
  // Asegura que haya contenido
  if ($('#solicitudPreview').hidden) previsualizarSolicitud();

  const card = $('#solicitudPreview');
  const logo = $('#colegioLogo');

  async function captureAndDownload(){
    const canvas = await html2canvas(card, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true
    });
    const img = canvas.toDataURL('image/png');

    if (type === 'img') {
      const a = document.createElement('a');
      a.download = 'solicitud_permiso.png';
      a.href = img;
      a.click();
    } else {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit:'mm', format:'a4' });
      const w = 210;
      const h = (canvas.height / canvas.width) * w;
      pdf.addImage(img, 'PNG', 0, 0, w, h);
      pdf.save('solicitud_permiso.pdf');
    }
  }

  try {
    await captureAndDownload();
  } catch (err) {
    // Si el canvas quedó "tainted" por el logo, reintenta ocultándolo
    const prevDisplay = logo ? logo.style.display : null;
    if (logo) logo.style.display = 'none';
    try { await captureAndDownload(); }
    finally { if (logo) logo.style.display = prevDisplay ?? ''; }
  }
}

/* ========= Renderizadores ========= */
function renderCarnets(rows){
  const tb = $('#tblCarnets tbody');
  tb.innerHTML = '';
  (rows||[]).forEach((r,i)=>{
    const nombre = take(`${take(r.nombres,r.name,'')} ${take(r.apellidos,r.last_name,'')}`.trim(),
                        take(r.nombres,r.name), take(r.docente,'')); 
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="badge">${i+1}</td>
      <td>${nombre}</td>
      <td>${take(r.codigo, r.docente_codigo, r.code)}</td>
      <td>${take(r.numero, r.no_carnet, r.carnet, r.id)}</td>
      <td>${take(r.estado, 'Activo')}</td>
      <td>${fmtDate(take(r.emitido_en, r.creado_en, r.fecha))}</td>
    `;
    tb.appendChild(tr);
  });
}
function renderAsistencias(rows){
  const tb = $('#tblAsistencias tbody');
  tb.innerHTML = '';
  (rows||[]).forEach((r,i)=>{
    const nombre = take(`${take(r.nombres,r.name,'')} ${take(r.apellidos,r.last_name,'')}`.trim(),
                        take(r.nombres,r.name), take(r.docente,'')); 
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="badge">${i+1}</td>
      <td>${nombre}</td>
      <td>${take(r.codigo, r.docente_codigo, r.code)}</td>
      <td>${fmtDate(take(r.fecha, r.dia))}</td>
      <td>${take(r.hora, r.checkin_hora, r.entrada)}</td>
      <td>${take(r.estado, r.status)}</td>
      <td>${take(r.observacion, r.obs, '')}</td>
    `;
    tb.appendChild(tr);
  });
}
function renderPermisos(rows){
  const tb = $('#tblPermisos tbody');
  tb.innerHTML = '';
  (rows||[]).forEach((r,i)=>{
    const nombre = take(`${take(r.nombres,r.name,'')} ${take(r.apellidos,r.last_name,'')}`.trim(),
                        take(r.nombres,r.name), take(r.docente,'')); 
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="badge">${i+1}</td>
      <td>${nombre}</td>
      <td>${take(r.docente_codigo, r.codigo, r.code)}</td>
      <td>${take(r.tipo, r.motivo)}</td>
      <td>${fmtDate(take(r.fecha_desde, r.desde))}</td>
      <td>${fmtDate(take(r.fecha_hasta, r.hasta))}</td>
      <td>${take(r.estado, 'pendiente')}</td>
      <td>${take(r.observaciones, r.observacion, '')}</td>
    `;
    tb.appendChild(tr);
  });
}

/* ========= Consultas ========= */
async function consultarCarnets(){
  const q = $('#buscarCarnet').value.trim();
  const url = q ? `${API_CARNETS}?q=${encodeURIComponent(q)}` : API_CARNETS;
  const data = await fetchJSON(url);
  renderCarnets(Array.isArray(data)?data:[]);
}
async function consultarAsistencias(){
  const d = $('#asisFecha').value || new Date().toISOString().slice(0,10);
  const data = await fetchJSON(`${API_ASISTENCIAS}?date=${encodeURIComponent(d)}`);
  renderAsistencias(Array.isArray(data)?data:[]);
}
async function cargarDocentesMin(){
  const list = await fetchJSON(API_DOC_MIN);
  const sel = $('#perDocente');
  const selSol = $('#solDocente');
  sel.innerHTML = '<option value="">Todos los docentes</option>';
  selSol.innerHTML = '<option value="">Seleccione…</option>';
  (list||[]).forEach(d=>{
    const name = take(d.nombre, d.nombres, d.name);
    const code = take(d.codigo, d.code);
    const opt1 = document.createElement('option');
    opt1.value = code; opt1.textContent = `${name} (${code})`;
    sel.appendChild(opt1);
    const opt2 = document.createElement('option');
    opt2.value = JSON.stringify({ name, code });
    opt2.textContent = `${name} (${code})`;
    selSol.appendChild(opt2);
  });
}
async function consultarPermisos(){
  const ym = $('#perMes').value; // yyyy-MM
  if(!ym){ alert('Selecciona un mes'); return; }
  const docente = $('#perDocente').value;
  const from = firstDay(ym);
  const to   = lastDay(ym);

  const params = new URLSearchParams();
  params.set('from', from);
  params.set('to', to);
  if(docente) params.set('docente', docente);

  const data = await fetchJSON(`${API_PERMISOS}?${params.toString()}`);
  renderPermisos(Array.isArray(data)?data:[]);
}

/* ========= Solicitud de Permiso (previsualizar) ========= */
function previsualizarSolicitud(){
  // Datos del formulario
  const docenteSel = $('#solDocente').value ? JSON.parse($('#solDocente').value) : {name:''};
  const docente = docenteSel.name || '';
  const dpi     = $('#solDpi').value.trim();
  const ciudad  = $('#solCiudad').value.trim() || 'Guastatoya';
  const fechaSol= $('#solFecha').value;
  const motivo  = $('#solMotivo').value.trim();

  const desde   = $('#autDesde').value;
  const hasta   = $('#autHasta').value;

  const forma   = document.querySelector('input[name="autForma"]:checked')?.value || 'CON GOCE DE SALARIO';
  const autFec  = $('#autFecha').value;
  const coord   = $('#autCoord').value.trim();
  const director= $('#autDirector').value.trim();

  // Partes de fechas (sin desfase)
  const s = ddmmyyParts(fechaSol);
  const a = ddmmyyParts(autFec);
  const d1 = ddmmyyParts(desde); const d2 = ddmmyyParts(hasta);
  const rango = (desde && hasta)
      ? `${d1.d}-${d2.d} de ${d2.m}`
      : (desde ? `${d1.d} de ${d1.m}` : '');

  // Marcas (X) según forma seleccionada
  const mark1 = forma.startsWith('CON GOCE DE SALARIO') ? 'X' : ' ';
  const mark2 = forma.startsWith('CON GOCE DE MEDIO')   ? 'X' : ' ';
  const mark3 = forma.startsWith('SIN GOCE')            ? 'X' : ' ';

  // Volcado en la hoja (todas las apariciones)
  fillAll({
    'docente' : docente,
    'dpi'     : dpi,
    'sol-dia' : s.d,
    'sol-mes' : s.m,
    'sol-anio': s.y,
    'motivo'  : motivo,
    'aut-fecha-rango': rango,
    'aut-dia' : a.d,
    'aut-mes' : a.m,
    'aut-anio': a.y,
    'marca-1' : mark1,
    'marca-2' : mark2,
    'marca-3' : mark3,
    'coord'   : coord || 'Coordinadora',
    'director': director || 'Director'
  });

  // Mostrar previsualización
  $('#solicitudPreview').hidden = false;
}

/* ========= INIT ========= */
(function init(){
  // Defaults
  $('#asisFecha').value = new Date().toISOString().slice(0,10);
  $('#perMes').value    = new Date().toISOString().slice(0,7);
  $('#solFecha').value  = new Date().toISOString().slice(0,10);
  $('#autDesde').value  = new Date().toISOString().slice(0,10);
  $('#autHasta').value  = new Date().toISOString().slice(0,10);
  $('#autFecha').value  = new Date().toISOString().slice(0,10);

  // Consultas
  $('#btnCarnetsConsultar').addEventListener('click', consultarCarnets);
  $('#btnAsisConsultar').addEventListener('click', consultarAsistencias);
  $('#btnPerConsultar').addEventListener('click', consultarPermisos);

  // Exports tablas
  hookExports('cardCarnets',    'tblCarnets',    'Carnets de Docentes',        'carnets_docentes');
  hookExports('cardAsistencia', 'tblAsistencias','Asistencia Diaria Docentes', 'asistencia_diaria');
  hookExports('cardPermisos',   'tblPermisos',   'Permisos por Mes',           'permisos_por_mes');

  // Previsualizar solicitud
  $('#btnPrevisualizar').addEventListener('click', previsualizarSolicitud);

  // Export de la hoja A4 (Solicitud)
  document.querySelectorAll('#cardSolicitud .btn-outline[data-export]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const type = btn.dataset.export; // "img" | "pdf"
      await exportSolicitud(type);
    });
  });

  // Autocompletar DPI al cambiar docente
  $('#solDocente').addEventListener('change', autoFillDpiFromDocente);

  // Cargar combos + datos iniciales
  cargarDocentesMin();
  consultarCarnets();
  consultarAsistencias();
  consultarPermisos();

  // Construye el cache de DPI (inmediato)
  buildDpiCache();
})();
