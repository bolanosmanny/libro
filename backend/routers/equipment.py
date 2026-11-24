import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from postgrest.exceptions import APIError
from pydantic import BaseModel

from auth import get_current_user_id
from database import get_admin_db, get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["equipment"])


class EquipmentItem(BaseModel):
    id: str
    name: str
    location: str
    total_count: int
    available_count: int


class EquipmentCheckoutRequest(BaseModel):
    equipment_id: UUID


class EquipmentReturnRequest(BaseModel):
    loan_id: UUID


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
        return result.data
    except Exception as exc:
        logger.exception("Could not load equipment inventory")
        raise HTTPException(
            status_code=503,
            detail="Equipment inventory is temporarily unavailable.",
        ) from exc


@router.post("/api/equipment/checkout")
def checkout_equipment(
    req: EquipmentCheckoutRequest,
    current_user_id: str = Depends(get_current_user_id),
    db=Depends(get_admin_db),
):
    try:
        result = db.rpc(
            "checkout_equipment",
            {
                "p_user_id": current_user_id,
                "p_equipment_id": str(req.equipment_id),
            },
        ).execute()
        return {
            "message": "Equipment checked out successfully.",
            "loan_id": result.data,
        }
    except APIError as exc:
        if exc.code in ("P0001", "23505"):
            raise HTTPException(
                status_code=409,
                detail=exc.message or "Equipment is unavailable.",
            ) from exc
        if exc.code == "P0002":
            raise HTTPException(
                status_code=404,
                detail="Equipment item not found.",
            ) from exc
        if exc.code == "22023":
            raise HTTPException(
                status_code=422,
                detail="Choose a valid equipment item.",
            ) from exc
        logger.exception("Equipment checkout failed")
        raise HTTPException(
            status_code=503,
            detail="Could not check out equipment.",
        ) from exc


@router.post("/api/equipment/return")
def return_equipment(
    req: EquipmentReturnRequest,
    current_user_id: str = Depends(get_current_user_id),
    db=Depends(get_admin_db),
):
    try:
        result = db.rpc(
            "return_equipment",
            {
                "p_user_id": current_user_id,
                "p_loan_id": str(req.loan_id),
            },
        ).execute()
        return {
            "message": "Equipment returned successfully.",
            "loan_id": result.data,
        }
    except APIError as exc:
        if exc.code == "P0002":
            raise HTTPException(
                status_code=404,
                detail="Active equipment loan not found.",
            ) from exc
        if exc.code == "P0001":
            raise HTTPException(
                status_code=409,
                detail="Equipment inventory count is inconsistent.",
            ) from exc
        if exc.code == "22023":
            raise HTTPException(
                status_code=422,
                detail="Choose a valid equipment loan.",
            ) from exc
        logger.exception("Equipment return failed")
        raise HTTPException(
            status_code=503,
            detail="Could not return equipment.",
        ) from exc