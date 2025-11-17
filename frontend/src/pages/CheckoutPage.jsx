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
import { CreditCard, Wallet, Gamepad2 } from 'lucide-react';
import { toast } from 'sonner';

const CheckoutPage = ({ user, logout, cart, clearCart, settings }) => {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('crypto_plisio');
  const [loading, setLoading] = useState(false);
  const [playerIds, setPlayerIds] = useState({});

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // Check if any item needs player ID
  const needsPlayerIds = cart.some(item => item.product.requires_player_id);

  const handlePlayerIdChange = (productId, value) => {
    setPlayerIds(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  const handleCheckout = async () => {
    if (!user) {
      toast.error('You must login before purchasing');
      navigate('/login');
      return;
    }

    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // Validate player IDs for products that require them
    for (const item of cart) {
      if (item.product.requires_player_id && !playerIds[item.product.id]) {
        toast.error(`Please enter Player ID for ${item.product.name}`);
        return;
      }
    }

    setLoading(true);

    try {
      const orderItems = cart.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        player_id: playerIds[item.product.id] || null
      }));

      const response = await axiosInstance.post(`/orders?user_id=${user.user_id}&user_email=${user.email}`, {
        items: orderItems,
        payment_method: paymentMethod
      });

      const order = response.data;

      // Clear cart
      clearCart();

      if (paymentMethod === 'crypto_plisio' && order.plisio_invoice_id) {
        toast.success('Redirecting to payment...');
        navigate(`/track/${order.id}`);
      } else {
        toast.success('Order created! Please submit your payment proof.');
        navigate(`/track/${order.id}`);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.detail || 'Error creating order');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen gradient-bg">
        <Navbar user={user} logout={logout} cartItemCount={cartItemCount} settings={settings} />
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl text-white mb-4">You must login to continue</h2>
          <Button onClick={() => navigate('/login')} className="bg-white text-purple-600 hover:bg-gray-100">
            Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar user={user} logout={logout} cartItemCount={cartItemCount} settings={settings} />

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-12" data-testid="checkout-title">
          Checkout
        </h1>

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Method */}
          <Card className="glass-effect border-white/20" data-testid="payment-method-card">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Payment Method</h2>
              
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="space-y-4">
                  {/* Crypto Payment */}
                  <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition ${
                    paymentMethod === 'crypto_plisio' ? 'border-cyan-400 bg-cyan-400/10' : 'border-white/20 hover:border-white/40'
                  }`}>
                    <RadioGroupItem value="crypto_plisio" className="mt-1" />
                    <div className="ml-4">
                      <div className="flex items-center gap-2">
                        <Wallet className="text-cyan-400" size={20} />
                        <span className="text-white font-semibold">Cryptocurrency (Automatic)</span>
                      </div>
                      <p className="text-white/70 text-sm mt-1">Bitcoin, Ethereum, USDT - Instant delivery</p>
                    </div>
                  </label>

                  {/* Manual Payment Methods - Only show enabled ones */}
                  {settings?.payment_gateways?.paypal?.enabled && (
                    <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition ${
                      paymentMethod === 'paypal' ? 'border-pink-400 bg-pink-400/10' : 'border-white/20 hover:border-white/40'
                    }`}>
                      <RadioGroupItem value="paypal" className="mt-1" />
                      <div className="ml-4">
                        <div className="flex items-center gap-2">
                          <CreditCard className="text-pink-400" size={20} />
                          <span className="text-white font-semibold">PayPal</span>
                        </div>
                        <p className="text-white/70 text-sm mt-1">Manual verification - Proof required</p>
                        {settings.payment_gateways.paypal.email && (
                          <p className="text-white/60 text-xs mt-1">Send to: {settings.payment_gateways.paypal.email}</p>
                        )}
                      </div>
                    </label>
                  )}

                  {settings?.payment_gateways?.airtm?.enabled && (
                    <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition ${
                      paymentMethod === 'airtm' ? 'border-pink-400 bg-pink-400/10' : 'border-white/20 hover:border-white/40'
                    }`}>
                      <RadioGroupItem value="airtm" className="mt-1" />
                      <div className="ml-4">
                        <div className="flex items-center gap-2">
                          <CreditCard className="text-pink-400" size={20} />
                          <span className="text-white font-semibold">AirTM</span>
                        </div>
                        <p className="text-white/70 text-sm mt-1">Manual verification - Proof required</p>
                        {settings.payment_gateways.airtm.email && (
                          <p className="text-white/60 text-xs mt-1">Send to: {settings.payment_gateways.airtm.email}</p>
                        )}
                      </div>
                    </label>
                  )}

                  {settings?.payment_gateways?.skrill?.enabled && (
                    <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition ${
                      paymentMethod === 'skrill' ? 'border-pink-400 bg-pink-400/10' : 'border-white/20 hover:border-white/40'
                    }`}>
                      <RadioGroupItem value="skrill" className="mt-1" />
                      <div className="ml-4">
                        <div className="flex items-center gap-2">
                          <CreditCard className="text-pink-400" size={20} />
                          <span className="text-white font-semibold">Skrill</span>
                        </div>
                        <p className="text-white/70 text-sm mt-1">Manual verification - Proof required</p>
                        {settings.payment_gateways.skrill.email && (
                          <p className="text-white/60 text-xs mt-1">Send to: {settings.payment_gateways.skrill.email}</p>
                        )}
                      </div>
                    </label>
                  )}
                </div>
              </RadioGroup>

              {['paypal', 'airtm', 'skrill'].includes(paymentMethod) && settings?.payment_gateways?.[paymentMethod] && (
                <div className="mt-6 p-4 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
                  <p className="text-yellow-200 text-sm mb-2">
                    <strong>Payment Instructions:</strong>
                  </p>
                  {settings.payment_gateways[paymentMethod].instructions && (
                    <p className="text-white/80 text-sm mb-2">
                      {settings.payment_gateways[paymentMethod].instructions}
                    </p>
                  )}
                  <p className="text-yellow-200 text-sm">
                    After placing your order, submit your payment proof and transaction ID on the order tracking page.
                  </p>
                </div>
              )}

              {/* Player ID Section */}
              {needsPlayerIds && (
                <div className="mt-6 border-t border-white/20 pt-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Gamepad2 className="text-cyan-400" size={24} />
                    Player IDs Required
                  </h3>
                  <div className="space-y-4">
                    {cart.filter(item => item.product.requires_player_id).map(item => (
                      <div key={item.product.id}>
                        <Label htmlFor={`player-id-${item.product.id}`} className="text-white">
                          Player ID for {item.product.name}
                        </Label>
                        <Input
                          id={`player-id-${item.product.id}`}
                          value={playerIds[item.product.id] || ''}
                          onChange={(e) => handlePlayerIdChange(item.product.id, e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50 mt-2"
                          placeholder="Enter your Player ID / User ID"
                          required
                          data-testid={`player-id-${item.product.id}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="glass-effect border-white/20" data-testid="checkout-summary">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Order Summary</h2>
              
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
                {loading ? 'Processing...' : 'Place Order'}
              </Button>

              <div className="mt-6 space-y-2 text-white/70 text-sm">
                <p className="flex items-center">
                  <span className="mr-2">✅</span>
                  Secure transaction
                </p>
                <p className="flex items-center">
                  <span className="mr-2">⚡</span>
                  Fast delivery
                </p>
                <p className="flex items-center">
                  <span className="mr-2">💬</span>
                  24/7 Support
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
