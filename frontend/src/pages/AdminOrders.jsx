import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { axiosInstance } from '../App';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const AdminOrders = ({ user, logout, settings }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await axiosInstance.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Erè nan chajman kòmand yo');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayment = async (orderId) => {
    try {
      await axiosInstance.put(`/orders/${orderId}/status?payment_status=paid&order_status=processing`);
      toast.success('Peman apwouve!');
      loadOrders();
    } catch (error) {
      console.error('Error approving payment:', error);
      toast.error('Erè nan apwobasyon peman');
    }
  };

  const handleRejectPayment = async (orderId) => {
    if (!window.confirm('Ou si ou vle rejte peman sa a?')) return;

    try {
      await axiosInstance.put(`/orders/${orderId}/status?payment_status=failed`);
      toast.success('Peman rejte');
      loadOrders();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error('Erè nan rejesyon peman');
    }
  };

  const handleCompleteOrder = async (orderId) => {
    try {
      await axiosInstance.put(`/orders/${orderId}/status?order_status=completed`);
      toast.success('Kòmand konplete!');
      loadOrders();
    } catch (error) {
      console.error('Error completing order:', error);
      toast.error('Erè nan konpletasyon kòmand');
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    if (filter === 'pending_payment') return order.payment_status === 'pending_verification';
    if (filter === 'processing') return order.order_status === 'processing';
    if (filter === 'completed') return order.order_status === 'completed';
    return true;
  });

  const getPaymentStatusBadge = (status) => {
    const badges = {
      'pending': 'secondary',
      'pending_verification': 'default',
      'paid': 'default',
      'failed': 'destructive',
      'cancelled': 'secondary'
    };
    return badges[status] || 'secondary';
  };

  const getOrderStatusBadge = (status) => {
    const badges = {
      'pending': 'secondary',
      'processing': 'default',
      'completed': 'default',
      'cancelled': 'destructive'
    };
    return badges[status] || 'secondary';
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar user={user} logout={logout} cartItemCount={0} settings={settings} />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white" data-testid="orders-title">Jere Kòmand</h1>
            
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[200px] bg-white/10 border-white/20 text-white" data-testid="filter-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout Kòmand</SelectItem>
                <SelectItem value="pending_payment">Peman An Atant</SelectItem>
                <SelectItem value="processing">An Kou</SelectItem>
                <SelectItem value="completed">Konplete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center text-white text-xl py-12">Chajman...</div>
          ) : filteredOrders.length > 0 ? (
            <div className="space-y-4" data-testid="orders-list">
              {filteredOrders.map((order) => (
                <Card key={order.id} className="glass-effect border-white/20" data-testid={`order-${order.id}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                      {/* Order Info */}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold text-white">Kòmand #{order.id.slice(0, 8)}</h3>
                          <Badge variant={getPaymentStatusBadge(order.payment_status)} className="capitalize">
                            {order.payment_status}
                          </Badge>
                          <Badge variant={getOrderStatusBadge(order.order_status)} className="capitalize">
                            {order.order_status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-white/80 text-sm">
                          <p><strong>Kliyan:</strong> {order.user_email}</p>
                          <p><strong>Metòd:</strong> {order.payment_method === 'crypto_plisio' ? 'Cryptocurrency' : 'Manyel'}</p>
                          <p><strong>Total:</strong> ${order.total_amount.toFixed(2)}</p>
                          <p><strong>Atik:</strong> {order.items.length} pwodwi</p>
                          <p><strong>Date:</strong> {new Date(order.created_at).toLocaleString('fr-FR')}</p>
                        </div>

                        {/* Payment Proof */}
                        {order.payment_proof_url && (
                          <div className="mt-3 p-3 bg-white/5 rounded">
                            <p className="text-white text-sm mb-1"><strong>Prev Peman:</strong></p>
                            <p className="text-white/70 text-sm mb-2">ID: {order.transaction_id}</p>
                            <a
                              href={order.payment_proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-300 hover:underline text-sm"
                              data-testid={`proof-link-${order.id}`}
                            >
                              Gade prev peman
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 min-w-[180px]">
                        <Link to={`/track/${order.id}`}>
                          <Button variant="outline" className="w-full border-white text-white hover:bg-white/10" data-testid={`view-order-${order.id}`}>
                            <Eye size={16} className="mr-2" />
                            Gade Detay
                          </Button>
                        </Link>

                        {order.payment_status === 'pending_verification' && (
                          <>
                            <Button
                              className="w-full bg-green-500 hover:bg-green-600 text-white"
                              onClick={() => handleApprovePayment(order.id)}
                              data-testid={`approve-payment-${order.id}`}
                            >
                              <CheckCircle size={16} className="mr-2" />
                              Apwouve Peman
                            </Button>
                            <Button
                              variant="destructive"
                              className="w-full"
                              onClick={() => handleRejectPayment(order.id)}
                              data-testid={`reject-payment-${order.id}`}
                            >
                              <XCircle size={16} className="mr-2" />
                              Rejte
                            </Button>
                          </>
                        )}

                        {order.order_status === 'processing' && order.payment_status === 'paid' && (
                          <Button
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                            onClick={() => handleCompleteOrder(order.id)}
                            data-testid={`complete-order-${order.id}`}
                          >
                            <CheckCircle size={16} className="mr-2" />
                            Make Konplete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center text-white/70 py-12" data-testid="no-orders">
              <p>Pa gen kòmand pou filtè sa a</p>
            </div>
          )}
        </div>
      </div>

      <Footer settings={settings} />
    </div>
  );
};

export default AdminOrders;
