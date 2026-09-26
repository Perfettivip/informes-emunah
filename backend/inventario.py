"""Conexión con el Google Sheet de inventario (factura BAYEN BYE91397) a
través de un Google Apps Script publicado como aplicación web.

Variables de entorno (Render):
    INVENTARIO_SCRIPT_URL   URL de la aplicación web del Apps Script (termina en /exec)
    INVENTARIO_TOKEN        secreto compartido con el script
"""
import os
import time

import requests


class InventarioError(Exception):
    pass


_cache = {"t": 0, "productos": []}


def configurado() -> bool:
    return bool(os.environ.get("INVENTARIO_SCRIPT_URL") and os.environ.get("INVENTARIO_TOKEN"))


def _url():
    if not configurado():
        raise InventarioError("El inventario no está configurado (faltan INVENTARIO_SCRIPT_URL/INVENTARIO_TOKEN en Render).")
    return os.environ["INVENTARIO_SCRIPT_URL"], os.environ["INVENTARIO_TOKEN"]


def listar(forzar: bool = False):
    if not forzar and time.time() - _cache["t"] < 30 and _cache["productos"]:
        return _cache["productos"]
    url, token = _url()
    try:
        r = requests.get(url, params={"token": token}, timeout=30)
        data = r.json()
    except (requests.RequestException, ValueError) as e:
        raise InventarioError(f"No se pudo leer el inventario: {e}")
    if not data.get("ok"):
        raise InventarioError(f"El inventario respondió: {data.get('error')}")
    _cache.update(t=time.time(), productos=data["productos"])
    return data["productos"]


def registrar_venta(vendedor: str, ventas: list):
    """ventas: dicts con fecha, cliente, codigo, cantidad, precio_unit, nota.
    Devuelve las líneas con total, costo_total, utilidad y stock_restante."""
    url, token = _url()
    try:
        r = requests.post(url, json={"token": token, "vendedor": vendedor, "ventas": ventas}, timeout=60)
        data = r.json()
    except (requests.RequestException, ValueError) as e:
        raise InventarioError(f"No se pudo registrar en el inventario: {e}")
    if not data.get("ok"):
        raise InventarioError(str(data.get("error")))
    _cache["t"] = 0
    return data["lineas"]
