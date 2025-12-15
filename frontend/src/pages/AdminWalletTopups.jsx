import { useEffect, useState } from 'react';
import { axiosInstance } from '../App';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const AdminWalletTopups = ({ user, logout, settings }) => {
  const [topups, setTopups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTopups();
  }, []);

  const loadTopups = async () => {
    try {
      const res = await axiosInstance.get('/wallet/topups/all');
      setTopups(res.data || []);
    } catch (e) {
      console.error('Load topups error:', e);
      toast.error('Error loading wallet topups');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axiosInstance.put(`/wallet/topups/${id}/status?payment_status=${status}`);
      toast.success('Updated');
      loadTopups();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error updating topup');
    }
  };

  const badgeVariant = (status) => {
    if (status === 'paid') return 'default';
    if (status === 'pending_verification') return 'default';
    if (status === 'failed' || status === 'rejected') return 'destructive';
    return 'secondary';
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar user={user} logout={logout} cartItemCount={0} settings={settings} />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-white">Wallet Topups</h1>
            <Button onClick={() => (window.location.href = '/admin')} className="bg-gradient-to-r from-pink-500 to-blue-500 text-white">
              🏠 Admin Home
            </Button>
          </div>

          {loading ? (
            <div className="text-white">Loading...</div>
          ) : (
            <div className="space-y-4">
              {topups.map(t => (
                <Card key={t.id} className="glass-effect border-white/20">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-white font-bold">Topup #{t.id.slice(0, 8)}</p>
                          <Badge variant={badgeVariant(t.payment_status)} className="capitalize">
                            {t.payment_status}
                          </Badge>
                          {t.credited && (
                            <span className="text-green-400 text-xs">credited</span>
                          )}
                        </div>
                        <p className="text-white/80 text-sm">
                          {t.user_email} • ${Number(t.amount).toFixed(2)} • {t.payment_method}
                        </p>
                        {t.transaction_id && (
                          <p className="text-white/60 text-xs mt-1">TX: {t.transaction_id}</p>
                        )}
                        {t.payment_proof_url && (
                          <a href={t.payment_proof_url} target="_blank" rel="noopener noreferrer" className="text-pink-400 text-sm hover:underline">
                            View proof
                          </a>
                        )}
                        {t.plisio_invoice_url && (
                          <a href={t.plisio_invoice_url} target="_blank" rel="noopener noreferrer" className="text-cyan-300 text-sm hover:underline ml-3">
                            View invoice
                          </a>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {(t.payment_status === 'pending' || t.payment_status === 'pending_verification') && (
                          <>
                            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus(t.id, 'paid')}>
                              Approve
                            </Button>
                            <Button variant="destructive" onClick={() => updateStatus(t.id, 'rejected')}>
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {topups.length === 0 && <p className="text-white/60">No wallet topups yet.</p>}
            </div>
          )}
        </div>
      </div>

      <Footer settings={settings} />
    </div>
  );
};

export default AdminWalletTopups;

