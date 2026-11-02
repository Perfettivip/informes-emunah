#!/usr/bin/env python3
"""Generador de Documentos Soporte (DS) para importar en World Office.

Lee una base de terceros/operaciones (Excel .xlsx o .csv), la analiza,
clasifica cada operación en un concepto (servicios, transporte...), calcula
la retención en la fuente y arma un Excel con el formato de importación de
documentos de World Office, más hojas de control.

Uso:
    python generar_ds.py BASE.xlsx
    python generar_ds.py BASE.xlsx --plantilla PlantillaWO.xlsx --salida DS_noviembre.xlsx
    python generar_ds.py BASE.xlsx --consecutivo 120 --config config.json

Las reglas (tarifas, cuentas, nombres de columnas) están en config.json;
el programa no tiene valores tributarios escritos en el código.
"""
import argparse
import csv
import difflib
import json
import re
import sys
import unicodedata
from collections import OrderedDict
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill
    from openpyxl.utils import get_column_letter
except ImportError:
    sys.exit("Falta la librería openpyxl. Instálela con:  pip install openpyxl")

AQUI = Path(__file__).resolve().parent


# ----------------------------------------------------------------- utilidades
def normalizar(texto) -> str:
    """minúsculas, sin tildes, sin signos y con un solo espacio."""
    t = unicodedata.normalize("NFKD", str(texto or "")).encode("ascii", "ignore").decode()
    t = re.sub(r"[^a-z0-9]+", " ", t.lower())
    return t.strip()


def digito_verificacion(nit: str) -> str:
    """Dígito de verificación DIAN (algoritmo módulo 11)."""
    pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]
    digitos = [int(d) for d in reversed(nit)]
    if len(digitos) > len(pesos):
        return ""
    s = sum(d * p for d, p in zip(digitos, pesos)) % 11
    return str(11 - s) if s > 1 else str(s)


def a_decimal(valor):
    """Convierte '$ 1.250.000', '1,250,000.50', 1250000 ... a Decimal."""
    if valor is None or valor == "":
        return None
    if isinstance(valor, (int, float, Decimal)):
        return Decimal(str(valor))
    t = re.sub(r"[^\d,.\-]", "", str(valor))
    if not t or t in "-.,":
        return None
    if "," in t and "." in t:  # el último separador es el decimal
        if t.rfind(",") > t.rfind("."):
            t = t.replace(".", "").replace(",", ".")
        else:
            t = t.replace(",", "")
    elif "," in t:
        partes = t.split(",")
        t = t.replace(",", ".") if len(partes) == 2 and len(partes[1]) in (1, 2) else t.replace(",", "")
    elif t.count(".") > 1 or (t.count(".") == 1 and len(t.split(".")[1]) == 3):
        t = t.replace(".", "")  # 1.250.000 o 250.000 -> miles
    try:
        return Decimal(t)
    except Exception:
        return None


def a_fecha(valor):
    if valor is None or valor == "":
        return None
    if isinstance(valor, datetime):
        return valor.date()
    if isinstance(valor, date):
        return valor
    if isinstance(valor, (int, float)) and 20000 < valor < 80000:  # serial de Excel
        return date(1899, 12, 30) + timedelta(days=int(valor))
    t = str(valor).strip()
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y", "%Y/%m/%d", "%d.%m.%Y"):
        try:
            return datetime.strptime(t[:10], fmt).date()
        except ValueError:
            pass
    return None


def es_si(valor) -> bool:
    return normalizar(valor) in ("si", "s", "x", "1", "true", "verdadero", "declarante", "yes")


def pct(tarifa: Decimal) -> str:
    """0.04 -> '4', 0.035 -> '3,5'."""
    return format((tarifa * 100).normalize(), "f").replace(".", ",")


def redondear(valor: Decimal, decimales: int) -> Decimal:
    return valor.quantize(Decimal(1).scaleb(-decimales), rounding=ROUND_HALF_UP)


