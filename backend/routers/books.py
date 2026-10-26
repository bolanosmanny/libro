import os
import httpx
from fastapi import APIRouter, HTTPException
from backend.database import supabase #import client instance from database.py

router = APIRouter(prefix="/api/books", tags=["books"])

# tests if book info can be retrieved from Google Books API key
@router.post("/pop_test")
def test_pop_books():
    api_key: str = os.getenv("GOOGLE_BOOKS_API_KEY", "")

    if not api_key:
        raise HTTPException(
            status_code = 500,
            detail="GOOGLE_BOOKS_API_KEY is missing from .env file"
        )

    try:
        response = httpx.get(
            "https://www.googleapis.com/books/v1/volumes",
            params = {
                "q": "harry potter",
                "key": api_key,
                "maxResults": 1
            },
            timeout=10.0
        )
        response.raise_for_status()
    except httpx.RequestError as error:
        raise HTTPException(
            status_code = 502,
            detail="Could not reach Google Books API"
        ) from error 

    item = response.json()["items"][0]
    book = item["volumeInfo"]

    try:
        # parse book data and insert into Supabase table
        # (book availability set to true by default currently)
        db_response = supabase.table("books").insert({
            "title": book.get("title"),
            "authors": book.get("authors", []),
            "description": book.get("description", ""),
            "isbn": book.get("isbn"),
            "is_available": True
        }).execute()
    except Exception as error:
        raise HTTPException(
            status_code = 502,
            detail ="Book database insertion failed"
        ) from error
    
    return { 
        "status": "ok",
        "message": "Book fetched and updated to Book Table in Supabase successfully",
        "response_data": db_response.data
    }