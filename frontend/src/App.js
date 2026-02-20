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
  PlusCircle,
  Bell,
  AlertTriangle,
  AlertCircle,
  Download,
  FileSpreadsheet,
  Calendar,
  Search,
  Edit,
  Filter,
  TrendingDown,
  Boxes,
  Receipt,
  PieChart,
  Smartphone,
  Home,
  Settings,
  Share2,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

axios.defaults.withCredentials = true;

// ============ PWA INSTALL BANNER ============
function InstallBanner({ onClose }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show banner if not installed and not dismissed recently
      const dismissed = localStorage.getItem('pwa-banner-dismissed');
      if (!dismissed || Date.now() - parseInt(dismissed) > 86400000) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    // Check if running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowBanner(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
    if (onClose) onClose();
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-4 md:left-auto md:right-4 md:w-80 bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-2xl z-50 animate-slide-up" data-testid="install-banner">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex-shrink-0">
          <Smartphone className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm">Instalar Talentos</h3>
          <p className="text-xs text-slate-400 mt-1">Adicione à tela inicial para acesso rápido</p>
        </div>
        <button onClick={handleDismiss} className="text-slate-500 hover:text-white p-1">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <Button 
          size="sm" 
          variant="outline" 
          className="flex-1 bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 h-9"
          onClick={handleDismiss}
        >
          Agora não
        </Button>
        <Button 
          size="sm" 
          className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 h-9"
          onClick={handleInstall}
          data-testid="install-app-btn"
        >
          Instalar
        </Button>
      </div>
    </div>
  );
}

// ============ BOTTOM NAVIGATION (MOBILE) ============
function BottomNavigation({ activeTab, onTabChange, unreadNotifications, onNewSale }) {
  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Início' },
    { id: 'sales', icon: ShoppingCart, label: 'Vendas' },
    { id: 'new-sale', icon: Plus, label: 'Vender', isAction: true },
    { id: 'products', icon: Package, label: 'Produtos' },
    { id: 'bills', icon: CreditCard, label: 'Contas' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 safe-bottom md:hidden z-40" data-testid="bottom-nav">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          if (item.isAction) {
            return (
              <button
                key={item.id}
                onClick={onNewSale}
                className="flex flex-col items-center justify-center -mt-6"
                data-testid="quick-sale-btn"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <item.icon className="h-7 w-7 text-white" />
                </div>
              </button>
            );
          }
          
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all ${
                isActive 
                  ? 'text-emerald-400' 
                  : 'text-slate-500'
              }`}
              data-testid={`bottom-nav-${item.id}`}
            >
              <div className="relative">
                <item.icon className={`h-6 w-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
                {item.id === 'dashboard' && unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ============ PULL TO REFRESH ============
function usePullToRefresh(onRefresh) {
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  
  useEffect(() => {
    let ticking = false;
    
    const handleTouchStart = (e) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
      }
    };
    
    const handleTouchMove = (e) => {
      if (startY.current === 0) return;
      currentY.current = e.touches[0].clientY;
    };
    
    const handleTouchEnd = async () => {
      const pullDistance = currentY.current - startY.current;
      if (pullDistance > 100 && window.scrollY === 0 && !refreshing) {
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
        }
      }
      startY.current = 0;
      currentY.current = 0;
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, refreshing]);
  
  return refreshing;
}

// ============ SHARE FUNCTIONALITY ============
async function shareApp() {
  const shareData = {
    title: 'Talentos Financeiro',
    text: 'Gerencie suas finanças com o Talentos!',
    url: window.location.origin,
  };

  if (navigator.share && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error sharing:', err);
      }
    }
  } else {
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(window.location.origin);
      alert('Link copiado!');
    } catch (err) {
      console.error('Could not copy:', err);
    }
  }
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatCNPJ = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

