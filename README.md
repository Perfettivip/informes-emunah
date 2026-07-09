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

## Desplegar en la nube (Render, gratis para empezar)

1. Crear una cuenta en https://render.com (esto lo debes hacer tú).
2. Subir esta carpeta `APP_INFORMES/` a un repositorio de GitHub.
3. En Render: "New +" → "Web Service" → conectar el repositorio.
4. Render detecta el `Dockerfile` automáticamente. Dejar el puerto en `8000`.
5. **Importante**: en la pestaña "Disks" de Render, agregar un disco persistente
   montado en `/app/salidas` (para no perder los informes generados) y otro en
   `/app` para que `informes.db` (la numeración consecutiva) tampoco se borre
   en cada despliegue. Alternativa más simple: usar un plan con disco persistente
   desde el inicio, o cambiar `db.py`/`salidas` para apuntar a un bucket externo
   (S3, Google Drive API) más adelante si se vuelve necesario.
6. Una vez desplegado, Render da una URL pública (ej. `https://informes-falabella.onrender.com`)
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
- La conversión final a PDF queda manual (abrir el .docx en Word y exportar),
  igual que ahora.

## Estructura

```
APP_INFORMES/
  Dockerfile
  backend/
    main.py            API (FastAPI)
    generador.py        arma el .docx desde la plantilla
    catalogo.py          frases predefinidas por sección
    db.py                numeración consecutiva (SQLite)
    template_unpacked/   plantilla con marcadores {{...}}
    _lib/                pack.py y dependencias (vendorizado)
    static/               formulario web (HTML/CSS/JS)
    salidas/              .docx generados
```
