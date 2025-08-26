const API_CARNETS  = '/api/carnets';
const API_DOCENTES = '/api/docentes/min';

const selDocente = document.getElementById('docente_codigo');
const dpiInput   = document.getElementById('dpi');
const form       = document.getElementById('frmCarnet');

const buscar   = document.getElementById('buscar');
const tbody    = document.querySelector('#tablaCarnets tbody');

const previewSVG = document.getElementById('previewBarcode');
const btnPrev    = document.getElementById('btnPreview');
const btnDLPrev  = document.getElementById('btnDownloadPreview');
const btnPrPrev  = document.getElementById('btnPrintPreview');

const btnPdf   = document.getElementById('btnPdf');
const btnExcel = document.getElementById('btnExcel');

let cache = [];

/* ========= Limpia el input DPI mientras se escribe ========= */
dpiInput.addEventListener('input', () => {
  // Deja solo dígitos y limita a 13
  dpiInput.value = dpiInput.value.replace(/\D/g, '').slice(0, 13);
  // borra mensajes de validez custom si los hubiera
  dpiInput.setCustomValidity('');
});

/* ========= Helpers ========= */
function jsbarcodeInto(svgEl, value){
  try{
    JsBarcode(svgEl, value, {
      format: "CODE128",
      displayValue: true,
      fontSize: 14,
      margin: 8,
      height: 60,
      lineColor: "#000"
    });
  }catch(e){
    console.error(e);
  }
}

function svgToPngDataUrl(svgEl, width=600, height=200){
  const svgStr = new XMLSerializer().serializeToString(svgEl);
  const svgBlob = new Blob([svgStr], {type:'image/svg+xml;charset=utf-8'});
  const url = URL.createObjectURL(svgBlob);

  return new Promise(resolve=>{
    const img = new Image();
    img.onload = ()=>{
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0,0,width,height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = url;
  });
}

async function downloadSvgAsPng(svgEl, fileName='carnet.png'){
  const dataUrl = await svgToPngDataUrl(svgEl);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  a.click();
}

async function printSvg(svgEl){
  const dataUrl = await svgToPngDataUrl(svgEl);
  const w = window.open('');
  w.document.write(`<img src="${dataUrl}" style="width:100%">`);
  w.document.close();
  w.focus();
  w.print();
  w.close();
}

/* ========= Cargar docentes para el select ========= */
async function loadDocentes(){
  const res = await fetch(API_DOCENTES);
  const list = await res.json();
  selDocente.innerHTML = '<option value="">Seleccione…</option>';
  list.forEach(d=>{
    const opt = document.createElement('option');
    opt.value = d.codigo;
    opt.textContent = `${d.nombre} (${d.codigo})`;
    selDocente.appendChild(opt);
  });
}

/* ========= CRUD Carnets ========= */
async function fetchCarnets(q=''){
  const url = q ? `${API_CARNETS}?search=${encodeURIComponent(q)}` : API_CARNETS;
  const res = await fetch(url);
  const data = await res.json();
  cache = data;
  return data;
}

function renderCarnets(list){
  tbody.innerHTML = '';
  list.forEach(row=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="badge">${row.id}</td>
      <td>${row.nombres} ${row.apellidos}</td>
      <td>${row.docente_codigo}</td>
      <td>${row.dpi}</td>
      <td class="barcode-cell"><svg id="bc-${row.id}"></svg></td>
      <td>${row.creado_en}</td>
      <td class="actions-cell">
        <button class="btn-sm btn-dl" data-dl="${row.id}">PNG</button>
        <button class="btn-sm btn-pr" data-pr="${row.id}">Imprimir</button>
        <button class="btn-sm btn-del" data-id="${row.id}">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);

    const svg = tr.querySelector(`#bc-${row.id}`);
    jsbarcodeInto(svg, row.barcode_value);
  });
}

async function load(q=''){
  const data = await fetchCarnets(q);
  renderCarnets(data);
}

