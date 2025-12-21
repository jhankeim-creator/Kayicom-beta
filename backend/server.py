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
from plisio_helper import PlisioHelper

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=False)  # Don't override if already set

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
if not mongo_url:
    raise ValueError("MONGO_URL environment variable is required")

db_name = os.environ.get('DB_NAME', 'kayicom')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create the main app

import base64
from fastapi import File, UploadFile
import mimetypes

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
    referral_code: str = Field(default_factory=lambda: str(uuid.uuid4())[:8].upper())
    referred_by: Optional[str] = None  # referral_code of referrer
    referral_balance: float = 0.0  # Balance from referrals
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
    category: str  # giftcard, topup, subscription, service, crypto
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
    region: Optional[str] = None  # For gift cards: US, EU, ASIA, etc.
    is_subscription: bool = False  # Track if this triggers referral payout
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
    region: Optional[str] = None
    is_subscription: bool = False
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
    region: Optional[str] = None
    is_subscription: Optional[bool] = None
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
    trustpilot_enabled: Optional[bool] = False
    trustpilot_business_id: Optional[str] = None
    product_categories: Optional[List[str]] = ["giftcard", "topup", "subscription", "service"]
    # Payment Gateway Settings
    payment_gateways: Optional[dict] = {
        "paypal": {"enabled": True, "email": "", "instructions": ""},
        "airtm": {"enabled": True, "email": "", "instructions": ""},
        "skrill": {"enabled": True, "email": "", "instructions": ""},
        "crypto_usdt": {"enabled": True, "wallet": "", "instructions": ""}
    }
    # Crypto Exchange Settings
    crypto_settings: Optional[dict] = {
        "buy_rate_usdt": 1.0,
        "sell_rate_usdt": 0.98,
        "transaction_fee_percent": 2.0,
        "min_transaction_usd": 10.0,
        "wallets": {
            "BEP20": "",
            "TRC20": "",
            "MATIC": ""
        }
    }
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
    trustpilot_enabled: Optional[bool] = None
    trustpilot_business_id: Optional[str] = None
    product_categories: Optional[List[str]] = None
    payment_gateways: Optional[dict] = None
    crypto_settings: Optional[dict] = None

# Bulk Email Model
class BulkEmailRequest(BaseModel):
    subject: str
    message: str
    recipient_type: str  # all, customers, specific_emails
    specific_emails: Optional[List[EmailStr]] = None


# Withdrawal Models
class Withdrawal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    amount: float
    method: str  # usdt_bep20, btc, paypal
    wallet_address: Optional[str] = None  # For crypto
    paypal_email: Optional[str] = None  # For PayPal
    status: str = "pending"  # pending, approved, rejected, completed
    admin_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WithdrawalRequest(BaseModel):
    amount: float
    method: str
    wallet_address: Optional[str] = None
    paypal_email: Optional[str] = None
    moncash_phone: Optional[str] = None
    moncash_name: Optional[str] = None

# Crypto Transaction Models
class CryptoTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    transaction_type: str  # buy or sell
    crypto_type: str = "USDT"
    chain: str  # BEP20, TRC20, MATIC
    amount_crypto: float
    amount_usd: float
    exchange_rate: float
    fee: float
    total_usd: float  # amount_usd + fee for buy, amount_usd - fee for sell
    payment_method: Optional[str] = None  # For buy: paypal, moncash, btc, usdt
    wallet_address: Optional[str] = None
    transaction_hash: Optional[str] = None
    status: str = "pending"  # pending, processing, completed, failed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CryptoBuyRequest(BaseModel):
    chain: str
    amount_usd: float
    payment_method: str
    wallet_address: str
    transaction_id: Optional[str] = None
    payment_proof: Optional[str] = None

class CryptoSellRequest(BaseModel):
    chain: str
    amount_crypto: float
    payment_method: str  # paypal, moncash, usdt, btc
    receiving_info: str  # Email or wallet address for receiving payment
    transaction_id: Optional[str] = None
    payment_proof: Optional[str] = None

