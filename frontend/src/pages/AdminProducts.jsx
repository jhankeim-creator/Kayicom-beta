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
    requires_credentials: false,
    player_id_label: 'Player ID',
    credential_fields: ['email', 'password'],
    region: '',
    giftcard_category: '',
    is_subscription: false,
    variant_name: '',
    parent_product_id: null,
    is_variant: false
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showVariantMode, setShowVariantMode] = useState(false);
  const [parentProduct, setParentProduct] = useState(null);

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
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-detect requirements based on product name or category
      if (field === 'name' || field === 'category') {
        const { detectProductRequirements } = require('../utils/gameConfig');
        const requirements = detectProductRequirements(
          field === 'name' ? value : prev.name,
          field === 'category' ? value : prev.category
        );
        
        updated.requires_player_id = requirements.requiresPlayerId;
        updated.requires_credentials = requirements.requiresCredentials;
        updated.player_id_label = requirements.playerIdLabel || 'Player ID';
        updated.credential_fields = requirements.credentialFields || ['email', 'password'];
      }
      
      return updated;
    });
  };

  const uploadImage = async (file) => {
    if (!file) return null;
    // 5MB limit (matches other pages)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Max 5MB');
      return null;
    }

    setUploadingImage(true);
    try {
      const data = new FormData();
      data.append('file', file);
      const res = await axiosInstance.post('/upload/image', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data?.url || null;
    } catch (e) {
      console.error('Image upload failed:', e);
      toast.error('Error uploading image');
      return null;
    } finally {
      setUploadingImage(false);
    }
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
      giftcard_category: product.giftcard_category || '',
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
      giftcard_category: '',
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
              <Button className="bg-gradient-to-r from-pink-500 to-blue-500 text-white" data-testid="add-product-btn">
                <Plus size={20} className="mr-2" />
                Add New Product
              </Button>
            </DialogTrigger>
            
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white ml-2"
                onClick={() => setShowVariantMode(true)}
              >
                <Plus size={20} className="mr-2" />
                Add Product Variant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-white/20">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingProduct ? 'Edit Product' : (showVariantMode ? 'Add Product Variant' : 'Add New Product')}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Variant Mode: Select Parent Product */}
                {showVariantMode && !editingProduct && (
                  <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                    <Label className="text-white mb-2 block">Select Parent Product</Label>
                    <Select onValueChange={(value) => {
                      const parent = products.find(p => p.id === value);
                      setParentProduct(parent);
                      setFormData(prev => ({
                        ...prev,
                        parent_product_id: value,
                        is_variant: true,
                        name: parent?.name || '',
                        category: parent?.category || 'topup',
                        image_url: parent?.image_url || '',
                        requires_player_id: parent?.requires_player_id || false,
                        requires_credentials: parent?.requires_credentials || false
                      }));
                    }}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Choose parent product..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products.filter(p => !p.is_variant && !p.parent_product_id).map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.category})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {parentProduct && (
                      <p className="text-cyan-300 text-sm mt-2">
                        Creating variant for: <strong>{parentProduct.name}</strong>
                      </p>
                    )}
                  </div>
                )}
                
                <div>
                  <Label htmlFor="name" className="text-white">
                    {showVariantMode ? 'Product Name (inherited from parent)' : 'Name'}
                  </Label>
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

                {formData.category === 'giftcard' && (
                  <div>
                    <Label htmlFor="giftcard_category" className="text-white">Gift Card Category (Bitrefill style)</Label>
                    <Select value={formData.giftcard_category || ''} onValueChange={(value) => handleChange('giftcard_category', value)}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white mt-2">
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Shopping">Shopping</SelectItem>
                        <SelectItem value="Gaming">Gaming</SelectItem>
                        <SelectItem value="Entertainment">Entertainment</SelectItem>
                        <SelectItem value="Food">Food</SelectItem>
                        <SelectItem value="Travel">Travel</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="image_url" className="text-white">Image URL</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => handleChange('image_url', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="Or upload image below"
                  />
                </div>

                <div>
                  <Label htmlFor="image_file" className="text-white">Or Upload Image</Label>
                  <Input
                    id="image_file"
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      const url = await uploadImage(file);
                      if (url) {
                        handleChange('image_url', url);
                        toast.success('Image uploaded');
                      }
                    }}
                    className="bg-white/10 border-white/20 text-white cursor-pointer"
                    disabled={uploadingImage}
                  />
                  {uploadingImage && (
                    <p className="text-white/60 text-sm mt-2">Uploading...</p>
                  )}
                  {formData.image_url && (
                    <div className="mt-2">
                      <img src={formData.image_url} alt="Preview" className="w-32 h-32 object-cover rounded" />
                    </div>
                  )}
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

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          <Button
            onClick={() => setCategoryFilter('all')}
            className={categoryFilter === 'all' ? 'bg-pink-500' : 'bg-white/10'}
          >
            All ({products.length})
          </Button>
          {['giftcard', 'topup', 'subscription', 'service'].map(cat => {
            const count = products.filter(p => p.category === cat).length;
            return (
              <Button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={categoryFilter === cat ? 'bg-pink-500' : 'bg-white/10'}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)} ({count})
              </Button>
            );
          })}
        </div>

        {loading ? (
          <div className="text-center text-white text-xl py-12">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="products-list">
            {products
              .filter(product => categoryFilter === 'all' || product.category === categoryFilter)
              .map((product) => (
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
