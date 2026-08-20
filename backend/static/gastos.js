function escapeHtml(s) {
  const d = document.createElement("div");
  d.innerText = s == null ? "" : s;
  return d.innerHTML;
}

function formatoMoneda(n) {
  return "$ " + Math.round(n || 0).toLocaleString("es-CO");
}

let contadorGastos = 0;
let flotaData = {};
let tiposGasto = [];

function filaGasto() {
  contadorGastos += 1;
  const n = contadorGastos;
  const opciones = tiposGasto.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
  return `
    <div class="gasto-card" data-gasto="${n}">
      <button type="button" class="btn-quitar" data-quitar="${n}">✕ Quitar</button>
      <div class="gasto-num">Gasto #${n}</div>
      <div class="campo">
        <label>Tipo de gasto</label>
        <select class="g-tipo">${opciones}</select>
      </div>
      <div class="row2">
        <div class="campo">
          <label>Ciudad / lugar</label>
          <input type="text" class="g-ciudad" placeholder="Ej: Villavicencio">
        </div>
        <div class="campo">
          <label>Valor</label>
          <input type="number" class="g-valor" placeholder="0" min="0" step="1">
        </div>
      </div>
      <div class="campo">
        <label>Tercero (a quién se le pagó)</label>
        <input type="text" class="g-tercero" placeholder="Nombre de la persona o establecimiento">
      </div>
      <div class="row2">
        <div class="campo">
          <label>Cédula / NIT del tercero</label>
          <input type="text" class="g-cedula" placeholder="Opcional">
        </div>
        <div class="campo">
          <label>Teléfono del tercero</label>
          <input type="text" class="g-telefono" placeholder="Opcional">
        </div>
      </div>
      <div class="campo">
        <label>Detalle (opcional)</label>
        <input type="text" class="g-detalle" placeholder="Ej: Cabezote, llanta trasera derecha...">
      </div>
    </div>`;
}

function agregarGasto() {
  const cont = document.getElementById("gastos-cont");
  cont.insertAdjacentHTML("beforeend", filaGasto());
  wireGastoCard(cont.lastElementChild);
  actualizarResumen();
}

function wireGastoCard(card) {
  card.querySelector(".btn-quitar").addEventListener("click", () => {
    card.remove();
    actualizarResumen();
  });
  card.querySelector(".g-valor").addEventListener("input", actualizarResumen);
  card.querySelector(".g-tipo").addEventListener("change", actualizarResumen);
}

function leerGastos() {
  return Array.from(document.querySelectorAll(".gasto-card")).map(card => ({
    tipo: card.querySelector(".g-tipo").value,
    ciudad: card.querySelector(".g-ciudad").value.trim(),
    tercero: card.querySelector(".g-tercero").value.trim(),
    cedula: card.querySelector(".g-cedula").value.trim(),
    telefono: card.querySelector(".g-telefono").value.trim(),
    detalle: card.querySelector(".g-detalle").value.trim(),
    valor: parseFloat(card.querySelector(".g-valor").value) || 0,
  }));
}

function actualizarResumen() {
  const gastos = leerGastos();
  const total = gastos.reduce((s, g) => s + g.valor, 0);
  const anticipo = parseFloat(document.getElementById("anticipo").value) || 0;
  const saldo = total - anticipo;

  let saldoHtml;
  if (Math.abs(saldo) < 1) {
    saldoHtml = `<div class="linea">Saldo: sin diferencia</div>`;
  } else if (saldo > 0) {
    saldoHtml = `<div class="linea saldo-conductor"><span>A favor del conductor</span><span>${formatoMoneda(saldo)}</span></div>`;
  } else {
    saldoHtml = `<div class="linea saldo-empresa"><span>A favor de la empresa</span><span>${formatoMoneda(Math.abs(saldo))}</span></div>`;
  }

  document.getElementById("resumen").innerHTML = `
    <div class="linea"><span>N.° de gastos registrados</span><span>${gastos.length}</span></div>
    <div class="linea"><span>Anticipo</span><span>${formatoMoneda(anticipo)}</span></div>
    <div class="linea total"><span>Total de gastos</span><span>${formatoMoneda(total)}</span></div>
    ${saldoHtml}
  `;
}

