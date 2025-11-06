import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

// Pages
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import CustomerDashboard from './pages/CustomerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminProducts from './pages/AdminProducts';
import AdminOrders from './pages/AdminOrders';
import AdminSettings from './pages/AdminSettings';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Create axios instance
export const axiosInstance = axios.create({
  baseURL: API,
});

function App() {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    // Load user from localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

    // Load site settings
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await axiosInstance.get('/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    toast.success('Dekonekte avèk siksè');
  };

  const addToCart = (product, quantity = 1) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    let newCart;
    
    if (existingItem) {
      newCart = cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      newCart = [...cart, { product, quantity }];
    }
    
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    toast.success('Pwodwi ajoute nan panye');
  };

  const removeFromCart = (productId) => {
    const newCart = cart.filter(item => item.product.id !== productId);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    toast.success('Pwodwi retire nan panye');
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    const newCart = cart.map(item =>
      item.product.id === productId ? { ...item, quantity } : item
    );
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('cart');
  };

  const ProtectedRoute = ({ children, adminOnly = false }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    
    if (adminOnly && user.role !== 'admin') {
      return <Navigate to="/" replace />;
    }
    
    return children;
  };

  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage user={user} logout={logout} cart={cart} settings={settings} />} />
          <Route path="/products" element={<ProductsPage user={user} logout={logout} addToCart={addToCart} cart={cart} settings={settings} />} />
          <Route path="/products/:category" element={<ProductsPage user={user} logout={logout} addToCart={addToCart} cart={cart} settings={settings} />} />
          <Route path="/product/:id" element={<ProductDetailPage user={user} logout={logout} addToCart={addToCart} cart={cart} settings={settings} />} />
          <Route path="/cart" element={<CartPage user={user} logout={logout} cart={cart} removeFromCart={removeFromCart} updateCartQuantity={updateCartQuantity} settings={settings} />} />
          <Route path="/checkout" element={<CheckoutPage user={user} logout={logout} cart={cart} clearCart={clearCart} settings={settings} />} />
          <Route path="/track/:orderId" element={<OrderTrackingPage user={user} logout={logout} settings={settings} />} />
          <Route path="/login" element={<LoginPage login={login} settings={settings} />} />
          <Route path="/register" element={<RegisterPage login={login} settings={settings} />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <CustomerDashboard user={user} logout={logout} settings={settings} />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboard user={user} logout={logout} settings={settings} />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute adminOnly>
                <AdminProducts user={user} logout={logout} settings={settings} />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute adminOnly>
                <AdminOrders user={user} logout={logout} settings={settings} />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute adminOnly>
                <AdminSettings user={user} logout={logout} settings={settings} loadSettings={loadSettings} />
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster position="top-right" richColors />
      </div>
    </BrowserRouter>
  );
}

export default App;
