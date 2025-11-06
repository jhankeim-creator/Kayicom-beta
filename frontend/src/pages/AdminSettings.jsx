import { useState, useEffect } from 'react';
import { axiosInstance } from '../App';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Settings as SettingsIcon, Key, Palette, Package, Mail } from 'lucide-react';
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
    resend_api_key: ''
  });

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
        resend_api_key: currentSettings.resend_api_key || ''
      });
    }
  }, [currentSettings]);

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

                  {/* Appearance */}
                  <TabsContent value="appearance" className="space-y-4">
                    <div>
                      <Label htmlFor="primary_color" className="text-white">Koulè Primè</Label>
                      <div className="flex gap-3">
                        <Input
                          id="primary_color"
                          type="color"
                          value={formData.primary_color}
                          onChange={(e) => handleChange('primary_color', e.target.value)}
                          className="w-20 h-12 cursor-pointer"
                          data-testid="primary-color-input"
                        />
                        <Input
                          value={formData.primary_color}
                          onChange={(e) => handleChange('primary_color', e.target.value)}
                          className="flex-1 bg-white/10 border-white/20 text-white"
                          placeholder="#3b82f6"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="secondary_color" className="text-white">Koulè Segòndè</Label>
                      <div className="flex gap-3">
                        <Input
                          id="secondary_color"
                          type="color"
                          value={formData.secondary_color}
                          onChange={(e) => handleChange('secondary_color', e.target.value)}
                          className="w-20 h-12 cursor-pointer"
                          data-testid="secondary-color-input"
                        />
                        <Input
                          value={formData.secondary_color}
                          onChange={(e) => handleChange('secondary_color', e.target.value)}
                          className="flex-1 bg-white/10 border-white/20 text-white"
                          placeholder="#8b5cf6"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-400/10 border border-yellow-400/30 rounded-lg mt-4">
                      <p className="text-yellow-200 text-sm">
                        <strong>Nòt:</strong> Chanjman koulè yo ap aplike apre rechajman paj la.
                      </p>
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
