import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import bcrypt
import uuid
import random
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def prepare_for_mongo(data):
    """Convert datetime objects to ISO strings for MongoDB storage"""
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
            elif isinstance(value, dict):
                prepare_for_mongo(value)
    return data

# Demo users data
demo_users = [
    {
        "email": "alice@krafink.art",
        "username": "alice_painter",
        "name": "Alice Chen",
        "bio": "Digital artist and painter 🎨 | Creating colorful worlds | Commissions open",
        "avatar": None,
        "links": ["https://alice-art.com", "https://instagram.com/alice_painter"]
    },
    {
        "email": "bob@krafink.art", 
        "username": "craftsman_bob",
        "name": "Bob Wilson",
        "bio": "Woodworker & craftsman | Handmade furniture | Traditional techniques meets modern design",
        "avatar": None,
        "links": ["https://bobscrafts.com"]
    },
    {
        "email": "clara@krafink.art",
        "username": "clara_ceramics", 
        "name": "Clara Rodriguez",
        "bio": "Ceramic artist | Functional pottery | Teaching workshops in Madrid",
        "avatar": None,
        "links": ["https://clara-ceramics.es"]
    },
    {
        "email": "david@krafink.art",
        "username": "digital_david",
        "name": "David Kim", 
        "bio": "3D artist & animator | Game dev | Blender enthusiast | NFT creator",
        "avatar": None,
        "links": ["https://davidkim.dev", "https://twitter.com/digital_david"]
    },
    {
        "email": "emma@krafink.art",
        "username": "embroidery_emma",
        "name": "Emma Thompson",
        "bio": "Embroidery artist | Contemporary textile art | Sustainable fashion advocate",
        "avatar": None,
        "links": ["https://emmaembroidery.co.uk"]
    },
    {
        "email": "felix@krafink.art",
        "username": "felix_photos",
        "name": "Felix Mueller",
        "bio": "Photographer | Street photography | Art documentation | Based in Berlin",
        "avatar": None,
        "links": ["https://felixmueller.photo"]
    },
    {
        "email": "grace@krafink.art",
        "username": "grace_glass",
        "name": "Grace Liu",
        "bio": "Glass artist | Blown glass sculptures | Teaching at art academy | Commission work available",
        "avatar": None,
        "links": ["https://graceglass.studio"]
    },
    {
        "email": "henry@krafink.art", 
        "username": "jewelry_henry",
        "name": "Henry Adams",
        "bio": "Jewelry designer | Handcrafted silver & gold | Custom engagement rings | 15 years experience",
        "avatar": None,
        "links": ["https://henryadamsjewelry.com"]
    },
    {
        "email": "iris@krafink.art",
        "username": "iris_ink",
        "name": "Iris Wang",
        "bio": "Tattoo artist & illustrator | Fine line tattoos | Comic book art | Booking 2024",
        "avatar": None, 
        "links": ["https://irisink.tattoo"]
    },
    {
        "email": "jack@krafink.art",
        "username": "sculptor_jack",
        "name": "Jack Martinez",
        "bio": "Sculptor | Bronze & marble | Public art installations | Gallery exhibitions worldwide",
        "avatar": None,
        "links": ["https://jackmartinez.sculpture"]
    }
]

