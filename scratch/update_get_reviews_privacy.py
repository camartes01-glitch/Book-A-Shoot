import os

rev_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\backend\routes_reviews.py"

with open(rev_path, "r", encoding="utf-8") as f:
    code = f.read()

# Make sure get_current_user is imported
if "get_current_user" not in code:
    code = code.replace("from auth_utils import require_auth", "from auth_utils import require_auth, get_current_user", 1)

old_get_reviews = '''@router.get("/reviews/{provider_id}")
async def get_reviews(provider_id: str):
    """Get all reviews for a specific provider"""
    try:
        # Check if provider_id starts with user_ prefix and resolve
        actual_provider_id = provider_id
        if provider_id.startswith("user_"):
            user_query = db.collection('users').where('public_id', '==', provider_id).limit(1).get()
            if user_query:
                actual_provider_id = user_query[0].id
            else:
                # Fallback to cleaning prefix
                clean_id = provider_id.replace("user_", "")
                user_doc = db.collection('users').document(clean_id).get()
                if user_doc.exists:
                    actual_provider_id = clean_id

        reviews_query = db.collection('reviews').where('provider_id', '==', actual_provider_id).get()
        reviews = []
        for doc in reviews_query:
            rdata = doc.to_dict()
            rdata["id"] = doc.id
            
            # Enrich with reviewer name/avatar
            reviewer_id = rdata.get("reviewer_id")
            if reviewer_id:
                reviewer_doc = db.collection('users').document(reviewer_id).get()
                if reviewer_doc.exists:
                    reviewer_data = reviewer_doc.to_dict()
                    rdata["reviewer_name"] = reviewer_data.get("name", "Anonymous")
                    rdata["reviewer_avatar"] = reviewer_data.get("avatar_url") or reviewer_data.get("profile_image")
            
            reviews.append(rdata)
            
        return reviews'''

new_get_reviews = '''@router.get("/reviews/{provider_id}")
async def get_reviews(provider_id: str, current_user: Optional[Dict] = Depends(get_current_user)):
    """
    Get all reviews for a specific provider.
    Privacy Rule:
    - If the requester is the vendor themselves, they see customer names & booking details.
    - If the requester is another user / public customer, customer names are anonymized as 'Verified Customer'.
    """
    try:
        # Check if provider_id starts with user_ prefix and resolve
        actual_provider_id = provider_id
        if provider_id.startswith("user_"):
            user_query = db.collection('users').where('public_id', '==', provider_id).limit(1).get()
            if user_query:
                actual_provider_id = user_query[0].id
            else:
                clean_id = provider_id.replace("user_", "")
                user_doc = db.collection('users').document(clean_id).get()
                if user_doc.exists:
                    actual_provider_id = clean_id

        # Determine if the caller is the owner of this profile
        caller_id = (current_user.get("user_id") or current_user.get("id")) if current_user else None
        is_owner = bool(caller_id and (caller_id == actual_provider_id or caller_id == provider_id))

        reviews_query = db.collection('reviews').where('provider_id', '==', actual_provider_id).get()
        reviews = []
        for doc in reviews_query:
            rdata = doc.to_dict()
            rdata["id"] = doc.id
            
            # Privacy masking:
            if is_owner:
                # Owner sees the real reviewer name
                if not rdata.get("reviewer_name"):
                    reviewer_id = rdata.get("reviewer_id")
                    if reviewer_id:
                        reviewer_doc = db.collection('users').document(reviewer_id).get()
                        if reviewer_doc.exists:
                            rdata["reviewer_name"] = reviewer_doc.to_dict().get("name", "Customer")
            else:
                # Public customers see anonymized 'Verified Customer' (no real names exposed)
                rdata["reviewer_name"] = "Verified Customer"
                rdata.pop("reviewer_id", None)
                rdata.pop("client_id", None)
            
            reviews.append(rdata)
            
        return reviews'''

if old_get_reviews in code:
    code = code.replace(old_get_reviews, new_get_reviews, 1)
    print("Updated get_reviews with privacy masking!")
else:
    print("Warning: old_get_reviews not found")

with open(rev_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Saved routes_reviews.py successfully!")
