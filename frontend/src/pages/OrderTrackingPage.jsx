import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { axiosInstance } from '../App';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Clock, Package, Truck, XCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';

const OrderTrackingPage = ({ user, logout, settings }) => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [proofUrl, setProofUrl] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const response = await axiosInstance.get(`/orders/${orderId}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Error loading order:', error);
      toast.error('Error loading order');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!proofUrl || !transactionId) {
      toast.error('Please fill all fields');
      return;
    }

    setSubmitting(true);

    try {
      await axiosInstance.post('/payments/manual-proof', {
        order_id: orderId,
        transaction_id: transactionId,
        payment_proof_url: proofUrl
      });

      toast.success('Payment proof submitted successfully!');
      loadOrder();
      setProofUrl('');
      setTransactionId('');
    } catch (error) {
      console.error('Error submitting proof:', error);
      toast.error('Error submitting payment proof');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="text-yellow-400" size={24} />;
      case 'processing':
        return <Truck className="text-blue-400" size={24} />;
      case 'completed':
        return <CheckCircle className="text-green-400" size={24} />;
      case 'cancelled':
        return <XCircle className="text-red-400" size={24} />;
      default:
        return <Package className="text-gray-400" size={24} />;
    }
  };

  const getPaymentStatusBadge = (status) => {
    const badges = {
      'pending': 'bg-yellow-400/20 text-yellow-400',
      'pending_verification': 'bg-blue-400/20 text-blue-400',
      'paid': 'bg-green-400/20 text-green-400',
      'failed': 'bg-red-400/20 text-red-400',
      'cancelled': 'bg-gray-400/20 text-gray-400'
    };
    return badges[status] || badges['pending'];
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg">
        <Navbar user={user} logout={logout} cartItemCount={0} settings={settings} />
        <div className="container mx-auto px-4 py-20 text-center text-white text-xl">Chajman...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen gradient-bg">
        <Navbar user={user} logout={logout} cartItemCount={0} settings={settings} />
        <div className="container mx-auto px-4 py-20 text-center text-white text-xl">Kòmand pa jwenn</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar user={user} logout={logout} cartItemCount={0} settings={settings} />

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-12" data-testid="tracking-title">
          Suivi Kòmand
        </h1>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Order Status */}
          <Card className="glass-effect border-white/20" data-testid="order-status">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Kòmand #{order.id.slice(0, 8)}</h2>
                  <p className="text-white/70">Date: {new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(order.order_status)}
                  <span className="text-white font-semibold capitalize" data-testid="order-status-text">{order.order_status}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/80">Estati Peman:</span>
                  <span className={`px-3 py-1 rounded text-sm font-semibold ${getPaymentStatusBadge(order.payment_status)}`} data-testid="payment-status">
                    {order.payment_status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80">Metòd Peman:</span>
                  <span className="text-white font-semibold">{order.payment_method === 'crypto_plisio' ? 'Cryptocurrency' : 'Manyel'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80">Total:</span>
                  <span className="text-white font-bold text-xl" data-testid="order-total">${order.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card className="glass-effect border-white/20" data-testid="order-items">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">Atik yo</h3>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-white" data-testid={`order-item-${index}`}>
                    <div>
                      <p className="font-semibold">{item.product_name}</p>
                      <p className="text-white/70 text-sm">Kantite: {item.quantity}</p>
                    </div>
                    <p className="font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Manual Payment Proof Upload */}
          {order.payment_method === 'manual' && order.payment_status === 'pending' && (
            <Card className="glass-effect border-white/20" data-testid="payment-proof-form">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Upload className="mr-2" size={24} />
                  Soumèt Prev Peman
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="transactionId" className="text-white">ID Tranzaksyon</Label>
                    <Input
                      id="transactionId"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      placeholder="Antre ID tranzaksyon ou"
                      data-testid="transaction-id-input"
                    />
                  </div>

                  <div>
                    <Label htmlFor="proofUrl" className="text-white">Lyen Prev (Screenshot/Imaj)</Label>
                    <Textarea
                      id="proofUrl"
                      value={proofUrl}
                      onChange={(e) => setProofUrl(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      placeholder="Kole lyen imaj prev peman ou (imgur, etc.)"
                      rows={3}
                      data-testid="proof-url-input"
                    />
                  </div>

                  <Button
                    onClick={handleSubmitProof}
                    disabled={submitting}
                    className="w-full bg-white text-purple-600 hover:bg-gray-100"
                    data-testid="submit-proof-btn"
                  >
                    {submitting ? 'Soumsyon...' : 'Soumèt Prev Peman'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Proof Submitted */}
          {order.payment_proof_url && (
            <Card className="glass-effect border-white/20" data-testid="submitted-proof">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">Prev Peman Soumèt</h3>
                <div className="space-y-2 text-white">
                  <p><strong>ID Tranzaksyon:</strong> {order.transaction_id}</p>
                  <p><strong>Prev:</strong> <a href={order.payment_proof_url} target="_blank" rel="noopener noreferrer" className="underline">Gade prev</a></p>
                  <p className="text-white/70 text-sm mt-2">Ekip nou ap revize prev ou. Ou ap resevwa notifikasyon byento.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Footer settings={settings} />
    </div>
  );
};

export default OrderTrackingPage;
