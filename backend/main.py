"""Backend web (Fase 1) para que el técnico genere el Informe de Mantenimiento
desde el celular: llena un formulario con la empresa/cliente, fotos + frases
predefinidas por sección, y el servidor arma el .docx con la plantilla ya
validada (mismo estilo de los Informes 9 y 10 de FALABELLA.COM).

Sirve para cualquier cliente de EMUNAH: el técnico escribe el nombre de la
empresa en el formulario y la numeración consecutiva se lleva por separado
para cada una (FALABELLA.COM sigue en 11, un cliente nuevo empieza en 1).

Ejecutar en local:
    uvicorn main:app --reload --port 8000

Endpoints:
    GET  /                       -> formulario (frontend)
    GET  /api/catalogo           -> secciones y frases predefinidas (genérico)
    GET  /api/empresas           -> empresas ya usadas (para autocompletar)
    GET  /api/estado?empresa=X   -> próximo N.° de informe e historial de esa empresa
    POST /api/informes           -> recibe el formulario (multipart) y genera el .docx
    GET  /api/download/{ruta}    -> descarga el .docx generado
"""
import re
import shutil
import uuid
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

import catalogo
import db
import mailer
from generador import generar_informe, GeneradorError, REQUIRED_PHOTOS

HERE = Path(__file__).resolve().parent
SALIDAS_DIR = HERE / "salidas"
UPLOADS_DIR = HERE / "_uploads"
WORK_DIR = HERE / "_work"

app = FastAPI(title="Generador de Informes EMUNAH")


def carpeta_segura(nombre: str) -> str:
    """Convierte el nombre de la empresa en un nombre de carpeta seguro."""
    return re.sub(r"[^A-Za-z0-9._-]+", "_", nombre.strip()).strip("_") or "SIN_NOMBRE"


def codigo_empresa(empresa: str) -> str:
    """Abreviatura para el N.° de informe, ej. 'FALABELLA.COM' -> 'FALABE'."""
    letras = re.sub(r"[^A-Za-z]", "", empresa).upper()
    return letras[:6] or "CLIENTE"


def anio_corto(fecha_o_mes: str) -> str:
    m = re.search(r"(\d{4})", fecha_o_mes.replace(".", ""))
    if not m:
        raise HTTPException(400, f"No se pudo leer el año de: {fecha_o_mes!r}")
    return m.group(1)[-2:]


def nombre_archivo(numero: int, anio2: str, empresa: str, mes_ref: str) -> str:
    m = re.match(r"([a-záéíóúñ]+)\s+de\s+([\d.]+)", mes_ref.strip(), re.IGNORECASE)
    if not m:
        raise HTTPException(400, f"mes_ref inválido: {mes_ref!r} (ej: 'agosto de 2.026')")
    mes = m.group(1).upper()
    anio = m.group(2).replace(".", "")
    return f"{numero} - {anio2} {empresa.upper()} MANTENIMIENTO PREVENTIVO BTA {mes} {anio}.docx"


@app.get("/api/catalogo")
def catalogo_endpoint():
    return {
        "secciones": catalogo.SECCIONES,
        "observaciones_1_3": catalogo.OBSERVACIONES_1_3,
        "trabajos_efectuados": catalogo.TRABAJOS_EFECTUADOS,
        "parrafo_intro_default": catalogo.PARRAFO_INTRO_DEFAULT,
    }


@app.get("/api/empresas")
def empresas_endpoint():
    return db.empresas()


@app.get("/api/estado")
def estado_endpoint(empresa: str):
    empresa = empresa.strip()
    if not empresa:
        raise HTTPException(400, "Falta la empresa")
    carpeta = carpeta_segura(empresa)
    historial = db.historial(empresa)
    for h in historial:
        h["download_url"] = f"/api/download/{carpeta}/{h['filename']}"
    return {
        "proximo_numero": db.siguiente_numero(empresa),
        "historial": historial,
    }