/* ========= Eventos ========= */
form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const docente_codigo = selDocente.value;
  const dpi = dpiInput.value.replace(/\D/g, ''); // <-- sanitiza

  if(!docente_codigo) {
    alert('Seleccione un docente');
    return;
  }
  if(!/^[0-9]{13}$/.test(dpi)) {
    dpiInput.setCustomValidity('El DPI debe tener exactamente 13 dígitos.');
    dpiInput.reportValidity();
    return;
  } else {
    dpiInput.setCustomValidity('');
  }

  const res = await fetch(API_CARNETS, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ docente_codigo, dpi })
  });
  const json = await res.json();
  if(!json.ok){
    alert(json.message || 'No se pudo crear el carnet');
    return;
  }

  dpiInput.value = '';
  await load(buscar.value);
  alert('Carnet creado correctamente');
});

btnPrev.addEventListener('click', ()=>{
  const dpi = dpiInput.value.replace(/\D/g, '');
  if(!/^[0-9]{13}$/.test(dpi)) {
    dpiInput.setCustomValidity('Ingrese un DPI válido de 13 dígitos.');
    dpiInput.reportValidity();
    return;
  }
  dpiInput.setCustomValidity('');
  jsbarcodeInto(previewSVG, dpi);
});

btnDLPrev.addEventListener('click', async ()=>{
  const dpi = dpiInput.value.replace(/\D/g, '');
  if(!/^[0-9]{13}$/.test(dpi)) return alert('Primero previsualiza un DPI válido');
  await downloadSvgAsPng(previewSVG, `carnet-${dpi}.png`);
});

btnPrPrev.addEventListener('click', async ()=>{
  const dpi = dpiInput.value.replace(/\D/g, '');
  if(!/^[0-9]{13}$/.test(dpi)) return alert('Primero previsualiza un DPI válido');
  await printSvg(previewSVG);
});

tbody.addEventListener('click', async (e)=>{
  const btnDel = e.target.closest('[data-id]');
  const btnDL  = e.target.closest('[data-dl]');
  const btnPr  = e.target.closest('[data-pr]');

  if(btnDel){
    const id = btnDel.dataset.id;
    if(confirm('¿Eliminar este carnet?')){
      const res = await fetch(`${API_CARNETS}/${id}`, { method:'DELETE' });
      const json = await res.json();
      if(!json.ok) return alert(json.message || 'No se pudo eliminar');
      await load(buscar.value);
    }
  }

  if(btnDL){
    const id = btnDL.dataset.dl;
    const svg = document.getElementById(`bc-${id}`);
    await downloadSvgAsPng(svg, `carnet-${id}.png`);
  }

  if(btnPr){
    const id = btnPr.dataset.pr;
    const svg = document.getElementById(`bc-${id}`);
    await printSvg(svg);
  }
});

buscar.addEventListener('input', ()=>{
  load(buscar.value);
});

/* ========= Exportar PDF/Excel del listado ========= */
btnPdf?.addEventListener('click', ()=>{
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'landscape' });
  doc.setFontSize(14);
  doc.text('Listado de Carnets', 14, 12);

  const head = [['ID','Docente','Código','DPI','Creado']];
  const body = cache.map(r => [
    r.id, `${r.nombres} ${r.apellidos}`, r.docente_codigo, r.dpi, r.creado_en
  ]);

  doc.autoTable({ head, body, startY:18, styles:{ fontSize:9 }, headStyles:{ fillColor:[255,122,0] } });
  doc.save('carnets.pdf');
});

btnExcel?.addEventListener('click', ()=>{
  const rows = cache.map(r => ({
    ID: r.id,
    Docente: `${r.nombres} ${r.apellidos}`,
    Codigo: r.docente_codigo,
    DPI: r.dpi,
    Creado: r.creado_en
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Carnets');
  XLSX.writeFile(wb, 'carnets.xlsx');
});

/* ========= Init ========= */
(async function init(){
  await loadDocentes();
  await load();
})();