# -------------------------------------------------------------- lectura base
def leer_tabla(ruta: Path, hoja: str = ""):
    """Devuelve (encabezados, filas[list]) de un .xlsx/.xlsm o .csv."""
    if ruta.suffix.lower() == ".csv":
        crudo = ruta.read_bytes()
        texto = None
        for enc in ("utf-8-sig", "cp1252", "latin-1"):
            try:
                texto = crudo.decode(enc)
                break
            except UnicodeDecodeError:
                pass
        dialecto = csv.Sniffer().sniff(texto[:5000], delimiters=";,\t|")
        filas = list(csv.reader(texto.splitlines(), dialecto))
    else:
        wb = openpyxl.load_workbook(ruta, data_only=True, read_only=True)
        ws = wb[hoja] if hoja else wb.worksheets[0]
        filas = [list(f) for f in ws.iter_rows(values_only=True)]
    filas = [f for f in filas if any(c not in (None, "") for c in f)]
    if not filas:
        raise SystemExit(f"La base {ruta.name} está vacía.")
    return filas[0], filas[1:]


def mapear_columnas(encabezados, sinonimos: dict):
    """Empata cada campo lógico con la columna de la base (por sinónimo)."""
    norm = [normalizar(h) for h in encabezados]
    mapa = {}
    for campo, opciones in sinonimos.items():
        opciones = [normalizar(o) for o in opciones]
        idx = next((i for i, h in enumerate(norm) if h in opciones), None)
        if idx is None:  # coincidencia parcial: "valor total pagado" contiene "valor total"
            idx = next((i for i, h in enumerate(norm) for o in opciones
                        if h and (h.startswith(o + " ") or h.endswith(" " + o))), None)
        if idx is not None and idx not in mapa.values():
            mapa[campo] = idx
    return mapa


# ------------------------------------------------------------- clasificación
def clasificar(concepto_txt, descripcion, conceptos, por_defecto):
    """Devuelve (concepto, como_se_clasifico). Primero código exacto, luego palabras clave."""
    c_norm = normalizar(concepto_txt)
    for c in conceptos:
        if c_norm and c_norm in (normalizar(c["codigo"]), normalizar(c["nombre"])):
            return c, "código"
    texto = f" {c_norm} {normalizar(descripcion)} "
    puntaje = []
    for c in conceptos:
        p = sum(len(k) for k in map(normalizar, c["palabras_clave"]) if re.search(rf"\b{re.escape(k)}", texto))
        if p:
            puntaje.append((p, c))
    if puntaje:
        puntaje.sort(key=lambda x: -x[0])
        empate = len(puntaje) > 1 and puntaje[0][0] == puntaje[1][0]
        return puntaje[0][1], "palabras clave (EMPATE, revisar)" if empate else "palabras clave"
    if por_defecto:
        c = next((c for c in conceptos if c["codigo"] == por_defecto), None)
        if c:
            return c, "por defecto (revisar)"
    return None, "sin clasificar"


