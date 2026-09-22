function escapeHtml(s) {
  const d = document.createElement("div");
  d.innerText = s == null ? "" : s;
  return d.innerHTML;
}

function formatoMoneda(n) {
  return "$ " + Math.round(n || 0).toLocaleString("es-CO");
}

const IVA_PORCENTAJE = 0.19;

let contadorItems = 0;
let tiposPago = [];

function filaVenta() {
  contadorItems += 1;
  const n = contadorItems;
  const hoyIso = new Date().toISOString().slice(0, 10);
  const opcionesPago = tiposPago.map((t, i) => `
      <label>
        <input type="radio" name="pago-${n}" class="v-tipo-pago" value="${escapeHtml(t)}" ${i === 0 ? "checked" : ""}>
        ${escapeHtml(t)}
      </label>`).join("");
  return `
    <div class="item-card" data-item="${n}">
      <button type="button" class="btn-quitar" data-quitar="${n}">✕ Quitar</button>
      <div class="item-num">Venta #${n}</div>
      <div class="campo">
        <label>Fecha</label>
        <input type="date" class="v-fecha" value="${hoyIso}">
      </div>
      <div class="campo">
        <label>Nombre del cliente</label>
        <input type="text" class="v-cliente" placeholder="Nombre completo o razón social">
      </div>
      <div class="row2">
        <div class="campo">
          <label>Cédula / NIT</label>
          <input type="text" class="v-cedula">
        </div>
        <div class="campo">
          <label>Correo y/o teléfono</label>
          <input type="text" class="v-contacto">
        </div>
      </div>
      <div class="campo">
        <label>Descripción</label>
        <input type="text" class="v-descripcion" placeholder="Producto o servicio vendido">
      </div>
      <div class="campo">
        <label>Valor base</label>
        <input type="number" class="v-valor-base" placeholder="0" min="0" step="1">
      </div>
      <div class="campo campo-checkbox">
        <label><input type="checkbox" class="v-aplica-iva" checked> Aplicar IVA (19%)</label>
      </div>
      <div class="campo">
        <label>IVA</label>
        <input type="number" class="v-iva" placeholder="0" min="0" step="1">
      </div>
      <div class="campo">
        <label>Total</label>
        <input type="number" class="v-total" placeholder="0" min="0" step="1">
      </div>
      <div class="campo">
        <label>Tipo de pago</label>
        <div class="tipo-pago-opciones">${opcionesPago}</div>
      </div>
    </div>`;
}

function agregarVenta() {
  const cont = document.getElementById("items-cont");
  cont.insertAdjacentHTML("beforeend", filaVenta());
  wireCard(cont.lastElementChild);
  actualizarResumen();
}

function wireCard(card) {
  card.querySelector(".btn-quitar").addEventListener("click", () => {
    card.remove();
    actualizarResumen();
  });

  const valorBase = card.querySelector(".v-valor-base");
  const aplicaIva = card.querySelector(".v-aplica-iva");
  const iva = card.querySelector(".v-iva");
  const total = card.querySelector(".v-total");

  const recalcularDesdeBase = () => {
    const base = parseFloat(valorBase.value) || 0;
    if (aplicaIva.checked) {
      const ivaCalc = Math.round(base * IVA_PORCENTAJE);
      iva.value = ivaCalc || "";
      total.value = (base + ivaCalc) || "";
    } else {
      iva.value = "";
      total.value = base || "";
    }
    actualizarResumen();
  };
  valorBase.addEventListener("input", recalcularDesdeBase);

  aplicaIva.addEventListener("change", () => {
    iva.disabled = !aplicaIva.checked;
    recalcularDesdeBase();
  });

  const recalcularTotal = () => {
    const base = parseFloat(valorBase.value) || 0;
    const ivaVal = aplicaIva.checked ? (parseFloat(iva.value) || 0) : 0;
    total.value = (base + ivaVal) || "";
    actualizarResumen();
  };
  iva.addEventListener("input", recalcularTotal);
  total.addEventListener("input", actualizarResumen);
}

