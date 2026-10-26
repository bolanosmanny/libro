import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Load .env directly from the backend folder
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY or SUPABASE_KEY == "your-supabase-anon-or-service-role-key":
    raise ValueError(
        "Missing or placeholder SUPABASE_URL/SUPABASE_KEY in backend/.env file."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_db() -> Client:
    return supabase