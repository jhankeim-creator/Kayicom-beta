import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { axiosInstance, LanguageContext } from '../App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

const LoginPage = ({ login, settings }) => {
  const { t } = useContext(LanguageContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      login(response.data);
      toast.success(t('loginSuccess'));
      navigate(response.data.role === 'admin' ? '/admin' : '/dashboard');
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

        <Card className="glass-effect border-white/10" data-testid="login-form">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-white">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="h-12 mx-auto mb-4" />
              ) : (
                <img src="/images/kayeecomlogo.png" alt="KayiCom" className="h-12 mx-auto mb-4" />
              )}
              {t('login')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-gray-300">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-gray-900/50 border-white/10 text-white placeholder:text-gray-500"
                  placeholder="••••••••"
                  data-testid="password-input"
                />
              </div>

              <Button
                type="submit"
                className="w-full gradient-button text-white"
                disabled={loading}
                data-testid="login-submit-btn"
              >
                {loading ? t('loading') : t('login')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-400">
                {t('dontHaveAccount')}{' '}
                <Link to="/register" className="text-cyan-400 font-semibold hover:underline" data-testid="register-link">
                  {t('register')}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
