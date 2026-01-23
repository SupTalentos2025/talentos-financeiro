import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import "@/App.css";
import axios from "axios";
import {
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Plus,
  Trash2,
  Package,
  CreditCard,
  CheckCircle,
  Clock,
  BarChart3,
  Menu,
  X,
  RefreshCw,
  Award,
  Target,
  LogOut,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  ChevronDown,
  Settings,
  PlusCircle,
  Bell,
  BellRing,
  AlertTriangle,
  AlertCircle,
  Info,
  TrendingDown,
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL ||
  "https://finance-hub-488.preview.emergentagent.com";

const API = BACKEND_URL;

// Configure axios
axios.defaults.withCredentials = true;

// Format currency
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

// Format CNPJ
const formatCNPJ = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

// ============ AUTH CALLBACK ============
function AuthCallback({ onAuthSuccess }) {
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = window.location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1];
        try {
          const response = await axios.post(`${API}/auth/google/session`, { session_id: sessionId });
          window.history.replaceState(null, "", window.location.pathname);
          onAuthSuccess(response.data);
        } catch (error) {
          console.error("Auth error:", error);
          window.history.replaceState(null, "", window.location.pathname);
        }
      }
    };

    processAuth();
  }, [onAuthSuccess]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );
}

// ============ LOGIN PAGE ============
function LoginPage({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        const response = await axios.post(`${API}/auth/login`, { email, password });
        onAuthSuccess(response.data);
      } else {
        if (!name.trim()) {
          setError("Nome é obrigatório");
          setLoading(false);
          return;
        }
        const response = await axios.post(`${API}/auth/register`, { email, password, name });
        onAuthSuccess(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-xl bg-blue-600">
              <Target className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">FinanceFlow</CardTitle>
          <CardDescription>Sistema de Gestão Multi-Empresas</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={isLogin ? "login" : "register"} onValueChange={(v) => setIsLogin(v === "login")}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Cadastrar</TabsTrigger>
            </TabsList>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                {isLogin ? "Entrar" : "Cadastrar"}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin}>
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </Button>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ COMPANY SELECTOR ============
function CompanySelector({ companies, selectedCompany, onSelectCompany, onAddCompany }) {
  if (companies.length === 0) {
    return (
      <Button variant="outline" className="w-full justify-start" onClick={onAddCompany}>
        <PlusCircle className="h-4 w-4 mr-2" />
        Cadastrar Empresa
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{selectedCompany?.name || "Selecionar Empresa"}</span>
          </div>
          <ChevronDown className="h-4 w-4 flex-shrink-0 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        {companies.map((company) => (
          <DropdownMenuItem
            key={company.id}
            onClick={() => onSelectCompany(company)}
            className={selectedCompany?.id === company.id ? "bg-muted" : ""}
          >
            <div className="flex flex-col">
              <span className="font-medium">{company.name}</span>
              <span className="text-xs text-muted-foreground">{company.cnpj}</span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onAddCompany}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Cadastrar Nova Empresa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============ MAIN DASHBOARD ============
function Dashboard({ user, onLogout }) {
  // Companies state
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyCNPJ, setCompanyCNPJ] = useState("");

  // Data state
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [bills, setBills] = useState([]);
  const [topProductsWeek, setTopProductsWeek] = useState([]);
  const [topProductsMonth, setTopProductsMonth] = useState([]);
  const [dailySales, setDailySales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dialog states
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [billDialogOpen, setBillDialogOpen] = useState(false);

  // Form states
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCost, setProductCost] = useState("");
  const [productStock, setProductStock] = useState("");
  const [saleProductId, setSaleProductId] = useState("");
  const [saleQuantity, setSaleQuantity] = useState("");
  const [billDescription, setBillDescription] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState("");

  // Create axios instance with company header
  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: API,
      withCredentials: true,
    });
    
    if (selectedCompany) {
      instance.defaults.headers.common["X-Company-ID"] = selectedCompany.id;
    }
    
    return instance;
  }, [selectedCompany]);

  // Fetch companies
  const fetchCompanies = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/companies`);
      setCompanies(response.data);
      
      // Auto-select first company or from localStorage
      const savedCompanyId = localStorage.getItem("selectedCompanyId");
      if (response.data.length > 0) {
        const company = response.data.find(c => c.id === savedCompanyId) || response.data[0];
        setSelectedCompany(company);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
      if (error.response?.status === 401) {
        onLogout();
      }
    }
  }, [onLogout]);

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    if (!selectedCompany) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const headers = { "X-Company-ID": selectedCompany.id };
      
      const [statsRes, productsRes, salesRes, billsRes, topWeekRes, topMonthRes, dailyRes] =
        await Promise.all([
          axios.get(`${API}/dashboard/stats`, { headers }),
          axios.get(`${API}/products`, { headers }),
          axios.get(`${API}/sales?limit=50`, { headers }),
          axios.get(`${API}/bills`, { headers }),
          axios.get(`${API}/dashboard/top-products-week`, { headers }),
          axios.get(`${API}/dashboard/top-products-month`, { headers }),
          axios.get(`${API}/dashboard/daily-sales?days=7`, { headers }),
        ]);

      setStats(statsRes.data);
      setProducts(productsRes.data);
      setSales(salesRes.data);
      setBills(billsRes.data);
      setTopProductsWeek(topWeekRes.data);
      setTopProductsMonth(topMonthRes.data);
      setDailySales(dailyRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  // Company actions
  const createCompany = async () => {
    try {
      const response = await axios.post(`${API}/companies`, {
        name: companyName,
        cnpj: companyCNPJ.replace(/\D/g, ""),
      });
      setCompanyDialogOpen(false);
      setCompanyName("");
      setCompanyCNPJ("");
      await fetchCompanies();
      setSelectedCompany(response.data);
      localStorage.setItem("selectedCompanyId", response.data.id);
    } catch (error) {
      alert(error.response?.data?.detail || "Erro ao criar empresa");
    }
  };

  const selectCompany = (company) => {
    setSelectedCompany(company);
    localStorage.setItem("selectedCompanyId", company.id);
  };

  // CRUD operations
  const createProduct = async () => {
    try {
      await api.post("/products", {
        name: productName,
        price: parseFloat(productPrice),
        cost: parseFloat(productCost) || 0,
        stock: parseInt(productStock) || 0,
      });
      setProductDialogOpen(false);
      setProductName("");
      setProductPrice("");
      setProductCost("");
      setProductStock("");
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || "Erro ao criar produto");
    }
  };

  const deleteProduct = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      await fetchData();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const createSale = async () => {
    try {
      await api.post("/sales", {
        product_id: saleProductId,
        quantity: parseInt(saleQuantity),
      });
      setSaleDialogOpen(false);
      setSaleProductId("");
      setSaleQuantity("");
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || "Erro ao registrar venda");
    }
  };

  const deleteSale = async (id) => {
    try {
      await api.delete(`/sales/${id}`);
      await fetchData();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const createBill = async () => {
    try {
      await api.post("/bills", {
        description: billDescription,
        amount: parseFloat(billAmount),
        due_date: new Date(billDueDate).toISOString(),
      });
      setBillDialogOpen(false);
      setBillDescription("");
      setBillAmount("");
      setBillDueDate("");
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || "Erro ao criar conta");
    }
  };

  const payBill = async (id) => {
    try {
      await api.put(`/bills/${id}/pay`);
      await fetchData();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const deleteBill = async (id) => {
    try {
      await api.delete(`/bills/${id}`);
      await fetchData();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const seedData = async () => {
    try {
      setLoading(true);
      await api.post("/seed");
      await fetchData();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const clearData = async () => {
    try {
      setLoading(true);
      await api.post("/clear");
      await fetchData();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`);
    } catch (error) {
      console.error("Error:", error);
    }
    localStorage.removeItem("selectedCompanyId");
    onLogout();
  };

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pendingBills = useMemo(() => bills.filter((b) => b.status === "pending"), [bills]);
  const paidBills = useMemo(() => bills.filter((b) => b.status === "paid"), [bills]);

  // Show company creation if no companies
  const showNoCompanyState = companies.length === 0 || !selectedCompany;

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-card border-r transform transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-600">
              <Target className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg">FinanceFlow</span>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3 mb-3">
            {user.picture ? (
              <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          
          {/* Company Selector */}
          <CompanySelector
            companies={companies}
            selectedCompany={selectedCompany}
            onSelectCompany={selectCompany}
            onAddCompany={() => setCompanyDialogOpen(true)}
          />
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          <Button
            variant={activeTab === "dashboard" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => { setActiveTab("dashboard"); setSidebarOpen(false); }}
            disabled={showNoCompanyState}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <Button
            variant={activeTab === "sales" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => { setActiveTab("sales"); setSidebarOpen(false); }}
            disabled={showNoCompanyState}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Vendas
          </Button>
          <Button
            variant={activeTab === "products" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => { setActiveTab("products"); setSidebarOpen(false); }}
            disabled={showNoCompanyState}
          >
            <Package className="h-4 w-4 mr-2" />
            Produtos
          </Button>
          <Button
            variant={activeTab === "bills" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => { setActiveTab("bills"); setSidebarOpen(false); }}
            disabled={showNoCompanyState}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Contas
          </Button>
          <Button
            variant={activeTab === "companies" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => { setActiveTab("companies"); setSidebarOpen(false); }}
          >
            <Building2 className="h-4 w-4 mr-2" />
            Empresas
          </Button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t space-y-2">
          {selectedCompany && (
            <>
              <Button variant="outline" className="w-full" onClick={seedData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Carregar Demo
              </Button>
              <Button variant="outline" className="w-full text-destructive" onClick={clearData}>
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Dados
              </Button>
            </>
          )}
          <Button variant="ghost" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">
                  {activeTab === "companies" ? "Minhas Empresas" : selectedCompany?.name || "FinanceFlow"}
                </h1>
                {selectedCompany && activeTab !== "companies" && (
                  <p className="text-xs text-muted-foreground">CNPJ: {selectedCompany.cnpj}</p>
                )}
              </div>
            </div>
            {selectedCompany && activeTab !== "companies" && (
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            )}
          </div>
        </header>

        <div className="p-4 lg:p-6 space-y-6">
          {/* No Company State */}
          {showNoCompanyState && activeTab !== "companies" ? (
            <Card className="max-w-md mx-auto">
              <CardHeader className="text-center">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <CardTitle>Cadastre sua Empresa</CardTitle>
                <CardDescription>
                  Para começar a usar o sistema, cadastre pelo menos uma empresa com CNPJ
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setCompanyDialogOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Cadastrar Empresa
                </Button>
              </CardContent>
            </Card>
          ) : loading && activeTab !== "companies" ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Companies Tab */}
              {activeTab === "companies" && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Minhas Empresas</CardTitle>
                      <CardDescription>Gerencie suas empresas por CNPJ</CardDescription>
                    </div>
                    <Button onClick={() => setCompanyDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Empresa
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {companies.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhuma empresa cadastrada</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {companies.map((company) => (
                          <div
                            key={company.id}
                            className={`flex items-center justify-between p-4 rounded-lg border ${
                              selectedCompany?.id === company.id ? "border-blue-500 bg-blue-50" : ""
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-2 rounded-full bg-blue-500/10">
                                <Building2 className="h-5 w-5 text-blue-500" />
                              </div>
                              <div>
                                <p className="font-medium">{company.name}</p>
                                <p className="text-sm text-muted-foreground">CNPJ: {company.cnpj}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {selectedCompany?.id === company.id ? (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Ativa</span>
                              ) : (
                                <Button variant="outline" size="sm" onClick={() => selectCompany(company)}>
                                  Selecionar
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Dashboard Tab */}
              {activeTab === "dashboard" && selectedCompany && (
                <>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <Card className="border-l-4 border-l-blue-500">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vendas do Dia</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-blue-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          {stats ? formatCurrency(stats.sales_today) : "---"}
                        </div>
                        <p className="text-xs text-muted-foreground">{stats?.sales_count_today || 0} vendas</p>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-green-500">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vendas do Mês</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {stats ? formatCurrency(stats.sales_month) : "---"}
                        </div>
                        <p className="text-xs text-muted-foreground">{stats?.sales_count_month || 0} vendas</p>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-red-500">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Contas a Pagar</CardTitle>
                        <Clock className="h-4 w-4 text-red-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                          {stats ? formatCurrency(stats.bills_to_pay) : "---"}
                        </div>
                        <p className="text-xs text-muted-foreground">Pendentes</p>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-emerald-500">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Contas Pagas</CardTitle>
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">
                          {stats ? formatCurrency(stats.bills_paid) : "---"}
                        </div>
                        <p className="text-xs text-muted-foreground">Este mês</p>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-purple-500">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lucro do Mês</CardTitle>
                        <DollarSign className="h-4 w-4 text-purple-500" />
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${stats?.profit_month >= 0 ? "text-purple-600" : "text-red-600"}`}>
                          {stats ? formatCurrency(stats.profit_month) : "---"}
                        </div>
                        <p className="text-xs text-muted-foreground">Líquido</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-blue-500" />
                          Vendas - Últimos 7 Dias
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailySales}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis tickFormatter={(v) => `R$${v/1000}k`} />
                              <Tooltip formatter={(value) => formatCurrency(value)} />
                              <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-yellow-500" />
                          Mais Vendidos - Semana
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {topProductsWeek.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Nenhuma venda esta semana</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {topProductsWeek.slice(0, 5).map((product, index) => (
                              <div key={product.product_id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${index === 0 ? "bg-yellow-500" : "bg-gray-300"}`}>
                                    {index + 1}
                                  </div>
                                  <div>
                                    <p className="font-medium">{product.product_name}</p>
                                    <p className="text-sm text-muted-foreground">{product.quantity_sold} un.</p>
                                  </div>
                                </div>
                                <span className="font-semibold text-green-600">{formatCurrency(product.total_revenue)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              {/* Sales Tab */}
              {activeTab === "sales" && selectedCompany && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Vendas</CardTitle>
                      <CardDescription>Vendas de {selectedCompany.name}</CardDescription>
                    </div>
                    <Button onClick={() => setSaleDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Venda
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {sales.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhuma venda registrada</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[500px]">
                        <div className="space-y-3">
                          {sales.map((sale) => (
                            <div key={sale.id} className="flex items-center justify-between p-4 rounded-lg border">
                              <div className="flex items-center gap-4">
                                <div className="p-2 rounded-full bg-green-500/10">
                                  <ShoppingCart className="h-5 w-5 text-green-500" />
                                </div>
                                <div>
                                  <p className="font-medium">{sale.product_name}</p>
                                  <p className="text-sm text-muted-foreground">{sale.quantity}x {formatCurrency(sale.unit_price)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="font-semibold text-green-600">{formatCurrency(sale.total)}</p>
                                  <p className="text-xs text-muted-foreground">{formatDate(sale.date)}</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => deleteSale(sale.id)}>
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
              )}

              {/* Products Tab */}
              {activeTab === "products" && selectedCompany && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Produtos</CardTitle>
                      <CardDescription>Produtos de {selectedCompany.name}</CardDescription>
                    </div>
                    <Button onClick={() => setProductDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Produto
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {products.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum produto cadastrado</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[500px]">
                        <div className="space-y-3">
                          {products.map((product) => (
                            <div key={product.id} className="flex items-center justify-between p-4 rounded-lg border">
                              <div className="flex items-center gap-4">
                                <div className="p-2 rounded-full bg-blue-500/10">
                                  <Package className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                  <p className="font-medium">{product.name}</p>
                                  <p className="text-sm text-muted-foreground">Custo: {formatCurrency(product.cost)} • Estoque: {product.stock}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-lg font-semibold text-green-600">{formatCurrency(product.price)}</span>
                                <Button variant="ghost" size="icon" onClick={() => deleteProduct(product.id)}>
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
              )}

              {/* Bills Tab */}
              {activeTab === "bills" && selectedCompany && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Contas</CardTitle>
                      <CardDescription>Contas de {selectedCompany.name}</CardDescription>
                    </div>
                    <Button onClick={() => setBillDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Conta
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          A Pagar ({pendingBills.length})
                        </h4>
                        {pendingBills.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nenhuma conta pendente</p>
                        ) : (
                          <div className="space-y-2">
                            {pendingBills.map((bill) => (
                              <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50">
                                <div>
                                  <p className="font-medium">{bill.description}</p>
                                  <p className="text-sm text-muted-foreground">Vence: {formatDate(bill.due_date)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-red-600">{formatCurrency(bill.amount)}</span>
                                  <Button size="sm" variant="outline" onClick={() => payBill(bill.id)}>
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => deleteBill(bill.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Pagas ({paidBills.length})
                        </h4>
                        {paidBills.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nenhuma conta paga</p>
                        ) : (
                          <div className="space-y-2">
                            {paidBills.map((bill) => (
                              <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg border border-green-200 bg-green-50">
                                <div>
                                  <p className="font-medium">{bill.description}</p>
                                  <p className="text-sm text-muted-foreground">Pago: {bill.paid_date ? formatDate(bill.paid_date) : "-"}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-green-600">{formatCurrency(bill.amount)}</span>
                                  <Button size="sm" variant="ghost" onClick={() => deleteBill(bill.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>

      {/* Company Dialog */}
      <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Empresa</DialogTitle>
            <DialogDescription>Adicione uma nova empresa para gerenciar</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Empresa</Label>
              <Input
                placeholder="Ex: Minha Loja"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input
                placeholder="00.000.000/0000-00"
                value={companyCNPJ}
                onChange={(e) => setCompanyCNPJ(formatCNPJ(e.target.value))}
                maxLength={18}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createCompany} disabled={!companyName || companyCNPJ.replace(/\D/g, "").length !== 14}>
              Cadastrar Empresa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Produto</Label>
              <Input placeholder="Ex: Camiseta" value={productName} onChange={(e) => setProductName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço de Venda</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Custo</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={productCost} onChange={(e) => setProductCost(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estoque Inicial</Label>
              <Input type="number" placeholder="0" value={productStock} onChange={(e) => setProductStock(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createProduct} disabled={!productName || !productPrice}>Salvar Produto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sale Dialog */}
      <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select value={saleProductId} onValueChange={setSaleProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} - {formatCurrency(p.price)} (Est: {p.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input type="number" placeholder="1" value={saleQuantity} onChange={(e) => setSaleQuantity(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createSale} disabled={!saleProductId || !saleQuantity}>Registrar Venda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bill Dialog */}
      <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Conta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input placeholder="Ex: Aluguel" value={billDescription} onChange={(e) => setBillDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
              <Input type="date" value={billDueDate} onChange={(e) => setBillDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createBill} disabled={!billDescription || !billAmount || !billDueDate}>Salvar Conta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ MAIN APP ============
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasSessionId = window.location.hash?.includes("session_id=");

  const handleAuthSuccess = useCallback((userData) => {
    setUser(userData);
    setLoading(false);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
  }, []);

  useEffect(() => {
    if (hasSessionId) return;

    const checkAuth = async () => {
      try {
        const response = await axios.get(`${API}/auth/me`);
        setUser(response.data);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [hasSessionId]);

  if (hasSessionId) {
    return <AuthCallback onAuthSuccess={handleAuthSuccess} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage onAuthSuccess={handleAuthSuccess} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

export default App;