# Demo posts content
post_templates = [
    "Just finished this piece after weeks of work! What do you think? 🎨 #art #handmade #creative",
    "Work in progress... Sometimes the best art comes from experimenting! #wip #process #artist",
    "Teaching a workshop this weekend! Anyone interested in learning new techniques? #workshop #learning #craft",
    "The lighting in my studio today is absolutely perfect for photography 📸 #studio #workspace #artist",
    "Excited to share my latest creation with you all! This one pushed my boundaries #newwork #challenge #art",
    "Behind the scenes of my creative process. It's messy but worth it! #process #studio #creative",
    "Collaborating with other artists always brings out the best in my work #collaboration #community #art",
    "Found amazing materials at the market today. Can't wait to incorporate them! #materials #inspiration #craft",
    "Setting up for the weekend art fair. Come say hi if you're in the area! #artfair #exhibition #local",
    "Late night in the studio, but the creativity is flowing! ✨ #latenight #creative #flow #artist",
    "Trying out a completely new technique today. Scared but excited! #experiment #new #learning #growth",
    "The detail work on this piece is taking forever, but it's so satisfying #detail #patience #craft #handmade",
    "Studio tour! Here's where the magic happens 🏠 #studio #workspace #organization #artist",
    "Just delivered a custom commission. The client was thrilled! #commission #custom #happy #client",
    "Inspiration struck at 3am. Had to get up and sketch it out! #inspiration #3am #sketch #creative",
    "Cleaning and organizing the studio. A tidy space = a clear mind #organization #studio #clean #productivity",
    "Sharing some tips I've learned over the years. Hope this helps fellow artists! #tips #learning #community",
    "The color palette for this series is absolutely dreamy 🌈 #color #palette #series #dreamy #art",
    "Mistakes often lead to the most beautiful discoveries in art #mistakes #discovery #learning #beautiful",
    "Working on a series about nature and sustainability 🌱 #nature #sustainability #series #environment"
]

hashtag_pools = [
    ["art", "handmade", "creative", "artist", "craft"],
    ["pottery", "ceramics", "clay", "wheel", "glaze"],
    ["painting", "canvas", "oil", "acrylic", "watercolor"], 
    ["sculpture", "bronze", "marble", "stone", "carving"],
    ["photography", "camera", "street", "portrait", "landscape"],
    ["jewelry", "silver", "gold", "gems", "rings"],
    ["textiles", "embroidery", "fabric", "thread", "sewing"],
    ["glass", "blown", "stained", "fused", "hot"],
    ["wood", "carving", "furniture", "handcrafted", "traditional"],
    ["digital", "3d", "animation", "nft", "modern"]
]

async def clear_database():
    """Clear existing data"""
    collections = ['users', 'posts', 'comments', 'likes', 'follows', 'saves', 'notifications', 'conversations', 'messages']
    for collection in collections:
        await db[collection].delete_many({})
    print("Database cleared!")

async def create_demo_users():
    """Create demo users"""
    created_users = []
    
    for user_data in demo_users:
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": user_data["email"],
            "username": user_data["username"], 
            "name": user_data["name"],
            "bio": user_data["bio"],
            "avatar": user_data["avatar"],
            "links": user_data["links"],
            "followers_count": 0,
            "following_count": 0,
            "is_private": False,
            "is_blocked": False,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=random.randint(30, 365))).isoformat(),
            "password": hash_password("demo123")  # All demo users have same password for testing
        }
        
        await db.users.insert_one(user)
        created_users.append(user)
        print(f"Created user: {user['username']}")
    
    return created_users

async def create_follow_relationships(users):
    """Create realistic follow relationships"""
    follow_relationships = []
    
    for i, user in enumerate(users):
        # Each user follows 2-6 other users
        num_following = random.randint(2, 6)
        potential_follows = [u for u in users if u['id'] != user['id']]
        following_users = random.sample(potential_follows, min(num_following, len(potential_follows)))
        
        for followed_user in following_users:
            follow_id = str(uuid.uuid4())
            follow = {
                "id": follow_id,
                "follower_id": user['id'],
                "following_id": followed_user['id'],
                "created_at": (datetime.now(timezone.utc) - timedelta(days=random.randint(1, 90))).isoformat()
            }
            
            await db.follows.insert_one(follow)
            follow_relationships.append(follow)
            
            # Update follower counts
            await db.users.update_one(
                {"id": user['id']},
                {"$inc": {"following_count": 1}}
            )
            await db.users.update_one(
                {"id": followed_user['id']},
                {"$inc": {"followers_count": 1}}
            )
    
    print(f"Created {len(follow_relationships)} follow relationships")
    return follow_relationships

