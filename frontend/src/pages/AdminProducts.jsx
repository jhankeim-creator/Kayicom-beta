import { useEffect, useState } from 'react';
import { axiosInstance } from '../App';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Package, Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const AdminProducts = ({ user, logout, settings }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'topup',
    price: '',
    image_url: '',
    stock_available: true,
    delivery_type: 'manual',
    requires_player_id: false,
    region: '',
    is_subscription: false,
    variant_name: ''
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
      toast.error('Error loading products');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price) {
      toast.error('Please fill required fields');
      return;
    }

    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price)
      };

      if (editingProduct) {
        await axiosInstance.put(`/products/${editingProduct.id}`, payload);
        toast.success('Product updated!');
      } else {
        await axiosInstance.post('/products', payload);
        toast.success('Product created!');
      }

      setDialogOpen(false);
      resetForm();
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Error saving product');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price.toString(),
      image_url: product.image_url || '',
      stock_available: product.stock_available,
      delivery_type: product.delivery_type,
      requires_player_id: product.requires_player_id || false,
      region: product.region || '',
      is_subscription: product.is_subscription || false,
      variant_name: product.variant_name || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Delete this product?')) return;

    try {
      await axiosInstance.delete(`/products/${productId}`);
      toast.success('Product deleted!');
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error deleting product');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'topup',
      price: '',
      image_url: '',
      stock_available: true,
      delivery_type: 'manual',
      requires_player_id: false,
      region: '',
      is_subscription: false,
      variant_name: ''
    });
    setEditingProduct(null);
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar user={user} logout={logout} cartItemCount={0} settings={settings} />

      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <div className="flex justify-between items-center w-full">
            <h1 className="text-4xl font-bold text-white" data-testid="products-title">Manage Products</h1>
            <Button 
              onClick={() => window.location.href = '/admin'}
              className="bg-gradient-to-r from-pink-500 to-blue-500 text-white px-6 py-3"
            >
              🏠 Admin Home
            </Button>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-white text-purple-600 hover:bg-gray-100" data-testid="add-product-btn">
                <Plus className="mr-2" size={20} />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-white/20">
              <DialogHeader>
                <DialogTitle className="text-white">{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name" className="text-white">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    data-testid="product-name"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-white">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category" className="text-white">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="product-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="topup">Top-Up</SelectItem>
                        <SelectItem value="giftcard">Gift Card</SelectItem>
                        <SelectItem value="subscription">Subscription</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="price" className="text-white">Price</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => handleChange('price', e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                      data-testid="product-price"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="variant_name" className="text-white">Variant Name (e.g., "100 Diamonds", "US $25")</Label>
                  <Input
                    id="variant_name"
                    value={formData.variant_name}
                    onChange={(e) => handleChange('variant_name', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <Label htmlFor="region" className="text-white">Region (for Gift Cards)</Label>
                  <Input
                    id="region"
                    value={formData.region}
                    onChange={(e) => handleChange('region', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="e.g., US, EU, ASIA"
                  />
                </div>

                <div>
                  <Label htmlFor="image_url" className="text-white">Image URL</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => handleChange('image_url', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="delivery_type" className="text-white">Delivery Type</Label>
                    <Select value={formData.delivery_type} onValueChange={(value) => handleChange('delivery_type', value)}>
                      <SelectTrigger data-testid="product-delivery-select" className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="automatic">Automatic</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 pt-8">
                    <Checkbox
                      id="stock"
                      checked={formData.stock_available}
                      onCheckedChange={(checked) => handleChange('stock_available', checked)}
                    />
                    <Label htmlFor="stock" className="text-white">In Stock</Label>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="requires_player_id"
                      checked={formData.requires_player_id}
                      onCheckedChange={(checked) => handleChange('requires_player_id', checked)}
                    />
                    <Label htmlFor="requires_player_id" className="text-white">Requires Player ID</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_subscription"
                      checked={formData.is_subscription}
                      onCheckedChange={(checked) => handleChange('is_subscription', checked)}
                    />
                    <Label htmlFor="is_subscription" className="text-white">Is Subscription (for referral)</Label>
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  className="w-full bg-white text-purple-600 hover:bg-gray-100"
                  data-testid="save-product-btn"
                >
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center text-white text-xl py-12">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="products-list">
            {products.map((product) => (
              <Card key={product.id} className="glass-effect border-white/20" data-testid={`product-${product.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-2">{product.name}</h3>
                      <p className="text-white/70 text-sm mb-2">{product.description}</p>
                      <div className="space-y-1 text-sm">
                        <p className="text-white/60">Category: <span className="text-white">{product.category}</span></p>
                        <p className="text-white/60">Price: <span className="text-white font-bold">${product.price}</span></p>
                        {product.variant_name && <p className="text-cyan-400 text-xs">Variant: {product.variant_name}</p>}
                        {product.region && <p className="text-pink-400 text-xs">Region: {product.region}</p>}
                        {product.requires_player_id && <p className="text-green-400 text-xs">✓ Requires Player ID</p>}
                        {product.is_subscription && <p className="text-yellow-400 text-xs">✓ Subscription Product</p>}
                      </div>
                    </div>
                    {product.image_url && (
                      <img src={product.image_url} alt={product.name} className="w-16 h-16 object-cover rounded ml-4" />
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(product)}
                      className="flex-1 border-white text-white hover:bg-white/10"
                      data-testid={`edit-${product.id}`}
                    >
                      <Edit2 size={14} className="mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(product.id)}
                      className="border-red-400 text-red-400 hover:bg-red-400/10"
                      data-testid={`delete-${product.id}`}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Footer settings={settings} />
    </div>
  );
};

export default AdminProducts;
