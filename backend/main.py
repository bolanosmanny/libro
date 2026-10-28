import sys
import uuid
import os
from pathlib import Path
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure backend directory is in Python module search path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_db
from occupancy import occupancy_router, simulation_worker, cache_manager

# Load .env directly from the backend folder
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize cache, run initial simulation evaluation cycle, and launch worker
    await cache_manager.initialize()
    await simulation_worker.compute_and_cache_cycle()
    simulation_worker.start()
    yield
    # Shutdown: stop worker task and close cache connections
    await simulation_worker.stop()
    await cache_manager.close()


app = FastAPI(title="Libro API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the Occupancy & Busyness Prediction Router
app.include_router(occupancy_router)


# --- Pydantic Schemas ---
class RoomReservationRequest(BaseModel):
    user_id: str
    room_id: str
    start_time: datetime
    end_time: datetime


class BookCheckoutRequest(BaseModel):
    user_id: str
    book_id: str


# --- Book Return Schema ---
class BookReturnRequest(BaseModel):
    user_id: str
    loan_id: str


# --- Return a Book ---
@app.post("/api/books/return")
def return_book(req: BookReturnRequest, db=Depends(get_db)):
    try:
        # 1. Fetch loan details
        loan = db.table("book_loans").select("*").eq("id", req.loan_id).execute()
        if not loan.data:
            raise HTTPException(status_code=404, detail="Loan record not found.")

        book_id = loan.data[0].get("book_id")

        # 2. Update loan status to returned
        db.table("book_loans").update({"status": "returned"}).eq("id", req.loan_id).execute()

        # 3. Mark the book as available again
        if book_id:
            db.table("books").update({"is_available": True}).eq("id", book_id).execute()

        return {"message": "Book returned successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        print("Return book error:", e)
        raise HTTPException(status_code=500, detail=str(e))


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
    try:
        query = db.table("books").select("*")
        if title:
            query = query.ilike("title", f"%{title}%")
        if author:
            query = query.ilike("author", f"%{author}%")
        res = query.execute()
        return res.data
    except Exception as e:
        print("Error fetching books:", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/books/checkout")
def checkout_book(req: BookCheckoutRequest, db=Depends(get_db)):
    try:
        book = db.table("books").select("*").eq("id", req.book_id).execute()
        if not book.data or not book.data[0].get("is_available", True):
            raise HTTPException(status_code=400, detail="Book is not available for checkout.")

        due_date = datetime.now(timezone.utc) + timedelta(days=14)

        res = db.table("book_loans").insert({
            "user_id": req.user_id,
            "book_id": req.book_id,
            "due_date": due_date.isoformat(),
            "status": "checked_out"
        }).execute()

        db.table("books").update({"is_available": False}).eq("id", req.book_id).execute()

        return {"message": "Book checked out successfully", "due_date": due_date, "data": res.data}
    except HTTPException as he:
        raise he
    except Exception as e:
        print("Checkout error:", e)
        raise HTTPException(status_code=400, detail=str(e))


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


# --- 3. User Dashboard Activity ---
@app.get("/api/users/{user_id}/activity")
def get_user_activity(user_id: str, db=Depends(get_db)):
    try:
        uuid.UUID(str(user_id))
    except (ValueError, TypeError, AttributeError):
        return {
            "book_loans": [],
            "room_reservations": []
        }
    try:
        books = db.table("book_loans").select("*, books(*)").eq("user_id", user_id).execute()
        rooms = db.table("room_reservations").select("*, study_rooms(*)").eq("user_id", user_id).execute()

        return {
            "book_loans": books.data,
            "room_reservations": rooms.data
        }
    except Exception as e:
        print("User activity error:", e)
        raise HTTPException(status_code=500, detail=str(e))


# --- Cancel Study Room Reservation ---
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
