"""Envío del .docx generado por correo, usando SMTP (solo librería estándar,
sin dependencias nuevas). La configuración sale de variables de entorno para
no dejar contraseñas en el código ni en git.

Variables de entorno esperadas (se configuran en Render, nunca en el repo):
    SMTP_HOST       ej. mail.emunah.com.co
    SMTP_PORT       ej. 587 (STARTTLS) o 465 (SSL)
    SMTP_USER       ej. proyectos@emunah.com.co
    SMTP_PASSWORD   la contraseña del buzón
    EMAIL_FROM      remitente (por defecto, igual a SMTP_USER)
    EMAIL_TO        destinatario (por defecto, proyectos@emunah.com.co)

Si falta SMTP_HOST/SMTP_USER/SMTP_PASSWORD, no se envía nada y se registra
un aviso (para no romper la generación del informe si el correo no está
configurado todavía).
"""
import os
import smtplib
import ssl
from email.message import EmailMessage
from pathlib import Path


class MailerError(Exception):
    pass


def configurado() -> bool:
    return bool(os.environ.get("SMTP_HOST") and os.environ.get("SMTP_USER") and os.environ.get("SMTP_PASSWORD"))


def enviar_informe(docx_path: Path, empresa: str, numero: int, mes_ref: str):
    if not configurado():
        raise MailerError(
            "El envío de correo no está configurado (faltan SMTP_HOST/SMTP_USER/SMTP_PASSWORD "
            "como variables de entorno en Render)."
        )

    host = os.environ["SMTP_HOST"]
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ["SMTP_USER"]
    password = os.environ["SMTP_PASSWORD"]
    remitente = os.environ.get("EMAIL_FROM", user)
    destinatario = os.environ.get("EMAIL_TO", "proyectos@emunah.com.co")

    msg = EmailMessage()
    msg["Subject"] = f"Informe N.° {numero} - {empresa} - {mes_ref}"
    msg["From"] = remitente
    msg["To"] = destinatario
    msg.set_content(
        f"Se generó el Informe N.° {numero} para {empresa} ({mes_ref}).\n\n"
        f"Se adjunta el archivo .docx.\n\n"
        f"Este correo se envió automáticamente desde la app de informes de EMUNAH."
    )

    with open(docx_path, "rb") as f:
        msg.add_attachment(
            f.read(),
            maintype="application",
            subtype="vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=docx_path.name,
        )

    context = ssl.create_default_context()
    try:
        if port == 465:
            with smtplib.SMTP_SSL(host, port, context=context, timeout=30) as server:
                server.login(user, password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=30) as server:
                server.starttls(context=context)
                server.login(user, password)
                server.send_message(msg)
    except Exception as e:
        raise MailerError(f"No se pudo enviar el correo: {e}")
