import os, re

backend_dir = r"C:\Users\keert\camartes\camartes-prelaunch-1\backend"
for fname in os.listdir(backend_dir):
    if fname.endswith(".py"):
        fpath = os.path.join(backend_dir, fname)
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
            for m in re.finditer(r'@router\.(get|post)\(["\']([^"\']+)["\']', content):
                route = m.group(2)
                if any(k in route.lower() for k in ["vendor", "catalog", "search", "services", "provider"]):
                    print(f"{fname} -> {m.group(1).upper()} {route}")
        except Exception as e:
            pass
