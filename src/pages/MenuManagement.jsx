import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, ChefHat, Calendar, ToggleLeft, ToggleRight, Beef, Salad, GlassWater, Blend } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

const CATEGORIES = ['meat', 'salad', 'drink', 'smoothie'];
const CATEGORY_ICON_COMPONENTS = { meat: Beef, salad: Salad, drink: GlassWater, smoothie: Blend };
const CATEGORY_ICONS = { meat: '🥩', salad: '🥗', drink: '🥤', smoothie: '🍹' };
const CATEGORY_COLORS = {
  meat: 'bg-orange-100 text-orange-700 border-orange-200',
  salad: 'bg-green-100 text-green-700 border-green-200',
  drink: 'bg-blue-100 text-blue-700 border-blue-200',
  smoothie: 'bg-purple-100 text-purple-700 border-purple-200',
};

const emptyForm = { name: '', description: '', category: 'meat', price: '', image_url: '', calories: '', allergens: '', is_active: true, menu_date: format(new Date(), 'yyyy-MM-dd'), city: '' };

export default function MenuManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const all = await base44.entities.MenuItem.filter({ menu_date: filterDate });
    setItems(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterDate]);

  const openCreate = () => { setForm(emptyForm); setEditing(null); setShowForm(true); };
  const openEdit = (item) => { setForm({ ...item, price: String(item.price), calories: String(item.calories || '') }); setEditing(item.id); setShowForm(true); };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, price: parseFloat(form.price), calories: form.calories ? parseInt(form.calories) : null };
    if (editing) await base44.entities.MenuItem.update(editing, data);
    else await base44.entities.MenuItem.create(data);
    await load();
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this menu item?')) return;
    await base44.entities.MenuItem.delete(id);
    await load();
  };

  const toggleActive = async (item) => {
    await base44.entities.MenuItem.update(item.id, { is_active: !item.is_active });
    await load();
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ChefHat className="w-5 h-5 text-primary" />
            <h1 className="font-playfair text-2xl font-bold text-foreground">Daily Menu</h1>
          </div>
          <p className="text-muted-foreground text-sm">Manage your rotating 4-item daily menu</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-secondary px-3 py-2 rounded-lg">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="bg-transparent text-sm outline-none text-foreground"
            />
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map(cat => {
            const count = items.filter(i => i.category === cat).length;
            const CatIcon = CATEGORY_ICON_COMPONENTS[cat];
            return (
              <div key={cat} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${count > 0 ? CATEGORY_COLORS[cat] : 'bg-muted text-muted-foreground border-border'}`}>
                <CatIcon className="w-3 h-3" /> {cat.charAt(0).toUpperCase() + cat.slice(1)} {count > 0 ? '✓' : '—'}
              </div>
            );
          })}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
          <div className="text-4xl mb-3">🍽️</div>
          <p className="font-semibold text-foreground mb-1">No items for this date</p>
          <p className="text-muted-foreground text-sm mb-4">Add up to 4 items — one per category</p>
          <Button onClick={openCreate} variant="outline" className="gap-2"><Plus className="w-4 h-4" /> Add first item</Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map(item => (
            <div key={item.id} className={`bg-card border rounded-2xl overflow-hidden shadow-sm transition-all ${!item.is_active ? 'opacity-60' : ''}`}>
              <div className="flex gap-3 p-4">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-xl flex-shrink-0" />
                ) : (
                  <div className="w-20 h-20 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0">
                    {(() => { const CatIcon = CATEGORY_ICON_COMPONENTS[item.category]; return <CatIcon className="w-7 h-7 text-muted-foreground" />; })()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">{item.name}</h3>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full border mt-1 ${CATEGORY_COLORS[item.category]}`}>
                        {item.category}
                      </span>
                    </div>
                    <span className="font-bold text-primary">${item.price?.toFixed(2)}</span>
                  </div>
                  {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description}</p>}
                  {item.calories && <p className="text-xs text-muted-foreground">{item.calories} cal</p>}
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-secondary/30">
                <button onClick={() => toggleActive(item)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {item.is_active ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4" />}
                  {item.is_active ? 'Active' : 'Inactive'}
                </button>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
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
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="font-playfair text-xl font-bold mb-5">{editing ? 'Edit Item' : 'Add Menu Item'}</h2>
            <div className="space-y-3">
              <Input placeholder="Item name *" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} />
              <Textarea placeholder="Description" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={2} className="resize-none" />
              <Select value={form.category} onValueChange={v => setForm(p => ({...p, category: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Price ($) *" type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(p => ({...p, price: e.target.value}))} />
                <Input placeholder="Calories" type="number" value={form.calories} onChange={e => setForm(p => ({...p, calories: e.target.value}))} />
              </div>
              <Input placeholder="Image URL" value={form.image_url} onChange={e => setForm(p => ({...p, image_url: e.target.value}))} />
              <Input placeholder="Allergens" value={form.allergens} onChange={e => setForm(p => ({...p, allergens: e.target.value}))} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Menu Date *</label>
                  <input type="date" value={form.menu_date} onChange={e => setForm(p => ({...p, menu_date: e.target.value}))} className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <Input placeholder="City" value={form.city} onChange={e => setForm(p => ({...p, city: e.target.value}))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving || !form.name || !form.price}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Item'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}