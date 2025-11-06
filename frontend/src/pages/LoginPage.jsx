import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { axiosInstance } from '../App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

const LoginPage = ({ login, settings }) => {
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
      toast.success('Konekte avèk siksè!');
      navigate(response.data.role === 'admin' ? '/admin' : '/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erè nan koneksyon');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center text-white mb-6 hover:underline" data-testid="back-home">
          <ArrowLeft className="mr-2" size={20} />
          Retounen Akèy
        </Link>

        <Card className="glass-effect border-white/20" data-testid="login-form">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-white">
              {settings?.logo_url && <img src={settings.logo_url} alt="Logo" className="h-12 mx-auto mb-4" />}
              Konekte sou {settings?.site_name || 'KayiCom'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  placeholder="ou@email.com"
                  data-testid="email-input"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-white">Mod Pase</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  placeholder="••••••••"
                  data-testid="password-input"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-white text-purple-600 hover:bg-gray-100"
                disabled={loading}
                data-testid="login-submit-btn"
              >
                {loading ? 'Chajman...' : 'Konekte'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-white/70">
                Ou pa gen kont?{' '}
                <Link to="/register" className="text-white font-semibold hover:underline" data-testid="register-link">
                  Kreye youn
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