# ----------------------------------------------------------------- análisis
def analizar(cfg, encabezados, filas):
    sin = cfg["base_terceros"]["columnas"]
    mapa = mapear_columnas(encabezados, sin)
    trib = cfg["tributario"]
    uvt = Decimal(str(trib["uvt"]))
    dec = int(trib.get("redondeo", 0))
    hoy = date.today()

    faltan = [c for c in ("nit", "valor") if c not in mapa]
    if faltan:
        raise SystemExit(
            "No encontré en la base las columnas obligatorias: " + ", ".join(faltan)
            + f".\nColumnas leídas: {encabezados}\n"
            "Agregue el nombre de su columna a 'base_terceros.columnas' en config.json.")

    def celda(fila, campo):
        i = mapa.get(campo)
        return fila[i] if i is not None and i < len(fila) else None

    operaciones, errores, terceros = [], [], OrderedDict()
    for n, fila in enumerate(filas, start=2):
        prob, aviso = [], []
        nit_txt = str(celda(fila, "nit") or "").strip()
        if re.fullmatch(r"\d+\.0", nit_txt):
            nit_txt = nit_txt[:-2]
        nit = re.sub(r"\D", "", nit_txt.split("-")[0])
        dv_base = re.sub(r"\D", "", str(celda(fila, "dv") or (nit_txt.split("-")[1] if "-" in nit_txt else "")))
        if not nit or not 5 <= len(nit) <= 15:
            prob.append(f"NIT/cédula inválido: '{nit_txt}'")
        dv = digito_verificacion(nit) if nit else ""
        if dv_base and dv and dv_base != dv:
            aviso.append(f"DV de la base ({dv_base}) no coincide con el calculado ({dv}); se usa {dv}")

        nombre = str(celda(fila, "nombre") or "").strip()
        if not nombre:
            aviso.append("Sin nombre del tercero")

        valor = a_decimal(celda(fila, "valor"))
        cantidad = a_decimal(celda(fila, "cantidad")) or Decimal(1)
        if valor is None or valor <= 0:
            prob.append(f"Valor inválido: '{celda(fila, 'valor')}'")

        fecha = a_fecha(celda(fila, "fecha")) if "fecha" in mapa else hoy
        if fecha is None:
            prob.append(f"Fecha inválida: '{celda(fila, 'fecha')}'")
        elif fecha > hoy:
            aviso.append("Fecha futura")

        iva = a_decimal(celda(fila, "iva")) or Decimal(0)
        if iva and not trib.get("calcular_iva", False):
            aviso.append("La base trae IVA, pero la configuración dice proveedor NO responsable de IVA; el IVA se ignora")
            iva = Decimal(0)

        concepto, como = clasificar(celda(fila, "concepto"), celda(fila, "descripcion"),
                                    cfg["conceptos"], cfg.get("concepto_por_defecto"))
        if concepto is None:
            prob.append("No se pudo clasificar el concepto (agregue la palabra clave en config.json o la columna 'concepto')")
        elif como != "código" and "revisar" in como:
            aviso.append(f"Concepto asignado por {como}")

        if prob:
            errores.append({"fila": n, "nit": nit_txt, "nombre": nombre, "tipo": "ERROR",
                            "detalle": "; ".join(prob + aviso)})
            continue
        for a in aviso:
            errores.append({"fila": n, "nit": nit, "nombre": nombre, "tipo": "ADVERTENCIA", "detalle": a})

        declarante = es_si(celda(fila, "declarante"))
        terceros.setdefault(nit, {
            "nit": nit, "dv": dv, "nombre": nombre,
            "tipo_id": str(celda(fila, "tipo_id") or ("NIT" if len(nit) == 9 and nit[0] in "89" else "CC")),
            "direccion": celda(fila, "direccion") or "", "ciudad": celda(fila, "ciudad") or "",
            "telefono": celda(fila, "telefono") or "", "email": celda(fila, "email") or "",
        })
        operaciones.append({
            "fila": n, "nit": nit, "nombre": nombre, "fecha": fecha, "valor": valor,
            "cantidad": cantidad, "iva": iva, "declarante": declarante, "concepto": concepto,
            "clasificacion": como, "descripcion": str(celda(fila, "descripcion") or concepto["nombre"]),
            "centro_costos": celda(fila, "centro_costos") or "",
        })

    documentos = agrupar(cfg, operaciones)
    for d in documentos:
        calcular_retenciones(d, uvt, dec, trib, cfg)
    return documentos, errores, list(terceros.values()), mapa


def agrupar(cfg, operaciones):
    claves = cfg["documento"].get("agrupar_por", ["nit", "fecha"])
    docs = OrderedDict()
    for op in operaciones:
        k = tuple(op["fila"] if c == "fila" else op[c] for c in claves) + (op["nit"],)
        docs.setdefault(k, []).append(op)
    numero = int(cfg["documento"]["consecutivo_inicial"])
    salida = []
    for ops in docs.values():
        salida.append({"numero": numero, "nit": ops[0]["nit"], "nombre": ops[0]["nombre"],
                       "fecha": max(o["fecha"] for o in ops), "lineas": ops})
        numero += 1
    return salida


