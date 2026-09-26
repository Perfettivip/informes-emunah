"""Envío del archivo generado por correo, usando la API HTTP de Brevo
(antes Sendinblue).

Se usa HTTPS (API) en vez de SMTP directo porque los planes gratuitos de
hosting (como Render Free) bloquean las conexiones SMTP salientes para
evitar spam. La API de Brevo funciona igual que cualquier llamada web
normal, así que no choca con ese bloqueo. A diferencia del trial de 60
días de SendGrid, el plan Free de Brevo (300 correos/día) no vence.

Variables de entorno esperadas (se configuran en Render, nunca en el repo):
    BREVO_API_KEY   la API key generada en Brevo (Settings > SMTP & API > API Keys)
    EMAIL_FROM      el remitente verificado en Brevo (Senders, Domains & Dedicated IPs)
    EMAIL_TO        destinatario (por defecto, proyectos@emunah.com.co)

Si falta BREVO_API_KEY o EMAIL_FROM, no se envía nada y se informa
el motivo (para no romper la generación del informe si el correo no
está configurado todavía).
"""
import base64
import os
from pathlib import Path

import requests

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


class MailerError(Exception):
    pass


def configurado() -> bool:
    return bool(os.environ.get("BREVO_API_KEY") and os.environ.get("EMAIL_FROM"))


def _enviar(nombre_remitente: str, asunto: str, cuerpo: str, adjuntos: list):
    if not configurado():
        raise MailerError(
            "El envío de correo no está configurado (faltan BREVO_API_KEY/EMAIL_FROM "
            "como variables de entorno en Render)."
        )

    api_key = os.environ["BREVO_API_KEY"]
    remitente = os.environ["EMAIL_FROM"]
    destinatario = os.environ.get("EMAIL_TO", "proyectos@emunah.com.co")

    payload = {
        "sender": {"email": remitente, "name": nombre_remitente},
        "to": [{"email": destinatario}],
        "subject": asunto,
        "textContent": cuerpo,
        "attachment": adjuntos,
    }

    try:
        resp = requests.post(
            BREVO_URL,
            headers={
                "api-key": api_key,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json=payload,
            timeout=30,
        )
    except requests.RequestException as e:
        raise MailerError(f"No se pudo conectar con Brevo: {e}")

    if resp.status_code >= 300:
        raise MailerError(f"Brevo respondió {resp.status_code}: {resp.text[:500]}")


def _adjunto_archivo(path: Path) -> list:
    with open(path, "rb") as f:
        contenido_b64 = base64.b64encode(f.read()).decode("ascii")
    return [{"content": contenido_b64, "name": path.name}]


def enviar_informe(docx_path: Path, empresa: str, numero: int, mes_ref: str):
    _enviar(
        "Informes EMUNAH",
        f"Informe N.° {numero} - {empresa} - {mes_ref}",
        (
            f"Se generó el Informe N.° {numero} para {empresa} ({mes_ref}).\n\n"
            f"Se adjunta el archivo .docx.\n\n"
            f"Este correo se envió automáticamente desde la app de informes de EMUNAH."
        ),
        _adjunto_archivo(docx_path),
    )


def enviar_gastos(xlsx_path: Path, placa: str, conductor: str, fecha_inicio: str, fecha_fin: str):
    _enviar(
        "Gastos en Carretera EMUNAH",
        f"Relación de gastos - {placa} - {conductor} ({fecha_inicio} a {fecha_fin})",
        (
            f"Se generó la relación de gastos en carretera del vehículo {placa} "
            f"(conductor: {conductor}), del {fecha_inicio} al {fecha_fin}.\n\n"
            f"Se adjunta el archivo .xlsx con el detalle de cada gasto.\n\n"
            f"Este correo se envió automáticamente desde la app de informes de EMUNAH."
        ),
        _adjunto_archivo(xlsx_path),
    )


def enviar_reporte(docx_path: Path, tecnico: str, lugar: str, fecha: str):
    _enviar(
        "Reportes EMUNAH",
        f"Reporte de trabajo - {tecnico} - {lugar} ({fecha})",
        (
            f"Reporte de trabajo diligenciado por {tecnico} en {lugar} ({fecha}).\n\n"
            f"Se adjunta el archivo .docx con el detalle y las fotos.\n\n"
            f"Este correo se envió automáticamente desde la app de informes de EMUNAH."
        ),
        _adjunto_archivo(docx_path),
    )


def enviar_repuestos(xlsx_path: Path, responsable: str, n_items: int):
    _enviar(
        "Repuestos EMUNAH",
        f"Repuestos EMUNAH - {responsable} ({n_items} ítem{'s' if n_items != 1 else ''})",
        (
            f"Se generó la relación de repuestos diligenciada por {responsable}, "
            f"con {n_items} ítem{'s' if n_items != 1 else ''}.\n\n"
            f"Se adjunta el archivo .xlsx con el detalle.\n\n"
            f"Este correo se envió automáticamente desde la app de informes de EMUNAH."
        ),
        _adjunto_archivo(xlsx_path),
    )


def _resumen_inventario(lineas: list) -> str:
    if not lineas:
        return ""
    def cop(n):
        return "$ " + f"{round(n):,}".replace(",", ".")
    t = sum(l["total"] for l in lineas)
    c = sum(l["costo_total"] for l in lineas)
    out = ["", "DESCUENTO DE INVENTARIO (base sin IVA; costo = factura BAYEN con descuento 12%)"]
    for l in lineas:
        out.append(
            f"- {l['producto']} ({l['codigo']}): {l['cantidad']:g} und | vendido {cop(l['total'])} "
            f"vs costo {cop(l['costo_total'])} | utilidad {cop(l['utilidad'])} | quedan {l['stock_restante']:g}"
        )
    out.append(f"TOTAL: vendido {cop(t)} vs costo {cop(c)} = utilidad {cop(t - c)} ({(t - c) / t * 100 if t else 0:.1f}%)")
    alertas = [l for l in lineas if l["stock_restante"] <= 0 or (l.get("minimo") and l["stock_restante"] <= l["minimo"])]
    for l in alertas:
        out.append(f"⚠ STOCK BAJO: {l['producto']} ({l['codigo']}) quedan {l['stock_restante']:g}")
    return "\n".join(out)


def enviar_ventas(xlsx_path: Path, responsable: str, n_items: int, lineas_inv: list = None):
    _enviar(
        "Control Ventas EMUNAH",
        f"Control Ventas - {responsable} ({n_items} venta{'s' if n_items != 1 else ''})",
        (
            f"Se generó el control de ventas diligenciado por {responsable}, "
            f"con {n_items} venta{'s' if n_items != 1 else ''}.\n\n"
            f"Se adjunta el archivo .xlsx con el detalle."
            f"{_resumen_inventario(lineas_inv or [])}\n\n"
            f"Este correo se envió automáticamente desde la app de informes de EMUNAH."
        ),
        _adjunto_archivo(xlsx_path),
    )


def enviar_adjunto_bytes(contenido: bytes, filename: str, mime_type: str, asunto: str, cuerpo: str):
    """Envía un adjunto genérico (bytes en memoria, no un archivo en disco) por
    Brevo. Se usa para reenviar comprobantes recibidos por WhatsApp sin
    tener que guardarlos primero en el disco no persistente de Render."""
    adjuntos = [{"content": base64.b64encode(contenido).decode("ascii"), "name": filename}]
    _enviar("WhatsApp Comprobantes EMUNAH", asunto, cuerpo, adjuntos)
