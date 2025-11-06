import { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { axiosInstance, LanguageContext } from '../App';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Gift, Gamepad2, Tv, Wrench, ArrowRight, Zap, Shield, MessageCircle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const NewHomePage = ({ user, logout, cart, settings }) => {
  const { t } = useContext(LanguageContext);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeaturedProducts();
  }, []);

  const loadFeaturedProducts = async () => {
    try {
      const response = await axiosInstance.get('/products');
      setFeaturedProducts(response.data.slice(0, 6));
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Error loading products');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { 
      name: t('giftCards'), 
      icon: Gift, 
      path: '/products/giftcard', 
      gradient: 'from-pink-500 to-rose-500',
      description: t('giftCardsDesc')
    },
    { 
      name: t('gameTopup'), 
      icon: Gamepad2, 
      path: '/products/topup', 
      gradient: 'from-cyan-500 to-blue-500',
      description: t('gameTopupDesc')
    },
    { 
      name: t('subscriptions'), 
      icon: Tv, 
      path: '/products/subscription', 
      gradient: 'from-purple-500 to-indigo-500',
      description: t('subscriptionsDesc')
    },
    { 
      name: t('services'), 
      icon: Wrench, 
      path: '/products/service', 
      gradient: 'from-green-500 to-emerald-500',
      description: t('servicesDesc')
    },
  ];

  const features = [
    { icon: Zap, title: t('instantDelivery'), gradient: 'from-yellow-500 to-orange-500' },
    { icon: Shield, title: t('securePayment'), gradient: 'from-green-500 to-emerald-500' },
    { icon: MessageCircle, title: t('support247'), gradient: 'from-blue-500 to-cyan-500' },
    { icon: DollarSign, title: t('competitivePrice'), gradient: 'from-purple-500 to-pink-500' },
  ];

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar user={user} logout={logout} cartItemCount={cartItemCount} settings={settings} />

      {/* Hero Section */}
      <div className="relative container mx-auto px-4 py-20 lg:py-32" data-testid="hero-section">
        <div className="text-center max-w-4xl mx-auto relative z-10">
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            {t('heroTitle').split('#1').map((part, i) => 
              i === 0 ? (
                <span key={i}>{part}<span className="gradient-text">#1</span></span>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-3xl mx-auto">
            {t('heroSubtitle')}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/products">
              <Button size="lg" className="gradient-button text-white px-8 py-6 text-lg" data-testid="browse-products-btn">
                {t('exploreProducts')} <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
            {!user && (
              <Link to="/register">
                <Button size="lg" variant="outline" className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 px-8 py-6 text-lg" data-testid="register-btn">
                  {t('getStarted')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="text-center" data-testid={`feature-${index}`}>
                <div className={`feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-gradient-to-br ${feature.gradient}`}>
                  <Icon size={32} className="text-white" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-white">{feature.title}</h3>
              </div>
            );
          })}
        </div>
      </div>

      {/* What We Offer Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">{t('whatWeOffer')}</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">{t('offerSubtitle')}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Link to={category.path} key={category.name}>
                <Card className="category-card bg-gray-900/50 backdrop-blur-lg overflow-hidden group" data-testid={`category-${category.name.toLowerCase().replace(' ', '-')}`}>
                  <CardContent className="p-8">
                    <div className="flex items-start gap-6">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${category.gradient} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                        <Icon size={32} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">{category.name}</h3>
                        <p className="text-gray-400">{category.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Featured Products */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center mb-12">{t('featuredProducts')}</h2>
        {loading ? (
          <div className="text-center text-gray-400 text-xl">{t('loading')}</div>
        ) : featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((product) => (
              <Link to={`/product/${product.id}`} key={product.id}>
                <Card className="product-card overflow-hidden" data-testid={`product-card-${product.id}`}>
                  <div className="h-48 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Gift className="text-gray-600" size={64} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 to-transparent" />
                  </div>
                  <CardContent className="p-6 bg-gray-900/50">
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{product.name}</h3>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold gradient-text">${product.price}</span>
                      <Button size="sm" className="gradient-button text-white" data-testid={`buy-btn-${product.id}`}>
                        {t('buyNow')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 text-xl">No products available</div>
        )}
      </div>

      {/* Ready to Start CTA */}
      <div className="container mx-auto px-4 py-20">
        <Card className="glass-effect border-cyan-500/30 overflow-hidden">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">{t('readyToStart')}</h2>
            <Link to="/products">
              <Button size="lg" className="gradient-button text-white px-12 py-6 text-lg">
                {t('exploreProducts')} <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Footer settings={settings} />
    </div>
  );
};

export default NewHomePage;
