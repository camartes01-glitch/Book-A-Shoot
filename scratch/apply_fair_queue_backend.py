import os
import re

file_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\backend\routes_bookings.py"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add Fair-Queue & Concurrency helpers
fair_queue_helpers = '''
# ==============================================================================
# FAIR-QUEUE GAUGE & ACTIVE CONCURRENCY CAP ENGINE
# ==============================================================================
MAX_CONCURRENT_LEADS = 3

async def get_vendor_lead_stats(vendor_id: str) -> dict:
    """
    Retrieves real-time lead dispatch metrics for a vendor.
    - leads_today: resets to 0 if last_lead_date != today (in IST).
    - active_pending_leads: real-time count of active pending leads.
    - last_lead_dispatched_at: timestamp of last lead assignment.
    """
    now_ist = datetime.now(timezone.utc).astimezone(IST_OFFSET)
    today_str = now_ist.strftime("%Y-%m-%d")
    try:
        doc = db.collection('vendor_lead_stats').document(vendor_id).get()
        if not doc.exists:
            return {
                "leads_today": 0,
                "active_pending_leads": 0,
                "last_lead_dispatched_at": None,
                "last_lead_date": today_str
            }
        data = doc.to_dict() or {}
        last_date = data.get("last_lead_date") or ""
        leads_today = int(data.get("leads_today") or 0)
        if last_date != today_str:
            leads_today = 0
        active_pending = max(0, int(data.get("active_pending_leads") or 0))
        return {
            "leads_today": leads_today,
            "active_pending_leads": active_pending,
            "last_lead_dispatched_at": data.get("last_lead_dispatched_at"),
            "last_lead_date": today_str
        }
    except Exception as e:
        logging.warning(f"Error fetching lead stats for {vendor_id}: {e}")
        return {
            "leads_today": 0,
            "active_pending_leads": 0,
            "last_lead_dispatched_at": None,
            "last_lead_date": today_str
        }

async def record_vendor_lead_dispatched(vendor_id: str):
    """Increments leads_today, increments active_pending_leads, updates timestamp."""
    try:
        now_utc = datetime.now(timezone.utc)
        now_ist = now_utc.astimezone(IST_OFFSET)
        today_str = now_ist.strftime("%Y-%m-%d")
        doc_ref = db.collection('vendor_lead_stats').document(vendor_id)
        doc = doc_ref.get()
        if not doc.exists:
            doc_ref.set({
                "leads_today": 1,
                "active_pending_leads": 1,
                "last_lead_dispatched_at": now_utc.isoformat(),
                "last_lead_date": today_str
            }, merge=True)
        else:
            data = doc.to_dict() or {}
            last_date = data.get("last_lead_date") or ""
            leads_today = int(data.get("leads_today") or 0)
            if last_date != today_str:
                leads_today = 1
            else:
                leads_today += 1
            active_pending = max(0, int(data.get("active_pending_leads") or 0)) + 1
            doc_ref.set({
                "leads_today": leads_today,
                "active_pending_leads": active_pending,
                "last_lead_dispatched_at": now_utc.isoformat(),
                "last_lead_date": today_str
            }, merge=True)
    except Exception as e:
        logging.warning(f"Error recording lead dispatch for {vendor_id}: {e}")

async def record_vendor_lead_resolved(vendor_id: str):
    """Decrements active_pending_leads when lead is accepted, rejected, or expires."""
    try:
        doc_ref = db.collection('vendor_lead_stats').document(vendor_id)
        doc = doc_ref.get()
        if doc.exists:
            data = doc.to_dict() or {}
            active_pending = max(0, int(data.get("active_pending_leads") or 0) - 1)
            doc_ref.set({"active_pending_leads": active_pending}, merge=True)
    except Exception as e:
        logging.warning(f"Error decrementing active pending leads for {vendor_id}: {e}")

def calculate_fair_queue_score_py(lead_stats: dict) -> float:
    """
    The Fair-Queue Gauge (The Hunger Score):
    - 0 leads today -> 1.50x
    - 1 lead today  -> 1.00x
    - 2 leads today -> 0.75x
    - 3+ leads today -> 0.60x
    - Idle wait bonus: +0.10 if last lead was dispatched > 6 hours ago.
    """
    leads_today = max(0, int(lead_stats.get("leads_today") or 0))
    base_hunger = 1.5 / (1.0 + 0.5 * leads_today)

    last_disp = lead_stats.get("last_lead_dispatched_at")
    idle_bonus = 0.0
    if last_disp:
        try:
            disp_dt = datetime.fromisoformat(str(last_disp).replace("Z", "+00:00"))
            if disp_dt.tzinfo is None:
                disp_dt = disp_dt.replace(tzinfo=timezone.utc)
            elapsed_hours = (datetime.now(timezone.utc) - disp_dt).total_seconds() / 3600.0
            if elapsed_hours >= 6.0:
                idle_bonus = 0.10
        except Exception:
            pass

    return round(base_hunger + idle_bonus, 3)
'''

