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
app = FastAPI(title="Finance Dashboard API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class TransactionType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"

class AccountType(str, Enum):
    CHECKING = "checking"
    SAVINGS = "savings"
    CREDIT_CARD = "credit_card"
    INVESTMENT = "investment"
    CASH = "cash"

# Models
class Account(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    account_type: AccountType
    balance: float = 0.0
    color: str = "#3B82F6"
    icon: str = "wallet"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AccountCreate(BaseModel):
    name: str
    account_type: AccountType
    balance: float = 0.0
    color: str = "#3B82F6"
    icon: str = "wallet"

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    account_type: Optional[AccountType] = None
    balance: Optional[float] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: TransactionType
    color: str = "#6B7280"
    icon: str = "tag"

class CategoryCreate(BaseModel):
    name: str
    type: TransactionType
    color: str = "#6B7280"
    icon: str = "tag"

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str
    amount: float
    type: TransactionType
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    account_id: str
    account_name: Optional[str] = None
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionCreate(BaseModel):
    description: str
    amount: float
    type: TransactionType
    category_id: Optional[str] = None
    account_id: str
    date: Optional[datetime] = None
    notes: Optional[str] = None

class DashboardStats(BaseModel):
    total_balance: float
    total_income: float
    total_expenses: float
    net_income: float
    accounts_count: int
    transactions_count: int

class MonthlyData(BaseModel):
    month: str
    income: float
    expenses: float

class CategoryExpense(BaseModel):
    category: str
    amount: float
    percentage: float
    color: str

# Helper functions
def serialize_datetime(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def doc_to_dict(doc):
    result = {}
    for key, value in doc.items():
        if key == '_id':
            continue
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Finance Dashboard API", "version": "1.0.0"}

# ============ ACCOUNTS ENDPOINTS ============
@api_router.post("/accounts", response_model=Account)
async def create_account(input: AccountCreate):
    account = Account(**input.model_dump())
    doc = account.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.accounts.insert_one(doc)
    return account

@api_router.get("/accounts", response_model=List[Account])
async def get_accounts():
    accounts = await db.accounts.find({}, {"_id": 0}).to_list(100)
    for acc in accounts:
        if isinstance(acc.get('created_at'), str):
            acc['created_at'] = datetime.fromisoformat(acc['created_at'])
    return accounts

@api_router.get("/accounts/{account_id}", response_model=Account)
async def get_account(account_id: str):
    account = await db.accounts.find_one({"id": account_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if isinstance(account.get('created_at'), str):
        account['created_at'] = datetime.fromisoformat(account['created_at'])
    return account

@api_router.put("/accounts/{account_id}", response_model=Account)
async def update_account(account_id: str, input: AccountUpdate):
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.accounts.update_one({"id": account_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    
    account = await db.accounts.find_one({"id": account_id}, {"_id": 0})
    if isinstance(account.get('created_at'), str):
        account['created_at'] = datetime.fromisoformat(account['created_at'])
    return account

@api_router.delete("/accounts/{account_id}")
async def delete_account(account_id: str):
    result = await db.accounts.delete_one({"id": account_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    # Also delete related transactions
    await db.transactions.delete_many({"account_id": account_id})
    return {"message": "Account deleted successfully"}

# ============ CATEGORIES ENDPOINTS ============
@api_router.post("/categories", response_model=Category)
async def create_category(input: CategoryCreate):
    category = Category(**input.model_dump())
    doc = category.model_dump()
    await db.categories.insert_one(doc)
    return category

@api_router.get("/categories", response_model=List[Category])
async def get_categories(type: Optional[TransactionType] = None):
    query = {}
    if type:
        query["type"] = type.value
    categories = await db.categories.find(query, {"_id": 0}).to_list(100)
    return categories

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}

# ============ TRANSACTIONS ENDPOINTS ============
@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(input: TransactionCreate):
    # Get account info
    account = await db.accounts.find_one({"id": input.account_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Get category info if provided
    category_name = None
    if input.category_id:
        category = await db.categories.find_one({"id": input.category_id}, {"_id": 0})
        if category:
            category_name = category.get('name')
    
    transaction_data = input.model_dump()
    transaction_data['account_name'] = account.get('name')
    transaction_data['category_name'] = category_name
    if not transaction_data.get('date'):
        transaction_data['date'] = datetime.now(timezone.utc)
    
    transaction = Transaction(**transaction_data)
    doc = transaction.model_dump()
    doc['date'] = doc['date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.transactions.insert_one(doc)
    
    # Update account balance
    balance_change = input.amount if input.type == TransactionType.INCOME else -input.amount
    await db.accounts.update_one(
        {"id": input.account_id},
        {"$inc": {"balance": balance_change}}
    )
    
    return transaction

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
    type: Optional[TransactionType] = None,
    account_id: Optional[str] = None,
    category_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    query = {}
    if type:
        query["type"] = type.value
    if account_id:
        query["account_id"] = account_id
    if category_id:
        query["category_id"] = category_id
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    transactions = await db.transactions.find(
        query, {"_id": 0}
    ).sort("date", -1).skip(skip).limit(limit).to_list(limit)
    
    for tx in transactions:
        if isinstance(tx.get('date'), str):
            tx['date'] = datetime.fromisoformat(tx['date'])
        if isinstance(tx.get('created_at'), str):
            tx['created_at'] = datetime.fromisoformat(tx['created_at'])
    
    return transactions

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    # Get transaction first
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Reverse the balance change
    balance_change = transaction['amount'] if transaction['type'] == TransactionType.EXPENSE.value else -transaction['amount']
    await db.accounts.update_one(
        {"id": transaction['account_id']},
        {"$inc": {"balance": balance_change}}
    )
    
    result = await db.transactions.delete_one({"id": transaction_id})
    return {"message": "Transaction deleted successfully"}

# ============ DASHBOARD STATS ENDPOINTS ============
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    # Get all accounts
    accounts = await db.accounts.find({}, {"_id": 0}).to_list(100)
    total_balance = sum(acc.get('balance', 0) for acc in accounts)
    
    # Get current month transactions
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(10000)
    
    total_income = 0
    total_expenses = 0
    
    for tx in transactions:
        tx_date = tx.get('date')
        if isinstance(tx_date, str):
            tx_date = datetime.fromisoformat(tx_date)
        
        if tx_date and tx_date >= start_of_month:
            if tx['type'] == TransactionType.INCOME.value:
                total_income += tx['amount']
            elif tx['type'] == TransactionType.EXPENSE.value:
                total_expenses += tx['amount']
    
    return DashboardStats(
        total_balance=total_balance,
        total_income=total_income,
        total_expenses=total_expenses,
        net_income=total_income - total_expenses,
        accounts_count=len(accounts),
        transactions_count=len(transactions)
    )

@api_router.get("/dashboard/monthly", response_model=List[MonthlyData])
async def get_monthly_data(months: int = Query(6, ge=1, le=12)):
    now = datetime.now(timezone.utc)
    result = []
    
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(10000)
    
    for i in range(months - 1, -1, -1):
        month_date = now - timedelta(days=30 * i)
        month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if month_date.month == 12:
            month_end = month_start.replace(year=month_date.year + 1, month=1)
        else:
            month_end = month_start.replace(month=month_date.month + 1)
        
        income = 0
        expenses = 0
        
        for tx in transactions:
            tx_date = tx.get('date')
            if isinstance(tx_date, str):
                tx_date = datetime.fromisoformat(tx_date)
            
            if tx_date and month_start <= tx_date < month_end:
                if tx['type'] == TransactionType.INCOME.value:
                    income += tx['amount']
                elif tx['type'] == TransactionType.EXPENSE.value:
                    expenses += tx['amount']
        
        result.append(MonthlyData(
            month=month_start.strftime("%b"),
            income=income,
            expenses=expenses
        ))
    
    return result

@api_router.get("/dashboard/expenses-by-category", response_model=List[CategoryExpense])
async def get_expenses_by_category():
    # Get current month transactions
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    transactions = await db.transactions.find(
        {"type": TransactionType.EXPENSE.value},
        {"_id": 0}
    ).to_list(10000)
    
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    category_colors = {cat['id']: cat.get('color', '#6B7280') for cat in categories}
    category_names = {cat['id']: cat.get('name', 'Unknown') for cat in categories}
    
    category_totals = {}
    total_expenses = 0
    
    for tx in transactions:
        tx_date = tx.get('date')
        if isinstance(tx_date, str):
            tx_date = datetime.fromisoformat(tx_date)
        
        if tx_date and tx_date >= start_of_month:
            cat_id = tx.get('category_id') or 'uncategorized'
            cat_name = tx.get('category_name') or 'Sem Categoria'
            
            if cat_id not in category_totals:
                category_totals[cat_id] = {
                    'name': cat_name,
                    'amount': 0,
                    'color': category_colors.get(cat_id, '#6B7280')
                }
            category_totals[cat_id]['amount'] += tx['amount']
            total_expenses += tx['amount']
    
    result = []
    for cat_id, data in category_totals.items():
        percentage = (data['amount'] / total_expenses * 100) if total_expenses > 0 else 0
        result.append(CategoryExpense(
            category=data['name'],
            amount=data['amount'],
            percentage=round(percentage, 1),
            color=data['color']
        ))
    
    result.sort(key=lambda x: x.amount, reverse=True)
    return result

# ============ SEED DATA ENDPOINT ============
@api_router.post("/seed")
async def seed_data():
    """Seed initial data for testing"""
    # Clear existing data
    await db.accounts.delete_many({})
    await db.categories.delete_many({})
    await db.transactions.delete_many({})
    
    # Create accounts
    accounts = [
        Account(name="Conta Corrente", account_type=AccountType.CHECKING, balance=5000.00, color="#3B82F6", icon="building-columns"),
        Account(name="Poupança", account_type=AccountType.SAVINGS, balance=15000.00, color="#10B981", icon="piggy-bank"),
        Account(name="Cartão de Crédito", account_type=AccountType.CREDIT_CARD, balance=-2500.00, color="#EF4444", icon="credit-card"),
        Account(name="Investimentos", account_type=AccountType.INVESTMENT, balance=50000.00, color="#8B5CF6", icon="chart-line"),
    ]
    
    for acc in accounts:
        doc = acc.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.accounts.insert_one(doc)
    
    # Create categories
    expense_categories = [
        Category(name="Alimentação", type=TransactionType.EXPENSE, color="#F59E0B", icon="utensils"),
        Category(name="Transporte", type=TransactionType.EXPENSE, color="#3B82F6", icon="car"),
        Category(name="Moradia", type=TransactionType.EXPENSE, color="#8B5CF6", icon="home"),
        Category(name="Saúde", type=TransactionType.EXPENSE, color="#EF4444", icon="heart-pulse"),
        Category(name="Lazer", type=TransactionType.EXPENSE, color="#EC4899", icon="gamepad-2"),
        Category(name="Educação", type=TransactionType.EXPENSE, color="#06B6D4", icon="graduation-cap"),
        Category(name="Compras", type=TransactionType.EXPENSE, color="#F97316", icon="shopping-bag"),
    ]
    
    income_categories = [
        Category(name="Salário", type=TransactionType.INCOME, color="#10B981", icon="briefcase"),
        Category(name="Freelance", type=TransactionType.INCOME, color="#22C55E", icon="laptop"),
        Category(name="Investimentos", type=TransactionType.INCOME, color="#14B8A6", icon="trending-up"),
        Category(name="Outros", type=TransactionType.INCOME, color="#6B7280", icon="plus-circle"),
    ]
    
    all_categories = expense_categories + income_categories
    for cat in all_categories:
        doc = cat.model_dump()
        await db.categories.insert_one(doc)
    
    # Create sample transactions
    now = datetime.now(timezone.utc)
    transactions_data = [
        # Current month income
        {"description": "Salário Agosto", "amount": 8500.00, "type": TransactionType.INCOME, "category": income_categories[0], "account": accounts[0], "days_ago": 5},
        {"description": "Projeto Freelance", "amount": 2000.00, "type": TransactionType.INCOME, "category": income_categories[1], "account": accounts[0], "days_ago": 10},
        {"description": "Dividendos", "amount": 350.00, "type": TransactionType.INCOME, "category": income_categories[2], "account": accounts[3], "days_ago": 15},
        
        # Current month expenses
        {"description": "Supermercado", "amount": 450.00, "type": TransactionType.EXPENSE, "category": expense_categories[0], "account": accounts[0], "days_ago": 2},
        {"description": "Restaurante", "amount": 120.00, "type": TransactionType.EXPENSE, "category": expense_categories[0], "account": accounts[2], "days_ago": 3},
        {"description": "Combustível", "amount": 250.00, "type": TransactionType.EXPENSE, "category": expense_categories[1], "account": accounts[0], "days_ago": 4},
        {"description": "Aluguel", "amount": 1800.00, "type": TransactionType.EXPENSE, "category": expense_categories[2], "account": accounts[0], "days_ago": 1},
        {"description": "Plano de Saúde", "amount": 400.00, "type": TransactionType.EXPENSE, "category": expense_categories[3], "account": accounts[0], "days_ago": 5},
        {"description": "Cinema", "amount": 80.00, "type": TransactionType.EXPENSE, "category": expense_categories[4], "account": accounts[2], "days_ago": 7},
        {"description": "Curso Online", "amount": 150.00, "type": TransactionType.EXPENSE, "category": expense_categories[5], "account": accounts[2], "days_ago": 12},
        {"description": "Roupas", "amount": 300.00, "type": TransactionType.EXPENSE, "category": expense_categories[6], "account": accounts[2], "days_ago": 8},
        
        # Previous months
        {"description": "Salário Julho", "amount": 8500.00, "type": TransactionType.INCOME, "category": income_categories[0], "account": accounts[0], "days_ago": 35},
        {"description": "Supermercado", "amount": 520.00, "type": TransactionType.EXPENSE, "category": expense_categories[0], "account": accounts[0], "days_ago": 32},
        {"description": "Aluguel", "amount": 1800.00, "type": TransactionType.EXPENSE, "category": expense_categories[2], "account": accounts[0], "days_ago": 31},
        {"description": "Salário Junho", "amount": 8500.00, "type": TransactionType.INCOME, "category": income_categories[0], "account": accounts[0], "days_ago": 65},
        {"description": "Viagem", "amount": 2500.00, "type": TransactionType.EXPENSE, "category": expense_categories[4], "account": accounts[2], "days_ago": 60},
    ]
    
    for tx_data in transactions_data:
        tx = Transaction(
            description=tx_data["description"],
            amount=tx_data["amount"],
            type=tx_data["type"],
            category_id=tx_data["category"].id,
            category_name=tx_data["category"].name,
            account_id=tx_data["account"].id,
            account_name=tx_data["account"].name,
            date=now - timedelta(days=tx_data["days_ago"])
        )
        doc = tx.model_dump()
        doc['date'] = doc['date'].isoformat()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.transactions.insert_one(doc)
    
    return {"message": "Data seeded successfully", "accounts": len(accounts), "categories": len(all_categories), "transactions": len(transactions_data)}

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
