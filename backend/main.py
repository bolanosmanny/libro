import sys
import os
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from routers import users, books

# Ensure backend directory is in Python module search path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_db

# Load .env directly from the backend folder
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

app = FastAPI(title="Libro API")
app.include_router(users.router)
app.include_router(books.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---
class RoomReservationRequest(BaseModel):
    user_id: str
    room_id: str
    start_time: datetime
    end_time: datetime

# --- Health Checks ---
@app.get("/")
def read_root():
    return {"message": "Libro API Active"}


@app.get("/health")
def health_check():
    return {"status": "ok"}

# --- 2. Study Rooms & Reservations ---
@app.get("/api/rooms")
def get_study_rooms(db=Depends(get_db)):
    try:
        res = db.table("study_rooms").select("*, libraries(name, location)").execute()
        return res.data
    except Exception as e:
        print("Error fetching rooms:", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/reservations/rooms")
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


#---- Cancel Study Room Reservation ---
@app.delete("/api/reservations/rooms/{reservation_id}")
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