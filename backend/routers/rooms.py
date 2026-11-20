from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import get_current_user_id
from uuid import UUID
from postgrest.exceptions import APIError
from database import get_db, get_admin_db

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
    db=Depends(get_admin_db),
):
    if req.start_time.utcoffset() is None or req.end_time.utcoffset() is None:
        raise HTTPException(status_code=422, detail="Times must include a timezone.")
    start = req.start_time.astimezone(timezone.utc)
    end = req.end_time.astimezone(timezone.utc)

    if start >= end or start <= datetime.now(timezone.utc):
        raise HTTPException(status_code=422, detail="Choose a valid future time.")

    try:
        result = db.rpc(
            "reserve_room",
            {
                "p_user_id": current_user_id,
                "p_room_id": req.room_id,
                "p_start_time": start.isoformat(),
                "p_end_time": end.isoformat(),
            },
        ).execute()

        return { 
            "message": "Study room reserved successfully",
            "reservation_id": result.data,
        }
    except APIError as exc:
        if exc.code == "23P01":
            raise HTTPException(
                status_code=409,
                detail="Room is already reserved for this time slot.",
            ) from exc
        
        if exc.code == "P0002":
            raise HTTPException(
                status_code=404,
                detail="Room not found.") from exc

        if exc.code == "22023":
            raise HTTPException(
                status_code=422,
                detail="Choose a valid future time.") from exc

        raise HTTPException( 
            status_code=500,
            detail="Could not reserve the room") from exc

@router.post("/api/waitlist/rooms")
def join_room_waitlist(
    req: RoomReservationRequest,
    current_user_id: str = Depends(get_current_user_id),
    db=Depends(get_admin_db),
):
    if req.start_time.utcoffset() is None or req.end_time.utcoffset() is None:
        raise HTTPException(status_code=422, detail="Times must include a timezone.")

    start = req.start_time.astimezone(timezone.utc)
    end = req.end_time.astimezone(timezone.utc)

    if start >= end or start <= datetime.now(timezone.utc):
        raise HTTPException(status_code=422, detail="Choose a valid future time.")

    try:
        result = db.rpc(
            "join_room_waitlist",
            {
                "p_user_id": current_user_id,
                "p_room_id": req.room_id,
                "p_start_time": start.isoformat(),
                "p_end_time": end.isoformat(),
            },
        ).execute()

        return { 
            "message": "Joined room waitlist",
            "waitlist_id": result.data,
        }
    except APIError as exc:
        if exc.code == "P0001":
            raise HTTPException(
                status_code=409,
                detail=exc.message or "Cannot join this waitlist.",
            ) from exc
        if exc.code == "P0002":
            raise HTTPException(
                status_code=404,
                detail="Room not found.") from exc

        if exc.code in ("22023", "22P02"):
            raise HTTPException(
                status_code=422,
                detail="Choose a valid room and future time.",
            ) from exc
        raise HTTPException(
            status_code=500,
            detail="Could not join the room waitlist"
        ) from exc

@router.delete("/api/waitlist/rooms/{waitlist_id}")
def leave_room_waitlist(
    waitlist_id: UUID,
    current_user_id: str = Depends(get_current_user_id),
    db=Depends(get_admin_db),
):
    try:
        result = (
            db.table("room_waitlist")
            .update({"status": "cancelled"})
            .eq("id", str(waitlist_id))
            .eq("user_id", current_user_id)
            .eq("status", "waiting")
            .select("id")
            .execute()
        )
    except APIError as exc:
        raise HTTPException(
            status_code=500,
            detail="Could not leave the room waitlist"
        ) from exc

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="Active waitlist entry not found.",
        )
    return {"message": "Left room waitlist"}

@router.delete("/api/reservations/rooms/{reservation_id}")
def cancel_study_room_reservation(
    reservation_id: str,
    current_user_id: str = Depends(get_current_user_id),
    df=Depends(get_admin_db),
):
    try:
        result = df.rpc(
            "cancel_room_and_promote",
            {
                "p_reservation_id": reservation_id,
                "p_user_id": current_user_id,
            },
        ).execute()

        return {
            "message": "Reservation cancelled successfully",
            "promoted_count": result.data,
        }
    except APIError as exc:
        if exc.code == "P0002":
            raise HTTPException(
                status_code=404,
                detail="Reservation not found.") from exc
        
        raise HTTPException( 
            status_code=500,
            detail="Could not cancel the reservation") from exc