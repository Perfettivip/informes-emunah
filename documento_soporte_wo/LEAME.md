# Documentos Soporte (DS) para World Office

A partir de su **base de terceros** (Excel o CSV), el programa arma el archivo
para **importar en World Office** los documentos soporte de compras a no
obligados a facturar. Hace esto:

1. Detecta solo las columnas de la base (cédula/NIT, nombre, fecha, descripción, valor…).
2. Limpia los datos (cédulas con puntos, valores con `$` y puntos, fechas) y calcula el dígito de verificación.
3. Clasifica cada pago en un **concepto** (Servicios o Transporte) por palabras de la descripción.
4. Junta en un solo DS los pagos al mismo tercero en la misma fecha y los numera.
5. Calcula la retención en la fuente: **servicios 4 %**, **transporte 1 %**. Solo se aplica si el total del documento llega a la base mínima de 2 UVT ($104.748 en 2026).
6. Arma los asientos contables: gasto al débito, retención y caja (pago de contado) al crédito.
7. Entrega un Excel con 5 hojas: `IMPORTAR_WO`, `CONTROL`, `RESUMEN`, `TERCEROS_WO` y `ERRORES`.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `generar_ds.py` | El programa. |
| `config.json` | Parámetros: empresa, consecutivo, tarifas, cuentas y nombres de columnas. **Esto es lo único que se edita.** |
| `especificacion_ia.json` | El "script JSON" para entregarle a cualquier IA (ver más abajo). |
| `ejemplo/` | Una base de prueba y su resultado. |

## Cómo usarlo en su computador

1. Instale Python 3 (https://www.python.org/downloads/). En Windows, marque la opción *"Add Python to PATH"*.
2. Abra una terminal (en Windows: tecla Windows, escriba `cmd`) e instale la librería:
   ```bash
   pip install openpyxl
   ```
3. Entre a la carpeta del programa:
   ```bash
   cd ruta/a/documento_soporte_wo
   ```
4. Ejecute el programa con su base:
   ```bash
   python generar_ds.py "C:\Users\...\base_octubre.xlsx" --plantilla "C:\Users\...\plantilla_documentos_WO.xlsx" --consecutivo 1
   ```
   - `--consecutivo`: el siguiente número libre del DS en World Office.
   - `--plantilla`: la plantilla de importación de documentos que descarga de su World Office. Con ella el programa copia los nombres exactos de las columnas.
5. Abra el Excel resultante y revise, en este orden:
   - **ERRORES**: lo rojo NO se incluyó (corríjalo en la base y vuelva a correr el programa). Lo amarillo se incluyó, pero conviene revisarlo.
   - **CONTROL**: un renglón por DS con la base, la tarifa, la retención y el neto.
   - **TERCEROS_WO**: si algún proveedor no existe en World Office, créelo primero (o impórtelo).
6. En World Office, use el **asistente de importación de documentos**, elija el archivo y la hoja `IMPORTAR_WO`, y luego revise los DS importados antes de transmitirlos a la DIAN.

> Pruebe primero con 2 o 3 filas en una empresa de prueba, o verifique bien
> antes de importar todo el mes.

## Cómo pedírselo a cualquier IA

**Opción A, si la IA puede ejecutar código** (Claude Code, ChatGPT con análisis de datos, etc.):
suba `generar_ds.py`, `config.json`, `especificacion_ia.json`, su base y la plantilla de World Office, y escriba:

> Lee `especificacion_ia.json` y sigue sus `instrucciones_para_la_ia`. Ejecuta
> `generar_ds.py` con mi base `base_octubre.xlsx`, la plantilla
> `plantilla_WO.xlsx` y el consecutivo 15. Muéstrame el resumen y los errores,
> y entrégame el Excel generado.

**Opción B, si la IA no tiene los archivos .py** (solo puede leer el JSON y la base):

> Lee `especificacion_ia.json`. Con base en él, escribe y ejecuta un programa
> que haga exactamente lo que dice (pasa también las `pruebas_de_aceptacion`) y
> procésame la base adjunta con consecutivo 15.

**Opción C, si la IA no ejecuta código**: pídale que aplique el `algoritmo` del
JSON a mano y le entregue las tablas `IMPORTAR_WO`, `CONTROL` y `ERRORES`.
Solo es práctico con pocas filas, y hay que revisar las cuentas.

## Ajustes habituales en `config.json`

- **Nombre de la empresa**: `empresa.nombre_en_world_office`, tal cual aparece en World Office.
- **Prefijo / tipo de documento / forma de pago**: en `documento`.
- **Un DS por fila** en lugar de agrupar por tercero y fecha: `"agrupar_por": ["fila"]`.
- **Palabras que clasifican**: agréguelas en `conceptos[].palabras_clave`. Por ejemplo, si "Almuerzo" queda en ERRORES y es un servicio, agréguela a SERV.
- **Su base usa otros títulos de columna**: agréguelos en `base_terceros.columnas`.
- **Cuentas contables**: en `conceptos[].cuenta_gasto`, `cuenta_retefuente` y `cuentas.contrapartida_pago` (hoy 110505 Caja).
- **UVT**: `tributario.uvt`. Se cambia cada año.
- **Otros conceptos** (honorarios, arriendos, compras): están en `conceptos_inactivos`. Para activar uno, muévalo a `conceptos` y confirme la tarifa con el contador.
- **Modo inventario**: si en World Office el DS se maneja con productos/servicios y es el programa contable el que calcula las retenciones, use `"modo_salida": "inventario"` y ponga los códigos en `producto_world_office`.

## Lo que se debe verificar (no confirmado)

- **Nombres de columna de la plantilla de World Office**: no se pudieron
  consultar en línea, así que los de `config.json` son una referencia. La forma
  segura es usar `--plantilla` con la que descargue de su World Office. El
  programa le dirá en ERRORES qué columnas no encontró.
- **Cuentas contables**: son las del PUC de referencia; confírmelas con su plan de cuentas.
- **Bases y tarifas**: servicios 4 % y transporte 1 % sobre 2 UVT, según lo
  indicado por la empresa y el Decreto 572 de 2025. Ese decreto estuvo
  suspendido entre mayo y junio de 2026 y las fuentes consultadas no coinciden
  en todos los conceptos, así que el contador debe confirmar la norma vigente.
- **Base mínima**: el programa la evalúa sobre el total del documento por
  concepto. Si su contador la aplica por pago individual, use
  `"agrupar_por": ["fila"]`.

## Referencias

Colombia. Dirección de Impuestos y Aduanas Nacionales. (2021). *Resolución 000167 de 2021*. https://normograma.mintic.gov.co/mintic/docs/pdf/resolucion_dian_0167_2021.pdf

Instituto Nacional de Contadores Públicos. (2025, diciembre). *DIAN fijó en $52.374 el valor de la UVT para el año gravable 2026*. https://incp.org.co/publicaciones/infoincp-publicaciones/impuestos/2025/12/dian-fijo-en-52-374-en-valor-de-la-uvt-para-el-ano-gravable-2026/

Gerencie.com. (s. f.). *Tabla de retención en la fuente 2026*. https://www.gerencie.com/tabla-de-retencion-en-la-fuente-2026.html

ITS Contable. (s. f.). *Suspensión del Decreto 572 de 2025: ¿Qué pasa con la retención en la fuente en 2026?* https://www.itscontable.com/blog/suspension-del-decreto-572-de-2025-retencion-en-la-fuente/
