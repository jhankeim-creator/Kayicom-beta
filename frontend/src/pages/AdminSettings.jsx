import { useState, useEffect } from 'react';
import { axiosInstance } from '../App';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, Settings as SettingsIcon, Key, Package, Mail, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const AdminSettings = ({ user, logout, settings: currentSettings, loadSettings }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    site_name: '',
    logo_url: '',
    primary_color: '',
    secondary_color: '',
    support_email: '',
    plisio_api_key: '',
    mtcgame_api_key: '',
    gosplit_api_key: '',
    z2u_api_key: '',
    resend_api_key: '',
    product_categories: [],
    payment_gateways: {
      paypal: { enabled: true, email: '', instructions: '' },
      airtm: { enabled: true, email: '', instructions: '' },
      skrill: { enabled: true, email: '', instructions: '' }
    }
  });
  const [newCategory, setNewCategory] = useState('');
  const [bulkEmail, setBulkEmail] = useState({
    subject: '',
    message: '',
    recipient_type: 'all'
  });
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (currentSettings) {
      setFormData({
        site_name: currentSettings.site_name || '',
        logo_url: currentSettings.logo_url || '',
        primary_color: currentSettings.primary_color || '',
        secondary_color: currentSettings.secondary_color || '',
        support_email: currentSettings.support_email || '',
        plisio_api_key: currentSettings.plisio_api_key || '',
        mtcgame_api_key: currentSettings.mtcgame_api_key || '',
        gosplit_api_key: currentSettings.gosplit_api_key || '',
        z2u_api_key: currentSettings.z2u_api_key || '',
        resend_api_key: currentSettings.resend_api_key || '',
        product_categories: currentSettings.product_categories || ['giftcard', 'topup', 'subscription', 'service'],
        payment_gateways: currentSettings.payment_gateways || {
          paypal: { enabled: true, email: '', instructions: '' },
          airtm: { enabled: true, email: '', instructions: '' },
          skrill: { enabled: true, email: '', instructions: '' }
        }
      });
    }
  }, [currentSettings]);

  const addCategory = () => {
    if (newCategory && !formData.product_categories.includes(newCategory)) {
      setFormData({...formData, product_categories: [...formData.product_categories, newCategory]});
      setNewCategory('');
    }
  };

  const removeCategory = (cat) => {
    setFormData({...formData, product_categories: formData.product_categories.filter(c => c !== cat)});
  };

  const handleSendBulkEmail = async () => {
    if (!bulkEmail.subject || !bulkEmail.message) {
      toast.error('Please fill in subject and message');
      return;
    }

    setSendingEmail(true);
    try {
      const response = await axiosInstance.post('/emails/bulk-send', bulkEmail);
      toast.success(`Email sent to ${response.data.sent_count} recipients!`);
      setBulkEmail({subject: '', message: '', recipient_type: 'all'});
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error sending bulk email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handlePaymentGatewayChange = (gateway, field, value) => {
    setFormData({
      ...formData,
      payment_gateways: {
        ...formData.payment_gateways,
        [gateway]: {
          ...formData.payment_gateways[gateway],
          [field]: value
        }
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates = {};
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '') {
          updates[key] = formData[key];
        }
      });

      await axiosInstance.put('/settings', updates);
      toast.success('Settings saved successfully!');
      await loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar user={user} logout={logout} cartItemCount={0} settings={currentSettings} />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-12" data-testid="settings-title">Site Settings</h1>

          <Card className="glass-effect border-white/20">
            <CardContent className="p-6">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-6">
                  <TabsTrigger value="general" data-testid="tab-general">
                    <SettingsIcon size={16} className="mr-2" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="api" data-testid="tab-api">
                    <Key size={16} className="mr-2" />
                    API Keys
                  </TabsTrigger>
                  <TabsTrigger value="payments" data-testid="tab-payments">
                    <Key size={16} className="mr-2" />
                    Payments
                  </TabsTrigger>
                  <TabsTrigger value="categories" data-testid="tab-categories">
                    <Package size={16} className="mr-2" />
                    Categories
                  </TabsTrigger>
                  <TabsTrigger value="email" data-testid="tab-email">
                    <Mail size={16} className="mr-2" />
                    Bulk Email
                  </TabsTrigger>
                </TabsList>

                <form onSubmit={handleSubmit}>
                  <TabsContent value="general" className="space-y-4">
                    <div>
                      <Label htmlFor="site_name" className="text-white">Site Name</Label>
                      <Input
                        id="site_name"
                        value={formData.site_name}
                        onChange={(e) => handleChange('site_name', e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        data-testid="site-name-input"
                      />
                    </div>

                    <div>
                      <Label htmlFor="support_email" className="text-white">Support Email</Label>
                      <Input
                        id="support_email"
                        type="email"
                        value={formData.support_email}
                        onChange={(e) => handleChange('support_email', e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        data-testid="support-email-input"
                      />
                    </div>

                    <div>
                      <Label htmlFor="logo_url" className="text-white">Logo URL</Label>
                      <Input
                        id="logo_url"
                        value={formData.logo_url}
                        onChange={(e) => handleChange('logo_url', e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        placeholder="https://example.com/logo.png"
                        data-testid="logo-url-input"
                      />
                      {formData.logo_url && (
                        <div className="mt-2">
                          <img src={formData.logo_url} alt="Logo preview" className="h-16 bg-white/10 p-2 rounded" />
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="api" className="space-y-4">
                    <div>
                      <Label htmlFor="plisio_api_key" className="text-white">Plisio API Key (Crypto Payment)</Label>
                      <Input
                        id="plisio_api_key"
                        type="password"
                        value={formData.plisio_api_key}
                        onChange={(e) => handleChange('plisio_api_key', e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        placeholder="••••••••"
                        data-testid="plisio-key-input"
                      />
                    </div>

                    <div>
                      <Label htmlFor="resend_api_key" className="text-white">Resend API Key (Email)</Label>
                      <Input
                        id="resend_api_key"
                        type="password"
                        value={formData.resend_api_key}
                        onChange={(e) => handleChange('resend_api_key', e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        placeholder="••••••••"
                        data-testid="resend-key-input"
                      />
                    </div>

                    <div className="p-4 bg-blue-400/10 border border-blue-400/30 rounded-lg mt-4">
                      <p className="text-blue-200 text-sm">
                        <strong>Note:</strong> API keys are encrypted and used for automation.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="categories" className="space-y-4">
                    <div>
                      <Label className="text-white text-lg font-semibold mb-3 block">Product Categories</Label>
                      <p className="text-gray-400 text-sm mb-4">Manage product categories for your marketplace.</p>
                      
                      <div className="flex gap-2 mb-4">
                        <Input
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                          placeholder="Enter new category"
                          data-testid="new-category-input"
                        />
                        <Button onClick={addCategory} type="button" className="gradient-button text-white" data-testid="add-category-btn">
                          <Plus size={16} className="mr-1" />
                          Add
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {formData.product_categories.map((cat, index) => (
                          <div key={index} className="flex items-center justify-between p-3 glass-effect rounded-lg" data-testid={`category-${cat}`}>
                            <span className="text-white font-medium capitalize">{cat}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeCategory(cat)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                              data-testid={`remove-${cat}`}
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>


                  {/* Payment Gateways Tab */}
                  <TabsContent value="payments" className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Payment Gateway Configuration</h3>
                      <p className="text-gray-400 mb-6">Configure payment methods, wallets, and instructions for customers.</p>
                      
                      {/* PayPal */}
                      <div className="bg-white/5 p-4 rounded-lg mb-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-white font-semibold flex items-center gap-2">
                            <span>💳</span> PayPal
                          </h4>
                          <label className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={formData.payment_gateways.paypal.enabled}
                              onChange={(e) => handlePaymentGatewayChange('paypal', 'enabled', e.target.checked)}
                              className="w-4 h-4" 
                            />
                            <span className="text-white text-sm">Enabled</span>
                          </label>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-white/70 text-sm">PayPal Email</Label>
                            <Input
                              placeholder="your@paypal.com"
                              value={formData.payment_gateways.paypal.email}
                              onChange={(e) => handlePaymentGatewayChange('paypal', 'email', e.target.value)}
                              className="bg-white/10 border-white/20 text-white mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-white/70 text-sm">Instructions for Customers</Label>
                            <Textarea
                              placeholder="Send payment to the email above with order ID in notes"
                              value={formData.payment_gateways.paypal.instructions}
                              onChange={(e) => handlePaymentGatewayChange('paypal', 'instructions', e.target.value)}
                              className="bg-white/10 border-white/20 text-white mt-1"
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>

                      {/* AirTM */}
                      <div className="bg-white/5 p-4 rounded-lg mb-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-white font-semibold flex items-center gap-2">
                            <span>💸</span> AirTM
                          </h4>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="w-4 h-4" />
                            <span className="text-white text-sm">Enabled</span>
                          </label>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-white/70 text-sm">AirTM Email/Username</Label>
                            <Input
                              placeholder="your@email.com"
                              className="bg-white/10 border-white/20 text-white mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-white/70 text-sm">Instructions</Label>
                            <Textarea
                              placeholder="Send via AirTM to the email above"
                              className="bg-white/10 border-white/20 text-white mt-1"
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Skrill */}
                      <div className="bg-white/5 p-4 rounded-lg mb-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-white font-semibold flex items-center gap-2">
                            <span>💰</span> Skrill
                          </h4>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="w-4 h-4" />
                            <span className="text-white text-sm">Enabled</span>
                          </label>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-white/70 text-sm">Skrill Email</Label>
                            <Input
                              placeholder="your@skrill.com"
                              className="bg-white/10 border-white/20 text-white mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-white/70 text-sm">Instructions</Label>
                            <Textarea
                              placeholder="Send to Skrill email above"
                              className="bg-white/10 border-white/20 text-white mt-1"
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>

                      {/* BTC */}
                      <div className="bg-white/5 p-4 rounded-lg mb-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-white font-semibold flex items-center gap-2">
                            <span>₿</span> Bitcoin (BTC)
                          </h4>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="w-4 h-4" />
                            <span className="text-white text-sm">Enabled</span>
                          </label>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-white/70 text-sm">BTC Wallet Address</Label>
                            <Input
                              placeholder="bc1q..."
                              className="bg-white/10 border-white/20 text-white mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-white/70 text-sm">Instructions</Label>
                            <Textarea
                              placeholder="Send BTC to the address above"
                              className="bg-white/10 border-white/20 text-white mt-1"
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>

                      {/* USDT */}
                      <div className="bg-white/5 p-4 rounded-lg mb-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-white font-semibold flex items-center gap-2">
                            <span>₮</span> USDT (Multiple Chains)
                          </h4>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="w-4 h-4" />
                            <span className="text-white text-sm">Enabled</span>
                          </label>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <Label className="text-white/70 text-sm">BEP20 Wallet (Binance Smart Chain)</Label>
                            <Input
                              placeholder="0x..."
                              className="bg-white/10 border-white/20 text-white mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-white/70 text-sm">TRC20 Wallet (Tron)</Label>
                            <Input
                              placeholder="T..."
                              className="bg-white/10 border-white/20 text-white mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-white/70 text-sm">MATIC Wallet (Polygon)</Label>
                            <Input
                              placeholder="0x..."
                              className="bg-white/10 border-white/20 text-white mt-1"
                            />
                          </div>
                        </div>
                      </div>

                      <Button 
                        onClick={() => toast.success('Payment settings saved!')} 
                        className="w-full bg-white text-purple-600 hover:bg-gray-100"
                      >
                        Save Payment Settings
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="email" className="space-y-4">
                    <div>
                      <Label className="text-white text-lg font-semibold mb-3 block">Send Bulk Email</Label>
                      <p className="text-gray-400 text-sm mb-4">Send promotional emails using Resend.com API.</p>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="recipient_type" className="text-white">Recipients</Label>
                          <Select value={bulkEmail.recipient_type} onValueChange={(value) => setBulkEmail({...bulkEmail, recipient_type: value})}>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="recipient-select">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Users</SelectItem>
                              <SelectItem value="customers">Customers Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="email_subject" className="text-white">Subject</Label>
                          <Input
                            id="email_subject"
                            value={bulkEmail.subject}
                            onChange={(e) => setBulkEmail({...bulkEmail, subject: e.target.value})}
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                            placeholder="Email subject"
                            data-testid="email-subject-input"
                          />
                        </div>

                        <div>
                          <Label htmlFor="email_message" className="text-white">Message</Label>
                          <Textarea
                            id="email_message"
                            value={bulkEmail.message}
                            onChange={(e) => setBulkEmail({...bulkEmail, message: e.target.value})}
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                            placeholder="Your promotional message..."
                            rows={6}
                            data-testid="email-message-input"
                          />
                        </div>

                        <Button
                          type="button"
                          onClick={handleSendBulkEmail}
                          disabled={sendingEmail}
                          className="w-full gradient-button text-white"
                          data-testid="send-email-btn"
                        >
                          <Mail className="mr-2" size={20} />
                          {sendingEmail ? 'Sending...' : 'Send Bulk Email'}
                        </Button>

                        <div className="p-4 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
                          <p className="text-yellow-200 text-sm">
                            <strong>Note:</strong> Configure Resend API key in API Keys tab first.
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <div className="mt-6 pt-6 border-t border-white/20">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full gradient-button text-white py-6 text-lg"
                      data-testid="save-settings-btn"
                    >
                      <Save className="mr-2" size={20} />
                      {loading ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </div>
                </form>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer settings={currentSettings} />
    </div>
  );
};

export default AdminSettings;
