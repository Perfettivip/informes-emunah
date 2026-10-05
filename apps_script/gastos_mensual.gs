/**
 * Archivo mensual de gastos en carretera — Soluciones EMUNAH SAS.
 *
 * Guarda en Google Drive, carpeta "Gastos carretera EMUNAH", un .xlsx por
 * mes ("Gastos carretera 2026-10.xlsx"). La app de Render lo baja, le
 * agrega la pestaña del viaje y lo vuelve a subir con este script.
 *
 * Instalación (una sola vez):
 *   1. script.google.com > Nuevo proyecto > pegar este código > Guardar.
 *   2. Configuración del proyecto > Propiedades del script > agregar
 *      TOKEN = (el mismo valor que GASTOS_TOKEN en Render).
 *   3. Implementar > Nueva implementación > Aplicación web
 *      Ejecutar como: Yo   ·   Quién tiene acceso: Cualquier persona
 *      Autorizar el acceso a Drive y copiar la URL (termina en /exec)
 *      como GASTOS_SCRIPT_URL en Render.
 *
 * Peticiones (POST JSON):
 *   {token, accion: "bajar", nombre}            -> {ok, existe, contenido(base64)}
 *   {token, accion: "subir", nombre, contenido} -> {ok, url}
 */

var CARPETA = 'Gastos carretera EMUNAH';
var XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function doPost(e) {
  try {
    var datos = JSON.parse(e.postData.contents);
    var token = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (!token || datos.token !== token) return respuesta({ ok: false, error: 'Token inválido' });
    if (!/^Gastos carretera \d{4}-\d{2}\.xlsx$/.test(datos.nombre || '')) {
      return respuesta({ ok: false, error: 'Nombre de archivo inválido' });
    }

    var carpeta = carpetaGastos();
    var archivo = buscar(carpeta, datos.nombre);

    if (datos.accion === 'bajar') {
      if (!archivo) return respuesta({ ok: true, existe: false });
      return respuesta({ ok: true, existe: true, contenido: Utilities.base64Encode(archivo.getBlob().getBytes()) });
    }

    if (datos.accion === 'subir') {
      var blob = Utilities.newBlob(Utilities.base64Decode(datos.contenido), XLSX, datos.nombre);
      var nuevo = carpeta.createFile(blob);
      if (archivo) archivo.setTrashed(true);  // la versión anterior queda 30 días en la papelera
      return respuesta({ ok: true, url: nuevo.getUrl() });
    }

    return respuesta({ ok: false, error: 'Acción inválida' });
  } catch (err) {
    return respuesta({ ok: false, error: String(err) });
  }
}

/** Para probar desde el navegador que la implementación responde. */
function doGet() {
  var archivos = [];
  var it = carpetaGastos().getFiles();
  while (it.hasNext()) archivos.push(it.next().getName());
  return respuesta({ ok: true, carpeta: CARPETA, archivos: archivos });
}

function carpetaGastos() {
  var it = DriveApp.getFoldersByName(CARPETA);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA);
}

function buscar(carpeta, nombre) {
  var it = carpeta.getFilesByName(nombre);
  return it.hasNext() ? it.next() : null;
}

function respuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
