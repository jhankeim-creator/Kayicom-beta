import { Link } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Home, Package, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Navbar = ({ user, logout, cartItemCount, settings }) => {
  return (
    <nav className="sticky top-0 z-50 glass-effect shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2" data-testid="nav-logo">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="h-10 w-auto" />
            ) : (
              <h1 className="text-2xl font-bold text-white">{settings?.site_name || 'KayiCom'}</h1>
            )}
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-white hover:text-gray-200 transition" data-testid="nav-home">
              <Home className="inline mr-1" size={18} />Akèy
            </Link>
            <Link to="/products" className="text-white hover:text-gray-200 transition" data-testid="nav-products">
              <Package className="inline mr-1" size={18} />Pwodwi
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/cart" className="relative" data-testid="nav-cart">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                <ShoppingCart size={20} />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </Button>
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-white hover:bg-white/10" data-testid="user-menu">
                    <User size={20} />
                    <span className="ml-2 hidden md:inline">{user.full_name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {user.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer" data-testid="admin-link">
                        <Settings className="mr-2" size={16} />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer" data-testid="dashboard-link">
                      <User className="mr-2" size={16} />
                      Kont mwen
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="cursor-pointer" data-testid="logout-btn">
                    <LogOut className="mr-2" size={16} />
                    Dekonekte
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login">
                <Button variant="ghost" className="text-white hover:bg-white/10" data-testid="login-btn">
                  <User size={20} />
                  <span className="ml-2">Konekte</span>
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
