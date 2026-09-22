function escapeHtml(s) {
  const d = document.createElement("div");
  d.innerText = s == null ? "" : s;
  return d.innerHTML;
}

function formatoMoneda(n) {
  return "$ " + Math.round(n || 0).toLocaleString("es-CO");
}

let contadorItems = 0;
const TIPOS_REPUESTO = ["Maquinaria", "Repuesto", "Otro"];

function filaRepuesto() {
  contadorItems += 1;
  const n = contadorItems;
  const hoyIso = new Date().toISOString().slice(0, 10);
  const opcionesTipo = TIPOS_REPUESTO.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
  return `
    <div class="item-card" data-item="${n}">
      <button type="button" class="btn-quitar" data-quitar="${n}">✕ Quitar</button>
      <select class="item-num r-tipo">${opcionesTipo}</select>
      <div class="campo">
        <label>Fecha</label>
        <input type="date" class="r-fecha" value="${hoyIso}">
      </div>
      <div class="campo">
        <label>Descripción</label>
        <input type="text" class="r-descripcion" placeholder="Ej: Filtro de aire, compresor...">
      </div>
      <div class="campo">
        <label>Valor</label>
        <input type="number" class="r-valor" placeholder="0" min="0" step="1">
      </div>
    </div>`;
}

function agregarRepuesto() {
  const cont = document.getElementById("items-cont");
  cont.insertAdjacentHTML("beforeend", filaRepuesto());
  wireCard(cont.lastElementChild);
  actualizarResumen();
}

function wireCard(card) {
  card.querySelector(".btn-quitar").addEventListener("click", () => {
    card.remove();
    actualizarResumen();
  });
  card.querySelector(".r-valor").addEventListener("input", actualizarResumen);
}

function leerRepuestos() {
  return Array.from(document.querySelectorAll(".item-card")).map(card => ({
    tipo: card.querySelector(".r-tipo").value,
    fecha: card.querySelector(".r-fecha").value,
    descripcion: card.querySelector(".r-descripcion").value.trim(),
    valor: parseFloat(card.querySelector(".r-valor").value) || 0,
  }));
}

function actualizarResumen() {
  const repuestos = leerRepuestos();
  const total = repuestos.reduce((s, r) => s + r.valor, 0);
  document.getElementById("resumen").innerHTML = `
    <div class="linea"><span>N.° de repuestos registrados</span><span>${repuestos.length}</span></div>
    <div class="linea total"><span>Total</span><span>${formatoMoneda(total)}</span></div>
  `;
}

async function cargar() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <form id="form-repuestos">
      <fieldset>
        <legend>Responsable</legend>
        <div class="campo">
          <label>Técnico / Responsable</label>
          <input type="text" id="responsable">
        </div>
      </fieldset>

      <fieldset>
        <legend>Repuestos</legend>
        <div id="items-cont"></div>
        <button type="button" class="btn-agregar" id="btn-agregar">+ Agregar repuesto</button>
      </fieldset>

      <div class="resumen" id="resumen"></div>
    </form>
    <button id="enviar">Enviar repuestos</button>
    <div id="resultado"></div>
  `;

  document.getElementById("btn-agregar").addEventListener("click", agregarRepuesto);
  agregarRepuesto();

  document.getElementById("enviar").addEventListener("click", enviar);
}

async function enviar() {
  const boton = document.getElementById("enviar");
  const resultado = document.getElementById("resultado");

  const responsable = document.getElementById("responsable").value.trim();
  const repuestos = leerRepuestos().filter(r => r.valor > 0 || r.descripcion);

  if (!responsable) { alert("Falta el nombre del responsable"); return; }
  if (!repuestos.length) { alert("Agrega al menos un repuesto con su valor o descripción"); return; }
  if (repuestos.some(r => !r.fecha)) { alert("Falta la fecha en alguno de los repuestos"); return; }

  const payload = { responsable, repuestos };

  boton.disabled = true;
  boton.textContent = "Enviando…";
  resultado.innerHTML = "";

  try {
    const res = await fetch("/api/repuestos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error((json.detail && (json.detail.msg || JSON.stringify(json.detail))) || "Error al generar la relación de repuestos");
    if (json.enviado_por_correo) {
      resultado.innerHTML = `<div class="resultado ok">✅ Relación de repuestos generada y enviada por correo.</div>`;
    } else {
      resultado.innerHTML = `
        <div class="resultado error">
          El archivo se generó, pero no se pudo enviar por correo.
          <br>Avisa a tu supervisor: ${escapeHtml(json.error_envio || "")}
        </div>`;
    }
  } catch (e) {
    resultado.innerHTML = `<div class="resultado error">${escapeHtml(e.message)}</div>`;
  } finally {
    boton.disabled = false;
    boton.textContent = "Enviar repuestos";
  }
}

cargar();
