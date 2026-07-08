#!/usr/bin/env python3
"""Download Golden SGF historical quotes and generate data/cotacoes.json.

This script is intended to run in GitHub Actions, but can also run locally:
    pip install -r requirements.txt
    python scripts/update_data.py
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import requests

SOURCE_URL = "https://goldensgf.pt/wp-content/uploads/2024/08/HISTORICO-DE-COTACOES.xlsx"
ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)
XLSX_PATH = DATA_DIR / "historico_cotacoes.xlsx"
JSON_PATH = DATA_DIR / "cotacoes.json"


def normalize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]
    required = {"Nome do Fundo", "Cotação", "Data"}

    if required.issubset(df.columns):
        out = df[["Nome do Fundo", "Cotação", "Data"]].copy()
    else:
        # Defensive fallback if the Excel ever changes into a wide layout.
        parts = []
        cols = list(df.columns)
        for i in range(0, len(cols) - 1, 2):
            fund = str(cols[i]).strip()
            tmp = df[[cols[i], cols[i + 1]]].copy()
            tmp.columns = ["Cotação", "Data"]
            tmp["Nome do Fundo"] = fund
            parts.append(tmp[["Nome do Fundo", "Cotação", "Data"]])
        out = pd.concat(parts, ignore_index=True) if parts else pd.DataFrame(columns=["Nome do Fundo", "Cotação", "Data"])

    out["Nome do Fundo"] = out["Nome do Fundo"].astype(str).str.strip()
    out["Cotação"] = pd.to_numeric(out["Cotação"], errors="coerce")
    out["Data"] = pd.to_datetime(out["Data"], errors="coerce")
    out = out.dropna(subset=["Nome do Fundo", "Cotação", "Data"])
    out = out[out["Nome do Fundo"].str.len() > 0]
    out = out.sort_values(["Nome do Fundo", "Data"])
    out = out.drop_duplicates(["Nome do Fundo", "Data"], keep="last")
    return out


def main() -> None:
    print(f"Downloading {SOURCE_URL}")
    response = requests.get(SOURCE_URL, timeout=90)
    response.raise_for_status()
    XLSX_PATH.write_bytes(response.content)

    df_raw = pd.read_excel(XLSX_PATH, sheet_name=0, engine="openpyxl")
    df = normalize_dataframe(df_raw)
    if df.empty:
        raise RuntimeError("No valid rows found in the downloaded Excel file.")

    rows = []
    for _, row in df.sort_values(["Data", "Nome do Fundo"]).iterrows():
        rows.append({
            "fundo": row["Nome do Fundo"],
            "data": row["Data"].strftime("%Y-%m-%d"),
            "cotacao": round(float(row["Cotação"]), 6),
        })

    payload = {
        "source": SOURCE_URL,
        "updated_at": pd.Timestamp.utcnow().isoformat(),
        "min_date": df["Data"].min().strftime("%Y-%m-%d"),
        "max_date": df["Data"].max().strftime("%Y-%m-%d"),
        "fundos": sorted(df["Nome do Fundo"].unique().tolist()),
        "rows": rows,
    }

    JSON_PATH.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Generated {JSON_PATH}")
    print(f"Rows: {len(rows)}")
    print(f"Funds: {len(payload['fundos'])}")
    print(f"Date range: {payload['min_date']} -> {payload['max_date']}")


if __name__ == "__main__":
    main()
