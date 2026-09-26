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
let productos = [];   // inventario (Google Sheet); vacío = formulario sin inventario

const etiquetaProducto = p => `${p.codigo} · ${p.producto} (disp. ${p.stock})`;
const buscarProducto = txt => productos.find(p => etiquetaProducto(p) === txt.trim());

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
      ${productos.length ? `
      <div class="campo">
        <label>Producto del inventario</label>
        <input type="text" class="v-producto" list="dl-productos" placeholder="Escribe código o nombre y elige de la lista">
        <small class="v-disp" style="color:var(--gris)"></small>
      </div>
      <div class="row2">
        <div class="campo">
          <label>Cantidad</label>
          <input type="number" class="v-cantidad" min="0" step="1" placeholder="0">
        </div>
        <div class="campo">
          <label>Precio unitario (sin IVA)</label>
          <input type="number" class="v-precio" min="0" step="1" placeholder="0">
        </div>
      </div>` : ""}
      <div class="campo">
        <label>${productos.length ? "Nota (opcional)" : "Descripción"}</label>
        <input type="text" class="v-descripcion" placeholder="${productos.length ? "Observación de la venta" : "Producto o servicio vendido"}">
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

  const inpProd = card.querySelector(".v-producto");
  if (inpProd) {
    const cant = card.querySelector(".v-cantidad");
    const precio = card.querySelector(".v-precio");
    const disp = card.querySelector(".v-disp");
    const desdeProducto = () => {
      const p = buscarProducto(inpProd.value);
      const q = parseFloat(cant.value) || 0;
      disp.textContent = p ? `Disponible: ${p.stock}` + (q > p.stock ? " — ⚠ la cantidad supera el stock" : "") : "";
      valorBase.value = Math.round(q * (parseFloat(precio.value) || 0)) || "";
      recalcularDesdeBase();
    };
    [inpProd, cant, precio].forEach(el => el.addEventListener("input", desdeProducto));
  }

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

function datosProducto(card) {
  const inp = card.querySelector(".v-producto");
  if (!inp || !inp.value.trim()) return {};
  const p = buscarProducto(inp.value);
  if (!p) return { producto_invalido: inp.value.trim() };
  return {
    codigo: p.codigo,
    cantidad: parseFloat(card.querySelector(".v-cantidad").value) || 0,
    precio_unit: parseFloat(card.querySelector(".v-precio").value) || 0,
    descripcion_prod: p.producto,
  };
}

function leerVentas() {
  return Array.from(document.querySelectorAll(".item-card")).map(card => ({
    fecha: card.querySelector(".v-fecha").value,
    cliente: card.querySelector(".v-cliente").value.trim(),
    cedula: card.querySelector(".v-cedula").value.trim(),
    contacto: card.querySelector(".v-contacto").value.trim(),
    descripcion: [ (datosProducto(card).descripcion_prod || ""), card.querySelector(".v-descripcion").value.trim() ].filter(Boolean).join(" — "),
    valor_base: parseFloat(card.querySelector(".v-valor-base").value) || 0,
    iva: parseFloat(card.querySelector(".v-iva").value) || 0,
    total: parseFloat(card.querySelector(".v-total").value) || 0,
    tipo_pago: (card.querySelector(".v-tipo-pago:checked") || {}).value || "",
    ...datosProducto(card),
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

  try {
    const r = await fetch("/api/inventario");
    const d = await r.json();
    if (r.ok && d.configurado) productos = d.productos;
  } catch (e) { productos = []; }

  app.innerHTML = `
    <datalist id="dl-productos">${productos.map(p => `<option value="${escapeHtml(etiquetaProducto(p))}">`).join("")}</datalist>
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
  const inv = ventas.find(v => v.producto_invalido);
  if (inv) { alert("Elige el producto de la lista desplegable: \"" + inv.producto_invalido + "\""); return; }
  if (ventas.some(v => v.codigo && (!(v.cantidad > 0) || !(v.precio_unit > 0)))) { alert("Falta cantidad o precio unitario en un producto del inventario"); return; }

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
    const invTxt = (json.inventario || []).length ? "<br>Inventario actualizado." : "";
    if (json.enviado_por_correo) {
      resultado.innerHTML = `<div class="resultado ok">✅ Control de ventas generado y enviado por correo.${invTxt}</div>`;
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