const CHART_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

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
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiMxMGI5ODEiIGZpbGwtb3BhY2l0eT0iLjAzIi8+PC9nPjwvc3ZnPg==')] opacity-40" />
      
      <Card className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border-slate-800 shadow-2xl" data-testid="login-card">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <Target className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Talentos
          </CardTitle>
          <CardDescription className="text-slate-400 text-base">
            Sistema de Gestão Financeira
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs value={isLogin ? "login" : "register"} onValueChange={(v) => setIsLogin(v === "login")}>
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-800/50">
              <TabsTrigger value="login" data-testid="login-tab" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Entrar</TabsTrigger>
              <TabsTrigger value="register" data-testid="register-tab" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Cadastrar</TabsTrigger>
            </TabsList>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300">Nome</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input
                      id="name"
                      data-testid="name-input"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="email"
                    data-testid="email-input"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    data-testid="password-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                data-testid="submit-btn"
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold h-11" 
                disabled={loading}
              >
                {loading && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                {isLogin ? "Entrar" : "Cadastrar"}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-500">ou continue com</span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              data-testid="google-login-btn"
              className="w-full bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700 h-11" 
              onClick={handleGoogleLogin}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </Button>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ NOTIFICATION PANEL ============
function NotificationPanel({ notifications, onClose }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'medium': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'low': return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      default: return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'bill_overdue': return <AlertTriangle className="h-5 w-5" />;
      case 'bill_due': return <Clock className="h-5 w-5" />;
      case 'low_stock': return <Boxes className="h-5 w-5" />;
      case 'sales_summary': return <TrendingUp className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  return (
    <div className="absolute right-0 top-12 w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden" data-testid="notification-panel">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h3 className="font-semibold text-white">Notificações</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="h-96">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Nenhuma notificação</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 ${getPriorityColor(notification.priority)} border-l-4`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{notification.title}</p>
                    <p className="text-xs opacity-80 mt-1">{notification.message}</p>
                    <p className="text-xs opacity-60 mt-2">{notification.company_name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ============ COMPANY SELECTOR ============
function CompanySelector({ companies, selectedCompany, onSelectCompany, onAddCompany }) {
  if (companies.length === 0) {
    return (
      <Button 
        variant="outline" 
        className="w-full justify-start bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700" 
        onClick={onAddCompany}
        data-testid="add-first-company-btn"
      >
        <PlusCircle className="h-4 w-4 mr-2 text-emerald-400" />
        Cadastrar Empresa
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700" data-testid="company-selector">
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
            <span className="truncate">{selectedCompany?.name || "Selecionar"}</span>
          </div>
          <ChevronDown className="h-4 w-4 flex-shrink-0 ml-2 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 bg-slate-900 border-slate-700">
        {companies.map((company) => (
          <DropdownMenuItem
            key={company.id}
            onClick={() => onSelectCompany(company)}
            className={`text-white hover:bg-slate-800 ${selectedCompany?.id === company.id ? "bg-emerald-500/10" : ""}`}
            data-testid={`company-option-${company.id}`}
          >
            <div className="flex flex-col">
              <span className="font-medium">{company.name}</span>
              <span className="text-xs text-slate-400">{company.cnpj}</span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-slate-700" />
        <DropdownMenuItem onClick={onAddCompany} className="text-emerald-400 hover:bg-slate-800" data-testid="add-company-dropdown-btn">
          <PlusCircle className="h-4 w-4 mr-2" />
          Nova Empresa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============ MAIN DASHBOARD ============
function Dashboard({ user, onLogout }) {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyCNPJ, setCompanyCNPJ] = useState("");

  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [bills, setBills] = useState([]);
  const [topProductsWeek, setTopProductsWeek] = useState([]);
  const [topProductsMonth, setTopProductsMonth] = useState([]);
  const [dailySales, setDailySales] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(true);

  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [editProductDialogOpen, setEditProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCost, setProductCost] = useState("");
  const [productStock, setProductStock] = useState("");
  const [productMinStock, setProductMinStock] = useState("5");
  const [productCategory, setProductCategory] = useState("Geral");
  const [saleProductId, setSaleProductId] = useState("");
  const [saleQuantity, setSaleQuantity] = useState("");
  const [billDescription, setBillDescription] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState("");
  const [billCategory, setBillCategory] = useState("Outros");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

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

  const fetchCompanies = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/companies`);
      setCompanies(response.data);

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

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/notifications`);
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, []);

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

  const createProduct = async () => {
    try {
      await api.post("/products", {
        name: productName,
        price: parseFloat(productPrice),
        cost: parseFloat(productCost) || 0,
        stock: parseInt(productStock) || 0,
        min_stock: parseInt(productMinStock) || 5,
        category: productCategory,
      });
      setProductDialogOpen(false);
      resetProductForm();
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || "Erro ao criar produto");
    }
  };

  const updateProduct = async () => {
    if (!editingProduct) return;
    try {
      await api.put(`/products/${editingProduct.id}`, {
        name: productName,
        price: parseFloat(productPrice),
        cost: parseFloat(productCost) || 0,
        stock: parseInt(productStock) || 0,
        min_stock: parseInt(productMinStock) || 5,
        category: productCategory,
      });
      setEditProductDialogOpen(false);
      setEditingProduct(null);
      resetProductForm();
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || "Erro ao atualizar produto");
    }
  };

  const resetProductForm = () => {
    setProductName("");
    setProductPrice("");
    setProductCost("");
    setProductStock("");
    setProductMinStock("5");
    setProductCategory("Geral");
  };

  const openEditProduct = (product) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductPrice(String(product.price));
    setProductCost(String(product.cost || 0));
    setProductStock(String(product.stock || 0));
    setProductMinStock(String(product.min_stock || 5));
    setProductCategory(product.category || "Geral");
    setEditProductDialogOpen(true);
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Excluir este produto?")) return;
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
      await fetchNotifications();
    } catch (error) {
      alert(error.response?.data?.detail || "Erro ao registrar venda");
    }
  };

  const deleteSale = async (id) => {
    if (!window.confirm("Excluir esta venda?")) return;
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
        category: billCategory,
      });
      setBillDialogOpen(false);
      setBillDescription("");
      setBillAmount("");
      setBillDueDate("");
      setBillCategory("Outros");
      await fetchData();
      await fetchNotifications();
    } catch (error) {
      alert(error.response?.data?.detail || "Erro ao criar conta");
    }
  };

  const payBill = async (id) => {
    try {
      await api.put(`/bills/${id}/pay`);
      await fetchData();
      await fetchNotifications();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const deleteBill = async (id) => {
    if (!window.confirm("Excluir esta conta?")) return;
    try {
      await api.delete(`/bills/${id}`);
      await fetchData();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const exportData = async (type) => {
    try {
      const headers = { "X-Company-ID": selectedCompany.id };
      const response = await axios.get(`${API}/export/${type}?format=csv`, {
        headers,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_${selectedCompany.name}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  const seedData = async () => {
    try {
      setLoading(true);
      await api.post("/seed");
      await fetchData();
      await fetchNotifications();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const clearData = async () => {
    if (!window.confirm("Limpar todos os dados desta empresa?")) return;
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
    fetchNotifications();
  }, [fetchCompanies, fetchNotifications]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pendingBills = useMemo(() => bills.filter((b) => b.status === "pending"), [bills]);
  const paidBills = useMemo(() => bills.filter((b) => b.status === "paid"), [bills]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === "all" || p.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, filterCategory]);

  const categories = useMemo(() => {
    return [...new Set(products.map(p => p.category))];
  }, [products]);

  const unreadNotifications = notifications.filter(n => n.priority === 'high' || n.priority === 'medium').length;
  const showNoCompanyState = companies.length === 0 || !selectedCompany;

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "sales", label: "Vendas", icon: ShoppingCart },
    { id: "products", label: "Produtos", icon: Package },
    { id: "bills", label: "Contas", icon: CreditCard },
    { id: "reports", label: "Relatórios", icon: PieChart },
    { id: "companies", label: "Empresas", icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-slate-950" data-testid="dashboard">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-72 bg-slate-900 border-r border-slate-800 transform transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
              <Target className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-xl text-white">Talentos</span>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden text-slate-400" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            {user.picture ? (
              <img src={user.picture} alt={user.name} className="w-11 h-11 rounded-full ring-2 ring-emerald-500/20" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>

          <CompanySelector
            companies={companies}
            selectedCompany={selectedCompany}
            onSelectCompany={selectCompany}
            onAddCompany={() => setCompanyDialogOpen(true)}
          />
        </div>

        <nav className="p-4 space-y-1">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              data-testid={`nav-${item.id}`}
              className={`w-full justify-start h-11 ${
                activeTab === item.id 
                  ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              disabled={showNoCompanyState && item.id !== "companies"}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800 space-y-2">
          {selectedCompany && (
            <>
              <Button variant="outline" className="w-full bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800" onClick={seedData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Carregar Demo
              </Button>
              <Button variant="outline" className="w-full bg-transparent border-red-900/50 text-red-400 hover:bg-red-500/10" onClick={clearData}>
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Dados
              </Button>
            </>
          )}
          <Button variant="ghost" className="w-full text-slate-400 hover:text-white hover:bg-slate-800" onClick={handleLogout} data-testid="logout-btn">
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen">
        <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-lg border-b border-slate-800">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="lg:hidden text-slate-400" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-6 w-6" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {menuItems.find(m => m.id === activeTab)?.label || "Dashboard"}
                </h1>
                {selectedCompany && activeTab !== "companies" && (
                  <p className="text-sm text-slate-400">{selectedCompany.name}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {selectedCompany && activeTab !== "companies" && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800" data-testid="export-dropdown">
                        <Download className="h-4 w-4 mr-2" />
                        Exportar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-900 border-slate-700">
                      <DropdownMenuItem onClick={() => exportData('sales')} className="text-white hover:bg-slate-800" data-testid="export-sales">
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Vendas (CSV)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportData('products')} className="text-white hover:bg-slate-800" data-testid="export-products">
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Produtos (CSV)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportData('bills')} className="text-white hover:bg-slate-800" data-testid="export-bills">
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Contas (CSV)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="relative">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="relative text-slate-400 hover:text-white"
                      onClick={() => setNotificationOpen(!notificationOpen)}
                      data-testid="notification-btn"
                    >
                      <Bell className="h-5 w-5" />
                      {unreadNotifications > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                          {unreadNotifications}
                        </span>
                      )}
                    </Button>
                    {notificationOpen && (
                      <NotificationPanel 
                        notifications={notifications} 
                        onClose={() => setNotificationOpen(false)} 
                      />
                    )}
                  </div>

                  <Button variant="outline" size="sm" className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800" onClick={fetchData} data-testid="refresh-btn">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-6 space-y-6">
          {showNoCompanyState && activeTab !== "companies" ? (
            <Card className="max-w-md mx-auto bg-slate-900 border-slate-800">
              <CardHeader className="text-center">
                <Building2 className="h-16 w-16 mx-auto mb-4 text-emerald-500 opacity-50" />
                <CardTitle className="text-white">Cadastre sua Empresa</CardTitle>
                <CardDescription className="text-slate-400">
                  Para começar, cadastre sua primeira empresa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700" 
                  onClick={() => setCompanyDialogOpen(true)}
                  data-testid="create-first-company-btn"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Cadastrar Empresa
                </Button>
              </CardContent>
            </Card>
          ) : loading && activeTab !== "companies" ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : (
            <>
              {/* Dashboard Tab */}
              {activeTab === "dashboard" && selectedCompany && (
                <>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                    <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20" data-testid="sales-today-card">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">Vendas Hoje</CardTitle>
                        <ShoppingCart className="h-5 w-5 text-blue-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-white">
                          {stats ? formatCurrency(stats.sales_today) : "---"}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{stats?.sales_count_today || 0} vendas</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20" data-testid="sales-month-card">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">Vendas Mês</CardTitle>
                        <TrendingUp className="h-5 w-5 text-emerald-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-white">
                          {stats ? formatCurrency(stats.sales_month) : "---"}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{stats?.sales_count_month || 0} vendas</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20" data-testid="bills-pending-card">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">A Pagar</CardTitle>
                        <Clock className="h-5 w-5 text-red-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-white">
                          {stats ? formatCurrency(stats.bills_to_pay) : "---"}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Pendente</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20" data-testid="profit-card">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">Lucro Mês</CardTitle>
                        <DollarSign className="h-5 w-5 text-purple-400" />
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${stats?.profit_month >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {stats ? formatCurrency(stats.profit_month) : "---"}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Líquido</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20" data-testid="low-stock-card">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">Estoque Baixo</CardTitle>
                        <Boxes className="h-5 w-5 text-amber-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-white">
                          {stats?.low_stock_count || 0}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">produtos</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="bg-slate-900 border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-blue-400" />
                          Vendas - 7 Dias
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailySales}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `R$${v/1000}k`} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                labelStyle={{ color: '#fff' }}
                                formatter={(value) => [formatCurrency(value), 'Vendas']}
                              />
                              <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Award className="h-5 w-5 text-amber-400" />
                          Top Produtos - Semana
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {topProductsWeek.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">
                            <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p>Nenhuma venda esta semana</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {topProductsWeek.slice(0, 5).map((product, index) => (
                              <div key={product.product_id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${index === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-slate-700"}`}>
                                    {index + 1}
                                  </div>
                                  <div>
                                    <p className="font-medium text-white">{product.product_name}</p>
                                    <p className="text-sm text-slate-400">{product.quantity_sold} un.</p>
                                  </div>
                                </div>
                                <span className="font-semibold text-emerald-400">{formatCurrency(product.total_revenue)}</span>
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
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-white">Vendas</CardTitle>
                      <CardDescription className="text-slate-400">Histórico de vendas</CardDescription>
                    </div>
                    <Button 
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                      onClick={() => setSaleDialogOpen(true)}
                      data-testid="new-sale-btn"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Venda
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {sales.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg">Nenhuma venda registrada</p>
                        <p className="text-sm mt-2">Clique em "Nova Venda" para começar</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[500px]">
                        <div className="space-y-3">
                          {sales.map((sale) => (
                            <div key={sale.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors" data-testid={`sale-item-${sale.id}`}>
                              <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-emerald-500/10">
                                  <Receipt className="h-5 w-5 text-emerald-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-white">{sale.product_name}</p>
                                  <p className="text-sm text-slate-400">{sale.quantity}x {formatCurrency(sale.unit_price)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="font-semibold text-emerald-400">{formatCurrency(sale.total)}</p>
                                  <p className="text-xs text-slate-500">{formatDate(sale.date)}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-red-400" onClick={() => deleteSale(sale.id)}>
                                  <Trash2 className="h-4 w-4" />
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
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-white">Produtos</CardTitle>
                        <CardDescription className="text-slate-400">{products.length} produtos cadastrados</CardDescription>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                          <Input
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-full sm:w-48 bg-slate-800 border-slate-700 text-white"
                            data-testid="search-products"
                          />
                        </div>
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                          <SelectTrigger className="w-full sm:w-40 bg-slate-800 border-slate-700 text-white" data-testid="filter-category">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Categoria" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-700">
                            <SelectItem value="all" className="text-white">Todas</SelectItem>
                            {categories.map(cat => (
                              <SelectItem key={cat} value={cat} className="text-white">{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                          onClick={() => setProductDialogOpen(true)}
                          data-testid="new-product-btn"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Novo Produto
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredProducts.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg">Nenhum produto encontrado</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[500px]">
                        <div className="space-y-3">
                          {filteredProducts.map((product) => (
                            <div key={product.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors" data-testid={`product-item-${product.id}`}>
                              <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-blue-500/10">
                                  <Package className="h-5 w-5 text-blue-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-white">{product.name}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">{product.category}</Badge>
                                    <span className="text-sm text-slate-400">Custo: {formatCurrency(product.cost)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <p className="font-semibold text-emerald-400">{formatCurrency(product.price)}</p>
                                  <p className={`text-sm ${product.stock <= product.min_stock ? 'text-red-400' : 'text-slate-400'}`}>
                                    Estoque: {product.stock}
                                  </p>
                                </div>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="text-slate-500 hover:text-blue-400" onClick={() => openEditProduct(product)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="text-slate-500 hover:text-red-400" onClick={() => deleteProduct(product.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
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
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-white">Contas</CardTitle>
                      <CardDescription className="text-slate-400">Contas a pagar e pagas</CardDescription>
                    </div>
                    <Button 
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                      onClick={() => setBillDialogOpen(true)}
                      data-testid="new-bill-btn"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Conta
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="pending" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                        <TabsTrigger value="pending" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
                          <Clock className="h-4 w-4 mr-2" />
                          Pendentes ({pendingBills.length})
                        </TabsTrigger>
                        <TabsTrigger value="paid" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Pagas ({paidBills.length})
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="pending" className="mt-4">
                        {pendingBills.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">
                            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p>Nenhuma conta pendente</p>
                          </div>
                        ) : (
                          <ScrollArea className="h-[400px]">
                            <div className="space-y-3">
                              {pendingBills.map((bill) => {
                                const dueDate = new Date(bill.due_date);
                                const today = new Date();
                                const isOverdue = dueDate < today;
                                
                                return (
                                  <div key={bill.id} className={`flex items-center justify-between p-4 rounded-xl border ${isOverdue ? 'bg-red-500/5 border-red-500/30' : 'bg-slate-800/50 border-slate-700/50'}`} data-testid={`bill-item-${bill.id}`}>
                                    <div className="flex items-center gap-4">
                                      <div className={`p-3 rounded-xl ${isOverdue ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                                        {isOverdue ? <AlertTriangle className="h-5 w-5 text-red-400" /> : <Clock className="h-5 w-5 text-amber-400" />}
                                      </div>
                                      <div>
                                        <p className="font-medium text-white">{bill.description}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">{bill.category}</Badge>
                                          <span className={`text-sm ${isOverdue ? 'text-red-400' : 'text-slate-400'}`}>
                                            Vence: {formatDate(bill.due_date)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="font-semibold text-red-400">{formatCurrency(bill.amount)}</span>
                                      <Button size="sm" variant="outline" className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10" onClick={() => payBill(bill.id)} data-testid={`pay-bill-${bill.id}`}>
                                        <CheckCircle className="h-4 w-4" />
                                      </Button>
                                      <Button size="sm" variant="ghost" className="text-slate-500 hover:text-red-400" onClick={() => deleteBill(bill.id)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="paid" className="mt-4">
                        {paidBills.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">
                            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p>Nenhuma conta paga</p>
                          </div>
                        ) : (
                          <ScrollArea className="h-[400px]">
                            <div className="space-y-3">
                              {paidBills.map((bill) => (
                                <div key={bill.id} className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                  <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-emerald-500/10">
                                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-white">{bill.description}</p>
                                      <p className="text-sm text-slate-400">Pago: {bill.paid_date ? formatDate(bill.paid_date) : "-"}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-semibold text-emerald-400">{formatCurrency(bill.amount)}</span>
                                    <Button size="sm" variant="ghost" className="text-slate-500 hover:text-red-400" onClick={() => deleteBill(bill.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}

              {/* Reports Tab */}
              {activeTab === "reports" && selectedCompany && (
                <div className="space-y-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="bg-slate-900 border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <PieChart className="h-5 w-5 text-purple-400" />
                          Vendas por Categoria
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {topProductsMonth.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">
                            <PieChart className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p>Sem dados para exibir</p>
                          </div>
                        ) : (
                          <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPie>
                                <Pie
                                  data={topProductsMonth.slice(0, 6)}
                                  dataKey="total_revenue"
                                  nameKey="product_name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={100}
                                  label={({ name, percent }) => `${name.slice(0, 10)}... ${(percent * 100).toFixed(0)}%`}
                                >
                                  {topProductsMonth.slice(0, 6).map((_, index) => (
                                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                  formatter={(value) => formatCurrency(value)}
                                />
                              </RechartsPie>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Award className="h-5 w-5 text-amber-400" />
                          Top Produtos - Mês
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {topProductsMonth.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">
                            <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p>Nenhuma venda este mês</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {topProductsMonth.slice(0, 5).map((product, index) => (
                              <div key={product.product_id}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-white font-medium">{product.product_name}</span>
                                  <span className="text-emerald-400">{formatCurrency(product.total_revenue)}</span>
                                </div>
                                <Progress 
                                  value={(product.total_revenue / topProductsMonth[0].total_revenue) * 100} 
                                  className="h-2 bg-slate-800"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-400" />
                        Evolução de Vendas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={dailySales}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `R$${v/1000}k`} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                              formatter={(value) => [formatCurrency(value), 'Total']}
                            />
                            <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Companies Tab */}
              {activeTab === "companies" && (
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-white">Minhas Empresas</CardTitle>
                      <CardDescription className="text-slate-400">Gerencie suas empresas</CardDescription>
                    </div>
                    <Button 
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                      onClick={() => setCompanyDialogOpen(true)}
                      data-testid="add-company-btn"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Empresa
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {companies.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <Building2 className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg">Nenhuma empresa cadastrada</p>
                        <p className="text-sm mt-2">Clique em "Nova Empresa" para começar</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {companies.map((company) => (
                          <div
                            key={company.id}
                            className={`flex items-center justify-between p-5 rounded-xl border transition-all cursor-pointer ${
                              selectedCompany?.id === company.id 
                                ? "bg-emerald-500/10 border-emerald-500/30" 
                                : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600"
                            }`}
                            onClick={() => selectCompany(company)}
                            data-testid={`company-card-${company.id}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-xl ${selectedCompany?.id === company.id ? 'bg-emerald-500/20' : 'bg-slate-700'}`}>
                                <Building2 className={`h-6 w-6 ${selectedCompany?.id === company.id ? 'text-emerald-400' : 'text-slate-400'}`} />
                              </div>
                              <div>
                                <p className="font-semibold text-white text-lg">{company.name}</p>
                                <p className="text-sm text-slate-400">CNPJ: {company.cnpj}</p>
                              </div>
                            </div>
                            {selectedCompany?.id === company.id && (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                Ativa
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>

      {/* Company Dialog */}
      <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700" data-testid="company-dialog">
          <DialogHeader>
            <DialogTitle className="text-white">Cadastrar Empresa</DialogTitle>
            <DialogDescription className="text-slate-400">Adicione uma nova empresa</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Nome da Empresa</Label>
              <Input
                placeholder="Ex: Minha Loja"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                data-testid="company-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">CNPJ</Label>
              <Input
                placeholder="00.000.000/0000-00"
                value={companyCNPJ}
                onChange={(e) => setCompanyCNPJ(formatCNPJ(e.target.value))}
                maxLength={18}
                className="bg-slate-800 border-slate-700 text-white"
                data-testid="company-cnpj-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={createCompany} 
              disabled={!companyName || companyCNPJ.replace(/\D/g, "").length !== 14}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              data-testid="save-company-btn"
            >
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700" data-testid="product-dialog">
          <DialogHeader>
            <DialogTitle className="text-white">Novo Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Nome</Label>
              <Input placeholder="Ex: Camiseta" value={productName} onChange={(e) => setProductName(e.target.value)} className="bg-slate-800 border-slate-700 text-white" data-testid="product-name-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Preço de Venda</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} className="bg-slate-800 border-slate-700 text-white" data-testid="product-price-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Custo</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={productCost} onChange={(e) => setProductCost(e.target.value)} className="bg-slate-800 border-slate-700 text-white" data-testid="product-cost-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Estoque</Label>
                <Input type="number" placeholder="0" value={productStock} onChange={(e) => setProductStock(e.target.value)} className="bg-slate-800 border-slate-700 text-white" data-testid="product-stock-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Estoque Mínimo</Label>
                <Input type="number" placeholder="5" value={productMinStock} onChange={(e) => setProductMinStock(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Categoria</Label>
              <Input placeholder="Ex: Vestuário" value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createProduct} disabled={!productName || !productPrice} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700" data-testid="save-product-btn">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={editProductDialogOpen} onOpenChange={setEditProductDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Nome</Label>
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Preço de Venda</Label>
                <Input type="number" step="0.01" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Custo</Label>
                <Input type="number" step="0.01" value={productCost} onChange={(e) => setProductCost(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Estoque</Label>
                <Input type="number" value={productStock} onChange={(e) => setProductStock(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Estoque Mínimo</Label>
                <Input type="number" value={productMinStock} onChange={(e) => setProductMinStock(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Categoria</Label>
              <Input value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={updateProduct} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
              Atualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sale Dialog */}
      <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700" data-testid="sale-dialog">
          <DialogHeader>
            <DialogTitle className="text-white">Nova Venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Produto</Label>
              <Select value={saleProductId} onValueChange={setSaleProductId}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white" data-testid="sale-product-select">
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-white">
                      {p.name} - {formatCurrency(p.price)} (Est: {p.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Quantidade</Label>
              <Input type="number" placeholder="1" value={saleQuantity} onChange={(e) => setSaleQuantity(e.target.value)} className="bg-slate-800 border-slate-700 text-white" data-testid="sale-quantity-input" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createSale} disabled={!saleProductId || !saleQuantity} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700" data-testid="save-sale-btn">
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bill Dialog */}
      <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700" data-testid="bill-dialog">
          <DialogHeader>
            <DialogTitle className="text-white">Nova Conta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Descrição</Label>
              <Input placeholder="Ex: Aluguel" value={billDescription} onChange={(e) => setBillDescription(e.target.value)} className="bg-slate-800 border-slate-700 text-white" data-testid="bill-description-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Valor</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} className="bg-slate-800 border-slate-700 text-white" data-testid="bill-amount-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Categoria</Label>
                <Select value={billCategory} onValueChange={setBillCategory}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {["Aluguel", "Energia", "Água", "Internet", "Fornecedor", "Impostos", "Salários", "Outros"].map(cat => (
                      <SelectItem key={cat} value={cat} className="text-white">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Vencimento</Label>
              <Input type="date" value={billDueDate} onChange={(e) => setBillDueDate(e.target.value)} className="bg-slate-800 border-slate-700 text-white" data-testid="bill-due-date-input" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createBill} disabled={!billDescription || !billAmount || !billDueDate} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700" data-testid="save-bill-btn">
              Salvar
            </Button>
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
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage onAuthSuccess={handleAuthSuccess} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

export default App;
