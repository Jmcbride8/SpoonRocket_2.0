import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ChefHat, Plus, Pencil, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const CATEGORIES = ['meat', 'salad', 'drink', 'smoothie'];
const CATEGORY_ICONS = { meat: '🥩', salad: '🥗', drink: '🥤', smoothie: '🍹' };
const CATEGORY_COLORS = {
  meat: 'bg-orange-100 text-orange-700',
  salad: 'bg-green-100 text-green-700',
  drink: 'bg-blue-100 text-blue-700',
  smoothie: 'bg-purple-100 text-purple-700',
};

const emptyForm = {
  name: '',
  description: '',
  category: 'meat',
  price: '',
  cogs: '',
  calories: '',
  allergens: '',
  image_url: '',
};

export default function MenuItemLibrary() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    // Get all unique recipes (grouped by name + category to avoid duplicates)
    const allItems = await base44.entities.MenuItem.list('-updated_date', 500);
    const uniqueByKey = new Map();
    allItems.forEach(item => {
      const key = `${item.name}-${item.category}`;
      if (!uniqueByKey.has(key)) uniqueByKey.set(key, item);
    });
    setItems(Array.from(uniqueByKey.values()));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setEditing(null); setShowForm(true); };
  const openEdit = (item) => {
    setForm({
      name: item.name,
      description: item.description,
      category: item.category,
      price: String(item.price),
      cogs: String(item.cogs || ''),
      calories: String(item.calories || ''),
      allergens: item.allergens,
      image_url: item.image_url,
    });
    setEditing(item.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.category) return;
    const data = {
      ...form,
      price: parseFloat(form.price),
      cogs: form.cogs ? parseFloat(form.cogs) : null,
      calories: form.calories ? parseInt(form.calories) : null,
      is_active: true,
      menu_date: new Date().toISOString().split('T')[0],
    };
    
    if (editing) {
      await base44.entities.MenuItem.update(editing, data);
    } else {
      await base44.entities.MenuItem.create(data);
    }
    
    await load();
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this recipe?')) return;
    await base44.entities.MenuItem.delete(id);
    await load();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(p => ({...p, image_url: file_url}));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto bg-background">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ChefHat className="w-5 h-5 text-foreground" />
            <h1 className="font-sans text-2xl font-bold text-foreground">Recipe Library</h1>
          </div>
          <p className="text-foreground/60 text-sm">Create and manage reusable menu items</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-foreground text-background hover:bg-foreground/90">
          <Plus className="w-4 h-4" /> New Recipe
        </Button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-foreground/5 rounded-2xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-foreground/10 rounded-2xl">
          <ChefHat className="w-10 h-10 text-foreground/60 mx-auto mb-3" />
          <p className="font-semibold text-foreground mb-1">No recipes yet</p>
          <p className="text-foreground/60 text-sm mb-4">Build your recipe library to reuse on your menu</p>
          <Button onClick={openCreate} variant="outline" className="gap-2 border-foreground/20 text-foreground hover:bg-foreground/5">
            <Plus className="w-4 h-4" /> Create First Recipe
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-background border border-foreground/10 rounded-2xl overflow-hidden hover:shadow-lg transition-all">
              {/* Image */}
              <div className="relative h-32 bg-foreground/5 overflow-hidden flex items-center justify-center">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-3xl">{CATEGORY_ICONS[item.category]}</div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-foreground text-sm line-clamp-2">{item.name}</h3>
                  <div className="text-right">
                    <p className="font-bold text-primary whitespace-nowrap">${item.price?.toFixed(2)}</p>
                    {item.cogs && (
                      <p className="text-xs text-foreground/60">COGS: ${item.cogs?.toFixed(2)}</p>
                    )}
                  </div>
                </div>

                <Badge className={`text-xs ${CATEGORY_COLORS[item.category]} border-0 mb-2`}>
                  {item.category}
                </Badge>

                {item.description && (
                  <p className="text-xs text-foreground/60 line-clamp-2 mb-2">{item.description}</p>
                )}

                {item.calories && (
                  <p className="text-xs text-foreground/60 mb-3">{item.calories} cal</p>
                )}

                {item.allergens && (
                  <p className="text-xs text-foreground/60 mb-3">⚠️ {item.allergens}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(item)}
                    className="flex-1 flex items-center justify-center gap-1 p-1.5 rounded-lg bg-foreground/10 hover:bg-foreground/20 transition-colors text-foreground text-xs font-medium"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex-1 flex items-center justify-center gap-1 p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors text-destructive text-xs font-medium"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-background w-full max-w-md rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto border border-foreground/10" onClick={e => e.stopPropagation()}>
            <h2 className="font-sans text-xl font-bold mb-5 text-foreground">{editing ? 'Edit Recipe' : 'New Recipe'}</h2>
            
            <div className="space-y-3">
              {/* Image Upload */}
              <div>
                <label className="text-xs text-foreground/60 mb-2 block">Image</label>
                {form.image_url ? (
                  <div className="relative group inline-block mb-3">
                    <img src={form.image_url} alt="preview" className="w-24 h-24 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => setForm(p => ({...p, image_url: ''}))}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 w-24 h-24 border-2 border-dashed border-foreground/20 rounded-lg cursor-pointer hover:bg-foreground/5 transition-colors">
                    <Upload className="w-4 h-4 text-foreground/60" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                )}
                <p className="text-xs text-foreground/60 mt-1">{uploading ? 'Uploading...' : 'JPG, PNG'}</p>
              </div>

              <Input
                placeholder="Recipe name *"
                value={form.name}
                onChange={e => setForm(p => ({...p, name: e.target.value}))}
                className="bg-foreground/3 border-foreground/10 text-foreground placeholder-foreground/40"
              />

              <Textarea
                placeholder="Description"
                value={form.description}
                onChange={e => setForm(p => ({...p, description: e.target.value}))}
                rows={2}
                className="resize-none bg-foreground/3 border-foreground/10 text-foreground placeholder-foreground/40"
              />

              <Select value={form.category} onValueChange={v => setForm(p => ({...p, category: v}))}>
                <SelectTrigger className="bg-foreground/3 border-foreground/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Price ($) *"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={e => setForm(p => ({...p, price: e.target.value}))}
                  className="bg-foreground/3 border-foreground/10 text-foreground placeholder-foreground/40"
                />
                <Input
                  placeholder="COGS ($)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cogs}
                  onChange={e => setForm(p => ({...p, cogs: e.target.value}))}
                  className="bg-foreground/3 border-foreground/10 text-foreground placeholder-foreground/40"
                />
              </div>

              <Input
                placeholder="Calories"
                type="number"
                value={form.calories}
                onChange={e => setForm(p => ({...p, calories: e.target.value}))}
                className="bg-foreground/3 border-foreground/10 text-foreground placeholder-foreground/40"
              />

              <Input
                placeholder="Allergens (e.g., nuts, dairy)"
                value={form.allergens}
                onChange={e => setForm(p => ({...p, allergens: e.target.value}))}
                className="bg-foreground/3 border-foreground/10 text-foreground placeholder-foreground/40"
              />
            </div>

            <div className="flex gap-3 mt-5">
              <Button
                variant="outline"
                className="flex-1 border-foreground/20 text-foreground hover:bg-foreground/5"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-foreground text-background hover:bg-foreground/90"
                onClick={handleSave}
                disabled={!form.name || !form.price}
              >
                {editing ? 'Save Changes' : 'Create Recipe'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}