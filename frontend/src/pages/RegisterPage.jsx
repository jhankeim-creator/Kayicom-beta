import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { axiosInstance, LanguageContext } from '../App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

const RegisterPage = ({ login, settings }) => {
  const { t } = useContext(LanguageContext);
  
  // Get referral code from URL
  const urlParams = new URLSearchParams(window.location.search);
  const referralCode = urlParams.get('ref');
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await axiosInstance.post('/auth/register', {
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password
      });

      // Auto login after registration
      const loginResponse = await axiosInstance.post('/auth/login', {
        email: formData.email,
        password: formData.password
      });
      
      login(loginResponse.data);
      toast.success(t('success'));
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center text-gray-400 hover:text-cyan-400 mb-6 transition" data-testid="back-home">
          <ArrowLeft className="mr-2" size={20} />
          {t('home')}
        </Link>

        <Card className="glass-effect border-white/10" data-testid="register-form">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-white">
              {settings?.logo_url && <img src={settings.logo_url} alt="Logo" className="h-12 mx-auto mb-4" />}
              {t('createAccount')} - {settings?.site_name || 'KayiCom'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="full_name" className="text-gray-300">{t('fullName')}</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  className="bg-gray-900/50 border-white/10 text-white placeholder:text-gray-500"
                  placeholder="John Doe"
                  data-testid="fullname-input"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-gray-300">{t('email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="bg-gray-900/50 border-white/10 text-white placeholder:text-gray-500"
                  placeholder="you@email.com"
                  data-testid="email-input"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-gray-300">{t('password')}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="bg-gray-900/50 border-white/10 text-white placeholder:text-gray-500"
                  placeholder="••••••••"
                  data-testid="password-input"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-gray-300">{t('confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="bg-gray-900/50 border-white/10 text-white placeholder:text-gray-500"
                  placeholder="••••••••"
                  data-testid="confirm-password-input"
                />
              </div>

              <Button
                type="submit"
                className="w-full gradient-button text-white"
                disabled={loading}
                data-testid="register-submit-btn"
              >
                {loading ? t('loading') : t('createAccount')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-400">
                {t('alreadyHaveAccount')}{' '}
                <Link to="/login" className="text-cyan-400 font-semibold hover:underline" data-testid="login-link">
                  {t('login')}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
