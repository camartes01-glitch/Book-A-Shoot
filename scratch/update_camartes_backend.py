import os
import re

file_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\backend\routes_bookings.py"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update create_booking_request to record provider_assigned_at in booking_doc
if '"provider_assigned_at"' not in code:
    code = code.replace(
        '"firms_status_message": firms_status_msg,\n        "dispatched_at": now_iso,',
        '"firms_status_message": firms_status_msg,\n        "provider_assigned_at": {pid: now_iso for pid in eligible_providers},\n        "dispatched_at": now_iso,',
        1
    )
    print("1. Added provider_assigned_at to create_booking_request")

# 2. Update replenish_booking_leads with event date expiry, 24h lead lifetime, and customer confirmation lock
old_replenish_start = """    booking = doc.to_dict()
    status = str(booking.get("status") or "pending").lower().strip()
    if status in ["confirmed", "completed", "cancelled"]:
        return {"replenished": False, "reason": "Booking already finalized"}"""

new_replenish_start = """    booking = doc.to_dict()
    status = str(booking.get("status") or "pending").lower().strip()
    confirmed_pid = str(booking.get("confirmed_provider_id") or "").strip()

    # Rule: Never run replacement cycle once a vendor is confirmed by customer or booking is finalized
    if confirmed_pid or status in ["confirmed", "completed", "cancelled", "customer_confirmed"]:
        return {"replenished": False, "reason": "Booking already confirmed by customer or finalized"}

    now_utc = datetime.now(timezone.utc)

    # Rule: Event date expiry - if event date has passed, expire the request and stop replacement
    event_date_str = str(booking.get("event_date") or "").strip()
    if event_date_str:
        try:
            event_dt = datetime.strptime(event_date_str[:10], "%Y-%m-%d").date()
            if event_dt < now_utc.date():
                doc_ref.update({
                    "status": "expired",
                    "booking_status": "EXPIRED",
                    "status_label": "Request Expired",
                    "updated_at": now_utc.isoformat(),
                    "expired_reason": "Event date has passed"
                })
                return {"replenished": False, "reason": "Event date has passed"}
        except Exception as ex:
            logging.warning(f"Could not parse event_date '{event_date_str}': {ex}")

    # Rule: Max lead lifetime - a lead should only replenish for 24 hours from booking created_at
    created_at_str = booking.get("created_at")
    if created_at_str:
        try:
            c_dt = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
            if c_dt.tzinfo is None:
                c_dt = c_dt.replace(tzinfo=timezone.utc)
            lead_age_hours = (now_utc - c_dt).total_seconds() / 3600.0
            if lead_age_hours >= 24.0:
                accepted_ids_check = list(booking.get("accepted_provider_ids") or [])
                if not accepted_ids_check:
                    doc_ref.update({
                        "status": "expired",
                        "booking_status": "EXPIRED",
                        "status_label": "Request Expired",
                        "updated_at": now_utc.isoformat(),
                        "expired_reason": "Lead response window exceeded 24 hours without confirmation"
                    })
                return {"replenished": False, "reason": "Lead lifetime exceeded 24 hours from creation"}
        except Exception as ex:
            logging.warning(f"Could not parse created_at '{created_at_str}': {ex}")"""

if old_replenish_start in code:
    code = code.replace(old_replenish_start, new_replenish_start, 1)
    print("2. Added event date expiry and 24h lifetime to replenish_booking_leads")
else:
    print("2. Warning: old_replenish_start not found")

# 3. Update the 1-hour expiration logic and provider_assigned_at tracking in replenish_booking_leads
old_stale_check = """    # 2. Check 1-hour expiration ONLY if replacement candidates actually exist!
    # Never unassign viable firms if no replacements are available in the market.
    dispatched_at_str = booking.get("dispatched_at") or booking.get("created_at")
    if dispatched_at_str and replacement_candidates:
        try:
            disp_dt = datetime.fromisoformat(dispatched_at_str.replace("Z", "+00:00"))
            if disp_dt.tzinfo is None:
                disp_dt = disp_dt.replace(tzinfo=timezone.utc)
            diff_hours = (now_utc - disp_dt).total_seconds() / 3600.0
            if diff_hours >= 1.0:
                # Only expire up to the number of replacements we can actually introduce
                stale_unaccepted = [pid for pid in assigned_ids if pid not in accepted_ids and pid not in rejected_ids]
                max_to_expire = min(len(stale_unaccepted), len(replacement_candidates))
                for pid in stale_unaccepted[:max_to_expire]:
                    expired_this_round.append(pid)
                    assigned_ids.remove(pid)
                    if pid not in expired_ids:
                        expired_ids.append(pid)
        except Exception as dt_err:
            logging.warning(f"Error checking dispatched_at timestamp: {dt_err}")"""

