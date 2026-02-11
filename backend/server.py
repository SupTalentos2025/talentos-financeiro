from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'talentos-secret-key-2024')
JWT_ALGORITHM = "HS256"

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Talentos API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ MODELS ============

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    company_name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    company_id: str
    company_name: str

class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    cpf_cnpj: Optional[str] = None

class ClientResponse(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    cpf_cnpj: Optional[str] = None

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    stock: int
    expiry_date: Optional[str] = None

class ProductResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    price: float
    stock: int
    expiry_date: Optional[str] = None

class SaleItem(BaseModel):
    product_id: str
    quantity: int

class SaleCreate(BaseModel):
    client_id: str
    items: List[SaleItem]

class SaleResponse(BaseModel):
    id: str
    client_id: str
    client_name: Optional[str] = None
    total: float
    date: str
    items: List[dict] = []

class BillCreate(BaseModel):
    description: str
    value: float
    type: str
    status: str = "pending"
    due_date: str
    category: Optional[str] = None

class BillUpdate(BaseModel):
    status: Optional[str] = None
    description: Optional[str] = None
    value: Optional[float] = None

class BillResponse(BaseModel):
    id: str
    description: str
    value: float
    type: str
    status: str
    due_date: str
    category: Optional[str] = None

class DashboardStats(BaseModel):
    total_sales: int
    total_bills: int
    total_clients: int
    total_products: int
    monthly_revenue: float
    pending_bills: int
    today_sales_total: float
    today_sales_count: int
    products_expiring_today: int
    products_low_stock: int
    bills_due_today: int
    bills_pending: int

# ============ HELPERS ============

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: str, company_id: str) -> str:
    payload = {
        "user_id": user_id,
        "company_id": company_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalido")

# ============ AUTH ROUTES ============

@api_router.post("/auth/register")
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email ja cadastrado")

    company_id = str(uuid.uuid4())
    company = {
        "id": company_id,
        "name": user.company_name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.companies.insert_one(company)

    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": user.name,
        "email": user.email,
        "password": hash_password(user.password),
        "company_id": company_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)

    token = create_token(user_id, company_id)
    return {
        "token": token,
        "user": {
            "id": user_id,
            "name": user.name,
            "email": user.email,
            "company_id": company_id,
            "company_name": user.company_name
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or user["password"] != hash_password(credentials.password):
        raise HTTPException(status_code=401, detail="Email ou senha invalidos")

    company = await db.companies.find_one({"id": user["company_id"]})
    token = create_token(user["id"], user["company_id"])

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "company_id": user["company_id"],
            "company_name": company["name"] if company else ""
        }
    }

# ============ DASHBOARD ============

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(auth: dict = Depends(verify_token)):
    company_id = auth["company_id"]

    total_clients = await db.clients.count_documents({"company_id": company_id})
    total_products = await db.products.count_documents({"company_id": company_id})
    total_sales = await db.sales.count_documents({"company_id": company_id})
    total_bills = await db.bills.count_documents({"company_id": company_id})
    pending_bills = await db.bills.count_documents({"company_id": company_id, "status": "pending"})

    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    sales_cursor = db.sales.find({
        "company_id": company_id,
        "date": {"$gte": start_of_month}
    })
    sales_list = await sales_cursor.to_list(1000)
    monthly_revenue = sum(s.get("total", 0) for s in sales_list)

    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
    today_date = now.strftime("%Y-%m-%d")

    today_sales_cursor = db.sales.find({
        "company_id": company_id,
        "date": {"$gte": today_start, "$lte": today_end}
    })
    today_sales_list = await today_sales_cursor.to_list(1000)
    today_sales_total = sum(s.get("total", 0) for s in today_sales_list)
    today_sales_count = len(today_sales_list)

    products_expiring_today = await db.products.count_documents({
        "company_id": company_id,
        "expiry_date": today_date
    })

    products_low_stock = await db.products.count_documents({
        "company_id": company_id,
        "stock": {"$lte": 5}
    })

    bills_due_today = await db.bills.count_documents({
        "company_id": company_id,
        "type": "payable",
        "status": {"$ne": "paid"},
        "due_date": today_date
    })

    bills_pending = await db.bills.count_documents({
        "company_id": company_id,
        "type": "payable",
        "status": {"$in": ["pending", "overdue"]}
    })

    return DashboardStats(
        total_sales=total_sales,
        total_bills=total_bills,
        total_clients=total_clients,
        total_products=total_products,
        monthly_revenue=monthly_revenue,
        pending_bills=pending_bills,
        today_sales_total=today_sales_total,
        today_sales_count=today_sales_count,
        products_expiring_today=products_expiring_today,
        products_low_stock=products_low_stock,
        bills_due_today=bills_due_today,
        bills_pending=bills_pending
    )

# ============ CLIENTS ============

@api_router.get("/clients", response_model=List[ClientResponse])
async def get_clients(auth: dict = Depends(verify_token)):
    clients = await db.clients.find({"company_id": auth["company_id"]}, {"_id": 0}).to_list(1000)
    return clients

@api_router.post("/clients", response_model=ClientResponse)
async def create_client(client: ClientCreate, auth: dict = Depends(verify_token)):
    client_id = str(uuid.uuid4())
    client_doc = {
        "id": client_id,
        "name": client.name,
        "email": client.email,
        "phone": client.phone,
        "cpf_cnpj": client.cpf_cnpj,
        "company_id": auth["company_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.clients.insert_one(client_doc)
    return ClientResponse(**{k: v for k, v in client_doc.items() if k != "_id" and k != "company_id" and k != "created_at"})

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, auth: dict = Depends(verify_token)):
    result = await db.clients.delete_one({"id": client_id, "company_id": auth["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente nao encontrado")
    return {"message": "Cliente excluido"}

# ============ PRODUCTS ============

@api_router.get("/products", response_model=List[ProductResponse])
async def get_products(auth: dict = Depends(verify_token)):
    products = await db.products.find({"company_id": auth["company_id"]}, {"_id": 0}).to_list(1000)
    return products

@api_router.post("/products", response_model=ProductResponse)
async def create_product(product: ProductCreate, auth: dict = Depends(verify_token)):
    product_id = str(uuid.uuid4())
    product_doc = {
        "id": product_id,
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "stock": product.stock,
        "expiry_date": product.expiry_date,
        "company_id": auth["company_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product_doc)
    return ProductResponse(id=product_id, name=product.name, description=product.description, price=product.price, stock=product.stock, expiry_date=product.expiry_date)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, auth: dict = Depends(verify_token)):
    result = await db.products.delete_one({"id": product_id, "company_id": auth["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")
    return {"message": "Produto excluido"}

# ============ SALES ============

@api_router.get("/sales", response_model=List[SaleResponse])
async def get_sales(auth: dict = Depends(verify_token)):
    sales = await db.sales.find({"company_id": auth["company_id"]}, {"_id": 0}).to_list(1000)

    for sale in sales:
        client = await db.clients.find_one({"id": sale.get("client_id")})
        sale["client_name"] = client["name"] if client else None

    return sales

@api_router.post("/sales", response_model=SaleResponse)
async def create_sale(sale: SaleCreate, auth: dict = Depends(verify_token)):
    client = await db.clients.find_one({"id": sale.client_id, "company_id": auth["company_id"]})
    if not client:
        raise HTTPException(status_code=400, detail="Cliente nao encontrado")

    total = 0
    items_with_details = []
    for item in sale.items:
        product = await db.products.find_one({"id": item.product_id, "company_id": auth["company_id"]})
        if not product:
            raise HTTPException(status_code=400, detail=f"Produto nao encontrado")
        if product["stock"] < item.quantity:
            raise HTTPException(status_code=400, detail=f"Estoque insuficiente para {product['name']}")

        item_total = product["price"] * item.quantity
        total += item_total
        items_with_details.append({
            "product_id": item.product_id,
            "product_name": product["name"],
            "quantity": item.quantity,
            "unit_price": product["price"],
            "total": item_total
        })

        await db.products.update_one(
            {"id": item.product_id},
            {"$inc": {"stock": -item.quantity}}
        )

    sale_id = str(uuid.uuid4())
    sale_doc = {
        "id": sale_id,
        "client_id": sale.client_id,
        "company_id": auth["company_id"],
        "user_id": auth["user_id"],
        "total": total,
        "date": datetime.now(timezone.utc).isoformat(),
        "items": items_with_details
    }
    await db.sales.insert_one(sale_doc)

    return SaleResponse(
        id=sale_id,
        client_id=sale.client_id,
        client_name=client["name"],
        total=total,
        date=sale_doc["date"],
        items=items_with_details
    )

@api_router.delete("/sales/{sale_id}")
async def delete_sale(sale_id: str, auth: dict = Depends(verify_token)):
    sale = await db.sales.find_one({"id": sale_id, "company_id": auth["company_id"]})
    if not sale:
        raise HTTPException(status_code=404, detail="Venda nao encontrada")

    for item in sale.get("items", []):
        await db.products.update_one(
            {"id": item["product_id"]},
            {"$inc": {"stock": item["quantity"]}}
        )

    await db.sales.delete_one({"id": sale_id})
    return {"message": "Venda excluida"}

# ============ BILLS ============

@api_router.get("/bills", response_model=List[BillResponse])
async def get_bills(auth: dict = Depends(verify_token)):
    bills = await db.bills.find({"company_id": auth["company_id"]}, {"_id": 0}).to_list(1000)
    return bills

@api_router.post("/bills", response_model=BillResponse)
async def create_bill(bill: BillCreate, auth: dict = Depends(verify_token)):
    bill_id = str(uuid.uuid4())
    bill_doc = {
        "id": bill_id,
        "description": bill.description,
        "value": bill.value,
        "type": bill.type,
        "status": bill.status,
        "due_date": bill.due_date,
        "category": bill.category,
        "company_id": auth["company_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.bills.insert_one(bill_doc)
    return BillResponse(id=bill_id, description=bill.description, value=bill.value, type=bill.type, status=bill.status, due_date=bill.due_date, category=bill.category)

@api_router.put("/bills/{bill_id}", response_model=BillResponse)
async def update_bill(bill_id: str, update: BillUpdate, auth: dict = Depends(verify_token)):
    bill = await db.bills.find_one({"id": bill_id, "company_id": auth["company_id"]})
    if not bill:
        raise HTTPException(status_code=404, detail="Conta nao encontrada")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        await db.bills.update_one({"id": bill_id}, {"$set": update_data})

    updated = await db.bills.find_one({"id": bill_id}, {"_id": 0, "company_id": 0, "created_at": 0})
    return updated

@api_router.delete("/bills/{bill_id}")
async def delete_bill(bill_id: str, auth: dict = Depends(verify_token)):
    result = await db.bills.delete_one({"id": bill_id, "company_id": auth["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conta nao encontrada")
    return {"message": "Conta excluida"}

# ============ ROOT ============

@api_router.get("/")
async def root():
    return {"message": "Talentos API v1.0"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
