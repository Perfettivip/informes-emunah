const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function fechaLarga(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${String(y).slice(0,1)}.${String(y).slice(1)}`;
}
function mesRef(isoDate) {
  const [y, m] = isoDate.split("-").map(Number);
  return `${MESES[m - 1]} de ${String(y).slice(0,1)}.${String(y).slice(1)}`;
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.innerText = s;
  return d.innerHTML;
}

// ==========================================
// DICCIONARIO DE DESCRIPCIONES AUTOMÁTICAS
// (Actualizado según Documento Técnico Oficial)
// ==========================================
const PERFILES_REPARACION = {
  "VRV Daikin - Preventivo": {
    intro: "Se realizó mantenimiento preventivo al sistema VRV Daikin, unidades condensadoras y unidades interiores, del cual salen las siguientes observaciones.",
    obs1: "Revisión visual de conexiones y contactos eléctricos, verificando ausencia de suciedad, deterioro o calentamiento.",
    obs2: "Inspección de las unidades exteriores, estado de ventiladores y componentes eléctricos.",
    obs3: "Sistema operando dentro de los parámetros técnicos establecidos.",
    trabajo1: "Mantenimiento preventivo general: Inspección y limpieza de componentes accesibles del sistema, incluyendo filtros, serpentines, rejillas y elementos de unidades interiores.",
    trabajo2: "Mantenimiento preventivo de unidades exteriores: Limpieza de la unidad exterior, revisión de serpentines y condiciones de operación de la unidad condensadora.",
    caps: {
      1: "VISTA GENERAL Y LIMPIEZA EXTERNA DE UNIDAD CONDENSADORA VRV DAIKIN.",
      2: "REVISIÓN DE SERPENTINES Y COMPONENTES INTERNOS.",
      3: "USO DE EPP PARA INTERVENCIÓN EN ÁREA TÉCNICA.",
      4: "INSPECCIÓN DE CONEXIONES ELÉCTRICAS Y FRIGORÍFICAS.",
      5: "ESTADO DE ALETAS DE SERPENTÍN DE CONDENSACIÓN.",
      6: "DESARME Y LIMPIEZA DE FILTROS EN UNIDADES INTERIORES.",
      7: "REINSTALACIÓN DE FILTROS LIMPIOS.",
      8: "ESTADO INICIAL DE FILTROS Y EQUIPO INTERIOR.",
      9: "LIMPIEZA DE FILTROS DE UNIDADES INTERIORES.",
      10: "MONTAJE FINAL DE FILTROS Y REJILLAS.",
      11: "UNIDAD INTERIOR LIMPIA Y ARMADA.",
      12: "REVISIÓN DE MOTORES Y VENTILADORES.",
      13: "TAPAS Y REJILLAS DE RETORNO ASEADAS.",
      14: "VERIFICACIÓN DE ÁREA DE OPERACIÓN.",
      15: "INSPECCIÓN DE TABLERO ELÉCTRICO PRINCIPAL.",
      16: "VERIFICACIÓN DE AISLAMIENTO EN TUBERÍA A LA VISTA.",
      17: "REVISIÓN GENERAL FINAL DEL SISTEMA VRV.",
      "17b": "EQUIPO OPERATIVO."
    }
  },
  
  "VRV Daikin - Correctivo (Refrigerante/Conexiones)": {
    intro: "Se realizó mantenimiento correctivo al sistema VRV Daikin, atendiendo la condición reportada en la carga de refrigerante y en las conexiones, del cual salen las siguientes observaciones.",
    obs1: "Se identifica condición relacionada con la carga de refrigerante.",
    obs2: "Se detectan anomalías en las conexiones que requieren intervención.",
    obs3: "Ajustes realizados de acuerdo con las condiciones operativas del sistema.",
    trabajo1: "Mantenimiento correctivo de refrigerante: Ajuste o corrección de la carga de gas refrigerante, de acuerdo con las condiciones técnicas del sistema.",
    trabajo2: "Inspección y corrección de conexiones: Revisión de conexiones eléctricas y frigoríficas, realizando los ajustes y correcciones necesarios.",
    caps: {
      1: "INTERVENCIÓN EN UNIDAD CONDENSADORA VRV POR ALARMA TÉCNICA.",
      2: "VERIFICACIÓN DE COMPONENTES INTERNOS Y TUBERÍA.",
      3: "USO DE EPP DURANTE EL PROCEDIMIENTO CORRECTIVO.",
      4: "INSPECCIÓN Y CORRECCIÓN DE CONEXIONES FRIGORÍFICAS Y ELÉCTRICAS.",
      5: "VERIFICACIÓN DE INTEGRIDAD DE SERPENTINES.",
      6: "REVISIÓN DE UNIDADES INTERIORES ASOCIADAS AL CIRCUITO.",
      7: "MONITOREO DE PRESIONES DE TRABAJO.",
      8: "VERIFICACIÓN DE PARÁMETROS INICIALES.",
      9: "PROCEDIMIENTO DE AJUSTE O CORRECCIÓN EN EL SISTEMA.",
      10: "MONITOREO DE TEMPERATURAS DE INYECCIÓN Y RETORNO.",
      11: "PRUEBAS DE FUNCIONAMIENTO EN UNIDAD INTERIOR.",
      12: "MEDICIÓN DE AMPERAJE Y CONDICIONES ELÉCTRICAS.",
      13: "CIERRE DE PANELES TRAS INTERVENCIÓN.",
      14: "VERIFICACIÓN FINAL EN ZONA DE OPERACIÓN.",
      15: "TABLERO ELÉCTRICO CERRADO TRAS AJUSTES.",
      16: "REVISIÓN DE AISLAMIENTO EN ZONAS INTERVENIDAS.",
      17: "VERIFICACIÓN FINAL DEL SISTEMA VRV EN MARCHA.",
      "17b": "SE RESTABLECEN PARÁMETROS NORMALES DE OPERACIÓN."
    }
  },

  "Condensadora en Cubierta - Preventivo Profundo": {
    intro: "Se realizó mantenimiento preventivo profundo a las unidades condensadoras ubicadas en cubierta, del cual salen las siguientes observaciones.",
    obs1: "Equipos ubicados en cubierta técnica requieren trabajo en altura seguro.",
    obs2: "Acumulación de suciedad que requiere lavado a presión.",
    obs3: "Se realiza inspección visual y técnica de contactos sin novedades graves.",
    trabajo1: "Mantenimiento preventivo profundo: Limpieza profunda de la unidad mediante lavado a presión, incluyendo serpentines, ventiladores y estructura exterior.",
    trabajo2: "Revisión de componentes eléctricos: Inspección visual y técnica de contactos, conexiones y componentes eléctricos, identificando signos de deterioro.",
    caps: {
      1: "LAVADO Y LIMPIEZA EXTERNA DE UNIDAD CONDENSADORA EN CUBIERTA.",
      2: "LIMPIEZA A PRESIÓN DE SERPENTINES Y VENTILADORES.",
      3: "TRABAJO EN ALTURA: USO DE ARNÉS DE SEGURIDAD Y EPP COMPLETO.",
      4: "INSPECCIÓN TÉCNICA DE CONEXIONES ELÉCTRICAS TRAS LAVADO.",
      5: "ESTADO FINAL DE ALETAS DE SERPENTÍN DESPUÉS DE LIMPIEZA PROFUNDA.",
      6: "VERIFICACIÓN DE COMPONENTES ADYACENTES.",
      7: "ARMADO Y CIERRE DE PANELES EXTERIORES.",
      8: "ESTADO INICIAL DE LA CONDENSADORA (EVIDENCIA DE SUCIEDAD).",
      9: "PROCESO DE LAVADO A PRESIÓN EN CUBIERTA.",
      10: "SECADO Y VERIFICACIÓN DE PARTES INTERNAS.",
      11: "VERIFICACIÓN DE DRENAJES Y ENTORNO DE CUBIERTA.",
      12: "REVISIÓN DE MOTORES Y ROTACIÓN DE VENTILADORES.",
      13: "MONTAJE DE REJILLAS DE PROTECCIÓN.",
      14: "LIMPIEZA DEL ÁREA CIRCUNDANTE EN CUBIERTA.",
      15: "PRUEBA ELÉCTRICA EN TABLERO DE LA CONDENSADORA.",
      16: "REVISIÓN DE AISLAMIENTO TÉRMICO EXPUESTO A INTEMPERIE.",
      17: "REVISIÓN FINAL DEL EQUIPO EN CUBIERTA.",
      "17b": "RETIRO DE MATERIAL SOBRANTE Y HERRAMIENTAS DE LA CUBIERTA."
    }
  },

  "Manejadora Convencional - Preventivo": {
    intro: "Se realizó mantenimiento preventivo a la unidad manejadora de aire (UMA) y sus componentes, del cual salen las siguientes observaciones.",
    obs1: "Se verifica el estado general de los elementos relacionados con la circulación y distribución de aire.",
    obs2: "Limpieza de serpentines realizada para mantener condiciones adecuadas de transferencia de calor.",
    obs3: "Contactos y conexiones eléctricas inspeccionadas correctamente.",
    trabajo1: "Mantenimiento preventivo general: Limpieza de filtros, serpentines, bandejas y componentes accesibles. Revisión general del estado físico y operativo.",
    trabajo2: "Limpieza de filtros y serpentines: Extracción, limpieza y reinstalación de filtros de aire. Retiro de suciedad acumulada en los serpentines de intercambio térmico.",
    caps: {
      1: "VISTA GENERAL DE UNIDAD MANEJADORA DE AIRE (UMA).",
      2: "APERTURA Y REVISIÓN DE COMPONENTES INTERNOS.",
      3: "USO DE EPP PARA INTERVENCIÓN EN CUARTO DE MÁQUINAS.",
      4: "INSPECCIÓN DE CONEXIONES ELÉCTRICAS Y TABLERO DE CONTROL.",
      5: "ESTADO DE ALETAS Y LIMPIEZA DE SERPENTÍN DE INTERCAMBIO.",
      6: "EXTRACCIÓN Y LIMPIEZA DE FILTROS DE AIRE.",
      7: "REINSTALACIÓN DE FILTROS LIMPIOS.",
      8: "ESTADO INICIAL DE FILTROS Y BANDEJA DE CONDENSADOS.",
      9: "LIMPIEZA DE BANDEJA Y SISTEMA DE DRENAJE.",
      10: "VERIFICACIÓN DE SISTEMA DE TRANSMISIÓN (POLEAS/CORREAS).",
      11: "UNIDAD MANEJADORA LIMPIA E INSPECCIONADA.",
      12: "REVISIÓN DE VENTILADOR (BLOWER) Y MOTOR.",
      13: "CIERRE DE COMPUERTAS DE ACCESO.",
      14: "VERIFICACIÓN DE DISTRIBUCIÓN DE AIRE.",
      15: "PRUEBAS ELÉCTRICAS EN TABLERO DE CONTROL.",
      16: "INSPECCIÓN DE CONEXIONES CON DUCTOS PRINCIPALES.",
      17: "VERIFICACIÓN GENERAL Y ARRANQUE DEL EQUIPO.",
      "17b": "SISTEMA DE CIRCULACIÓN DE AIRE OPERANDO NORMALMENTE."
    }
  },

  "Cassette / Fancoil - Preventivo": {
    intro: "Se realizó mantenimiento preventivo a las unidades tipo cassette / fancoil, del cual salen las siguientes observaciones.",
    obs1: "Verificación de bandeja de drenaje y sistema de evacuación de condensados sin obstrucciones.",
    obs2: "Filtros y serpentín limpios para favorecer un adecuado intercambio térmico.",
    obs3: "Ventilador sin vibraciones ni ruidos anormales.",
    trabajo1: "Mantenimiento preventivo general: Limpieza de filtros, paneles, rejillas, serpentín, ventilador y superficies accesibles del equipo interior.",
    trabajo2: "Limpieza y revisión de bandeja de drenaje: Inspección del sistema de evacuación de condensados para evitar obstrucciones o fugas de agua.",
    caps: {
      1: "VISTA INICIAL DE UNIDAD TIPO CASSETTE / FANCOIL.",
      2: "APERTURA DE PANEL Y ACCESO A COMPONENTES INTERNOS.",
      3: "USO DE EPP Y PREPARACIÓN DEL ÁREA DE TRABAJO.",
      4: "INSPECCIÓN DE CONEXIONES ELÉCTRICAS Y PLACA DE CONTROL.",
      5: "LIMPIEZA DE SERPENTÍN DE INTERCAMBIO TÉRMICO.",
      6: "RETIRO Y LIMPIEZA DE FILTROS Y REJILLA PRINCIPAL.",
      7: "INSTALACIÓN DE FILTROS LIMPIOS Y SECOS.",
      8: "ESTADO INICIAL DE FILTROS SATURADOS DE POLVO.",
      9: "INSPECCIÓN Y LIMPIEZA DE BANDEJA DE DRENAJE.",
      10: "VERIFICACIÓN DE BOMBA DE CONDENSADOS (SI APLICA).",
      11: "UNIDAD INTERIOR LIMPIA Y PARCIALMENTE ARMADA.",
      12: "REVISIÓN DE VENTILADOR CENTRÍFUGO Y MOTOR.",
      13: "MONTAJE DE REJILLAS Y PANEL DECORATIVO.",
      14: "LIMPIEZA EXTERNA DEL EQUIPO FINALIZADA.",
      15: "PRUEBA DE ARRANQUE Y FUNCIONAMIENTO ELÉCTRICO.",
      16: "VERIFICACIÓN DE INYECCIÓN DE AIRE.",
      17: "REVISIÓN GENERAL DEL EQUIPO INTERIOR EN OPERACIÓN.",
      "17b": "ÁREA DE TRABAJO LIMPIA Y ORDENADA."
    }
  },

  "MiniSplit - Preventivo": {
    intro: "Se realizó mantenimiento preventivo a las unidades tipo minisplit, unidad interior y unidad exterior, del cual salen las siguientes observaciones.",
    obs1: "El sistema de evacuación de condensados fluye correctamente sin obstrucciones.",
    obs2: "Filtros de la unidad interior limpios para mantener flujo de aire adecuado.",
    obs3: "Contactos y conexiones eléctricas de ambas unidades inspeccionadas.",
    trabajo1: "Mantenimiento preventivo general: Limpieza de la unidad interior y exterior, incluyendo filtros, serpentines, rejillas, carcasa y componentes accesibles.",
    trabajo2: "Revisión del sistema de drenaje: Verificación del correcto funcionamiento de la evacuación de condensados, revisando la bandeja y línea de drenaje.",
    caps: {
      1: "VISTA GENERAL DE UNIDAD EXTERIOR E INTERIOR MINISPLIT.",
      2: "REVISIÓN DE COMPONENTES INTERNOS DE LA CONDENSADORA.",
      3: "USO DE EPP EN EL ÁREA DE MANTENIMIENTO.",
      4: "INSPECCIÓN DE CONEXIONES ELÉCTRICAS Y BORNERAS.",
      5: "LIMPIEZA DE ALETAS Y SERPENTINES EN AMBAS UNIDADES.",
      6: "DESARME DE CARCASA INTERIOR Y RETIRO DE FILTROS.",
      7: "FILTROS LAVADOS Y REINSTALADOS.",
      8: "ESTADO DE SUCIEDAD INICIAL EN UNIDAD EVAPORADORA.",
      9: "LIMPIEZA DE BANDEJA Y PRUEBA DE DRENAJE.",
      10: "ARMADO DE CARCASA DE UNIDAD INTERIOR.",
      11: "UNIDAD INTERIOR ASEADA Y LISTA PARA PRUEBA.",
      12: "LIMPIEZA DE TURBINA Y MOTOR VENTILADOR.",
      13: "AJUSTE DE DEFLECTORES DE AIRE.",
      14: "LIMPIEZA EXTERNA DE LA UNIDAD CONDENSADORA.",
      15: "VERIFICACIÓN DE VOLTAJE Y ARRANQUE DEL COMPRESOR.",
      16: "INSPECCIÓN VISUAL DE AISLAMIENTO DE TUBERÍA DE COBRE.",
      17: "MEDICIÓN FINAL DE TEMPERATURA DE INYECCIÓN.",
      "17b": "EQUIPO MINISPLIT OPERANDO DENTRO DE PARÁMETROS TÉCNICOS."
    }
  },

  "Ductos y Aislamiento - Correctivo": {
    intro: "Se realizó mantenimiento correctivo a la red de ductos y a su aislamiento térmico, del cual salen las siguientes observaciones.",
    obs1: "Se identifican fugas o deterioros en las uniones y distribución de aire.",
    obs2: "Aislamiento térmico deteriorado, desprendido o insuficiente.",
    obs3: "Compuertas y accesorios asociados verificados en su funcionamiento.",
    trabajo1: "Corrección de ductos y aislamiento: Reparación, sellado y refuerzo de las uniones de los ductos. Reparación o refuerzo del aislamiento térmico donde presentaba deterioro.",
    trabajo2: "Sellado e inspección: Sellado de juntas y uniones para reducir pérdidas de aire. Revisión general y funcionamiento de compuertas y accesorios.",
    caps: {
      1: "INSPECCIÓN PREVENTIVA Y ESTADO GENERAL DE LA RED DE DUCTOS.",
      2: "IDENTIFICACIÓN DE PUNTOS CON FUGAS O DETERIORO.",
      3: "USO DE EPP ADECUADO PARA TRABAJOS EN DUCTERÍA.",
      4: "VERIFICACIÓN DE ANCLAJES Y SOPORTES METÁLICOS.",
      5: "ESTADO DEL AISLAMIENTO TÉRMICO INICIAL.",
      6: "LIMPIEZA DEL ÁREA A INTERVENIR EN EL DUCTO.",
      7: "APLICACIÓN DE MATERIAL DE SELLADO EN UNIONES.",
      8: "EVIDENCIA DE PÉRDIDAS DE AIRE ANTES DE LA CORRECCIÓN.",
      9: "REPARACIÓN Y SUSTITUCIÓN DE AISLAMIENTO DETERIORADO.",
      10: "APLICACIÓN DE CINTAS TÉRMICAS Y REFUERZOS.",
      11: "SECCIÓN DE DUCTO CON AISLAMIENTO CORREGIDO.",
      12: "REVISIÓN DEL ESTADO DE COMPUERTAS DE CONTROL.",
      13: "VERIFICACIÓN DE ACCESORIOS Y REJILLAS ASOCIADAS.",
      14: "ESTADO FINAL DE LA ZONA INTERVENIDA.",
      15: "PRUEBA DE ESTANQUEIDAD Y FLUJO DE AIRE.",
      16: "INSPECCIÓN DE CONEXIONES CON UNIDADES MANEJADORAS.",
      17: "REVISIÓN GENERAL DE LA RED DE DISTRIBUCIÓN FINALIZADA.",
      "17b": "SISTEMA DE DUCTOS OPERATIVO Y SIN FUGAS."
    }
  }
};

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
  
  // Opciones del selector automático de tipos de reparación
  const opcionesPerfil = Object.keys(PERFILES_REPARACION).map(
    p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`
  ).join("");

  let html = `
    <div class="num-informe" id="num-informe">Escribe la empresa para ver el N.° de informe…</div>
    <form id="form-informe">
      <fieldset>
        <legend>Cliente y Configuración</legend>
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
        <div class="campo">
          <label>Fecha de la visita</label>
          <input type="date" id="fecha_iso" value="${hoyIso}" required>
        </div>
        
        <!-- ESTE ES EL NUEVO SELECTOR PRINCIPAL PARA LOS TÉCNICOS -->
        <div class="campo" style="margin-top: 15px; border: 2px solid var(--azul); padding: 10px; border-radius: 8px; background: var(--azul-claro);">
          <label style="font-weight: bold; color: var(--azul);">TIPO DE EQUIPO Y REPARACIÓN</label>
          <select id="tipo_reparacion">
            ${opcionesPerfil}
          </select>
        </div>

        <div class="campo" style="display:none;">
          <textarea id="parrafo_intro">${escapeHtml(data.parrafo_intro_default)}</textarea>
        </div>
      </fieldset>
  `;

  // Iteramos sobre las secciones solo para generar los botones de subir foto
  for (const seccion of data.secciones) {
    html += `<fieldset><legend>${escapeHtml(seccion.titulo)}</legend>`;
    for (const slot of seccion.slots) {
      html += `<div class="slot" data-n="${slot.n}">
        <label class="slot-label" style="font-weight: bold;">📷 Foto ${slot.n}</label>
        <div class="slot-desc" id="desc_${slot.n}" style="font-size: 0.85em; color: var(--azul); margin: 4px 0 6px;"></div>
        <input type="file" accept="image/*" capture="environment" id="foto_${slot.n}" required>
        <img class="slot-preview" id="preview_${slot.n}" style="display:none; margin-top: 10px; border-radius: 6px; max-width: 100%;">
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

  // Debajo de cada foto se muestra qué debe registrar según el tipo elegido
  // (es el mismo texto que saldrá en el Word bajo esa foto)
  const selectorTipo = document.getElementById("tipo_reparacion");
  const mostrarDescripciones = () => {
    const caps = PERFILES_REPARACION[selectorTipo.value].caps;
    for (const seccion of data.secciones) {
      for (const slot of seccion.slots) {
        document.getElementById(`desc_${slot.n}`).textContent = caps[slot.n] || "";
      }
    }
  };
  selectorTipo.addEventListener("change", mostrarDescripciones);
  mostrarDescripciones();

  // Lógica para previsualizar las fotos seleccionadas
  for (const seccion of data.secciones) {
    for (const slot of seccion.slots) {
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
        estadoActual.historial.map(h => `<li>N.° ${h.numero} &middot; ${escapeHtml(h.mes_ref)} &middot; enviado ✓</li>`).join("")
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
  const tipoReparacion = document.getElementById("tipo_reparacion").value;
  
  if (!fechaIso) { alert("Falta la fecha de la visita"); return; }
  if (!empresa) { alert("Falta el nombre de la empresa"); return; }
  if (!contacto || !cargo) { alert("Falta el contacto o su cargo"); return; }

  // 1. Extraemos los textos automáticos según la selección del técnico
  const textos = PERFILES_REPARACION[tipoReparacion];
  if (!textos) { alert("Selecciona el tipo de equipo y reparación"); return; }

  const fd = new FormData();
  fd.append("empresa", empresa);
  fd.append("contacto", contacto);
  fd.append("cargo_contacto", cargo);
  fd.append("fecha_carta", fechaLarga(fechaIso));
  fd.append("mes_ref", mesRef(fechaIso));
  fd.append("parrafo_intro", textos.intro || document.getElementById("parrafo_intro").value);
  fd.append("tipo_reparacion", tipoReparacion);
  
  // 2. Inyectamos silenciosamente las observaciones y trabajos
  fd.append("obs1", textos.obs1 || "");
  fd.append("obs2", textos.obs2 || "");
  fd.append("obs3", textos.obs3 || "");
  fd.append("trabajo1", textos.trabajo1 || "");
  fd.append("trabajo2", textos.trabajo2 || "");
  fd.append("gas_refrigerante", document.getElementById("gas_refrigerante").value);

  let faltantes = [];
  
  // 3. Procesamos las 17 fotos y les inyectamos los "caps" invisibles
  for (const seccion of data.secciones) {
    for (const slot of seccion.slots) {
      const foto = document.getElementById(`foto_${slot.n}`).files[0];
      if (!foto) faltantes.push(`Foto ${slot.n}`);
      
      const textoCap = textos.caps[slot.n] || "";
      
      if (slot.n === 17) {
        fd.append("cap17a", textoCap);
        fd.append("cap17b", textos.caps["17b"] || "");
      } else {
        fd.append(`cap${slot.n}`, textoCap);
      }
      if (foto) fd.append(`foto${slot.n}`, foto);
    }
  }

  if (faltantes.length) {
    resultado.innerHTML = `<div class="resultado error">Faltan fotos por subir: ${faltantes.join(", ")}</div>`;
    return;
  }

  boton.disabled = true;
  boton.textContent = "Generando informe automático…";
  resultado.innerHTML = "";

  try {
    const res = await fetch("/api/informes", { method: "POST", body: fd });
    let json;
    try {
      json = await res.json();
    } catch (_) {
      // Respuesta que no es JSON: fotos demasiado pesadas, servidor arrancando, etc.
      throw new Error(`El servidor no respondió bien (código ${res.status}). Espera un minuto e intenta nuevamente.`);
    }
    if (!res.ok) {
      const det = Array.isArray(json.detail)
        ? json.detail.map(d => `${(d.loc || []).slice(-1)[0]}: ${d.msg}`).join("; ")
        : json.detail;
      throw new Error(det || "Error al generar el informe");
    }
    if (json.enviado_por_correo) {
      resultado.innerHTML = `<div class="resultado ok">✅ Informe N.° ${json.numero} generado y enviado por correo.</div>`;
    } else {
      resultado.innerHTML = `<div class="resultado error">El informe N.° ${json.numero} se generó, pero no se pudo enviar por correo.<br>Avisa a tu supervisor: ${escapeHtml(json.error_envio || "")}</div>`;
    }
  } catch (e) {
    resultado.innerHTML = `<div class="resultado error">${escapeHtml(e.message)}</div>`;
  } finally {
    boton.disabled = false;
    boton.textContent = "Generar informe";
  }
}

cargar();