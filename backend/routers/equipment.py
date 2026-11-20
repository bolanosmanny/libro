import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["equipment"])


class EquipmentItem(BaseModel):
    id: str
    name: str
    location: str
    total_count: int
    available_count: int


@router.get("/api/equipment", response_model=list[EquipmentItem])
def list_equipment(db=Depends(get_db)):
    try:
        result = (
            db.table("equipment_inventory")
            .select("id, name, location, total_count, available_count")
            .order("name")
            .order("location")
            .execute()
        )
    except Exception as exc:
        logger.exception("Could not load equipment inventory")
        raise HTTPException(
            status_code=503,
            detail="Equipment inventory is temporarily unavailable.",
        ) from exc

    return result.data
