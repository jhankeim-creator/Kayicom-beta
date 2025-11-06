import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { axiosInstance } from '../App';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Package, ShoppingCart, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const ProductDetailPage = ({ user, logout, addToCart, cart, settings }) => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const response = await axiosInstance.get(`/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Erè nan chajman pwodwi a');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    addToCart(product, quantity);
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg">
        <Navbar user={user} logout={logout} cartItemCount={cartItemCount} settings={settings} />
        <div className="container mx-auto px-4 py-20 text-center text-white text-xl">Chajman...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen gradient-bg">
        <Navbar user={user} logout={logout} cartItemCount={cartItemCount} settings={settings} />
        <div className="container mx-auto px-4 py-20 text-center text-white text-xl">Pwodwi pa jwenn</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar user={user} logout={logout} cartItemCount={cartItemCount} settings={settings} />

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="" data-testid="product-image">
            <Card className="overflow-hidden bg-white/10 backdrop-blur-lg border-white/20">
              <div className="aspect-square bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="text-white" size={128} />
                )}
              </div>
            </Card>
          </div>

          {/* Product Details */}
          <div className="text-white" data-testid="product-details">
            <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="product-name">{product.name}</h1>
            
            <div className="flex items-center gap-4 mb-6">
              <span className="text-4xl font-bold" data-testid="product-price">${product.price}</span>
              {product.stock_available ? (
                <span className="flex items-center text-green-400 bg-green-400/20 px-3 py-1 rounded" data-testid="stock-status">
                  <CheckCircle size={16} className="mr-1" />
                  Disponib
                </span>
              ) : (
                <span className="text-red-400 bg-red-400/20 px-3 py-1 rounded" data-testid="stock-status">
                  Epize
                </span>
              )}
            </div>

            <div className="mb-6">
              <span className="inline-block bg-white/10 px-3 py-1 rounded text-sm" data-testid="product-category">
                {product.category === 'giftcard' && 'Gift Card'}
                {product.category === 'topup' && 'Game Topup'}
                {product.category === 'subscription' && 'Abònman'}
                {product.category === 'service' && 'Sèvis'}
              </span>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-3">Deskripsyon</h2>
              <p className="text-white/80 text-lg leading-relaxed" data-testid="product-description">{product.description}</p>
            </div>

            {/* Quantity & Add to Cart */}
            <div className="glass-effect p-6 rounded-lg">
              <div className="flex items-center gap-4 mb-6">
                <label className="text-lg font-semibold">Kantite:</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white text-white hover:bg-white/10 w-10 h-10"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    data-testid="decrease-quantity"
                  >
                    -
                  </Button>
                  <span className="text-xl font-bold w-12 text-center" data-testid="quantity-display">{quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white text-white hover:bg-white/10 w-10 h-10"
                    onClick={() => setQuantity(quantity + 1)}
                    data-testid="increase-quantity"
                  >
                    +
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-lg">
                  <span>Total:</span>
                  <span className="text-2xl font-bold" data-testid="total-price">${(product.price * quantity).toFixed(2)}</span>
                </div>
                <Button
                  size="lg"
                  className="w-full bg-white text-purple-600 hover:bg-gray-100 text-lg py-6"
                  onClick={handleAddToCart}
                  disabled={!product.stock_available}
                  data-testid="add-to-cart-btn"
                >
                  <ShoppingCart className="mr-2" size={24} />
                  Ajoute nan Panye
                </Button>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="mt-6 glass-effect p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-3">Delivery Information</h3>
              <ul className="space-y-2 text-white/80">
                {product.delivery_type === 'automatic' ? (
                  <>
                    <li className="flex items-center">
                      <span className="mr-2">⚡</span>
                      Instant automatic delivery
                    </li>
                    <li className="flex items-center">
                      <span className="mr-2">📬</span>
                      Code sent by email
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-center">
                      <span className="mr-2">👤</span>
                      Manual delivery
                    </li>
                    <li className="flex items-center">
                      <span className="mr-2">⏱️</span>
                      Delivery time: 1-24 hours
                    </li>
                  </>
                )}
                <li className="flex items-center">
                  <span className="mr-2">🔒</span>
                  Tranzaksyon sekirize
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <Footer settings={settings} />
    </div>
  );
};

export default ProductDetailPage;
