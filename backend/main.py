import sys
import os
from pathlib import Path
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure backend directory is in Python module search path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_db

# Load .env directly from the backend folder
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

app = FastAPI(title="Libro API")

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


class BookCheckoutRequest(BaseModel):
    user_id: str
    book_id: str


# --- Health Checks ---
@app.get("/")
def read_root():
    return {"message": "Libro API Active"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


# --- 1. Books & Book Checkouts ---
@app.get("/api/books")
def get_books(title: str = None, author: str = None, db=Depends(get_db)):
    query = db.table("books").select("*")
    if title:
        query = query.ilike("title", f"%{title}%")
    if author:
        query = query.ilike("author", f"%{author}%")
    res = query.execute()
    return res.data


@app.post("/api/books/checkout")
def checkout_book(req: BookCheckoutRequest, db=Depends(get_db)):
    # Check if book exists and is available
    book = db.table("books").select("*").eq("id", req.book_id).execute()
    if not book.data or not book.data[0].get("is_available", True):
        raise HTTPException(status_code=400, detail="Book is not available for checkout.")

    due_date = datetime.now(timezone.utc) + timedelta(days=14)
    
    # 1. Create book loan record
    res = db.table("book_loans").insert({
        "user_id": req.user_id,
        "book_id": req.book_id,
        "due_date": due_date.isoformat(),
        "status": "checked_out"
    }).execute()

    # 2. Update book availability in database
    db.table("books").update({"is_available": False}).eq("id", req.book_id).execute()

    return {"message": "Book checked out successfully", "due_date": due_date, "data": res.data}


# --- 2. Study Rooms & Reservations ---
@app.get("/api/rooms")
def get_study_rooms(db=Depends(get_db)):
    res = db.table("study_rooms").select("*, libraries(name, location)").execute()
    return res.data


@app.post("/api/reservations/rooms")
def reserve_study_room(req: RoomReservationRequest, db=Depends(get_db)):
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


# --- 3. User Dashboard Activity ---
@app.get("/api/users/{user_id}/activity")
def get_user_activity(user_id: str, db=Depends(get_db)):
    books = db.table("book_loans").select("*, books(*)").eq("user_id", user_id).execute()
    rooms = db.table("room_reservations").select("*, study_rooms(*)").eq("user_id", user_id).execute()

    return {
        "book_loans": books.data,
        "room_reservations": rooms.data
    }