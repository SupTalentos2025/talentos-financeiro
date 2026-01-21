import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Trash2,
  CreditCard,
  PiggyBank,
  Building,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  LayoutDashboard,
  Receipt,
  Settings,
  Menu,
  X,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Format currency in BRL
const formatCurrency = (value) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

// Format date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

// Account icon mapping
const getAccountIcon = (type) => {
  switch (type) {
    case "checking":
      return <Building className="h-5 w-5" />;
    case "savings":
      return <PiggyBank className="h-5 w-5" />;
    case "credit_card":
      return <CreditCard className="h-5 w-5" />;
    case "investment":
      return <LineChart className="h-5 w-5" />;
    default:
      return <Wallet className="h-5 w-5" />;
  }
};

// Transaction type colors
const typeColors = {
  income: "#10B981",
  expense: "#EF4444",
  transfer: "#3B82F6",
};

function App() {
  // State
  const [stats, setStats] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Dialog states
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  
  // Form states
  const [newTransaction, setNewTransaction] = useState({
    description: "",
    amount: "",
    type: "expense",
    category_id: "",
    account_id: "",
  });
  
  const [newAccount, setNewAccount] = useState({
    name: "",
    account_type: "checking",
    balance: "",
    color: "#3B82F6",
  });

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, accountsRes, categoriesRes, transactionsRes, monthlyRes, expensesRes] =
        await Promise.all([
          axios.get(`${API}/dashboard/stats`),
          axios.get(`${API}/accounts`),
          axios.get(`${API}/categories`),
          axios.get(`${API}/transactions?limit=50`),
          axios.get(`${API}/dashboard/monthly?months=6`),
          axios.get(`${API}/dashboard/expenses-by-category`),
        ]);

      setStats(statsRes.data);
      setAccounts(accountsRes.data);
      setCategories(categoriesRes.data);
      setTransactions(transactionsRes.data);
      setMonthlyData(monthlyRes.data);
      setExpensesByCategory(expensesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Seed data
  const seedData = async () => {
    try {
      setLoading(true);
      await axios.post(`${API}/seed`);
      await fetchData();
    } catch (error) {
      console.error("Error seeding data:", error);
    }
  };

  // Create transaction
  const createTransaction = async () => {
    try {
      await axios.post(`${API}/transactions`, {
        ...newTransaction,
        amount: parseFloat(newTransaction.amount),
      });
      setTransactionDialogOpen(false);
      setNewTransaction({
        description: "",
        amount: "",
        type: "expense",
        category_id: "",
        account_id: "",
      });
      await fetchData();
    } catch (error) {
      console.error("Error creating transaction:", error);
    }
  };

  // Delete transaction
  const deleteTransaction = async (id) => {
    try {
      await axios.delete(`${API}/transactions/${id}`);
      await fetchData();
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  };

  // Create account
  const createAccount = async () => {
    try {
      await axios.post(`${API}/accounts`, {
        ...newAccount,
        balance: parseFloat(newAccount.balance) || 0,
      });
      setAccountDialogOpen(false);
      setNewAccount({
        name: "",
        account_type: "checking",
        balance: "",
        color: "#3B82F6",
      });
      await fetchData();
    } catch (error) {
      console.error("Error creating account:", error);
    }
  };

  // Delete account
  const deleteAccount = async (id) => {
    try {
      await axios.delete(`${API}/accounts/${id}`);
      await fetchData();
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Stats cards component
  const StatsCards = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card data-testid="total-balance-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="total-balance">
            {stats ? formatCurrency(stats.total_balance) : "---"}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats?.accounts_count || 0} contas ativas
          </p>
        </CardContent>
      </Card>

      <Card data-testid="income-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Receitas (Mês)</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500" data-testid="total-income">
            {stats ? formatCurrency(stats.total_income) : "---"}
          </div>
          <div className="flex items-center text-xs text-green-500">
            <ArrowUpRight className="h-3 w-3 mr-1" />
            Entradas do mês
          </div>
        </CardContent>
      </Card>

      <Card data-testid="expenses-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Despesas (Mês)</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500" data-testid="total-expenses">
            {stats ? formatCurrency(stats.total_expenses) : "---"}
          </div>
          <div className="flex items-center text-xs text-red-500">
            <ArrowDownRight className="h-3 w-3 mr-1" />
            Saídas do mês
          </div>
        </CardContent>
      </Card>

      <Card data-testid="net-income-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Balanço (Mês)</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              stats?.net_income >= 0 ? "text-green-500" : "text-red-500"
            }`}
            data-testid="net-income"
          >
            {stats ? formatCurrency(stats.net_income) : "---"}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats?.transactions_count || 0} transações
          </p>
        </CardContent>
      </Card>
    </div>
  );

  // Charts component
  const Charts = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <Card data-testid="monthly-chart">
        <CardHeader>
          <CardTitle>Evolução Mensal</CardTitle>
          <CardDescription>Receitas vs Despesas dos últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `R$${v / 1000}k`} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Receitas"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#colorIncome)"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Despesas"
                  stroke="#EF4444"
                  fillOpacity={1}
                  fill="url(#colorExpenses)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="category-chart">
        <CardHeader>
          <CardTitle>Despesas por Categoria</CardTitle>
          <CardDescription>Distribuição das despesas do mês</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percentage }) => `${category} (${percentage}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Nenhuma despesa registrada
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Accounts list component
  const AccountsList = () => (
    <Card data-testid="accounts-list">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Contas</CardTitle>
          <CardDescription>Gerencie suas contas bancárias</CardDescription>
        </div>
        <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="add-account-btn">
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Conta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da Conta</Label>
                <Input
                  data-testid="account-name-input"
                  placeholder="Ex: Conta Corrente"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={newAccount.account_type}
                  onValueChange={(value) => setNewAccount({ ...newAccount, account_type: value })}
                >
                  <SelectTrigger data-testid="account-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Conta Corrente</SelectItem>
                    <SelectItem value="savings">Poupança</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    <SelectItem value="investment">Investimentos</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Saldo Inicial</Label>
                <Input
                  data-testid="account-balance-input"
                  type="number"
                  placeholder="0.00"
                  value={newAccount.balance}
                  onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <Input
                  type="color"
                  value={newAccount.color}
                  onChange={(e) => setNewAccount({ ...newAccount, color: e.target.value })}
                  className="h-10 w-full"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createAccount} data-testid="save-account-btn">
                Salvar Conta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma conta cadastrada</p>
            <p className="text-sm">Clique em "Nova Conta" para começar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 rounded-lg border"
                data-testid={`account-${account.id}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="p-2 rounded-full"
                    style={{ backgroundColor: `${account.color}20` }}
                  >
                    <div style={{ color: account.color }}>{getAccountIcon(account.account_type)}</div>
                  </div>
                  <div>
                    <p className="font-medium">{account.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {account.account_type.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-lg font-semibold ${
                      account.balance >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {formatCurrency(account.balance)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteAccount(account.id)}
                    data-testid={`delete-account-${account.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Transactions list component
  const TransactionsList = () => (
    <Card data-testid="transactions-list">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Transações Recentes</CardTitle>
          <CardDescription>Últimas movimentações financeiras</CardDescription>
        </div>
        <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="add-transaction-btn">
              <Plus className="h-4 w-4 mr-2" />
              Nova Transação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Transação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  data-testid="transaction-description-input"
                  placeholder="Ex: Supermercado"
                  value={newTransaction.description}
                  onChange={(e) =>
                    setNewTransaction({ ...newTransaction, description: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  data-testid="transaction-amount-input"
                  type="number"
                  placeholder="0.00"
                  value={newTransaction.amount}
                  onChange={(e) =>
                    setNewTransaction({ ...newTransaction, amount: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={newTransaction.type}
                  onValueChange={(value) =>
                    setNewTransaction({ ...newTransaction, type: value, category_id: "" })
                  }
                >
                  <SelectTrigger data-testid="transaction-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Despesa</SelectItem>
                    <SelectItem value="income">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={newTransaction.category_id}
                  onValueChange={(value) =>
                    setNewTransaction({ ...newTransaction, category_id: value })
                  }
                >
                  <SelectTrigger data-testid="transaction-category-select">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter((cat) => cat.type === newTransaction.type)
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Conta</Label>
                <Select
                  value={newTransaction.account_id}
                  onValueChange={(value) =>
                    setNewTransaction({ ...newTransaction, account_id: value })
                  }
                >
                  <SelectTrigger data-testid="transaction-account-select">
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={createTransaction}
                disabled={!newTransaction.description || !newTransaction.amount || !newTransaction.account_id}
                data-testid="save-transaction-btn"
              >
                Salvar Transação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma transação registrada</p>
            <p className="text-sm">Clique em "Nova Transação" para começar</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  data-testid={`transaction-${transaction.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-full ${
                        transaction.type === "income"
                          ? "bg-green-500/10"
                          : "bg-red-500/10"
                      }`}
                    >
                      {transaction.type === "income" ? (
                        <ArrowUpRight className="h-5 w-5 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{transaction.account_name}</span>
                        {transaction.category_name && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">
                              {transaction.category_name}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          transaction.type === "income" ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTransaction(transaction.id)}
                      data-testid={`delete-transaction-${transaction.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );

  // Category expenses breakdown
  const CategoryBreakdown = () => (
    <Card data-testid="category-breakdown">
      <CardHeader>
        <CardTitle>Detalhamento por Categoria</CardTitle>
        <CardDescription>Despesas do mês atual</CardDescription>
      </CardHeader>
      <CardContent>
        {expensesByCategory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma despesa no mês</p>
          </div>
        ) : (
          <div className="space-y-4">
            {expensesByCategory.map((cat, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-medium">{cat.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{cat.percentage}%</span>
                    <span className="font-semibold">{formatCurrency(cat.amount)}</span>
                  </div>
                </div>
                <Progress value={cat.percentage} className="h-2" style={{ "--progress-background": cat.color }} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Sidebar navigation
  const Sidebar = () => (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary">
              <DollarSign className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">FinanceHub</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <nav className="p-4 space-y-2">
          <Button
            variant={activeTab === "dashboard" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => {
              setActiveTab("dashboard");
              setSidebarOpen(false);
            }}
            data-testid="nav-dashboard"
          >
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <Button
            variant={activeTab === "transactions" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => {
              setActiveTab("transactions");
              setSidebarOpen(false);
            }}
            data-testid="nav-transactions"
          >
            <Receipt className="h-4 w-4 mr-2" />
            Transações
          </Button>
          <Button
            variant={activeTab === "accounts" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => {
              setActiveTab("accounts");
              setSidebarOpen(false);
            }}
            data-testid="nav-accounts"
          >
            <Wallet className="h-4 w-4 mr-2" />
            Contas
          </Button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={seedData}
            data-testid="seed-data-btn"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Carregar Dados Demo
          </Button>
        </div>
      </aside>
    </>
  );

  // Main content
  const MainContent = () => (
    <main className="lg:ml-64 min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold capitalize">{activeTab}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} data-testid="refresh-btn">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 lg:p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {activeTab === "dashboard" && (
              <>
                <StatsCards />
                <Charts />
                <div className="grid gap-4 md:grid-cols-2">
                  <TransactionsList />
                  <CategoryBreakdown />
                </div>
              </>
            )}

            {activeTab === "transactions" && (
              <div className="grid gap-4">
                <TransactionsList />
              </div>
            )}

            {activeTab === "accounts" && (
              <div className="grid gap-4">
                <AccountsList />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MainContent />
    </div>
  );
}

export default App;
