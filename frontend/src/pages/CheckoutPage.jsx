import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../App';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, Wallet } from 'lucide-react';
import { toast } from 'sonner';

const CheckoutPage = ({ user, logout, cart, clearCart, settings }) => {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('crypto_plisio');
  const [loading, setLoading] = useState(false);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Ou dwe konekte anvan w achte');
      navigate('/login');
      return;
    }

    if (cart.length === 0) {
      toast.error('Panye ou vid');
      return;
    }

    setLoading(true);

    try {
      const orderItems = cart.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      }));

      const response = await axiosInstance.post(`/orders?user_id=${user.user_id}&user_email=${user.email}`, {
        items: orderItems,
        payment_method: paymentMethod
      });

      const order = response.data;

      // Clear cart
      clearCart();

      if (paymentMethod === 'crypto_plisio' && order.plisio_invoice_id) {
        // Redirect to Plisio payment
        toast.success('Redireksyon pou peman...');
        // In production, redirect to Plisio payment page
        navigate(`/track/${order.id}`);
      } else {
        // Manual payment - redirect to order tracking
        toast.success('Kòmand kreye! Tanpri soumèt prev peman ou.');
        navigate(`/track/${order.id}`);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.detail || 'Erè nan kreye kòmand');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen gradient-bg">
        <Navbar user={user} logout={logout} cartItemCount={cartItemCount} settings={settings} />
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl text-white mb-4">Ou dwe konekte pou kontinye</h2>
          <Button onClick={() => navigate('/login')} className="bg-white text-purple-600 hover:bg-gray-100">
            Konekte
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar user={user} logout={logout} cartItemCount={cartItemCount} settings={settings} />

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-12" data-testid="checkout-title">Peman</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Payment Method */}
          <Card className="glass-effect border-white/20" data-testid="payment-methods">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Chwazi Metòd Peman</h2>
              
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 rounded-lg glass-effect cursor-pointer" data-testid="payment-crypto">
                    <RadioGroupItem value="crypto_plisio" id="crypto" />
                    <Label htmlFor="crypto" className="flex items-center space-x-3 cursor-pointer flex-1">
                      <Wallet className="text-white" size={24} />
                      <div>
                        <div className="text-white font-semibold">Cryptocurrency (Otomatik)</div>
                        <div className="text-white/70 text-sm">Bitcoin, Ethereum, ak plis</div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 p-4 rounded-lg glass-effect cursor-pointer" data-testid="payment-manual">
                    <RadioGroupItem value="manual" id="manual" />
                    <Label htmlFor="manual" className="flex items-center space-x-3 cursor-pointer flex-1">
                      <CreditCard className="text-white" size={24} />
                      <div>
                        <div className="text-white font-semibold">Peman Manyel</div>
                        <div className="text-white/70 text-sm">Bank transfer, lòt metòd (bezwen prev)</div>
                      </div>
                    </Label>
                  </div>
                </div>
              </RadioGroup>

              {paymentMethod === 'manual' && (
                <div className="mt-6 p-4 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
                  <p className="text-yellow-200 text-sm">
                    <strong>Nòt:</strong> Apre w fin pase kòmand, ou ap dwe soumèt prev peman ou ak ID tranzaksyon nan paj suivi kòmand lan.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="glass-effect border-white/20" data-testid="checkout-summary">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Rezime Kòmand</h2>
              
              <div className="space-y-3 mb-6">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-white" data-testid={`summary-item-${item.product.id}`}>
                    <span className="text-white/80">
                      {item.product.name} x {item.quantity}
                    </span>
                    <span className="font-semibold">${(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/20 pt-4 mb-6">
                <div className="flex justify-between text-white text-xl font-bold">
                  <span>Total:</span>
                  <span data-testid="checkout-total">${total.toFixed(2)}</span>
                </div>
              </div>

              <Button
                className="w-full bg-white text-purple-600 hover:bg-gray-100 py-6 text-lg"
                onClick={handleCheckout}
                disabled={loading}
                data-testid="place-order-btn"
              >
                {loading ? 'Pwosesis...' : 'Pase Kòmand'}
              </Button>

              <div className="mt-6 space-y-2 text-white/70 text-sm">
                <p className="flex items-center">
                  <span className="mr-2">✅</span>
                  Tranzaksyon sekirize
                </p>
                <p className="flex items-center">
                  <span className="mr-2">⚡</span>
                  Livrezon rapid
                </p>
                <p className="flex items-center">
                  <span className="mr-2">💬</span>
                  Sipò 24/7
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer settings={settings} />
    </div>
  );
};

export default CheckoutPage;
