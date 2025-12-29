# api/chat.py
from fastapi import APIRouter, Depends, Request
from auth.jwt import get_current_user
from graph.router import run_router

router = APIRouter()


@router.post("/chat")
async def chat(request: Request, user=Depends(get_current_user)):
    body = await request.json()
    message = body.get("message", "")
    return await run_router(message=message, user=user)