new_stale_check = """    # 2. Check 1-hour expiration ONLY if replacement candidates actually exist!
    # Never unassign viable firms if no replacements are available in the market.
    # Check each firm's individual dispatch time if recorded, otherwise fallback to booking dispatched_at.
    provider_assigned_at = dict(booking.get("provider_assigned_at") or {})
    if replacement_candidates:
        stale_unaccepted = []
        for pid in assigned_ids:
            # STRICT RULE: NEVER replace vendors who accepted!
            if pid in accepted_ids or pid in rejected_ids:
                continue
            firm_disp_str = provider_assigned_at.get(pid) or booking.get("dispatched_at") or booking.get("created_at")
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
                stale_unaccepted.append(pid)

        if stale_unaccepted:
            max_to_expire = min(len(stale_unaccepted), len(replacement_candidates))
            for pid in stale_unaccepted[:max_to_expire]:
                expired_this_round.append(pid)
                assigned_ids.remove(pid)
                if pid not in expired_ids:
                    expired_ids.append(pid)"""

if old_stale_check in code:
    code = code.replace(old_stale_check, new_stale_check, 1)
    print("3. Updated per-firm 1-hour expiration check in replenish_booking_leads")
else:
    print("3. Warning: old_stale_check not found")

# 4. Update provider_assigned_at when newly adding candidates
old_update_dict = """    now_iso = now_utc.isoformat()
    update_dict = {
        "assigned_provider_ids": assigned_ids,
        "expired_provider_ids": expired_ids,
        "firms_status_message": firms_status_msg,
    }
    if newly_added_ids or expired_this_round:
        update_dict["dispatched_at"] = now_iso"""

new_update_dict = """    now_iso = now_utc.isoformat()
    for cand_id in newly_added_ids:
        provider_assigned_at[cand_id] = now_iso

    update_dict = {
        "assigned_provider_ids": assigned_ids,
        "expired_provider_ids": expired_ids,
        "firms_status_message": firms_status_msg,
        "provider_assigned_at": provider_assigned_at,
    }
    if newly_added_ids or expired_this_round:
        update_dict["dispatched_at"] = now_iso"""

if old_update_dict in code:
    code = code.replace(old_update_dict, new_update_dict, 1)
    print("4. Updated provider_assigned_at in update_dict")
else:
    print("4. Warning: old_update_dict not found")

# 5. Update get_incoming_booking_requests to pass per-vendor dispatched_at and respect 24h & event_date expiry
old_requests_loop = """    for b in incoming_bookings:
        raw_status = str(b.get("status") or "pending").lower().strip()"""

new_requests_loop = """    for b in incoming_bookings:
        # Resolve vendor-specific dispatched timestamp
        prov_map = b.get("provider_assigned_at") or {}
        vendor_disp = None
        for pid in possible_ids:
            if pid in prov_map:
                vendor_disp = prov_map[pid]
                break
        b["dispatched_at"] = vendor_disp or b.get("dispatched_at") or b.get("created_at")

        # Check event date expiry
        ev_str = str(b.get("event_date") or "").strip()[:10]
        ev_passed = False
        if ev_str:
            try:
                if datetime.strptime(ev_str, "%Y-%m-%d").date() < datetime.now(timezone.utc).date():
                    ev_passed = True
            except Exception:
                pass

        # Check 24-hour lead lifetime from created_at
        cr_str = b.get("created_at")
        lead_24h_passed = False
        if cr_str:
            try:
                c_dt = datetime.fromisoformat(cr_str.replace("Z", "+00:00"))
                if c_dt.tzinfo is None:
                    c_dt = c_dt.replace(tzinfo=timezone.utc)
                if (datetime.now(timezone.utc) - c_dt).total_seconds() >= 86400.0:
                    lead_24h_passed = True
            except Exception:
                pass

        raw_status = str(b.get("status") or "pending").lower().strip()"""

if old_requests_loop in code:
    code = code.replace(old_requests_loop, new_requests_loop, 1)
    print("5. Added per-vendor dispatched_at and expiry checks in get_incoming_booking_requests")
else:
    print("5. Warning: old_requests_loop not found")

