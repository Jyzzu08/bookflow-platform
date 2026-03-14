from datetime import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from pymongo import MongoClient
import os

app = FastAPI(title="BookFlow Comments", version="1.0.0")

mongo_url = os.getenv("MONGO_URL", "mongodb://mongo:27017")
mongo_db = os.getenv("MONGO_DB", "bookflow_comments")

client = MongoClient(mongo_url)
db = client[mongo_db]
collection = db["comments"]

class CommentIn(BaseModel):
    user_id: str = Field(min_length=1)
    book_id: str = Field(min_length=1)
    text: str = Field(min_length=1, max_length=500)

@app.get('/health')
def health():
    return {"service": "comments", "status": "ok"}

@app.get('/v2/comments')
def get_comments(book_id: str | None = None):
    query = {"book_id": book_id} if book_id else {}
    docs = []
    for doc in collection.find(query).sort("created_at", -1).limit(200):
        docs.append({
            "id": str(doc.get("_id")),
            "userId": doc.get("user_id"),
            "bookId": doc.get("book_id"),
            "text": doc.get("text"),
            "createdAt": doc.get("created_at")
        })
    return {"items": docs}

@app.post('/v2/comments', status_code=201)
def create_comment(payload: CommentIn):
    doc = {
        "user_id": payload.user_id,
        "book_id": payload.book_id,
        "text": payload.text,
        "created_at": datetime.utcnow().isoformat()
    }
    result = collection.insert_one(doc)
    if not result.inserted_id:
        raise HTTPException(status_code=500, detail="comment_not_created")

    return {
        "id": str(result.inserted_id),
        "userId": payload.user_id,
        "bookId": payload.book_id,
        "text": payload.text,
        "createdAt": doc["created_at"]
    }
