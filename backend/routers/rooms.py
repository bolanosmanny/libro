from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import get_db

router = APIRouter(tags=["rooms"])

class RoomReservationRequest(BaseModel):
    user_id: str
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
def reserve_study_room(req: RoomReservationRequest, db=Depends(get_db)):
    try:
        existing = db.table("room_reservations") \
            .select("*") \
            .eq("room_id", req.room_id) \
            .eq("status", "confirmed") \
            .lt("start_time", req.end_time.isoformat()) \
            .gt("end_time", req.start_time.isoformat()) \
            .execute()

        if existing.data:
            raise HTTPException(status_code=400, detail="Room is already reserved for this time slot.")

        res = db.table("room_reservations").insert({
            "user_id": req.user_id,
            "room_id": req.room_id,
            "start_time": req.start_time.isoformat(),
            "end_time": req.end_time.isoformat(),
            "status": "confirmed"
        }).execute()

        return {"message": "Study room reserved successfully", "data": res.data}
    except HTTPException as he:
        raise he
    except Exception as e:
        print("Reservation error:", e)
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/api/reservations/rooms/{reservation_id}")
def cancel_study_room_reservation(reservation_id: str, db=Depends(get_db)):
    try:
        # Check if reservation exists
        existing = db.table("room_reservations").select("*").eq("id", reservation_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Reservation not found.")

        # Update reservation status to cancelled
        res = db.table("room_reservations").update({"status": "cancelled"}).eq("id", reservation_id).execute()

        return {"message": "Reservation cancelled successfully", "data": res.data}
    except HTTPException as he:
        raise he
    except Exception as e:
        print("Cancel reservation error:", e)
        raise HTTPException(status_code=500, detail=str(e))