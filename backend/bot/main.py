# main.py
from fastapi import FastAPI
from api.chat import router as chat_router
from api.health import router as health_router
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware


load_dotenv()


app = FastAPI(title="Farmer Bot", version="1.0.0")

# register routes

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(chat_router)
app.include_router(health_router)


@app.get("/")
def root():
    return {"message": "Farmer Bot is running"}
