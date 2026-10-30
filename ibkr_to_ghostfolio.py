#!/usr/bin/env python3
"""Convert IBKR Flex Query XML trades to Ghostfolio import JSON."""

import argparse
import json
import sys
import xml.etree.ElementTree as ET
from datetime import datetime


SYMBOL_MAPPING = {
    # Add IBKR symbol -> Yahoo Finance symbol overrides here
    "WKL": "WKL.AS",
}


def parse_date(date_str: str) -> str:
    """Convert IBKR date (YYYY-MM-DD) to ISO 8601."""
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    return dt.strftime("%Y-%m-%dT00:00:00.000Z")


def map_symbol(symbol: str) -> str:
    return SYMBOL_MAPPING.get(symbol, symbol)


def trade_to_activity(trade: ET.Element) -> dict | None:
    buy_sell = trade.get("buySell", "").upper()
    if buy_sell not in ("BUY", "SELL"):
        return None

    symbol = map_symbol(trade.get("symbol", ""))
    date_str = trade.get("tradeDate", "")
    quantity = abs(float(trade.get("quantity", 0)))
    trade_price = abs(float(trade.get("tradePrice", 0)))
    commission = abs(float(trade.get("ibCommission", 0)))
    currency = trade.get("currency", "")

    if not symbol or not date_str or quantity == 0 or trade_price == 0:
        print(f"  Skipping incomplete trade: {trade.attrib}", file=sys.stderr)
        return None

    return {
        "currency": currency,
        "dataSource": "YAHOO",
        "date": parse_date(date_str),
        "fee": round(commission, 4),
        "quantity": quantity,
        "symbol": symbol,
        "type": buy_sell,
        "unitPrice": trade_price,
    }


def convert(xml_path: str) -> dict:
    tree = ET.parse(xml_path)
    root = tree.getroot()

    activities = []
    skipped = 0

    for trade in root.iter("Trade"):
        # Skip summary rows (levelOfDetail != EXECUTION)
        if trade.get("levelOfDetail", "").upper() != "EXECUTION":
            continue

        # Skip forex/cash trades (currency conversions like USD.SEK)
        if trade.get("assetCategory", "").upper() != "STK":
            continue

        activity = trade_to_activity(trade)
        if activity:
            activities.append(activity)
        else:
            skipped += 1

    print(f"Converted {len(activities)} trades, skipped {skipped}.", file=sys.stderr)
    return {"activities": activities}


def main():
    parser = argparse.ArgumentParser(
        description="Convert IBKR Flex Query XML to Ghostfolio import JSON"
    )
    parser.add_argument("xml_file", help="Path to IBKR Flex Query XML export")
    parser.add_argument(
        "-o", "--output", help="Output JSON file (default: stdout)", default=None
    )
    args = parser.parse_args()

    result = convert(args.xml_file)

    output = json.dumps(result, indent=2)
    if args.output:
        with open(args.output, "w") as f:
            f.write(output)
        print(f"Written to {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
