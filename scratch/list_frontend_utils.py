import os

utils_dir = r"C:\Users\keert\camartes\camartes-prelaunch-1\frontend\utils"
if os.path.exists(utils_dir):
    print("Files in frontend/utils:")
    for f in os.listdir(utils_dir):
        print(" -", f)
else:
    print("utils_dir not found")
