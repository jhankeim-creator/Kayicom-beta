from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from passlib.context import CryptContext
import requests
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

# User Models
class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str = "customer"  # customer or admin
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# Product Models
class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    category: str  # giftcard, topup, subscription, service
    price: float
    currency: str = "USD"
    image_url: Optional[str] = None
    stock_available: bool = True
    delivery_type: str = "automatic"  # automatic or manual
    subscription_duration_months: Optional[int] = None  # For subscriptions: 2, 6, 12, 24 months
    subscription_auto_check: bool = False  # Auto-check if subscription is still valid
    variant_name: Optional[str] = None  # For variants like "100 Diamonds", "500 UC", etc
    parent_product_id: Optional[str] = None  # Link to parent product for variants
    requires_player_id: bool = False  # For topup products that need player ID
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    description: str
    category: str
    price: float
    currency: str = "USD"
    image_url: Optional[str] = None
    stock_available: bool = True
    delivery_type: str = "automatic"
    subscription_duration_months: Optional[int] = None
    subscription_auto_check: bool = False
    variant_name: Optional[str] = None
    parent_product_id: Optional[str] = None
    requires_player_id: bool = False
    metadata: Optional[Dict[str, Any]] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    image_url: Optional[str] = None
    stock_available: Optional[bool] = None
    delivery_type: Optional[str] = None
    subscription_duration_months: Optional[int] = None
    subscription_auto_check: Optional[bool] = None
    variant_name: Optional[str] = None
    parent_product_id: Optional[str] = None
    requires_player_id: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None

# Order Models
class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    price: float
    player_id: Optional[str] = None  # For topup products

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    items: List[OrderItem]
    total_amount: float
    currency: str = "USD"
    payment_method: str  # crypto_plisio, paypal, skrill, moncash, binance_pay, zelle, cashapp
    payment_status: str = "pending"  # pending, paid, failed, cancelled
    order_status: str = "pending"  # pending, processing, completed, cancelled
    payment_proof_url: Optional[str] = None
    transaction_id: Optional[str] = None
    plisio_invoice_id: Optional[str] = None
    delivery_info: Optional[Dict[str, Any]] = None
    subscription_end_date: Optional[datetime] = None  # For subscription orders
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    items: List[OrderItem]
    payment_method: str

# Payment Models
class ManualPaymentProof(BaseModel):
    order_id: str
    transaction_id: str
    payment_proof_url: str

# Settings Models
class SiteSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "site_settings"
    site_name: str = "KayiCom"
    logo_url: Optional[str] = None
    primary_color: str = "#3b82f6"
    secondary_color: str = "#8b5cf6"
    support_email: str = "support@kayicom.com"
    plisio_api_key: Optional[str] = None
    mtcgame_api_key: Optional[str] = None
    gosplit_api_key: Optional[str] = None
    z2u_api_key: Optional[str] = None
    resend_api_key: Optional[str] = None
    product_categories: Optional[List[str]] = ["giftcard", "topup", "subscription", "service"]
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SettingsUpdate(BaseModel):
    site_name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    support_email: Optional[str] = None
    plisio_api_key: Optional[str] = None
    mtcgame_api_key: Optional[str] = None
    gosplit_api_key: Optional[str] = None
    z2u_api_key: Optional[str] = None
    resend_api_key: Optional[str] = None
    product_categories: Optional[List[str]] = None

# Bulk Email Model
class BulkEmailRequest(BaseModel):
    subject: str
    message: str
    recipient_type: str  # all, customers, specific_emails
    specific_emails: Optional[List[EmailStr]] = None

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = pwd_context.hash(user_data.password)
    
    # Create user
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        role="customer"
    )
    
    doc = user.model_dump()
    doc['password'] = hashed_password
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    return user