def calcular_retenciones(doc, uvt, dec, trib, cfg):
    """La base mínima se evalúa sobre el total del documento por concepto (no por línea)."""
    por_concepto = OrderedDict()
    for op in doc["lineas"]:
        por_concepto.setdefault(op["concepto"]["codigo"], []).append(op)
    doc["retenciones"] = []
    for cod, ops in por_concepto.items():
        c = ops[0]["concepto"]
        base = sum((o["valor"] for o in ops), Decimal(0))
        minimo = Decimal(str(c["base_uvt"])) * uvt
        tarifa = Decimal(str(c["tarifa_declarante"] if ops[0]["declarante"] else c["tarifa_no_declarante"]))
        aplica = base >= minimo
        valor = redondear(base * tarifa, dec) if aplica else Decimal(0)
        doc["retenciones"].append({
            "concepto": c, "base": base, "base_minima": minimo, "tarifa": tarifa,
            "aplica": aplica, "valor": valor,
            "cuenta": c.get("cuenta_retefuente") or cfg["cuentas"]["retefuente_por_pagar_default"]})
    doc["subtotal"] = sum((o["valor"] for o in doc["lineas"]), Decimal(0))
    doc["iva"] = sum((o["iva"] for o in doc["lineas"]), Decimal(0))
    doc["reteiva"] = redondear(doc["iva"] * Decimal(str(trib.get("reteiva_porcentaje", 0))), dec)
    rica = Decimal(str(trib.get("reteica_por_mil", 0) or 0))
    rica_min = Decimal(str(trib.get("reteica_base_uvt", 0) or 0)) * uvt
    doc["reteica"] = redondear(doc["subtotal"] * rica / 1000, dec) if rica and doc["subtotal"] >= rica_min else Decimal(0)
    doc["retefuente"] = sum((r["valor"] for r in doc["retenciones"]), Decimal(0))
    doc["neto"] = doc["subtotal"] + doc["iva"] - doc["retefuente"] - doc["reteiva"] - doc["reteica"]


# ---------------------------------------------------- plantilla World Office
def resolver_columnas_plantilla(cfg, ruta_plantilla, modo):
    """Lista ordenada de (campo_lógico, encabezado_real) y avisos."""
    pw = cfg["plantilla_world_office"]
    seccion = "detalle_contable" if modo == "contable" else "detalle_inventario"
    deseados = [("encab." + k, v) for k, v in pw["encabezado"].items()] + \
               [("det." + k, v) for k, v in pw[seccion].items()]
    avisos = []
    if not ruta_plantilla:
        return deseados, None, avisos

    wb = openpyxl.load_workbook(ruta_plantilla)
    ws = wb.worksheets[0]
    fila = int(pw.get("fila_encabezados", 1))
    reales = [c.value for c in ws[fila]]
    compacto = lambda t: normalizar(t).replace(" ", "")  # "Forma Pago" == "FormaPago"
    reales_norm = {compacto(r): r for r in reales if r not in (None, "")}
    asignados, usados = {}, set()
    # 1a pasada: nombres iguales (sin tildes, mayúsculas ni espacios)
    for campo, nombre in deseados:
        real = reales_norm.get(compacto(nombre))
        if real is not None and compacto(real) not in usados:
            usados.add(compacto(real))
            asignados[campo] = real
    # 2a pasada: parecido estricto, sólo entre columnas libres y sin confundir opuestos
    opuestos = [("interno", "externo"), ("debito", "credito"), ("inicial", "final")]
    for campo, nombre in deseados:
        if campo in asignados:
            continue
        n = compacto(nombre)
        libres = [k for k in reales_norm if k not in usados
                  and not any((a in n and b in k) or (b in n and a in k) for a, b in opuestos)]
        parecido = difflib.get_close_matches(n, libres, n=1, cutoff=0.88)
        if parecido:
            real = reales_norm[parecido[0]]
            usados.add(parecido[0])
            asignados[campo] = real
            avisos.append(f"'{nombre}' no está igual en la plantilla; se usó la columna parecida '{real}' (revisar)")
        else:
            avisos.append(f"La plantilla no tiene una columna para '{nombre}' ({campo}); ese dato no se exporta")
    asignados = list(asignados.items())
    sobrantes = [r for r in reales if r not in (None, "") and compacto(r) not in usados]
    if sobrantes:
        avisos.append("Columnas de la plantilla que quedan vacías: " + ", ".join(map(str, sobrantes)))
    # se respeta el orden real de la plantilla
    orden = {r: i for i, r in enumerate(reales)}
    asignados.sort(key=lambda x: orden.get(x[1], 999))
    return asignados, (reales, fila), avisos


