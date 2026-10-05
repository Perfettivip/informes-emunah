"""Archivo MENSUAL de gastos en carretera: "Gastos carretera 2026-10.xlsx".

Cada relación que se envía desde el formulario se agrega como una pestaña
nueva al archivo del mes en curso (más una fila en la pestaña "Resumen").
Si el archivo del mes no existe todavía, se crea; así, al cambiar de mes
se empieza un archivo nuevo y los anteriores quedan como historial. El mes
es el de la fecha de registro, en hora de Colombia (Render usa UTC).

Dónde se guarda:
  - Google Drive, si están GASTOS_SCRIPT_URL y GASTOS_TOKEN (producción).
    Render Free borra su disco cada vez que el servicio se duerme o se
    reinicia, por eso el archivo vive en Drive: la app lo baja, le agrega
    la pestaña y lo vuelve a subir (ver apps_script/gastos_mensual.gs).
  - Si no están, en el disco local (salidas_gastos/mensual/), útil para
    probar en el computador.
"""
import base64
import os
import threading
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

from gastos_generador import agregar_pestana_mensual

ZONA = ZoneInfo("America/Bogota")
LOCAL_DIR = Path(__file__).resolve().parent / "salidas_gastos" / "mensual"

# Bajar -> agregar pestaña -> subir debe hacerse de a un registro a la vez,
# o dos conductores enviando al mismo tiempo se borrarían la pestaña uno al otro.
_lock = threading.Lock()


class MensualError(Exception):
    pass


def en_drive() -> bool:
    return bool(os.environ.get("GASTOS_SCRIPT_URL") and os.environ.get("GASTOS_TOKEN"))


def nombre_archivo(mes: str) -> str:
    return f"Gastos carretera {mes}.xlsx"


def _llamar_script(datos: dict) -> dict:
    datos = dict(datos, token=os.environ["GASTOS_TOKEN"])
    try:
        r = requests.post(os.environ["GASTOS_SCRIPT_URL"], json=datos, timeout=90)
        resp = r.json()
    except (requests.RequestException, ValueError) as e:
        raise MensualError(f"No se pudo conectar con Google Drive: {e}")
    if not resp.get("ok"):
        raise MensualError(f"Google Drive respondió: {resp.get('error')}")
    return resp


def registrar(cfg: dict, ahora: datetime = None) -> dict:
    """Agrega la relación del viaje al archivo del mes.
    Devuelve {"archivo", "pestana", "url"} (url solo si está en Drive)."""
    ahora = ahora or datetime.now(ZONA)
    mes = ahora.strftime("%Y-%m")
    nombre = nombre_archivo(mes)

    with _lock:
        if en_drive():
            actual = _llamar_script({"accion": "bajar", "nombre": nombre})
            contenido = base64.b64decode(actual["contenido"]) if actual.get("existe") else None
            nuevo, pestana = agregar_pestana_mensual(cfg, contenido, ahora)
            subido = _llamar_script({"accion": "subir", "nombre": nombre,
                                     "contenido": base64.b64encode(nuevo).decode()})
            return {"archivo": nombre, "pestana": pestana, "url": subido.get("url")}

        ruta = LOCAL_DIR / nombre
        contenido = ruta.read_bytes() if ruta.exists() else None
        nuevo, pestana = agregar_pestana_mensual(cfg, contenido, ahora)
        LOCAL_DIR.mkdir(parents=True, exist_ok=True)
        ruta.write_bytes(nuevo)
        return {"archivo": nombre, "pestana": pestana, "url": None}
