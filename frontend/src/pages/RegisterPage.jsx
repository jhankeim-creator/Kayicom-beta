import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { axiosInstance } from '../App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

const RegisterPage = ({ login, settings }) => {
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
      toast.error('Mod pase yo pa menm');
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
      toast.success('Kont kreye avèk siksè!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erè nan kreyasyon kont');
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

        <Card className="glass-effect border-white/20" data-testid="register-form">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-white">
              {settings?.logo_url && <img src={settings.logo_url} alt="Logo" className="h-12 mx-auto mb-4" />}
              Kreye Kont sou {settings?.site_name || 'KayiCom'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="full_name" className="text-white">Non Konplè</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  placeholder="Non ou"
                  data-testid="fullname-input"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
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
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  placeholder="••••••••"
                  data-testid="password-input"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-white">Konfime Mod Pase</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  placeholder="••••••••"
                  data-testid="confirm-password-input"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-white text-purple-600 hover:bg-gray-100"
                disabled={loading}
                data-testid="register-submit-btn"
              >
                {loading ? 'Chajman...' : 'Kreye Kont'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-white/70">
                Ou gen kont deja?{' '}
                <Link to="/login" className="text-white font-semibold hover:underline" data-testid="login-link">
                  Konekte
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
