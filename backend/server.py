from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Sistema de Gestão de Vendas")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class BillStatus(str, Enum):
    PENDING = "pending"  # A Pagar
    PAID = "paid"  # Paga

# Models
class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float
    cost: float = 0.0  # Custo do produto
    stock: int = 0
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
    profit: float = 0.0  # Lucro da venda
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

# Response Models
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

# ============ PRODUCTS ENDPOINTS ============
@api_router.post("/products", response_model=Product)
async def create_product(input: ProductCreate):
    product = Product(**input.model_dump())
    doc = product.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.products.insert_one(doc)
    return product

@api_router.get("/products", response_model=List[Product])
async def get_products():
    products = await db.products.find({}, {"_id": 0}).to_list(500)
    for p in products:
        if isinstance(p.get('created_at'), str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    if isinstance(product.get('created_at'), str):
        product['created_at'] = datetime.fromisoformat(product['created_at'])
    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, input: ProductCreate):
    result = await db.products.update_one({"id": product_id}, {"$set": input.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if isinstance(product.get('created_at'), str):
        product['created_at'] = datetime.fromisoformat(product['created_at'])
    return product

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return {"message": "Produto excluído com sucesso"}

# ============ SALES ENDPOINTS ============
@api_router.post("/sales", response_model=Sale)
async def create_sale(input: SaleCreate):
    # Get product info
    product = await db.products.find_one({"id": input.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    # Check stock
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
        date=input.date or datetime.now(timezone.utc)
    )
    
    doc = sale.model_dump()
    doc['date'] = doc['date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.sales.insert_one(doc)
    
    # Update stock
    await db.products.update_one(
        {"id": input.product_id},
        {"$inc": {"stock": -input.quantity}}
    )
    
    return sale

@api_router.get("/sales", response_model=List[Sale])
async def get_sales(
    limit: int = Query(100, ge=1, le=1000),
    skip: int = Query(0, ge=0),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    query = {}
    if start_date or end_date:
        query["date"] = {}
        if start_date:
            query["date"]["$gte"] = start_date
        if end_date:
            query["date"]["$lte"] = end_date
    
    sales = await db.sales.find(
        query, {"_id": 0}
    ).sort("date", -1).skip(skip).limit(limit).to_list(limit)
    
    for s in sales:
        if isinstance(s.get('date'), str):
            s['date'] = datetime.fromisoformat(s['date'])
        if isinstance(s.get('created_at'), str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
    
    return sales

@api_router.delete("/sales/{sale_id}")
async def delete_sale(sale_id: str):
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    # Restore stock
    await db.products.update_one(
        {"id": sale['product_id']},
        {"$inc": {"stock": sale['quantity']}}
    )
    
    await db.sales.delete_one({"id": sale_id})
    return {"message": "Venda excluída com sucesso"}

# ============ BILLS ENDPOINTS ============
@api_router.post("/bills", response_model=Bill)
async def create_bill(input: BillCreate):
    bill = Bill(**input.model_dump())
    doc = bill.model_dump()
    doc['due_date'] = doc['due_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('paid_date'):
        doc['paid_date'] = doc['paid_date'].isoformat()
    await db.bills.insert_one(doc)
    return bill

@api_router.get("/bills", response_model=List[Bill])
async def get_bills(status: Optional[BillStatus] = None):
    query = {}
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

@api_router.put("/bills/{bill_id}", response_model=Bill)
async def update_bill(bill_id: str, input: BillUpdate):
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    
    # If marking as paid, set paid_date
    if update_data.get('status') == BillStatus.PAID:
        update_data['paid_date'] = datetime.now(timezone.utc).isoformat()
    
    if update_data.get('due_date'):
        update_data['due_date'] = update_data['due_date'].isoformat()
    
    result = await db.bills.update_one({"id": bill_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    bill = await db.bills.find_one({"id": bill_id}, {"_id": 0})
    if isinstance(bill.get('due_date'), str):
        bill['due_date'] = datetime.fromisoformat(bill['due_date'])
    if isinstance(bill.get('created_at'), str):
        bill['created_at'] = datetime.fromisoformat(bill['created_at'])
    if bill.get('paid_date') and isinstance(bill['paid_date'], str):
        bill['paid_date'] = datetime.fromisoformat(bill['paid_date'])
    
    return bill

@api_router.put("/bills/{bill_id}/pay")
async def pay_bill(bill_id: str):
    """Mark a bill as paid"""
    result = await db.bills.update_one(
        {"id": bill_id},
        {"$set": {
            "status": BillStatus.PAID.value,
            "paid_date": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    return {"message": "Conta marcada como paga"}

@api_router.delete("/bills/{bill_id}")
async def delete_bill(bill_id: str):
    result = await db.bills.delete_one({"id": bill_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    return {"message": "Conta excluída com sucesso"}

# ============ DASHBOARD ENDPOINTS ============
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    now = datetime.now(timezone.utc)
    start_of_day = get_start_of_day().isoformat()
    start_of_month = get_start_of_month().isoformat()
    
    # Get all sales
    sales = await db.sales.find({}, {"_id": 0}).to_list(10000)
    
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
    
    # Get bills
    bills = await db.bills.find({}, {"_id": 0}).to_list(10000)
    
    bills_to_pay = sum(b['amount'] for b in bills if b['status'] == BillStatus.PENDING.value)
    bills_paid_month = 0
    
    for bill in bills:
        if bill['status'] == BillStatus.PAID.value:
            paid_date = bill.get('paid_date', '')
            if paid_date and paid_date >= start_of_month:
                bills_paid_month += bill['amount']
    
    # Calculate net profit (profit from sales - bills paid this month)
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
async def get_top_products_week():
    start_of_week = get_start_of_week().isoformat()
    
    sales = await db.sales.find(
        {"date": {"$gte": start_of_week}},
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
async def get_top_products_month():
    start_of_month = get_start_of_month().isoformat()
    
    sales = await db.sales.find(
        {"date": {"$gte": start_of_month}},
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
async def get_daily_sales(days: int = Query(7, ge=1, le=30)):
    now = datetime.now(timezone.utc)
    result = []
    
    sales = await db.sales.find({}, {"_id": 0}).to_list(10000)
    
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

# ============ CLEAR DATA ENDPOINT ============
@api_router.post("/clear")
async def clear_data():
    """Clear all data from the database"""
    await db.products.delete_many({})
    await db.sales.delete_many({})
    await db.bills.delete_many({})
    return {"message": "Todos os dados foram limpos"}

# ============ SEED DATA ENDPOINT ============
@api_router.post("/seed")
async def seed_data():
    """Seed sample data for testing"""
    await db.products.delete_many({})
    await db.sales.delete_many({})
    await db.bills.delete_many({})
    
    now = datetime.now(timezone.utc)
    
    # Create products
    products = [
        Product(name="Camiseta Básica", price=49.90, cost=20.00, stock=100),
        Product(name="Calça Jeans", price=129.90, cost=50.00, stock=50),
        Product(name="Tênis Esportivo", price=199.90, cost=80.00, stock=30),
        Product(name="Boné", price=39.90, cost=15.00, stock=80),
        Product(name="Meia Pack 3", price=29.90, cost=10.00, stock=200),
        Product(name="Jaqueta", price=249.90, cost=100.00, stock=25),
        Product(name="Shorts", price=79.90, cost=30.00, stock=60),
        Product(name="Vestido", price=159.90, cost=60.00, stock=40),
    ]
    
    for p in products:
        doc = p.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.products.insert_one(doc)
    
    # Create sample sales
    sales_data = [
        # Today
        {"product": products[0], "qty": 5, "days_ago": 0},
        {"product": products[1], "qty": 2, "days_ago": 0},
        {"product": products[4], "qty": 10, "days_ago": 0},
        {"product": products[3], "qty": 3, "days_ago": 0},
        # Yesterday
        {"product": products[0], "qty": 8, "days_ago": 1},
        {"product": products[2], "qty": 3, "days_ago": 1},
        {"product": products[5], "qty": 1, "days_ago": 1},
        # This week
        {"product": products[0], "qty": 15, "days_ago": 2},
        {"product": products[1], "qty": 5, "days_ago": 3},
        {"product": products[2], "qty": 4, "days_ago": 4},
        {"product": products[6], "qty": 7, "days_ago": 5},
        {"product": products[7], "qty": 3, "days_ago": 6},
        # This month
        {"product": products[0], "qty": 20, "days_ago": 10},
        {"product": products[1], "qty": 8, "days_ago": 12},
        {"product": products[3], "qty": 15, "days_ago": 15},
        {"product": products[4], "qty": 25, "days_ago": 18},
        {"product": products[5], "qty": 4, "days_ago": 20},
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
        {"desc": "Internet", "amount": 150.00, "days_due": 15, "status": "pending"},
        {"desc": "Fornecedor Roupas", "amount": 5000.00, "days_due": -5, "status": "paid"},
        {"desc": "Contador", "amount": 800.00, "days_due": -10, "status": "paid"},
        {"desc": "Água", "amount": 120.00, "days_due": -15, "status": "paid"},
    ]
    
    for b_data in bills_data:
        bill = Bill(
            description=b_data['desc'],
            amount=b_data['amount'],
            status=BillStatus.PAID if b_data['status'] == 'paid' else BillStatus.PENDING,
            due_date=now + timedelta(days=b_data['days_due']),
            paid_date=now + timedelta(days=b_data['days_due']) if b_data['status'] == 'paid' else None
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
