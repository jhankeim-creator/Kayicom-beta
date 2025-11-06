# KayiCom - Platfòm E-Commerce pou Pwodwi Dijital

Yon platfòm konplè pou vann giftcards, topup game, abònman ak sèvis dijital ak livrezon otomatik.

## Karakteristik Prensipal

### Pou Kliyan
- **Katalòg Pwodwi**: Bwouze pwodwi pa kategori (Gift Cards, Game Topup, Abònman, Sèvis)
- **Panye Achte**: Sistèm panye konplè ak jesyon kantite
- **Peman Feksib**: 
  - Crypto otomatik ak Plisio (Bitcoin, Ethereum, etc.)
  - Peman manyèl ak soumisyon prev (bank transfer, lòt metòd)
- **Suivi Kòmand**: Track estatik kòmand ou an tan reyèl
- **Dashboard Kliyan**: Wè tout kòmand ou yo ak soumèt prev peman

### Pou Admin
- **Dashboard Konplè**: Estatistik an tan reyèl (total kòmand, pwodwi, kliyan, revèni)
- **Jesyon Pwodwi**: Ajoute, modifye, efase pwodwi ak imaj
- **Jesyon Kòmand**: Apwouve/rejte peman manyèl, make kòmand konplete
- **Paramèt Konfigurab**:
  - API keys (Plisio, MTCGame, GoSplit, Z2U, Resend)
  - Customization sit (logo, koulè, email sipò)
  - Tout bagay modifyab nan admin panel

## Teknoloji Itilize

**Backend:**
- FastAPI (Python)
- MongoDB
- Motor (MongoDB async driver)
- PassLib (hash password)
- Requests (pou API calls)

**Frontend:**
- React 19
- React Router
- Axios
- Shadcn/UI components
- Tailwind CSS
- Sonner (toast notifications)
- Lucide React (icons)

## Konfigirasyon

### 1. Admin Account
**Email**: admin@kayicom.com  
**Password**: admin123

**⚠️ ENPÒTAN**: Chanje password la apre premye login!

### 2. API Keys (opsyonèl)

Ale nan **Admin Panel > Paramèt > API Keys** pou konfigire:

- **Plisio API Key**: Pou peman crypto otomatik
  - Jwenn li nan: https://plisio.net
  - Nesesè pou crypto payments
  
- **MTCGame API Key**: Pou entegrasyon pwodwi MTCGame
- **GoSplit API Key**: Pou entegrasyon pwodwi GoSplit
- **Z2U API Key**: Pou entegrasyon pwodwi Z2U
- **Resend API Key**: Pou voye email notifikasyon

### 3. Customization

Nan **Admin Panel > Paramèt > Aparans**:
- Upload logo ou
- Chanje koulè prensipal ak segondè
- Konfigire email sipò

## Itilizasyon

### Pou Kliyan

1. **Kreyasyon Kont**: Klike sou "Kreye Kont" nan navigation
2. **Browse Pwodwi**: Eksplore pwodwi pa kategori
3. **Ajoute nan Panye**: Klike "Ajoute" sou nenpòt pwodwi
4. **Checkout**: 
   - Ale nan panye ou
   - Klike "Pase Kòmand"
   - Chwazi metòd peman (Crypto oswa Manyèl)
5. **Peman**:
   - **Crypto**: Ou ap redirekte pou complete peman (otomatik)
   - **Manyèl**: Soumèt prev peman ou ak ID tranzaksyon nan paj tracking
6. **Suivi**: Gade estatik kòmand ou nan "Kont Mwen" oswa ak link tracking

### Pou Admin

1. **Login**: Itilize admin@kayicom.com / admin123
2. **Dashboard**: Wè tout estatistik
3. **Jere Pwodwi**:
   - Klike "Jere Pwodwi"
   - Ajoute nouvo pwodwi ak bouton "+"
   - Edit oswa efase pwodwi egzistan
4. **Jere Kòmand**:
   - Revize kòmand ak peman an atant
   - Apwouve oswa rejte peman manyèl
   - Make kòmand konplete
5. **Paramèt**:
   - Konfigire API keys
   - Customize logo ak koulè
   - Ajiste enfo kontakt

## API Endpoints

### Auth
- `POST /api/auth/register` - Kreyasyon kont
- `POST /api/auth/login` - Login

### Products
- `GET /api/products` - Jwenn tout pwodwi
- `GET /api/products/{id}` - Jwenn yon pwodwi
- `POST /api/products` - Kreye pwodwi (admin)
- `PUT /api/products/{id}` - Modifye pwodwi (admin)
- `DELETE /api/products/{id}` - Efase pwodwi (admin)

### Orders
- `POST /api/orders` - Kreye kòmand
- `GET /api/orders` - Jwenn kòmand yo
- `GET /api/orders/{id}` - Jwenn yon kòmand
- `PUT /api/orders/{id}/status` - Update estatik kòmand

### Payments
- `POST /api/payments/manual-proof` - Soumèt prev peman manyèl
- `POST /api/payments/plisio-callback` - Webhook Plisio
- `GET /api/payments/plisio-status/{invoice_id}` - Check estatik peman Plisio

### Settings
- `GET /api/settings` - Jwenn paramèt sit
- `PUT /api/settings` - Update paramèt (admin)

### Stats
- `GET /api/stats/dashboard` - Jwenn estatistik dashboard

## Sample Products

Sit la gen 6 pwodwi sample:
1. iTunes Gift Card $25
2. Mobile Legends Diamond 100
3. Netflix Premium 1 Month
4. Verified PayPal Account
5. PUBG UC 600
6. Steam Gift Card $50

Ou ka modifye oswa efase yo epi ajoute pwodwi pa ou nan admin panel.

## Sekirite

- Password yo hash ak bcrypt
- CORS konfigirasyon pou sekirite
- API keys stoke nan database
- Validation input nan tout endpoints

## Sipò

Pou kesyon oswa sipò, kontakte: support@kayicom.com

---

**Kreye ak ❤️ ak Emergent AI**
