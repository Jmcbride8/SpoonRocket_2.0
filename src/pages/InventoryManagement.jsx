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
  const [carryOverWaste, setCarryOverWaste] = useState({});
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

      let soldAmount = 0, soldCogs = 0, soldCount = 0, unsoldAmount = 0, unsoldCogs = 0, unsoldCount = 0, wasteAmount = 0, wasteCount = 0, shrinkageAmount = 0, shrinkageCount = 0;
      const itemMetrics = {};
      const itemDetails = {};
      Object.values(items).forEach(item => {
        itemDetails[item.id] = item;
      });

      // Orders - sold items
      orders.forEach(order => {
        (order.items || []).forEach(item => {
          const itemDetail = itemDetails[item.menu_item_id];
          const itemCogs = itemDetail?.cogs || 0;
          soldAmount += item.price * item.quantity;
          soldCogs += itemCogs * item.quantity;
          soldCount += item.quantity;
          if (!itemMetrics[item.menu_item_id]) {
            itemMetrics[item.menu_item_id] = { sold: 0, soldCogs: 0, soldCount: 0, unsold: 0, unsoldCogs: 0, unsoldCount: 0, waste: 0, wasteCount: 0, shrinkage: 0, shrinkageCount: 0 };
          }
          itemMetrics[item.menu_item_id].sold += item.price * item.quantity;
          itemMetrics[item.menu_item_id].soldCogs += itemCogs * item.quantity;
          itemMetrics[item.menu_item_id].soldCount += item.quantity;
        });
      });

      // Driver inventory - unsold, waste, shrinkage
      driverInv.forEach(inv => {
        const itemDetail = itemDetails[inv.menu_item_id];
        const itemCogs = itemDetail?.cogs || 0;
        const unsoldQty = (inv.quantity_loaded || 0) - (inv.quantity_sold || 0) - (inv.quantity_spoiled || 0);
        if (!itemMetrics[inv.menu_item_id]) {
          itemMetrics[inv.menu_item_id] = { sold: 0, soldCogs: 0, soldCount: 0, unsold: 0, unsoldCogs: 0, unsoldCount: 0, waste: 0, wasteCount: 0, shrinkage: 0, shrinkageCount: 0 };
        }
        if (unsoldQty > 0) {
          unsoldAmount += inv.price * unsoldQty;
          unsoldCogs += itemCogs * unsoldQty;
          unsoldCount += unsoldQty;
          itemMetrics[inv.menu_item_id].unsold += inv.price * unsoldQty;
          itemMetrics[inv.menu_item_id].unsoldCogs += itemCogs * unsoldQty;
          itemMetrics[inv.menu_item_id].unsoldCount += unsoldQty;
        }
        if (inv.quantity_spoiled > 0) {
          shrinkageAmount += inv.price * inv.quantity_spoiled;
          shrinkageCount += inv.quantity_spoiled;
          itemMetrics[inv.menu_item_id].shrinkage += inv.price * inv.quantity_spoiled;
          itemMetrics[inv.menu_item_id].shrinkageCount += inv.quantity_spoiled;
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
            if (!itemMetrics[item.id]) {
              itemMetrics[item.id] = { sold: 0, soldCount: 0, unsold: 0, unsoldCount: 0, waste: 0, wasteCount: 0, spoilage: 0, spoilageCount: 0 };
            }
            itemMetrics[item.id].waste += item.price * waste;
            itemMetrics[item.id].wasteCount += waste;
          }
        });
      });

      setKpis({ sold: soldAmount, soldCogs, unsold: unsoldAmount, unsoldCogs, waste: wasteAmount, shrinkage: shrinkageAmount, soldCount, unsoldCount, wasteCount, shrinkageCount });
      // Store itemMetrics in state to use in rendering
      window.__itemMetrics = itemMetrics;
    } catch (error) {
      console.error('Failed to load inventory:', error);
      const grouped = {};
      CATEGORIES.forEach(cat => { grouped[cat] = []; });
      setInventory(grouped);
      setKpis({ sold: 0, soldCogs: 0, unsold: 0, unsoldCogs: 0, waste: 0, shrinkage: 0, soldCount: 0, unsoldCount: 0, wasteCount: 0, shrinkageCount: 0 });
      window.__itemMetrics = {};
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

  const handleSaveCarryOverWaste = async () => {
    // Get all driver inventory records for this date and update based on carry over/waste inputs
    const driverInv = await base44.entities.DriverInventory.filter({ shift_date: selectedDate });

    for (const inv of driverInv) {
      const carryWaste = carryOverWaste[inv.menu_item_id];
      if (carryWaste) {
        // Update driver inventory with carry over and waste info
        const carryQty = carryWaste.carryOver || 0;
        const wasteQty = carryWaste.markWaste || 0;

        // Update the inventory record with carry over/waste breakdown
        const updates = {
          quantity_carryover: carryQty,
          quantity_waste: wasteQty
        };

        await base44.entities.DriverInventory.update(inv.id, updates);
      }
    }

    await load();
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
        <>
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="bg-background border border-foreground/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-foreground/60 uppercase">Sold</p>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-foreground mb-0.5">${kpis.sold.toFixed(2)}</p>
              <p className="text-xs text-foreground/60 mb-3">Value · {kpis.soldCount} items ({((kpis.soldCount / (kpis.soldCount + kpis.unsoldCount + kpis.wasteCount + kpis.shrinkageCount) || 0) * 100).toFixed(1)}%)</p>
              <p className="text-xs text-foreground/60">COGS: <span className="font-semibold text-foreground">${kpis.soldCogs.toFixed(2)}</span></p>
            </div>

            <div className="bg-background border border-foreground/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-foreground/60 uppercase">Unsold</p>
                <DollarSign className="w-4 h-4 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-foreground mb-0.5">${kpis.unsold.toFixed(2)}</p>
              <p className="text-xs text-foreground/60 mb-3">Value · {kpis.unsoldCount} items ({((kpis.unsoldCount / (kpis.soldCount + kpis.unsoldCount + kpis.wasteCount + kpis.shrinkageCount) || 0) * 100).toFixed(1)}%)</p>
              <p className="text-xs text-foreground/60">COGS: <span className="font-semibold text-foreground">${kpis.unsoldCogs.toFixed(2)}</span></p>
            </div>

            <div className="bg-background border border-foreground/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-foreground/60 uppercase">Waste</p>
                <AlertTriangle className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">${kpis.waste.toFixed(2)}</p>
              <p className="text-xs text-foreground/60">{kpis.wasteCount} items ({((kpis.wasteCount / (kpis.soldCount + kpis.unsoldCount + kpis.wasteCount + kpis.shrinkageCount) || 0) * 100).toFixed(1)}%)</p>
            </div>

            <div className="bg-background border border-foreground/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-foreground/60 uppercase">Shrinkage</p>
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">${kpis.shrinkage.toFixed(2)}</p>
              <p className="text-xs text-foreground/60">{kpis.shrinkageCount} items ({((kpis.shrinkageCount / (kpis.soldCount + kpis.unsoldCount + kpis.wasteCount + kpis.shrinkageCount) || 0) * 100).toFixed(1)}%)</p>
            </div>
          </div>

          {/* GM% Card */}
          <div className="mb-8 bg-background border border-foreground/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-foreground/60 uppercase">Gross Margin %</p>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-foreground">{((kpis.sold / (kpis.waste + kpis.shrinkage) || 0) * 100).toFixed(1)}%</p>
            <p className="text-xs text-foreground/60 mt-2">Sold vs Waste + Shrinkage</p>
          </div>
        </>
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
                     {items.map(item => {
                       const metrics = window.__itemMetrics?.[item.id] || { sold: 0, soldCogs: 0, soldCount: 0, unsold: 0, unsoldCogs: 0, unsoldCount: 0, waste: 0, wasteCount: 0, shrinkage: 0, shrinkageCount: 0 };
                       return (
                       <div key={item.id} className="p-3 bg-foreground/3 rounded-lg border border-foreground/10">
                         <div className="flex items-center justify-between mb-2">
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
                         <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                           <div className="bg-green-100 text-green-700 p-2 rounded">
                             <p className="font-semibold">${metrics.sold.toFixed(0)}</p>
                             <p className="text-xs">Sold Value</p>
                             <p className="text-xs mt-1">COGS: ${metrics.soldCogs.toFixed(0)}</p>
                           </div>
                           <div className="bg-yellow-100 text-yellow-700 p-2 rounded">
                             <p className="font-semibold">${metrics.unsold.toFixed(0)}</p>
                             <p className="text-xs">Unsold ({metrics.unsoldCount})</p>
                             <p className="text-xs mt-1">COGS: ${metrics.unsoldCogs.toFixed(0)}</p>
                           </div>
                           <div className="bg-orange-100 text-orange-700 p-2 rounded">
                             <p className="font-semibold">${metrics.waste.toFixed(0)}</p>
                             <p className="text-xs">Waste</p>
                           </div>
                           <div className="bg-red-100 text-red-700 p-2 rounded">
                             <p className="font-semibold">${metrics.shrinkage.toFixed(0)}</p>
                             <p className="text-xs">Shrinkage</p>
                           </div>
                         </div>
                         {metrics.unsoldCount > 0 && (
                           <div className="flex gap-2 mt-3">
                             <div className="flex-1">
                               <label className="text-xs text-foreground/60 block mb-1">Carry Over</label>
                               <Input
                                 type="number"
                                 min="0"
                                 max={metrics.unsoldCount}
                                 value={carryOverWaste[item.id]?.carryOver || ''}
                                 onChange={e => setCarryOverWaste({ ...carryOverWaste, [item.id]: { ...carryOverWaste[item.id], carryOver: parseInt(e.target.value) || 0 } })}
                                 placeholder="0"
                                 className="w-full h-7 bg-background border-foreground/20 text-foreground text-xs text-center"
                               />
                             </div>
                             <div className="flex-1">
                               <label className="text-xs text-foreground/60 block mb-1">Mark Waste</label>
                               <Input
                                 type="number"
                                 min="0"
                                 max={metrics.unsoldCount}
                                 value={carryOverWaste[item.id]?.markWaste || ''}
                                 onChange={e => setCarryOverWaste({ ...carryOverWaste, [item.id]: { ...carryOverWaste[item.id], markWaste: parseInt(e.target.value) || 0 } })}
                                 placeholder="0"
                                 className="w-full h-7 bg-background border-foreground/20 text-foreground text-xs text-center"
                               />
                             </div>
                           </div>
                         )}
                         </div>
                         );
                         })}
                         </div>
                         )}
                    </div>
                    );
                    })}
                    </div>
                    )}

      {/* Save Buttons */}
      <div className="mt-8 flex gap-3">
        <Button className="gap-2 bg-foreground text-background hover:bg-foreground/90" onClick={handleSetMeals}>
          <CheckCircle className="w-4 h-4" /> Save Daily Inventory Levels
        </Button>
        <Button variant="outline" className="gap-2 border-foreground/20 text-foreground hover:bg-foreground/5" onClick={handleSaveCarryOverWaste}>
          <CheckCircle className="w-4 h-4" /> Save Carry Over & Waste
        </Button>
      </div>
    </div>
  );
}