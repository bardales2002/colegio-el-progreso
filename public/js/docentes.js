const API = '/api/docentes';

const form = document.getElementById("docenteForm");
const editIndex = document.getElementById("editIndex");

const buscar = document.getElementById("buscar");
const tbody = document.querySelector("#tablaDocentes tbody");

const btnPdf = document.getElementById("btnPdf");
const btnExcel = document.getElementById("btnExcel");

const inputs = {
  codigo: document.getElementById("codigo"),
  nombres: document.getElementById("nombres"),
  apellidos: document.getElementById("apellidos"),
  fechaNacimiento: document.getElementById("fechaNacimiento"),
  telefono: document.getElementById("telefono"),
  email: document.getElementById("email"),
  anioIngreso: document.getElementById("anioIngreso"),
};

let cache = [];

async function fetchDocentes(q=''){
  const url = q ? `${API}?q=${encodeURIComponent(q)}` : API;
  const res = await fetch(url);
  const json = await res.json();
  if(!json.ok) throw new Error(json.message || 'Error al cargar docentes');
  cache = json.data || [];
  return cache;
}

function renderTabla(data){
  tbody.innerHTML = "";
  data.forEach(d => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="badge">${d.codigo}</td>
      <td>${d.nombres}</td>
      <td>${d.apellidos}</td>
      <td>${formatDate(d.fecha_nacimiento)}</td>
      <td>${d.telefono ?? ''}</td>
      <td>${d.correo ?? ''}</td>
      <td>${d.anio_ingreso}</td>
      <td class="actions-cell">
        <button class="btn-sm btn-edit" data-edit="${d.codigo}">Editar</button>
        <button class="btn-sm btn-del" data-del="${d.codigo}">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function formatDate(iso){
  if(!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2,"0");
  const mm = String(d.getUTCMonth()+1).padStart(2,"0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

async function load(q=''){
  const list = await fetchDocentes(q);
  renderTabla(list);
}

form.addEventListener("submit", async (e)=>{
  e.preventDefault();

  const payload = {
    codigo: inputs.codigo.value.trim(),
    nombres: inputs.nombres.value.trim(),
    apellidos: inputs.apellidos.value.trim(),
    fechaNacimiento: inputs.fechaNacimiento.value,
    telefono: inputs.telefono.value.trim() || null,
    email: inputs.email.value.trim() || null,
    anioIngreso: Number(inputs.anioIngreso.value),
  };

  const editCodigo = editIndex.value;

  try {
    let res;
    if(!editCodigo){
      res = await fetch(API, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`${API}/${encodeURIComponent(editCodigo)}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          nombres: payload.nombres,
          apellidos: payload.apellidos,
          fechaNacimiento: payload.fechaNacimiento,
          telefono: payload.telefono,
          email: payload.email,
          anioIngreso: payload.anioIngreso
        })
      });
    }
    const json = await res.json();
    if(!json.ok) throw new Error(json.message || 'Error al guardar');

    form.reset();
    editIndex.value = "";
    document.getElementById("btnGuardar").textContent = "Guardar";
    await load(buscar.value);
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById("btnCancelar").addEventListener("click", ()=>{
  editIndex.value = "";
  document.getElementById("btnGuardar").textContent = "Guardar";
});

tbody.addEventListener("click", async (e)=>{
  const btnE = e.target.closest("[data-edit]");
  const btnD = e.target.closest("[data-del]");

  if(btnE){
    const codigo = btnE.dataset.edit;
    const d = cache.find(x => x.codigo === codigo);
    if(!d) return;
    inputs.codigo.value = d.codigo;
    inputs.nombres.value = d.nombres;
    inputs.apellidos.value = d.apellidos;
    const iso = new Date(d.fecha_nacimiento).toISOString().slice(0,10);
    inputs.fechaNacimiento.value = iso;
    inputs.telefono.value = d.telefono ?? '';
    inputs.email.value = d.correo ?? '';
    inputs.anioIngreso.value = d.anio_ingreso;

    editIndex.value = codigo;
    document.getElementById("btnGuardar").textContent = "Actualizar";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if(btnD){
    const codigo = btnD.dataset.del;
    const d = cache.find(x => x.codigo === codigo);
    if(!d) return;

    if(confirm(`¿Eliminar a "${d.nombres} ${d.apellidos}"?`)){
      try{
        const res = await fetch(`${API}/${encodeURIComponent(codigo)}`, { method: 'DELETE' });
        const json = await res.json();
        if(!json.ok) throw new Error(json.message || 'Error al eliminar');
        await load(buscar.value);
      }catch(err){
        alert(err.message);
      }
    }
  }
});

buscar.addEventListener("input", ()=>{
  load(buscar.value);
});

btnPdf.addEventListener("click", ()=>{
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:"landscape" });
  doc.setFontSize(14);
  doc.text("Listado de Docentes", 14, 12);
  const head = [["Código","Nombres","Apellidos","F. Nacimiento","Teléfono","Correo","Año"]];
  const rows = cache.map(d => [
    d.codigo, d.nombres, d.apellidos, formatDate(d.fecha_nacimiento),
    d.telefono ?? '', d.correo ?? '', String(d.anio_ingreso)
  ]);
  doc.autoTable({ head, body: rows, startY: 18, styles:{ fontSize:9 }, headStyles:{ fillColor:[255,122,0] } });
  doc.save("docentes.pdf");
});

btnExcel.addEventListener("click", ()=>{
  const rows = cache.map(d => ({
    "Código": d.codigo,
    "Nombres": d.nombres,
    "Apellidos": d.apellidos,
    "F. Nacimiento": formatDate(d.fecha_nacimiento),
    "Teléfono": d.telefono ?? '',
    "Correo": d.correo ?? '',
    "Año": d.anio_ingreso
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Docentes");
  XLSX.writeFile(wb, "docentes.xlsx");
});

(function init(){
  const y = new Date().getFullYear();
  inputs.anioIngreso.setAttribute("max", String(y+1));
  load();
})();