target_helper_anchor = "def has_firm_timed_out_py(assigned_dt: datetime, now_utc: datetime = None) -> bool:\n    \"\"\"Returns True if the 60 active business minutes have elapsed in 9 AM - 9 PM IST window.\"\"\"\n    if now_utc is None:\n        now_utc = datetime.now(timezone.utc)\n    sla = calculate_business_sla_py(assigned_dt)\n    return now_utc >= sla[\"expires_at\"]"

if "def calculate_fair_queue_score_py" not in code:
    assert target_helper_anchor in code, "target_helper_anchor not found"
    code = code.replace(target_helper_anchor, target_helper_anchor + "\n" + fair_queue_helpers, 1)
    print("1. Added Fair-Queue and Concurrency helper functions")
else:
    print("1. Fair-Queue helpers already present")

# 2. In create_booking_request: filter by concurrency cap and sort candidates by Fair-Queue score
old_tier_sort = """    if target_budget_tier and len(eligible_providers) > 1:
        def matches_tier(uid):
            info = firm_metadata_map.get(uid, {})
            prefs = info.get("budget_preference") or []
            if isinstance(prefs, str):
                prefs = [prefs]
            prefs_lower = [str(p).lower() for p in prefs]
            return any(target_budget_tier in p for p in prefs_lower)

        matching_tier_firms = [uid for uid in eligible_providers if matches_tier(uid)]
        other_tier_firms = [uid for uid in eligible_providers if not matches_tier(uid)]
        # Prioritize matching tier at the top, without dropping other tiers
        eligible_providers = matching_tier_firms + other_tier_firms

    # Limit to top 6 photography firms
    eligible_providers = eligible_providers[:6]"""

new_tier_sort = """    # Active Concurrency Cap & Fair-Queue Sorting:
    # 1. Skip firms with active_pending_leads >= MAX_CONCURRENT_LEADS (3)
    # 2. Rank candidates by [Tier Match] -> [Fair-Queue Hunger Score] -> [Idle Wait Time]
    if eligible_providers:
        scored_candidates = []
        for uid in eligible_providers:
            stats = await get_vendor_lead_stats(uid)
            # Skip concurrency-capped firms unless no other firms exist
            if stats["active_pending_leads"] >= MAX_CONCURRENT_LEADS and len(eligible_providers) > 6:
                logging.info(f"[CONCURRENCY_CAP] Skipping {uid} with {stats['active_pending_leads']} active leads")
                continue
            
            info = firm_metadata_map.get(uid, {})
            prefs = info.get("budget_preference") or []
            if isinstance(prefs, str):
                prefs = [prefs]
            prefs_lower = [str(p).lower() for p in prefs]
            is_tier = bool(target_budget_tier and any(target_budget_tier in p for p in prefs_lower))
            fq_score = calculate_fair_queue_score_py(stats)
            scored_candidates.append((is_tier, fq_score, stats.get("last_lead_dispatched_at") or "", uid))

        if scored_candidates:
            # Sort by: tier match (True first), higher hunger score, older dispatch time
            scored_candidates.sort(key=lambda x: (not x[0], -x[1], x[2]))
            eligible_providers = [x[3] for x in scored_candidates]

    # Limit to top 6 photography firms
    eligible_providers = eligible_providers[:6]"""

if old_tier_sort in code:
    code = code.replace(old_tier_sort, new_tier_sort, 1)
    print("2. Integrated Fair-Queue & Concurrency Cap into create_booking_request candidate ranking")
else:
    print("Warning: old_tier_sort pattern not found")

# 3. In create_booking_request: record lead dispatched for each assigned provider
old_record_dispatch = """    top_provider_id = eligible_providers[0]
    booking_id = f"BK-{uuid.uuid4().hex[:8].upper()}" """

new_record_dispatch = """    # Record Fair-Queue lead dispatch for all assigned providers
    for pid in eligible_providers:
        await record_vendor_lead_dispatched(pid)

    top_provider_id = eligible_providers[0]
    booking_id = f"BK-{uuid.uuid4().hex[:8].upper()}" """

if old_record_dispatch in code and "record_vendor_lead_dispatched(pid)" not in code:
    code = code.replace(old_record_dispatch, new_record_dispatch, 1)
    print("3. Added record_vendor_lead_dispatched to create_booking_request")
else:
    print("3. record_vendor_lead_dispatched check done")

# 4. In accept_booking_request: decrement active_pending_leads
old_accept_doc = """    update_payload = {
        "status": "accepted",
        "accepted_provider_ids": accepted_list,
        "accepted_at_map": accepted_at_map,
        "provider_id": user_id,
        "accepted_by_vendor_id": user_id,
        "accepted_at": now_iso,
        "updated_at": now_iso,
    }
    doc_ref.update(update_payload)
    booking.update(update_payload)"""

new_accept_doc = """    update_payload = {
        "status": "accepted",
        "accepted_provider_ids": accepted_list,
        "accepted_at_map": accepted_at_map,
        "provider_id": user_id,
        "accepted_by_vendor_id": user_id,
        "accepted_at": now_iso,
        "updated_at": now_iso,
    }
    doc_ref.update(update_payload)
    booking.update(update_payload)
    await record_vendor_lead_resolved(user_id)"""