async def create_demo_posts(users):
    """Create demo posts"""
    created_posts = []
    
    for user in users:
        # Each user creates 4-8 posts
        num_posts = random.randint(4, 8)
        
        for _ in range(num_posts):
            post_id = str(uuid.uuid4())
            content = random.choice(post_templates)
            
            # Add some hashtags
            hashtags = random.choice(hashtag_pools)
            selected_hashtags = random.sample(hashtags, random.randint(2, 4))
            content += " " + " ".join(f"#{tag}" for tag in selected_hashtags)
            
            # Sometimes mention other users
            if random.random() < 0.3:  # 30% chance to mention someone
                other_user = random.choice([u for u in users if u['id'] != user['id']])
                content += f" @{other_user['username']}"
            
            post = {
                "id": post_id,
                "author_id": user['id'],
                "content": content,
                "images": [],  # We'll skip image uploads for demo
                "visibility": random.choice(["public"] * 9 + ["followers"]),  # 90% public, 10% followers-only
                "hashtags": selected_hashtags,
                "mentions": [],
                "likes_count": 0,
                "comments_count": 0,
                "saves_count": 0,
                "shares_count": 0,
                "created_at": (datetime.now(timezone.utc) - timedelta(
                    days=random.randint(1, 30),
                    hours=random.randint(0, 23),
                    minutes=random.randint(0, 59)
                )).isoformat()
            }
            
            await db.posts.insert_one(post)
            created_posts.append(post)
    
    print(f"Created {len(created_posts)} posts")
    return created_posts

async def create_likes_and_saves(users, posts):
    """Create likes and saves on posts"""
    likes_created = 0
    saves_created = 0
    
    for post in posts:
        # Random number of likes (0-15)
        num_likes = random.randint(0, 15)
        potential_likers = [u for u in users if u['id'] != post['author_id']]
        
        if len(potential_likers) >= num_likes:
            likers = random.sample(potential_likers, num_likes)
            
            for liker in likers:
                like_id = str(uuid.uuid4())
                like = {
                    "id": like_id,
                    "user_id": liker['id'],
                    "target_id": post['id'],
                    "target_type": "post",
                    "created_at": (datetime.fromisoformat(post['created_at']) + timedelta(
                        hours=random.randint(1, 24)
                    )).isoformat()
                }
                
                await db.likes.insert_one(like)
                likes_created += 1
                
                # Some likes also save the post
                if random.random() < 0.3:  # 30% chance to save when liking
                    save_id = str(uuid.uuid4())
                    save = {
                        "id": save_id,
                        "user_id": liker['id'],
                        "post_id": post['id'],
                        "created_at": like['created_at']
                    }
                    
                    await db.saves.insert_one(save)
                    saves_created += 1
            
            # Update post like count
            await db.posts.update_one(
                {"id": post['id']},
                {"$set": {"likes_count": num_likes, "saves_count": saves_created}}
            )
    
    print(f"Created {likes_created} likes and {saves_created} saves")

async def create_comments(users, posts):
    """Create comments on posts"""
    comment_templates = [
        "This is absolutely beautiful! 😍",
        "Amazing work! Keep it up! 🔥",
        "I love the colors in this piece!",
        "Such incredible detail! How long did this take?",
        "This inspired me to try something similar!",
        "Gorgeous! Do you sell your work?",
        "The technique here is flawless 👏",
        "This speaks to me on so many levels",
        "Your style is so unique and recognizable!",
        "Can't wait to see what you create next!",
        "The composition is perfect 🎨",
        "This would look amazing in my living room!",
        "Your talent never ceases to amaze me",
        "The lighting in this shot is incredible",
        "I've been following your work for years - love it!"
    ]
    
    comments_created = 0
    
    for post in posts:
        # Random number of comments (0-8)
        num_comments = random.randint(0, 8)
        potential_commenters = [u for u in users if u['id'] != post['author_id']]
        
        if len(potential_commenters) >= num_comments and num_comments > 0:
            commenters = random.sample(potential_commenters, num_comments)
            
            for commenter in commenters:
                comment_id = str(uuid.uuid4())
                comment = {
                    "id": comment_id,
                    "post_id": post['id'],
                    "author_id": commenter['id'],
                    "parent_id": None,  # Top-level comment
                    "content": random.choice(comment_templates),
                    "likes_count": random.randint(0, 5),
                    "replies_count": 0,
                    "created_at": (datetime.fromisoformat(post['created_at']) + timedelta(
                        hours=random.randint(1, 48)
                    )).isoformat()
                }
                
                await db.comments.insert_one(comment)
                comments_created += 1
            
            # Update post comment count
            await db.posts.update_one(
                {"id": post['id']},
                {"$set": {"comments_count": num_comments}}
            )
    
    print(f"Created {comments_created} comments")

