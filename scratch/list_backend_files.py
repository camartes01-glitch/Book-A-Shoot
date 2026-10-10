import os

backend_dir = r"C:\Users\keert\camartes\camartes-prelaunch-1\backend"

print("Files in backend:")
for f in os.listdir(backend_dir):
    if f.endswith(".py"):
        print(" -", f)
