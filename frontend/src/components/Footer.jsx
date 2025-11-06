import { Mail, Phone } from 'lucide-react';

const Footer = ({ settings }) => {
  return (
    <footer className="glass-effect mt-20 py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-white">
          <div>
            <h3 className="text-xl font-bold mb-4">{settings?.site_name || 'KayiCom'}</h3>
            <p className="text-sm text-gray-200">
              Platfòm pou acho giftcard, topup game, abònman ak sèvis dijital.
            </p>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-4">Lyen Rapid</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/products" className="hover:text-gray-200">Pwodwi</a></li>
              <li><a href="/dashboard" className="hover:text-gray-200">Kont mwen</a></li>
              <li><a href="/" className="hover:text-gray-200">Sipò</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-4">Kontakte nou</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Mail size={16} />
                <span>{settings?.support_email || 'support@kayicom.com'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone size={16} />
                <span>24/7 Sipò Onliy</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-white/20 text-center text-sm text-gray-200">
          <p>&copy; {new Date().getFullYear()} {settings?.site_name || 'KayiCom'}. Tout dwa rezève.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
