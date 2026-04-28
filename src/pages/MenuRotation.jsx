import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Calendar, Plus, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, addDays, startOfYear, endOfYear } from 'date-fns';

const CATEGORIES = ['meat', 'salad', 'drink', 'smoothie'];

export default function MenuRotation() {
  const [rotations, setRotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'meat',
    price: '',
    calories: '',
    image_url: '',
  });

  const load = async () => {
    setLoading(true);
    const yearStart = format(startOfYear(new Date()), 'yyyy-MM-dd');
    const yearEnd = format(endOfYear(new Date()), 'yyyy-MM-dd');
    const items = await base44.entities.MenuItem.filter({ is_active: true });
    setRotations(items);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreateRotation = async () => {
    if (!formData.name || !formData.price || !selectedDate) return;
    await base44.entities.MenuItem.create({
      ...formData,
      price: parseFloat(formData.price),
      calories: formData.calories ? parseInt(formData.calories) : null,
      menu_date: selectedDate,
      city: 'San Francisco',
      is_active: true,
    });
    setFormData({ name: '', description: '', category: 'meat', price: '', calories: '', image_url: '' });
    setShowModal(false);
    await load();
  };

  const handleDeleteRotation = async (id) => {
    if (!confirm('Delete this menu item?')) return;
    await base44.entities.MenuItem.delete(id);
    await load();
  };

  // Group by date for display
  const rotationsByDate = rotations.reduce((acc, item) => {
    const date = item.menu_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  const sortedDates = Object.keys(rotationsByDate).sort();

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto bg-background">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-sans text-2xl font-bold text-foreground mb-1">Menu Rotation</h1>
          <p className="text-foreground/60 text-sm">Set up a menu rotation for each day of the year</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2 bg-foreground text-background hover:bg-foreground/90">
          <Plus className="w-4 h-4" /> Add Menu Item
        </Button>
      </div>

      {/* Menu Calendar */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-foreground/30 border-t-foreground rounded-full animate-spin mx-auto" />
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="text-center py-12 bg-background border border-foreground/10 rounded-2xl">
            <Calendar className="w-10 h-10 text-foreground/60 mx-auto mb-3" />
            <p className="font-semibold text-foreground">No menu items configured</p>
            <p className="text-foreground/60 text-sm">Start by adding items to build your rotation</p>
          </div>
        ) : (
          sortedDates.map(date => (
            <div key={date} className="bg-background border border-foreground/10 rounded-2xl p-6">
              <h3 className="font-semibold text-foreground mb-4">{format(new Date(date), 'EEEE, MMMM d, yyyy')}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {rotationsByDate[date].map(item => (
                  <div key={item.id} className="bg-foreground/3 border border-foreground/10 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-foreground">{item.name}</p>
                        <p className="text-xs text-foreground/60 capitalize mt-1">{item.category}</p>
                      </div>
                      <span className="font-bold text-foreground">${item.price?.toFixed(2)}</span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-foreground/60 mb-2">{item.description}</p>
                    )}
                    {item.calories && (
                      <p className="text-xs text-foreground/60 mb-3">{item.calories} cal</p>
                    )}
                    <button
                      onClick={() => handleDeleteRotation(item.id)}
                      className="text-xs px-2 py-1 rounded bg-foreground/10 text-foreground hover:bg-foreground/20 transition-colors"
                    >
                      <Trash2 className="w-3 h-3 inline mr-1" /> Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-background w-full max-w-md rounded-2xl p-6 shadow-2xl border border-foreground/10 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="font-sans text-xl font-bold mb-5 text-foreground">Add Menu Item</h2>
            <div className="space-y-3 mb-6">
              <div>
                <label className="text-sm text-foreground/60 mb-1 block">Date *</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-foreground/10 rounded-lg text-sm bg-foreground/3 text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>
              <Input
                placeholder="Item name *"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="bg-foreground/3 border-foreground/10 text-foreground placeholder-foreground/40"
              />
              <Input
                placeholder="Description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="bg-foreground/3 border-foreground/10 text-foreground placeholder-foreground/40"
              />
              <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="bg-foreground/3 border-foreground/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  placeholder="Price *"
                  step="0.01"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  className="bg-foreground/3 border-foreground/10 text-foreground placeholder-foreground/40"
                />
                <Input
                  type="number"
                  placeholder="Calories"
                  value={formData.calories}
                  onChange={e => setFormData({ ...formData, calories: e.target.value })}
                  className="bg-foreground/3 border-foreground/10 text-foreground placeholder-foreground/40"
                />
              </div>
              <Input
                placeholder="Image URL"
                value={formData.image_url}
                onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                className="bg-foreground/3 border-foreground/10 text-foreground placeholder-foreground/40"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-foreground/20 text-foreground hover:bg-foreground/5" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-foreground text-background hover:bg-foreground/90" onClick={handleCreateRotation} disabled={!formData.name || !formData.price}>Add Item</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}