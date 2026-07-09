const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function fechaLarga(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${String(y).slice(0,2)}.${String(y).slice(2)}`;
}
function mesRef(isoDate) {
  const [y, m] = isoDate.split("-").map(Number);
  return `${MESES[m - 1]} de ${String(y).slice(0,2)}.${String(y).slice(2)}`;
}

function campoSelectOtra(nombre, opciones, label, indiceInicial) {
  const id = `campo_${nombre}`;
  const opts = opciones.map((o, i) =>
    `<option value="${escapeHtml(o)}" ${i === indiceInicial ? "selected" : ""}>${escapeHtml(o)}</option>`
  ).join("");
  return `
    <div class="campo" data-campo="${nombre}">
      ${label ? `<label>${escapeHtml(label)}</label>` : ""}
      <select id="${id}_select">
        ${opts}
        <option value="__otra__">Otra (escribir)…</option>
      </select>
      <textarea id="${id}_otra" style="display:none" rows="2" placeholder="Escribe el texto"></textarea>
    </div>`;
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.innerText = s;
  return d.innerHTML;
}

function valorSelectOtra(nombre) {
  const sel = document.getElementById(`campo_${nombre}_select`);
  if (sel.value === "__otra__") {
    return document.getElementById(`campo_${nombre}_otra`).value.trim();
  }
  return sel.value;
}

function wireSelectOtra(nombre) {
  const sel = document.getElementById(`campo_${nombre}_select`);
  const otra = document.getElementById(`campo_${nombre}_otra`);
  sel.addEventListener("change", () => {
    otra.style.display = sel.value === "__otra__" ? "block" : "none";
  });
}

async function cargar() {
  const app = document.getElementById("app");
  let data, empresasUsadas;
  try {
    const [resCat, resEmp] = await Promise.all([
      fetch("/api/catalogo"),
      fetch("/api/empresas"),
    ]);
    data = await resCat.json();
    empresasUsadas = await resEmp.json();
  } catch (e) {
    app.innerHTML = `<div class="resultado error">No se pudo cargar el formulario. Revisa tu conexión.</div>`;
    return;
  }

  const hoyIso = new Date().toISOString().slice(0, 10);

  let html = `
    <div class="num-informe" id="num-informe">Escribe la empresa para ver el N.° de informe…</div>
    <form id="form-informe">
      <fieldset>
        <legend>Cliente</legend>
        <div class="campo">
          <label>Empresa</label>
          <input type="text" id="empresa" list="lista-empresas" placeholder="Ej: FALABELLA.COM" required>
          <datalist id="lista-empresas">
            ${empresasUsadas.map(e => `<option value="${escapeHtml(e)}">`).join("")}
          </datalist>
        </div>
        <div class="row2">
          <div class="campo">
            <label>Atte. (contacto)</label>
            <input type="text" id="contacto" placeholder="Nombre del contacto" required>
          </div>
          <div class="campo">
            <label>Cargo del contacto</label>
            <input type="text" id="cargo_contacto" placeholder="Ej: Coordinador Administrador" required>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Datos generales</legend>
        <div class="campo">
          <label>Fecha de la visita</label>
          <input type="date" id="fecha_iso" value="${hoyIso}" required>
        </div>
        <div class="campo">
          <label>Párrafo introductorio (puedes dejarlo como está)</label>
          <textarea id="parrafo_intro" rows="4">${escapeHtml(data.parrafo_intro_default)}</textarea>
        </div>
      </fieldset>

      <fieldset>
        <legend>Observaciones (página 1)</legend>
        ${campoSelectOtra("obs1", data.observaciones_1_3, "Observación 1", 0)}
        ${campoSelectOtra("obs2", data.observaciones_1_3, "Observación 2", 1)}
        ${campoSelectOtra("obs3", data.observaciones_1_3, "Observación 3", 2)}
      </fieldset>

      <fieldset>
        <legend>Trabajos efectuados</legend>
        ${campoSelectOtra("trabajo1", data.trabajos_efectuados, "Trabajo 1", 0)}
        ${campoSelectOtra("trabajo2", data.trabajos_efectuados, "Trabajo 2", 1)}
      </fieldset>
  `;

  for (const seccion of data.secciones) {
    html += `<fieldset><legend>${escapeHtml(seccion.titulo)}</legend>`;
    for (const slot of seccion.slots) {
      html += `<div class="slot" data-n="${slot.n}">
        <label class="slot-label">${escapeHtml(slot.label)}</label>
        ${campoSelectOtra(`cap${slot.n}`, slot.frases, "", 0)}
        ${slot.frases2 ? campoSelectOtra(`cap${slot.n}_b`, slot.frases2, "Segunda línea (opcional)", 0) : ""}
        <input type="file" accept="image/*" capture="environment" id="foto_${slot.n}" required>
        <img class="slot-preview" id="preview_${slot.n}" style="display:none">
      </div>`;
    }
    html += `</fieldset>`;
  }

  html += `
      <fieldset>
        <legend>Consumo de gas refrigerante</legend>
        <div class="campo">
          <label>Gas refrigerante adicional</label>
          <input type="text" id="gas_refrigerante" value="(0) cero">
        </div>
      </fieldset>
    </form>
    <button id="enviar">Generar informe</button>
    <div id="resultado"></div>
    <div class="historial" id="historial">
      <h3>Últimos informes de esta empresa</h3>
      <ul><li>Escribe la empresa para ver su historial.</li></ul>
    </div>
  `;

  app.innerHTML = html;

  ["obs1","obs2","obs3","trabajo1","trabajo2"].forEach(wireSelectOtra);
  for (const seccion of data.secciones) {
    for (const slot of seccion.slots) {
      wireSelectOtra(`cap${slot.n}`);
      if (slot.frases2) wireSelectOtra(`cap${slot.n}_b`);
      const input = document.getElementById(`foto_${slot.n}`);
      input.addEventListener("change", () => {
        const preview = document.getElementById(`preview_${slot.n}`);
        if (input.files[0]) {
          preview.src = URL.createObjectURL(input.files[0]);
          preview.style.display = "block";
        }
      });
    }
  }

  let estadoActual = null;
  const empresaInput = document.getElementById("empresa");
  const actualizarEstado = async () => {
    const nombre = empresaInput.value.trim();
    const numDiv = document.getElementById("num-informe");
    const histDiv = document.getElementById("historial");
    if (!nombre) {
      numDiv.textContent = "Escribe la empresa para ver el N.° de informe…";
      estadoActual = null;
      return;
    }
    try {
      const res = await fetch(`/api/estado?empresa=${encodeURIComponent(nombre)}`);
      estadoActual = await res.json();
      numDiv.textContent = `Informe N.° ${estadoActual.proximo_numero} · consecutivo ${nombre}`;
      histDiv.innerHTML = `<h3>Últimos informes de ${escapeHtml(nombre)}</h3><ul>${
        estadoActual.historial.map(h => `<li>N.° ${h.numero} &middot; ${escapeHtml(h.mes_ref)} &middot; <a href="${h.download_url}">${escapeHtml(h.filename)}</a></li>`).join("")
        || "<li>Ningún informe generado todavía para esta empresa.</li>"
      }</ul>`;
    } catch (e) {
      numDiv.textContent = "No se pudo consultar el consecutivo (revisa tu conexión).";
    }
  };
  empresaInput.addEventListener("change", actualizarEstado);
  empresaInput.addEventListener("blur", actualizarEstado);

  document.getElementById("enviar").addEventListener("click", () => enviar(data));
}

async function enviar(data) {
  const boton = document.getElementById("enviar");
  const resultado = document.getElementById("resultado");
  const fechaIso = document.getElementById("fecha_iso").value;
  const empresa = document.getElementById("empresa").value.trim();
  const contacto = document.getElementById("contacto").value.trim();
  const cargo = document.getElementById("cargo_contacto").value.trim();
  if (!fechaIso) { alert("Falta la fecha de la visita"); return; }
  if (!empresa) { alert("Falta el nombre de la empresa"); return; }
  if (!contacto || !cargo) { alert("Falta el contacto o su cargo"); return; }

  const fd = new FormData();
  fd.append("empresa", empresa);
  fd.append("contacto", contacto);
  fd.append("cargo_contacto", cargo);
  fd.append("fecha_carta", fechaLarga(fechaIso));
  fd.append("mes_ref", mesRef(fechaIso));
  fd.append("parrafo_intro", document.getElementById("parrafo_intro").value);
  fd.append("obs1", valorSelectOtra("obs1"));
  fd.append("obs2", valorSelectOtra("obs2"));
  fd.append("obs3", valorSelectOtra("obs3"));
  fd.append("trabajo1", valorSelectOtra("trabajo1"));
  fd.append("trabajo2", valorSelectOtra("trabajo2"));
  fd.append("gas_refrigerante", document.getElementById("gas_refrigerante").value);

  let faltantes = [];
  for (const seccion of data.secciones) {
    for (const slot of seccion.slots) {
      const cap = valorSelectOtra(`cap${slot.n}`);
      const foto = document.getElementById(`foto_${slot.n}`).files[0];
      if (!cap) faltantes.push(`Frase de foto ${slot.n}`);
      if (!foto) faltantes.push(`Foto ${slot.n}`);
      if (slot.n === 17) {
        fd.append("cap17a", cap);
        fd.append("cap17b", valorSelectOtra("cap17_b"));
      } else {
        fd.append(`cap${slot.n}`, cap);
      }
      if (foto) fd.append(`foto${slot.n}`, foto);
    }
  }

  if (faltantes.length) {
    resultado.innerHTML = `<div class="resultado error">Faltan datos: ${faltantes.join(", ")}</div>`;
    return;
  }

  boton.disabled = true;
  boton.textContent = "Generando informe…";
  resultado.innerHTML = "";

  try {
    const res = await fetch("/api/informes", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || "Error al generar el informe");
    resultado.innerHTML = `
      <div class="resultado ok">
        Informe N.° ${json.numero} generado correctamente.
        <br><a href="${json.download_url}" download>Descargar .docx</a>
      </div>`;
  } catch (e) {
    resultado.innerHTML = `<div class="resultado error">${escapeHtml(e.message)}</div>`;
  } finally {
    boton.disabled = false;
    boton.textContent = "Generar informe";
  }
}

cargar();
