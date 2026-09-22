# Camartes Main Vendor Platform & Backend: 6-Photographer Lead Distribution & Contact Masking Specification

This document details the exact changes and implementation guidelines required in the main **Camartes** codebase (`camartes-prelaunch-1`), covering both the **FastAPI Backend** (`backend/`) and the **Vendor Mobile App** (`frontend/`).

---

## Overview of the Workflow

1. **Customer Submits Lead**:
   - The Customer App (`bookashoot`) matches up to **6 verified freelance photographers** based on the customer's budget, requirements, and location preference (*Near event*, *Neighborhood/area*, or *Another city*).
   - The customer app calls `POST /api/bookings` with:
     ```json
     {
       "provider_id": "primary_vendor_id",
       "assigned_provider_ids": ["v1", "v2", "v3", "v4", "v5", "v6"],
       "lead_broadcast": true,
       "service_type": "photographer",
       "event_date": "2026-10-15",
       "event_time": "10:00",
       "budget": "30000",
       "client_name": "Keerthan",
       "client_phone": "+919876543210",
       "client_email": "customer@gmail.com",
       "lead_details": {
         "eventType": "Wedding Reception",
         "eventDate": "2026-10-15",
         "eventTime": "10:00",
         "venueAddress": "Banjara Hills, Hyderabad",
         "city": "Hyderabad",
         "budget": 30000,
         "packageTier": "signature",
         "services": ["Photography"],
         "addOns": ["Drone"],
         "clientName": "Keerthan",
         "clientContactMasked": true
       }
     }
     ```

2. **Incoming Requests in Vendor App**:
   - The request appears in the **Incoming Requests** tab for all **6 photographers**.
   - **Contact Masking**: The customer's phone number and email are **masked** (`+91 ••••• ••210`, `ke•••••@gmail.com`) so neither party can bypass the platform prior to commitment.
   - All other project details (event type, date, time, venue address, budget, package tier, deliverables) are **fully visible**.

3. **Photographer Acceptance**:
   - The first photographer to accept calls `POST /api/bookings/{booking_id}/accept`.
   - The booking transitions to `accepted`.
   - The customer's full phone number and email are immediately returned and unmasked for the photographer.
   - The customer app receives an update revealing the photographer's full contact details.

---

## 1. Backend Changes (`backend/routes_bookings.py`)

### A. Update Request Model
In `backend/routes_bookings.py`, update `BookingRequestModel`:

```python
class BookingRequestModel(BaseModel):
    provider_id: str
    provider_profile_id: Optional[str] = None
    assigned_provider_ids: Optional[List[str]] = Field(default_factory=list)
    lead_broadcast: Optional[bool] = False
    service_type: str
    event_date: str
    event_time: str
    end_date: Optional[str] = None
    duration_hours: Optional[float] = None
    message: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    budget: Optional[str] = None
    location_preference: Optional[Dict[str, Any]] = None
    lead_details: Optional[Dict[str, Any]] = None
```

### B. Handle Lead Broadcast in `create_booking` (`POST /api/bookings`)
When `assigned_provider_ids` has items, store the booking and associate it with each assigned provider in `booking_requests` or `service_leads`:

```python
@router.post("/api/bookings")
async def create_booking(
    req: BookingRequestModel,
    current_user: dict = Depends(require_auth)
):
    booking_id = f"BK-{uuid.uuid4().hex[:8].upper()}"
    now_iso = datetime.utcnow().isoformat()
    
    # Target list: top 6 providers
    providers = req.assigned_provider_ids if req.assigned_provider_ids else [req.provider_id]
    
    booking_doc = {
        "id": booking_id,
        "customer_id": current_user["id"],
        "provider_id": req.provider_id,
        "assigned_provider_ids": providers,
        "status": "pending",
        "service_type": req.service_type,
        "event_date": req.event_date,
        "event_time": req.event_time,
        "end_date": req.end_date,
        "duration_hours": req.duration_hours,
        "message": req.message,
        "budget": req.budget,
        "client_name": req.client_name or current_user.get("name"),
        "client_phone": req.client_phone or current_user.get("phone"),
        "client_email": req.client_email or current_user.get("email"),
        "lead_details": req.lead_details,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    
    # Save to Supabase
    db.collection("booking_requests").document(booking_id).set(booking_doc)
    
    # Send push notification to all 6 photographers
    for pid in providers:
        await send_push_notification(
            user_id=pid,
            title="New Incoming Shoot Request!",
            body=f"New request for {req.event_date} in {req.lead_details.get('city', 'your area')}. Tap to review."
        )
        
    return {"status": "success", "booking_id": booking_id, "booking": booking_doc}
```