def filas_world_office(cfg, docs, modo):
    """Cada documento genera varias filas; el encabezado se repite en cada fila."""
    d_cfg, cuentas = cfg["documento"], cfg["cuentas"]
    fmt = d_cfg.get("fecha_formato_salida", "%d/%m/%Y")
    fijos = cfg["plantilla_world_office"].get("valores_fijos_inventario", {})
    salida = []
    for doc in docs:
        enc = {
            "encab.empresa": cfg["empresa"]["nombre_en_world_office"],
            "encab.tipo_documento": d_cfg["tipo_documento"],
            "encab.prefijo": d_cfg["prefijo"],
            "encab.numero": doc["numero"],
            "encab.fecha": doc["fecha"].strftime(fmt),
            "encab.tercero_interno": d_cfg.get("tercero_interno", ""),
            "encab.tercero_externo": doc["nit"],
            "encab.nota": f'{d_cfg.get("nota_encabezado", "")} - {doc["nombre"]}'.strip(" -"),
            "encab.forma_pago": d_cfg.get("forma_pago", ""),
            "encab.verificado": 0,
            "encab.anulado": 0,
        }
        fecha_txt = doc["fecha"].strftime(fmt)
        if modo == "inventario":
            for op in doc["lineas"]:
                salida.append({**enc,
                    "det.producto": op["concepto"].get("producto_world_office", op["concepto"]["codigo"]),
                    "det.bodega": fijos.get("bodega", ""), "det.unidad_medida": fijos.get("unidad_medida", ""),
                    "det.cantidad": float(op["cantidad"]),
                    "det.iva": 0 if not op["iva"] else float(round(op["iva"] / op["valor"] * 100)),
                    "det.valor_unitario": float(op["valor"] / op["cantidad"]),
                    "det.descuento": 0, "det.vencimiento": fecha_txt,
                    "det.nota": op["descripcion"], "det.centro_costos": op["centro_costos"]})
            continue
        # modo contable: partida doble
        def linea(cuenta, nota, debito=0, credito=0, base="", cc=""):
            salida.append({**enc, "det.cuenta": cuenta, "det.nota": nota, "det.tercero": doc["nit"],
                           "det.debito": float(debito), "det.credito": float(credito),
                           "det.base": float(base) if base != "" else "", "det.centro_costos": cc,
                           "det.vencimiento": fecha_txt})
        for op in doc["lineas"]:
            linea(op["concepto"]["cuenta_gasto"], op["descripcion"], debito=op["valor"], cc=op["centro_costos"])
        if doc["iva"]:
            linea(cuentas["iva_descontable"], "IVA descontable", debito=doc["iva"])
        for r in doc["retenciones"]:
            if r["valor"]:
                linea(r["cuenta"], f'Retefuente {r["concepto"]["nombre"]} {pct(r["tarifa"])}%',
                      credito=r["valor"], base=r["base"])
        if doc["reteiva"]:
            linea(cuentas["reteiva_por_pagar"], "ReteIVA", credito=doc["reteiva"], base=doc["iva"])
        if doc["reteica"]:
            linea(cuentas["reteica_por_pagar"], "ReteICA", credito=doc["reteica"], base=doc["subtotal"])
        linea(cuentas["contrapartida_pago"], f'Pago {d_cfg.get("forma_pago", "")} {doc["nombre"]}'.strip(),
              credito=doc["neto"])
    return salida


