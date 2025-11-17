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
import { ArrowDownUp, TrendingUp, TrendingDown, Upload } from 'lucide-react';
import { toast } from 'sonner';

const CryptoPage = ({ user, logout, settings }) => {
  const [config, setConfig] = useState(null);
  const [chain, setChain] = useState('BEP20');
  const [amountUsd, setAmountUsd] = useState('');
  const [amountCrypto, setAmountCrypto] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('paypal');
  const [receivingInfo, setReceivingInfo] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);
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

  const handleFileUpload = async (file) => {
    if (!file) return null;
    
    setUploadingProof(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axiosInstance.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadingProof(false);
      return response.data.url;
    } catch (error) {
      setUploadingProof(false);
      toast.error('Error uploading file');
      return null;
    }
  };

  const calculateBuy = (usd) => {
    if (!config) return 0;
    const rate = config.buy_rate_usdt || 1.02;
    const crypto = parseFloat(usd) / rate;
    const fee = parseFloat(usd) * ((config.transaction_fee_percent || 2) / 100);
    return { crypto, fee, total: parseFloat(usd) + fee };
  };

  const calculateSell = (crypto) => {
    if (!config) return 0;
    const rate = config.sell_rate_usdt || 0.98;
    const usd = parseFloat(crypto) * rate;
    const fee = usd * ((config.transaction_fee_percent || 2) / 100);
    return { usd, fee, total: usd - fee };
  };

  const handleBuy = async () => {
    if (!user) {
      toast.error('Please login to buy crypto');
      return;
    }

    if (!amountUsd || parseFloat(amountUsd) < (config?.min_transaction_usd || 10)) {
      toast.error(`Minimum buy is $${config?.min_transaction_usd || 10}`);
      return;
    }

    if (!walletAddress) {
      toast.error('Please enter your wallet address');
      return;
    }

    if (!transactionId) {
      toast.error('Please enter transaction ID');
      return;
    }

    if (!paymentProofFile) {
      toast.error('Please upload payment proof');
      return;
    }

    setLoading(true);
    
    // Upload file first
    const proofUrl = await handleFileUpload(paymentProofFile);
    if (!proofUrl) {
      setLoading(false);
      return;
    }

    try {
      const response = await axiosInstance.post('/crypto/buy', {
        chain,
        amount_usd: parseFloat(amountUsd),
        wallet_address: walletAddress,
        payment_method: paymentMethod,
        transaction_id: transactionId,
        payment_proof: proofUrl
      });
      toast.success('Buy order submitted! Admin will process your request.');
      setAmountUsd('');
      setWalletAddress('');
      setTransactionId('');
      setPaymentProofFile(null);
      loadTransactions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error submitting buy order');
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async () => {
    if (!user) {
      toast.error('Please login to sell crypto');
      return;
    }

    if (!amountCrypto || parseFloat(amountCrypto) <= 0) {
      toast.error('Please enter valid crypto amount');
      return;
    }

    if (!receivingInfo) {
      toast.error('Please enter your receiving information');
      return;
    }

    if (!transactionId) {
      toast.error('Please enter transaction ID');
      return;
    }

    if (!paymentProofFile) {
      toast.error('Please upload payment proof');
      return;
    }

    setLoading(true);
    
    // Upload file first
    const proofUrl = await handleFileUpload(paymentProofFile);
    if (!proofUrl) {
      setLoading(false);
      return;
    }

    try {
      const response = await axiosInstance.post('/crypto/sell', {
        chain,
        amount_crypto: parseFloat(amountCrypto),
        payment_method: paymentMethod,
        receiving_info: receivingInfo,
        transaction_id: transactionId,
        payment_proof: proofUrl
      });
      toast.success('Sell order submitted! Admin will process your request.');
      setAmountCrypto('');
      setReceivingInfo('');
      setTransactionId('');
      setPaymentProofFile(null);
      loadTransactions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error submitting sell order');
    } finally {
      setLoading(false);
    }
  };

  const buyCalculation = amountUsd ? calculateBuy(amountUsd) : null;
  const sellCalculation = amountCrypto ? calculateSell(amountCrypto) : null;

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar user={user} logout={logout} cartItemCount={0} settings={settings} />

      <div className="w-full max-w-[1400px] mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-4">
            Buy & Sell USDT
          </h1>
          <p className="text-white/80 text-center mb-12">
            Trade USDT on BEP20, TRC20, and MATIC networks. No KYC required.
          </p>

          <Card className="glass-effect border-white/20 mb-8">
            <CardContent className="p-6">
              <Tabs defaultValue="buy" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="buy" className="flex items-center gap-2">
                    <TrendingUp size={18} />
                    Buy USDT
                  </TabsTrigger>
                  <TabsTrigger value="sell" className="flex items-center gap-2">
                    <TrendingDown size={18} />
                    Sell USDT
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="buy" className="space-y-4">
                  <div>
                    <Label className="text-white">Select Chain</Label>
                    <Select value={chain} onValueChange={setChain}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BEP20">BEP20 (Binance Smart Chain)</SelectItem>
                        <SelectItem value="TRC20">TRC20 (Tron)</SelectItem>
                        <SelectItem value="MATIC">MATIC (Polygon)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-white">Amount (USD)</Label>
                    <Input
                      type="number"
                      placeholder={`Min $${config?.min_transaction_usd || 10}`}
                      value={amountUsd}
                      onChange={(e) => setAmountUsd(e.target.value)}
                      className="bg-white/10 border-white/20 text-white mt-1"
                    />
                  </div>

                  {buyCalculation && (
                    <div className="bg-white/5 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between text-white/70">
                        <span>You will receive:</span>
                        <span className="text-white font-bold">{buyCalculation.crypto.toFixed(2)} USDT</span>
                      </div>
                      <div className="flex justify-between text-white/70">
                        <span>Fee ({config?.transaction_fee_percent || 2}%):</span>
                        <span>${buyCalculation.fee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white font-bold border-t border-white/20 pt-2">
                        <span>Total to Pay:</span>
                        <span>${buyCalculation.total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-white">Your {chain} Wallet Address</Label>
                    <Input
                      placeholder="Enter wallet address to receive USDT"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      className="bg-white/10 border-white/20 text-white mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Payment Method</Label>
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2 bg-white/5 p-3 rounded-lg">
                        <RadioGroupItem value="paypal" id="paypal" />
                        <label htmlFor="paypal" className="text-white cursor-pointer flex-1">💳 Paypal</label>
                      </div>
                      <div className="flex items-center space-x-2 bg-white/5 p-3 rounded-lg">
                        <RadioGroupItem value="airtm" id="airtm" />
                        <label htmlFor="airtm" className="text-white cursor-pointer flex-1">💸 AirTM</label>
                      </div>
                      <div className="flex items-center space-x-2 bg-white/5 p-3 rounded-lg">
                        <RadioGroupItem value="skrill" id="skrill" />
                        <label htmlFor="skrill" className="text-white cursor-pointer flex-1">💰 Skrill</label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="text-white">Transaction ID</Label>
                    <Input
                      placeholder="Enter your payment transaction ID"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="bg-white/10 border-white/20 text-white mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Payment Proof (Upload Screenshot)</Label>
                    <div className="mt-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPaymentProofFile(e.target.files[0])}
                        className="block w-full text-white bg-white/10 border border-white/20 rounded-md p-2 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-pink-500 file:text-white hover:file:bg-pink-600"
                      />
                      {paymentProofFile && (
                        <p className="text-green-400 text-sm mt-2">✓ {paymentProofFile.name}</p>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={handleBuy}
                    disabled={loading || uploadingProof}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {loading || uploadingProof ? 'Processing...' : 'Submit Buy Order'}
                  </Button>
                </TabsContent>

                <TabsContent value="sell" className="space-y-4">
                  <div>
                    <Label className="text-white">Select Chain</Label>
                    <Select value={chain} onValueChange={setChain}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BEP20">BEP20 (Binance Smart Chain)</SelectItem>
                        <SelectItem value="TRC20">TRC20 (Tron)</SelectItem>
                        <SelectItem value="MATIC">MATIC (Polygon)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-white">Amount (USDT)</Label>
                    <Input
                      type="number"
                      placeholder="Enter USDT amount"
                      value={amountCrypto}
                      onChange={(e) => setAmountCrypto(e.target.value)}
                      className="bg-white/10 border-white/20 text-white mt-1"
                    />
                  </div>

                  {sellCalculation && (
                    <div className="bg-white/5 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between text-white/70">
                        <span>You will receive:</span>
                        <span className="text-white font-bold">${sellCalculation.usd.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white/70">
                        <span>Fee ({config?.transaction_fee_percent || 2}%):</span>
                        <span>-${sellCalculation.fee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white font-bold border-t border-white/20 pt-2">
                        <span>Total:</span>
                        <span>${sellCalculation.total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-white">Payment Method</Label>
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2 bg-white/5 p-3 rounded-lg">
                        <RadioGroupItem value="paypal" id="sell-paypal" />
                        <label htmlFor="sell-paypal" className="text-white cursor-pointer flex-1">💳 Paypal</label>
                      </div>
                      <div className="flex items-center space-x-2 bg-white/5 p-3 rounded-lg">
                        <RadioGroupItem value="airtm" id="sell-airtm" />
                        <label htmlFor="sell-airtm" className="text-white cursor-pointer flex-1">💸 AirTM</label>
                      </div>
                      <div className="flex items-center space-x-2 bg-white/5 p-3 rounded-lg">
                        <RadioGroupItem value="skrill" id="sell-skrill" />
                        <label htmlFor="skrill" className="text-white cursor-pointer flex-1">💰 Skrill</label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="text-white">Your Receiving Info (Email/Account)</Label>
                    <Input
                      placeholder="Enter your PayPal/AirTM/Skrill email or account"
                      value={receivingInfo}
                      onChange={(e) => setReceivingInfo(e.target.value)}
                      className="bg-white/10 border-white/20 text-white mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Transaction ID (Your Crypto Transfer)</Label>
                    <Input
                      placeholder="Enter your crypto transaction hash/ID"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="bg-white/10 border-white/20 text-white mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Payment Proof (Upload Screenshot)</Label>
                    <div className="mt-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPaymentProofFile(e.target.files[0])}
                        className="block w-full text-white bg-white/10 border border-white/20 rounded-md p-2 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-pink-500 file:text-white hover:file:bg-pink-600"
                      />
                      {paymentProofFile && (
                        <p className="text-green-400 text-sm mt-2">✓ {paymentProofFile.name}</p>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={handleSell}
                    disabled={loading || uploadingProof}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {loading || uploadingProof ? 'Processing...' : 'Submit Sell Order'}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Transaction History */}
          {user && transactions.length > 0 && (
            <Card className="glass-effect border-white/20">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Your Transactions</h2>
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="bg-white/5 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-semibold">
                            {tx.trade_type === 'buy' ? '🟢 Buy' : '🔵 Sell'} {tx.chain}
                          </p>
                          <p className="text-white/70 text-sm">
                            ${tx.amount_usd} → {tx.amount_crypto} USDT
                          </p>
                          {tx.transaction_id && (
                            <p className="text-white/50 text-xs mt-1">TX: {tx.transaction_id}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          tx.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
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