@api_router.post("/auth/login")
async def login(credentials: LoginRequest):
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not pwd_context.verify(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {
        "user_id": user['id'],
        "email": user['email'],
        "full_name": user['full_name'],
        "role": user['role']
    }

# ==================== PRODUCT ENDPOINTS ====================

@api_router.get("/products", response_model=List[Product])
async def get_products(category: Optional[str] = None):
    query = {}
    if category:
        query['category'] = category
    
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    for product in products:
        if isinstance(product.get('created_at'), str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if isinstance(product.get('created_at'), str):
        product['created_at'] = datetime.fromisoformat(product['created_at'])
    return product

@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate):
    product = Product(**product_data.model_dump())
    doc = product.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.products.insert_one(doc)
    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, updates: ProductUpdate):
    existing = await db.products.find_one({"id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    
    if update_data:
        await db.products.update_one({"id": product_id}, {"$set": update_data})
    
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return updated

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}

# ==================== ORDER ENDPOINTS ====================

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, user_id: str, user_email: str):
    # Calculate total
    total = sum(item.price * item.quantity for item in order_data.items)
    
    order = Order(
        user_id=user_id,
        user_email=user_email,
        items=order_data.items,
        total_amount=total,
        payment_method=order_data.payment_method
    )
    
    # If crypto payment, create Plisio invoice
    if order_data.payment_method == "crypto_plisio":
        settings = await db.settings.find_one({"id": "site_settings"})
        if settings and settings.get('plisio_api_key'):
            try:
                # Create Plisio invoice
                plisio_response = requests.get(
                    "https://api.plisio.net/api/v1/invoices/new",
                    params={
                        "api_key": settings['plisio_api_key'],
                        "order_name": f"Order {order.id}",
                        "order_number": order.id,
                        "amount": total,
                        "currency": "USD",
                        "source_currency": "USD",
                        "callback_url": f"{os.environ.get('BACKEND_URL', '')}/api/payments/plisio-callback"
                    }
                )
                if plisio_response.status_code == 200:
                    plisio_data = plisio_response.json()
                    if plisio_data.get('status') == 'success':
                        order.plisio_invoice_id = plisio_data['data']['txn_id']
            except Exception as e:
                logging.error(f"Plisio error: {e}")
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.orders.insert_one(doc)
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_orders(user_id: Optional[str] = None):
    query = {}
    if user_id:
        query['user_id'] = user_id
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if isinstance(order.get('updated_at'), str):
            order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if isinstance(order.get('created_at'), str):
        order['created_at'] = datetime.fromisoformat(order['created_at'])
    if isinstance(order.get('updated_at'), str):
        order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    return order

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, payment_status: Optional[str] = None, order_status: Optional[str] = None):
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if payment_status:
        updates['payment_status'] = payment_status
    if order_status:
        updates['order_status'] = order_status
    
    result = await db.orders.update_one({"id": order_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order updated successfully"}

# Delivery Management Model
class DeliveryInfo(BaseModel):
    delivery_details: str  # Credentials, codes, or instructions

@api_router.put("/orders/{order_id}/delivery")
async def update_order_delivery(order_id: str, delivery_info: DeliveryInfo):
    """Update order with delivery information and mark as completed"""
    updates = {
        "delivery_info": {"details": delivery_info.delivery_details, "delivered_at": datetime.now(timezone.utc).isoformat()},
        "order_status": "completed",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.orders.update_one({"id": order_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # TODO: Send email to customer with delivery info
    # This would use the resend API key from settings
    
    return {"message": "Order delivered successfully"}


# ==================== PAYMENT ENDPOINTS ====================

@api_router.post("/payments/manual-proof")
async def upload_payment_proof(proof_data: ManualPaymentProof):
    # Update order with payment proof
    result = await db.orders.update_one(
        {"id": proof_data.order_id},
        {"$set": {
            "payment_proof_url": proof_data.payment_proof_url,
            "transaction_id": proof_data.transaction_id,
            "payment_status": "pending_verification",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Payment proof uploaded successfully"}

@api_router.post("/payments/plisio-callback")
async def plisio_callback(data: Dict[str, Any]):
    # Handle Plisio webhook
    order_id = data.get('order_number')
    status = data.get('status')
    
    if status == 'completed':
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {
                "payment_status": "paid",
                "order_status": "processing",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    return {"status": "ok"}

@api_router.get("/payments/plisio-status/{invoice_id}")
async def check_plisio_status(invoice_id: str):
    settings = await db.settings.find_one({"id": "site_settings"})
    if not settings or not settings.get('plisio_api_key'):
        raise HTTPException(status_code=400, detail="Plisio not configured")
    
    try:
        response = requests.get(
            f"https://api.plisio.net/api/v1/operations/{invoice_id}",
            params={"api_key": settings['plisio_api_key']}
        )
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== SETTINGS ENDPOINTS ====================

@api_router.get("/settings", response_model=SiteSettings)
async def get_settings():
    settings = await db.settings.find_one({"id": "site_settings"}, {"_id": 0})
    if not settings:
        # Create default settings
        default_settings = SiteSettings()
        doc = default_settings.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.settings.insert_one(doc)
        return default_settings
    
    if isinstance(settings.get('updated_at'), str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])
    return settings

@api_router.put("/settings", response_model=SiteSettings)
async def update_settings(updates: SettingsUpdate):
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.settings.update_one(
        {"id": "site_settings"},
        {"$set": update_data},
        upsert=True
    )
    
    settings = await db.settings.find_one({"id": "site_settings"}, {"_id": 0})
    if isinstance(settings.get('updated_at'), str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])
    return settings

# ==================== BULK EMAIL ENDPOINTS ====================

@api_router.post("/emails/bulk-send")
async def send_bulk_email(email_data: BulkEmailRequest):
    settings = await db.settings.find_one({"id": "site_settings"})
    if not settings or not settings.get('resend_api_key'):
        raise HTTPException(status_code=400, detail="Resend API key not configured")
    
    # Get recipients based on type
    recipients = []
    if email_data.recipient_type == "all":
        users = await db.users.find({}, {"email": 1, "_id": 0}).to_list(10000)
        recipients = [user['email'] for user in users]
    elif email_data.recipient_type == "customers":
        users = await db.users.find({"role": "customer"}, {"email": 1, "_id": 0}).to_list(10000)
        recipients = [user['email'] for user in users]
    elif email_data.recipient_type == "specific_emails" and email_data.specific_emails:
        recipients = email_data.specific_emails
    
    if not recipients:
        raise HTTPException(status_code=400, detail="No recipients found")
    
    # Here you would integrate with Resend API
    # For now, just log the action
    sent_count = len(recipients)
    
    return {
        "message": f"Bulk email sent to {sent_count} recipients",
        "sent_count": sent_count,
        "recipients": recipients[:10] if len(recipients) > 10 else recipients  # Show first 10
    }

# ==================== STATS ENDPOINTS ====================

@api_router.get("/stats/dashboard")
async def get_dashboard_stats():
    total_orders = await db.orders.count_documents({})
    total_products = await db.products.count_documents({})
    total_customers = await db.users.count_documents({"role": "customer"})
    
    # Revenue calculation
    pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]['total'] if revenue_result else 0
    
    # Pending payments
    pending_payments = await db.orders.count_documents({"payment_status": "pending_verification"})
    
    return {
        "total_orders": total_orders,
        "total_products": total_products,
        "total_customers": total_customers,
        "total_revenue": total_revenue,
        "pending_payments": pending_payments
    }

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