@app.post("/api/informes")
async def crear_informe(
    empresa: str = Form(...),
    contacto: str = Form(...),
    cargo_contacto: str = Form(...),
    mes_ref: str = Form(...),
    fecha_carta: str = Form(...),
    parrafo_intro: str = Form(catalogo.PARRAFO_INTRO_DEFAULT),
    obs1: str = Form(...),
    obs2: str = Form(...),
    obs3: str = Form(...),
    trabajo1: str = Form(catalogo.TRABAJOS_EFECTUADOS[0]),
    trabajo2: str = Form(catalogo.TRABAJOS_EFECTUADOS[1]),
    gas_refrigerante: str = Form("(0) cero"),
    cap1: str = Form(...), cap2: str = Form(...), cap3: str = Form(...),
    cap4: str = Form(...), cap5: str = Form(...), cap6: str = Form(...),
    cap7: str = Form(...), cap8: str = Form(...), cap9: str = Form(...),
    cap10: str = Form(...), cap11: str = Form(...), cap12: str = Form(...),
    cap13: str = Form(...), cap14: str = Form(...), cap15: str = Form(...),
    cap16: str = Form(...), cap17a: str = Form(...), cap17b: str = Form(...),
    foto1: UploadFile = File(...), foto2: UploadFile = File(...),
    foto3: UploadFile = File(...), foto4: UploadFile = File(...),
    foto5: UploadFile = File(...), foto6: UploadFile = File(...),
    foto7: UploadFile = File(...), foto8: UploadFile = File(...),
    foto9: UploadFile = File(...), foto10: UploadFile = File(...),
    foto11: UploadFile = File(...), foto12: UploadFile = File(...),
    foto13: UploadFile = File(...), foto14: UploadFile = File(...),
    foto15: UploadFile = File(...), foto16: UploadFile = File(...),
    foto17: UploadFile = File(...),
):
    empresa = empresa.strip()
    if not empresa:
        raise HTTPException(400, "Falta el nombre de la empresa")

    captions = [cap1, cap2, cap3, cap4, cap5, cap6, cap7, cap8, cap9,
                cap10, cap11, cap12, cap13, cap14, cap15, cap16]
    fotos_subidas = [foto1, foto2, foto3, foto4, foto5, foto6, foto7, foto8, foto9,
                      foto10, foto11, foto12, foto13, foto14, foto15, foto16, foto17]

    numero = db.siguiente_numero(empresa)
    anio2 = anio_corto(fecha_carta)
    num_informe = f"{numero:03d}– {anio2} {codigo_empresa(empresa)}"
    filename = nombre_archivo(numero, anio2, empresa, mes_ref)
    empresa_dir = SALIDAS_DIR / carpeta_segura(empresa)

    lote_dir = UPLOADS_DIR / str(uuid.uuid4())
    lote_dir.mkdir(parents=True, exist_ok=True)
    try:
        rutas = []
        for i, up in enumerate(fotos_subidas, start=1):
            dest = lote_dir / f"foto{i}{Path(up.filename).suffix or '.jpg'}"
            with dest.open("wb") as f:
                shutil.copyfileobj(up.file, f)
            rutas.append(dest)

        fotos_cfg = []
        for n in range(1, REQUIRED_PHOTOS + 1):
            entry = {"n": n, "src": str(rutas[n - 1])}
            if n == REQUIRED_PHOTOS:
                entry["caption"] = cap17a
                entry["caption2"] = cap17b
            else:
                entry["caption"] = captions[n - 1]
            fotos_cfg.append(entry)

        cfg = {
            "empresa": empresa,
            "contacto": contacto,
            "cargo_contacto": cargo_contacto,
            "fecha_carta": fecha_carta,
            "mes_ref": mes_ref,
            "num_informe": num_informe,
            "parrafo_intro": parrafo_intro,
            "obs1": obs1, "obs2": obs2, "obs3": obs3,
            "trabajo1": trabajo1, "trabajo2": trabajo2,
            "gas_refrigerante": gas_refrigerante,
            "fotos": fotos_cfg,
        }

        out_path = empresa_dir / filename
        try:
            generar_informe(cfg, out_path, WORK_DIR)
        except GeneradorError as e:
            raise HTTPException(400, str(e))

        db.registrar(empresa, numero, mes_ref, fecha_carta, filename)

        enviado = False
        error_envio = None
        try:
            mailer.enviar_informe(out_path, empresa, numero, mes_ref)
            enviado = True
        except mailer.MailerError as e:
            error_envio = str(e)
    finally:
        shutil.rmtree(lote_dir, ignore_errors=True)

    return JSONResponse({
        "ok": True,
        "numero": numero,
        "filename": filename,
        "enviado_por_correo": enviado,
        "error_envio": error_envio,
    })


@app.get("/api/download/{carpeta}/{filename}")
def descargar(carpeta: str, filename: str):
    path = SALIDAS_DIR / carpeta / filename
    if not path.exists():
        raise HTTPException(404, "No existe ese informe")
    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=filename,
    )


app.mount("/", StaticFiles(directory=str(HERE / "static"), html=True), name="static")
