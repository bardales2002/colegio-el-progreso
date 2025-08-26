const API_PERMISOS = '/api/permisos';
const API_DOC_MIN  = '/api/docentes/min';
const API_ME       = '/api/me';

const toggleCard   = document.getElementById('toggleCard');
const btnToggle    = document.getElementById('btnToggleForm');

const formSection  = document.getElementById('formSection');
const frmPermiso   = document.getElementById('frmPermiso');
const selDocente   = document.getElementById('docente');
const selTipo      = document.getElementById('tipo');
const inputDesde   = document.getElementById('desde');
const inputHasta   = document.getElementById('hasta');
const txtObs       = document.getElementById('obs');

const from     = document.getElementById('from');
const to       = document.getElementById('to');
const btnHoy   = document.getElementById('btnHoy');
const btnSem   = document.getElementById('btnSemana');
const fDocente = document.getElementById('fDocente');
const buscar   = document.getElementById('buscar');

const tbody    = document.querySelector('#tablaPermisos tbody');
const btnPdf   = document.getElementById('btnPdf');
const btnExcel = document.getElementById('btnExcel');

let cache = [];
let currentRole = 'user';

/* ====== Helpers ====== */
const todayStr = (d=new Date()) => {
  const tz = d.getTimezoneOffset()*60000;
  return new Date(d - tz).toISOString().slice(0,10);
};
const mondayOf = (dateStr)=>{
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return todayStr(d);
};
const addDays = (dateStr,n)=>{ const d=new Date(dateStr); d.setDate(d.getDate()+n); return todayStr(d); };
const fechaBonita = s => {
  if (!s) return '';
  const iso = s.toString();
  const onlyDate = iso.includes('T') ? iso.split('T')[0] : iso;
  const [y,m,d] = onlyDate.split('-');
  return `${d}-${m}-${y}`;
};
const badge = (estado) => {
  const map = {
    pendiente: { cls:'bg-yellow-50', text:'Pendiente' },
    aprobado:  { cls:'bg-green-50',  text:'Aprobado'  },
    rechazado: { cls:'bg-red-50',    text:'Rechazado' }
  };
  const it = map[(estado||'pendiente').toLowerCase()] || map.pendiente;
  return `<span class="estado ${it.cls}">${it.text}</span>`;
};

/* ====== Cargar docentes (select y filtro) ====== */
async function loadDocentes(){
  const res = await fetch(API_DOC_MIN);
  const list = await res.json();

  selDocente.innerHTML = '<option value="">Seleccione…</option>';
  list.forEach(d=>{
    const opt = document.createElement('option');
    opt.value = d.codigo;
    opt.textContent = `${d.nombre} (${d.codigo})`;
    selDocente.appendChild(opt);
  });

  fDocente.innerHTML = '<option value="">Todos los docentes</option>';
  list.forEach(d=>{
    const opt = document.createElement('option');
    opt.value = d.codigo;
    opt.textContent = `${d.nombre} (${d.codigo})`;
    fDocente.appendChild(opt);
  });
}

/* ====== Roles y UI ====== */
async function setRoleUI(){
  const me = await fetch(API_ME).then(r=>r.json()).catch(()=>({ok:false}));
  currentRole = me?.user?.role || 'user';

  if (currentRole === 'admin'){
    // Admin: no puede crear => ocultamos botón y formulario
    toggleCard.style.display = 'none';
    formSection.style.display = 'none';
  } else {
    // User: botón visible, form oculto por defecto
    toggleCard.style.display = '';
    formSection.style.display = 'none';
    btnToggle.textContent = '➕ Agregar permiso';
    btnToggle.setAttribute('aria-expanded','false');
  }
}

/* ====== Toggle del formulario (solo users) ====== */
btnToggle?.addEventListener('click', ()=>{
  const visible = formSection.style.display !== 'none';
  const show = !visible;
  formSection.style.display = show ? '' : 'none';
  btnToggle.textContent = show ? '▾ Ocultar formulario' : '➕ Agregar permiso';
  btnToggle.setAttribute('aria-expanded', String(show));
  if (show) selDocente?.focus();
});

/* ====== Crear permiso (solo users) ====== */
frmPermiso?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const docente_codigo = selDocente.value;
  const tipo = selTipo.value;
  const fecha_desde = inputDesde.value;
  const fecha_hasta = inputHasta.value;
  const observaciones = (txtObs.value || '').trim();

  if (!docente_codigo || !tipo || !fecha_desde || !fecha_hasta){
    alert('Completa los campos obligatorios');
    return;
  }
  if (new Date(fecha_hasta) < new Date(fecha_desde)){
    alert('El rango de fechas es inválido');
    return;
  }

  const res = await fetch(API_PERMISOS, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ docente_codigo, tipo, fecha_desde, fecha_hasta, observaciones })
  });
  const json = await res.json();
  if (!json.ok) return alert(json.message || 'No se pudo registrar');

  frmPermiso.reset();
  inputDesde.value = inputHasta.value = todayStr();
  await load();
  alert('Permiso registrado');
});

