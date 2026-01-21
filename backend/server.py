from fastapi import FastAPI, APIRouter, HTTPException, Query, Response, Request, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
import bcrypt
import jwt
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production-' + str(uuid.uuid4()))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7

# Create the main app without a prefix
app = FastAPI(title="Sistema de Gestão de Vendas")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============ AUTH MODELS ============
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    auth_provider: str = "email"  # "email" or "google"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None

# ============ BUSINESS MODELS ============
class BillStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float
    cost: float = 0.0
    stock: int = 0
    user_id: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    price: float
    cost: float = 0.0
    stock: int = 0

class Sale(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    product_name: str
    quantity: int
    unit_price: float
    total: float
    profit: float = 0.0
    user_id: str = ""
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SaleCreate(BaseModel):
    product_id: str
    quantity: int
    date: Optional[datetime] = None

class Bill(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str
    amount: float
    status: BillStatus = BillStatus.PENDING
    due_date: datetime
    paid_date: Optional[datetime] = None
    user_id: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BillCreate(BaseModel):
    description: str
    amount: float
    due_date: datetime
    status: BillStatus = BillStatus.PENDING

class BillUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[float] = None
    status: Optional[BillStatus] = None
    due_date: Optional[datetime] = None

class DashboardStats(BaseModel):
    sales_today: float
    sales_month: float
    bills_to_pay: float
    bills_paid: float
    profit_month: float
    sales_count_today: int
    sales_count_month: int

class TopProduct(BaseModel):
    product_id: str
    product_name: str
    quantity_sold: int
    total_revenue: float

class DailySales(BaseModel):
    date: str
    total: float
    count: int

# ============ AUTH HELPERS ============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    payload = {
        "user_id": user_id,
        "exp": expires,
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

async def get_current_user(request: Request) -> User:
    """Get current user from session_token cookie or Authorization header"""
    # Try cookie first
    session_token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    
    # Check session in database
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Sessão inválida")
    
    # Check expiry
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sessão expirada")
    
    # Get user
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return User(**user)

# Helper functions
def get_start_of_day():
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)

def get_start_of_month():
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

def get_start_of_week():
    now = datetime.now(timezone.utc)
    start_of_week = now - timedelta(days=now.weekday())
    return start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Sistema de Gestão de Vendas API", "version": "1.0.0"}

# ============ AUTH ENDPOINTS ============
@api_router.post("/auth/register")
async def register(input: UserCreate, response: Response):
    """Register new user with email and password"""
    # Check if user exists
    existing = await db.users.find_one({"email": input.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = hash_password(input.password)
    
    user_doc = {
        "user_id": user_id,
        "email": input.email,
        "name": input.name,
        "password_hash": hashed_password,
        "picture": None,
        "auth_provider": "email",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60
    )
    
    return {
        "user_id": user_id,
        "email": input.email,
        "name": input.name,
        "picture": None
    }

@api_router.post("/auth/login")
async def login(input: UserLogin, response: Response):
    """Login with email and password"""
    user = await db.users.find_one({"email": input.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    if user.get("auth_provider") == "google":
        raise HTTPException(status_code=400, detail="Esta conta usa login com Google")
    
    if not verify_password(input.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60
    )
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "picture": user.get("picture")
    }

@api_router.post("/auth/google/session")
async def google_session(request: Request, response: Response):
    """Exchange Google session_id for local session"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id é obrigatório")
    
    # Call Emergent Auth API
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=10.0
            )
            
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Sessão Google inválida")
            
            google_data = auth_response.json()
        except httpx.RequestError:
            raise HTTPException(status_code=500, detail="Erro ao validar sessão Google")
    
    email = google_data.get("email")
    name = google_data.get("name")
    picture = google_data.get("picture")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info if needed
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60
    )
    
    return {
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": picture
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return UserResponse(
        user_id=current_user.user_id,
        email=current_user.email,
        name=current_user.name,
        picture=current_user.picture
    )

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user and clear session"""
    session_token = request.cookies.get("session_token")
    
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(
        key="session_token",
        path="/",
        secure=True,
        samesite="none"
    )
    
    return {"message": "Logout realizado com sucesso"}

# ============ PRODUCTS ENDPOINTS ============
@api_router.post("/products", response_model=Product)
async def create_product(input: ProductCreate, current_user: User = Depends(get_current_user)):
    product = Product(**input.model_dump(), user_id=current_user.user_id)
    doc = product.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.products.insert_one(doc)
    return product

@api_router.get("/products", response_model=List[Product])
async def get_products(current_user: User = Depends(get_current_user)):
    products = await db.products.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(500)
    for p in products:
        if isinstance(p.get('created_at'), str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
    return products

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: User = Depends(get_current_user)):
    result = await db.products.delete_one({"id": product_id, "user_id": current_user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return {"message": "Produto excluído com sucesso"}

# ============ SALES ENDPOINTS ============
@api_router.post("/sales", response_model=Sale)
async def create_sale(input: SaleCreate, current_user: User = Depends(get_current_user)):
    product = await db.products.find_one({"id": input.product_id, "user_id": current_user.user_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    if product.get('stock', 0) < input.quantity:
        raise HTTPException(status_code=400, detail="Estoque insuficiente")
    
    total = product['price'] * input.quantity
    profit = (product['price'] - product.get('cost', 0)) * input.quantity
    
    sale = Sale(
        product_id=input.product_id,
        product_name=product['name'],
        quantity=input.quantity,
        unit_price=product['price'],
        total=total,
        profit=profit,
        user_id=current_user.user_id,
        date=input.date or datetime.now(timezone.utc)
    )
    
    doc = sale.model_dump()
    doc['date'] = doc['date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.sales.insert_one(doc)
    
    await db.products.update_one(
        {"id": input.product_id},
        {"$inc": {"stock": -input.quantity}}
    )
    
    return sale

@api_router.get("/sales", response_model=List[Sale])
async def get_sales(
    current_user: User = Depends(get_current_user),
    limit: int = Query(100, ge=1, le=1000),
    skip: int = Query(0, ge=0)
):
    sales = await db.sales.find(
        {"user_id": current_user.user_id}, {"_id": 0}
    ).sort("date", -1).skip(skip).limit(limit).to_list(limit)
    
    for s in sales:
        if isinstance(s.get('date'), str):
            s['date'] = datetime.fromisoformat(s['date'])
        if isinstance(s.get('created_at'), str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
    
    return sales

@api_router.delete("/sales/{sale_id}")
async def delete_sale(sale_id: str, current_user: User = Depends(get_current_user)):
    sale = await db.sales.find_one({"id": sale_id, "user_id": current_user.user_id}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    await db.products.update_one(
        {"id": sale['product_id']},
        {"$inc": {"stock": sale['quantity']}}
    )
    
    await db.sales.delete_one({"id": sale_id})
    return {"message": "Venda excluída com sucesso"}

# ============ BILLS ENDPOINTS ============
@api_router.post("/bills", response_model=Bill)
async def create_bill(input: BillCreate, current_user: User = Depends(get_current_user)):
    bill = Bill(**input.model_dump(), user_id=current_user.user_id)
    doc = bill.model_dump()
    doc['due_date'] = doc['due_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('paid_date'):
        doc['paid_date'] = doc['paid_date'].isoformat()
    await db.bills.insert_one(doc)
    return bill

@api_router.get("/bills", response_model=List[Bill])
async def get_bills(current_user: User = Depends(get_current_user), status: Optional[BillStatus] = None):
    query = {"user_id": current_user.user_id}
    if status:
        query["status"] = status.value
    
    bills = await db.bills.find(query, {"_id": 0}).sort("due_date", 1).to_list(500)
    
    for b in bills:
        if isinstance(b.get('due_date'), str):
            b['due_date'] = datetime.fromisoformat(b['due_date'])
        if isinstance(b.get('created_at'), str):
            b['created_at'] = datetime.fromisoformat(b['created_at'])
        if b.get('paid_date') and isinstance(b['paid_date'], str):
            b['paid_date'] = datetime.fromisoformat(b['paid_date'])
    
    return bills

@api_router.put("/bills/{bill_id}/pay")
async def pay_bill(bill_id: str, current_user: User = Depends(get_current_user)):
    result = await db.bills.update_one(
        {"id": bill_id, "user_id": current_user.user_id},
        {"$set": {
            "status": BillStatus.PAID.value,
            "paid_date": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    return {"message": "Conta marcada como paga"}

@api_router.delete("/bills/{bill_id}")
async def delete_bill(bill_id: str, current_user: User = Depends(get_current_user)):
    result = await db.bills.delete_one({"id": bill_id, "user_id": current_user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    return {"message": "Conta excluída com sucesso"}

# ============ DASHBOARD ENDPOINTS ============
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    start_of_day = get_start_of_day().isoformat()
    start_of_month = get_start_of_month().isoformat()
    
    sales = await db.sales.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(10000)
    
    sales_today = 0
    sales_today_count = 0
    sales_month = 0
    sales_month_count = 0
    profit_month = 0
    
    for sale in sales:
        sale_date = sale.get('date', '')
        if sale_date >= start_of_day:
            sales_today += sale['total']
            sales_today_count += 1
        if sale_date >= start_of_month:
            sales_month += sale['total']
            sales_month_count += 1
            profit_month += sale.get('profit', 0)
    
    bills = await db.bills.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(10000)
    
    bills_to_pay = sum(b['amount'] for b in bills if b['status'] == BillStatus.PENDING.value)
    bills_paid_month = 0
    
    for bill in bills:
        if bill['status'] == BillStatus.PAID.value:
            paid_date = bill.get('paid_date', '')
            if paid_date and paid_date >= start_of_month:
                bills_paid_month += bill['amount']
    
    net_profit = profit_month - bills_paid_month
    
    return DashboardStats(
        sales_today=sales_today,
        sales_month=sales_month,
        bills_to_pay=bills_to_pay,
        bills_paid=bills_paid_month,
        profit_month=net_profit,
        sales_count_today=sales_today_count,
        sales_count_month=sales_month_count
    )

@api_router.get("/dashboard/top-products-week", response_model=List[TopProduct])
async def get_top_products_week(current_user: User = Depends(get_current_user)):
    start_of_week = get_start_of_week().isoformat()
    
    sales = await db.sales.find(
        {"user_id": current_user.user_id, "date": {"$gte": start_of_week}},
        {"_id": 0}
    ).to_list(10000)
    
    product_sales = {}
    for sale in sales:
        pid = sale['product_id']
        if pid not in product_sales:
            product_sales[pid] = {
                'product_id': pid,
                'product_name': sale['product_name'],
                'quantity_sold': 0,
                'total_revenue': 0
            }
        product_sales[pid]['quantity_sold'] += sale['quantity']
        product_sales[pid]['total_revenue'] += sale['total']
    
    sorted_products = sorted(product_sales.values(), key=lambda x: x['quantity_sold'], reverse=True)
    return [TopProduct(**p) for p in sorted_products[:10]]

@api_router.get("/dashboard/top-products-month", response_model=List[TopProduct])
async def get_top_products_month(current_user: User = Depends(get_current_user)):
    start_of_month = get_start_of_month().isoformat()
    
    sales = await db.sales.find(
        {"user_id": current_user.user_id, "date": {"$gte": start_of_month}},
        {"_id": 0}
    ).to_list(10000)
    
    product_sales = {}
    for sale in sales:
        pid = sale['product_id']
        if pid not in product_sales:
            product_sales[pid] = {
                'product_id': pid,
                'product_name': sale['product_name'],
                'quantity_sold': 0,
                'total_revenue': 0
            }
        product_sales[pid]['quantity_sold'] += sale['quantity']
        product_sales[pid]['total_revenue'] += sale['total']
    
    sorted_products = sorted(product_sales.values(), key=lambda x: x['quantity_sold'], reverse=True)
    return [TopProduct(**p) for p in sorted_products[:10]]

@api_router.get("/dashboard/daily-sales", response_model=List[DailySales])
async def get_daily_sales(current_user: User = Depends(get_current_user), days: int = Query(7, ge=1, le=30)):
    now = datetime.now(timezone.utc)
    result = []
    
    sales = await db.sales.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(10000)
    
    for i in range(days - 1, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
        
        day_total = 0
        day_count = 0
        
        for sale in sales:
            sale_date = sale.get('date', '')
            if day_start <= sale_date <= day_end:
                day_total += sale['total']
                day_count += 1
        
        result.append(DailySales(
            date=day.strftime("%d/%m"),
            total=day_total,
            count=day_count
        ))
    
    return result

# ============ DATA MANAGEMENT ENDPOINTS ============
@api_router.post("/clear")
async def clear_data(current_user: User = Depends(get_current_user)):
    """Clear all user data"""
    await db.products.delete_many({"user_id": current_user.user_id})
    await db.sales.delete_many({"user_id": current_user.user_id})
    await db.bills.delete_many({"user_id": current_user.user_id})
    return {"message": "Todos os dados foram limpos"}

@api_router.post("/seed")
async def seed_data(current_user: User = Depends(get_current_user)):
    """Seed sample data for the current user"""
    # Clear existing data
    await db.products.delete_many({"user_id": current_user.user_id})
    await db.sales.delete_many({"user_id": current_user.user_id})
    await db.bills.delete_many({"user_id": current_user.user_id})
    
    now = datetime.now(timezone.utc)
    
    # Create products
    products = [
        Product(name="Camiseta Básica", price=49.90, cost=20.00, stock=100, user_id=current_user.user_id),
        Product(name="Calça Jeans", price=129.90, cost=50.00, stock=50, user_id=current_user.user_id),
        Product(name="Tênis Esportivo", price=199.90, cost=80.00, stock=30, user_id=current_user.user_id),
        Product(name="Boné", price=39.90, cost=15.00, stock=80, user_id=current_user.user_id),
        Product(name="Meia Pack 3", price=29.90, cost=10.00, stock=200, user_id=current_user.user_id),
    ]
    
    for p in products:
        doc = p.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.products.insert_one(doc)
    
    # Create sample sales
    sales_data = [
        {"product": products[0], "qty": 5, "days_ago": 0},
        {"product": products[1], "qty": 2, "days_ago": 0},
        {"product": products[4], "qty": 10, "days_ago": 0},
        {"product": products[0], "qty": 8, "days_ago": 1},
        {"product": products[2], "qty": 3, "days_ago": 1},
        {"product": products[0], "qty": 15, "days_ago": 2},
        {"product": products[1], "qty": 5, "days_ago": 3},
    ]
    
    for s_data in sales_data:
        product = s_data['product']
        sale = Sale(
            product_id=product.id,
            product_name=product.name,
            quantity=s_data['qty'],
            unit_price=product.price,
            total=product.price * s_data['qty'],
            profit=(product.price - product.cost) * s_data['qty'],
            user_id=current_user.user_id,
            date=now - timedelta(days=s_data['days_ago'])
        )
        doc = sale.model_dump()
        doc['date'] = doc['date'].isoformat()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.sales.insert_one(doc)
    
    # Create sample bills
    bills_data = [
        {"desc": "Aluguel Loja", "amount": 3500.00, "days_due": 5, "status": "pending"},
        {"desc": "Energia Elétrica", "amount": 450.00, "days_due": 10, "status": "pending"},
        {"desc": "Fornecedor", "amount": 2000.00, "days_due": -5, "status": "paid"},
    ]
    
    for b_data in bills_data:
        bill = Bill(
            description=b_data['desc'],
            amount=b_data['amount'],
            status=BillStatus.PAID if b_data['status'] == 'paid' else BillStatus.PENDING,
            due_date=now + timedelta(days=b_data['days_due']),
            paid_date=now + timedelta(days=b_data['days_due']) if b_data['status'] == 'paid' else None,
            user_id=current_user.user_id
        )
        doc = bill.model_dump()
        doc['due_date'] = doc['due_date'].isoformat()
        doc['created_at'] = doc['created_at'].isoformat()
        if doc.get('paid_date'):
            doc['paid_date'] = doc['paid_date'].isoformat()
        await db.bills.insert_one(doc)
    
    return {
        "message": "Dados de exemplo criados com sucesso",
        "products": len(products),
        "sales": len(sales_data),
        "bills": len(bills_data)
    }

# Include the router in the main app
app.include_router(api_router)

# CORS configuration - must specify origins when using credentials
cors_origins = [
    "http://localhost:3000",
    "https://localhost:3000",
    "https://finance-hub-488.preview.emergentagent.com",
]

# Add any additional origins from environment
env_origins = os.environ.get('CORS_ORIGINS', '')
if env_origins:
    cors_origins.extend([o.strip() for o in env_origins.split(',') if o.strip() and o.strip() != '*'])

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
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
