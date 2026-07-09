FROM python:3.11-slim

WORKDIR /app
COPY backend/ /app/

RUN pip install --no-cache-dir -r requirements.txt

# La base de datos y los .docx generados deben persistir entre despliegues:
# monta un volumen en /app/salidas y /app/informes.db si el hosting lo permite.
VOLUME ["/app/salidas"]

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
