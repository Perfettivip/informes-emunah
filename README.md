# Generador de Informes EMUNAH (Fase 1)

App web para que el técnico llene el informe de mantenimiento desde el celular
(empresa/cliente, fotos + frases predefinidas por sección) y se genere el .docx
automáticamente, con el mismo formato y estilo de los Informes 9 y 10 de
FALABELLA.COM. Sirve para **cualquier cliente** de EMUNAH: el técnico escribe
el nombre de la empresa en el formulario y cada una lleva su propia numeración
consecutiva (FALABELLA.COM sigue en 11 en adelante; un cliente nuevo arranca en 1).

## Probar en local

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Abrir `http://localhost:8000` desde el navegador (o desde el celular si está
en la misma red, usando la IP de la Mac en vez de `localhost`).

## Desplegar en la nube (Render, plan Free)

1. Crear una cuenta en https://render.com (esto lo debes hacer tú).
2. Subir esta carpeta `APP_INFORMES/` a un repositorio de GitHub.
3. En Render: "New +" → "Web Service" → conectar el repositorio.
4. Render detecta el `Dockerfile` automáticamente. Dejar el plan en **Free**.
   (El plan Free no soporta disco persistente: se acepta el riesgo de que
   `informes.db` — la numeración consecutiva — se reinicie si el servicio
   se reinicia. Dado el bajo volumen mensual, es un riesgo aceptado a propósito.)
5. **Variables de entorno** (pestaña "Environment" en Render) para que se
   envíe el .docx por correo automáticamente. Se usa la API de SendGrid
   (HTTPS) en vez de SMTP directo, porque el plan Free de Render bloquea
   las conexiones SMTP salientes:
   - `SENDGRID_API_KEY` — API key generada en https://sendgrid.com (cuenta gratis)
   - `EMAIL_FROM` — el correo verificado como "Single Sender" en SendGrid
   - `EMAIL_TO` — a quién llega el informe (por defecto `proyectos@emunah.com.co`)
6. Una vez desplegado, Render da una URL pública (ej. `https://informes-emunah.onrender.com`)
   — esa es la que abre el técnico desde el celular.

## Qué hace y qué no hace (Fase 1)

- El técnico elige frases predefinidas por foto (o escribe la suya) — no hay
  redacción automática por IA todavía (eso sería Fase 2).
- La sección OBSERVACIONES del informe (con el texto en rojo) es siempre fija:
  no se genera desde el formulario, para no arriesgar que cambie por error.
- La numeración del informe es automática y consecutiva **por cada empresa**
  (guardada en `backend/informes.db`). FALABELLA.COM continúa desde el 11;
  cualquier empresa nueva arranca en 1.
- El archivo se genera en `backend/salidas/{empresa}/` con el nombre correcto
  (ej. `11 - 26 FALABELLA.COM MANTENIMIENTO PREVENTIVO BTA AGOSTO 2026.docx`).
- El formulario recuerda (autocompletar) las empresas ya usadas, para evitar
  que un typo en el nombre cree un cliente "duplicado" con su propio consecutivo.
- El técnico **no descarga el archivo**: al generar el informe, se envía por
  correo automáticamente (`mailer.py`) a `EMAIL_TO` (por defecto
  `proyectos@emunah.com.co`). Si el envío falla, el formulario avisa en pantalla.
- La conversión final a PDF queda manual (abrir el .docx en Word y exportar),
  igual que ahora.

## Estructura

```
APP_INFORMES/
  Dockerfile
  backend/
    main.py            API (FastAPI)
    generador.py        arma el .docx desde la plantilla
    mailer.py            envía el .docx por correo (SMTP)
    catalogo.py          frases predefinidas por sección
    db.py                numeración consecutiva (SQLite)
    template_unpacked/   plantilla con marcadores {{...}}
    _lib/                pack.py y dependencias (vendorizado)
    static/               formulario web (HTML/CSS/JS)
    salidas/              .docx generados
```
