from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase_auth.errors import AuthError, AuthRetryableError

from database import supabase

bearer = HTTPBearer(auto_error=False)

def get_current_user_id(
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> str:
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Log in to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        response = supabase.auth.get_user(credentials.credentials)
    except AuthRetryableError as exc:
        raise HTTPException(
            status_code=503,
            detail="Authentication service is unavailable.",
        ) from exc
    except AuthError as exc:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if response is None or response.user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return response.user.id
