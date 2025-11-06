import { useContext } from 'react';
import { LanguageContext } from '../App';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { language, switchLanguage } = useContext(LanguageContext);

  return (
    <div className="lang-switcher" data-testid="language-switcher">
      <Globe size={18} className="text-gray-400" />
      <button
        onClick={() => switchLanguage('en')}
        className={`lang-button ${language === 'en' ? 'active' : ''}`}
        data-testid="lang-en"
      >
        EN
      </button>
      <button
        onClick={() => switchLanguage('fr')}
        className={`lang-button ${language === 'fr' ? 'active' : ''}`}
        data-testid="lang-fr"
      >
        FR
      </button>
    </div>
  );
};

export default LanguageSwitcher;
