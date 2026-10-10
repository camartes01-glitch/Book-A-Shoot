from datetime import datetime, timezone, timedelta

IST_OFFSET = timezone(timedelta(hours=5, minutes=30))
WINDOW_START_HOUR = 9   # 9:00 AM
WINDOW_END_HOUR = 21    # 9:00 PM
SLA_MINUTES = 60        # 60 minutes

def calculate_business_sla_py(assigned_dt: datetime) -> dict:
    if assigned_dt.tzinfo is None:
        assigned_dt = assigned_dt.replace(tzinfo=timezone.utc)
    ist_dt = assigned_dt.astimezone(IST_OFFSET)
    
    minute_of_day = ist_dt.hour * 60 + ist_dt.minute + ist_dt.second / 60.0
    open_minute = WINDOW_START_HOUR * 60
    close_minute = WINDOW_END_HOUR * 60
    
    if minute_of_day < open_minute:
        # Before 9 AM: SLA starts at 9:00 AM today
        active_from_ist = ist_dt.replace(hour=WINDOW_START_HOUR, minute=0, second=0, microsecond=0)
        expires_at_ist = active_from_ist + timedelta(minutes=SLA_MINUTES)
    elif minute_of_day >= close_minute:
        # At or after 9 PM: SLA starts at 9:00 AM tomorrow
        tomorrow_ist = (ist_dt + timedelta(days=1)).replace(hour=WINDOW_START_HOUR, minute=0, second=0, microsecond=0)
        active_from_ist = tomorrow_ist
        expires_at_ist = tomorrow_ist + timedelta(minutes=SLA_MINUTES)
    else:
        # Between 9 AM and 9 PM
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
        "active_from_ist_str": active_from_ist.strftime("%Y-%m-%d %I:%M %p"),
        "expires_at_ist_str": expires_at_ist.strftime("%Y-%m-%d %I:%M %p"),
    }

def has_firm_timed_out_py(assigned_dt: datetime, now_utc: datetime = None) -> bool:
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)
    sla = calculate_business_sla_py(assigned_dt)
    return now_utc >= sla["expires_at"]

# Test 1: 10 PM
t_10pm = datetime(2026, 10, 15, 22, 0, tzinfo=IST_OFFSET)
sla1 = calculate_business_sla_py(t_10pm)
print("10 PM booking:")
print("  Active from:", sla1["active_from_ist_str"])
print("  Expires at:", sla1["expires_at_ist_str"])
assert sla1["active_from_ist_str"] == "2026-10-16 09:00 AM"
assert sla1["expires_at_ist_str"] == "2026-10-16 10:00 AM"

# Test at 11 PM (1 hour later) - should NOT be timed out
t_11pm = datetime(2026, 10, 15, 23, 0, tzinfo=IST_OFFSET)
assert not has_firm_timed_out_py(t_10pm, t_11pm), "Should NOT be timed out at 11 PM!"

# Test at 9:30 AM next day - should NOT be timed out
t_930am = datetime(2026, 10, 16, 9, 30, tzinfo=IST_OFFSET)
assert not has_firm_timed_out_py(t_10pm, t_930am), "Should NOT be timed out at 9:30 AM!"

# Test at 10:01 AM next day - SHOULD be timed out
t_1001am = datetime(2026, 10, 16, 10, 1, tzinfo=IST_OFFSET)
assert has_firm_timed_out_py(t_10pm, t_1001am), "SHOULD be timed out at 10:01 AM!"

# Test 2: 8:30 PM (rollover)
t_830pm = datetime(2026, 10, 15, 20, 30, tzinfo=IST_OFFSET)
sla2 = calculate_business_sla_py(t_830pm)
print("8:30 PM booking:")
print("  Active from:", sla2["active_from_ist_str"])
print("  Expires at:", sla2["expires_at_ist_str"])
assert sla2["active_from_ist_str"] == "2026-10-15 08:30 PM"
assert sla2["expires_at_ist_str"] == "2026-10-16 09:30 AM"

# Test 3: 2:00 PM (daytime)
t_2pm = datetime(2026, 10, 15, 14, 0, tzinfo=IST_OFFSET)
sla3 = calculate_business_sla_py(t_2pm)
print("2:00 PM booking:")
print("  Active from:", sla3["active_from_ist_str"])
print("  Expires at:", sla3["expires_at_ist_str"])
assert sla3["active_from_ist_str"] == "2026-10-15 02:00 PM"
assert sla3["expires_at_ist_str"] == "2026-10-15 03:00 PM"

print("All Python SLA tests passed perfectly!")