# --------------------------------------------------------------- escritura
NEGRITA = Font(bold=True)
GRIS = PatternFill("solid", fgColor="DDDDDD")
ROJO = PatternFill("solid", fgColor="F8D7DA")
AMARILLO = PatternFill("solid", fgColor="FFF3CD")


def hoja_simple(wb, titulo, encabezados, filas, relleno=None):
    ws = wb.create_sheet(titulo)
    ws.append(encabezados)
    for c in ws[1]:
        c.font, c.fill = NEGRITA, GRIS
    for f in filas:
        ws.append(f)
    if relleno:
        for fila in ws.iter_rows(min_row=2):
            r = relleno(fila)
            if r:
                for c in fila:
                    c.fill = r
    for i, h in enumerate(encabezados, start=1):
        largo = max([len(str(h))] + [len(str(f[i - 1])) for f in filas if i - 1 < len(f)])
        ws.column_dimensions[get_column_letter(i)].width = min(max(10, largo + 2), 60)
    ws.freeze_panes = "A2"
    return ws


def escribir(cfg, docs, errores, terceros, modo, columnas, info_plantilla, salida: Path):
    filas = filas_world_office(cfg, docs, modo)
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    # 1. Hoja para importar (primera hoja, como la plantilla de World Office)
    ws = wb.create_sheet("IMPORTAR_WO")
    if info_plantilla:  # copia exacta del orden de columnas de la plantilla real
        reales, _ = info_plantilla
        encabezados = [r for r in reales]
        campo_de = {real: campo for campo, real in columnas}
    else:
        encabezados = [real for _, real in columnas]
        campo_de = {real: campo for campo, real in columnas}
    ws.append(encabezados)
    for c in ws[1]:
        c.font = NEGRITA
    for f in filas:
        ws.append([f.get(campo_de.get(h), "") if h in campo_de else "" for h in encabezados])
    for i, h in enumerate(encabezados, start=1):
        ws.column_dimensions[get_column_letter(i)].width = max(12, len(str(h or "")) + 2)

    # 2. Control de cada documento soporte
    hoja_simple(wb, "CONTROL",
        ["Prefijo", "Número", "Fecha", "NIT", "Nombre", "Conceptos", "Subtotal", "IVA",
         "Base retención", "Tarifa", "Base mínima", "Retefuente", "ReteICA", "Neto a pagar", "Filas base"],
        [[cfg["documento"]["prefijo"], d["numero"], d["fecha"].isoformat(), d["nit"], d["nombre"],
          ", ".join(r["concepto"]["nombre"] for r in d["retenciones"]),
          float(d["subtotal"]), float(d["iva"]),
          " / ".join(f'{r["base"]:,.0f}' for r in d["retenciones"]),
          " / ".join(f'{pct(r["tarifa"])}%' if r["aplica"] else "no aplica (bajo base)" for r in d["retenciones"]),
          " / ".join(f'{r["base_minima"]:,.0f}' for r in d["retenciones"]),
          float(d["retefuente"]), float(d["reteica"]), float(d["neto"]),
          ", ".join(str(o["fila"]) for o in d["lineas"])] for d in docs])

    # 3. Resumen por concepto
    resumen = OrderedDict()
    for d in docs:
        for r in d["retenciones"]:
            k = r["concepto"]["nombre"]
            a = resumen.setdefault(k, [0, Decimal(0), Decimal(0)])
            a[0] += 1
            a[1] += r["base"]
            a[2] += r["valor"]
    hoja_simple(wb, "RESUMEN", ["Concepto", "Documentos", "Base total", "Retención total"],
                [[k, v[0], float(v[1]), float(v[2])] for k, v in resumen.items()] +
                [["TOTAL", len(docs), float(sum(d["subtotal"] for d in docs)),
                  float(sum(d["retefuente"] for d in docs))]])

    # 4. Terceros (para crearlos en World Office si no existen)
    tcols = cfg["plantilla_terceros_world_office"]["columnas"]
    hoja_simple(wb, "TERCEROS_WO", list(tcols.values()),
                [[t.get(k, "") for k in tcols] for t in terceros])

    # 5. Errores y advertencias
    hoja_simple(wb, "ERRORES", ["Fila base", "Tipo", "NIT", "Nombre", "Detalle"],
                [[e["fila"], e["tipo"], e["nit"], e["nombre"], e["detalle"]] for e in errores],
                relleno=lambda f: ROJO if f[1].value == "ERROR" else AMARILLO)
    wb.save(salida)
    return len(filas)


