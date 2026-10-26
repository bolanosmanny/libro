import os
import httpx
from fastapi import APIRouter, HTTPException
from backend.database import supabase #import client instance from database.py

router = APIRouter(prefix="/api/books", tags=["books"])
