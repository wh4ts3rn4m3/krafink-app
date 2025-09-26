from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Union
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-this')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_TIME = timedelta(days=7)

security = HTTPBearer()

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
    bio: Optional[str] = None
    links: Optional[List[str]] = []
    followers_count: int = 0
    following_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserProfile(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    links: Optional[List[str]] = None

class PostCreate(BaseModel):
    content: str
    images: Optional[List[str]] = []
    visibility: str = "public"  # public, private, followers

class Post(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    author_id: str
    content: str
    images: List[str] = []
    visibility: str = "public"
    likes_count: int = 0
    comments_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommentCreate(BaseModel):
    content: str

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    post_id: str
    author_id: str
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Follow(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    follower_id: str
    following_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Like(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    post_id: str
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
    return item

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

# User Routes
@api_router.get("/users/{username}", response_model=User)
async def get_user_by_username(username: str):
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

# Post Routes
@api_router.post("/posts", response_model=Post)
async def create_post(post_data: PostCreate, current_user: User = Depends(get_current_user)):
    post = Post(author_id=current_user.id, **post_data.dict())
    post_doc = prepare_for_mongo(post.dict())
    
    await db.posts.insert_one(post_doc)
    return post

@api_router.get("/posts/feed", response_model=List[dict])
async def get_feed(current_user: User = Depends(get_current_user), limit: int = 20, skip: int = 0):
    # Get posts from followed users + own posts
    following_docs = await db.follows.find({"follower_id": current_user.id}).to_list(None)
    following_ids = [doc["following_id"] for doc in following_docs]
    following_ids.append(current_user.id)  # Include own posts
    
    posts_cursor = db.posts.find({
        "author_id": {"$in": following_ids},
        "visibility": {"$in": ["public", "followers"]}
    }).sort("created_at", -1).skip(skip).limit(limit)
    
    posts = await posts_cursor.to_list(None)
    
    # Get author info and engagement counts for each post
    enriched_posts = []
    for post_doc in posts:
        post_doc = parse_from_mongo(post_doc)
        
        # Get author info
        author_doc = await db.users.find_one({"id": post_doc["author_id"]})
        if author_doc:
            author_doc = parse_from_mongo(author_doc)
            author = User(**{k: v for k, v in author_doc.items() if k != 'password'})
        
        # Check if current user liked this post
        user_liked = await db.likes.find_one({
            "user_id": current_user.id,
            "post_id": post_doc["id"]
        }) is not None
        
        post = Post(**post_doc)
        enriched_posts.append({
            "post": post.dict(),
            "author": author.dict() if author_doc else None,
            "user_liked": user_liked
        })
    
    return enriched_posts

@api_router.get("/posts/{post_id}/comments", response_model=List[dict])
async def get_post_comments(post_id: str):
    comments_cursor = db.comments.find({"post_id": post_id}).sort("created_at", 1)
    comments = await comments_cursor.to_list(None)
    
    enriched_comments = []
    for comment_doc in comments:
        comment_doc = parse_from_mongo(comment_doc)
        comment = Comment(**comment_doc)
        
        # Get author info
        author_doc = await db.users.find_one({"id": comment.author_id})
        if author_doc:
            author_doc = parse_from_mongo(author_doc)
            author = User(**{k: v for k, v in author_doc.items() if k != 'password'})
            
            enriched_comments.append({
                "comment": comment.dict(),
                "author": author.dict()
            })
    
    return enriched_comments

@api_router.post("/posts/{post_id}/comments", response_model=Comment)
async def create_comment(post_id: str, comment_data: CommentCreate, current_user: User = Depends(get_current_user)):
    # Check if post exists
    post_doc = await db.posts.find_one({"id": post_id})
    if not post_doc:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comment = Comment(post_id=post_id, author_id=current_user.id, **comment_data.dict())
    comment_doc = prepare_for_mongo(comment.dict())
    
    await db.comments.insert_one(comment_doc)
    
    # Update post comments count
    await db.posts.update_one(
        {"id": post_id},
        {"$inc": {"comments_count": 1}}
    )
    
    return comment

# Like Routes
@api_router.post("/posts/{post_id}/like")
async def toggle_like(post_id: str, current_user: User = Depends(get_current_user)):
    # Check if post exists
    post_doc = await db.posts.find_one({"id": post_id})
    if not post_doc:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if already liked
    existing_like = await db.likes.find_one({
        "user_id": current_user.id,
        "post_id": post_id
    })
    
    if existing_like:
        # Unlike
        await db.likes.delete_one({"id": existing_like["id"]})
        await db.posts.update_one(
            {"id": post_id},
            {"$inc": {"likes_count": -1}}
        )
        return {"liked": False}
    else:
        # Like
        like = Like(user_id=current_user.id, post_id=post_id)
        like_doc = prepare_for_mongo(like.dict())
        await db.likes.insert_one(like_doc)
        await db.posts.update_one(
            {"id": post_id},
            {"$inc": {"likes_count": 1}}
        )
        return {"liked": True}

# Follow Routes
@api_router.post("/users/{username}/follow")
async def toggle_follow(username: str, current_user: User = Depends(get_current_user)):
    # Get target user
    target_user_doc = await db.users.find_one({"username": username})
    if not target_user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    target_user_id = target_user_doc["id"]
    
    if target_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    # Check if already following
    existing_follow = await db.follows.find_one({
        "follower_id": current_user.id,
        "following_id": target_user_id
    })
    
    if existing_follow:
        # Unfollow
        await db.follows.delete_one({"id": existing_follow["id"]})
        
        # Update counts
        await db.users.update_one(
            {"id": current_user.id},
            {"$inc": {"following_count": -1}}
        )
        await db.users.update_one(
            {"id": target_user_id},
            {"$inc": {"followers_count": -1}}
        )
        return {"following": False}
    else:
        # Follow
        follow = Follow(follower_id=current_user.id, following_id=target_user_id)
        follow_doc = prepare_for_mongo(follow.dict())
        await db.follows.insert_one(follow_doc)
        
        # Update counts
        await db.users.update_one(
            {"id": current_user.id},
            {"$inc": {"following_count": 1}}
        )
        await db.users.update_one(
            {"id": target_user_id},
            {"$inc": {"followers_count": 1}}
        )
        return {"following": True}

# Search Routes
@api_router.get("/search/users", response_model=List[User])
async def search_users(q: str, limit: int = 10):
    if not q or len(q.strip()) < 2:
        return []
    
    # Search by username or name
    users_cursor = db.users.find({
        "$or": [
            {"username": {"$regex": q, "$options": "i"}},
            {"name": {"$regex": q, "$options": "i"}}
        ]
    }).limit(limit)
    
    users = await users_cursor.to_list(None)
    
    return [User(**{k: v for k, v in parse_from_mongo(user_doc).items() if k != 'password'}) for user_doc in users]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()