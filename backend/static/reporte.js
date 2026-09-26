function escapeHtml(s) {
  const d = document.createElement("div");
  d.innerText = s == null ? "" : s;
  return d.innerHTML;
}

// Reduce la foto en el celular antes de subirla (las de cámara pesan 5-10 MB).
function comprimir(file, maxDim = 1400, calidad = 0.8) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, maxDim / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => resolve(b || file), "image/jpeg", calidad);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

function renumerar() {
  document.querySelectorAll(".item-card").forEach((card, i) => {
    card.querySelector(".num").textContent = "Entrada " + (i + 1);
  });
}

function agregarEntrada() {
  const cont = document.getElementById("items-cont");
  cont.insertAdjacentHTML("beforeend", `
    <div class="item-card">
      <button type="button" class="btn-quitar">✕ Quitar</button>
      <div class="num"></div>
      <div class="campo">
        <label>Descripción del trabajo</label>
        <textarea class="e-texto" rows="3" placeholder="¿Qué se hizo o qué se encontró?"></textarea>
      </div>
      <div class="campo">
        <label>Foto</label>
        <input type="file" accept="image/*" class="e-foto">
        <img class="foto-prev">
      </div>
    </div>`);
  const card = cont.lastElementChild;
  card.querySelector(".btn-quitar").addEventListener("click", () => { card.remove(); renumerar(); });
  card.querySelector(".e-foto").addEventListener("change", ev => {
    const f = ev.target.files[0];
    const prev = card.querySelector(".foto-prev");
    if (f) { prev.src = URL.createObjectURL(f); prev.style.display = "block"; }
    else prev.style.display = "none";
  });
  renumerar();
}

function cargar() {
  const hoy = new Date().toISOString().slice(0, 10);
  document.getElementById("app").innerHTML = `
    <fieldset>
      <legend>Datos</legend>
      <div class="campo"><label>Fecha</label><input type="date" id="fecha" value="${hoy}"></div>
      <div class="campo"><label>Nombre del técnico</label><input type="text" id="tecnico"></div>
      <div class="campo"><label>Lugar de la operación</label><input type="text" id="lugar"></div>
      <div class="campo"><label>Responsable del área</label><input type="text" id="responsable_area"></div>
    </fieldset>
    <fieldset>
      <legend>Trabajos</legend>
      <div id="items-cont"></div>
      <button type="button" class="btn-agregar" id="btn-agregar">+ Agregar otro texto con foto</button>
    </fieldset>
    <button id="enviar">Enviar reporte</button>
    <div id="resultado"></div>`;
  document.getElementById("btn-agregar").addEventListener("click", agregarEntrada);
  document.getElementById("enviar").addEventListener("click", enviar);
  agregarEntrada();
}

async function enviar() {
  const boton = document.getElementById("enviar");
  const resultado = document.getElementById("resultado");
  const v = id => document.getElementById(id).value.trim();
  const campos = { fecha: v("fecha"), tecnico: v("tecnico"), lugar: v("lugar"), responsable_area: v("responsable_area") };
  const nombres = { fecha: "la fecha", tecnico: "el nombre del técnico", lugar: "el lugar de la operación", responsable_area: "el responsable del área" };
  for (const k in campos) if (!campos[k]) { alert("Falta " + nombres[k]); return; }

  const cards = Array.from(document.querySelectorAll(".item-card"))
    .filter(c => c.querySelector(".e-texto").value.trim() || c.querySelector(".e-foto").files[0]);
  if (!cards.length) { alert("Agrega al menos un texto o una foto"); return; }

  boton.disabled = true;
  boton.textContent = "Enviando…";
  resultado.innerHTML = "";
  try {
    const fd = new FormData();
    for (const k in campos) fd.append(k, campos[k]);
    fd.append("n_entradas", cards.length);
    for (let i = 0; i < cards.length; i++) {
      fd.append("texto_" + i, cards[i].querySelector(".e-texto").value.trim());
      const f = cards[i].querySelector(".e-foto").files[0];
      if (f) fd.append("foto_" + i, await comprimir(f), "foto.jpg");
    }
    const res = await fetch("/api/reporte", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error((json.detail && (json.detail.msg || JSON.stringify(json.detail))) || "Error al generar el reporte");
    resultado.innerHTML = json.enviado_por_correo
      ? `<div class="resultado ok">✅ Reporte generado y enviado por correo.</div>`
      : `<div class="resultado error">El reporte se generó, pero no se pudo enviar por correo.<br>Avisa a tu supervisor: ${escapeHtml(json.error_envio || "")}</div>`;
  } catch (e) {
    resultado.innerHTML = `<div class="resultado error">${escapeHtml(e.message)}</div>`;
  } finally {
    boton.disabled = false;
    boton.textContent = "Enviar reporte";
  }
}

cargar();