# -------------------------------------------------------------------- main
def main(argv=None):
    ap = argparse.ArgumentParser(description="Genera documentos soporte para importar en World Office.")
    ap.add_argument("base", help="Base de terceros/operaciones (.xlsx, .xlsm o .csv)")
    ap.add_argument("--config", default=str(AQUI / "config.json"))
    ap.add_argument("--plantilla", help="Plantilla de importación de documentos descargada de World Office (.xlsx)")
    ap.add_argument("--salida", help="Archivo de salida (por defecto DS_WO_<fecha>.xlsx junto a la base)")
    ap.add_argument("--consecutivo", type=int, help="Primer número de documento soporte (sobrescribe config)")
    ap.add_argument("--modo", choices=["contable", "inventario"], help="Sobrescribe modo_salida de config")
    ap.add_argument("--hoja", help="Hoja de la base a leer (por defecto la primera)")
    a = ap.parse_args(argv)

    cfg = json.loads(Path(a.config).read_text(encoding="utf-8"))
    if a.consecutivo is not None:
        cfg["documento"]["consecutivo_inicial"] = a.consecutivo
    modo = a.modo or cfg.get("modo_salida", "contable")

    base = Path(a.base)
    encabezados, filas = leer_tabla(base, a.hoja or cfg["base_terceros"].get("hoja", ""))
    docs, errores, terceros, mapa = analizar(cfg, encabezados, filas)
    columnas, info_plantilla, avisos = resolver_columnas_plantilla(cfg, a.plantilla, modo)
    for av in avisos:
        errores.append({"fila": "-", "nit": "", "nombre": "", "tipo": "ADVERTENCIA", "detalle": "Plantilla: " + av})

    salida = Path(a.salida) if a.salida else base.with_name(f"DS_WO_{datetime.now():%Y%m%d_%H%M}.xlsx")
    n_filas = escribir(cfg, docs, errores, terceros, modo, columnas, info_plantilla, salida)

    n_err = sum(1 for e in errores if e["tipo"] == "ERROR")
    n_adv = len(errores) - n_err
    print(f"Columnas detectadas en la base: " + ", ".join(f"{k}={encabezados[v]!r}" for k, v in mapa.items()))
    print(f"Documentos soporte generados: {len(docs)}  (filas para World Office: {n_filas}, modo {modo})")
    if docs:
        print(f"Numeración: {cfg['documento']['prefijo']} {docs[0]['numero']} a {docs[-1]['numero']}")
        print(f"Total base: {sum(d['subtotal'] for d in docs):,.0f}   Retefuente: {sum(d['retefuente'] for d in docs):,.0f}"
              f"   Neto a pagar: {sum(d['neto'] for d in docs):,.0f}")
    print(f"Errores (filas NO incluidas): {n_err}   Advertencias: {n_adv}  -> ver hoja ERRORES")
    print(f"Archivo: {salida}")
    return 0 if n_err == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
