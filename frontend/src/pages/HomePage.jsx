import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { axiosInstance } from '../App';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Gift, Gamepad2, Tv, Wrench, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const HomePage = ({ user, logout, cart, settings }) => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeaturedProducts();
  }, []);

  const loadFeaturedProducts = async () => {
    try {
      const response = await axiosInstance.get('/products');
      setFeaturedProducts(response.data.slice(0, 6));
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Erè nan chajman pwodwi yo');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { name: 'Gift Cards', icon: Gift, path: '/products/giftcard', color: 'from-pink-500 to-rose-500' },
    { name: 'Game Topup', icon: Gamepad2, path: '/products/topup', color: 'from-blue-500 to-cyan-500' },
    { name: 'Abònman', icon: Tv, path: '/products/subscription', color: 'from-purple-500 to-indigo-500' },
    { name: 'Sèvis', icon: Wrench, path: '/products/service', color: 'from-green-500 to-emerald-500' },
  ];

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar user={user} logout={logout} cartItemCount={cartItemCount} settings={settings} />

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20" data-testid="hero-section">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
            Achte Pwodwi Dijital <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">Instant</span>
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8">
            Gift cards, topup game, abònman ak plis ankò. Livrezon otomatik 24/7.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/products">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 px-8" data-testid="browse-products-btn">
                Eksplore Pwodwi <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
            {!user && (
              <Link to="/register">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8" data-testid="register-btn">
                  Kreye Kont
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">Kategori Pwodwi</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Link to={category.path} key={category.name}>
                <Card className={`category-card overflow-hidden bg-gradient-to-br ${category.color}`} data-testid={`category-${category.name.toLowerCase().replace(' ', '-')}`}>
                  <CardContent className="p-8 text-center">
                    <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon size={40} className="text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">{category.name}</h3>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Featured Products */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">Pwodwi Popilè</h2>
        {loading ? (
          <div className="text-center text-white">Chajman...</div>
        ) : featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((product) => (
              <Link to={`/product/${product.id}`} key={product.id}>
                <Card className="product-card overflow-hidden bg-white/10 backdrop-blur-lg border-white/20 hover:border-white/40" data-testid={`product-card-${product.id}`}>
                  <div className="h-48 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="text-white" size={64} />
                    )}
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
                    <p className="text-white/70 text-sm mb-4 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-white">${product.price}</span>
                      <Button size="sm" className="bg-white text-purple-600 hover:bg-gray-100" data-testid={`buy-btn-${product.id}`}>
                        Achte Kounye a
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center text-white">Pa gen pwodwi disponib</div>
        )}
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-lg rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚡</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Livrezon Instant</h3>
            <p className="text-white/70">Jwenn pwodwi ou an nan kèk segonn</p>
          </div>
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-lg rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔒</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Sekirite Maksimòm</h3>
            <p className="text-white/70">Tranzaksyon ou yo an sekirite</p>
          </div>
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-lg rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">💬</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Sipò 24/7</h3>
            <p className="text-white/70">Ekip nou la pou ede w nenpòt lè</p>
          </div>
        </div>
      </div>

      <Footer settings={settings} />
    </div>
  );
};

export default HomePage;