async def create_demo_conversations(users):
    """Create demo conversation threads"""
    conversations_created = 0
    messages_created = 0
    
    # Create 5-8 conversations between random users
    num_conversations = random.randint(5, 8)
    
    for _ in range(num_conversations):
        # Pick two random users
        user1, user2 = random.sample(users, 2)
        
        conversation_id = str(uuid.uuid4())
        conversation = {
            "id": conversation_id,
            "participants": [user1['id'], user2['id']],
            "last_message": None,
            "last_message_at": None,
            "unread_count": {user1['id']: 0, user2['id']: 0},
            "created_at": (datetime.now(timezone.utc) - timedelta(days=random.randint(1, 15))).isoformat()
        }
        
        # Create 3-10 messages in this conversation
        num_messages = random.randint(3, 10)
        message_templates = [
            "Hey! Love your latest work!",
            "Thanks! That means a lot coming from you",
            "Are you planning to exhibit anywhere soon?",
            "Yes! I have a show next month",
            "That's amazing! I'd love to check it out",
            "I'll send you the details",
            "Your technique in that last piece was incredible",
            "Thank you! I've been working on it for months",
            "It really shows. The dedication is obvious",
            "Would you be interested in a collaboration?",
            "Absolutely! What did you have in mind?",
            "Maybe we could combine our styles somehow",
            "That sounds exciting! Let's talk more about it"
        ]
        
        for i in range(num_messages):
            sender = user1 if i % 2 == 0 else user2
            receiver = user2 if i % 2 == 0 else user1
            
            message_id = str(uuid.uuid4())
            message_content = random.choice(message_templates)
            
            message = {
                "id": message_id,
                "conversation_id": conversation_id,
                "sender_id": sender['id'],
                "receiver_id": receiver['id'],
                "content": message_content,
                "message_type": "text",
                "is_read": random.choice([True, False]),
                "created_at": (datetime.fromisoformat(conversation['created_at']) + timedelta(
                    days=random.randint(0, 10),
                    hours=random.randint(0, 23)
                )).isoformat()
            }
            
            await db.messages.insert_one(message)
            messages_created += 1
            
            # Update conversation with last message
            conversation['last_message'] = message_content
            conversation['last_message_at'] = message['created_at']
        
        await db.conversations.insert_one(conversation)
        conversations_created += 1
    
    print(f"Created {conversations_created} conversations with {messages_created} messages")

async def main():
    """Main seeding function"""
    print("Starting database seeding...")
    
    # Clear existing data
    await clear_database()
    
    # Create users
    users = await create_demo_users()
    
    # Create follow relationships
    await create_follow_relationships(users)
    
    # Create posts
    posts = await create_demo_posts(users)
    
    # Create likes and saves
    await create_likes_and_saves(users, posts)
    
    # Create comments
    await create_comments(users, posts)
    
    # Create conversations and messages
    await create_demo_conversations(users)
    
    print("\n✅ Database seeding completed successfully!")
    print(f"Created:")
    print(f"  - {len(users)} demo users")
    print(f"  - {len(posts)} posts")
    print(f"  - Follow relationships")
    print(f"  - Likes, saves, and comments")
    print(f"  - Demo conversations with messages")
    print("\nDemo users all have password: demo123")
    print("Try logging in with any of these emails:")
    for user in users[:3]:
        print(f"  - {user['email']} (@{user['username']})")

if __name__ == "__main__":
    asyncio.run(main())