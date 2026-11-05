from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user_id
from database import get_db

router = APIRouter(tags=["users"])


@router.get("/api/users/{user_id}/activity")
def get_user_activity(
    user_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    if user_id != current_user_id:
        raise HTTPException(
            status_code=403,
            detail="You can only view your own activity.",
        )

    try:
        books = db.table("book_loans").select("*, books(*)").eq("user_id", user_id).execute()
        rooms = db.table("room_reservations").select("*, study_rooms(*)").eq("user_id", user_id).execute()

        return {
            "book_loans": books.data,
            "room_reservations": rooms.data,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Could not load user activity.",
        ) from exc