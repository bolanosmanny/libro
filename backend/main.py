import sys
import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import users, books, rooms

# Ensure backend directory is in Python module search path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load .env directly from the backend folder
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

app = FastAPI(title="Libro API")
app.include_router(users.router)
app.include_router(books.router)
app.include_router(rooms.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
def read_root():
    return {"message": "Libro API Active"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
