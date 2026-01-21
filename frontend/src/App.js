import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Trash2,
  Package,
  Receipt,
  CreditCard,
  CheckCircle,
  Clock,
  BarChart3,
  Calendar,
  Menu,
  X,
  RefreshCw,
  Award,
  Target,
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
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

// Colors for charts
const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];

function App() {
  // State
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
  const [newSale, setNewSale] = useState({ product_id: "", quantity: "" });
  const [newProduct, setNewProduct] = useState({ name: "", price: "", cost: "", stock: "" });
  const [newBill, setNewBill] = useState({ description: "", amount: "", due_date: "" });

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, productsRes, salesRes, billsRes, topWeekRes, topMonthRes, dailyRes] =
        await Promise.all([
          axios.get(`${API}/dashboard/stats`),
          axios.get(`${API}/products`),
          axios.get(`${API}/sales?limit=50`),
          axios.get(`${API}/bills`),
          axios.get(`${API}/dashboard/top-products-week`),
          axios.get(`${API}/dashboard/top-products-month`),
          axios.get(`${API}/dashboard/daily-sales?days=7`),
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
  }, []);

  // Create sale
  const createSale = async () => {
    try {
      await axios.post(`${API}/sales`, {
        product_id: newSale.product_id,
        quantity: parseInt(newSale.quantity),
      });
      setSaleDialogOpen(false);
      setNewSale({ product_id: "", quantity: "" });
      await fetchData();
    } catch (error) {
      console.error("Error creating sale:", error);
      alert(error.response?.data?.detail || "Erro ao registrar venda");
    }
  };

  // Create product
  const createProduct = async () => {
    try {
      await axios.post(`${API}/products`, {
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        cost: parseFloat(newProduct.cost) || 0,
        stock: parseInt(newProduct.stock) || 0,
      });
      setProductDialogOpen(false);
      setNewProduct({ name: "", price: "", cost: "", stock: "" });
      await fetchData();
    } catch (error) {
      console.error("Error creating product:", error);
    }
  };

  // Delete product
  const deleteProduct = async (id) => {
    try {
      await axios.delete(`${API}/products/${id}`);
      await fetchData();
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  // Create bill
  const createBill = async () => {
    try {
      await axios.post(`${API}/bills`, {
        description: newBill.description,
        amount: parseFloat(newBill.amount),
        due_date: new Date(newBill.due_date).toISOString(),
      });
      setBillDialogOpen(false);
      setNewBill({ description: "", amount: "", due_date: "" });
      await fetchData();
    } catch (error) {
      console.error("Error creating bill:", error);
    }
  };

  // Pay bill
  const payBill = async (id) => {
    try {
      await axios.put(`${API}/bills/${id}/pay`);
      await fetchData();
    } catch (error) {
      console.error("Error paying bill:", error);
    }
  };

  // Delete bill
  const deleteBill = async (id) => {
    try {
      await axios.delete(`${API}/bills/${id}`);
      await fetchData();
    } catch (error) {
      console.error("Error deleting bill:", error);
    }
  };

  // Delete sale
  const deleteSale = async (id) => {
    try {
      await axios.delete(`${API}/sales/${id}`);
      await fetchData();
    } catch (error) {
      console.error("Error deleting sale:", error);
    }
  };

  // Seed demo data
  const seedData = async () => {
    try {
      setLoading(true);
      await axios.post(`${API}/seed`);
      await fetchData();
    } catch (error) {
      console.error("Error seeding data:", error);
    }
  };

  // Clear all data
  const clearData = async () => {
    try {
      setLoading(true);
      await axios.post(`${API}/clear`);
      await fetchData();
    } catch (error) {
      console.error("Error clearing data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Stats Cards
  const StatsCards = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card data-testid="sales-today-card" className="border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vendas do Dia</CardTitle>
          <ShoppingCart className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600" data-testid="sales-today">
            {stats ? formatCurrency(stats.sales_today) : "---"}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats?.sales_count_today || 0} vendas hoje
          </p>
        </CardContent>
      </Card>

      <Card data-testid="sales-month-card" className="border-l-4 border-l-green-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vendas do Mês</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600" data-testid="sales-month">
            {stats ? formatCurrency(stats.sales_month) : "---"}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats?.sales_count_month || 0} vendas no mês
          </p>
        </CardContent>
      </Card>

      <Card data-testid="bills-to-pay-card" className="border-l-4 border-l-red-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Contas a Pagar</CardTitle>
          <Clock className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600" data-testid="bills-to-pay">
            {stats ? formatCurrency(stats.bills_to_pay) : "---"}
          </div>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </CardContent>
      </Card>

      <Card data-testid="bills-paid-card" className="border-l-4 border-l-emerald-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Contas Pagas</CardTitle>
          <CheckCircle className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600" data-testid="bills-paid">
            {stats ? formatCurrency(stats.bills_paid) : "---"}
          </div>
          <p className="text-xs text-muted-foreground">Este mês</p>
        </CardContent>
      </Card>

      <Card data-testid="profit-card" className="border-l-4 border-l-purple-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Lucro do Mês</CardTitle>
          <DollarSign className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              stats?.profit_month >= 0 ? "text-purple-600" : "text-red-600"
            }`}
            data-testid="profit-month"
          >
            {stats ? formatCurrency(stats.profit_month) : "---"}
          </div>
          <p className="text-xs text-muted-foreground">Líquido</p>
        </CardContent>
      </Card>
    </div>
  );

  // Top Products Component
  const TopProducts = ({ title, data, period }) => (
    <Card data-testid={`top-products-${period}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-yellow-500" />
          {title}
        </CardTitle>
        <CardDescription>Produtos mais vendidos</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma venda registrada</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.slice(0, 5).map((product, index) => (
              <div key={product.product_id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      index === 0
                        ? "bg-yellow-500"
                        : index === 1
                        ? "bg-gray-400"
                        : index === 2
                        ? "bg-amber-600"
                        : "bg-gray-300"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{product.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.quantity_sold} unidades
                    </p>
                  </div>
                </div>
                <span className="font-semibold text-green-600">
                  {formatCurrency(product.total_revenue)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Daily Sales Chart
  const DailySalesChart = () => (
    <Card data-testid="daily-sales-chart">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          Vendas dos Últimos 7 Dias
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailySales}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={(v) => `R$${v / 1000}k`} />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Total" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  // Products List
  const ProductsList = () => (
    <Card data-testid="products-list">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Produtos</CardTitle>
          <CardDescription>Gerencie seu catálogo</CardDescription>
        </div>
        <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="add-product-btn">
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Produto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Produto</Label>
                <Input
                  data-testid="product-name-input"
                  placeholder="Ex: Camiseta"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preço de Venda</Label>
                  <Input
                    data-testid="product-price-input"
                    type="number"
                    placeholder="0.00"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Custo</Label>
                  <Input
                    data-testid="product-cost-input"
                    type="number"
                    placeholder="0.00"
                    value={newProduct.cost}
                    onChange={(e) => setNewProduct({ ...newProduct, cost: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Estoque Inicial</Label>
                <Input
                  data-testid="product-stock-input"
                  type="number"
                  placeholder="0"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createProduct} data-testid="save-product-btn">
                Salvar Produto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum produto cadastrado</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                  data-testid={`product-${product.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-blue-500/10">
                      <Package className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Custo: {formatCurrency(product.cost)}</span>
                        <span>•</span>
                        <span>Estoque: {product.stock}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold text-green-600">
                      {formatCurrency(product.price)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteProduct(product.id)}
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

  // Sales List with Add Sale
  const SalesList = () => (
    <Card data-testid="sales-list">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Vendas Recentes</CardTitle>
          <CardDescription>Últimas vendas realizadas</CardDescription>
        </div>
        <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="add-sale-btn">
              <Plus className="h-4 w-4 mr-2" />
              Nova Venda
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Venda</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Produto</Label>
                <Select
                  value={newSale.product_id}
                  onValueChange={(value) => setNewSale({ ...newSale, product_id: value })}
                >
                  <SelectTrigger data-testid="sale-product-select">
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
                <Input
                  data-testid="sale-quantity-input"
                  type="number"
                  placeholder="1"
                  value={newSale.quantity}
                  onChange={(e) => setNewSale({ ...newSale, quantity: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={createSale}
                disabled={!newSale.product_id || !newSale.quantity}
                data-testid="save-sale-btn"
              >
                Registrar Venda
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {sales.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma venda registrada</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50"
                  data-testid={`sale-${sale.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-green-500/10">
                      <ShoppingCart className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">{sale.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {sale.quantity}x {formatCurrency(sale.unit_price)}
                      </p>
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
  );

  // Bills List
  const BillsList = () => {
    const pendingBills = bills.filter((b) => b.status === "pending");
    const paidBills = bills.filter((b) => b.status === "paid");

    return (
      <Card data-testid="bills-list">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Contas</CardTitle>
            <CardDescription>Gerencie suas contas a pagar</CardDescription>
          </div>
          <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="add-bill-btn">
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
                  <Label>Descrição</Label>
                  <Input
                    data-testid="bill-description-input"
                    placeholder="Ex: Aluguel"
                    value={newBill.description}
                    onChange={(e) => setNewBill({ ...newBill, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    data-testid="bill-amount-input"
                    type="number"
                    placeholder="0.00"
                    value={newBill.amount}
                    onChange={(e) => setNewBill({ ...newBill, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Vencimento</Label>
                  <Input
                    data-testid="bill-due-date-input"
                    type="date"
                    value={newBill.due_date}
                    onChange={(e) => setNewBill({ ...newBill, due_date: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={createBill}
                  disabled={!newBill.description || !newBill.amount || !newBill.due_date}
                  data-testid="save-bill-btn"
                >
                  Salvar Conta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Pending Bills */}
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
                    <div
                      key={bill.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50"
                    >
                      <div>
                        <p className="font-medium">{bill.description}</p>
                        <p className="text-sm text-muted-foreground">
                          Vence: {formatDate(bill.due_date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-red-600">
                          {formatCurrency(bill.amount)}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => payBill(bill.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteBill(bill.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Paid Bills */}
            <div>
              <h4 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Pagas ({paidBills.length})
              </h4>
              {paidBills.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma conta paga</p>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {paidBills.map((bill) => (
                      <div
                        key={bill.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-green-200 bg-green-50"
                      >
                        <div>
                          <p className="font-medium">{bill.description}</p>
                          <p className="text-sm text-muted-foreground">
                            Pago em: {bill.paid_date ? formatDate(bill.paid_date) : "-"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-green-600">
                            {formatCurrency(bill.amount)}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteBill(bill.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Sidebar
  const Sidebar = () => (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-600">
              <Target className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg">GestãoPro</span>
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
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <Button
            variant={activeTab === "sales" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => {
              setActiveTab("sales");
              setSidebarOpen(false);
            }}
            data-testid="nav-sales"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Vendas
          </Button>
          <Button
            variant={activeTab === "products" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => {
              setActiveTab("products");
              setSidebarOpen(false);
            }}
            data-testid="nav-products"
          >
            <Package className="h-4 w-4 mr-2" />
            Produtos
          </Button>
          <Button
            variant={activeTab === "bills" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => {
              setActiveTab("bills");
              setSidebarOpen(false);
            }}
            data-testid="nav-bills"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Contas
          </Button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={seedData}
            data-testid="seed-data-btn"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Carregar Demo
          </Button>
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            onClick={clearData}
            data-testid="clear-data-btn"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Dados
          </Button>
        </div>
      </aside>
    </>
  );

  // Main Content
  const MainContent = () => (
    <main className="lg:ml-64 min-h-screen bg-background">
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
            <h1 className="text-xl font-bold capitalize">
              {activeTab === "dashboard"
                ? "Dashboard"
                : activeTab === "sales"
                ? "Vendas"
                : activeTab === "products"
                ? "Produtos"
                : "Contas"}
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} data-testid="refresh-btn">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </header>

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
                <div className="grid gap-4 lg:grid-cols-2">
                  <DailySalesChart />
                  <TopProducts
                    title="Mais Vendidos da Semana"
                    data={topProductsWeek}
                    period="week"
                  />
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <TopProducts
                    title="Mais Vendidos do Mês"
                    data={topProductsMonth}
                    period="month"
                  />
                  <SalesList />
                </div>
              </>
            )}

            {activeTab === "sales" && <SalesList />}
            {activeTab === "products" && <ProductsList />}
            {activeTab === "bills" && <BillsList />}
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