async function cargar() {
  const app = document.getElementById("app");
  let data;
  try {
    const res = await fetch("/api/flota");
    data = await res.json();
  } catch (e) {
    app.innerHTML = `<div class="resultado error">No se pudo cargar el formulario. Revisa tu conexión.</div>`;
    return;
  }
  flotaData = data.vehiculos;
  tiposGasto = data.tipos_gasto;

  const opcionesPlaca = Object.keys(flotaData)
    .map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");
  const hoyIso = new Date().toISOString().slice(0, 10);

  app.innerHTML = `
    <form id="form-gastos">
      <fieldset>
        <legend>Datos del viaje</legend>
        <div class="row2">
          <div class="campo">
            <label>Placa</label>
            <select id="placa">
              ${opcionesPlaca}
              <option value="__otra__">Otra (escribir)…</option>
            </select>
          </div>
          <div class="campo" id="placa-otra-campo" style="display:none">
            <label>Escribe la placa</label>
            <input type="text" id="placa-otra">
          </div>
        </div>
        <div class="row2">
          <div class="campo">
            <label>Conductor</label>
            <input type="text" id="conductor">
          </div>
          <div class="campo">
            <label>Cédula conductor</label>
            <input type="text" id="cedula_conductor">
          </div>
        </div>
        <div class="row2">
          <div class="campo">
            <label>Fecha inicio</label>
            <input type="date" id="fecha_inicio" value="${hoyIso}">
          </div>
          <div class="campo">
            <label>Fecha fin</label>
            <input type="date" id="fecha_fin" value="${hoyIso}">
          </div>
        </div>
        <div class="row2">
          <div class="campo">
            <label>Origen</label>
            <input type="text" id="origen">
          </div>
          <div class="campo">
            <label>Destino</label>
            <input type="text" id="destino">
          </div>
        </div>
        <div class="row2">
          <div class="campo">
            <label>KM inicial</label>
            <input type="text" id="km_inicial">
          </div>
          <div class="campo">
            <label>KM final</label>
            <input type="text" id="km_final">
          </div>
        </div>
        <div class="row2">
          <div class="campo">
            <label>Manifiesto No.</label>
            <input type="text" id="manifiesto">
          </div>
          <div class="campo">
            <label>Guía No.</label>
            <input type="text" id="guia">
          </div>
        </div>
        <div class="row2">
          <div class="campo">
            <label>Producto</label>
            <input type="text" id="producto">
          </div>
          <div class="campo">
            <label>Cliente</label>
            <input type="text" id="cliente">
          </div>
        </div>
        <div class="row2">
          <div class="campo">
            <label>Barriles</label>
            <input type="text" id="barriles">
          </div>
          <div class="campo">
            <label>Anticipo entregado</label>
            <input type="number" id="anticipo" placeholder="0" min="0" step="1">
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Gastos</legend>
        <div id="gastos-cont"></div>
        <button type="button" class="btn-agregar" id="btn-agregar">+ Agregar gasto</button>
      </fieldset>

      <div class="resumen" id="resumen"></div>
    </form>
    <button id="enviar">Enviar relación de gastos</button>
    <div id="resultado"></div>
  `;

  const selectPlaca = document.getElementById("placa");
  const otraCampo = document.getElementById("placa-otra-campo");
  const otraInput = document.getElementById("placa-otra");
  const conductorInput = document.getElementById("conductor");
  const cedulaInput = document.getElementById("cedula_conductor");

  const aplicarPlaca = () => {
    if (selectPlaca.value === "__otra__") {
      otraCampo.style.display = "block";
      conductorInput.value = "";
      cedulaInput.value = "";
    } else {
      otraCampo.style.display = "none";
      const info = flotaData[selectPlaca.value];
      if (info) {
        conductorInput.value = info.conductor;
        cedulaInput.value = info.cedula;
      }
    }
  };
  selectPlaca.addEventListener("change", aplicarPlaca);
  aplicarPlaca();

  document.getElementById("anticipo").addEventListener("input", actualizarResumen);
  document.getElementById("btn-agregar").addEventListener("click", agregarGasto);
  agregarGasto();

  document.getElementById("enviar").addEventListener("click", enviar);
}

async function enviar() {
  const boton = document.getElementById("enviar");
  const resultado = document.getElementById("resultado");

  const selectPlaca = document.getElementById("placa");
  const placa = selectPlaca.value === "__otra__"
    ? document.getElementById("placa-otra").value.trim()
    : selectPlaca.value;
  const conductor = document.getElementById("conductor").value.trim();
  const fechaInicio = document.getElementById("fecha_inicio").value;
  const fechaFin = document.getElementById("fecha_fin").value;
  const gastos = leerGastos().filter(g => g.valor > 0 || g.tercero || g.ciudad);

  if (!placa) { alert("Falta la placa"); return; }
  if (!conductor) { alert("Falta el nombre del conductor"); return; }
  if (!fechaInicio || !fechaFin) { alert("Faltan las fechas del viaje"); return; }
  if (!gastos.length) { alert("Agrega al menos un gasto con su valor"); return; }

  const payload = {
    placa,
    conductor,
    cedula_conductor: document.getElementById("cedula_conductor").value.trim(),
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    km_inicial: document.getElementById("km_inicial").value.trim(),
    km_final: document.getElementById("km_final").value.trim(),
    origen: document.getElementById("origen").value.trim(),
    destino: document.getElementById("destino").value.trim(),
    manifiesto: document.getElementById("manifiesto").value.trim(),
    guia: document.getElementById("guia").value.trim(),
    producto: document.getElementById("producto").value.trim(),
    cliente: document.getElementById("cliente").value.trim(),
    barriles: document.getElementById("barriles").value.trim(),
    anticipo: parseFloat(document.getElementById("anticipo").value) || 0,
    gastos,
  };

  boton.disabled = true;
  boton.textContent = "Enviando…";
  resultado.innerHTML = "";

  try {
    const res = await fetch("/api/gastos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error((json.detail && (json.detail.msg || JSON.stringify(json.detail))) || "Error al generar la relación de gastos");
    if (json.enviado_por_correo) {
      resultado.innerHTML = `<div class="resultado ok">✅ Relación de gastos generada y enviada por correo.</div>`;
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
    boton.textContent = "Enviar relación de gastos";
  }
}

cargar();
