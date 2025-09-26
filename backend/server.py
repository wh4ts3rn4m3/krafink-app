from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Depends, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Union, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import base64
import socketio
import asyncio
import json
from PIL import Image
import io
import aiofiles

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Socket.IO setup
sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    logger=True,
    engineio_logger=True
)

# Create the main app
app = FastAPI()
socket_app = socketio.ASGIApp(sio, app)

# Create upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Serve static files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-this')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_TIME = timedelta(days=7)

security = HTTPBearer()

# WebSocket connections store
connections: Dict[str, WebSocket] = {}
user_status: Dict[str, Dict] = {}  # user_id -> {status: online/offline, last_seen: datetime}

# Pydantic Models
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    username: str
    name: str
    avatar: Optional[str] = None
    banner: Optional[str] = None
    bio: Optional[str] = None
    links: Optional[List[str]] = []
    followers_count: int = 0
    following_count: int = 0
    is_private: bool = False
    is_blocked: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserProfile(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    links: Optional[List[str]] = None
    is_private: Optional[bool] = None

class PostCreate(BaseModel):
    content: str
    images: Optional[List[str]] = []
    visibility: str = "public"  # public, followers
    hashtags: Optional[List[str]] = []
    mentions: Optional[List[str]] = []

class Post(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    author_id: str
    content: str
    images: List[str] = []
    visibility: str = "public"
    hashtags: List[str] = []
    mentions: List[str] = []
    likes_count: int = 0
    comments_count: int = 0
    saves_count: int = 0
    shares_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[str] = None

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    post_id: str
    author_id: str
    parent_id: Optional[str] = None
    content: str
    likes_count: int = 0
    replies_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageCreate(BaseModel):
    receiver_id: str
    content: str
    message_type: str = "text"  # text, image, file

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    sender_id: str
    receiver_id: str
    content: str
    message_type: str = "text"
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Conversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    participants: List[str]
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: Dict[str, int] = {}  # user_id -> unread count
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationCreate(BaseModel):
    user_id: str
    type: str  # like, comment, follow, message
    from_user_id: str
    post_id: Optional[str] = None
    comment_id: Optional[str] = None
    message: str

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str
    from_user_id: str
    post_id: Optional[str] = None
    comment_id: Optional[str] = None
    message: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Follow(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    follower_id: str
    following_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Like(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    target_id: str  # post_id or comment_id
    target_type: str  # post or comment
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Save(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    post_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Block(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    blocker_id: str
    blocked_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Report(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reporter_id: str
    target_id: str
    target_type: str  # user, post, comment
    reason: str
    description: Optional[str] = None
    status: str = "pending"  # pending, reviewed, resolved
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + JWT_EXPIRATION_TIME
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_doc = await db.users.find_one({"id": user_id})
        if not user_doc:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**user_doc)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def prepare_for_mongo(data):
    """Convert datetime objects to ISO strings for MongoDB storage"""
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
            elif isinstance(value, dict):
                prepare_for_mongo(value)
            elif isinstance(value, list) and value and isinstance(value[0], dict):
                for item in value:
                    prepare_for_mongo(item)
    return data

def parse_from_mongo(item):
    """Convert ISO strings back to datetime objects"""
    if isinstance(item, dict):
        for key, value in item.items():
            if isinstance(value, str) and key.endswith('_at'):
                try:
                    item[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except:
                    pass
            elif isinstance(value, dict):
                parse_from_mongo(value)
            elif isinstance(value, list) and value and isinstance(value[0], dict):
                for sub_item in value:
                    parse_from_mongo(sub_item)
    return item

async def create_notification(user_id: str, type: str, from_user_id: str, message: str, 
                            post_id: Optional[str] = None, comment_id: Optional[str] = None):
    """Create and emit a notification"""
    notification = Notification(
        user_id=user_id,
        type=type,
        from_user_id=from_user_id,
        post_id=post_id,
        comment_id=comment_id,
        message=message
    )
    
    # Save to database
    notification_doc = prepare_for_mongo(notification.dict())
    await db.notifications.insert_one(notification_doc)
    
    # Get sender info
    sender_doc = await db.users.find_one({"id": from_user_id})
    sender = User(**parse_from_mongo(sender_doc)) if sender_doc else None
    
    # Emit real-time notification
    await sio.emit('notification', {
        'notification': notification.dict(),
        'sender': sender.dict() if sender else None
    }, room=f"user_{user_id}")
    
    return notification

async def process_image(file: UploadFile) -> str:
    """Process and save uploaded image"""
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate unique filename
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    # Read and process image
    contents = await file.read()
    
    try:
        with Image.open(io.BytesIO(contents)) as img:
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            # Resize if too large (max 2048x2048)
            max_size = (2048, 2048)
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Save with compression
            img.save(file_path, 'JPEG', quality=85, optimize=True)
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")
    
    return f"/uploads/{filename}"

# WebSocket Events
@sio.event
async def connect(sid, environ):
    print(f"Client {sid} connected")

@sio.event
async def disconnect(sid):
    print(f"Client {sid} disconnected")
    # Remove from connections and update status
    for user_id, ws in connections.items():
        if ws == sid:
            del connections[user_id]
            user_status[user_id] = {
                "status": "offline",
                "last_seen": datetime.now(timezone.utc)
            }
            # Broadcast status update
            await sio.emit('user_status', {
                'user_id': user_id,
                'status': 'offline',
                'last_seen': user_status[user_id]['last_seen'].isoformat()
            })
            break

@sio.event
async def join_user(sid, data):
    """Join user to their personal room"""
    user_id = data.get('user_id')
    if user_id:
        await sio.enter_room(sid, f"user_{user_id}")
        connections[user_id] = sid
        user_status[user_id] = {
            "status": "online",
            "last_seen": datetime.now(timezone.utc)
        }
        # Broadcast status update
        await sio.emit('user_status', {
            'user_id': user_id,
            'status': 'online'
        })

@sio.event
async def send_message(sid, data):
    """Handle real-time message sending"""
    try:
        conversation_id = data['conversation_id']
        sender_id = data['sender_id']
        content = data['content']
        
        # Update conversation
        await db.conversations.update_one(
            {"id": conversation_id},
            {
                "$set": {
                    "last_message": content,
                    "last_message_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Emit to conversation participants
        await sio.emit('message_received', data, room=f"conversation_{conversation_id}")
        
    except Exception as e:
        print(f"Error sending message: {e}")

@sio.event
async def typing_start(sid, data):
    """Handle typing indicator start"""
    await sio.emit('typing_start', data, room=f"conversation_{data['conversation_id']}")

@sio.event
async def typing_stop(sid, data):
    """Handle typing indicator stop"""
    await sio.emit('typing_stop', data, room=f"conversation_{data['conversation_id']}")

@sio.event
async def mark_messages_read(sid, data):
    """Mark messages as read"""
    conversation_id = data['conversation_id']
    user_id = data['user_id']
    
    # Update messages as read
    await db.messages.update_many(
        {"conversation_id": conversation_id, "receiver_id": user_id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    # Update conversation unread count
    await db.conversations.update_one(
        {"id": conversation_id},
        {"$set": {f"unread_count.{user_id}": 0}}
    )
    
    # Emit read receipt
    await sio.emit('messages_read', data, room=f"conversation_{conversation_id}")

# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({
        "$or": [
            {"email": user_data.email},
            {"username": user_data.username}
        ]
    })
    
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create new user
    hashed_password = hash_password(user_data.password)
    user_dict = user_data.dict()
    user_dict.pop('password')
    user = User(**user_dict)
    
    user_doc = prepare_for_mongo(user.dict())
    user_doc['password'] = hashed_password
    
    await db.users.insert_one(user_doc)
    
    # Create access token
    token = create_access_token(user.id)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user.dict()
    }

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    # Find user by email
    user_doc = await db.users.find_one({"email": user_data.email})
    if not user_doc:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(user_data.password, user_doc['password']):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    # Create access token
    user_doc = parse_from_mongo(user_doc)
    user = User(**{k: v for k, v in user_doc.items() if k != 'password'})
    token = create_access_token(user.id)
    
    return {
        "access_token": token,
        "token_type": "bearer", 
        "user": user.dict()
    }

@api_router.get("/auth/me", response_model=User)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user

# Image Upload Route
@api_router.post("/upload/image")
async def upload_image(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    try:
        image_url = await process_image(file)
        return {"url": image_url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# User Routes
@api_router.get("/users/{username}", response_model=User)
async def get_user_by_username(username: str, current_user: User = Depends(get_current_user)):
    user_doc = await db.users.find_one({"username": username})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_doc = parse_from_mongo(user_doc)
    return User(**{k: v for k, v in user_doc.items() if k != 'password'})

@api_router.put("/users/profile", response_model=User)
async def update_profile(profile_data: UserProfile, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in profile_data.dict().items() if v is not None}
    
    if update_data:
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": update_data}
        )
    
    updated_user_doc = await db.users.find_one({"id": current_user.id})
    updated_user_doc = parse_from_mongo(updated_user_doc)
    return User(**{k: v for k, v in updated_user_doc.items() if k != 'password'})

@api_router.get("/users/{user_id}/followers")
async def get_followers(user_id: str, current_user: User = Depends(get_current_user), limit: int = 20, skip: int = 0):
    follows_cursor = db.follows.find({"following_id": user_id}).skip(skip).limit(limit)
    follows = await follows_cursor.to_list(None)
    
    followers = []
    for follow in follows:
        user_doc = await db.users.find_one({"id": follow["follower_id"]})
        if user_doc:
            user_doc = parse_from_mongo(user_doc)
            followers.append(User(**{k: v for k, v in user_doc.items() if k != 'password'}))
    
    return followers

@api_router.get("/users/{user_id}/following")
async def get_following(user_id: str, current_user: User = Depends(get_current_user), limit: int = 20, skip: int = 0):
    follows_cursor = db.follows.find({"follower_id": user_id}).skip(skip).limit(limit)
    follows = await follows_cursor.to_list(None)
    
    following = []
    for follow in follows:
        user_doc = await db.users.find_one({"id": follow["following_id"]})
        if user_doc:
            user_doc = parse_from_mongo(user_doc)
            following.append(User(**{k: v for k, v in user_doc.items() if k != 'password'}))
    
    return following

# Post Routes
@api_router.post("/posts", response_model=Post)
async def create_post(post_data: PostCreate, current_user: User = Depends(get_current_user)):
    post = Post(author_id=current_user.id, **post_data.dict())
    post_doc = prepare_for_mongo(post.dict())
    
    await db.posts.insert_one(post_doc)
    
    # Create notifications for mentions
    for mention in post_data.mentions:
        mentioned_user = await db.users.find_one({"username": mention})
        if mentioned_user:
            await create_notification(
                user_id=mentioned_user["id"],
                type="mention",
                from_user_id=current_user.id,
                message=f"{current_user.name} mentioned you in a post",
                post_id=post.id
            )
    
    return post

@api_router.get("/posts/feed", response_model=List[dict])
async def get_feed(current_user: User = Depends(get_current_user), limit: int = 20, skip: int = 0):
    # Get posts from followed users + own posts
    following_docs = await db.follows.find({"follower_id": current_user.id}).to_list(None)
    following_ids = [doc["following_id"] for doc in following_docs]
    following_ids.append(current_user.id)  # Include own posts
    
    # Check for blocked users
    blocked_docs = await db.blocks.find({"blocker_id": current_user.id}).to_list(None)
    blocked_ids = [doc["blocked_id"] for doc in blocked_docs]
    
    # Filter out blocked users
    following_ids = [uid for uid in following_ids if uid not in blocked_ids]
    
    posts_cursor = db.posts.find({
        "author_id": {"$in": following_ids},
        "visibility": {"$in": ["public", "followers"]}
    }).sort("created_at", -1).skip(skip).limit(limit)
    
    posts = await posts_cursor.to_list(None)
    
    # Get enriched post data
    enriched_posts = []
    for post_doc in posts:
        post_doc = parse_from_mongo(post_doc)
        
        # Get author info
        author_doc = await db.users.find_one({"id": post_doc["author_id"]})
        if author_doc:
            author_doc = parse_from_mongo(author_doc)
            author = User(**{k: v for k, v in author_doc.items() if k != 'password'})
        
        # Check user interactions
        user_liked = await db.likes.find_one({
            "user_id": current_user.id,
            "target_id": post_doc["id"],
            "target_type": "post"
        }) is not None
        
        user_saved = await db.saves.find_one({
            "user_id": current_user.id,
            "post_id": post_doc["id"]
        }) is not None
        
        post = Post(**post_doc)
        enriched_posts.append({
            "post": post.dict(),
            "author": author.dict() if author_doc else None,
            "user_liked": user_liked,
            "user_saved": user_saved
        })
    
    return enriched_posts

@api_router.get("/posts/explore", response_model=List[dict])
async def get_explore_feed(current_user: User = Depends(get_current_user), limit: int = 20, skip: int = 0):
    # Get public posts from all users (excluding blocked)
    blocked_docs = await db.blocks.find({"blocker_id": current_user.id}).to_list(None)
    blocked_ids = [doc["blocked_id"] for doc in blocked_docs]
    
    posts_cursor = db.posts.find({
        "visibility": "public",
        "author_id": {"$nin": blocked_ids}
    }).sort("created_at", -1).skip(skip).limit(limit)
    
    posts = await posts_cursor.to_list(None)
    
    # Get enriched post data (same as feed)
    enriched_posts = []
    for post_doc in posts:
        post_doc = parse_from_mongo(post_doc)
        
        author_doc = await db.users.find_one({"id": post_doc["author_id"]})
        if author_doc:
            author_doc = parse_from_mongo(author_doc)
            author = User(**{k: v for k, v in author_doc.items() if k != 'password'})
        
        user_liked = await db.likes.find_one({
            "user_id": current_user.id,
            "target_id": post_doc["id"],
            "target_type": "post"
        }) is not None
        
        user_saved = await db.saves.find_one({
            "user_id": current_user.id,
            "post_id": post_doc["id"]
        }) is not None
        
        post = Post(**post_doc)
        enriched_posts.append({
            "post": post.dict(),
            "author": author.dict() if author_doc else None,
            "user_liked": user_liked,
            "user_saved": user_saved
        })
    
    return enriched_posts

@api_router.get("/posts/{post_id}")
async def get_post(post_id: str, current_user: User = Depends(get_current_user)):
    post_doc = await db.posts.find_one({"id": post_id})
    if not post_doc:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post_doc = parse_from_mongo(post_doc)
    
    # Get author info
    author_doc = await db.users.find_one({"id": post_doc["author_id"]})
    author = None
    if author_doc:
        author_doc = parse_from_mongo(author_doc)
        author = User(**{k: v for k, v in author_doc.items() if k != 'password'})
    
    # Check user interactions
    user_liked = await db.likes.find_one({
        "user_id": current_user.id,
        "target_id": post_id,
        "target_type": "post"
    }) is not None
    
    user_saved = await db.saves.find_one({
        "user_id": current_user.id,
        "post_id": post_id
    }) is not None
    
    post = Post(**post_doc)
    return {
        "post": post.dict(),
        "author": author.dict() if author else None,
        "user_liked": user_liked,
        "user_saved": user_saved
    }

@api_router.put("/posts/{post_id}")
async def update_post(post_id: str, post_data: PostCreate, current_user: User = Depends(get_current_user)):
    post_doc = await db.posts.find_one({"id": post_id})
    if not post_doc:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post_doc["author_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this post")
    
    update_data = post_data.dict()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.posts.update_one(
        {"id": post_id},
        {"$set": update_data}
    )
    
    updated_post_doc = await db.posts.find_one({"id": post_id})
    updated_post_doc = parse_from_mongo(updated_post_doc)
    return Post(**updated_post_doc)

@api_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, current_user: User = Depends(get_current_user)):
    post_doc = await db.posts.find_one({"id": post_id})
    if not post_doc:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post_doc["author_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")
    
    # Delete related data
    await db.posts.delete_one({"id": post_id})
    await db.comments.delete_many({"post_id": post_id})
    await db.likes.delete_many({"target_id": post_id, "target_type": "post"})
    await db.saves.delete_many({"post_id": post_id})
    
    return {"message": "Post deleted successfully"}

# Continue in next message due to length...