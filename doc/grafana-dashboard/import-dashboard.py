#!/usr/bin/env python3
import sys
import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import lru_cache
import requests

GRAFANA_URL = "http://grafana.platform.local"
GRAFANA_TOKEN = "glsa_vXMAVgOwxgA9rKks0FOGq3lYbSk5frmi_eebb66da"
HEADERS = {"Authorization": f"Bearer {GRAFANA_TOKEN}", "Content-Type": "application/json"}

import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

session = requests.Session()
session.headers.update(HEADERS)
session.verify = False

@lru_cache(maxsize=None)
def resolve_ds_uid(name: str) -> str:
    r = session.get(f"{GRAFANA_URL}/api/datasources/name/{name}")
    r.raise_for_status()
    return r.json()["uid"]

@lru_cache(maxsize=None)
def ensure_folder(name: str) -> str:
    folders = session.get(f"{GRAFANA_URL}/api/folders").json()
    for f in folders:
        if f["title"] == name:
            return f["uid"]
    r = session.post(f"{GRAFANA_URL}/api/folders", json={
        "title": name,
        "uid": name
    })
    r.raise_for_status()
    return r.json()["uid"]

def import_dashboard(path: Path, folder_uid: str = ""):
    with open(path) as f:
        dashboard = json.load(f)

    inputs = []
    for inp in dashboard.get("__inputs", []):
        ds_name = inp.get("label") or inp.get("pluginName")
        inputs.append({
            "name": inp["name"],
            "type": "datasource",
            "pluginId": inp["pluginId"],
            "value": resolve_ds_uid(ds_name),
        })

    dashboard.pop("id", None)

    payload = {
        "dashboard": dashboard,
        "overwrite": True,
        "inputs": inputs,
        "folderUid": folder_uid,
    }

    r = session.post(f"{GRAFANA_URL}/api/dashboards/import", json=payload)
    r.raise_for_status()
    return path.name, r.json()

def main(root: str):
    files = list(Path(root).rglob("*.json"))
    print(f"Found {len(files)} dashboards")

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {}
        for f in files:
            parent = f.parent.name
            folder_uid = ensure_folder(parent) if f.parent != Path(root) else ""
            futures[executor.submit(import_dashboard, f, folder_uid)] = f

        success, failed = 0, []
        for future in as_completed(futures):
            file = futures[future]
            try:
                name, result = future.result()
                print(f"✓ {name} → {result.get('url', '')}")
                success += 1
            except Exception as e:
                print(f"✗ {file.name}: {e}")
                failed.append(file.name)

    print(f"\nSuccess: {success}, Failed: {len(failed)}")
    if failed:
        sys.exit(1)

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "./dashboards")