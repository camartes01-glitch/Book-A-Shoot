import os

def update_empty_day_modal():
    path = r"C:\Users\keert\camartes\camartes-prelaunch-1\frontend\components\calendar\EmptyDayBookingModal.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Replace old purple or bad replacements with proper colors.primary[500]
    content = content.replace("'colors.primary[500]'", "colors.primary[500]")
    content = content.replace("#7C3AED", "colors.primary[500]")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("EmptyDayBookingModal updated.")

update_empty_day_modal()
