import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Home, Package, Settings, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import LanguageSwitcher from './LanguageSwitcher';
import { LanguageContext } from '../App';

const Navbar = ({ user, logout, cartItemCount, settings }) => {
  const { t } = useContext(LanguageContext);

  return (
    <nav className="sticky top-0 z-50 shadow-lg border-b border-orange-500/20" style={{ background: 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 50%, #ffa845 100%)' }}>
      <div className="w-full max-w-[1400px] mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2" data-testid="nav-logo">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="h-12 w-auto" />
            ) : (
              <h1 className="text-2xl font-bold text-white drop-shadow-lg">{settings?.site_name || 'KayiCom'}</h1>
            )}
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8 text-base">
            <Link to="/" className="text-white font-medium hover:text-yellow-200 transition drop-shadow" data-testid="nav-home">
              Home
            </Link>
            <Link to="/products" className="text-white font-medium hover:text-yellow-200 transition drop-shadow" data-testid="nav-products">
              Products
            </Link>
            <Link 
              to="/crypto" 
              className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-white font-bold hover:bg-white/30 transition shadow-lg border border-white/30"
              data-testid="nav-crypto"
            >
              💱 Crypto Exchange
            </Link>
          </div>
          
          {/* Mobile Menu */}
          <div className="flex md:hidden items-center gap-2">
            <Link to="/products" className="text-white hover:text-yellow-200 p-2">
              <Package size={20} />
            </Link>
            <Link 
              to="/crypto" 
              className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg text-white font-bold text-sm border border-white/30"
            >
              💱
            </Link>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            <LanguageSwitcher />
            
            <Link to="/cart" className="relative" data-testid="nav-cart">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 hover:text-yellow-200">
                <ShoppingCart size={20} />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg">
                    {cartItemCount}
                  </span>
                )}
              </Button>
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 hover:text-yellow-200" data-testid="user-menu">
                    <User size={20} />
                    <span className="ml-2 hidden lg:inline">{user.full_name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-gray-900 border-white/10">
                  {user.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer text-gray-300 hover:text-pink-400" data-testid="admin-link">
                        <Settings className="mr-2" size={16} />
                        {t('adminPanel')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer text-gray-300 hover:text-pink-400" data-testid="dashboard-link">
                      <User className="mr-2" size={16} />
                      {t('myAccount')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/referral" className="cursor-pointer text-gray-300 hover:text-pink-400">
                      👥 Referral
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/withdraw" className="cursor-pointer text-gray-300 hover:text-pink-400">
                      💰 Withdraw
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-gray-300 hover:text-pink-400" data-testid="logout-btn">
                    <LogOut className="mr-2" size={16} />
                    {t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 hover:text-yellow-200" data-testid="login-btn">
                  <User size={20} />
                  <span className="ml-2 hidden md:inline">{t('login')}</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;