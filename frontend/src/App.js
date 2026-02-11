import { useEffect, useState, createContext, useContext } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Hook to detect screen size
const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isDesktop;
};

// API instance with auth
const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Login Page
const Login = ({ onLogin, onSwitch }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao fazer login");
    }
    setLoading(false);
  };

  return (
    <div style={styles.authContainer}>
      <div style={styles.authCard}>
        <div style={styles.logoContainer}>
          <div style={styles.logo}>T</div>
          <h1 style={styles.logoText}>Talentos</h1>
        </div>
        <h2 style={styles.authTitle}>Entrar</h2>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            data-testid="login-email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            data-testid="login-password"
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          <button data-testid="login-submit" type="submit" style={styles.button} disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <p style={styles.switchText}>
          Nao tem conta?{" "}
          <span style={styles.link} onClick={onSwitch}>
            Cadastre-se
          </span>
        </p>
      </div>
    </div>
  );
};

// Signup Page
const Signup = ({ onLogin, onSwitch }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API}/auth/register`, { name, email, password, company_name: company });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao cadastrar");
    }
    setLoading(false);
  };

  return (
    <div style={styles.authContainer}>
      <div style={styles.authCard}>
        <div style={styles.logoContainer}>
          <div style={styles.logo}>T</div>
          <h1 style={styles.logoText}>Talentos</h1>
        </div>
        <h2 style={styles.authTitle}>Criar Conta</h2>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            data-testid="signup-name"
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
            required
          />
          <input
            data-testid="signup-company"
            type="text"
            placeholder="Nome da empresa"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            style={styles.input}
            required
          />
          <input
            data-testid="signup-email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            data-testid="signup-password"
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          <button data-testid="signup-submit" type="submit" style={styles.button} disabled={loading}>
            {loading ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>
        <p style={styles.switchText}>
          Ja tem conta?{" "}
          <span style={styles.link} onClick={onSwitch}>
            Entrar
          </span>
        </p>
      </div>
    </div>
  );
};

// Sidebar Component
const Sidebar = ({ currentPage, setCurrentPage, user, onLogout }) => {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "sales", label: "Vendas", icon: "💰" },
    { id: "bills", label: "Contas", icon: "📋" },
    { id: "clients", label: "Clientes", icon: "👥" },
    { id: "products", label: "Produtos", icon: "📦" },
  ];

  return (
    <div style={styles.sidebar}>
      <div style={styles.sidebarHeader}>
        <div style={styles.logoSmall}>T</div>
        <span style={styles.sidebarTitle}>Talentos</span>
      </div>
      <nav style={styles.nav}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            data-testid={`nav-${item.id}`}
            onClick={() => setCurrentPage(item.id)}
            style={{
              ...styles.navItem,
              ...(currentPage === item.id ? styles.navItemActive : {}),
            }}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div style={styles.sidebarFooter}>
        <div style={styles.userInfo}>
          <div style={styles.userAvatar}>{user?.name?.[0] || "U"}</div>
          <span style={styles.userName}>{user?.name}</span>
        </div>
        <button data-testid="logout-btn" onClick={onLogout} style={styles.logoutBtn}>
          Sair
        </button>
      </div>
    </div>
  );
};

// Dashboard Page
const Dashboard = () => {
  const [stats, setStats] = useState({
    total_sales: 0, total_bills: 0, total_clients: 0, total_products: 0,
    monthly_revenue: 0, pending_bills: 0,
    today_sales_total: 0, today_sales_count: 0,
    products_expiring_today: 0, products_low_stock: 0,
    bills_due_today: 0, bills_pending: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/dashboard/stats");
        setStats(res.data);
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };
    fetchStats();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.pageTitle}>Dashboard</h1>

      <h2 style={styles.sectionTitle}>📊 Vendas de Hoje</h2>
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, borderLeft: "4px solid #10b981" }}>
          <div style={styles.statLabel}>Vendas do Dia (R$)</div>
          <div style={styles.statValue}>{formatCurrency(stats.today_sales_total)}</div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: "4px solid #3b82f6" }}>
          <div style={styles.statLabel}>Vendas Diarias (Qtd)</div>
          <div style={styles.statValue}>{stats.today_sales_count}</div>
        </div>
      </div>

      <h2 style={styles.sectionTitle}>📦 Mercadorias</h2>
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, borderLeft: "4px solid #ef4444" }}>
          <div style={styles.statLabel}>Vencendo Hoje</div>
          <div style={{ ...styles.statValue, color: stats.products_expiring_today > 0 ? "#ef4444" : "#fff" }}>
            {stats.products_expiring_today}
          </div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: "4px solid #f59e0b" }}>
          <div style={styles.statLabel}>Estoque Baixo (≤5)</div>
          <div style={{ ...styles.statValue, color: stats.products_low_stock > 0 ? "#f59e0b" : "#fff" }}>
            {stats.products_low_stock}
          </div>
        </div>
      </div>

      <h2 style={styles.sectionTitle}>💰 Despesas</h2>
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, borderLeft: "4px solid #ef4444" }}>
          <div style={styles.statLabel}>Vencendo Hoje</div>
          <div style={{ ...styles.statValue, color: stats.bills_due_today > 0 ? "#ef4444" : "#fff" }}>
            {stats.bills_due_today}
          </div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: "4px solid #f59e0b" }}>
          <div style={styles.statLabel}>Em Aberto</div>
          <div style={{ ...styles.statValue, color: stats.bills_pending > 0 ? "#f59e0b" : "#fff" }}>
            {stats.bills_pending}
          </div>
        </div>
      </div>

      <h2 style={styles.sectionTitle}>📈 Resumo Geral</h2>
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, borderLeft: "4px solid #3b82f6" }}>
          <div style={styles.statLabel}>Receita Mensal</div>
          <div style={styles.statValue}>{formatCurrency(stats.monthly_revenue)}</div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: "4px solid #8b5cf6" }}>
          <div style={styles.statLabel}>Total Clientes</div>
          <div style={styles.statValue}>{stats.total_clients}</div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: "4px solid #10b981" }}>
          <div style={styles.statLabel}>Total Produtos</div>
          <div style={styles.statValue}>{stats.total_products}</div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: "4px solid #f59e0b" }}>
          <div style={styles.statLabel}>Total Vendas</div>
          <div style={styles.statValue}>{stats.total_sales}</div>
        </div>
      </div>
    </div>
  );
};

// Clients Page
const Clients = () => {
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", cpf_cnpj: "" });
  const [loading, setLoading] = useState(false);

  const fetchClients = async () => {
    try {
      const res = await api.get("/clients");
      setClients(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/clients", form);
      setForm({ name: "", email: "", phone: "", cpf_cnpj: "" });
      setShowForm(false);
      fetchClients();
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao salvar");
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Deseja excluir este cliente?")) {
      try {
        await api.delete(`/clients/${id}`);
        fetchClients();
      } catch (err) {
        alert("Erro ao excluir");
      }
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Clientes</h1>
        <button data-testid="add-client-btn" onClick={() => setShowForm(!showForm)} style={styles.addButton}>
          {showForm ? "Cancelar" : "+ Novo Cliente"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.formCard}>
          <div style={styles.formGrid}>
            <input data-testid="client-name" placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={styles.input} required />
            <input data-testid="client-email" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={styles.input} />
            <input data-testid="client-phone" placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={styles.input} />
            <input data-testid="client-cpf" placeholder="CPF/CNPJ" value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} style={styles.input} />
          </div>
          <button data-testid="save-client-btn" type="submit" style={styles.saveButton} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </form>
      )}

      <div style={styles.tableContainer}>
        {clients.length === 0 ? (
          <p style={styles.emptyText}>Nenhum cliente cadastrado</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nome</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Telefone</th>
                <th style={styles.th}>CPF/CNPJ</th>
                <th style={styles.th}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} style={styles.tr}>
                  <td style={styles.td}>{c.name}</td>
                  <td style={styles.td}>{c.email || "-"}</td>
                  <td style={styles.td}>{c.phone || "-"}</td>
                  <td style={styles.td}>{c.cpf_cnpj || "-"}</td>
                  <td style={styles.td}>
                    <button data-testid={`delete-client-${c.id}`} onClick={() => handleDelete(c.id)} style={styles.deleteBtn}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// Products Page
const Products = () => {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", stock: "", expiry_date: "" });
  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await api.get("/products");
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/products", { ...form, price: parseFloat(form.price), stock: parseInt(form.stock), expiry_date: form.expiry_date || null });
      setForm({ name: "", description: "", price: "", stock: "", expiry_date: "" });
      setShowForm(false);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao salvar");
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Deseja excluir este produto?")) {
      try {
        await api.delete(`/products/${id}`);
        fetchProducts();
      } catch (err) {
        alert("Erro ao excluir");
      }
    }
  };

  const formatCurrency = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  const isExpiringSoon = (date) => {
    if (!date) return false;
    const today = new Date();
    const expiry = new Date(date);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  };
  const isExpired = (date) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Produtos</h1>
        <button data-testid="add-product-btn" onClick={() => setShowForm(!showForm)} style={styles.addButton}>
          {showForm ? "Cancelar" : "+ Novo Produto"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.formCard}>
          <div style={styles.formGrid}>
            <input data-testid="product-name" placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={styles.input} required />
            <input data-testid="product-description" placeholder="Descricao" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={styles.input} />
            <input data-testid="product-price" placeholder="Preco" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={styles.input} required />
            <input data-testid="product-stock" placeholder="Estoque" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} style={styles.input} required />
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label style={{ color: "#94a3b8", fontSize: "12px" }}>Data de Validade</label>
              <input data-testid="product-expiry" type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} style={styles.input} />
            </div>
          </div>
          <button data-testid="save-product-btn" type="submit" style={styles.saveButton} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </form>
      )}

      <div style={styles.tableContainer}>
        {products.length === 0 ? (
          <p style={styles.emptyText}>Nenhum produto cadastrado</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nome</th>
                <th style={styles.th}>Descricao</th>
                <th style={styles.th}>Preco</th>
                <th style={styles.th}>Estoque</th>
                <th style={styles.th}>Validade</th>
                <th style={styles.th}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} style={styles.tr}>
                  <td style={styles.td}>{p.name}</td>
                  <td style={styles.td}>{p.description || "-"}</td>
                  <td style={styles.td}>{formatCurrency(p.price)}</td>
                  <td style={{ ...styles.td, color: p.stock <= 5 ? "#f59e0b" : "#fff" }}>{p.stock}</td>
                  <td style={{ ...styles.td, color: isExpired(p.expiry_date) ? "#ef4444" : isExpiringSoon(p.expiry_date) ? "#f59e0b" : "#fff" }}>
                    {p.expiry_date ? new Date(p.expiry_date).toLocaleDateString("pt-BR") : "-"}
                  </td>
                  <td style={styles.td}>
                    <button data-testid={`delete-product-${p.id}`} onClick={() => handleDelete(p.id)} style={styles.deleteBtn}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// Sales Page
const Sales = () => {
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ client_id: "", items: [{ product_id: "", quantity: 1 }] });
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [salesRes, clientsRes, productsRes] = await Promise.all([api.get("/sales"), api.get("/clients"), api.get("/products")]);
      setSales(salesRes.data);
      setClients(clientsRes.data);
      setProducts(productsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/sales", form);
      setForm({ client_id: "", items: [{ product_id: "", quantity: 1 }] });
      setShowForm(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao salvar");
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Deseja excluir esta venda?")) {
      try {
        await api.delete(`/sales/${id}`);
        fetchData();
      } catch (err) {
        alert("Erro ao excluir");
      }
    }
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { product_id: "", quantity: 1 }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const formatCurrency = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Vendas</h1>
        <button data-testid="add-sale-btn" onClick={() => setShowForm(!showForm)} style={styles.addButton}>
          {showForm ? "Cancelar" : "+ Nova Venda"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.formCard}>
          <select data-testid="sale-client" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} style={styles.input} required>
            <option value="">Selecione o cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <h4 style={{ color: "#fff", margin: "15px 0 10px" }}>Itens</h4>
          {form.items.map((item, idx) => (
            <div key={idx} style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <select
                data-testid={`sale-product-${idx}`}
                value={item.product_id}
                onChange={(e) => {
                  const newItems = [...form.items];
                  newItems[idx].product_id = e.target.value;
                  setForm({ ...form, items: newItems });
                }}
                style={{ ...styles.input, flex: 2 }}
                required
              >
                <option value="">Produto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>
                ))}
              </select>
              <input
                data-testid={`sale-qty-${idx}`}
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => {
                  const newItems = [...form.items];
                  newItems[idx].quantity = parseInt(e.target.value);
                  setForm({ ...form, items: newItems });
                }}
                style={{ ...styles.input, flex: 1 }}
              />
              {form.items.length > 1 && (
                <button type="button" onClick={() => removeItem(idx)} style={styles.deleteBtn}>X</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addItem} style={{ ...styles.addButton, marginBottom: "15px" }}>+ Adicionar Item</button>
          <button data-testid="save-sale-btn" type="submit" style={styles.saveButton} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Venda"}
          </button>
        </form>
      )}

      <div style={styles.tableContainer}>
        {sales.length === 0 ? (
          <p style={styles.emptyText}>Nenhuma venda registrada</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Data</th>
                <th style={styles.th}>Cliente</th>
                <th style={styles.th}>Total</th>
                <th style={styles.th}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} style={styles.tr}>
                  <td style={styles.td}>{new Date(s.date).toLocaleDateString("pt-BR")}</td>
                  <td style={styles.td}>{s.client_name || "-"}</td>
                  <td style={styles.td}>{formatCurrency(s.total)}</td>
                  <td style={styles.td}>
                    <button data-testid={`delete-sale-${s.id}`} onClick={() => handleDelete(s.id)} style={styles.deleteBtn}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// Bills Page
const Bills = () => {
  const [bills, setBills] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ description: "", value: "", type: "payable", status: "pending", due_date: "", category: "" });
  const [loading, setLoading] = useState(false);

  const fetchBills = async () => {
    try {
      const res = await api.get("/bills");
      setBills(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/bills", { ...form, value: parseFloat(form.value) });
      setForm({ description: "", value: "", type: "payable", status: "pending", due_date: "", category: "" });
      setShowForm(false);
      fetchBills();
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao salvar");
    }
    setLoading(false);
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/bills/${id}`, { status });
      fetchBills();
    } catch (err) {
      alert("Erro ao atualizar");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Deseja excluir esta conta?")) {
      try {
        await api.delete(`/bills/${id}`);
        fetchBills();
      } catch (err) {
        alert("Erro ao excluir");
      }
    }
  };

  const filteredBills = bills.filter((b) => filter === "all" || b.type === filter);
  const formatCurrency = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Contas</h1>
        <button data-testid="add-bill-btn" onClick={() => setShowForm(!showForm)} style={styles.addButton}>
          {showForm ? "Cancelar" : "+ Nova Conta"}
        </button>
      </div>

      <div style={styles.filterContainer}>
        <button data-testid="filter-all" onClick={() => setFilter("all")} style={{ ...styles.filterBtn, ...(filter === "all" ? styles.filterActive : {}) }}>Todas</button>
        <button data-testid="filter-payable" onClick={() => setFilter("payable")} style={{ ...styles.filterBtn, ...(filter === "payable" ? styles.filterActive : {}) }}>A Pagar</button>
        <button data-testid="filter-receivable" onClick={() => setFilter("receivable")} style={{ ...styles.filterBtn, ...(filter === "receivable" ? styles.filterActive : {}) }}>A Receber</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.formCard}>
          <div style={styles.formGrid}>
            <input data-testid="bill-description" placeholder="Descricao" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={styles.input} required />
            <input data-testid="bill-value" placeholder="Valor" type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} style={styles.input} required />
            <select data-testid="bill-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={styles.input}>
              <option value="payable">A Pagar</option>
              <option value="receivable">A Receber</option>
            </select>
            <input data-testid="bill-category" placeholder="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={styles.input} />
            <input data-testid="bill-due-date" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} style={styles.input} required />
          </div>
          <button data-testid="save-bill-btn" type="submit" style={styles.saveButton} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </form>
      )}

      <div style={styles.tableContainer}>
        {filteredBills.length === 0 ? (
          <p style={styles.emptyText}>Nenhuma conta encontrada</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Descricao</th>
                <th style={styles.th}>Valor</th>
                <th style={styles.th}>Tipo</th>
                <th style={styles.th}>Vencimento</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((b) => (
                <tr key={b.id} style={styles.tr}>
                  <td style={styles.td}>{b.description}</td>
                  <td style={{ ...styles.td, color: b.type === "receivable" ? "#10b981" : "#ef4444" }}>{formatCurrency(b.value)}</td>
                  <td style={styles.td}>{b.type === "payable" ? "A Pagar" : "A Receber"}</td>
                  <td style={styles.td}>{new Date(b.due_date).toLocaleDateString("pt-BR")}</td>
                  <td style={styles.td}>
                    <select
                      data-testid={`bill-status-${b.id}`}
                      value={b.status}
                      onChange={(e) => handleStatusChange(b.id, e.target.value)}
                      style={{ ...styles.statusSelect, backgroundColor: b.status === "paid" ? "#10b981" : b.status === "pending" ? "#f59e0b" : "#ef4444" }}
                    >
                      <option value="pending">Pendente</option>
                      <option value="paid">Pago</option>
                      <option value="overdue">Vencido</option>
                    </select>
                  </td>
                  <td style={styles.td}>
                    <button data-testid={`delete-bill-${b.id}`} onClick={() => handleDelete(b.id)} style={styles.deleteBtn}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// Main App
function App() {
  const [user, setUser] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard": return <Dashboard />;
      case "clients": return <Clients />;
      case "products": return <Products />;
      case "sales": return <Sales />;
      case "bills": return <Bills />;
      default: return <Dashboard />;
    }
  };

  if (loading) {
    return <div style={styles.loadingScreen}><div style={styles.logo}>T</div></div>;
  }

  if (!user) {
    return isLogin ? <Login onLogin={setUser} onSwitch={() => setIsLogin(false)} /> : <Signup onLogin={setUser} onSwitch={() => setIsLogin(true)} />;
  }

  const sidebarWrapperStyle = {
    ...styles.sidebarWrapper,
    left: isDesktop ? 0 : (menuOpen ? 0 : "-280px")
  };

  const mainContentStyle = {
    ...styles.mainContent,
    marginLeft: isDesktop ? "280px" : 0
  };

  const mobileHeaderStyle = {
    ...styles.mobileHeader,
    display: isDesktop ? "none" : "flex"
  };

  return (
    <AuthContext.Provider value={{ user }}>
      <div style={styles.appContainer}>
        {menuOpen && !isDesktop && <div style={styles.overlay} onClick={() => setMenuOpen(false)} />}

        <div style={sidebarWrapperStyle}>
          <Sidebar currentPage={currentPage} setCurrentPage={(p) => { setCurrentPage(p); setMenuOpen(false); }} user={user} onLogout={handleLogout} />
        </div>

        <div style={mainContentStyle}>
          <div style={mobileHeaderStyle}>
            <button data-testid="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} style={styles.menuButton}>☰</button>
            <h1 style={styles.mobileTitle}>{
              currentPage === "dashboard" ? "Dashboard" :
              currentPage === "sales" ? "Vendas" :
              currentPage === "bills" ? "Contas" :
              currentPage === "clients" ? "Clientes" : "Produtos"
            }</h1>
            <div style={styles.userAvatarSmall}>{user?.name?.[0] || "U"}</div>
          </div>
          {renderPage()}
        </div>
      </div>
    </AuthContext.Provider>
  );
}

// Styles
const styles = {
  loadingScreen: { display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0f172a" },
  authContainer: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", padding: "20px" },
  authCard: { background: "#1e293b", borderRadius: "16px", padding: "40px", width: "100%", maxWidth: "400px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" },
  logoContainer: { display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "30px" },
  logo: { width: "50px", height: "50px", background: "linear-gradient(135deg, #3b82f6, #2563eb)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "28px", fontWeight: "bold" },
  logoText: { color: "#fff", fontSize: "24px", fontWeight: "700", margin: 0 },
  authTitle: { color: "#fff", textAlign: "center", marginBottom: "25px", fontSize: "20px" },
  form: { display: "flex", flexDirection: "column", gap: "15px" },
  input: { background: "#334155", border: "1px solid #475569", borderRadius: "10px", padding: "14px 16px", color: "#fff", fontSize: "16px", outline: "none", width: "100%", boxSizing: "border-box" },
  button: { background: "linear-gradient(135deg, #3b82f6, #2563eb)", border: "none", borderRadius: "10px", padding: "14px", color: "#fff", fontSize: "16px", fontWeight: "600", cursor: "pointer" },
  error: { background: "#ef444433", border: "1px solid #ef4444", borderRadius: "8px", padding: "12px", color: "#ef4444", textAlign: "center", marginBottom: "15px" },
  switchText: { color: "#94a3b8", textAlign: "center", marginTop: "20px" },
  link: { color: "#3b82f6", cursor: "pointer", fontWeight: "600" },
  appContainer: { display: "flex", minHeight: "100vh", background: "#0f172a" },
  sidebarWrapper: { position: "fixed", top: 0, height: "100vh", width: "280px", zIndex: 1000, transition: "left 0.3s ease" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999 },
  mainContent: { flex: 1, minHeight: "100vh", background: "#0f172a" },
  sidebar: { width: "280px", height: "100vh", background: "#1e293b", display: "flex", flexDirection: "column", borderRight: "1px solid #334155" },
  sidebarHeader: { display: "flex", alignItems: "center", gap: "12px", padding: "20px", borderBottom: "1px solid #334155" },
  logoSmall: { width: "40px", height: "40px", background: "linear-gradient(135deg, #3b82f6, #2563eb)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "20px", fontWeight: "bold" },
  sidebarTitle: { color: "#fff", fontSize: "20px", fontWeight: "700" },
  nav: { flex: 1, padding: "15px" },
  navItem: { display: "flex", alignItems: "center", gap: "12px", width: "100%", padding: "12px 16px", border: "none", background: "transparent", color: "#94a3b8", fontSize: "15px", borderRadius: "10px", cursor: "pointer", marginBottom: "5px", textAlign: "left" },
  navItemActive: { background: "#3b82f6", color: "#fff" },
  navIcon: { fontSize: "18px" },
  sidebarFooter: { padding: "20px", borderTop: "1px solid #334155" },
  userInfo: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "15px" },
  userAvatar: { width: "40px", height: "40px", background: "#3b82f6", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "600" },
  userName: { color: "#fff", fontSize: "14px" },
  logoutBtn: { width: "100%", padding: "10px", background: "#ef4444", border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer", fontWeight: "600" },
  mobileHeader: { alignItems: "center", justifyContent: "space-between", padding: "15px 20px", background: "#1e293b", borderBottom: "1px solid #334155" },
  menuButton: { background: "transparent", border: "none", color: "#fff", fontSize: "24px", cursor: "pointer", padding: "5px" },
  mobileTitle: { color: "#fff", fontSize: "18px", fontWeight: "600", margin: 0 },
  userAvatarSmall: { width: "35px", height: "35px", background: "#3b82f6", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "14px", fontWeight: "600" },
  page: { padding: "20px", maxWidth: "1200px", margin: "0 auto" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px", flexWrap: "wrap", gap: "15px" },
  pageTitle: { color: "#fff", fontSize: "24px", fontWeight: "700", margin: 0 },
  sectionTitle: { color: "#94a3b8", fontSize: "16px", fontWeight: "600", margin: "20px 0 15px", borderBottom: "1px solid #334155", paddingBottom: "10px" },
  addButton: { background: "#3b82f6", border: "none", borderRadius: "8px", padding: "10px 20px", color: "#fff", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" },
  statCard: { background: "#1e293b", borderRadius: "12px", padding: "20px" },
  statLabel: { color: "#94a3b8", fontSize: "14px", marginBottom: "8px" },
  statValue: { color: "#fff", fontSize: "28px", fontWeight: "700" },
  formCard: { background: "#1e293b", borderRadius: "12px", padding: "20px", marginBottom: "25px" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "15px" },
  saveButton: { background: "#10b981", border: "none", borderRadius: "8px", padding: "12px 25px", color: "#fff", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
  tableContainer: { background: "#1e293b", borderRadius: "12px", padding: "20px", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: "600px" },
  th: { textAlign: "left", padding: "12px 15px", color: "#94a3b8", fontSize: "13px", fontWeight: "600", borderBottom: "1px solid #334155", textTransform: "uppercase" },
  tr: { borderBottom: "1px solid #334155" },
  td: { padding: "15px", color: "#fff", fontSize: "14px" },
  emptyText: { color: "#64748b", textAlign: "center", padding: "40px" },
  deleteBtn: { background: "#ef4444", border: "none", borderRadius: "6px", padding: "6px 12px", color: "#fff", fontSize: "12px", cursor: "pointer" },
  filterContainer: { display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" },
  filterBtn: { background: "#334155", border: "none", borderRadius: "8px", padding: "10px 20px", color: "#94a3b8", fontSize: "14px", cursor: "pointer" },
  filterActive: { background: "#3b82f6", color: "#fff" },
  statusSelect: { border: "none", borderRadius: "6px", padding: "6px 10px", color: "#fff", fontSize: "12px", cursor: "pointer" },
};

export default App;
