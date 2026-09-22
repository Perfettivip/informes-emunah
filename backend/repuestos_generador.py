"""Genera el .xlsx de 'Repuestos EMUNAH' de Soluciones EMUNAH SAS.

Toma el responsable que diligenció el formulario y la lista de repuestos
línea por línea (fecha, descripción, valor) y arma un libro de Excel con
esa información y el total.
"""
from pathlib import Path

from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

AZUL = "1E4D8B"
GRIS = "6B7280"
BORDE = "D7DCE3"

LOGO_PATH = Path(__file__).resolve().parent / "assets" / "logo_emunah.png"

COLS_REPUESTOS = ["Tipo", "Fecha", "Descripción", "Valor"]


class GeneradorError(Exception):
    pass


def _fmt_moneda(cell):
    cell.number_format = '"$" #,##0'


def _borde_fino():
    lado = Side(style="thin", color=BORDE)
    return Border(left=lado, right=lado, top=lado, bottom=lado)


def _fila_dato(ws, fila, etiqueta1, valor1, etiqueta2="", valor2=""):
    ws.cell(row=fila, column=1, value=etiqueta1).font = Font(bold=True, color=GRIS, size=9)
    ws.cell(row=fila, column=2, value=valor1).font = Font(size=11)
    if etiqueta2:
        ws.cell(row=fila, column=2, value=etiqueta2).font = Font(bold=True, color=GRIS, size=9)


def generar_repuestos(cfg: dict, out_path: Path):
    """cfg: dict con 'responsable' y cfg['repuestos'] = lista de dicts con
    las llaves fecha, descripcion, valor."""
    repuestos = cfg.get("repuestos") or []
    if not repuestos:
        raise GeneradorError("No se agregó ningún repuesto")

    wb = Workbook()
    ws = wb.active
    ws.title = "Repuestos"
    for col, ancho in zip("ABCD", [14, 16, 50, 18]):
        ws.column_dimensions[col].width = ancho

    fila = 1
    if LOGO_PATH.exists():
        img = XLImage(str(LOGO_PATH))
        img.height = 50
        img.width = 130
        ws.add_image(img, "A1")
        ws.row_dimensions[1].height = 40
        fila = 2

    ws.merge_cells(start_row=fila, start_column=1, end_row=fila, end_column=4)
    c = ws.cell(row=fila, column=1, value="SOLUCIONES EMUNAH SAS")
    c.font = Font(bold=True, size=14, color="FFFFFF")
    c.fill = PatternFill("solid", fgColor=AZUL)
    c.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[fila].height = 22
    fila += 1

    ws.merge_cells(start_row=fila, start_column=1, end_row=fila, end_column=4)
    c = ws.cell(row=fila, column=1, value="Repuestos EMUNAH")
    c.font = Font(bold=True, size=11, color=AZUL)
    c.alignment = Alignment(horizontal="center")
    fila += 2

    _fila_dato(ws, fila, "Responsable", cfg.get("responsable", ""))
    fila += 1
    ws.cell(row=fila, column=1, value="Fecha de envío").font = Font(bold=True, color=GRIS, size=9)
    ws.cell(row=fila, column=2, value=cfg.get("fecha_envio", "")).font = Font(size=11)
    fila += 2

    fila_encabezado_tabla = fila
    for i, titulo in enumerate(COLS_REPUESTOS, start=1):
        c = ws.cell(row=fila, column=i, value=titulo)
        c.font = Font(bold=True, color="FFFFFF", size=10)
        c.fill = PatternFill("solid", fgColor=AZUL)
        c.alignment = Alignment(horizontal="center")
        c.border = _borde_fino()
    fila += 1

    total = 0.0
    for r in repuestos:
        valor = float(r.get("valor") or 0)
        total += valor
        valores = [r.get("tipo", ""), r.get("fecha", ""), r.get("descripcion", ""), valor]
        for col, val in enumerate(valores, start=1):
            c = ws.cell(row=fila, column=col, value=val)
            c.border = _borde_fino()
            if col == 4:
                _fmt_moneda(c)
        fila += 1

    fila += 1
    ws.cell(row=fila, column=1, value="TOTAL").font = Font(bold=True, size=11)
    ct = ws.cell(row=fila, column=4, value=total)
    ct.font = Font(bold=True, size=11)
    _fmt_moneda(ct)

    ws.freeze_panes = f"A{fila_encabezado_tabla + 1}"

    out_path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(out_path)