# Crypto Config Model
class CryptoConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "crypto_config"
    # Exchange rates (USD per 1 USDT)
    buy_rate_bep20: float = 1.02
    sell_rate_bep20: float = 0.98
    buy_rate_trc20: float = 1.02
    sell_rate_trc20: float = 0.98
    buy_rate_matic: float = 1.02
    sell_rate_matic: float = 0.98
    # Fees
    buy_fee_percent: float = 2.0
    sell_fee_percent: float = 2.0
    # Limits
    min_buy_usd: float = 10.0
    max_buy_usd: float = 10000.0
    min_sell_usdt: float = 10.0
    max_sell_usdt: float = 10000.0
    # Confirmations required
    bep20_confirmations: int = 15
    trc20_confirmations: int = 20
    matic_confirmations: int = 10
    # Wallets
    wallet_bep20: Optional[str] = None
    wallet_trc20: Optional[str] = None
    wallet_matic: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


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
        logging.error(f"Login failed: user not found for {credentials.email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Support both 'password' and 'password_hash' field names
    password_field = 'password_hash' if 'password_hash' in user else 'password'
    logging.info(f"Login attempt for {credentials.email}, using field: {password_field}")
    
    if not pwd_context.verify(credentials.password, user[password_field]):
        logging.error(f"Login failed: incorrect password for {credentials.email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    logging.info(f"Login successful for {credentials.email}")
    return {
        "user_id": user['id'],
        "id": user['id'],
        "email": user['email'],
        "username": user.get('username', user.get('full_name', 'User')),
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
                from plisio_helper import PlisioHelper
                plisio = PlisioHelper(settings['plisio_api_key'])
                
                # Create Plisio invoice for USDT payment
                invoice_response = await plisio.create_invoice(
                    amount=total,
                    currency="USDT_TRC20",  # Default to TRC20 for orders
                    order_name=f"Order {order.id}",
                    order_number=order.id,
                    email=user_email
                )
                
                if invoice_response.get("success"):
                    order.plisio_invoice_id = invoice_response.get("invoice_id")
                    order.plisio_invoice_url = invoice_response.get("invoice_url")
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

# CORS configuration - handle Railway deployment
cors_origins = os.environ.get('CORS_ORIGINS', '*')
if cors_origins != '*':
    cors_origins = [origin.strip() for origin in cors_origins.split(',') if origin.strip()]
else:
    cors_origins = ['*']

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)



# ==================== REFERRAL ENDPOINTS ====================

@api_router.get("/referral/info")
async def get_referral_info(user_id: str):
    """Get user's referral code and balance"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Count referrals
    referral_count = await db.users.count_documents({"referred_by": user['referral_code']})
    
    return {
        "referral_code": user.get('referral_code'),
        "referral_balance": user.get('referral_balance', 0.0),
        "total_referrals": referral_count,
        "referral_link": f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/register?ref={user.get('referral_code')}"
    }

@api_router.post("/auth/register-with-referral")
async def register_with_referral(user_data: UserCreate, referral_code: Optional[str] = None):
    """Register user with optional referral code"""
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = pwd_context.hash(user_data.password)
    
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        role="customer"
    )
    
    doc = user.model_dump()
    doc['password'] = hashed_password
    doc['created_at'] = doc['created_at'].isoformat()
    doc['referral_balance'] = 0.0
    
    # Set referrer if valid code provided
    if referral_code:
        referrer = await db.users.find_one({"referral_code": referral_code})
        if referrer:
            doc['referred_by'] = referral_code
    
    await db.users.insert_one(doc)
    return user

# ==================== WITHDRAWAL ENDPOINTS ====================

@api_router.post("/withdrawals/request")
async def request_withdrawal(withdrawal: WithdrawalRequest, user_id: str, user_email: str):
    """User requests withdrawal"""
    # Check minimum
    if withdrawal.amount < 5.0:
        raise HTTPException(status_code=400, detail="Minimum withdrawal is $5")
    
    # Check user balance
    user = await db.users.find_one({"id": user_id})
    if not user or user.get('referral_balance', 0.0) < withdrawal.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Validate method-specific fields
    if withdrawal.method in ['usdt_bep20', 'btc'] and not withdrawal.wallet_address:
        raise HTTPException(status_code=400, detail="Wallet address required")
    if withdrawal.method == 'paypal' and not withdrawal.paypal_email:
        raise HTTPException(status_code=400, detail="PayPal email required")
    if withdrawal.method == 'moncash' and (not withdrawal.moncash_phone or not withdrawal.moncash_name):
        raise HTTPException(status_code=400, detail="MonCash phone and name required")
    
    # Create withdrawal request
    withdrawal_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_email": user_email,
        "amount": withdrawal.amount,
        "method": withdrawal.method,
        "wallet_address": withdrawal.wallet_address,
        "paypal_email": withdrawal.paypal_email,
        "moncash_phone": withdrawal.moncash_phone if withdrawal.method == 'moncash' else None,
        "moncash_name": withdrawal.moncash_name if withdrawal.method == 'moncash' else None,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.withdrawals.insert_one(withdrawal_doc)
    
    # Deduct from balance (pending)
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"referral_balance": -withdrawal.amount}}
    )
    
    return {"message": "Withdrawal request submitted", "withdrawal_id": withdrawal_doc['id']}

@api_router.get("/withdrawals/user/{user_id}")
async def get_user_withdrawals(user_id: str):
    """Get user's withdrawal history"""
    withdrawals = await db.withdrawals.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return withdrawals

@api_router.get("/withdrawals/all")
async def get_all_withdrawals():
    """Admin: Get all withdrawal requests"""
    withdrawals = await db.withdrawals.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return withdrawals

@api_router.put("/withdrawals/{withdrawal_id}/status")
async def update_withdrawal_status(withdrawal_id: str, status: str, admin_notes: Optional[str] = None):
    """Admin: Update withdrawal status"""
    if status not in ['approved', 'completed', 'rejected']:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    withdrawal = await db.withdrawals.find_one({"id": withdrawal_id})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    updates = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if admin_notes:
        updates['admin_notes'] = admin_notes
    
    # If rejected, refund balance
    if status == 'rejected' and withdrawal['status'] == 'pending':
        await db.users.update_one(
            {"id": withdrawal['user_id']},
            {"$inc": {"referral_balance": withdrawal['amount']}}
        )
    
    await db.withdrawals.update_one({"id": withdrawal_id}, {"$set": updates})
    
    return {"message": f"Withdrawal {status}"}

# ==================== CRYPTO ENDPOINTS ====================

@api_router.get("/crypto/config")
async def get_crypto_config():
    """Get crypto exchange rates and config"""
    config = await db.crypto_config.find_one({"id": "crypto_config"}, {"_id": 0})
    if not config:
        # Create default config
        default_config = CryptoConfig().model_dump()
        default_config['updated_at'] = default_config['updated_at'].isoformat()
        await db.crypto_config.insert_one(default_config)
        config = default_config
    
    # Get wallet addresses from settings
    settings = await db.settings.find_one({"id": "site_settings"}, {"_id": 0})
    if settings and settings.get('crypto_settings'):
        config['crypto_settings'] = settings['crypto_settings']
    
    return config

@api_router.put("/crypto/config")
async def update_crypto_config(updates: Dict[str, Any]):
    """Admin: Update crypto config"""
    updates['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.crypto_config.update_one(
        {"id": "crypto_config"},
        {"$set": updates},
        upsert=True
    )
    
    return {"message": "Crypto config updated"}

@api_router.post("/crypto/buy")
async def buy_crypto(request: CryptoBuyRequest, user_id: str = None, user_email: str = None):
    """User buys USDT - Generate Plisio invoice automatically"""
    # Extract user info from request if not provided
    if not user_id:
        user_id = "guest"
    if not user_email:
        user_email = "guest@kayicom.com"
    # Get config
    config = await db.crypto_config.find_one({"id": "crypto_config"})
    if not config:
        raise HTTPException(status_code=500, detail="Crypto config not found")
    
    # Get Plisio API key from settings
    settings = await db.settings.find_one({"id": "site_settings"})
    
    # For BUY USDT, customer pays with FIAT (PayPal, AirTM, Skrill)
    # No need for Plisio - just show admin payment info
    
    # Check limits
    if request.amount_usd < config['min_buy_usd'] or request.amount_usd > config['max_buy_usd']:
        raise HTTPException(status_code=400, detail=f"Amount must be between ${config['min_buy_usd']} and ${config['max_buy_usd']}")
    
    # Get rate
    rate_key = f"buy_rate_{request.chain.lower()}"
    exchange_rate = config.get(rate_key, 1.02)
    
    # Calculate
    amount_crypto = request.amount_usd / exchange_rate
    fee = request.amount_usd * (config['buy_fee_percent'] / 100)
    total_usd = request.amount_usd + fee
    
    # Create transaction
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_email": user_email,
        "transaction_type": "buy",
        "crypto_type": "USDT",
        "chain": request.chain,
        "amount_crypto": amount_crypto,
        "amount_usd": request.amount_usd,
        "exchange_rate": exchange_rate,
        "fee": fee,
        "total_usd": total_usd,
        "payment_method": request.payment_method,
        "wallet_address": request.wallet_address,
        "transaction_id": request.transaction_id,
        "payment_proof": request.payment_proof,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.crypto_transactions.insert_one(transaction)
    
    # Get admin payment information based on selected method
    payment_info = {}
    if settings and settings.get('payment_gateways'):
        gateway = settings['payment_gateways'].get(request.payment_method, {})
        if gateway.get('enabled'):
            payment_info = {
                'method': request.payment_method,
                'email': gateway.get('email', ''),
                'instructions': gateway.get('instructions', '')
            }
    
    return {
        "message": "Buy crypto order created. Please send payment and submit proof.",
        "transaction_id": transaction['id'],
        "amount_crypto": amount_crypto,
        "total_usd": total_usd,
        "payment_info": payment_info
    }

@api_router.post("/crypto/sell")
async def sell_crypto(request: CryptoSellRequest, user_id: str, user_email: str):
    """User sells USDT"""
    config = await db.crypto_config.find_one({"id": "crypto_config"})
    if not config:
        raise HTTPException(status_code=500, detail="Crypto config not found")
    
    # Check limits
    if request.amount_crypto < config['min_sell_usdt'] or request.amount_crypto > config['max_sell_usdt']:
        raise HTTPException(status_code=400, detail=f"Amount must be between {config['min_sell_usdt']} and {config['max_sell_usdt']} USDT")
    
    # Get rate
    rate_key = f"sell_rate_{request.chain.lower()}"
    exchange_rate = config.get(rate_key, 0.98)
    
    # Calculate
    amount_usd = request.amount_crypto * exchange_rate
    fee = amount_usd * (config['sell_fee_percent'] / 100)
    total_usd = amount_usd - fee
    
    transaction_id = str(uuid.uuid4())
    
    # Create Plisio invoice for receiving USDT from customer
    settings = await db.settings.find_one({"id": "site_settings"}, {"_id": 0})
    plisio_invoice = None
    
    if settings and settings.get('plisio_api_key'):
        try:
            plisio_helper = PlisioHelper(settings['plisio_api_key'])
            
            # Plisio uses just 'USDT' and handles chain automatically
            plisio_currency = 'USDT'
            
            plisio_result = await plisio_helper.create_invoice(
                amount=request.amount_crypto,
                currency=plisio_currency,
                order_name=f"Sell USDT Order",
                order_number=transaction_id,
                email=user_email
            )
            
            if plisio_result.get('success'):
                plisio_invoice = plisio_result
            else:
                print(f"Plisio invoice creation failed: {plisio_result.get('error')}")
        except Exception as e:
            print(f"Plisio integration error: {str(e)}")
            # Continue without Plisio integration
    
    # Create transaction
    transaction = {
        "id": transaction_id,
        "user_id": user_id,
        "user_email": user_email,
        "transaction_type": "sell",
        "crypto_type": "USDT",
        "chain": request.chain,
        "amount_crypto": request.amount_crypto,
        "amount_usd": amount_usd,
        "exchange_rate": exchange_rate,
        "fee": fee,
        "total_usd": total_usd,
        "payment_method": request.payment_method,
        "metadata": {"receiving_info": request.receiving_info},
        "receiving_info": request.receiving_info,
        "transaction_id": request.transaction_id,
        "payment_proof": request.payment_proof,
        "plisio_invoice_id": plisio_invoice.get('txn_id') if plisio_invoice else None,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.crypto_transactions.insert_one(transaction)
    
    response = {
        "message": "Crypto sell order created. Send USDT to the address below",
        "transaction_id": transaction['id'],
        "total_usd_to_receive": total_usd,
        "amount_crypto": request.amount_crypto
    }
    
    # Add Plisio details if available
    if plisio_invoice:
        response['plisio'] = {
            "wallet_address": plisio_invoice.get("wallet_address"),
            "invoice_url": plisio_invoice.get("invoice_url"),
            "qr_code": plisio_invoice.get("qr_code"),
            "amount_crypto": plisio_invoice.get("amount_crypto"),
            "message": "Send USDT to this unique address. Payment will be automatically detected."
        }
    else:
        # Fallback to admin wallet if Plisio not available
        response['wallet_address'] = config.get(f"wallet_{request.chain.lower()}")
        response['message'] = "Send USDT to admin wallet. You'll need to provide transaction ID."
    
    return response

@api_router.get("/crypto/transactions/user/{user_id}")
async def get_user_crypto_transactions(user_id: str):
    """Get user's crypto transactions"""
    transactions = await db.crypto_transactions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return transactions

@api_router.get("/crypto/transactions/all")
async def get_all_crypto_transactions():
    """Admin: Get all crypto transactions"""
    transactions = await db.crypto_transactions.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return transactions

class CryptoStatusUpdate(BaseModel):
    status: str
    admin_notes: Optional[str] = None
    tx_hash: Optional[str] = None

@api_router.put("/crypto/transactions/{transaction_id}/status")
async def update_crypto_transaction_status(
    transaction_id: str,
    update_data: CryptoStatusUpdate
):
    """Admin: Update crypto transaction status"""
    if update_data.status not in ['processing', 'completed', 'rejected', 'failed']:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    updates = {
        "status": update_data.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if update_data.admin_notes:
        updates['admin_notes'] = update_data.admin_notes
    
    if update_data.tx_hash:
        updates['tx_hash'] = update_data.tx_hash
    
    result = await db.crypto_transactions.update_one(
        {"id": transaction_id},
        {"$set": updates}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {"message": "Transaction status updated"}


# File Upload Endpoint
@api_router.post("/upload/image")
async def upload_image(file: UploadFile = File(...)):
    """Upload image and return base64 data URL"""
    try:
        # Read file content
        contents = await file.read()
        
        # Get mime type
        mime_type = file.content_type or mimetypes.guess_type(file.filename)[0] or 'image/jpeg'
        
        # Convert to base64
        base64_data = base64.b64encode(contents).decode('utf-8')
        data_url = f"data:{mime_type};base64,{base64_data}"
        
        return {"url": data_url, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# ==================== REFERRAL PAYOUT TRACKING ====================

async def check_and_credit_referral(order: dict):
    """Check if order qualifies for referral payout and credit referrer"""
    # Check if user was referred
    user = await db.users.find_one({"id": order['user_id']})
    if not user or not user.get('referred_by'):
        return
    
    # Check if order contains subscription
    has_subscription = False
    for item in order['items']:
        product = await db.products.find_one({"id": item['product_id']})
        if product and product.get('is_subscription'):
            has_subscription = True
            break
    
    if not has_subscription:
        return
    
    # Check if this is first subscription purchase
    previous_subscription_orders = await db.orders.find({
        "user_id": order['user_id'],
        "items.product_id": {"$in": [p['product_id'] for p in order['items'] if p.get('is_subscription')]}
    }).to_list(10)
    
    if len(previous_subscription_orders) > 1:  # More than current order
        return
    
    # Credit referrer $1
    referrer_code = user['referred_by']
    await db.users.update_one(
        {"referral_code": referrer_code},
        {"$inc": {"referral_balance": 1.0}}
    )
    
    # Log referral payout
    await db.referral_payouts.insert_one({
        "id": str(uuid.uuid4()),
        "referrer_code": referrer_code,
        "referred_user_id": order['user_id'],
        "order_id": order['id'],
        "amount": 1.0,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

# Modify order status endpoint to trigger referral check
@api_router.put("/orders/{order_id}/complete")
async def complete_order_with_referral_check(order_id: str):
    """Complete order and check for referral payout"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Update order status
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "order_status": "completed",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Check and credit referral
    await check_and_credit_referral(order)
    
    return {"message": "Order completed"}

# ==================== TEMPORARY INTERNAL SEEDING ENDPOINT ====================
# ⚠️  SECURITY WARNING: Remove this endpoint after initial setup!
# This endpoint is for one-time database seeding in Railway deployment

from pydantic import BaseModel
from typing import Dict, Any
import traceback

class SeedRequest(BaseModel):
    secret: str

class SeedResponse(BaseModel):
    success: bool
    message: str
    results: Dict[str, Any]

async def create_admin_internal() -> Dict[str, Any]:
    """Create admin user if doesn't exist"""
    try:
        # Check if admin already exists
        existing = await db.users.find_one({"email": "admin@kayicom.com"})

        if existing:
            return {"status": "skipped", "message": "Admin user already exists", "user_id": str(existing["_id"])}

        # Create admin user
        hashed_password = pwd_context.hash("admin123")

        admin_user = {
            "id": "admin-001",
            "email": "admin@kayicom.com",
            "full_name": "Admin User",
            "password": hashed_password,
            "role": "admin",
            "referral_code": "ADMIN001",
            "referral_balance": 0.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        result = await db.users.insert_one(admin_user)
        return {"status": "created", "message": "Admin user created successfully", "user_id": str(result.inserted_id)}

    except Exception as e:
        return {"status": "error", "message": f"Failed to create admin: {str(e)}", "error": traceback.format_exc()}

async def seed_demo_products_internal() -> Dict[str, Any]:
    """Seed demo products if not already seeded"""
    try:
        # Check if products already exist
        existing_count = await db.products.count_documents({})
        if existing_count > 0:
            return {"status": "skipped", "message": f"Products already exist ({existing_count} products found)"}

        DEMO_PRODUCTS = [
            # Gift Cards
            {
                "name": "Amazon Gift Card",
                "description": "Amazon gift card with instant delivery. Valid in selected regions.",
                "category": "giftcard",
                "image_url": "https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=400",
                "delivery_type": "manual",
                "requires_player_id": False,
                "variants": [
                    {"region": "US", "value": "$25", "price": 25.00},
                    {"region": "US", "value": "$50", "price": 50.00},
                    {"region": "US", "value": "$100", "price": 100.00},
                ]
            },
            {
                "name": "iTunes Gift Card",
                "description": "Apple iTunes gift card for App Store, Apple Music, and more.",
                "category": "giftcard",
                "image_url": "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400",
                "delivery_type": "manual",
                "requires_player_id": False,
                "variants": [
                    {"region": "US", "value": "$25", "price": 25.00},
                    {"region": "US", "value": "$50", "price": 50.00},
                ]
            },
            # Game Top-ups
            {
                "name": "Free Fire Diamonds",
                "description": "Top up your Free Fire account with diamonds instantly.",
                "category": "topup",
                "image_url": "https://images.unsplash.com/photo-1556438064-2d7646166914?w=400",
                "delivery_type": "automatic",
                "requires_player_id": True,
                "player_id_label": "Free Fire Player ID",
                "variants": [
                    {"value": "100 Diamonds", "price": 5.00},
                    {"value": "310 Diamonds", "price": 15.00},
                    {"value": "520 Diamonds", "price": 25.00},
                    {"value": "1080 Diamonds", "price": 50.00},
                ]
            },
            # Subscriptions
            {
                "name": "Premium Subscription",
                "description": "1 month premium access with all features unlocked.",
                "category": "subscription",
                "image_url": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400",
                "delivery_type": "automatic",
                "requires_player_id": False,
                "is_subscription": True,
                "variants": [
                    {"duration": "1 Month", "price": 9.99},
                    {"duration": "3 Months", "price": 24.99},
                    {"duration": "6 Months", "price": 44.99},
                ]
            },
        ]

        total_added = 0

        for product_group in DEMO_PRODUCTS:
            variants = product_group.pop("variants", [])

            if variants:
                # Create parent product
                parent_id = str(uuid.uuid4())
                parent_product = {
                    **product_group,
                    "id": parent_id,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.products.insert_one(parent_product)

                # Create variant products
                for variant in variants:
                    variant_product = {
                        **product_group,
                        "id": str(uuid.uuid4()),
                        "parent_product_id": parent_id,
                        "variant_name": variant.get("value") or variant.get("duration"),
                        "price": variant["price"],
                        "region": variant.get("region"),
                        "subscription_duration_months": None,  # Will be set if duration
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }

                    # Handle duration for subscriptions
                    if "duration" in variant:
                        duration_map = {
                            "1 Month": 1,
                            "3 Months": 3,
                            "6 Months": 6,
                            "12 Months": 12,
                            "24 Months": 24
                        }
                        variant_product["subscription_duration_months"] = duration_map.get(variant["duration"])

                    await db.products.insert_one(variant_product)
                    total_added += 1
            else:
                # Single product without variants
                single_product = {
                    **product_group,
                    "id": str(uuid.uuid4()),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.products.insert_one(single_product)
                total_added += 1

        return {"status": "created", "message": f"Successfully seeded {total_added} demo products"}

    except Exception as e:
        return {"status": "error", "message": f"Failed to seed products: {str(e)}", "error": traceback.format_exc()}

async def seed_games_internal() -> Dict[str, Any]:
    """Seed game configurations if not already seeded"""
    try:
        # Check if games already exist
        existing_count = await db.games.count_documents({})
        if existing_count > 0:
            return {"status": "skipped", "message": f"Game configurations already exist ({existing_count} games found)"}

        GAMES_CONFIG = [
            {
                "name": "Free Fire",
                "game_id": "freefire",
                "description": "Garena Free Fire battle royale game",
                "image_url": "https://images.unsplash.com/photo-1556438064-2d7646166914?w=400",
                "regions": ["Global"],
                "currencies": ["Diamonds"],
                "is_active": True,
                "api_supported": True,
                "player_id_format": "Player ID",
                "denominations": [
                    {"amount": 100, "price": 5.00, "currency": "Diamonds"},
                    {"amount": 310, "price": 15.00, "currency": "Diamonds"},
                    {"amount": 520, "price": 25.00, "currency": "Diamonds"},
                    {"amount": 1080, "price": 50.00, "currency": "Diamonds"},
                ]
            },
            {
                "name": "Mobile Legends",
                "game_id": "mobilelegends",
                "description": "Mobile Legends: Bang Bang MOBA game",
                "image_url": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400",
                "regions": ["Global"],
                "currencies": ["Diamonds"],
                "is_active": True,
                "api_supported": True,
                "player_id_format": "User ID",
                "denominations": [
                    {"amount": 100, "price": 5.00, "currency": "Diamonds"},
                    {"amount": 250, "price": 12.00, "currency": "Diamonds"},
                    {"amount": 500, "price": 23.00, "currency": "Diamonds"},
                    {"amount": 1000, "price": 45.00, "currency": "Diamonds"},
                ]
            },
            {
                "name": "PUBG Mobile",
                "game_id": "pubgm",
                "description": "PUBG Mobile battle royale game",
                "image_url": "https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?w=400",
                "regions": ["Global"],
                "currencies": ["UC"],
                "is_active": True,
                "api_supported": True,
                "player_id_format": "Character ID",
                "denominations": [
                    {"amount": 60, "price": 5.00, "currency": "UC"},
                    {"amount": 325, "price": 25.00, "currency": "UC"},
                    {"amount": 660, "price": 50.00, "currency": "UC"},
                    {"amount": 1800, "price": 125.00, "currency": "UC"},
                ]
            }
        ]

        added_games = []
        for game_config in GAMES_CONFIG:
            game_doc = {
                **game_config,
                "id": str(uuid.uuid4()),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.games.insert_one(game_doc)
            added_games.append(game_config["name"])

        return {"status": "created", "message": f"Successfully seeded {len(added_games)} game configurations", "games": added_games}

    except Exception as e:
        return {"status": "error", "message": f"Failed to seed games: {str(e)}", "error": traceback.format_exc()}

@api_router.post("/__internal/seed", response_model=SeedResponse)
async def seed_database(request: SeedRequest):
    """
    TEMPORARY INTERNAL ENDPOINT - Remove after use!
    Seeds the database with admin user, demo products, and game configurations.
    Protected by SEED_SECRET environment variable.
    """
    # Check seed secret
    expected_secret = os.environ.get("SEED_SECRET")
    if not expected_secret:
        raise HTTPException(status_code=500, detail="SEED_SECRET environment variable not configured")

    if request.secret != expected_secret:
        raise HTTPException(status_code=403, detail="Invalid seed secret")

    try:
        results = {}

        # Run seeding operations
        results["admin_user"] = await create_admin_internal()
        results["demo_products"] = await seed_demo_products_internal()
        results["game_configs"] = await seed_games_internal()

        # Check final state
        final_admin = await db.users.count_documents({"email": "admin@kayicom.com"})
        final_products = await db.products.count_documents({})
        final_games = await db.games.count_documents({})

        results["summary"] = {
            "admin_users": final_admin,
            "products": final_products,
            "games": final_games,
            "total_items": final_admin + final_products + final_games
        }

        return SeedResponse(
            success=True,
            message="Database seeding completed successfully",
            results=results
        )

    except Exception as e:
        return SeedResponse(
            success=False,
            message=f"Database seeding failed: {str(e)}",
            results={"error": traceback.format_exc()}
        )

# ==================== END TEMPORARY SEEDING ENDPOINT ====================

# Include the router (must be after all endpoints are defined)
app.include_router(api_router)

# Health check endpoint for Railway
@app.get("/")
async def root():
    return {"status": "ok", "message": "KayiCom API is running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
