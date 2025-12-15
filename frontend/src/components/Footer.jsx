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
        
        {/* Trustpilot Link */}
        {settings?.trustpilot_enabled && settings?.trustpilot_business_id && (
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <h3 className="text-xl font-bold mb-4 text-white">Customer Reviews</h3>
            <p className="text-gray-400 mb-6">See what our customers are saying about us</p>
            <a 
              href={`https://fr.trustpilot.com/review/${settings.trustpilot_business_id}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-pink-500 to-blue-500 text-white font-semibold rounded-lg hover:from-pink-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span>View Our Trustpilot Reviews</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        )}
        
        <div className="mt-8 pt-6 border-t border-white/10 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} {settings?.site_name || 'KayiCom'}. {t('allRightsReserved')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
