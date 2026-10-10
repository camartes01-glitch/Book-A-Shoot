import os

file_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\backend\routes_bookings.py"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

target = """    # 3. If assigned_ids is empty (e.g. from past expiration or edge cases),
    # recover all registered photography firms with balance >= 500!
    if not assigned_ids:
        for f_doc in all_firm_docs:
            f_data = f_doc.to_dict()
            f_uid = f_data.get('user_id')
            if f_uid and f_uid not in rejected_ids and f_uid != customer_id:
                bal = await get_provider_wallet_balance(f_uid)
                if bal >= LEAD_ACCEPTANCE_COST and f_uid not in assigned_ids:
                    assigned_ids.append(f_uid)
        expired_ids = [pid for pid in expired_ids if pid not in assigned_ids]"""

replacement = """    # 3. If assigned_ids is empty (e.g. from past expiration or edge cases),
    # recover top registered photography firms with balance >= 500 up to 6!
    if not assigned_ids:
        for f_doc in all_firm_docs:
            f_data = f_doc.to_dict()
            f_uid = f_data.get('user_id')
            if f_uid and f_uid not in rejected_ids and f_uid != customer_id:
                bal = await get_provider_wallet_balance(f_uid)
                if bal >= LEAD_ACCEPTANCE_COST and f_uid not in assigned_ids:
                    assigned_ids.append(f_uid)
                    newly_added_ids.append(f_uid)
                    provider_assigned_at[f_uid] = now_iso
                    if len(assigned_ids) >= 6:
                        break
        expired_ids = [pid for pid in expired_ids if pid not in assigned_ids]"""

if target in text:
    text = text.replace(target, replacement, 1)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(text)
    print("Successfully capped empty assigned_ids recovery to 6!")
else:
    print("Target not found.")
