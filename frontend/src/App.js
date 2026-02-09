import { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { Button } from "@/components/ui/button";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Home = () => {
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const fetchUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await axios.get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (e) {
      console.error(e);
      localStorage.removeItem('token');
    }
  };

  const helloWorldApi = async () => {
    try {
      const response = await axios.get(`${API}/`);
      setMessage(response.data.message);
    } catch (e) {
      console.error(e, `errored out requesting / api`);
    }
  };

  useEffect(() => {
    helloWorldApi();
    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="App">
      <header className="App-header">
        <a
          className="App-link"
          href="https://emergent.sh"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src="https://avatars.githubusercontent.com/in/1201222?s=120&u=2686cf91179bbafbc7a71bfbc43004cf9ae1acea&v=4" alt="logo" />
        </a>
        <p className="mt-5">{message || "Loading..."}</p>
        
        {user ? (
          <div className="mt-4">
             <p className="text-lg">Welcome, {user.email}!</p>
             <Button onClick={handleLogout} variant="outline" className="mt-2">Logout</Button>
          </div>
        ) : (
          <div className="mt-4 space-x-4">
            <Button onClick={() => navigate('/login')}>Login</Button>
            <Button onClick={() => navigate('/signup')} variant="outline">Sign Up</Button>
          </div>
        )}
      </header>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
