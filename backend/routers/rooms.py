from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from database import get_db
from auth import get_current_user_id

router = APIRouter(tags=["rooms"])

class RoomReservationRequest(BaseModel):
    room_id: str
    start_time: datetime
    end_time: datetime

@router.get("/api/rooms")
def get_study_rooms(db=Depends(get_db)):
    try:
        res = db.table("study_rooms").select("*, libraries(name, location)").execute()
        return res.data
    except Exception as e:
        print("Error fetching rooms:", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/reservations/rooms")
def reserve_study_room(
    req: RoomReservationRequest,
    current_user_id: str = Depends(get_current_user_id),
    db=Depends(get_db)
):
    if req.start_time.utcoffset() is None or req.end_time.utcoffset() is None:
        raise HTTPException(status_code=422, detail="Times must include a timezone.")

    start = req.start_time.astimezone(timezone.utc)
    end = req.end_time.astimezone(timezone.utc)

    if start >= end:
        raise HTTPException(status_code=422, detail="End time must be after start time.")

    if start <= datetime.now(timezone.utc):
        raise HTTPException(status_code=422, detail="Start time must be in the future.")

    try:
        existing = db.table("room_reservations") \
            .select("*") \
            .eq("room_id", req.room_id) \
            .eq("status", "confirmed") \
            .lt("start_time", end.isoformat()) \
            .gt("end_time", start.isoformat()) \
            .execute()

        if existing.data:
            raise HTTPException(status_code=400, detail="Room is already reserved for this time slot.")

        res = db.table("room_reservations").insert({
            "user_id": current_user_id,
            "room_id": req.room_id,
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "status": "confirmed"
        }).execute()

        return {"message": "Study room reserved successfully", "data": res.data}
    except HTTPException as he:
        raise he
    except Exception as e:
        print("Reservation error:", e)
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/api/reservations/rooms/{reservation_id}")
def cancel_study_room_reservation(
    reservation_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db=Depends(get_db)
):
    try:
        updated = (
            db.table("room_reservations")
            .update({"status": "cancelled"})
            .eq("id", reservation_id)
            .eq("user_id", current_user_id)
            .eq("status", "confirmed")
            .select("id")
            .execute()
        )

        if not updated.data:
            raise HTTPException(
                status_code=404,
                detail="Active reservation not found"
            )

        return {"message": "Reservation cancelled successfully"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Could not cancel reservation.",
        ) from exc
