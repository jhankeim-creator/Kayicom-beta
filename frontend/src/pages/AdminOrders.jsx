import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { axiosInstance } from '../App';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Eye, CheckCircle, XCircle, Send, Package } from 'lucide-react';
import { toast } from 'sonner';

const AdminOrders = ({ user, logout, settings }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deliveryDialog, setDeliveryDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deliveryInfo, setDeliveryInfo] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await axiosInstance.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Error loading orders');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayment = async (orderId) => {
    try {
      await axiosInstance.put(`/orders/${orderId}/status?payment_status=paid&order_status=processing`);
      toast.success('Payment approved!');
      loadOrders();
    } catch (error) {
      console.error('Error approving payment:', error);
      toast.error('Error approving payment');
    }
  };

  const handleRejectPayment = async (orderId) => {
    if (!window.confirm('Are you sure you want to reject this payment?')) return;

    try {
      await axiosInstance.put(`/orders/${orderId}/status?payment_status=failed`);
      toast.success('Payment rejected');
      loadOrders();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error('Error rejecting payment');
    }
  };

  const handleCompleteOrder = async (orderId) => {
    try {
      await axiosInstance.put(`/orders/${orderId}/status?order_status=completed`);
      toast.success('Order completed!');
      loadOrders();
    } catch (error) {
      console.error('Error completing order:', error);
      toast.error('Error completing order');
    }
  };

  const handleDeliverOrder = (order) => {
    setSelectedOrder(order);
    setDeliveryInfo('');
    setDeliveryDialog(true);
  };

  const submitDelivery = async () => {
    if (!deliveryInfo.trim()) {
      toast.error('Please enter delivery information');
      return;
    }

    try {
      // Update order with delivery info and mark as completed
      await axiosInstance.put(`/orders/${selectedOrder.id}/delivery`, {
        delivery_details: deliveryInfo
      });
      
      toast.success('Order delivered successfully! Customer will receive the information.');
      setDeliveryDialog(false);
      loadOrders();
    } catch (error) {
      console.error('Error delivering order:', error);
      toast.error('Error delivering order');
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
            <h1 className="text-4xl md:text-5xl font-bold text-white" data-testid="orders-title">Manage Orders</h1>
            
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[200px] bg-white/10 border-white/20 text-white" data-testid="filter-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="pending_payment">Pending Payment</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center text-white text-xl py-12">Loading...</div>
          ) : filteredOrders.length > 0 ? (
            <div className="space-y-4" data-testid="orders-list">
              {filteredOrders.map((order) => (
                <Card key={order.id} className="glass-effect border-white/20" data-testid={`order-${order.id}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                      {/* Order Info */}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold text-white">Order #{order.id.slice(0, 8)}</h3>
                          <Badge variant={getPaymentStatusBadge(order.payment_status)} className="capitalize">
                            {order.payment_status}
                          </Badge>
                          <Badge variant={getOrderStatusBadge(order.order_status)} className="capitalize">
                            {order.order_status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-white/80 text-sm">
                          <p><strong>Customer:</strong> {order.user_email}</p>
                          <p><strong>Payment Method:</strong> {order.payment_method === 'crypto_plisio' ? 'Cryptocurrency' : order.payment_method}</p>
                          <p><strong>Total:</strong> ${order.total_amount.toFixed(2)}</p>
                          <p><strong>Items:</strong> {order.items.length} product(s)</p>
                          <p><strong>Date:</strong> {new Date(order.created_at).toLocaleString('en-US')}</p>
                        </div>

                        {/* Payment Proof */}
                        {order.payment_proof_url && (
                          <div className="mt-3 p-3 bg-white/5 rounded">
                            <p className="text-white text-sm mb-1"><strong>Payment Proof:</strong></p>
                            <p className="text-white/70 text-sm mb-2">ID: {order.transaction_id}</p>
                            <a
                              href={order.payment_proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-pink-400 hover:underline text-sm"
                              data-testid={`proof-link-${order.id}`}
                            >
                              View payment proof
                            </a>
                          </div>
                        )}

                        {/* Delivery Information */}
                        {order.delivery_info && (
                          <div className="mt-3 p-3 bg-green-900/20 border border-green-500/30 rounded">
                            <p className="text-green-400 text-sm mb-1"><strong>✓ Delivered</strong></p>
                            <p className="text-white/70 text-xs">
                              {new Date(order.delivery_info.delivered_at).toLocaleString('en-US')}
                            </p>
                            <div className="mt-2 p-2 bg-white/5 rounded">
                              <p className="text-white/80 text-xs whitespace-pre-wrap">{order.delivery_info.details}</p>
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 min-w-[180px]">
                        <Link to={`/track/${order.id}`}>
                          <Button variant="outline" className="w-full border-white text-white hover:bg-white/10" data-testid={`view-order-${order.id}`}>
                            <Eye size={16} className="mr-2" />
                            View Details
                          </Button>
                        </Link>

                        {(order.payment_status === 'pending_verification' || order.payment_status === 'pending') && (
                          <>
                            <Button
                              className="w-full bg-green-500 hover:bg-green-600 text-white"
                              onClick={() => handleApprovePayment(order.id)}
                              data-testid={`approve-payment-${order.id}`}
                            >
                              <CheckCircle size={16} className="mr-2" />
                              Approve Payment
                            </Button>
                            <Button
                              variant="destructive"
                              className="w-full"
                              onClick={() => handleRejectPayment(order.id)}
                              data-testid={`reject-payment-${order.id}`}
                            >
                              <XCircle size={16} className="mr-2" />
                              Reject Order
                            </Button>
                          </>
                        )}

                        {order.order_status === 'processing' && order.payment_status === 'paid' && (
                          <>
                            <Button
                              className="w-full gradient-button text-white"
                              onClick={() => handleDeliverOrder(order)}
                              data-testid={`deliver-order-${order.id}`}
                            >
                              <Send size={16} className="mr-2" />
                              Deliver Order
                            </Button>
                            <Button
                              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                              onClick={() => handleCompleteOrder(order.id)}
                              data-testid={`complete-order-${order.id}`}
                            >
                              <CheckCircle size={16} className="mr-2" />
                              Mark Complete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center text-white/70 py-12" data-testid="no-orders">
              <Package size={64} className="mx-auto mb-4 text-white/30" />
              <p>No orders found for this filter</p>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Dialog */}
      <Dialog open={deliveryDialog} onOpenChange={setDeliveryDialog}>
        <DialogContent className="bg-gray-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">Deliver Order #{selectedOrder?.id?.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">Delivery Information</Label>
              <Textarea
                value={deliveryInfo}
                onChange={(e) => setDeliveryInfo(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 mt-2"
                placeholder="Enter codes, credentials, or delivery instructions..."
                rows={6}
                data-testid="delivery-info-input"
              />
            </div>
            <p className="text-gray-400 text-sm">
              This information will be sent to the customer: {selectedOrder?.user_email}
            </p>
            <div className="flex gap-3">
              <Button onClick={submitDelivery} className="flex-1 gradient-button text-white" data-testid="submit-delivery-btn">
                <Send className="mr-2" size={16} />
                Send & Complete
              </Button>
              <Button onClick={() => setDeliveryDialog(false)} variant="outline" className="border-white/20 text-white">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer settings={settings} />
    </div>
  );
};

export default AdminOrders;
