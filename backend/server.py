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
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
    wallet_balance: float = 0.0  # Store credit / refunds
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
    player_id_label: Optional[str] = None  # Custom label: UID, Character ID, etc
    requires_credentials: bool = False  # For subscription/services that need login credentials
    credential_fields: Optional[List[str]] = None  # e.g. ["email","password"]
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
    player_id_label: Optional[str] = None
    requires_credentials: bool = False
    credential_fields: Optional[List[str]] = None
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
    player_id_label: Optional[str] = None
    requires_credentials: Optional[bool] = None
    credential_fields: Optional[List[str]] = None
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
    credentials: Optional[Dict[str, str]] = None  # For subscription/services (email/password, etc)

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    items: List[OrderItem]
    total_amount: float
    subtotal_amount: Optional[float] = None
    discount_amount: Optional[float] = None
    coupon_code: Optional[str] = None
    coupon_usage_recorded: Optional[bool] = None
    currency: str = "USD"
    payment_method: str  # wallet, crypto_plisio, paypal, skrill, moncash, binance_pay, zelle, cashapp
    payment_status: str = "pending"  # pending, paid, failed, cancelled
    order_status: str = "pending"  # pending, processing, completed, cancelled
    payment_proof_url: Optional[str] = None
    transaction_id: Optional[str] = None
    plisio_invoice_id: Optional[str] = None
    plisio_invoice_url: Optional[str] = None
    delivery_info: Optional[Dict[str, Any]] = None
    refunded_at: Optional[datetime] = None
    refunded_amount: Optional[float] = None
    subscription_end_date: Optional[datetime] = None  # For subscription orders
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    items: List[OrderItem]
    payment_method: str
    coupon_code: Optional[str] = None


# ==================== COUPON MODELS ====================

