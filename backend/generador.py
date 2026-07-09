"""Motor de generación de informes: arma el .docx a partir de la plantilla
template_unpacked/ reemplazando marcadores de texto y las 17 fotos.

Es la misma lógica de PLANTILLA_INFORME/generar_informe.py pero como módulo
importable (sin CLI) para que la use el backend web (main.py).
"""
import shutil
import subprocess
import sys
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image, ImageOps

HERE = Path(__file__).resolve().parent
TEMPLATE_DIR = HERE / "template_unpacked"
LIB_DIR = HERE / "_lib"

REQUIRED_PHOTOS = 17
SIMPLE_PLACEHOLDERS = [
    "empresa", "contacto", "cargo_contacto",
    "fecha_carta", "mes_ref", "num_informe", "parrafo_intro",
    "obs1", "obs2", "obs3", "trabajo1", "trabajo2", "gas_refrigerante",
]


class GeneradorError(Exception):
    pass


def validar_config(cfg: dict):
    missing = [k for k in SIMPLE_PLACEHOLDERS if k not in cfg]
    if missing:
        raise GeneradorError(f"Faltan campos en el config: {missing}")
    fotos = cfg.get("fotos", [])
    if len(fotos) != REQUIRED_PHOTOS:
        raise GeneradorError(f"Se esperaban {REQUIRED_PHOTOS} fotos, llegaron {len(fotos)}")
    nums = sorted(f["n"] for f in fotos)
    if nums != list(range(1, REQUIRED_PHOTOS + 1)):
        raise GeneradorError(f"Los campos 'n' de las fotos deben ser 1..17, llegaron: {nums}")


def _apply_placeholders(xml_path: Path, cfg: dict):
    text = xml_path.read_text(encoding="utf-8")

    def sub(token, value):
        nonlocal text
        placeholder = "{{%s}}" % token
        if placeholder not in text:
            raise GeneradorError(f"Marcador no encontrado en la plantilla: {placeholder}")
        text = text.replace(placeholder, escape(value))

    for key in SIMPLE_PLACEHOLDERS:
        sub(key.upper(), cfg[key])

    by_n = {f["n"]: f for f in cfg["fotos"]}
    for n in range(1, REQUIRED_PHOTOS + 1):
        foto = by_n[n]
        if n == REQUIRED_PHOTOS:
            sub("CAP17A", foto["caption"])
            sub("CAP17B", foto.get("caption2", ""))
        else:
            sub(f"CAP{n}", foto["caption"])

    xml_path.write_text(text, encoding="utf-8")


FOTO_MAX_DIM = 1000  # px, de sobra para el tamaño en que se muestran en el informe
FOTO_JPEG_QUALITY = 78


def _write_photos(media_dir: Path, cfg: dict):
    for foto in cfg["fotos"]:
        n = foto["n"]
        src = Path(foto["src"]).expanduser()
        if not src.exists():
            raise GeneradorError(f"No existe la foto: {src}")
        im = Image.open(src)
        im = ImageOps.exif_transpose(im).convert("RGB")
        im.thumbnail((FOTO_MAX_DIM, FOTO_MAX_DIM), Image.LANCZOS)
        im.save(media_dir / f"image{n}.jpeg", "JPEG", quality=FOTO_JPEG_QUALITY, optimize=True)


def _pack(work_dir: Path, out_path: Path):
    cmd = [sys.executable, str(LIB_DIR / "pack.py"), str(work_dir), str(out_path)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise GeneradorError(f"Fallo al empaquetar el docx: {result.stderr}")


def generar_informe(cfg: dict, out_path: Path, work_root: Path) -> Path:
    """Genera el .docx en out_path a partir de cfg. work_root es una carpeta
    temporal donde se arma el documento antes de empaquetar."""
    validar_config(cfg)
    work_root.mkdir(parents=True, exist_ok=True)
    work_dir = work_root / f"build_{out_path.stem}"
    if work_dir.exists():
        shutil.rmtree(work_dir)
    shutil.copytree(TEMPLATE_DIR, work_dir)

    _apply_placeholders(work_dir / "word" / "document.xml", cfg)
    _write_photos(work_dir / "word" / "media", cfg)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    _pack(work_dir, out_path)

    shutil.rmtree(work_dir)
    return out_path
