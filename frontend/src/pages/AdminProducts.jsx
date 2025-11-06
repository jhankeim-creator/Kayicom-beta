import { useEffect, useState } from 'react';
import { axiosInstance } from '../App';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';

const AdminProducts = ({ user, logout, settings }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'giftcard',
    price: '',
    currency: 'USD',
    image_url: '',
    stock_available: true,
    delivery_type: 'automatic'
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await axiosInstance.get('/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Erè nan chajman pwodwi yo');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price)
      };

      if (editingProduct) {
        await axiosInstance.put(`/products/${editingProduct.id}`, data);
        toast.success('Pwodwi modifye avèk siksè');
      } else {
        await axiosInstance.post('/products', data);
        toast.success('Pwodwi ajoute avèk siksè');
      }

      setDialogOpen(false);
      resetForm();
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Erè nan sove pwodwi a');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price.toString(),
      currency: product.currency,
      image_url: product.image_url || '',
      stock_available: product.stock_available,
      delivery_type: product.delivery_type
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Ou si ou vle efase pwodwi sa a?')) return;

    try {
      await axiosInstance.delete(`/products/${id}`);
      toast.success('Pwodwi efase avèk siksè');
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Erè nan efase pwodwi a');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'giftcard',
      price: '',
      currency: 'USD',
      image_url: '',
      stock_available: true,
      delivery_type: 'automatic'
    });
    setEditingProduct(null);
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar user={user} logout={logout} cartItemCount={0} settings={settings} />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white" data-testid="products-title">Jere Pwodwi</h1>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-white text-purple-600 hover:bg-gray-100" data-testid="add-product-btn">
                  <Plus className="mr-2" size={20} />
                  Ajoute Pwodwi
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingProduct ? 'Modifye Pwodwi' : 'Ajoute Nouvo Pwodwi'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4" data-testid="product-form">
                  <div>
                    <Label htmlFor="name">Non Pwodwi</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      required
                      data-testid="product-name-input"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Deskripsyon</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      required
                      rows={4}
                      data-testid="product-description-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Kategori</Label>
                      <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
                        <SelectTrigger data-testid="product-category-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="giftcard">Gift Card</SelectItem>
                          <SelectItem value="topup">Game Topup</SelectItem>
                          <SelectItem value="subscription">Abònman</SelectItem>
                          <SelectItem value="service">Sèvis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="delivery_type">Tip Livrezon</Label>
                      <Select value={formData.delivery_type} onValueChange={(value) => handleChange('delivery_type', value)}>
                        <SelectTrigger data-testid="product-delivery-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="automatic">Otomatik</SelectItem>
                          <SelectItem value="manual">Manyel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Pri</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => handleChange('price', e.target.value)}
                        required
                        data-testid="product-price-input"
                      />
                    </div>

                    <div>
                      <Label htmlFor="currency">Monè</Label>
                      <Input
                        id="currency"
                        value={formData.currency}
                        onChange={(e) => handleChange('currency', e.target.value)}
                        required
                        data-testid="product-currency-input"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="image_url">Lyen Imaj (opsyonèl)</Label>
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => handleChange('image_url', e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      data-testid="product-image-input"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="stock_available"
                      checked={formData.stock_available}
                      onChange={(e) => handleChange('stock_available', e.target.checked)}
                      className="w-4 h-4"
                      data-testid="product-stock-checkbox"
                    />
                    <Label htmlFor="stock_available" className="cursor-pointer">Stòk disponib</Label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="flex-1" data-testid="submit-product-btn">
                      {editingProduct ? 'Modifye' : 'Ajoute'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} data-testid="cancel-btn">
                      Anile
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="text-center text-white text-xl py-12">Chajman...</div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="products-grid">
              {products.map((product) => (
                <Card key={product.id} className="glass-effect border-white/20" data-testid={`product-${product.id}`}>
                  <div className="h-48 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="text-white" size={64} />
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="text-lg font-bold text-white mb-2">{product.name}</h3>
                    <p className="text-white/70 text-sm mb-3 line-clamp-2">{product.description}</p>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xl font-bold text-white">${product.price}</span>
                      <span className={`text-xs px-2 py-1 rounded ${product.stock_available ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'}`}>
                        {product.stock_available ? 'Disponib' : 'Epize'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-white text-white hover:bg-white/10"
                        onClick={() => handleEdit(product)}
                        data-testid={`edit-product-${product.id}`}
                      >
                        <Edit size={16} className="mr-1" />
                        Modifye
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(product.id)}
                        data-testid={`delete-product-${product.id}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center text-white/70 py-12" data-testid="no-products">
              <Package className="mx-auto mb-4" size={64} />
              <p>Pa gen pwodwi ankò</p>
            </div>
          )}
        </div>
      </div>

      <Footer settings={settings} />
    </div>
  );
};

export default AdminProducts;
