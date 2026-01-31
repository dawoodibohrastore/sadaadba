from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import base64

# Firebase imports
import firebase_admin
from firebase_admin import credentials, storage
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize Firebase Admin SDK
# For production, use a service account JSON file
# For now, we'll use environment variables or a simple config
FIREBASE_CONFIG = {
    "type": "service_account",
    "project_id": "dawoodibohra-instrumental",
    "storage_bucket": "dawoodibohra-instrumental.firebasestorage.app"
}

# Try to initialize Firebase if credentials are available
firebase_initialized = False
firebase_bucket = None

try:
    # Check if already initialized
    if not firebase_admin._apps:
        # For demo, we'll use default credentials or skip
        # In production, use: cred = credentials.Certificate('path/to/serviceAccount.json')
        # firebase_admin.initialize_app(cred, {'storageBucket': 'dawoodibohra-instrumental.firebasestorage.app'})
        pass
except Exception as e:
    logging.warning(f"Firebase initialization skipped: {e}")

# Create the main app without a prefix
app = FastAPI(title="Sadaa Instrumentals API", version="2.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class Instrumental(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    mood: str  # Calm, Drums, Spiritual, Soft, Energetic
    duration: int  # in seconds
    duration_formatted: str  # e.g., "3:45"
    is_premium: bool = False
    is_featured: bool = False
    audio_url: Optional[str] = None  # Firebase Storage URL
    thumbnail_color: str = "#4A3463"  # Gradient color for card
    file_size: int = 0  # in bytes
    created_at: datetime = Field(default_factory=datetime.utcnow)

class InstrumentalCreate(BaseModel):
    title: str
    mood: str
    duration: int
    duration_formatted: str
    is_premium: bool = False
    is_featured: bool = False
    audio_url: Optional[str] = None
    thumbnail_color: str = "#4A3463"
    file_size: int = 0

class InstrumentalUpdate(BaseModel):
    title: Optional[str] = None
    mood: Optional[str] = None
    duration: Optional[int] = None
    duration_formatted: Optional[str] = None
    is_premium: Optional[bool] = None
    is_featured: Optional[bool] = None
    audio_url: Optional[str] = None
    thumbnail_color: Optional[str] = None
    file_size: Optional[int] = None

class Subscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    is_active: bool = True
    plan: str = "monthly"  # monthly or yearly
    price: float = 53.0  # INR
    subscribed_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None

class SubscriptionCreate(BaseModel):
    user_id: str
    plan: str = "monthly"

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    is_subscribed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    device_id: str


# Sample instrumental data with placeholder audio URLs
# Using royalty-free audio from various sources
SAMPLE_INSTRUMENTALS = [
    # Featured Instrumentals
    {"title": "Mawla Ya Salli - Peaceful", "mood": "Spiritual", "duration": 245, "duration_formatted": "4:05", "is_premium": False, "is_featured": True, "thumbnail_color": "#4A3463", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", "file_size": 4500000},
    {"title": "Nasheed of Dawn", "mood": "Calm", "duration": 312, "duration_formatted": "5:12", "is_premium": True, "is_featured": True, "thumbnail_color": "#2D5A4A", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", "file_size": 5200000},
    
    # Free Instrumentals
    {"title": "Morning Dhikr", "mood": "Calm", "duration": 180, "duration_formatted": "3:00", "is_premium": False, "is_featured": False, "thumbnail_color": "#5A4A63", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", "file_size": 3200000},
    {"title": "Peaceful Heart", "mood": "Soft", "duration": 210, "duration_formatted": "3:30", "is_premium": False, "is_featured": False, "thumbnail_color": "#4A5A63", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", "file_size": 3800000},
    {"title": "Blessed Sunrise", "mood": "Spiritual", "duration": 195, "duration_formatted": "3:15", "is_premium": False, "is_featured": False, "thumbnail_color": "#634A5A", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", "file_size": 3500000},
    {"title": "Gentle Breeze", "mood": "Calm", "duration": 240, "duration_formatted": "4:00", "is_premium": False, "is_featured": False, "thumbnail_color": "#4A6357", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", "file_size": 4200000},
    {"title": "Silent Prayer", "mood": "Soft", "duration": 165, "duration_formatted": "2:45", "is_premium": False, "is_featured": False, "thumbnail_color": "#574A63", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", "file_size": 2900000},
    
    # Premium Instrumentals
    {"title": "Ya Sahib al-Taj", "mood": "Spiritual", "duration": 420, "duration_formatted": "7:00", "is_premium": True, "is_featured": False, "thumbnail_color": "#634A4A", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", "file_size": 7200000},
    {"title": "Drums of Devotion", "mood": "Drums", "duration": 285, "duration_formatted": "4:45", "is_premium": True, "is_featured": False, "thumbnail_color": "#8B5A2B", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3", "file_size": 5000000},
    {"title": "Energetic Praise", "mood": "Energetic", "duration": 198, "duration_formatted": "3:18", "is_premium": True, "is_featured": False, "thumbnail_color": "#6B4A3A", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3", "file_size": 3600000},
    {"title": "Sacred Rhythm", "mood": "Drums", "duration": 330, "duration_formatted": "5:30", "is_premium": True, "is_featured": False, "thumbnail_color": "#4A4A63", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3", "file_size": 5800000},
    {"title": "Night of Peace", "mood": "Calm", "duration": 480, "duration_formatted": "8:00", "is_premium": True, "is_featured": False, "thumbnail_color": "#2A3A4A", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3", "file_size": 8200000},
    {"title": "Joyful Celebration", "mood": "Energetic", "duration": 252, "duration_formatted": "4:12", "is_premium": True, "is_featured": False, "thumbnail_color": "#5A3A4A", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3", "file_size": 4500000},
    {"title": "Soft Meditation", "mood": "Soft", "duration": 360, "duration_formatted": "6:00", "is_premium": True, "is_featured": False, "thumbnail_color": "#3A4A5A", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3", "file_size": 6300000},
    {"title": "Divine Harmony", "mood": "Spiritual", "duration": 390, "duration_formatted": "6:30", "is_premium": True, "is_featured": False, "thumbnail_color": "#4A3A5A", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3", "file_size": 6800000},
]


# Routes
@api_router.get("/")
async def root():
    return {"message": "Sadaa Instrumentals API", "version": "2.0", "features": ["audio_streaming", "offline_download", "subscription"]}


# Seed database endpoint
@api_router.post("/seed")
async def seed_database():
    """Seed the database with sample instrumentals including audio URLs"""
    # Clear existing instrumentals
    await db.instrumentals.delete_many({})
    
    # Insert sample data
    for item in SAMPLE_INSTRUMENTALS:
        instrumental = Instrumental(**item)
        await db.instrumentals.insert_one(instrumental.dict())
    
    return {"message": f"Seeded {len(SAMPLE_INSTRUMENTALS)} instrumentals with audio URLs"}


# Instrumental endpoints
@api_router.get("/instrumentals", response_model=List[Instrumental])
async def get_instrumentals(
    mood: Optional[str] = None,
    is_premium: Optional[bool] = None,
    search: Optional[str] = None
):
    """Get all instrumentals with optional filters"""
    query = {}
    
    if mood and mood != "All":
        query["mood"] = mood
    
    if is_premium is not None:
        query["is_premium"] = is_premium
    
    if search:
        query["title"] = {"$regex": search, "$options": "i"}
    
    instrumentals = await db.instrumentals.find(query).to_list(100)
    return [Instrumental(**i) for i in instrumentals]


@api_router.get("/instrumentals/featured", response_model=List[Instrumental])
async def get_featured_instrumentals():
    """Get featured instrumentals for banner"""
    instrumentals = await db.instrumentals.find({"is_featured": True}).to_list(10)
    return [Instrumental(**i) for i in instrumentals]


@api_router.get("/instrumentals/{instrumental_id}", response_model=Instrumental)
async def get_instrumental(instrumental_id: str):
    """Get a single instrumental by ID"""
    instrumental = await db.instrumentals.find_one({"id": instrumental_id})
    if not instrumental:
        raise HTTPException(status_code=404, detail="Instrumental not found")
    return Instrumental(**instrumental)


@api_router.post("/instrumentals", response_model=Instrumental)
async def create_instrumental(data: InstrumentalCreate):
    """Create a new instrumental"""
    instrumental = Instrumental(**data.dict())
    await db.instrumentals.insert_one(instrumental.dict())
    return instrumental


@api_router.put("/instrumentals/{instrumental_id}", response_model=Instrumental)
async def update_instrumental(instrumental_id: str, data: InstrumentalUpdate):
    """Update an instrumental"""
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.instrumentals.update_one(
        {"id": instrumental_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Instrumental not found")
    
    instrumental = await db.instrumentals.find_one({"id": instrumental_id})
    return Instrumental(**instrumental)


@api_router.delete("/instrumentals/{instrumental_id}")
async def delete_instrumental(instrumental_id: str):
    """Delete an instrumental"""
    result = await db.instrumentals.delete_one({"id": instrumental_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Instrumental not found")
    return {"message": "Instrumental deleted successfully"}


# Admin endpoint to update audio URL
@api_router.post("/admin/instrumentals/{instrumental_id}/audio")
async def update_audio_url(
    instrumental_id: str,
    audio_url: str = Form(...),
    file_size: int = Form(0)
):
    """Admin endpoint to update audio URL for an instrumental"""
    result = await db.instrumentals.update_one(
        {"id": instrumental_id},
        {"$set": {"audio_url": audio_url, "file_size": file_size}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Instrumental not found")
    
    return {"message": "Audio URL updated successfully"}


# User endpoints
@api_router.post("/users", response_model=User)
async def create_or_get_user(data: UserCreate):
    """Create a new user or get existing by device_id"""
    existing = await db.users.find_one({"device_id": data.device_id})
    if existing:
        return User(**existing)
    
    user = User(device_id=data.device_id)
    await db.users.insert_one(user.dict())
    return user


@api_router.get("/users/{device_id}", response_model=User)
async def get_user(device_id: str):
    """Get user by device ID"""
    user = await db.users.find_one({"device_id": device_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)


# Subscription endpoints
@api_router.post("/subscription/subscribe", response_model=Subscription)
async def subscribe(data: SubscriptionCreate):
    """Create a subscription for a user"""
    # Check if user already has active subscription
    existing = await db.subscriptions.find_one({
        "user_id": data.user_id,
        "is_active": True
    })
    if existing:
        return Subscription(**existing)
    
    # Calculate expiry based on plan
    if data.plan == "yearly":
        expires_at = datetime.utcnow() + timedelta(days=365)
        price = 499.0
    else:
        expires_at = datetime.utcnow() + timedelta(days=30)
        price = 53.0
    
    subscription = Subscription(
        user_id=data.user_id,
        plan=data.plan,
        price=price,
        expires_at=expires_at
    )
    await db.subscriptions.insert_one(subscription.dict())
    
    # Update user's subscription status
    await db.users.update_one(
        {"id": data.user_id},
        {"$set": {"is_subscribed": True}}
    )
    
    return subscription


@api_router.get("/subscription/status/{user_id}")
async def get_subscription_status(user_id: str):
    """Check subscription status for a user"""
    subscription = await db.subscriptions.find_one({
        "user_id": user_id,
        "is_active": True
    })
    
    if not subscription:
        return {
            "is_subscribed": False,
            "subscription": None
        }
    
    # Check if subscription has expired
    sub = Subscription(**subscription)
    if sub.expires_at and sub.expires_at < datetime.utcnow():
        # Mark as inactive
        await db.subscriptions.update_one(
            {"id": sub.id},
            {"$set": {"is_active": False}}
        )
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"is_subscribed": False}}
        )
        return {
            "is_subscribed": False,
            "subscription": None
        }
    
    return {
        "is_subscribed": True,
        "subscription": sub
    }


@api_router.post("/subscription/restore/{user_id}")
async def restore_purchase(user_id: str):
    """Restore purchase for a user"""
    subscription = await db.subscriptions.find_one({
        "user_id": user_id,
        "is_active": True
    })
    
    if subscription:
        return {
            "restored": True,
            "subscription": Subscription(**subscription)
        }
    
    return {
        "restored": False,
        "message": "No active subscription found to restore"
    }


@api_router.post("/subscription/cancel/{user_id}")
async def cancel_subscription(user_id: str):
    """Cancel subscription for a user"""
    result = await db.subscriptions.update_many(
        {"user_id": user_id, "is_active": True},
        {"$set": {"is_active": False}}
    )
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_subscribed": False}}
    )
    
    return {"message": "Subscription cancelled", "cancelled": result.modified_count > 0}


# Moods endpoint
@api_router.get("/moods")
async def get_moods():
    """Get all available moods"""
    return {
        "moods": ["All", "Calm", "Drums", "Spiritual", "Soft", "Energetic"]
    }


# Stats endpoint for admin
@api_router.get("/admin/stats")
async def get_stats():
    """Get app statistics"""
    total_instrumentals = await db.instrumentals.count_documents({})
    premium_instrumentals = await db.instrumentals.count_documents({"is_premium": True})
    free_instrumentals = await db.instrumentals.count_documents({"is_premium": False})
    total_users = await db.users.count_documents({})
    active_subscriptions = await db.subscriptions.count_documents({"is_active": True})
    
    return {
        "total_instrumentals": total_instrumentals,
        "premium_instrumentals": premium_instrumentals,
        "free_instrumentals": free_instrumentals,
        "total_users": total_users,
        "active_subscriptions": active_subscriptions
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
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
