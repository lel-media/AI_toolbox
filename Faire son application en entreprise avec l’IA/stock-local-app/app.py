from __future__ import annotations

import cgi
import json
import math
from dataclasses import dataclass
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from typing import Any

import pandas as pd


ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "static"
MAX_UPLOAD_BYTES = 8 * 1024 * 1024

REQUIRED_COLUMNS = {
    "produit",
    "categorie",
    "stock_actuel",
    "stock_minimum",
    "ventes_7_jours",
    "delai_reappro_jours",
    "fournisseur",
    "dernier_reappro",
    "commentaire",
}


@dataclass
class ProductAnalysis:
    row: dict[str, Any]
    daily_sales: float
    coverage_days: float | None
    shortage_risk: bool
    dormant_stock: bool
    reorder_qty: int
    priority: str
    priority_score: int


def normalize_column(column: Any) -> str:
    return str(column).strip().lower().replace(" ", "_")


def clean_number(value: Any, default: float = 0) -> float:
    if pd.isna(value):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def clean_text(value: Any) -> str:
    if pd.isna(value):
        return ""
    return str(value).strip()


def analyze_product(raw: dict[str, Any], index: int) -> ProductAnalysis:
    stock = clean_number(raw.get("stock_actuel"))
    stock_minimum = clean_number(raw.get("stock_minimum"))
    sales_7 = clean_number(raw.get("ventes_7_jours"))
    lead_time = clean_number(raw.get("delai_reappro_jours"), 7)
    comment = clean_text(raw.get("commentaire")).lower()

    daily_sales = sales_7 / 7 if sales_7 > 0 else 0
    coverage_days = stock / daily_sales if daily_sales > 0 else None
    shortage_risk = stock <= stock_minimum or (
        coverage_days is not None and coverage_days <= max(7, lead_time)
    )
    dormant_stock = (
        stock > stock_minimum
        and (sales_7 <= 1 or "dormant" in comment)
    )

    target_stock = max(stock_minimum * 2, daily_sales * (lead_time + 14))
    reorder_qty = max(0, math.ceil(target_stock - stock)) if shortage_risk else 0

    score = 0
    if stock <= stock_minimum:
        score += 55
    if coverage_days is not None and coverage_days <= max(7, lead_time):
        score += 35
    if coverage_days is not None and coverage_days <= 30:
        score += 15
    if sales_7 >= 7:
        score += 12
    if lead_time >= 8:
        score += 8
    if dormant_stock:
        score -= 20

    if dormant_stock and not shortage_risk:
        priority = "Stock dormant"
    elif score >= 75:
        priority = "Urgent"
    elif score >= 55:
        priority = "Réappro"
    elif score >= 30:
        priority = "A surveiller"
    else:
        priority = "Stable"

    row = {
        "reference": f"STK-{index:04d}",
        "produit": clean_text(raw.get("produit")),
        "categorie": clean_text(raw.get("categorie")),
        "stock_actuel": round(stock),
        "stock_minimum": round(stock_minimum),
        "ventes_7_jours": round(sales_7),
        "delai_reappro_jours": round(lead_time),
        "fournisseur": clean_text(raw.get("fournisseur")),
        "dernier_reappro": clean_text(raw.get("dernier_reappro")),
        "commentaire": clean_text(raw.get("commentaire")),
    }

    return ProductAnalysis(
        row=row,
        daily_sales=daily_sales,
        coverage_days=coverage_days,
        shortage_risk=shortage_risk,
        dormant_stock=dormant_stock,
        reorder_qty=reorder_qty,
        priority=priority,
        priority_score=max(0, min(100, score)),
    )


def analyze_workbook(file_bytes: bytes) -> dict[str, Any]:
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise ValueError("Le fichier est trop volumineux pour ce prototype.")

    try:
        frame = pd.read_excel(BytesIO(file_bytes))
    except Exception as exc:
        raise ValueError("Impossible de lire ce fichier Excel.") from exc

    frame.columns = [normalize_column(column) for column in frame.columns]
    missing = sorted(REQUIRED_COLUMNS - set(frame.columns))
    if missing:
        raise ValueError("Colonnes manquantes : " + ", ".join(missing))

    analyses = [
        analyze_product(row, index)
        for index, row in enumerate(frame.to_dict(orient="records"), start=1)
    ]
    products = []

    for item in analyses:
        product = {
            **item.row,
            "ventes_jour_moy": round(item.daily_sales, 2),
            "couverture_jours": round(item.coverage_days, 1)
            if item.coverage_days is not None
            else None,
            "rupture_probable": item.shortage_risk,
            "stock_dormant": item.dormant_stock,
            "quantite_reappro": item.reorder_qty,
            "priorite": item.priority,
            "score_priorite": item.priority_score,
        }
        products.append(product)

    priorities = sorted(
        [product for product in products if product["quantite_reappro"] > 0],
        key=lambda product: (-product["score_priorite"], product["couverture_jours"] or 9999),
    )

    by_category: dict[str, dict[str, Any]] = {}
    for product in products:
        category = product["categorie"] or "Non classe"
        bucket = by_category.setdefault(
            category,
            {"categorie": category, "produits": 0, "stock_total": 0, "alertes": 0},
        )
        bucket["produits"] += 1
        bucket["stock_total"] += product["stock_actuel"]
        if product["rupture_probable"] or product["stock_dormant"]:
            bucket["alertes"] += 1

    coverages = [
        product["couverture_jours"]
        for product in products
        if product["couverture_jours"] is not None
    ]

    return {
        "products": products,
        "priorities": priorities,
        "summary": {
            "total_produits": len(products),
            "ruptures_probables": sum(1 for product in products if product["rupture_probable"]),
            "stocks_dormants": sum(1 for product in products if product["stock_dormant"]),
            "reappro_total": sum(product["quantite_reappro"] for product in products),
            "stock_total": sum(product["stock_actuel"] for product in products),
            "couverture_moyenne": round(sum(coverages) / len(coverages), 1)
            if coverages
            else None,
            "categories": sorted(by_category.values(), key=lambda row: row["categorie"]),
        },
    }


class StockHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def do_POST(self) -> None:
        if self.path != "/api/analyze":
            self.send_error(404)
            return

        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={
                "REQUEST_METHOD": "POST",
                "CONTENT_TYPE": self.headers.get("Content-Type", ""),
            },
        )
        file_item = form["file"] if "file" in form else None
        if file_item is None or not getattr(file_item, "file", None):
            self.send_json({"error": "Aucun fichier Excel transmis."}, status=400)
            return

        try:
            result = analyze_workbook(file_item.file.read())
        except ValueError as exc:
            self.send_json({"error": str(exc)}, status=400)
            return

        self.send_json(result)

    def send_json(self, payload: dict[str, Any], status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", 8000), StockHandler)
    print("Application locale : http://127.0.0.1:8000")
    server.serve_forever()


if __name__ == "__main__":
    main()
