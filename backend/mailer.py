"""Envío del .docx generado por correo, usando la API HTTP de SendGrid.

Se usa HTTPS (API) en vez de SMTP directo porque los planes gratuitos de
hosting (como Render Free) bloquean las conexiones SMTP salientes para
evitar spam. La API de SendGrid funciona igual que cualquier llamada web
normal, así que no choca con ese bloqueo.

Variables de entorno esperadas (se configuran en Render, nunca en el repo):
    SENDGRID_API_KEY   la API key generada en SendGrid
    EMAIL_FROM         el remitente verificado en SendGrid (Single Sender)
    EMAIL_TO           destinatario (por defecto, proyectos@emunah.com.co)

Si falta SENDGRID_API_KEY o EMAIL_FROM, no se envía nada y se informa
el motivo (para no romper la generación del informe si el correo no
está configurado todavía).
"""
import base64
import os
from pathlib import Path

import requests

SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send"


class MailerError(Exception):
    pass


def configurado() -> bool:
    return bool(os.environ.get("SENDGRID_API_KEY") and os.environ.get("EMAIL_FROM"))


def enviar_informe(docx_path: Path, empresa: str, numero: int, mes_ref: str):
    if not configurado():
        raise MailerError(
            "El envío de correo no está configurado (faltan SENDGRID_API_KEY/EMAIL_FROM "
            "como variables de entorno en Render)."
        )

    api_key = os.environ["SENDGRID_API_KEY"]
    remitente = os.environ["EMAIL_FROM"]
    destinatario = os.environ.get("EMAIL_TO", "proyectos@emunah.com.co")

    with open(docx_path, "rb") as f:
        contenido_b64 = base64.b64encode(f.read()).decode("ascii")

    payload = {
        "personalizations": [{"to": [{"email": destinatario}]}],
        "from": {"email": remitente, "name": "Informes EMUNAH"},
        "subject": f"Informe N.° {numero} - {empresa} - {mes_ref}",
        "content": [{
            "type": "text/plain",
            "value": (
                f"Se generó el Informe N.° {numero} para {empresa} ({mes_ref}).\n\n"
                f"Se adjunta el archivo .docx.\n\n"
                f"Este correo se envió automáticamente desde la app de informes de EMUNAH."
            ),
        }],
        "attachments": [{
            "content": contenido_b64,
            "filename": docx_path.name,
            "type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "disposition": "attachment",
        }],
    }

    try:
        resp = requests.post(
            SENDGRID_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
            timeout=30,
        )
    except requests.RequestException as e:
        raise MailerError(f"No se pudo conectar con SendGrid: {e}")

    if resp.status_code >= 300:
        raise MailerError(f"SendGrid respondió {resp.status_code}: {resp.text[:500]}")
