import os

rev_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\backend\routes_reviews.py"

with open(rev_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update create_booking_review to handle service bookings with full customer info, notification, and tag support
old_create_fn_start = '''@router.post("/reviews/booking")
async def create_booking_review(
    payload: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(require_auth)
):
    """
    Create a review for a booking request (supports client-to-provider or provider-to-client).
    If inventory_id is provided or found on the booking, the review is also linked to the inventory.
    """
    try:
        reviewer_id = current_user["user_id"]'''

new_create_fn_start = '''@router.post("/reviews/booking")
async def create_booking_review(
    payload: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(require_auth)
):
    """
    Create a review for a booking request (supports client-to-provider or provider-to-client).
    Calculates average rating, updates profile, and pushes notification to the vendor.
    """
    try:
        reviewer_id = current_user.get("user_id") or current_user.get("id") or current_user.get("sub")'''

if old_create_fn_start in code:
    code = code.replace(old_create_fn_start, new_create_fn_start, 1)
    print("1. Updated reviewer_id extraction in create_booking_review")
else:
    print("1. Note: old_create_fn_start not found directly, checking variations...")

# Let's inspect the authorization check in create_booking_review
old_auth_check = '''        # Verify user is part of the booking
        is_client = (booking_data.get("renter_id") == reviewer_id or booking_data.get("client_profile_id") == reviewer_id or booking_data.get("user_id") == reviewer_id)
        is_provider = (booking_data.get("owner_id") == reviewer_id or booking_data.get("provider_profile_id") == reviewer_id)
        
        if not is_client and not is_provider:
            raise HTTPException(status_code=403, detail="Not authorized to review this booking")
            
        # Resolve target ID
        target_id = None
        if review_type == "client_to_provider":
            target_id = booking_data.get("owner_id") or booking_data.get("provider_profile_id")
        else:
            target_id = booking_data.get("renter_id") or booking_data.get("client_profile_id") or booking_data.get("user_id")'''

new_auth_check = '''        # Verify user is part of the booking (supports rental and service bookings)
        is_client = (
            booking_data.get("renter_id") == reviewer_id
            or booking_data.get("client_profile_id") == reviewer_id
            or booking_data.get("user_id") == reviewer_id
            or booking_data.get("customer_id") == reviewer_id
            or booking_data.get("client_id") == reviewer_id
            or current_user.get("id") == booking_data.get("customer_id")
            or current_user.get("email") == booking_data.get("client_email")
        )
        is_provider = (
            booking_data.get("owner_id") == reviewer_id
            or booking_data.get("provider_profile_id") == reviewer_id
            or booking_data.get("provider_id") == reviewer_id
            or booking_data.get("accepted_by_vendor_id") == reviewer_id
            or booking_data.get("confirmed_provider_id") == reviewer_id
        )
        
        # If client cannot be strictly matched by ID (e.g. guest auth), allow if client token matches email/phone
        if not is_client and not is_provider:
            # Fallback: check if customer id in booking matches
            if booking_data.get("customer_id") and current_user.get("id"):
                is_client = (booking_data.get("customer_id") == current_user.get("id"))
                
        if not is_client and not is_provider:
            raise HTTPException(status_code=403, detail="Not authorized to review this booking")
            
        # Resolve target ID (the vendor being reviewed)
        target_id = payload.get("provider_id")
        if not target_id:
            if review_type == "client_to_provider":
                target_id = (
                    booking_data.get("accepted_by_vendor_id")
                    or booking_data.get("confirmed_provider_id")
                    or booking_data.get("provider_id")
                    or booking_data.get("owner_id")
                    or booking_data.get("provider_profile_id")
                )
            else:
                target_id = (
                    booking_data.get("renter_id")
                    or booking_data.get("customer_id")
                    or booking_data.get("client_profile_id")
                    or booking_data.get("user_id")
                )'''

if old_auth_check in code:
    code = code.replace(old_auth_check, new_auth_check, 1)
    print("2. Updated authorization check and target_id resolution in create_booking_review")
else:
    print("2. Note: old_auth_check not found directly")

# Let's inspect the review_data creation and notification payload
old_save_and_notif = '''        review_data = {
            "booking_id": booking_id,
            "reviewer_id": reviewer_id,
            "target_id": target_id,
            "provider_id": target_id if review_type == "client_to_provider" else None,
            "client_id": target_id if review_type == "provider_to_client" else None,
            "inventory_id": inventory_id,
            "rating": float(rating),
            "comment": comment,
            "review_type": review_type,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Save review
        review_id = generate_id("review_")
        db.collection('reviews').document(review_id).set(review_data)
        
        # Update booking status/review flag
        update_field = "client_review_submitted" if review_type == "client_to_provider" else "provider_review_submitted"
        
        # Check which table to update
        if db.collection('rental_requests').document(booking_id).get().exists:
            db.collection('rental_requests').document(booking_id).update({
                update_field: True
            })
        else:
            db.collection('booking_requests').document(booking_id).update({
                "review_submitted" if review_type == "client_to_provider" else "provider_review_submitted": True
            })
            
        # Update target average rating
        # For client_to_provider, update provider rating. For provider_to_client, update user/client rating.
        reviews_query = db.collection('reviews').where('target_id', '==', target_id).where('review_type', '==', review_type).get()
        ratings = [float(doc.to_dict().get("rating", 0)) for doc in reviews_query]
        avg_rating = sum(ratings) / len(ratings) if ratings else 0.0
        
        db.collection('users').document(target_id).update({
            "average_rating": round(avg_rating, 1),
            "total_reviews": len(ratings)
        })'''

new_save_and_notif = '''        # Extract reviewer name and event details
        reviewer_name = payload.get("reviewer_name") or current_user.get("name") or booking_data.get("client_name") or "A Customer"
        event_name = (
            booking_data.get("event_type")
            or (booking_data.get("lead_details") or {}).get("eventType")
            or booking_data.get("service_type")
            or "Photography Shoot"
        )
        event_date = booking_data.get("event_date") or ""
        tags = payload.get("tags") or []

        review_data = {
            "booking_id": booking_id,
            "reviewer_id": reviewer_id,
            "reviewer_name": reviewer_name,
            "target_id": target_id,
            "provider_id": target_id if review_type == "client_to_provider" else None,
            "client_id": target_id if review_type == "provider_to_client" else None,
            "inventory_id": inventory_id,
            "rating": float(rating),
            "comment": comment,
            "tags": tags,
            "event_name": event_name,
            "event_date": event_date,
            "review_type": review_type,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Save review
        review_id = generate_id("review_")
        db.collection('reviews').document(review_id).set(review_data)
        
        # Update booking status/review flag
        update_field = "client_review_submitted" if review_type == "client_to_provider" else "provider_review_submitted"
        
        # Check which table to update
        if db.collection('rental_requests').document(booking_id).get().exists:
            db.collection('rental_requests').document(booking_id).update({
                update_field: True,
                "review_submitted": True,
            })
        else:
            db.collection('booking_requests').document(booking_id).update({
                "review_submitted": True,
                update_field: True,
            })
            
        # Update target average rating
        reviews_query = db.collection('reviews').where('target_id', '==', target_id).get()
        ratings = [float(doc.to_dict().get("rating", 0)) for doc in reviews_query if doc.to_dict().get("rating") is not None]
        avg_rating = sum(ratings) / len(ratings) if ratings else float(rating)
        rounded_avg = round(avg_rating, 1)
        total_count = len(ratings)
        
        # Update users document
        update_user_dict = {
            "average_rating": rounded_avg,
            "rating": rounded_avg,
            "total_reviews": total_count,
            "review_count": total_count,
            "updated_at": datetime.utcnow().isoformat(),
        }
        user_doc_ref = db.collection('users').document(target_id)
        if user_doc_ref.get().exists:
            user_doc_ref.update(update_user_dict)
            
        # Also update vendor_profiles or profiles if present
        try:
            vp_ref = db.collection('vendor_profiles').document(target_id)
            if vp_ref.get().exists:
                vp_ref.update(update_user_dict)
        except Exception:
            pass'''

if old_save_and_notif in code:
    code = code.replace(old_save_and_notif, new_save_and_notif, 1)
    print("3. Updated review saving and profile rating calculation in create_booking_review")
else:
    print("3. Note: old_save_and_notif not found directly")

# Let's update notification message
old_notif_block = '''        # Create notification for reviewee
        reviewer_name = "Someone"
        reviewer_doc = db.collection('users').document(reviewer_id).get()
        if reviewer_doc.exists:
            reviewer_name = reviewer_doc.to_dict().get("name", "Someone")
            
        notif_id = generate_id("notif_")
        await create_and_push_notification(
            user_id=target_id,
            notification_id=notif_id,
            title="New Review Received!",
            message=f"{reviewer_name} left you a {rating}-star review.",
            notif_type="new_review",
            data={"booking_id": booking_id}
        )'''

new_notif_block = '''        # Create high-impact push & in-app notification for reviewee
        notif_id = generate_id("notif_")
        rating_int = int(float(rating))
        await create_and_push_notification(
            user_id=target_id,
            notification_id=notif_id,
            title="New Review Received! ⭐",
            message=f"{reviewer_name} rated you {rating_int} stars! Tap to view.",
            notif_type="new_review",
            data={
                "type": "new_review",
                "review_id": review_id,
                "booking_id": booking_id,
                "rating": float(rating),
                "comment": comment,
                "reviewer_name": reviewer_name,
                "event_name": event_name,
                "event_date": event_date,
                "tags": tags,
                "created_at": datetime.utcnow().isoformat(),
            }
        )'''

if old_notif_block in code:
    code = code.replace(old_notif_block, new_notif_block, 1)
    print("4. Updated notification copy and rich payload in create_booking_review")
else:
    print("4. Note: old_notif_block not found directly")

# 5. Add endpoint to get review details: GET /api/reviews/details/{review_id}
details_route = '''
@router.get("/reviews/details/{review_id}")
async def get_review_details(review_id: str, current_user: Dict = Depends(require_auth)):
    """Get rich review details for the review detail modal in vendor app."""
    try:
        doc = db.collection('reviews').document(review_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Review not found")
        data = doc.to_dict()
        data["id"] = doc.id
        return data
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching review detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))
'''

if "def get_review_details" not in code:
    code = code + "\n" + details_route
    print("5. Added get_review_details endpoint to routes_reviews.py")

with open(rev_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Saved updated routes_reviews.py successfully!")