if old_accept_doc in code:
    code = code.replace(old_accept_doc, new_accept_doc, 1)
    print("4. Added record_vendor_lead_resolved to accept_booking_request")
else:
    print("Warning: old_accept_doc not found")

# 5. In rejection handling: decrement active_pending_leads
old_reject_doc = """            await asyncio.to_thread(
                db.collection('booking_requests').document(booking_id).update,
                {
                    "rejected_provider_ids": rejected_list,
                    "assigned_provider_ids": assigned_list,
                    "rejected_photographers_status": rejected_photographers_status,
                    "updated_at": now_iso
                }
            )"""

new_reject_doc = """            await asyncio.to_thread(
                db.collection('booking_requests').document(booking_id).update,
                {
                    "rejected_provider_ids": rejected_list,
                    "assigned_provider_ids": assigned_list,
                    "rejected_photographers_status": rejected_photographers_status,
                    "updated_at": now_iso
                }
            )
            await record_vendor_lead_resolved(user_id)"""

if old_reject_doc in code:
    code = code.replace(old_reject_doc, new_reject_doc, 1)
    print("5. Added record_vendor_lead_resolved to rejection handling")
else:
    print("Warning: old_reject_doc not found")

# 6. In replenish_booking_leads: decrement for stale unaccepted firms, rank replacement candidates with Fair-Queue, and record dispatch for new firms
old_replenish_loop = """        if stale_unaccepted:
            max_to_expire = min(len(stale_unaccepted), len(replacement_candidates))
            for pid in stale_unaccepted[:max_to_expire]:
                expired_this_round.append(pid)
                assigned_ids.remove(pid)
                if pid not in expired_ids:
                    expired_ids.append(pid)"""

new_replenish_loop = """        if stale_unaccepted:
            max_to_expire = min(len(stale_unaccepted), len(replacement_candidates))
            for pid in stale_unaccepted[:max_to_expire]:
                expired_this_round.append(pid)
                assigned_ids.remove(pid)
                if pid not in expired_ids:
                    expired_ids.append(pid)
                await record_vendor_lead_resolved(pid)"""

if old_replenish_loop in code:
    code = code.replace(old_replenish_loop, new_replenish_loop, 1)
    print("6a. Added record_vendor_lead_resolved to stale firms in replenish_booking_leads")
else:
    print("Warning: old_replenish_loop not found")

old_replenish_sort = """        prefs = f_data.get("budget_preference") or []
        if isinstance(prefs, str):
            prefs = [prefs]
        prefs_lower = [str(p).lower() for p in prefs]
        is_tier_match = bool(target_tier and any(target_tier in p for p in prefs_lower))
        eligible_unassigned.append((is_tier_match, f_uid))

    # Sort tier matches first
    eligible_unassigned.sort(key=lambda x: not x[0])
    replacement_candidates = [uid for _, uid in eligible_unassigned]"""

new_replenish_sort = """        stats = await get_vendor_lead_stats(f_uid)
        if stats["active_pending_leads"] >= MAX_CONCURRENT_LEADS:
            continue  # Concurrency cap: skip overloaded studio

        prefs = f_data.get("budget_preference") or []
        if isinstance(prefs, str):
            prefs = [prefs]
        prefs_lower = [str(p).lower() for p in prefs]
        is_tier_match = bool(target_tier and any(target_tier in p for p in prefs_lower))
        fq_score = calculate_fair_queue_score_py(stats)
        last_disp_str = stats.get("last_lead_dispatched_at") or ""
        eligible_unassigned.append((is_tier_match, fq_score, last_disp_str, f_uid))

    # Sort by: tier match (True first), highest hunger score, oldest dispatch time
    eligible_unassigned.sort(key=lambda x: (not x[0], -x[1], x[2]))
    replacement_candidates = [uid for _, _, _, uid in eligible_unassigned]"""

if old_replenish_sort in code:
    code = code.replace(old_replenish_sort, new_replenish_sort, 1)
    print("6b. Upgraded replenishment candidate selection with Fair-Queue & Concurrency Cap")
else:
    print("Warning: old_replenish_sort not found")

old_replenish_new_assign = """    now_iso = now_utc.isoformat()
    for cand_id in newly_added_ids:
        provider_assigned_at[cand_id] = now_iso"""

new_replenish_new_assign = """    now_iso = now_utc.isoformat()
    for cand_id in newly_added_ids:
        provider_assigned_at[cand_id] = now_iso
        await record_vendor_lead_dispatched(cand_id)"""

if old_replenish_new_assign in code:
    code = code.replace(old_replenish_new_assign, new_replenish_new_assign, 1)
    print("6c. Added record_vendor_lead_dispatched for newly added replenishment firms")
else:
    print("Warning: old_replenish_new_assign not found")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("routes_bookings.py successfully updated and saved!")