class Coupon(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    discount_type: str  # percent or fixed
    discount_value: float
    active: bool = True
    min_order_amount: float = 0.0
    usage_limit: Optional[int] = None
    used_count: int = 0
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CouponCreate(BaseModel):
    code: str
    discount_type: str  # percent or fixed
    discount_value: float
    active: bool = True
    min_order_amount: float = 0.0
    usage_limit: Optional[int] = None
    expires_at: Optional[datetime] = None

class CouponUpdate(BaseModel):
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    active: Optional[bool] = None
    min_order_amount: Optional[float] = None
    usage_limit: Optional[int] = None
    expires_at: Optional[datetime] = None

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
    resend_from_email: Optional[str] = None  # e.g. "KayiCom <no-reply@yourdomain.com>"
    announcement_enabled: Optional[bool] = False
    announcement_message: Optional[str] = None
    trustpilot_enabled: Optional[bool] = False
    trustpilot_business_id: Optional[str] = None
    product_categories: Optional[List[str]] = ["giftcard", "topup", "subscription", "service"]
    # Payment Gateway Settings
    payment_gateways: Optional[dict] = {
        "paypal": {"enabled": True, "email": "", "instructions": ""},
        "airtm": {"enabled": True, "email": "", "instructions": ""},
        "skrill": {"enabled": True, "email": "", "instructions": ""},
        "moncash": {"enabled": True, "email": "", "instructions": ""},
        "binance_pay": {"enabled": True, "email": "", "instructions": ""},
        "zelle": {"enabled": True, "email": "", "instructions": ""},
        "cashapp": {"enabled": True, "email": "", "instructions": ""},
        # Legacy key kept for backwards compatibility
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
    resend_from_email: Optional[str] = None
    announcement_enabled: Optional[bool] = None
    announcement_message: Optional[str] = None
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
async def get_products(category: Optional[str] = None, parent_product_id: Optional[str] = None):
    query = {}
    if category:
        query['category'] = category
    if parent_product_id:
        query['parent_product_id'] = parent_product_id
    
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


# ==================== COUPON ENDPOINTS ====================

def _normalize_coupon_code(code: str) -> str:
    return (code or "").strip().upper()

async def _get_valid_coupon(code: str, order_amount: float) -> Optional[dict]:
    """Return coupon doc if valid for given amount, else None."""
    normalized = _normalize_coupon_code(code)
    if not normalized:
        return None

    coupon = await db.coupons.find_one({"code": normalized}, {"_id": 0})
    if not coupon:
        return None
    if not coupon.get("active", True):
        return None
    expires_at = coupon.get("expires_at")
    if isinstance(expires_at, str):
        try:
            expires_at = datetime.fromisoformat(expires_at)
        except Exception:
            expires_at = None
    if expires_at and expires_at < datetime.now(timezone.utc):
        return None
    if float(order_amount) < float(coupon.get("min_order_amount", 0.0)):
        return None
    usage_limit = coupon.get("usage_limit")
    if usage_limit is not None and int(coupon.get("used_count", 0)) >= int(usage_limit):
        return None
    return coupon

def _calculate_discount(coupon: dict, subtotal: float) -> float:
    discount_type = coupon.get("discount_type")
    value = float(coupon.get("discount_value", 0.0))
    if value <= 0:
        return 0.0
    if discount_type == "percent":
        return max(0.0, min(subtotal, subtotal * (value / 100.0)))
    if discount_type == "fixed":
        return max(0.0, min(subtotal, value))
    return 0.0

async def _record_coupon_usage_if_needed(order_id: str):
    """Increment coupon usage once per paid order."""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        return
    code = _normalize_coupon_code(order.get("coupon_code"))
    if not code:
        return
    if order.get("coupon_usage_recorded"):
        return
    if order.get("payment_status") != "paid":
        return

    coupon = await db.coupons.find_one({"code": code}, {"_id": 0})
    if not coupon:
        # Still mark recorded to avoid retry loops
        await db.orders.update_one({"id": order_id}, {"$set": {"coupon_usage_recorded": True}})
        return

    usage_limit = coupon.get("usage_limit")
    if usage_limit is not None and int(coupon.get("used_count", 0)) >= int(usage_limit):
        # Coupon exhausted; keep order as-is but mark recorded to avoid retry loops
        await db.orders.update_one({"id": order_id}, {"$set": {"coupon_usage_recorded": True}})
        return

    await db.coupons.update_one({"code": code}, {"$inc": {"used_count": 1}})
    await db.orders.update_one({"id": order_id}, {"$set": {"coupon_usage_recorded": True}})

@api_router.get("/coupons/validate")
async def validate_coupon(code: str, amount: float):
    coupon = await _get_valid_coupon(code, amount)
    if not coupon:
        raise HTTPException(status_code=400, detail="Invalid coupon")
    discount = _calculate_discount(coupon, float(amount))
    return {
        "code": coupon["code"],
        "discount_amount": discount,
        "total_after_discount": float(amount) - discount
    }

@api_router.get("/coupons", response_model=List[Coupon])
async def list_coupons():
    coupons = await db.coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for c in coupons:
        if isinstance(c.get("created_at"), str):
            c["created_at"] = datetime.fromisoformat(c["created_at"])
        if isinstance(c.get("expires_at"), str):
            try:
                c["expires_at"] = datetime.fromisoformat(c["expires_at"])
            except Exception:
                c["expires_at"] = None
    return coupons

@api_router.post("/coupons", response_model=Coupon)
async def create_coupon(data: CouponCreate):
    code = _normalize_coupon_code(data.code)
    if not code:
        raise HTTPException(status_code=400, detail="Coupon code required")
    if data.discount_type not in ["percent", "fixed"]:
        raise HTTPException(status_code=400, detail="Invalid discount_type")
    if data.discount_value <= 0:
        raise HTTPException(status_code=400, detail="discount_value must be > 0")

    existing = await db.coupons.find_one({"code": code})
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")

    coupon = Coupon(
        code=code,
        discount_type=data.discount_type,
        discount_value=float(data.discount_value),
        active=bool(data.active),
        min_order_amount=float(data.min_order_amount or 0.0),
        usage_limit=data.usage_limit,
        expires_at=data.expires_at,
    )
    doc = coupon.model_dump()
    doc["created_at"] = coupon.created_at.isoformat()
    if coupon.expires_at:
        doc["expires_at"] = coupon.expires_at.isoformat()
    await db.coupons.insert_one(doc)
    return coupon

@api_router.put("/coupons/{coupon_id}", response_model=Coupon)
async def update_coupon(coupon_id: str, updates: CouponUpdate):
    existing = await db.coupons.find_one({"id": coupon_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Coupon not found")

    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if "discount_type" in update_data and update_data["discount_type"] not in ["percent", "fixed"]:
        raise HTTPException(status_code=400, detail="Invalid discount_type")
    if "discount_value" in update_data and float(update_data["discount_value"]) <= 0:
        raise HTTPException(status_code=400, detail="discount_value must be > 0")

    # Convert dates to isoformat for storage
    if "expires_at" in update_data and isinstance(update_data["expires_at"], datetime):
        update_data["expires_at"] = update_data["expires_at"].isoformat()

    await db.coupons.update_one({"id": coupon_id}, {"$set": update_data})
    updated = await db.coupons.find_one({"id": coupon_id}, {"_id": 0})
    if isinstance(updated.get("created_at"), str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    if isinstance(updated.get("expires_at"), str):
        try:
            updated["expires_at"] = datetime.fromisoformat(updated["expires_at"])
        except Exception:
            updated["expires_at"] = None
    return updated

@api_router.delete("/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str):
    res = await db.coupons.delete_one({"id": coupon_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return {"message": "Coupon deleted"}

# ==================== ORDER ENDPOINTS ====================

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, user_id: str, user_email: str):
    # Validate items & calculate total using authoritative product pricing/settings
    validated_items: List[OrderItem] = []
    subtotal = 0.0
    for item in order_data.items:
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=400, detail=f"Invalid product_id: {item.product_id}")

        quantity = int(item.quantity)
        if quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be at least 1")

        # Required fields validation
        if product.get("requires_player_id") and not (item.player_id and str(item.player_id).strip()):
            label = product.get("player_id_label") or "Player ID"
            raise HTTPException(status_code=400, detail=f"{label} is required for {product.get('name')}")

        if product.get("requires_credentials"):
            creds = item.credentials or {}
            required_fields = product.get("credential_fields") or ["email", "password"]
            missing = [f for f in required_fields if not (creds.get(f) and str(creds.get(f)).strip())]
            if missing:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing credentials fields for {product.get('name')}: {', '.join(missing)}"
                )

        price = float(product.get("price", item.price))
        subtotal += price * quantity

        validated_items.append(
            OrderItem(
                product_id=product["id"],
                product_name=product.get("name", item.product_name),
                quantity=quantity,
                price=price,
                player_id=item.player_id,
                credentials=item.credentials,
            )
        )
    
    # Apply coupon (if any)
    coupon_code = _normalize_coupon_code(order_data.coupon_code) if order_data.coupon_code else None
    discount_amount = 0.0
    if coupon_code:
        coupon = await _get_valid_coupon(coupon_code, subtotal)
        if not coupon:
            raise HTTPException(status_code=400, detail="Invalid coupon")
        discount_amount = _calculate_discount(coupon, subtotal)

    total = max(0.0, float(subtotal) - float(discount_amount))

    order = Order(
        user_id=user_id,
        user_email=user_email,
        items=validated_items,
        subtotal_amount=subtotal,
        discount_amount=discount_amount if discount_amount > 0 else None,
        coupon_code=coupon_code,
        coupon_usage_recorded=False if coupon_code else None,
        total_amount=total,
        payment_method=order_data.payment_method
    )

    # Wallet payment: instantly mark paid and deduct balance
    if order_data.payment_method == "wallet":
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        wallet_balance = float(user.get("wallet_balance", 0.0))
        if wallet_balance + 1e-9 < total:
            raise HTTPException(status_code=400, detail="Insufficient wallet balance")

        await db.users.update_one({"id": user_id}, {"$inc": {"wallet_balance": -float(total)}})
        await db.wallet_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_email": user_email,
            "order_id": order.id,
            "type": "purchase",
            "amount": -float(total),
            "reason": "Order payment (wallet)",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        order.payment_status = "paid"
        order.order_status = "processing"
    
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
                    currency="USDT",
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
        if isinstance(order.get('refunded_at'), str):
            order['refunded_at'] = datetime.fromisoformat(order['refunded_at'])
        if isinstance(order.get('subscription_end_date'), str):
            order['subscription_end_date'] = datetime.fromisoformat(order['subscription_end_date'])
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
    if isinstance(order.get('refunded_at'), str):
        order['refunded_at'] = datetime.fromisoformat(order['refunded_at'])
    if isinstance(order.get('subscription_end_date'), str):
        order['subscription_end_date'] = datetime.fromisoformat(order['subscription_end_date'])
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

    # Record coupon usage once payment is marked as paid
    if payment_status == "paid":
        await _record_coupon_usage_if_needed(order_id)

    # If order is completed, trigger referral payout check (idempotent)
    if order_status == "completed":
        order = await db.orders.find_one({"id": order_id})
        if order:
            await check_and_credit_referral(order)
    
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
        # First try normal orders
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if order:
            await db.orders.update_one(
                {"id": order_id},
                {"$set": {
                    "payment_status": "paid",
                    "order_status": "processing",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            await _record_coupon_usage_if_needed(order_id)
        else:
            # Then try wallet topups
            topup = await db.wallet_topups.find_one({"id": order_id}, {"_id": 0})
            if topup:
                await db.wallet_topups.update_one(
                    {"id": order_id},
                    {"$set": {
                        "payment_status": "paid",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                if not topup.get("credited"):
                    await db.users.update_one({"id": topup["user_id"]}, {"$inc": {"wallet_balance": float(topup["amount"])}})
                    await db.wallet_transactions.insert_one({
                        "id": str(uuid.uuid4()),
                        "user_id": topup["user_id"],
                        "user_email": topup.get("user_email"),
                        "order_id": None,
                        "type": "topup",
                        "amount": float(topup["amount"]),
                        "reason": f"Wallet topup {order_id} (Plisio)",
                        "created_at": datetime.now(timezone.utc).isoformat()
                    })
                    await db.wallet_topups.update_one({"id": order_id}, {"$set": {"credited": True}})
    
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

    # Never expose secret keys to clients
    for secret_field in ["plisio_api_key", "mtcgame_api_key", "gosplit_api_key", "z2u_api_key", "resend_api_key"]:
        if secret_field in settings:
            settings[secret_field] = None
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

    resend_from = settings.get("resend_from_email") or settings.get("support_email")
    if not resend_from:
        raise HTTPException(status_code=400, detail="Resend from email not configured")
    
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
    
    # Send emails via Resend API (send individually to avoid leaking recipient list)
    resend_api_key = settings["resend_api_key"]
    headers = {
        "Authorization": f"Bearer {resend_api_key}",
        "Content-Type": "application/json",
    }

    sent_count = 0
    failed: List[Dict[str, Any]] = []
    for recipient in recipients:
        try:
            resp = requests.post(
                "https://api.resend.com/emails",
                headers=headers,
                json={
                    "from": resend_from,
                    "to": [recipient],
                    "subject": email_data.subject,
                    "html": f"<div style='font-family:Arial,sans-serif;white-space:pre-wrap'>{email_data.message}</div>",
                },
                timeout=20,
            )
            if 200 <= resp.status_code < 300:
                sent_count += 1
            else:
                failed.append({"email": recipient, "status": resp.status_code, "error": resp.text[:300]})
        except Exception as e:
            failed.append({"email": recipient, "status": None, "error": str(e)[:300]})

    return {
        "message": f"Bulk email sent to {sent_count} recipients",
        "sent_count": sent_count,
        "failed_count": len(failed),
        "failed": failed[:20],
        "recipients_preview": recipients[:10] if len(recipients) > 10 else recipients
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
    crypto_settings = (settings or {}).get('crypto_settings') or {}
    if crypto_settings:
        config['crypto_settings'] = crypto_settings

    # Compatibility fields expected by frontend (CryptoPage)
    # Prefer site_settings.crypto_settings, fallback to crypto_config defaults.
    config['buy_rate_usdt'] = float(crypto_settings.get('buy_rate_usdt', config.get('buy_rate_bep20', 1.02)))
    config['sell_rate_usdt'] = float(crypto_settings.get('sell_rate_usdt', config.get('sell_rate_bep20', 0.98)))
    config['transaction_fee_percent'] = float(crypto_settings.get('transaction_fee_percent', config.get('buy_fee_percent', 2.0)))
    config['min_transaction_usd'] = float(crypto_settings.get('min_transaction_usd', config.get('min_buy_usd', 10.0)))
    
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
    crypto_settings = (settings or {}).get("crypto_settings") or {}
    
    # For BUY USDT, customer pays with FIAT (PayPal, AirTM, Skrill)
    # No need for Plisio - just show admin payment info
    
    # Check limits (prefer site_settings.crypto_settings)
    min_usd = float(crypto_settings.get('min_transaction_usd', config.get('min_buy_usd', config.get('min_transaction_usd', 10.0))))
    max_usd = float(config.get('max_buy_usd', 10000.0))
    if request.amount_usd < min_usd or request.amount_usd > max_usd:
        raise HTTPException(status_code=400, detail=f"Amount must be between ${min_usd} and ${max_usd}")
    
    # Get rate
    rate_key = f"buy_rate_{request.chain.lower()}"
    exchange_rate = float(crypto_settings.get("buy_rate_usdt", config.get(rate_key, config.get("buy_rate_usdt", 1.02))))
    
    # Calculate
    amount_crypto = request.amount_usd / exchange_rate
    fee_percent = float(crypto_settings.get('transaction_fee_percent', config.get('buy_fee_percent', config.get('transaction_fee_percent', 2.0))))
    fee = request.amount_usd * (fee_percent / 100)
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
    
    settings = await db.settings.find_one({"id": "site_settings"}, {"_id": 0})
    crypto_settings = (settings or {}).get("crypto_settings") or {}
    
    # Check limits
    min_sell = float(config.get('min_sell_usdt', 10.0))
    max_sell = float(config.get('max_sell_usdt', 10000.0))
    if request.amount_crypto < min_sell or request.amount_crypto > max_sell:
        raise HTTPException(status_code=400, detail=f"Amount must be between {min_sell} and {max_sell} USDT")
    
    # Get rate
    rate_key = f"sell_rate_{request.chain.lower()}"
    exchange_rate = float(crypto_settings.get("sell_rate_usdt", config.get(rate_key, config.get("sell_rate_usdt", 0.98))))
    
    # Calculate
    amount_usd = request.amount_crypto * exchange_rate
    fee_percent = float(crypto_settings.get('transaction_fee_percent', config.get('sell_fee_percent', config.get('transaction_fee_percent', 2.0))))
    fee = amount_usd * (fee_percent / 100)
    total_usd = amount_usd - fee
    
    transaction_id = str(uuid.uuid4())
    
    # Create Plisio invoice for receiving USDT from customer
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
        admin_wallets = crypto_settings.get("wallets") or {}
        response['wallet_address'] = admin_wallets.get(request.chain) or config.get(f"wallet_{request.chain.lower()}")
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
    # Only for paid + completed orders
    if order.get("payment_status") != "paid" or order.get("order_status") != "completed":
        return

    # Idempotency: don't pay twice for same order
    already_paid = await db.referral_payouts.find_one({"order_id": order.get("id")})
    if already_paid:
        return

    # Check if user was referred
    user = await db.users.find_one({"id": order['user_id']})
    if not user or not user.get('referred_by'):
        return
    
    # Check if order contains subscription
    subscription_product_ids: List[str] = []
    for item in order.get('items', []):
        product = await db.products.find_one({"id": item.get('product_id')})
        if product and product.get('is_subscription'):
            subscription_product_ids.append(product.get("id"))

    if not subscription_product_ids:
        return
    
    # Check if this is the first PAID+COMPLETED subscription order for this referred user
    prior_payout = await db.referral_payouts.find_one({"referred_user_id": order['user_id']})
    if prior_payout:
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


# ==================== WALLET (STORE CREDIT) ENDPOINTS ====================

class WalletAdjustment(BaseModel):
    amount: float
    reason: Optional[str] = None

class WalletTopupCreate(BaseModel):
    amount: float
    payment_method: str  # crypto_plisio or manual gateways

class WalletTopupProof(BaseModel):
    topup_id: str
    transaction_id: str
    payment_proof_url: str

@api_router.get("/wallet/balance")
async def get_wallet_balance(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user_id": user_id, "wallet_balance": float(user.get("wallet_balance", 0.0))}

@api_router.get("/wallet/transactions")
async def get_wallet_transactions(user_id: str):
    txs = await db.wallet_transactions.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return txs

@api_router.post("/wallet/topups")
async def create_wallet_topup(topup: WalletTopupCreate, user_id: str, user_email: str):
    if float(topup.amount) <= 0:
        raise HTTPException(status_code=400, detail="Amount must be > 0")

    settings = await db.settings.find_one({"id": "site_settings"}, {"_id": 0}) or {}

    topup_id = str(uuid.uuid4())
    doc = {
        "id": topup_id,
        "user_id": user_id,
        "user_email": user_email,
        "amount": float(topup.amount),
        "payment_method": topup.payment_method,
        "payment_status": "pending",
        "transaction_id": None,
        "payment_proof_url": None,
        "plisio_invoice_id": None,
        "plisio_invoice_url": None,
        "credited": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    # If crypto payment, create Plisio invoice
    if topup.payment_method == "crypto_plisio" and settings.get("plisio_api_key"):
        try:
            plisio = PlisioHelper(settings["plisio_api_key"])
            invoice_response = await plisio.create_invoice(
                amount=float(topup.amount),
                currency="USDT",
                order_name=f"Wallet Topup {topup_id}",
                order_number=topup_id,
                email=user_email,
            )
            if invoice_response.get("success"):
                doc["plisio_invoice_id"] = invoice_response.get("invoice_id")
                doc["plisio_invoice_url"] = invoice_response.get("invoice_url")
        except Exception as e:
            logging.error(f"Plisio topup error: {e}")

    await db.wallet_topups.insert_one(doc)

    # Attach payment instructions for manual methods (optional)
    payment_info = {}
    gateways = settings.get("payment_gateways") or {}
    gateway = gateways.get(topup.payment_method) or {}
    if gateway.get("enabled"):
        payment_info = {
            "method": topup.payment_method,
            "email": gateway.get("email", ""),
            "instructions": gateway.get("instructions", "")
        }

    return {"topup": doc, "payment_info": payment_info}

@api_router.get("/wallet/topups/user/{user_id}")
async def get_user_wallet_topups(user_id: str):
    topups = await db.wallet_topups.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return topups

@api_router.get("/wallet/topups/all")
async def get_all_wallet_topups():
    topups = await db.wallet_topups.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return topups

@api_router.post("/wallet/topups/proof")
async def submit_wallet_topup_proof(proof: WalletTopupProof):
    res = await db.wallet_topups.update_one(
        {"id": proof.topup_id},
        {"$set": {
            "transaction_id": proof.transaction_id,
            "payment_proof_url": proof.payment_proof_url,
            "payment_status": "pending_verification",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Topup not found")
    return {"message": "Topup proof submitted"}

@api_router.put("/wallet/topups/{topup_id}/status")
async def update_wallet_topup_status(topup_id: str, payment_status: str):
    if payment_status not in ["paid", "failed", "rejected", "processing"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    topup = await db.wallet_topups.find_one({"id": topup_id}, {"_id": 0})
    if not topup:
        raise HTTPException(status_code=404, detail="Topup not found")

    await db.wallet_topups.update_one(
        {"id": topup_id},
        {"$set": {"payment_status": payment_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    # Credit wallet once when marked paid
    if payment_status == "paid" and not topup.get("credited"):
        await db.users.update_one({"id": topup["user_id"]}, {"$inc": {"wallet_balance": float(topup["amount"])}})
        await db.wallet_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": topup["user_id"],
            "user_email": topup.get("user_email"),
            "order_id": None,
            "type": "topup",
            "amount": float(topup["amount"]),
            "reason": f"Wallet topup {topup_id}",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        await db.wallet_topups.update_one({"id": topup_id}, {"$set": {"credited": True}})

    return {"message": "Topup updated"}

@api_router.post("/orders/{order_id}/refund")
async def refund_order_to_wallet(order_id: str, adjustment: WalletAdjustment):
    """
    Refund an order to the user's wallet (store credit).
    This is intended for admin use (no auth implemented in this project).
    """
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.get("refunded_at"):
        raise HTTPException(status_code=400, detail="Order already refunded")

    if float(adjustment.amount) <= 0:
        raise HTTPException(status_code=400, detail="Refund amount must be > 0")

    user_id = order.get("user_id")
    user_email = order.get("user_email")

    # Credit wallet
    await db.users.update_one({"id": user_id}, {"$inc": {"wallet_balance": float(adjustment.amount)}})
    await db.wallet_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_email": user_email,
        "order_id": order_id,
        "type": "refund",
        "amount": float(adjustment.amount),
        "reason": adjustment.reason or "Order refund",
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    # Update order
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "order_status": "cancelled",
            "payment_status": "cancelled",
            "refunded_amount": float(adjustment.amount),
            "refunded_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    return {"message": "Refunded to wallet", "user_id": user_id, "amount": float(adjustment.amount)}

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

# Include the router (must be after all endpoints are defined)
app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