### C. Mask Contact Info in `GET /api/bookings` & `GET /api/bookings/requests`
When returning bookings to vendors, mask customer contact details if status is `pending`:

```python
def mask_phone(phone: Optional[str]) -> str:
    if not phone:
        return ""
    clean = re.sub(r"[^\d+]", "", phone)
    if len(clean) >= 10:
        return f"{clean[:3]} ••••• ••{clean[-2:]}"
    return "••••••••••"

def mask_email(email: Optional[str]) -> str:
    if not email or "@" not in email:
        return ""
    parts = email.split("@")
    return f"{parts[0][:2]}•••••@{parts[1]}"

@router.get("/api/bookings/requests")
async def get_vendor_incoming_requests(current_user: dict = Depends(require_auth)):
    vendor_id = current_user["id"]
    
    # Query all booking requests where vendor is primary OR included in assigned_provider_ids
    docs = db.collection("booking_requests").where(
        "assigned_provider_ids", "array-contains", vendor_id
    ).get()
    
    results = []
    for doc in docs:
        b = doc.to_dict()
        status = b.get("status", "pending").lower()
        
        # PRIVACY RULE: If not accepted by this vendor, mask customer contacts!
        if status in ["pending", "requested", "submitted"]:
            b["client_phone"] = mask_phone(b.get("client_phone"))
            b["client_email"] = mask_email(b.get("client_email"))
            b["contact_unlocked"] = False
        else:
            b["contact_unlocked"] = True
            
        results.append(b)
        
    return {"requests": results}
```

### D. Accept Booking Endpoint (`POST /api/bookings/{id}/accept`)
When a photographer accepts:
1. Ensure the booking is not already claimed by another vendor.
2. Update status to `accepted` and set `accepted_vendor_id = vendor_id`.
3. Return the full unmasked customer details to the accepting photographer.
4. Notify the customer that this photographer accepted.

```python
@router.post("/api/bookings/{booking_id}/accept")
async def accept_booking(
    booking_id: str,
    current_user: dict = Depends(require_auth)
):
    vendor_id = current_user["id"]
    doc_ref = db.collection("booking_requests").document(booking_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Booking request not found.")
        
    booking = doc.to_dict()
    if booking.get("status") not in ["pending", "requested"]:
        raise HTTPException(status_code=400, detail="This booking has already been accepted or is no longer available.")
        
    now_iso = datetime.utcnow().isoformat()
    update_payload = {
        "status": "accepted",
        "provider_id": vendor_id,
        "accepted_by_vendor_id": vendor_id,
        "accepted_at": now_iso,
        "updated_at": now_iso,
    }
    doc_ref.update(update_payload)
    
    # Full unmasked customer contact returned to the photographer
    booking.update(update_payload)
    
    # Notify customer that this photographer accepted
    await send_push_notification(
        user_id=booking["customer_id"],
        title="Photographer Accepted!",
        body=f"{current_user.get('name', 'A photographer')} has accepted your booking request."
    )
    
    return {
        "status": "accepted",
        "booking": booking,
        "unlocked_customer_contact": {
            "name": booking.get("client_name"),
            "phone": booking.get("client_phone"),
            "email": booking.get("client_email"),
        }
    }
```

---

## 2. Vendor App Frontend (`frontend/`)

### A. Incoming Request Card (`frontend/components/bookings/VendorRequestCard.tsx`)
In the vendor app's Bookings tab (`Incoming Requests`):
1. Show badge: **"⚡ Open Lead · Shared with you and 5 others"**.
2. Render details:
   - **Event Type**: e.g., Wedding Reception / Birthday
   - **Dates & Schedule**: e.g., Oct 15, 2026 · 10:00 AM – 6:00 PM
   - **Venue Location**: e.g., Banjara Hills, Hyderabad
   - **Customer Name**: e.g., Keerthan
   - **Customer Contact**: Show `🔒 Accept to unlock phone & WhatsApp` (with masked text `+91 ••••• ••210`)
   - **Offered Budget / Tier**: e.g., ₹30,000 (Signature Tier)
   - **Deliverables Required**: e.g., 50 edited photos, Raw files, Drone coverage