function leerVentas() {
  return Array.from(document.querySelectorAll(".item-card")).map(card => ({
    fecha: card.querySelector(".v-fecha").value,
    cliente: card.querySelector(".v-cliente").value.trim(),
    cedula: card.querySelector(".v-cedula").value.trim(),
    contacto: card.querySelector(".v-contacto").value.trim(),
    descripcion: card.querySelector(".v-descripcion").value.trim(),
    valor_base: parseFloat(card.querySelector(".v-valor-base").value) || 0,
    iva: parseFloat(card.querySelector(".v-iva").value) || 0,
    total: parseFloat(card.querySelector(".v-total").value) || 0,
    tipo_pago: (card.querySelector(".v-tipo-pago:checked") || {}).value || "",
  }));
}

function actualizarResumen() {
  const ventas = leerVentas();
  const totalBase = ventas.reduce((s, v) => s + v.valor_base, 0);
  const totalIva = ventas.reduce((s, v) => s + v.iva, 0);
  const totalGeneral = ventas.reduce((s, v) => s + v.total, 0);
  document.getElementById("resumen").innerHTML = `
    <div class="linea"><span>N.° de ventas registradas</span><span>${ventas.length}</span></div>
    <div class="linea"><span>Total valor base</span><span>${formatoMoneda(totalBase)}</span></div>
    <div class="linea"><span>Total IVA</span><span>${formatoMoneda(totalIva)}</span></div>
    <div class="linea total"><span>Total general</span><span>${formatoMoneda(totalGeneral)}</span></div>
  `;
}

async function cargar() {
  const app = document.getElementById("app");
  try {
    const res = await fetch("/api/tipos-pago");
    const data = await res.json();
    tiposPago = data.tipos_pago;
  } catch (e) {
    tiposPago = ["Contado", "Transferencia", "Tarjeta"];
  }

  app.innerHTML = `
    <form id="form-ventas">
      <fieldset>
        <legend>Responsable</legend>
        <div class="campo">
          <label>Vendedor / Responsable</label>
          <input type="text" id="responsable">
        </div>
      </fieldset>

      <fieldset>
        <legend>Ventas</legend>
        <div id="items-cont"></div>
        <button type="button" class="btn-agregar" id="btn-agregar">+ Agregar venta</button>
      </fieldset>

      <div class="resumen" id="resumen"></div>
    </form>
    <button id="enviar">Enviar control de ventas</button>
    <div id="resultado"></div>
  `;

  document.getElementById("btn-agregar").addEventListener("click", agregarVenta);
  agregarVenta();

  document.getElementById("enviar").addEventListener("click", enviar);
}

async function enviar() {
  const boton = document.getElementById("enviar");
  const resultado = document.getElementById("resultado");

  const responsable = document.getElementById("responsable").value.trim();
  const ventas = leerVentas().filter(v => v.cliente || v.descripcion || v.total > 0);

  if (!responsable) { alert("Falta el nombre del responsable"); return; }
  if (!ventas.length) { alert("Agrega al menos una venta"); return; }
  if (ventas.some(v => !v.fecha)) { alert("Falta la fecha en alguna de las ventas"); return; }
  if (ventas.some(v => !v.cliente)) { alert("Falta el nombre del cliente en alguna de las ventas"); return; }

  const payload = { responsable, ventas };

  boton.disabled = true;
  boton.textContent = "Enviando…";
  resultado.innerHTML = "";

  try {
    const res = await fetch("/api/ventas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error((json.detail && (json.detail.msg || JSON.stringify(json.detail))) || "Error al generar el control de ventas");
    if (json.enviado_por_correo) {
      resultado.innerHTML = `<div class="resultado ok">✅ Control de ventas generado y enviado por correo.</div>`;
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
    boton.textContent = "Enviar control de ventas";
  }
}

cargar();
