"""Webhook de WhatsApp Cloud API (Meta) para recibir comprobantes de pago.

Fase 1 (esta): solo captura lo que llega (foto o PDF), lo reenvía por correo
a proyectos@emunah.com.co (mismo canal que ya usan) y confirma el recibo al
remitente por WhatsApp. La lectura automática del comprobante (extracción de
datos) y el cruce con Siigo son una fase aparte, todavía no conectada aquí —
ver [[emunah-whatsapp-pagos-automatizacion]] en la memoria del proyecto.

Variables de entorno esperadas (se configuran en Render, nunca en el repo):
    WHATSAPP_VERIFY_TOKEN     token inventado que se registra igual en Meta,
                               para el "handshake" de verificación del webhook.
    WHATSAPP_ACCESS_TOKEN     token de acceso (system user, permanente) de la
                               app de Meta for Developers.
    WHATSAPP_PHONE_NUMBER_ID  ID del número de teléfono dedicado (no el número
                               en sí) que se ve en WhatsApp > API Setup.
    WHATSAPP_API_VERSION      opcional, default "v21.0".

Si falta cualquiera de las tres primeras, el webhook de verificación (GET)
sigue respondiendo error controlado, y el de mensajes (POST) responde 200
igual (para que Meta no reintente en bucle) pero no procesa nada.
"""
import logging
import mimetypes
import os

import requests

logger = logging.getLogger("whatsapp")

GRAPH_BASE = "https://graph.facebook.com"


class WhatsAppConfigError(Exception):
    pass


def _api_version() -> str:
    return os.environ.get("WHATSAPP_API_VERSION", "v21.0")


def _access_token() -> str:
    token = os.environ.get("WHATSAPP_ACCESS_TOKEN")
    if not token:
        raise WhatsAppConfigError("Falta WHATSAPP_ACCESS_TOKEN en las variables de entorno.")
    return token


def _phone_number_id() -> str:
    pid = os.environ.get("WHATSAPP_PHONE_NUMBER_ID")
    if not pid:
        raise WhatsAppConfigError("Falta WHATSAPP_PHONE_NUMBER_ID en las variables de entorno.")
    return pid


def verificar_challenge(mode: str, token: str, challenge: str) -> str:
    """Responde al handshake GET que hace Meta al configurar el webhook.
    Lanza WhatsAppConfigError si el token no coincide (Meta espera 403 en ese caso)."""
    esperado = os.environ.get("WHATSAPP_VERIFY_TOKEN")
    if not esperado:
        raise WhatsAppConfigError("Falta WHATSAPP_VERIFY_TOKEN en las variables de entorno.")
    if mode != "subscribe" or token != esperado:
        raise WhatsAppConfigError("Token de verificación inválido.")
    return challenge


def _descargar_media(media_id: str) -> tuple[bytes, str]:
    """Devuelve (contenido, mime_type) de un adjunto de WhatsApp. Requiere dos
    llamadas: primero resolver la URL temporal del media_id, luego descargarla
    (ambas con el mismo Bearer token)."""
    token = _access_token()
    headers = {"Authorization": f"Bearer {token}"}

    resp = requests.get(f"{GRAPH_BASE}/{_api_version()}/{media_id}", headers=headers, timeout=20)
    resp.raise_for_status()
    info = resp.json()
    url = info["url"]
    mime_type = info.get("mime_type", "application/octet-stream")

    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.content, mime_type


def _enviar_texto(to: str, texto: str) -> None:
    token = _access_token()
    phone_number_id = _phone_number_id()
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": texto},
    }
    try:
        resp = requests.post(
            f"{GRAPH_BASE}/{_api_version()}/{phone_number_id}/messages",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=payload,
            timeout=20,
        )
        if resp.status_code >= 300:
            logger.warning("No se pudo responder por WhatsApp a %s: %s", to, resp.text[:300])
    except requests.RequestException as e:
        logger.warning("Error de red respondiendo por WhatsApp a %s: %s", to, e)


def _nombre_archivo(mensaje: dict, msg_type: str, mime_type: str) -> str:
    nombre = mensaje.get(msg_type, {}).get("filename")
    if nombre:
        return nombre
    ext = mimetypes.guess_extension(mime_type) or ""
    return f"{msg_type}_{mensaje.get('id', 'sin_id')}{ext}"


def procesar_webhook(payload: dict) -> None:
    """Recorre el payload del webhook de Meta y procesa cada mensaje entrante.
    No lanza excepciones hacia afuera: cada mensaje se procesa en su propio
    try/except para que un mensaje con error no tumbe a los demás ni el
    endpoint completo (Meta espera 200 aunque algo interno haya fallado)."""
    import mailer  # import local para evitar ciclo si algún día mailer importa esto

    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            mensajes = value.get("messages", [])
            if not mensajes:
                continue  # ej. actualizaciones de "statuses" (entregado/leído), se ignoran

            contactos = {c["wa_id"]: c.get("profile", {}).get("name", "") for c in value.get("contacts", [])}

            for mensaje in mensajes:
                remitente = mensaje.get("from", "desconocido")
                nombre_contacto = contactos.get(remitente, "")
                msg_type = mensaje.get("type")

                try:
                    if msg_type in ("image", "document"):
                        media_id = mensaje[msg_type]["id"]
                        caption = mensaje[msg_type].get("caption", "")
                        contenido, mime_type = _descargar_media(media_id)
                        filename = _nombre_archivo(mensaje, msg_type, mime_type)

                        asunto = f"Comprobante recibido por WhatsApp de {nombre_contacto or remitente}"
                        cuerpo = (
                            f"Llegó un {('PDF' if msg_type == 'document' else 'foto')} por WhatsApp "
                            f"de {nombre_contacto or 'un contacto'} ({remitente}).\n\n"
                            f"Texto/caption del mensaje: {caption or '(sin texto)'}\n\n"
                            f"Este correo se generó automáticamente desde el webhook de WhatsApp "
                            f"de EMUNAH. Por ahora solo reenvía el comprobante — la lectura "
                            f"automática y el ingreso a Siigo son la siguiente fase."
                        )
                        mailer.enviar_adjunto_bytes(contenido, filename, mime_type, asunto, cuerpo)

                        _enviar_texto(
                            remitente,
                            "Recibido, gracias. Tu comprobante ya quedó registrado en EMUNAH.",
                        )
                        logger.info("Comprobante de %s reenviado por correo (%s)", remitente, filename)

                    elif msg_type == "text":
                        _enviar_texto(
                            remitente,
                            "Hola, este número solo recibe comprobantes de pago (foto o PDF). "
                            "Para cualquier otra consulta, escribe al WhatsApp habitual de EMUNAH.",
                        )

                    else:
                        logger.info("Mensaje de tipo %s de %s ignorado (no es imagen/documento/texto)", msg_type, remitente)

                except WhatsAppConfigError as e:
                    logger.error("Webhook de WhatsApp mal configurado: %s", e)
                except Exception:
                    logger.exception("Error procesando mensaje de %s", remitente)