3. Action buttons:
   - **"Accept Request"** (Primary): Calls `/api/bookings/{id}/accept`, unlocks full contact details, and opens phone/WhatsApp dialer.
   - **"Decline"** (Outline): Removes the lead from this vendor's feed.

---

## Summary of Guarantees

* **Zero Contact Leakage**: Customer contacts are masked server-side in `GET /api/bookings/requests` until `POST /api/bookings/{id}/accept` succeeds.
* **Top 6 Freelancer Photographers**: Only verified photographers matching the selected location and budget receive the lead.
* **First-to-Accept Confirmation**: The first photographer to accept secures the booking, instantly notifying the customer and unlocking direct communication.

---

## 3. Customer App Notification Contract

The customer app (`bookashoot`) currently derives all of the notifications below **client-side**, from booking state it already polls (see `src/services/notificationEngine.ts`, `src/domain/notificationContent.ts`), so the product behavior described here already works today without any backend change. This section is the contract for when Camartes' `send_push_notification(...)` calls (§1) are updated to send the same notifications server-side — copy and payload should match exactly so the client's rendering/routing (which trusts an explicit `type` first, see `src/domain/notificationRouting.ts`) stays correct either way.

**Hard rule: never send a payment-related notification to the customer app.** Payments for Book A Shoot are handled entirely outside the app; the client also enforces this defensively (`notificationContent.isPaymentRelated()` drops anything payment/Razorpay/invoice-shaped before it can render), but the backend should not rely on that filter and must not send one in the first place.

### Notification types, copy, and required `data` payload

Every push should set `data.type` to one of the values below, plus the listed fields (all customer-facing values must be the exact, accurate strings — real customer name, real firm name, real event name/date/time/place; never a placeholder or the raw record id).

