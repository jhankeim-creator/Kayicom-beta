import { useContext } from 'react';
import { Mail, MessageCircle } from 'lucide-react';
import { LanguageContext } from '../App';

const Footer = ({ settings }) => {
  const { t } = useContext(LanguageContext);
  
  return (
    <footer className="glass-effect mt-20 py-8 border-t border-white/5">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-gray-300">
          <div>
            <h3 className="text-xl font-bold mb-4 gradient-text">{settings?.site_name || 'KayiCom'}</h3>
            <p className="text-sm text-gray-400">
              Platform for purchasing gift cards, game top-ups, subscriptions and digital services.
            </p>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-4 text-white">{t('quickLinks')}</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/products" className="hover:text-pink-400 transition">{t('products')}</a></li>
              <li><a href="/dashboard" className="hover:text-pink-400 transition">{t('myAccount')}</a></li>
              <li><a href="/" className="hover:text-pink-400 transition">{t('support')}</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-4 text-white">{t('contact')}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Mail size={16} className="text-pink-400" />
                <span>{settings?.support_email || 'support@kayicom.com'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MessageCircle size={16} className="text-pink-400" />
                <span>{t('support247')}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-white/10 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} {settings?.site_name || 'KayiCom'}. {t('allRightsReserved')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
