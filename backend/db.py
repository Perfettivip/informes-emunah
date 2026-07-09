"""Numeración consecutiva e historial de informes generados (SQLite simple)."""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "informes.db"

# El Informe 9 y 10 de FALABELLA.COM ya existen (hechos a mano antes de la app).
# El próximo generado por la app debe continuar en 11.
NUMERO_INICIAL = {
    "FALABELLA.COM": 11,
}


def _conn():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """CREATE TABLE IF NOT EXISTS informes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente TEXT NOT NULL,
            numero INTEGER NOT NULL,
            mes_ref TEXT,
            fecha_carta TEXT,
            filename TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )"""
    )
    return conn


def siguiente_numero(cliente: str) -> int:
    conn = _conn()
    row = conn.execute(
        "SELECT MAX(numero) FROM informes WHERE cliente = ?", (cliente,)
    ).fetchone()
    conn.close()
    if row and row[0] is not None:
        return row[0] + 1
    return NUMERO_INICIAL.get(cliente, 1)


def registrar(cliente: str, numero: int, mes_ref: str, fecha_carta: str, filename: str):
    conn = _conn()
    conn.execute(
        "INSERT INTO informes (cliente, numero, mes_ref, fecha_carta, filename) VALUES (?, ?, ?, ?, ?)",
        (cliente, numero, mes_ref, fecha_carta, filename),
    )
    conn.commit()
    conn.close()


def empresas():
    """Nombres de empresas ya usadas, para autocompletar en el formulario."""
    conn = _conn()
    rows = conn.execute(
        "SELECT cliente, MAX(created_at) FROM informes GROUP BY cliente ORDER BY MAX(created_at) DESC"
    ).fetchall()
    conn.close()
    return [r[0] for r in rows]


def historial(cliente: str, limite: int = 20):
    conn = _conn()
    rows = conn.execute(
        "SELECT numero, mes_ref, fecha_carta, filename, created_at FROM informes "
        "WHERE cliente = ? ORDER BY numero DESC LIMIT ?",
        (cliente, limite),
    ).fetchall()
    conn.close()
    return [
        {"numero": r[0], "mes_ref": r[1], "fecha_carta": r[2], "filename": r[3], "created_at": r[4]}
        for r in rows
    ]
