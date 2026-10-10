import os

backend_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\backend\routes_bookings.py"
frontend_dir = r"C:\Users\keert\camartes\camartes-prelaunch-1\frontend"

print("--- BACKEND CHECK ---")
if os.path.exists(backend_path):
    with open(backend_path, "r", encoding="utf-8") as f:
        content = f.read()
    print("calculate_business_sla_py present:", "calculate_business_sla_py" in content)
    print("has_firm_timed_out_py present:", "has_firm_timed_out_py" in content)
    print("replenish using has_firm_timed_out_py:", "if has_firm_timed_out_py(f_dt, now_utc):" in content)
    print("create_booking storing sla fields:", '"sla_active_from"' in content and '"expires_at"' in content)
else:
    print("Backend file does not exist!")

print("\n--- FRONTEND SEARCH ---")
matching_files = []
if os.path.exists(frontend_dir):
    for root, dirs, files in os.walk(frontend_dir):
        if "node_modules" in root or ".git" in root or ".expo" in root:
            continue
        for file in files:
            if file.endswith((".tsx", ".ts", ".jsx", ".js")):
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        fc = f.read()
                    if "countdown" in fc.lower() or "expires" in fc.lower() or "60" in fc or "incoming" in fc.lower():
                        matching_files.append((file, path))
                except Exception:
                    pass

print(f"Found {len(matching_files)} candidate frontend files:")
for name, p in matching_files[:10]:
    print(" -", name, ":", p)
