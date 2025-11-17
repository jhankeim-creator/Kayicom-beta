import { useEffect, useState } from 'react';
import { axiosInstance } from '../App';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowDownUp, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

const CryptoPage = ({ user, logout, settings }) => {
  const [config, setConfig] = useState(null);
  const [chain, setChain] = useState('BEP20');
  const [amountUsd, setAmountUsd] = useState('');
  const [amountCrypto, setAmountCrypto] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('paypal');
  const [receivingInfo, setReceivingInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    loadConfig();
    if (user) {
      loadTransactions();
    }
  }, [user]);

  const loadConfig = async () => {
    try {
      const response = await axiosInstance.get('/crypto/config');
      setConfig(response.data);
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await axiosInstance.get(`/crypto/transactions/user/${user.user_id}`);
      setTransactions(response.data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const calculateBuy = (usd) => {
    if (!config) return 0;
    const rate = config[`buy_rate_${chain.toLowerCase()}`] || 1.02;
    const crypto = parseFloat(usd) / rate;
    const fee = parseFloat(usd) * (config.buy_fee_percent / 100);
    return { crypto, fee, total: parseFloat(usd) + fee };
  };

  const calculateSell = (crypto) => {
    if (!config) return 0;
    const rate = config[`sell_rate_${chain.toLowerCase()}`] || 0.98;
    const usd = parseFloat(crypto) * rate;
    const fee = usd * (config.sell_fee_percent / 100);
    return { usd, fee, total: usd - fee };
  };

  const handleBuy = async () => {
    if (!user) {
      toast.error('Please login to buy crypto');
      return;
    }

    if (!amountUsd || parseFloat(amountUsd) < (config?.min_buy_usd || 10)) {
      toast.error(`Minimum buy is $${config?.min_buy_usd || 10}`);
      return;
    }

    if (!walletAddress) {
      toast.error('Please enter your wallet address');
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post(
        `/crypto/buy?user_id=${user.user_id}&user_email=${user.email}`,
        {
          chain: chain,
          amount_usd: parseFloat(amountUsd),
          payment_method: paymentMethod,
          wallet_address: walletAddress
        }
      );

      toast.success('Buy order created! Please complete payment.');
      setAmountUsd('');
      setWalletAddress('');
      loadTransactions();
    } catch (error) {
      console.error('Error buying crypto:', error);
      toast.error(error.response?.data?.detail || 'Error creating buy order');
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async () => {
    if (!user) {
      toast.error('Please login to sell crypto');
      return;
    }

    if (!amountCrypto || parseFloat(amountCrypto) < (config?.min_sell_usdt || 10)) {
      toast.error(`Minimum sell is ${config?.min_sell_usdt || 10} USDT`);
      return;
    }

    if (!receivingInfo) {
      toast.error('Please enter payment receiving information');
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post(
        `/crypto/sell?user_id=${user.user_id}&user_email=${user.email}`,
        {
          chain: chain,
          amount_crypto: parseFloat(amountCrypto),
          payment_method: paymentMethod,
          receiving_info: receivingInfo
        }
      );

      toast.success('Sell order created! Send USDT to provided wallet.');
      setAmountCrypto('');
      setReceivingInfo('');
      loadTransactions();
    } catch (error) {
      console.error('Error selling crypto:', error);
      toast.error(error.response?.data?.detail || 'Error creating sell order');
    } finally {
      setLoading(false);
    }
  };

  const buyCalc = amountUsd ? calculateBuy(amountUsd) : null;
  const sellCalc = amountCrypto ? calculateSell(amountCrypto) : null;

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar user={user} logout={logout} cartItemCount={0} settings={settings} />

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-4">
          Buy & Sell USDT
        </h1>
        <p className="text-white/80 text-center mb-12 max-w-2xl mx-auto">
          Trade USDT on BEP20, TRC20, and MATIC networks. No KYC required.
        </p>

        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="buy" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="buy" className="flex items-center gap-2">
                <TrendingUp size={20} />
                Buy USDT
              </TabsTrigger>
              <TabsTrigger value="sell" className="flex items-center gap-2">
                <TrendingDown size={20} />
                Sell USDT
              </TabsTrigger>
            </TabsList>

            {/* BUY TAB */}
            <TabsContent value="buy">
              <Card className="glass-effect border-white/20">
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Chain Selection */}
                    <div>
                      <Label className="text-white">Select Chain</Label>
                      <Select value={chain} onValueChange={setChain}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BEP20">BEP20 (Binance Smart Chain)</SelectItem>
                          <SelectItem value="TRC20">TRC20 (Tron)</SelectItem>
                          <SelectItem value="MATIC">MATIC (Polygon)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Amount */}
                    <div>
                      <Label htmlFor="buy-amount" className="text-white">Amount (USD)</Label>
                      <Input
                        id="buy-amount"
                        type="number"
                        min={config?.min_buy_usd || 10}
                        value={amountUsd}
                        onChange={(e) => setAmountUsd(e.target.value)}
                        placeholder={`Min $${config?.min_buy_usd || 10}`}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 mt-2"
                      />
                      {buyCalc && (
                        <div className="mt-3 p-3 bg-white/5 rounded text-white/80 text-sm">
                          <p>You will receive: <span className="font-bold text-cyan-400">{buyCalc.crypto.toFixed(2)} USDT</span></p>
                          <p>Fee: ${buyCalc.fee.toFixed(2)}</p>
                          <p>Total: <span className="font-bold">${buyCalc.total.toFixed(2)}</span></p>
                        </div>
                      )}
                    </div>

                    {/* Wallet Address */}
                    <div>
                      <Label htmlFor="wallet" className="text-white">Your {chain} Wallet Address</Label>
                      <Input
                        id="wallet"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        placeholder="Enter wallet address to receive USDT"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 mt-2"
                      />
                    </div>

                    {/* Payment Method */}
                    <div>
                      <Label className="text-white mb-3 block">Payment Method</Label>
                      <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                        <div className="space-y-2">
                          {['paypal', 'airtm', 'skrill', 'btc', 'usdt'].map(method => (
                            <label key={method} className={`flex items-center p-3 rounded border-2 cursor-pointer ${
                              paymentMethod === method ? 'border-cyan-400 bg-cyan-400/10' : 'border-white/20'
                            }`}>
                              <RadioGroupItem value={method} />
                              <span className="ml-3 text-white capitalize">{method === 'airtm' ? 'AirTM' : method}</span>
                            </label>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    <Button
                      onClick={handleBuy}
                      disabled={loading}
                      className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-6 text-lg"
                    >
                      {loading ? 'Processing...' : 'Buy USDT'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SELL TAB */}
            <TabsContent value="sell">
              <Card className="glass-effect border-white/20">
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Chain Selection */}
                    <div>
                      <Label className="text-white">Select Chain</Label>
                      <Select value={chain} onValueChange={setChain}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BEP20">BEP20 (Binance Smart Chain)</SelectItem>
                          <SelectItem value="TRC20">TRC20 (Tron)</SelectItem>
                          <SelectItem value="MATIC">MATIC (Polygon)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Amount USDT */}
                    <div>
                      <Label htmlFor="sell-amount" className="text-white">Amount (USDT)</Label>
                      <Input
                        id="sell-amount"
                        type="number"
                        min={config?.min_sell_usdt || 10}
                        value={amountCrypto}
                        onChange={(e) => setAmountCrypto(e.target.value)}
                        placeholder={`Min ${config?.min_sell_usdt || 10} USDT`}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 mt-2"
                      />
                      {sellCalc && (
                        <div className="mt-3 p-3 bg-white/5 rounded text-white/80 text-sm">
                          <p>Amount: ${sellCalc.usd.toFixed(2)}</p>
                          <p>Fee: ${sellCalc.fee.toFixed(2)}</p>
                          <p>You will receive: <span className="font-bold text-green-400">${sellCalc.total.toFixed(2)}</span></p>
                        </div>
                      )}
                    </div>

                    {/* Payment Method */}
                    <div>
                      <Label className="text-white mb-3 block">Receive Payment Via</Label>
                      <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                        <div className="space-y-2">
                          {['paypal', 'airtm', 'skrill', 'usdt', 'btc'].map(method => (
                            <label key={method} className={`flex items-center p-3 rounded border-2 cursor-pointer ${
                              paymentMethod === method ? 'border-pink-400 bg-pink-400/10' : 'border-white/20'
                            }`}>
                              <RadioGroupItem value={method} />
                              <span className="ml-3 text-white capitalize">{method === 'airtm' ? 'AirTM' : method}</span>
                            </label>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Receiving Info */}
                    <div>
                      <Label htmlFor="receiving" className="text-white">
                        {paymentMethod === 'paypal' ? 'PayPal Email' : 
                         paymentMethod === 'moncash' ? 'MonCash Number' : 
                         'Wallet Address'}
                      </Label>
                      <Input
                        id="receiving"
                        value={receivingInfo}
                        onChange={(e) => setReceivingInfo(e.target.value)}
                        placeholder="Where to send payment"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 mt-2"
                      />
                    </div>

                    <Button
                      onClick={handleSell}
                      disabled={loading}
                      className="w-full bg-pink-500 hover:bg-pink-600 text-white py-6 text-lg"
                    >
                      {loading ? 'Processing...' : 'Sell USDT'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Transaction History */}
          {user && transactions.length > 0 && (
            <Card className="glass-effect border-white/20 mt-6">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Recent Transactions</h2>
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 rounded">
                      <div>
                        <p className="text-white font-semibold">
                          {tx.transaction_type === 'buy' ? 'Buy' : 'Sell'} {tx.amount_crypto.toFixed(2)} USDT
                        </p>
                        <p className="text-white/70 text-sm">{tx.chain} - ${tx.total_usd.toFixed(2)}</p>
                        <p className="text-white/60 text-xs">{new Date(tx.created_at).toLocaleString()}</p>
                      </div>
                      <span className={`px-3 py-1 rounded text-sm font-semibold capitalize ${
                        tx.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                  ))}
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

export default CryptoPage;
