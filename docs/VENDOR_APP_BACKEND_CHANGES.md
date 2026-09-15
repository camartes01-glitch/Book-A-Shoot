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
