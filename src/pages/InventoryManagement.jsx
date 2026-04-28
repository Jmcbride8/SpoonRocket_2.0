import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Package, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

const CATEGORIES = ['meat', 'salad', 'drink', 'smoothie'];

export default function InventoryManagement() {
  const [inventory, setInventory] = useState({});
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [wastageModal, setWastageModal] = useState(null);

  const load = async () => {
    setLoading(true);
    const items = await base44.entities.MenuItem.filter({ menu_date: selectedDate, is_active: true });
    const grouped = {};
    CATEGORIES.forEach(cat => {
      grouped[cat] = items.filter(i => i.category === cat);
    });
    setInventory(grouped);
    setLoading(false);
  };

  useEffect(() => { load(); }, [selectedDate]);

  const handleSetMeals = async () => {
    const menuData = [];
    for (const [cat, items] of Object.entries(inventory)) {
      if (items.length > 0 && quantities[cat]) {
        items.forEach(item => {
          menuData.push({
            ...item,
            quantity_for_day: parseInt(quantities[cat]) || 0,
          });
        });
      }
    }
    setShowModal(false);
    setQuantities({});
  };

  const handleWastage = async (category, action) => {
    // Mark as waste or carry over
    console.log(`${action} ${category} meals`);
    setWastageModal(null);
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto bg-background">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-sans text-2xl font-bold text-foreground mb-1">Inventory Management</h1>
          <p className="text-foreground/60 text-sm">Set daily meals and manage inventory</p>
        </div>
      </div>

      {/* Date Selector */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex items-center gap-2 bg-foreground/5 px-4 py-3 rounded-lg border border-foreground/10">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-transparent text-foreground outline-none text-sm"
          />
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2 bg-foreground text-background hover:bg-foreground/90">
          <Plus className="w-4 h-4" /> Set Daily Meals
        </Button>
      </div>

      {/* Inventory Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {CATEGORIES.map(cat => (
          <div key={cat} className="bg-background border border-foreground/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground capitalize">{cat}</h2>
              <span className="text-sm px-3 py-1 rounded-full bg-foreground/10 text-foreground">
                {inventory[cat]?.length || 0} items
              </span>
            </div>

            {inventory[cat]?.length === 0 ? (
              <p className="text-foreground/60 text-sm italic">No items configured</p>
            ) : (
              <div className="space-y-3 mb-4">
                {inventory[cat].map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-foreground/3 rounded-lg border border-foreground/10">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-foreground/60">${item.price}</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">TBD</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 border-foreground/20 text-foreground hover:bg-foreground/5">
                Carry Over
              </Button>
              <Button size="sm" variant="outline" className="flex-1 border-foreground/20 text-foreground hover:bg-foreground/5">
                Mark Waste
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Set Meals Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-background w-full max-w-md rounded-2xl p-6 shadow-2xl border border-foreground/10" onClick={e => e.stopPropagation()}>
            <h2 className="font-sans text-xl font-bold mb-5 text-foreground">Set Daily Meals by Category</h2>
            <div className="space-y-4 mb-6">
              {CATEGORIES.map(cat => (
                <div key={cat}>
                  <label className="text-sm font-medium text-foreground capitalize mb-2 block">{cat}</label>
                  <Input
                    type="number"
                    min="0"
                    value={quantities[cat] || ''}
                    onChange={e => setQuantities({ ...quantities, [cat]: e.target.value })}
                    placeholder="Quantity to prepare"
                    className="bg-foreground/3 border-foreground/10 text-foreground placeholder-foreground/40"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-foreground/20 text-foreground hover:bg-foreground/5" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-foreground text-background hover:bg-foreground/90" onClick={handleSetMeals}>Set Meals</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}