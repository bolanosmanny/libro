from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user_id
from datetime import datetime, timezone
from database import get_admin_db


router = APIRouter(tags=["users"])

@router.get("/api/users/{user_id}/activity")
def get_user_activity(
    user_id: str,
    current_user_id: str = Depends(get_current_user_id),
    admin_db=Depends(get_admin_db)
):
    if user_id != current_user_id:
        raise HTTPException(
            status_code=403,
            detail="You can only view your own activity.",
        )

    try:
        books = admin_db.table("book_loans").select("*, books(*)").eq("user_id", user_id).execute()
        rooms = admin_db.table("room_reservations").select("*, study_rooms(*)").eq("user_id", user_id).execute()

        waitlist = (
            admin_db.table("room_waitlist")
            .select("id, room_id, start_time, end_time, created_at, study_rooms(room_number)")
            .eq("user_id", user_id)
            .eq("status", "waiting")
            .gt("start_time", datetime.now(timezone.utc).isoformat())
            .order("created_at")
            .execute()

        )

        return {
            "book_loans": books.data,
            "room_reservations": rooms.data,
            "room_waitlist": waitlist.data,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Could not load user activity.",
        ) from exc