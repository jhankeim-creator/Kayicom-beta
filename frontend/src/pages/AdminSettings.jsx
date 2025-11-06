import { useState, useEffect } from 'react';\nimport { axiosInstance } from '../App';\nimport Navbar from '../components/Navbar';\nimport Footer from '../components/Footer';\nimport { Card, CardContent } from '@/components/ui/card';\nimport { Button } from '@/components/ui/button';\nimport { Input } from '@/components/ui/input';\nimport { Label } from '@/components/ui/label';\nimport { Textarea } from '@/components/ui/textarea';\nimport { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';\nimport {\n  Select,\n  SelectContent,\n  SelectItem,\n  SelectTrigger,\n  SelectValue,\n} from '@/components/ui/select';\nimport { Save, Settings as SettingsIcon, Key, Package, Mail, Plus, X } from 'lucide-react';\nimport { toast } from 'sonner';

const AdminSettings = ({ user, logout, settings: currentSettings, loadSettings }) => {
  const [loading, setLoading] = useState(false);\n  const [formData, setFormData] = useState({\n    site_name: '',\n    logo_url: '',\n    primary_color: '',\n    secondary_color: '',\n    support_email: '',\n    plisio_api_key: '',\n    mtcgame_api_key: '',\n    gosplit_api_key: '',\n    z2u_api_key: '',\n    resend_api_key: '',\n    product_categories: []\n  });\n  const [newCategory, setNewCategory] = useState('');\n  const [bulkEmail, setBulkEmail] = useState({\n    subject: '',\n    message: '',\n    recipient_type: 'all'\n  });\n  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {\n    if (currentSettings) {\n      setFormData({\n        site_name: currentSettings.site_name || '',\n        logo_url: currentSettings.logo_url || '',\n        primary_color: currentSettings.primary_color || '',\n        secondary_color: currentSettings.secondary_color || '',\n        support_email: currentSettings.support_email || '',\n        plisio_api_key: currentSettings.plisio_api_key || '',\n        mtcgame_api_key: currentSettings.mtcgame_api_key || '',\n        gosplit_api_key: currentSettings.gosplit_api_key || '',\n        z2u_api_key: currentSettings.z2u_api_key || '',\n        resend_api_key: currentSettings.resend_api_key || '',\n        product_categories: currentSettings.product_categories || ['giftcard', 'topup', 'subscription', 'service']\n      });\n    }\n  }, [currentSettings]);\n\n  const addCategory = () => {\n    if (newCategory && !formData.product_categories.includes(newCategory)) {\n      setFormData({...formData, product_categories: [...formData.product_categories, newCategory]});\n      setNewCategory('');\n    }\n  };\n\n  const removeCategory = (cat) => {\n    setFormData({...formData, product_categories: formData.product_categories.filter(c => c !== cat)});\n  };\n\n  const handleSendBulkEmail = async () => {\n    if (!bulkEmail.subject || !bulkEmail.message) {\n      toast.error('Please fill in subject and message');\n      return;\n    }\n\n    setSendingEmail(true);\n    try {\n      const response = await axiosInstance.post('/emails/bulk-send', bulkEmail);\n      toast.success(`Email sent to ${response.data.sent_count} recipients!`);\n      setBulkEmail({subject: '', message: '', recipient_type: 'all'});\n    } catch (error) {\n      toast.error(error.response?.data?.detail || 'Error sending bulk email');\n    } finally {\n      setSendingEmail(false);\n    }\n  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Only send non-empty fields
      const updates = {};
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '') {
          updates[key] = formData[key];
        }
      });

      await axiosInstance.put('/settings', updates);
      toast.success('Paramèt sove avèk siksè!');
      await loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erè nan sove paramèt yo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar user={user} logout={logout} cartItemCount={0} settings={currentSettings} />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-12" data-testid="settings-title">Paramèt Sit</h1>

          <Card className="glass-effect border-white/20">
            <CardContent className="p-6">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-6">
                  <TabsTrigger value="general" data-testid="tab-general">
                    <SettingsIcon size={16} className="mr-2" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="api" data-testid="tab-api">
                    <Key size={16} className="mr-2" />
                    API Keys
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
                  {/* General Settings */}
                  <TabsContent value="general" className="space-y-4">
                    <div>
                      <Label htmlFor="site_name" className="text-white">Non Sit</Label>
                      <Input
                        id="site_name"
                        value={formData.site_name}
                        onChange={(e) => handleChange('site_name', e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        data-testid="site-name-input"
                      />
                    </div>

                    <div>
                      <Label htmlFor="support_email" className="text-white">Email Sipò</Label>
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
                      <Label htmlFor="logo_url" className="text-white">Lyen Logo</Label>
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

                  {/* API Keys */}
                  <TabsContent value="api" className="space-y-4">
                    <div>
                      <Label htmlFor="plisio_api_key" className="text-white">Plisio API Key (Crypto Peman)</Label>
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
                      <Label htmlFor="mtcgame_api_key" className="text-white">MTCGame API Key</Label>
                      <Input
                        id="mtcgame_api_key"
                        type="password"
                        value={formData.mtcgame_api_key}
                        onChange={(e) => handleChange('mtcgame_api_key', e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        placeholder="••••••••"
                        data-testid="mtcgame-key-input"
                      />
                    </div>

                    <div>
                      <Label htmlFor="gosplit_api_key" className="text-white">GoSplit API Key</Label>
                      <Input
                        id="gosplit_api_key"
                        type="password"
                        value={formData.gosplit_api_key}
                        onChange={(e) => handleChange('gosplit_api_key', e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        placeholder="••••••••"
                        data-testid="gosplit-key-input"
                      />
                    </div>

                    <div>
                      <Label htmlFor="z2u_api_key" className="text-white">Z2U API Key</Label>
                      <Input
                        id="z2u_api_key"
                        type="password"
                        value={formData.z2u_api_key}
                        onChange={(e) => handleChange('z2u_api_key', e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        placeholder="••••••••"
                        data-testid="z2u-key-input"
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
                        <strong>Nòt:</strong> API keys yo sekirize e yo ap itilize pou otomatizasyon livrezon ak peman.
                      </p>
                    </div>
                  </TabsContent>

                  {/* Categories Management */}
                  <TabsContent value="categories" className="space-y-4">
                    <div>
                      <Label className="text-white text-lg font-semibold mb-3 block">Product Categories</Label>
                      <p className="text-gray-400 text-sm mb-4">Manage product categories for your marketplace. These categories will appear in navigation and filters.</p>
                      
                      <div className="flex gap-2 mb-4">
                        <Input
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                          placeholder="Enter new category name"
                          data-testid="new-category-input"
                        />
                        <Button onClick={addCategory} className="gradient-button text-white" data-testid="add-category-btn">
                          <Plus size={16} className="mr-1" />
                          Add
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {formData.product_categories.map((cat, index) => (
                          <div key={index} className="flex items-center justify-between p-3 glass-effect rounded-lg" data-testid={`category-${cat}`}>
                            <span className="text-white font-medium capitalize">{cat}</span>
                            <Button
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

                      <div className="p-4 bg-blue-400/10 border border-blue-400/30 rounded-lg mt-4">
                        <p className="text-blue-200 text-sm">
                          <strong>Note:</strong> Changes to categories will be reflected after saving settings.
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Bulk Email */}
                  <TabsContent value="email" className="space-y-4">
                    <div>
                      <Label className="text-white text-lg font-semibold mb-3 block">Send Bulk Email</Label>
                      <p className="text-gray-400 text-sm mb-4">Send promotional emails to your customers using Resend.com API.</p>
                      
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
                            placeholder="Email subject line"
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
                            <strong>Note:</strong> Make sure Resend API key is configured in API Keys tab before sending emails.
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <div className="mt-6 pt-6 border-t border-white/20">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-white text-purple-600 hover:bg-gray-100 py-6 text-lg"
                      data-testid="save-settings-btn"
                    >
                      <Save className="mr-2" size={20} />
                      {loading ? 'Sove...' : 'Sove Paramèt'}
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