/* ====== Listado ====== */
async function fetchList(){
  const params = new URLSearchParams();
  if (fDocente.value) {
    params.set('docente', fDocente.value);
  } else {
    if (from.value) params.set('from', from.value);
    if (to.value)   params.set('to',   to.value);
  }
  if (buscar.value.trim()) params.set('q', buscar.value.trim());

  const res = await fetch(`${API_PERMISOS}?${params.toString()}`);
  const data = await res.json();
  cache = data || [];
  return cache;
}

function render(rows){
  tbody.innerHTML = '';
  rows.forEach((r,i)=>{
    const isPendiente = !r.estado || String(r.estado).toLowerCase().trim() === 'pendiente';

    let acciones = '';
    if (currentRole === 'admin'){
      if (isPendiente){
        acciones = `
          <button class="btn-acc aprobar"  data-id="${r.id}" data-act="aprobado">Aprobar</button>
          <button class="btn-acc rechazar" data-id="${r.id}" data-act="rechazado">Rechazar</button>`;
      }
    } else {
      acciones = `<button class="btn-acc danger" data-del="${r.id}">Eliminar</button>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="badge">${i+1}</td>
      <td>${r.nombres} ${r.apellidos}</td>
      <td>${r.docente_codigo}</td>
      <td>${r.tipo}</td>
      <td>${fechaBonita(r.fecha_desde)}</td>
      <td>${fechaBonita(r.fecha_hasta)}</td>
      <td>${r.observaciones ?? ''}</td>
      <td>${badge(r.estado)}</td>
      <td>${fechaBonita(r.creado_en)}</td>
      <td>${acciones}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function load(){
  const rows = await fetchList();
  render(rows);
}

/* ====== Acciones admin: aprobar / rechazar ====== */
tbody.addEventListener('click', async (e)=>{
  const btn = e.target.closest('.btn-acc');
  if (!btn) return;

  // Aprobar / Rechazar
  if (btn.dataset.act){
    const id = btn.dataset.id;
    const act = btn.dataset.act; // 'aprobado' | 'rechazado'
    const ok = confirm(`¿Confirmas marcar este permiso como ${act}?`);
    if (!ok) return;

    const res = await fetch(`${API_PERMISOS}/${id}/estado`, {
      method:'PATCH',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ estado: act })
    });
    const json = await res.json();
    if (!json.ok) return alert(json.message || 'No se pudo actualizar');
    await load();
    return;
  }

  // Eliminar (solo users, el backend valida también)
  if (btn.dataset.del){
    const id = btn.dataset.del;
    const ok = confirm('¿Eliminar este permiso?');
    if (!ok) return;

    const res = await fetch(`${API_PERMISOS}/${id}`, { method:'DELETE' });
    const json = await res.json();
    if (!json.ok) return alert(json.message || 'No se pudo eliminar');
    await load();
  }
});

/* ====== Filtros ====== */
from.value = to.value = todayStr();

btnHoy.addEventListener('click', ()=>{
  if (fDocente.value) fDocente.value = '';
  from.value = to.value = todayStr();
  load();
});
btnSem.addEventListener('click', ()=>{
  if (fDocente.value) fDocente.value = '';
  const base = todayStr();
  from.value = mondayOf(base);
  to.value   = addDays(from.value, 4);
  load();
});
[fDocente].forEach(el=>el.addEventListener('change', load));
[from,to].forEach(el=>el.addEventListener('change', ()=>{
  if (fDocente.value) fDocente.value = '';
  load();
}));
buscar.addEventListener('input', load);

/* ====== Exportaciones (incluye Estado) ====== */
btnPdf.addEventListener('click', ()=>{
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'landscape' });
  doc.setFontSize(14);
  doc.text('Permisos de Docentes', 14, 12);

  const head = [['#','Docente','Código','Tipo','Desde','Hasta','Observaciones','Estado','Creado']];
  const body = cache.map((r,i)=>[
    i+1, `${r.nombres} ${r.apellidos}`, r.docente_codigo, r.tipo,
    fechaBonita(r.fecha_desde), fechaBonita(r.fecha_hasta), r.observaciones ?? '',
    (r.estado || 'pendiente'), fechaBonita(r.creado_en)
  ]);

  doc.autoTable({ head, body, startY:18, styles:{ fontSize:9 }, headStyles:{ fillColor:[255,122,0] } });
  doc.save('permisos.pdf');
});

btnExcel.addEventListener('click', ()=>{
  const rows = cache.map((r,i)=>({
    N: i+1,
    Docente: `${r.nombres} ${r.apellidos}`,
    Codigo: r.docente_codigo,
    Tipo: r.tipo,
    Desde: fechaBonita(r.fecha_desde),
    Hasta: fechaBonita(r.fecha_hasta),
    Observaciones: r.observaciones ?? '',
    Estado: r.estado || 'pendiente',
    Creado: fechaBonita(r.creado_en)
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Permisos');
  XLSX.writeFile(wb, 'permisos.xlsx');
});

/* ====== Init ====== */
(async function init(){
  await setRoleUI();
  await loadDocentes();
  inputDesde.value = inputHasta.value = todayStr();
  await load();
})();
