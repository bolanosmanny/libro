#use only for API endpoints everything else make a router
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=
    [
        "http://localhost:3000", "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello World"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/books/test")
def test_books():
    api_key = os.getenv("GOOGLE_BOOKS_API_KEY")

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

    return { 
        "status": "ok",
        "message": "Connected to Google Books API successfully",
        "book": {
            "title": book.get("title"),
            "authors": book.get("authors", []),
        },
    }

        
