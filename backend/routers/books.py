from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import get_db

router = APIRouter(tags=["books"])

class BookCheckoutRequest(BaseModel):
    user_id: str
    book_id: str

class BookReturnRequest(BaseModel):
    user_id: str
    loan_id: str

@router.get("/api/books")
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

@router.post("/api/books/checkout")
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

@router.post("/api/books/return")
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
