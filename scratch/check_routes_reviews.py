import os

rev_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\backend\routes_reviews.py"

with open(rev_path, "r", encoding="utf-8") as f:
    code = f.read()

# Let's inspect the exact lines around create_booking_review and get_reviews
print("Length of routes_reviews.py:", len(code))
print("create_booking_review in file:", "def create_booking_review" in code)
print("get_reviews in file:", "def get_reviews" in code)