# 6. In get_incoming_booking_requests, if event date or 24h passed and vendor hasn't accepted, mark expired
old_pending_block = """        else:
            # Open lead / pending customer confirmation
            b["status"] = "pending"
            b["booking_status"] = "PENDING"
            b["status_label"] = "Request Sent"
            b["client_phone"] = mask_phone(b.get("client_phone"))
            b["client_email"] = mask_email(b.get("client_email"))
            b["contact_unlocked"] = False
            b["lead_claimed_by_other"] = False
            b["is_closed_to_me"] = False"""

new_pending_block = """        else:
            if (ev_passed or lead_24h_passed):
                # Stale lead beyond event date or 24-hour lifetime
                b["status"] = "expired"
                b["booking_status"] = "EXPIRED"
                b["status_label"] = "Request Expired"
                b["client_phone"] = mask_phone(b.get("client_phone"))
                b["client_email"] = mask_email(b.get("client_email"))
                b["contact_unlocked"] = False
                b["lead_claimed_by_other"] = False
                b["is_closed_to_me"] = True
            else:
                # Open lead / pending customer confirmation
                b["status"] = "pending"
                b["booking_status"] = "PENDING"
                b["status_label"] = "Request Sent"
                b["client_phone"] = mask_phone(b.get("client_phone"))
                b["client_email"] = mask_email(b.get("client_email"))
                b["contact_unlocked"] = False
                b["lead_claimed_by_other"] = False
                b["is_closed_to_me"] = False"""

if old_pending_block in code:
    code = code.replace(old_pending_block, new_pending_block, 1)
    print("6. Updated open lead pending block with expiration guard")
else:
    print("6. Warning: old_pending_block not found")

# 7. Update get_my_bookings background replenishment task guard
old_bg_replenish = """                # Check if 1-hour replenishment is needed for unaccepted leads (run asynchronously in background)
                dispatched_at_str = booking.get("dispatched_at") or booking.get("created_at")
                b_status = str(booking.get("status") or "pending").lower().strip()
                if dispatched_at_str and b_status not in ['confirmed', 'completed', 'cancelled']:
                    try:
                        disp_dt = datetime.fromisoformat(dispatched_at_str.replace("Z", "+00:00"))
                        if disp_dt.tzinfo is None:
                            disp_dt = disp_dt.replace(tzinfo=timezone.utc)
                        if (datetime.now(timezone.utc) - disp_dt).total_seconds() >= 3600.0:
                            asyncio.create_task(replenish_booking_leads(bid))
                    except Exception:
                        pass"""

new_bg_replenish = """                # Check if 1-hour replenishment is needed for unaccepted leads (run asynchronously in background)
                dispatched_at_str = booking.get("dispatched_at") or booking.get("created_at")
                b_status = str(booking.get("status") or "pending").lower().strip()
                confirmed_pid = str(booking.get("confirmed_provider_id") or "").strip()

                # Guard against event date passed or 24-hour lifetime elapsed
                ev_str_check = str(booking.get("event_date") or "").strip()[:10]
                ev_passed_check = False
                if ev_str_check:
                    try:
                        if datetime.strptime(ev_str_check, "%Y-%m-%d").date() < datetime.now(timezone.utc).date():
                            ev_passed_check = True
                    except Exception:
                        pass

                cr_str_check = booking.get("created_at")
                age_24h_check = False
                if cr_str_check:
                    try:
                        c_dt = datetime.fromisoformat(cr_str_check.replace("Z", "+00:00"))
                        if c_dt.tzinfo is None:
                            c_dt = c_dt.replace(tzinfo=timezone.utc)
                        if (datetime.now(timezone.utc) - c_dt).total_seconds() >= 86400.0:
                            age_24h_check = True
                    except Exception:
                        pass

                # The replacement cycle MUST stop running if customer confirmed a vendor, event date passed, or 24h passed
                if (
                    dispatched_at_str
                    and b_status not in ['confirmed', 'completed', 'cancelled', 'expired', 'customer_confirmed']
                    and not confirmed_pid
                    and not ev_passed_check
                    and not age_24h_check
                ):
                    try:
                        disp_dt = datetime.fromisoformat(dispatched_at_str.replace("Z", "+00:00"))
                        if disp_dt.tzinfo is None:
                            disp_dt = disp_dt.replace(tzinfo=timezone.utc)
                        if (datetime.now(timezone.utc) - disp_dt).total_seconds() >= 3600.0:
                            asyncio.create_task(replenish_booking_leads(bid))
                    except Exception:
                        pass"""

if old_bg_replenish in code:
    code = code.replace(old_bg_replenish, new_bg_replenish, 1)
    print("7. Guarded background replenishment task in get_my_bookings")
else:
    print("7. Warning: old_bg_replenish not found")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)
print("Saved routes_bookings.py successfully!")
