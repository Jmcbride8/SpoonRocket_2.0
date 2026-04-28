import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Package, Plus, Trash2, CheckCircle, AlertCircle, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
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
  const [dailyLevels, setDailyLevels] = useState({});
  const [wastageModal, setWastageModal] = useState(null);
  const [kpis, setKpis] = useState({ sold: 0, unsold: 0, waste: 0, spoilage: 0, soldCount: 0, unsoldCount: 0, wasteCount: 0, spoilageCount: 0 });

  const load = async () => {
    setLoading(true);
    try {
      const items = await base44.entities.MenuItem.filter({ menu_date: selectedDate, is_active: true });
      const grouped = {};
      const levels = {};
      CATEGORIES.forEach(cat => {
        grouped[cat] = items.filter(i => i.category === cat);
      });
      items.forEach(item => {
        levels[item.id] = item.daily_inventory_level || 0;
      });
      setInventory(grouped);
      setDailyLevels(levels);

      // Calculate KPIs
      const [orders, driverInv] = await Promise.all([
        base44.entities.Order.filter({ order_date: selectedDate }),
        base44.entities.DriverInventory.filter({ shift_date: selectedDate }),
      ]);

      let soldAmount = 0, soldCount = 0, unsoldAmount = 0, unsoldCount = 0, wasteAmount = 0, wasteCount = 0, spoilageAmount = 0, spoilageCount = 0;

      // Orders - sold items
      orders.forEach(order => {
        (order.items || []).forEach(item => {
          soldAmount += item.price * item.quantity;
          soldCount += item.quantity;
        });
      });

      // Driver inventory - unsold, waste, spoilage
      driverInv.forEach(inv => {
        const unsoldQty = (inv.quantity_loaded || 0) - (inv.quantity_sold || 0) - (inv.quantity_spoiled || 0);
        if (unsoldQty > 0) {
          unsoldAmount += inv.price * unsoldQty;
          unsoldCount += unsoldQty;
        }
        if (inv.quantity_spoiled > 0) {
          spoilageAmount += inv.price * inv.quantity_spoiled;
          spoilageCount += inv.quantity_spoiled;
        }
      });

      // Waste (loaded but never sold or spoiled)
      Object.values(grouped).forEach(catItems => {
        catItems.forEach(item => {
          const loaded = driverInv.filter(d => d.menu_item_id === item.id);
          const totalLoaded = loaded.reduce((sum, d) => sum + (d.quantity_loaded || 0), 0);
          const totalSold = loaded.reduce((sum, d) => sum + (d.quantity_sold || 0), 0);
          const totalSpoiled = loaded.reduce((sum, d) => sum + (d.quantity_spoiled || 0), 0);
          const waste = totalLoaded - totalSold - totalSpoiled;
          if (waste > 0) {
            wasteAmount += item.price * waste;
            wasteCount += waste;
          }
        });
      });

      setKpis({ sold: soldAmount, unsold: unsoldAmount, waste: wasteAmount, spoilage: spoilageAmount, soldCount, unsoldCount, wasteCount, spoilageCount });
    } catch (error) {
      console.error('Failed to load inventory:', error);
      const grouped = {};
      CATEGORIES.forEach(cat => { grouped[cat] = []; });
      setInventory(grouped);
      setKpis({ sold: 0, unsold: 0, waste: 0, spoilage: 0, soldCount: 0, unsoldCount: 0, wasteCount: 0, spoilageCount: 0 });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [selectedDate]);

  const handleSetMeals = async () => {
    for (const [itemId, level] of Object.entries(dailyLevels)) {
      if (level > 0) {
        const item = Object.values(inventory).flat().find(i => i.id === itemId);
        if (item) {
          await base44.entities.MenuItem.update(itemId, { daily_inventory_level: parseInt(level) || 0 });
        }
      }
    }
    setShowModal(false);
    await load();
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

      {/* KPI Cards */}
      {!loading && (
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-background border border-foreground/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-foreground/60 uppercase">Sold</p>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-foreground mb-1">${kpis.sold.toFixed(2)}</p>
            <p className="text-xs text-foreground/60">{kpis.soldCount} items</p>
          </div>

          <div className="bg-background border border-foreground/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-foreground/60 uppercase">Unsold</p>
              <DollarSign className="w-4 h-4 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-foreground mb-1">${kpis.unsold.toFixed(2)}</p>
            <p className="text-xs text-foreground/60">{kpis.unsoldCount} items</p>
          </div>

          <div className="bg-background border border-foreground/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-foreground/60 uppercase">Waste</p>
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-foreground mb-1">${kpis.waste.toFixed(2)}</p>
            <p className="text-xs text-foreground/60">{kpis.wasteCount} items</p>
          </div>

          <div className="bg-background border border-foreground/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-foreground/60 uppercase">Spoilage</p>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-foreground mb-1">${kpis.spoilage.toFixed(2)}</p>
            <p className="text-xs text-foreground/60">{kpis.spoilageCount} items</p>
          </div>
        </div>
      )}

      {/* Inventory Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-foreground/30 border-t-foreground rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {CATEGORIES.map(cat => {
            const items = inventory[cat] || [];
            return (
              <div key={cat} className="bg-background border border-foreground/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-foreground capitalize">{cat}</h2>
                  <span className="text-sm px-3 py-1 rounded-full bg-foreground/10 text-foreground">
                    {items.length} items
                  </span>
                </div>

                {items.length === 0 ? (
                   <p className="text-foreground/60 text-sm italic">No items configured</p>
                 ) : (
                   <div className="space-y-3 mb-4">
                     {items.map(item => (
                       <div key={item.id} className="flex items-center justify-between p-3 bg-foreground/3 rounded-lg border border-foreground/10">
                         <div>
                           <p className="text-sm font-medium text-foreground">{item.name}</p>
                           <p className="text-xs text-foreground/60">${item.price}</p>
                         </div>
                         <Input
                           type="number"
                           min="0"
                           value={dailyLevels[item.id] || ''}
                           onChange={e => setDailyLevels({ ...dailyLevels, [item.id]: e.target.value })}
                           placeholder="0"
                           className="w-16 h-8 bg-background border-foreground/20 text-foreground text-sm text-right"
                         />
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
                    );
                    })}
                    </div>
                    )}

      {/* Save Button */}
      <div className="mt-8 flex gap-3">
        <Button className="gap-2 bg-foreground text-background hover:bg-foreground/90" onClick={handleSetMeals}>
          <CheckCircle className="w-4 h-4" /> Save Daily Inventory Levels
        </Button>
      </div>
    </div>
  );
}