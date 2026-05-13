#!/usr/bin/env python3
import sys
import json
import copy
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
import urllib3

GRAFANA_URL = "http://grafana.platform.local"
GRAFANA_TOKEN = "glsa_vXMAVgOwxgA9rKks0FOGq3lYbSk5frmi_eebb66da"
HEADERS = {"Authorization": f"Bearer {GRAFANA_TOKEN}"}

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

session = requests.Session()
session.headers.update(HEADERS)
session.verify = False

def list_folders() -> list[dict]:
    return session.get(f"{GRAFANA_URL}/api/folders").json()

def find_folder_uid(folder_name: str) -> str:
    folders = list_folders()
    folder = next((f for f in folders if f["title"] == folder_name), None)
    if not folder:
        print(f"폴더 '{folder_name}' 없음. 사용 가능한 폴더:")
        for f in folders:
            print(f"  - {f['title']} (uid: {f['uid']})")
        sys.exit(1)
    return folder["uid"]

def search_dashboards(folder_uid: str) -> list[dict]:
    r = session.get(f"{GRAFANA_URL}/api/search", params={
        "folderUIDs": folder_uid,
        "type": "dash-db",
    })
    r.raise_for_status()
    return r.json()

def fetch_datasources() -> dict:
    """uid → datasource 정보 매핑"""
    r = session.get(f"{GRAFANA_URL}/api/datasources")
    r.raise_for_status()
    return {ds["uid"]: ds for ds in r.json()}

def fetch_grafana_version() -> str:
    r = session.get(f"{GRAFANA_URL}/api/health")
    r.raise_for_status()
    return r.json().get("version", "1.0.0")

def make_var_name(ds_name: str) -> str:
    """Grafana 와 동일한 변수명 생성: "My Prometheus" → DS_MY_PROMETHEUS"""
    return "DS_" + ds_name.upper().replace(" ", "_").replace("-", "_").replace(".", "_")

def collect_panel_types(obj, panel_types: set):
    if isinstance(obj, dict):
        if "type" in obj and ("targets" in obj or "panels" in obj):
            panel_types.add(obj["type"])
        for v in obj.values():
            collect_panel_types(v, panel_types)
    elif isinstance(obj, list):
        for item in obj:
            collect_panel_types(item, panel_types)

def camel_to_title(s: str) -> str:
    import re
    return re.sub(r'([A-Z])', r' \1', s).strip().title()

def build_requires(dashboard: dict, inputs: dict, grafana_version: str) -> list:
    requires = [{"type": "grafana", "id": "grafana", "name": "Grafana", "version": grafana_version}]
    panel_types: set = set()
    collect_panel_types(dashboard, panel_types)
    for pt in sorted(panel_types):
        requires.append({"type": "panel", "id": pt, "name": camel_to_title(pt), "version": ""})
    for inp in inputs.values():
        requires.append({"type": "datasource", "id": inp["pluginId"], "name": inp["pluginName"], "version": "1.0.0"})
    return requires

def to_shareable(dashboard: dict, datasources: dict, grafana_version: str) -> dict:
    """Grafana [Export for sharing externally] 와 동일한 처리"""
    dashboard = copy.deepcopy(dashboard)
    inputs: dict[str, dict] = {}

    def process(obj):
        if isinstance(obj, dict):
            ds = obj.get("datasource")
            if isinstance(ds, dict):
                uid = ds.get("uid", "")
                if uid and not uid.startswith("${") and uid in datasources:
                    info = datasources[uid]
                    var = make_var_name(info["name"])
                    if var not in inputs:
                        inputs[var] = {
                            "name": var,
                            "label": info["name"],
                            "type": "datasource",
                            "pluginId": info["type"],
                            "pluginName": info.get("typeName", info["type"]),
                        }
                    ds["uid"] = f"${{{var}}}"
            for v in obj.values():
                process(v)
        elif isinstance(obj, list):
            for item in obj:
                process(item)

    process(dashboard)

    # __inputs, __elements, __requires 를 맨 위로
    result = {}
    if inputs:
        result["__inputs"] = list(inputs.values())
    result["__elements"] = {}
    result["__requires"] = build_requires(dashboard, inputs, grafana_version)
    result.update(dashboard)
    return result

def export_dashboard(db: dict, out_dir: Path, datasources: dict, grafana_version: str) -> str:
    r = session.get(f"{GRAFANA_URL}/api/dashboards/uid/{db['uid']}")
    r.raise_for_status()
    dashboard = r.json()["dashboard"]
    dashboard = to_shareable(dashboard, datasources, grafana_version)

    filename = f"{db['uid']}.json"
    (out_dir / filename).write_text(json.dumps(dashboard, indent=2, ensure_ascii=False))
    return filename

def export_folder(folder_name: str, output_dir: str):
    folder_uid = find_folder_uid(folder_name)
    dashboards = search_dashboards(folder_uid)
    print(f"폴더 '{folder_name}': {len(dashboards)}개 대시보드 발견")

    datasources = fetch_datasources()
    grafana_version = fetch_grafana_version()

    out_dir = Path(output_dir) / folder_name
    out_dir.mkdir(parents=True, exist_ok=True)

    success, failed = 0, []
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(export_dashboard, db, out_dir, datasources, grafana_version): db for db in dashboards}
        for future in as_completed(futures):
            db = futures[future]
            try:
                filename = future.result()
                print(f"  ✓ {filename}")
                success += 1
            except Exception as e:
                print(f"  ✗ {db['title']}: {e}")
                failed.append(db["title"])

    print(f"\nSuccess: {success}, Failed: {len(failed)}")
    print(f"저장 경로: {out_dir.resolve()}")
    if failed:
        sys.exit(1)

def main():
    args = sys.argv[1:]
    folder_name = args[0] if len(args) > 0 else input("폴더명: ")
    output_dir = args[1] if len(args) > 1 else "./dashboards"
    export_folder(folder_name, output_dir)

if __name__ == "__main__":
    main()