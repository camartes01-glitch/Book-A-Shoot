import os
import re

file_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\backend\routes_bookings.py"

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    exit(1)

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add Business Hours SLA helper functions at the top of routes_bookings.py if not present
sla_helpers_code = '''
# ==============================================================================
# BUSINESS HOURS SLA ENGINE (9:00 AM - 9:00 PM IST · 60m RESPONSE WINDOW)
# ==============================================================================
IST_OFFSET = timezone(timedelta(hours=5, minutes=30))
WINDOW_START_HOUR = 9   # 9:00 AM
WINDOW_END_HOUR = 21    # 9:00 PM
SLA_MINUTES = 60        # 60 minutes

def calculate_business_sla_py(assigned_dt: datetime) -> dict:
    """
    Calculates exact SLA window and expiration for vendor lead response.
    Window is 9:00 AM to 9:00 PM IST daily.
    - Requests before 9:00 AM start at 9:00 AM today (expires 10:00 AM).
    - Requests after 9:00 PM start at 9:00 AM tomorrow (expires 10:00 AM).
    - Requests between 9:00 AM and 9:00 PM start immediately;
      if <60m remain today (e.g. 8:30 PM), remaining minutes roll over to 9:00 AM tomorrow.
    """
    if assigned_dt.tzinfo is None:
        assigned_dt = assigned_dt.replace(tzinfo=timezone.utc)
    ist_dt = assigned_dt.astimezone(IST_OFFSET)
    
    minute_of_day = ist_dt.hour * 60 + ist_dt.minute + ist_dt.second / 60.0
    open_minute = WINDOW_START_HOUR * 60
    close_minute = WINDOW_END_HOUR * 60
    
    if minute_of_day < open_minute:
        active_from_ist = ist_dt.replace(hour=WINDOW_START_HOUR, minute=0, second=0, microsecond=0)
        expires_at_ist = active_from_ist + timedelta(minutes=SLA_MINUTES)
    elif minute_of_day >= close_minute:
        tomorrow_ist = (ist_dt + timedelta(days=1)).replace(hour=WINDOW_START_HOUR, minute=0, second=0, microsecond=0)
        active_from_ist = tomorrow_ist
        expires_at_ist = tomorrow_ist + timedelta(minutes=SLA_MINUTES)
    else:
        active_from_ist = ist_dt
        minutes_left_today = close_minute - minute_of_day
        if minutes_left_today >= SLA_MINUTES:
            expires_at_ist = ist_dt + timedelta(minutes=SLA_MINUTES)
        else:
            rollover_mins = SLA_MINUTES - minutes_left_today
            tomorrow_ist = (ist_dt + timedelta(days=1)).replace(hour=WINDOW_START_HOUR, minute=0, second=0, microsecond=0)
            expires_at_ist = tomorrow_ist + timedelta(minutes=rollover_mins)
            
    expires_at_utc = expires_at_ist.astimezone(timezone.utc)
    active_from_utc = active_from_ist.astimezone(timezone.utc)
    
    return {
        "active_from": active_from_utc,
        "expires_at": expires_at_utc,
        "active_from_iso": active_from_utc.isoformat(),
        "expires_at_iso": expires_at_utc.isoformat(),
        "sla_window": "9:00 AM - 9:00 PM IST",
        "sla_minutes": SLA_MINUTES,
    }

def has_firm_timed_out_py(assigned_dt: datetime, now_utc: datetime = None) -> bool:
    """Returns True if the 60 active business minutes have elapsed in 9 AM - 9 PM IST window."""
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)
    sla = calculate_business_sla_py(assigned_dt)
    return now_utc >= sla["expires_at"]
'''

if "def calculate_business_sla_py" not in code:
    # Insert after imports
    target_import = "router = APIRouter()"
    if target_import in code:
        code = code.replace(target_import, sla_helpers_code + "\n" + target_import, 1)
        print("1. Injected SLA helper functions into routes_bookings.py")
    else:
        print("Warning: router = APIRouter() not found, appending helpers")
        code = sla_helpers_code + "\n" + code

# 2. Update replenish_booking_leads to use has_firm_timed_out_py instead of raw 3600s
old_lead_stale_loop = """            firm_disp_str = provider_assigned_at.get(pid) or booking.get("dispatched_at") or booking.get("created_at")
            if firm_disp_str:
                try:
                    f_dt = datetime.fromisoformat(firm_disp_str.replace("Z", "+00:00"))
                    if f_dt.tzinfo is None:
                        f_dt = f_dt.replace(tzinfo=timezone.utc)
                    if (now_utc - f_dt).total_seconds() >= 3600.0:
                        stale_unaccepted.append(pid)
                except Exception:
                    stale_unaccepted.append(pid)
            else:
                stale_unaccepted.append(pid)"""

new_lead_stale_loop = """            firm_disp_str = provider_assigned_at.get(pid) or booking.get("dispatched_at") or booking.get("created_at")
            if firm_disp_str:
                try:
                    f_dt = datetime.fromisoformat(firm_disp_str.replace("Z", "+00:00"))
                    if f_dt.tzinfo is None:
                        f_dt = f_dt.replace(tzinfo=timezone.utc)
                    if has_firm_timed_out_py(f_dt, now_utc):
                        stale_unaccepted.append(pid)
                except Exception:
                    stale_unaccepted.append(pid)
            else:
                stale_unaccepted.append(pid)"""

if old_lead_stale_loop in code:
    code = code.replace(old_lead_stale_loop, new_lead_stale_loop, 1)
    print("2. Replaced raw 3600s check with has_firm_timed_out_py in replenish_booking_leads")
else:
    print("Warning: old_lead_stale_loop pattern not found!")

# 3. Update background replenishment trigger in get_my_bookings
old_bg_check = """                        if (datetime.now(timezone.utc) - disp_dt).total_seconds() >= 3600.0:
                            asyncio.create_task(replenish_booking_leads(bid))"""

new_bg_check = """                        if has_firm_timed_out_py(disp_dt, datetime.now(timezone.utc)):
                            asyncio.create_task(replenish_booking_leads(bid))"""

if old_bg_check in code:
    code = code.replace(old_bg_check, new_bg_check, 1)
    print("3. Replaced raw 3600s check with has_firm_timed_out_py in get_my_bookings background trigger")
else:
    print("Warning: old_bg_check pattern not found!")

# 4. In create_booking_request, also attach expires_at and sla_active_from to booking_doc
old_create_doc = '''        "firms_status_message": firms_status_msg,
        "provider_assigned_at": {pid: now_iso for pid in eligible_providers},
        "dispatched_at": now_iso,'''

new_create_doc = '''        "firms_status_message": firms_status_msg,
        "provider_assigned_at": {pid: now_iso for pid in eligible_providers},
        "dispatched_at": now_iso,
        "sla_active_from": calculate_business_sla_py(datetime.now(timezone.utc))["active_from_iso"],
        "expires_at": calculate_business_sla_py(datetime.now(timezone.utc))["expires_at_iso"],
        "sla_window": "9:00 AM - 9:00 PM IST",'''

if old_create_doc in code:
    code = code.replace(old_create_doc, new_create_doc, 1)
    print("4. Attached sla_active_from, expires_at, and sla_window to create_booking_request")
else:
    print("Note: old_create_doc not found directly, checking variations...")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Saved updated routes_bookings.py successfully!")
