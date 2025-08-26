// Lista de PDFs (en la carpeta "pdfs/")
const pdfs = [
  "pdfs/Reglamento de Evaluación de los Aprendizajes.pdf",
  "pdfs/normativa de convivencia pacifica y disciplina para una cultura de paz en los centros educativos.pdf",
  "pdfs/Reglamento interno de disciplina para los alumnos del colegio ciencias comerciales el progreso.pdf",
  "pdfs/REGLAMENTO INTERNO DE TRABAJO.pdf"
];

let currentPDF = 0;
const viewer  = document.getElementById("pdfViewer");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

function loadPDF() {
  viewer.src = pdfs[currentPDF];
  updateButtons();
}

function updateButtons() {
  prevBtn.disabled = currentPDF === 0;
  nextBtn.disabled = currentPDF === pdfs.length - 1;
}

function previousPDF() {
  if (currentPDF > 0) {
    currentPDF--;
    loadPDF();
  }
}

function nextPDF() {
  if (currentPDF < pdfs.length - 1) {
    currentPDF++;
    loadPDF();
  }
}

// Eventos
prevBtn.addEventListener("click", previousPDF);
nextBtn.addEventListener("click", nextPDF);

// Inicial
loadPDF();
