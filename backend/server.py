from fastapi import FastAPI, APIRouter, HTTPException, Query, Response, Request, Depends, Header
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
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

# ============ HELPER FUNCTIONS ============
def validate_cnpj(cnpj: str) -> str:
    """Validate and format CNPJ"""
    # Remove non-digits
    cnpj = re.sub(r'\D', '', cnpj)
    if len(cnpj) != 14:
        raise ValueError("CNPJ deve ter 14 dígitos")
    # Format as XX.XXX.XXX/XXXX-XX
    return f"{cnpj[:2]}.{cnpj[2:5]}.{cnpj[5:8]}/{cnpj[8:12]}-{cnpj[12:]}"

def format_cnpj_display(cnpj: str) -> str:
    """Format CNPJ for display"""
    cnpj_digits = re.sub(r'\D', '', cnpj)
    if len(cnpj_digits) == 14:
        return f"{cnpj_digits[:2]}.{cnpj_digits[2:5]}.{cnpj_digits[5:8]}/{cnpj_digits[8:12]}-{cnpj_digits[12:]}"
    return cnpj

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
    auth_provider: str = "email"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None

# ============ COMPANY MODELS ============
class Company(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    cnpj: str
    owner_id: str  # User who created the company
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CompanyCreate(BaseModel):
    name: str
    cnpj: str
    
    @field_validator('cnpj')
    @classmethod
    def validate_cnpj_field(cls, v):
        cnpj = re.sub(r'\D', '', v)
        if len(cnpj) != 14:
            raise ValueError('CNPJ deve ter 14 dígitos')
        return cnpj

class CompanyResponse(BaseModel):
    id: str
    name: str
    cnpj: str
    owner_id: str

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
    company_id: str = ""
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
    company_id: str = ""
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
    company_id: str = ""
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
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Sessão inválida")
    
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sessão expirada")
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return User(**user)

async def get_current_company(
    request: Request,
    current_user: User = Depends(get_current_user),
    x_company_id: Optional[str] = Header(None)
) -> Company:
    """Get current company from header"""
    company_id = x_company_id
    
    if not company_id:
        raise HTTPException(status_code=400, detail="Empresa não selecionada. Selecione uma empresa.")
    
    company = await db.companies.find_one({
        "id": company_id,
        "owner_id": current_user.user_id
    }, {"_id": 0})
    
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if isinstance(company.get('created_at'), str):
        company['created_at'] = datetime.fromisoformat(company['created_at'])
    
    return Company(**company)

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
    return {"message": "Sistema de Gestão de Vendas API", "version": "2.0.0"}

# ============ AUTH ENDPOINTS ============
@api_router.post("/auth/register")
async def register(input: UserCreate, response: Response):
    """Register new user with email and password"""
    existing = await db.users.find_one({"email": input.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
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
    
    session_token = f"session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
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
    
    session_token = f"session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
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
    
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
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
    
    session_token = f"session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
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

# ============ COMPANY ENDPOINTS ============
@api_router.post("/companies", response_model=CompanyResponse)
async def create_company(input: CompanyCreate, current_user: User = Depends(get_current_user)):
    """Create a new company"""
    # Check if CNPJ already exists for this user
    cnpj_digits = re.sub(r'\D', '', input.cnpj)
    existing = await db.companies.find_one({
        "owner_id": current_user.user_id,
        "cnpj": {"$regex": cnpj_digits}
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="Você já possui uma empresa com este CNPJ")
    
    company = Company(
        name=input.name,
        cnpj=format_cnpj_display(input.cnpj),
        owner_id=current_user.user_id
    )
    
    doc = company.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.companies.insert_one(doc)
    
    return CompanyResponse(
        id=company.id,
        name=company.name,
        cnpj=company.cnpj,
        owner_id=company.owner_id
    )

@api_router.get("/companies", response_model=List[CompanyResponse])
async def get_companies(current_user: User = Depends(get_current_user)):
    """Get all companies for current user"""
    companies = await db.companies.find(
        {"owner_id": current_user.user_id},
        {"_id": 0}
    ).sort("name", 1).to_list(100)
    
    return [CompanyResponse(
        id=c["id"],
        name=c["name"],
        cnpj=c["cnpj"],
        owner_id=c["owner_id"]
    ) for c in companies]

@api_router.get("/companies/{company_id}", response_model=CompanyResponse)
async def get_company(company_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific company"""
    company = await db.companies.find_one({
        "id": company_id,
        "owner_id": current_user.user_id
    }, {"_id": 0})
    
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    return CompanyResponse(
        id=company["id"],
        name=company["name"],
        cnpj=company["cnpj"],
        owner_id=company["owner_id"]
    )

@api_router.put("/companies/{company_id}", response_model=CompanyResponse)
async def update_company(company_id: str, input: CompanyCreate, current_user: User = Depends(get_current_user)):
    """Update a company"""
    company = await db.companies.find_one({
        "id": company_id,
        "owner_id": current_user.user_id
    }, {"_id": 0})
    
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    await db.companies.update_one(
        {"id": company_id},
        {"$set": {
            "name": input.name,
            "cnpj": format_cnpj_display(input.cnpj)
        }}
    )
    
    return CompanyResponse(
        id=company_id,
        name=input.name,
        cnpj=format_cnpj_display(input.cnpj),
        owner_id=current_user.user_id
    )

@api_router.delete("/companies/{company_id}")
async def delete_company(company_id: str, current_user: User = Depends(get_current_user)):
    """Delete a company and all its data"""
    company = await db.companies.find_one({
        "id": company_id,
        "owner_id": current_user.user_id
    }, {"_id": 0})
    
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    # Delete all company data
    await db.products.delete_many({"company_id": company_id})
    await db.sales.delete_many({"company_id": company_id})
    await db.bills.delete_many({"company_id": company_id})
    await db.companies.delete_one({"id": company_id})
    
    return {"message": "Empresa excluída com sucesso"}

# ============ PRODUCTS ENDPOINTS ============
@api_router.post("/products", response_model=Product)
async def create_product(
    input: ProductCreate,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company)
):
    product = Product(**input.model_dump(), company_id=company.id)
    doc = product.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.products.insert_one(doc)
    return product

@api_router.get("/products", response_model=List[Product])
async def get_products(
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company)
):
    products = await db.products.find({"company_id": company.id}, {"_id": 0}).to_list(500)
    for p in products:
        if isinstance(p.get('created_at'), str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
    return products

@api_router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company)
):
    result = await db.products.delete_one({"id": product_id, "company_id": company.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return {"message": "Produto excluído com sucesso"}

# ============ SALES ENDPOINTS ============
@api_router.post("/sales", response_model=Sale)
async def create_sale(
    input: SaleCreate,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company)
):
    product = await db.products.find_one({"id": input.product_id, "company_id": company.id}, {"_id": 0})
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
        company_id=company.id,
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
    company: Company = Depends(get_current_company),
    limit: int = Query(100, ge=1, le=1000),
    skip: int = Query(0, ge=0)
):
    sales = await db.sales.find(
        {"company_id": company.id}, {"_id": 0}
    ).sort("date", -1).skip(skip).limit(limit).to_list(limit)
    
    for s in sales:
        if isinstance(s.get('date'), str):
            s['date'] = datetime.fromisoformat(s['date'])
        if isinstance(s.get('created_at'), str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
    
    return sales

@api_router.delete("/sales/{sale_id}")
async def delete_sale(
    sale_id: str,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company)
):
    sale = await db.sales.find_one({"id": sale_id, "company_id": company.id}, {"_id": 0})
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
async def create_bill(
    input: BillCreate,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company)
):
    bill = Bill(**input.model_dump(), company_id=company.id)
    doc = bill.model_dump()
    doc['due_date'] = doc['due_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('paid_date'):
        doc['paid_date'] = doc['paid_date'].isoformat()
    await db.bills.insert_one(doc)
    return bill

@api_router.get("/bills", response_model=List[Bill])
async def get_bills(
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    status: Optional[BillStatus] = None
):
    query = {"company_id": company.id}
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
async def pay_bill(
    bill_id: str,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company)
):
    result = await db.bills.update_one(
        {"id": bill_id, "company_id": company.id},
        {"$set": {
            "status": BillStatus.PAID.value,
            "paid_date": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    return {"message": "Conta marcada como paga"}

@api_router.delete("/bills/{bill_id}")
async def delete_bill(
    bill_id: str,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company)
):
    result = await db.bills.delete_one({"id": bill_id, "company_id": company.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    return {"message": "Conta excluída com sucesso"}

# ============ NOTIFICATIONS ENDPOINTS ============
class Notification(BaseModel):
    id: str
    type: str  # 'bill_due', 'bill_overdue', 'bill_paid', 'profit_summary', 'sales_summary'
    title: str
    message: str
    company_id: str
    company_name: str
    data: dict = {}
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationResponse(BaseModel):
    notifications: List[dict]
    unread_count: int

@api_router.get("/notifications")
async def get_notifications(
    current_user: User = Depends(get_current_user)
):
    """Get all notifications for the user across all companies"""
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Get all user companies
    companies = await db.companies.find({"owner_id": current_user.user_id}, {"_id": 0}).to_list(100)
    
    notifications = []
    
    for company in companies:
        company_id = company["id"]
        company_name = company["name"]
        
        # Get bills for this company
        bills = await db.bills.find({"company_id": company_id}, {"_id": 0}).to_list(1000)
        
        # Get sales for this company (this month)
        sales = await db.sales.find({"company_id": company_id}, {"_id": 0}).to_list(10000)
        
        # Calculate stats
        bills_to_pay = []
        bills_overdue = []
        bills_paid_today = []
        total_profit_month = 0
        sales_today_count = 0
        sales_today_total = 0
        
        for bill in bills:
            due_date = bill.get('due_date', '')
            if isinstance(due_date, str):
                due_date = datetime.fromisoformat(due_date)
            if due_date.tzinfo is None:
                due_date = due_date.replace(tzinfo=timezone.utc)
            
            if bill['status'] == 'pending':
                days_until_due = (due_date - now).days
                
                if days_until_due < 0:
                    # Overdue
                    bills_overdue.append({
                        'description': bill['description'],
                        'amount': bill['amount'],
                        'days_overdue': abs(days_until_due)
                    })
                elif days_until_due <= 3:
                    # Due soon (within 3 days)
                    bills_to_pay.append({
                        'description': bill['description'],
                        'amount': bill['amount'],
                        'days_until_due': days_until_due
                    })
            elif bill['status'] == 'paid':
                paid_date = bill.get('paid_date', '')
                if isinstance(paid_date, str) and paid_date:
                    paid_date = datetime.fromisoformat(paid_date)
                    if paid_date.tzinfo is None:
                        paid_date = paid_date.replace(tzinfo=timezone.utc)
                    if paid_date >= today:
                        bills_paid_today.append({
                            'description': bill['description'],
                            'amount': bill['amount']
                        })
        
        for sale in sales:
            sale_date = sale.get('date', '')
            if isinstance(sale_date, str):
                sale_date = datetime.fromisoformat(sale_date)
            if sale_date.tzinfo is None:
                sale_date = sale_date.replace(tzinfo=timezone.utc)
            
            if sale_date >= start_of_month:
                total_profit_month += sale.get('profit', 0)
            
            if sale_date >= today:
                sales_today_count += 1
                sales_today_total += sale.get('total', 0)
        
        # Generate notifications
        
        # Overdue bills (high priority)
        for bill in bills_overdue:
            notifications.append({
                'id': f"overdue_{company_id}_{bill['description'][:10]}",
                'type': 'bill_overdue',
                'priority': 'high',
                'title': '⚠️ Conta Vencida!',
                'message': f"{bill['description']} está vencida há {bill['days_overdue']} dia(s) - R$ {bill['amount']:.2f}",
                'company_id': company_id,
                'company_name': company_name,
                'data': bill,
                'created_at': now.isoformat()
            })
        
        # Bills due soon (medium priority)
        for bill in bills_to_pay:
            if bill['days_until_due'] == 0:
                msg = f"{bill['description']} vence HOJE - R$ {bill['amount']:.2f}"
                title = '🔴 Conta Vence Hoje!'
            elif bill['days_until_due'] == 1:
                msg = f"{bill['description']} vence AMANHÃ - R$ {bill['amount']:.2f}"
                title = '🟠 Conta Vence Amanhã'
            else:
                msg = f"{bill['description']} vence em {bill['days_until_due']} dias - R$ {bill['amount']:.2f}"
                title = '🟡 Conta a Vencer'
            
            notifications.append({
                'id': f"due_{company_id}_{bill['description'][:10]}",
                'type': 'bill_due',
                'priority': 'medium' if bill['days_until_due'] > 0 else 'high',
                'title': title,
                'message': msg,
                'company_id': company_id,
                'company_name': company_name,
                'data': bill,
                'created_at': now.isoformat()
            })
        
        # Bills paid today (low priority - positive)
        if bills_paid_today:
            total_paid = sum(b['amount'] for b in bills_paid_today)
            notifications.append({
                'id': f"paid_{company_id}_{today.isoformat()}",
                'type': 'bill_paid',
                'priority': 'low',
                'title': '✅ Contas Pagas Hoje',
                'message': f"{len(bills_paid_today)} conta(s) paga(s) - Total: R$ {total_paid:.2f}",
                'company_id': company_id,
                'company_name': company_name,
                'data': {'bills': bills_paid_today, 'total': total_paid},
                'created_at': now.isoformat()
            })
        
        # Monthly profit summary
        if total_profit_month != 0:
            if total_profit_month > 0:
                notifications.append({
                    'id': f"profit_{company_id}_{start_of_month.isoformat()}",
                    'type': 'profit_summary',
                    'priority': 'info',
                    'title': '💰 Lucro do Mês',
                    'message': f"Lucro acumulado: R$ {total_profit_month:.2f}",
                    'company_id': company_id,
                    'company_name': company_name,
                    'data': {'profit': total_profit_month},
                    'created_at': now.isoformat()
                })
            else:
                notifications.append({
                    'id': f"profit_{company_id}_{start_of_month.isoformat()}",
                    'type': 'profit_summary',
                    'priority': 'medium',
                    'title': '📉 Atenção: Prejuízo',
                    'message': f"Prejuízo acumulado: R$ {abs(total_profit_month):.2f}",
                    'company_id': company_id,
                    'company_name': company_name,
                    'data': {'profit': total_profit_month},
                    'created_at': now.isoformat()
                })
        
        # Sales today summary
        if sales_today_count > 0:
            notifications.append({
                'id': f"sales_{company_id}_{today.isoformat()}",
                'type': 'sales_summary',
                'priority': 'info',
                'title': '🛒 Vendas de Hoje',
                'message': f"{sales_today_count} venda(s) - Total: R$ {sales_today_total:.2f}",
                'company_id': company_id,
                'company_name': company_name,
                'data': {'count': sales_today_count, 'total': sales_today_total},
                'created_at': now.isoformat()
            })
    
    # Sort by priority
    priority_order = {'high': 0, 'medium': 1, 'low': 2, 'info': 3}
    notifications.sort(key=lambda x: priority_order.get(x.get('priority', 'info'), 4))
    
    # Count high priority (unread equivalent)
    unread_count = len([n for n in notifications if n.get('priority') in ['high', 'medium']])
    
    return {
        'notifications': notifications,
        'unread_count': unread_count
    }

@api_router.get("/notifications/summary")
async def get_notifications_summary(
    current_user: User = Depends(get_current_user)
):
    """Get a quick summary of important notifications"""
    now = datetime.now(timezone.utc)
    
    companies = await db.companies.find({"owner_id": current_user.user_id}, {"_id": 0}).to_list(100)
    
    total_overdue = 0
    total_due_soon = 0
    total_overdue_amount = 0
    total_due_soon_amount = 0
    
    for company in companies:
        bills = await db.bills.find({
            "company_id": company["id"],
            "status": "pending"
        }, {"_id": 0}).to_list(1000)
        
        for bill in bills:
            due_date = bill.get('due_date', '')
            if isinstance(due_date, str):
                due_date = datetime.fromisoformat(due_date)
            if due_date.tzinfo is None:
                due_date = due_date.replace(tzinfo=timezone.utc)
            
            days_until_due = (due_date - now).days
            
            if days_until_due < 0:
                total_overdue += 1
                total_overdue_amount += bill['amount']
            elif days_until_due <= 3:
                total_due_soon += 1
                total_due_soon_amount += bill['amount']
    
    return {
        'overdue_count': total_overdue,
        'overdue_amount': total_overdue_amount,
        'due_soon_count': total_due_soon,
        'due_soon_amount': total_due_soon_amount,
        'total_alerts': total_overdue + total_due_soon
    }

# ============ DASHBOARD ENDPOINTS ============
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company)
):
    start_of_day = get_start_of_day().isoformat()
    start_of_month = get_start_of_month().isoformat()
    
    sales = await db.sales.find({"company_id": company.id}, {"_id": 0}).to_list(10000)
    
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
    
    bills = await db.bills.find({"company_id": company.id}, {"_id": 0}).to_list(10000)
    
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
async def get_top_products_week(
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company)
):
    start_of_week = get_start_of_week().isoformat()
    
    sales = await db.sales.find(
        {"company_id": company.id, "date": {"$gte": start_of_week}},
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
async def get_top_products_month(
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company)
):
    start_of_month = get_start_of_month().isoformat()
    
    sales = await db.sales.find(
        {"company_id": company.id, "date": {"$gte": start_of_month}},
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
async def get_daily_sales(
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    days: int = Query(7, ge=1, le=30)
):
    now = datetime.now(timezone.utc)
    result = []
    
    sales = await db.sales.find({"company_id": company.id}, {"_id": 0}).to_list(10000)
    
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
async def clear_data(
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company)
):
    """Clear all data for the current company"""
    await db.products.delete_many({"company_id": company.id})
    await db.sales.delete_many({"company_id": company.id})
    await db.bills.delete_many({"company_id": company.id})
    return {"message": "Todos os dados da empresa foram limpos"}

@api_router.post("/seed")
async def seed_data(
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company)
):
    """Seed sample data for the current company"""
    await db.products.delete_many({"company_id": company.id})
    await db.sales.delete_many({"company_id": company.id})
    await db.bills.delete_many({"company_id": company.id})
    
    now = datetime.now(timezone.utc)
    
    products = [
        Product(name="Camiseta Básica", price=49.90, cost=20.00, stock=100, company_id=company.id),
        Product(name="Calça Jeans", price=129.90, cost=50.00, stock=50, company_id=company.id),
        Product(name="Tênis Esportivo", price=199.90, cost=80.00, stock=30, company_id=company.id),
        Product(name="Boné", price=39.90, cost=15.00, stock=80, company_id=company.id),
        Product(name="Meia Pack 3", price=29.90, cost=10.00, stock=200, company_id=company.id),
    ]
    
    for p in products:
        doc = p.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.products.insert_one(doc)
    
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
            company_id=company.id,
            date=now - timedelta(days=s_data['days_ago'])
        )
        doc = sale.model_dump()
        doc['date'] = doc['date'].isoformat()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.sales.insert_one(doc)
    
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
            company_id=company.id
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

# CORS configuration
cors_origins = [
    "http://localhost:3000",
    "https://localhost:3000",
    "https://finance-hub-488.preview.emergentagent.com",
]

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
