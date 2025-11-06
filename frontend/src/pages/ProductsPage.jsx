import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { axiosInstance } from '../App';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Package, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

const ProductsPage = ({ user, logout, addToCart, cart, settings }) => {
  const { category } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(category || '');

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const url = selectedCategory ? `/products?category=${selectedCategory}` : '/products';
      const response = await axiosInstance.get(url);
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Erè nan chajman pwodwi yo');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: '', label: 'Tout' },
    { value: 'giftcard', label: 'Gift Cards' },
    { value: 'topup', label: 'Game Topup' },
    { value: 'subscription', label: 'Abònman' },
    { value: 'service', label: 'Sèvis' },
  ];

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar user={user} logout={logout} cartItemCount={cartItemCount} settings={settings} />

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-8" data-testid="products-title">
          Tout Pwodwi
        </h1>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-3 justify-center mb-12">
          {categories.map((cat) => (
            <Button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              variant={selectedCategory === cat.value ? 'default' : 'outline'}
              className={selectedCategory === cat.value 
                ? 'bg-white text-purple-600 hover:bg-gray-100' 
                : 'border-white text-white hover:bg-white/10'
              }
              data-testid={`filter-${cat.value || 'all'}`}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center text-white text-xl">Chajman pwodwi yo...</div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="products-grid">
            {products.map((product) => (
              <Card key={product.id} className="product-card overflow-hidden bg-white/10 backdrop-blur-lg border-white/20 hover:border-white/40" data-testid={`product-card-${product.id}`}>
                <div className="h-48 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="text-white" size={64} />
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="text-lg font-bold text-white mb-2">{product.name}</h3>
                  <p className="text-white/70 text-sm mb-4 line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold text-white">${product.price}</span>
                    {product.stock_available ? (
                      <span className="text-xs text-green-400 bg-green-400/20 px-2 py-1 rounded">Disponib</span>
                    ) : (
                      <span className="text-xs text-red-400 bg-red-400/20 px-2 py-1 rounded">Epize</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/product/${product.id}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full border-white text-white hover:bg-white/10" data-testid={`view-btn-${product.id}`}>
                        Detay
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      className="flex-1 bg-white text-purple-600 hover:bg-gray-100"
                      onClick={() => addToCart(product)}
                      disabled={!product.stock_available}
                      data-testid={`add-cart-btn-${product.id}`}
                    >
                      <ShoppingCart size={16} className="mr-1" />
                      Ajoute
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center text-white text-xl" data-testid="no-products">Pa gen pwodwi nan kategori sa a</div>
        )}
      </div>

      <Footer settings={settings} />
    </div>
  );
};

export default ProductsPage;
