from datetime import datetime, timedelta, timezone
from auth import get_current_user_id
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import get_db

router = APIRouter(tags=["books"])

class BookCheckoutRequest(BaseModel):
    book_id: str

class BookReturnRequest(BaseModel):
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
def checkout_book(
    req: BookCheckoutRequest,
    current_user_id: str = Depends(get_current_user_id),
    db=Depends(get_db)
):
    try:
        book = db.table("books").select("*").eq("id", req.book_id).execute()
        if not book.data or not book.data[0].get("is_available", True):
            raise HTTPException(status_code=400, detail="Book is not available for checkout.")

        due_date = datetime.now(timezone.utc) + timedelta(days=14)

        res = db.table("book_loans").insert({
            "user_id": current_user_id,
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
def return_book(
    req: BookReturnRequest,
    current_user_id: str = Depends(get_current_user_id),
    db=Depends(get_db)
):
    try:
        loan = (
            db.table("book_loans")
            .select("book_id")
            .eq("id", req.loan_id)
            .eq("user_id", current_user_id)
            .eq("status", "checked_out")
            .execute()
        )

        if not loan.data:
            raise HTTPException(status_code=404, detail="Active loan not found")

        updated = (
            db.table("book_loans")
            .update({"status": "returned"})
            .eq("id", req.loan_id)
            .eq("user_id", current_user_id)
            .eq("status", "checked_out")
            .select("id")
            .execute()
        )

        if not updated.data:
            raise HTTPException(status_code=409, detail="Loan was already returned.")

        book_id = loan.data[0]["book_id"]
        if book_id:
            db.table("books").update({"is_available": True}).eq("id", book_id).execute()

        return {"message": "Book returned successfully"}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Could not return books.") from exc