| `type` | Fires when | Title / body template | Required `data` fields |
|---|---|---|---|
| `welcome` | Customer's first successful login/signup | "Welcome, {customer_name}! 👋" / "Ready to book an event with the best photography & videography firms in the city?" | `customer_name` |
| `request_sent` | `POST /api/bookings` succeeds (first-time request, not a Search Again retry) | "Request sent! 📮" / "We've sent your {event_name} request to {firm_count} photography firms. Tap to view their portfolios and see their work while you wait." | `booking_id`, `event_name`, `firm_count` |
| `vendor_accepted` | `POST /api/bookings/{id}/accept` succeeds | "Yayy! {firm_name} accepted your request! 🎉" / "{firm_name} accepted your request for {event_name} on {event_date}. Tap to view their contact and social links — now you can chat with them to lock in your event." | `booking_id`, `firm_id`, `firm_name`, `event_name`, `event_date`, `event_place` (optional) |
| `vendor_rejected` | A photographer declines, or a lead times out unclaimed | "{firm_name} can't make it this time" / "{firm_name} rejected your request for {event_name} on {event_date}. Don't worry, we're on a mission to search new and better firms for you." (omit `{firm_name}` and use a booking-level variant if no single firm is known) | `booking_id`, `firm_id`/`firm_name` (when known), `event_name`, `event_date` |
| `new_search_dispatched` | The system auto re-matches and re-sends a Search Again retry to new firms | "Hey {customer_name}, we found more firms! 🔍" / "We sent a request to the newly searched firms: {firm_names}. Tap to view their portfolio and status." | `booking_id`, `customer_name`, `firm_names` (array) |
| `chat_message` | A firm sends a customer a DM | "{firm_name} texted you 💬" / "\"{message_preview}\"" | `sender_id` (the firm's id), `firm_name`, `message_preview` |
| `event_reminder` | One day before a confirmed event | "Tomorrow's the big day! 📸" / "Hey {customer_name}, get ready for your {event_name} on {event_date} with {firm_name}." | `booking_id`, `customer_name`, `event_name`, `event_date`, `firm_name` |

`draft_resume_nudge` and `marketing_nudge` (idle re-engagement) are intentionally client-only — they depend on on-device draft/idle state the backend doesn't track, and are locally scheduled via `expo-notifications` so they still arrive while the app is closed.

### Tap routing (client-side, already implemented)

Whatever sends the notification, tapping it must land the customer on:

* `chat_message` → the chat thread with that firm.
* `vendor_accepted` → the booking's detail screen, opened directly to that firm's status/timeline card (contact + socials).
* `vendor_rejected`, `request_sent`, `new_search_dispatched`, `event_reminder` → the booking's detail screen.
* `welcome`, `marketing_nudge` → the home screen.

### Example: updated `send_push_notification` calls

```python
# on POST /api/bookings (lead broadcast) — customer-facing confirmation, not the vendor-facing lead alert above
await send_push_notification(
    user_id=customer_id,
    title="Request sent! 📮",
    body=f"We've sent your {event_name} request to {len(providers)} photography firms. Tap to view their portfolios and see their work while you wait.",
    data={"type": "request_sent", "booking_id": booking_id, "event_name": event_name, "firm_count": len(providers)},
)

# on POST /api/bookings/{id}/accept
await send_push_notification(
    user_id=booking["customer_id"],
    title=f"Yayy! {current_user.get('name', 'A photographer')} accepted your request! 🎉",
    body=f"{current_user.get('name', 'A photographer')} accepted your request for {booking['lead_details']['eventType']} on {booking['event_date']}. Tap to view their contact and social links — now you can chat with them to lock in your event.",
    data={"type": "vendor_accepted", "booking_id": booking_id, "firm_id": vendor_id, "firm_name": current_user.get("name"), "event_name": booking["lead_details"]["eventType"], "event_date": booking["event_date"]},
)

# on a decline / unclaimed lead timeout (currently missing server-side — today "Decline" only removes the lead from the vendor's own feed, with no customer-facing notify)
await send_push_notification(
    user_id=booking["customer_id"],
    title=f"{current_user.get('name', 'This firm')} can't make it this time",
    body=f"{current_user.get('name', 'This firm')} rejected your request for {booking['lead_details']['eventType']} on {booking['event_date']}. Don't worry, we're on a mission to search new and better firms for you.",
    data={"type": "vendor_rejected", "booking_id": booking_id, "firm_id": vendor_id, "firm_name": current_user.get("name"), "event_name": booking["lead_details"]["eventType"], "event_date": booking["event_date"]},
)
```

---

## 4. Automatic Replacement Dispatch (client-implemented today, no backend change required)

The customer app now automatically keeps a booking topped up at **6 active candidate firms** — when a firm explicitly declines, or doesn't respond within its accept window, the client finds and dispatches a request to a replacement firm on its own, without the customer tapping anything. This already works today because it reuses `POST /api/bookings` exactly as described in §1 — a replacement dispatch is just another `POST /api/bookings` call scoped to only the new provider id(s), which the client tracks (`Booking.replacementWaveIds`) and folds back into the same booking the customer already sees, rather than surfacing it as a separate one.

Two things worth knowing if/when the backend evolves this further:

1. **1-hour accept window is currently a client-side assumption, not a verified backend contract.** The client starts its own 1-hour clock from the moment it first observes a firm assigned, and treats a firm as dead (triggering a replacement search) if that clock runs out with no `has_accepted`. If Camartes' vendor platform already enforces (or later enforces) its own lock at 1 hour server-side, reflecting that back explicitly — e.g. `assigned_photographers[].status: "timed_out"` — would let the client retire its own timer in favor of the authoritative one. The row shape already has room for this: the client parses `has_rejected` / `is_rejected` / `status` off each `assigned_photographers` entry today (`src/domain/bookingRequest.ts`), it just isn't sent yet.
2. **A per-firm decline currently has no customer-visible signal at all** (per the note on §D above — "Decline" just removes the lead from that vendor's own feed). Sending `status: "rejected"` on that firm's row the next time the customer polls `GET /api/bookings/{id}` (instead of silently omitting it) is the single highest-value change here: it's what lets the client fire an accurate "**{firm_name}** rejected your request" notification and count that slot as open, instead of relying on the weaker "firm silently disappeared from the list" heuristic it falls back to today.
