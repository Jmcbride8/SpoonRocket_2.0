import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Truck, Plus, Calendar, Package, CheckCircle, XCircle, AlertTriangle, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const STATUS_COLORS = {
  off_duty: 'bg-gray-100 text-gray-600',
  on_shift: 'bg-green-100 text-green-700',
  delivering: 'bg-blue-100 text-blue-700',
};

const CITIES = ['San Francisco', 'Los Angeles', 'New York', 'Chicago', 'Austin'];

export default function DeliveryOperations() {
  const [drivers, setDrivers] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [spoilageRequests, setSpoilageRequests] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('drivers');
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(null);
  const [expandedDriver, setExpandedDriver] = useState(null);
  const [driverInventory, setDriverInventory] = useState({});

  const today = format(new Date(), 'yyyy-MM-dd');

  const [driverForm, setDriverForm] = useState({ full_name: '', user_email: '', phone: '', city: 'San Francisco', vehicle_plate: '' });
  const [inventoryForm, setInventoryForm] = useState([]);
  const [scheduleForm, setScheduleForm] = useState({ shift_date: today, shift_start: '10:00', shift_end: '18:00', notes: '' });
  const [savingDriver, setSavingDriver] = useState(false);

  const load = async () => {
    setLoading(true);
    const [d, m, spoil, sched] = await Promise.all([
      base44.entities.Driver.list(),
      base44.entities.MenuItem.filter({ menu_date: today, is_active: true }),
      base44.entities.DriverInventory.filter({ spoilage_status: 'pending_review' }),
      base44.entities.DriverSchedule.filter({ shift_date: today }),
    ]);
    setDrivers(d);
    setMenuItems(m);
    setSpoilageRequests(spoil);
    setSchedules(sched);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createDriver = async () => {
    setSavingDriver(true);
    await base44.entities.Driver.create({ ...driverForm, status: 'off_duty', total_deliveries: 0 });
    setDriverForm({ full_name: '', user_email: '', phone: '', city: 'San Francisco', vehicle_plate: '' });
    setShowDriverForm(false);
    await load();
    setSavingDriver(false);
  };

  const initInventory = async () => {
    const driver = showInventoryModal;
    for (const inv of inventoryForm) {
      if (inv.quantity > 0) {
        await base44.entities.DriverInventory.create({
          driver_id: driver.id,
          menu_item_id: inv.id,
          menu_item_name: inv.name,
          menu_item_category: inv.category,
          quantity_loaded: inv.quantity,
          quantity_sold: 0,
          quantity_spoiled: 0,
          spoilage_status: 'none',
          shift_date: today,
          price: inv.price,
        });
      }
    }
    setShowInventoryModal(null);
    setInventoryForm([]);
    await load();
  };

  const openInventoryModal = (driver) => {
    setShowInventoryModal(driver);
    setInventoryForm(menuItems.map(m => ({ ...m, quantity: 0 })));
  };

  const createSchedule = async () => {
    const driver = showScheduleModal;
    await base44.entities.DriverSchedule.create({
      driver_id: driver.id,
      driver_name: driver.full_name,
      city: driver.city,
      ...scheduleForm,
      status: 'scheduled',
    });
    setShowScheduleModal(null);
    await load();
  };

  const approveSpoilage = async (inv) => {
    await base44.entities.DriverInventory.update(inv.id, { spoilage_status: 'approved' });
    await load();
  };

  const rejectSpoilage = async (inv) => {
    await base44.entities.DriverInventory.update(inv.id, { spoilage_status: 'rejected', quantity_spoiled: 0 });
    await load();
  };

  const toggleDriverInventory = async (driverId) => {
    if (expandedDriver === driverId) { setExpandedDriver(null); return; }
    setExpandedDriver(driverId);
    const inv = await base44.entities.DriverInventory.filter({ driver_id: driverId, shift_date: today });
    setDriverInventory(p => ({ ...p, [driverId]: inv }));
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-foreground mb-1">Delivery Operations</h1>
          <p className="text-muted-foreground text-sm">Manage drivers, schedules, and inventory</p>
        </div>
        {tab === 'drivers' && (
          <Button onClick={() => setShowDriverForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Driver
          </Button>
        )}
      </div>

      {/* Alert: spoilage requests */}
      {spoilageRequests.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-yellow-800">{spoilageRequests.length} spoilage request{spoilageRequests.length > 1 ? 's' : ''} pending review</p>
          </div>
          <Button size="sm" variant="outline" className="border-yellow-300 text-yellow-700" onClick={() => setTab('spoilage')}>
            Review
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary p-1 rounded-xl w-fit mb-6">
        {['drivers', 'schedules', 'spoilage'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${tab === t ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {t} {t === 'spoilage' && spoilageRequests.length > 0 && <span className="ml-1 bg-yellow-500 text-white text-xs w-5 h-5 rounded-full inline-flex items-center justify-center">{spoilageRequests.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'drivers' && (
        <div className="space-y-3">
          {drivers.map(driver => (
            <div key={driver.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                  <Truck className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{driver.full_name}</p>
                  <p className="text-xs text-muted-foreground">{driver.city} · {driver.vehicle_plate} · {driver.user_email}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[driver.status]}`}>
                  {driver.status?.replace('_', ' ')}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openInventoryModal(driver)}>
                    <Package className="w-3.5 h-3.5" /> Load
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowScheduleModal(driver)}>
                    <Calendar className="w-3.5 h-3.5" /> Schedule
                  </Button>
                  <button onClick={() => toggleDriverInventory(driver.id)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                    {expandedDriver === driver.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {expandedDriver === driver.id && (
                <div className="border-t border-border px-4 py-3 bg-secondary/20">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Today's Inventory</p>
                  {(driverInventory[driver.id] || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No inventory loaded today</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(driverInventory[driver.id] || []).map(inv => (
                        <div key={inv.id} className="bg-card rounded-xl p-3 text-center border border-border">
                          <p className="text-xs font-medium text-foreground">{inv.menu_item_name}</p>
                          <p className="text-lg font-bold text-primary mt-1">{inv.quantity_loaded - inv.quantity_sold - inv.quantity_spoiled}</p>
                          <p className="text-xs text-muted-foreground">of {inv.quantity_loaded}</p>
                          <div className="text-xs mt-1 text-green-600">✓ {inv.quantity_sold} sold</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'schedules' && (
        <div className="space-y-3">
          {schedules.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold">No schedules for today</p>
              <p className="text-sm text-muted-foreground">Use the Load button on a driver to create a schedule</p>
            </div>
          ) : schedules.map(s => (
            <div key={s.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">{s.driver_name}</p>
                <p className="text-sm text-muted-foreground">{s.city} · {s.shift_start} – {s.shift_end}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                s.status === 'active' ? 'bg-green-100 text-green-700' :
                s.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                s.status === 'no_show' ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>{s.status}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'spoilage' && (
        <div className="space-y-3">
          {spoilageRequests.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <p className="font-semibold">No pending spoilage requests</p>
            </div>
          ) : spoilageRequests.map(inv => (
            <div key={inv.id} className="bg-card border border-yellow-200 rounded-2xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-foreground">{inv.menu_item_name}</p>
                  <p className="text-sm text-muted-foreground">Driver ID: {inv.driver_id}</p>
                </div>
                <span className="text-sm font-bold text-red-600">{inv.quantity_spoiled} spoiled</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3 italic">"{inv.spoilage_reason}"</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => rejectSpoilage(inv)}>
                  <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                </Button>
                <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => approveSpoilage(inv)}>
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Driver Modal */}
      {showDriverForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowDriverForm(false)}>
          <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="font-playfair text-xl font-bold mb-5">Add Driver</h2>
            <div className="space-y-3">
              <Input placeholder="Full name *" value={driverForm.full_name} onChange={e => setDriverForm(p => ({...p, full_name: e.target.value}))} />
              <Input placeholder="Email *" type="email" value={driverForm.user_email} onChange={e => setDriverForm(p => ({...p, user_email: e.target.value}))} />
              <Input placeholder="Phone" value={driverForm.phone} onChange={e => setDriverForm(p => ({...p, phone: e.target.value}))} />
              <Input placeholder="Vehicle plate" value={driverForm.vehicle_plate} onChange={e => setDriverForm(p => ({...p, vehicle_plate: e.target.value}))} />
              <Select value={driverForm.city} onValueChange={v => setDriverForm(p => ({...p, city: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowDriverForm(false)}>Cancel</Button>
              <Button className="flex-1" onClick={createDriver} disabled={savingDriver || !driverForm.full_name || !driverForm.user_email}>
                {savingDriver ? 'Adding...' : 'Add Driver'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Modal */}
      {showInventoryModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowInventoryModal(null)}>
          <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="font-playfair text-xl font-bold mb-1">Initialize Inventory</h2>
            <p className="text-sm text-muted-foreground mb-5">{showInventoryModal.full_name} · {today}</p>
            {menuItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No menu items for today</p>
            ) : (
              <div className="space-y-3 mb-5">
                {inventoryForm.map((item, idx) => (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.category} · ${item.price}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setInventoryForm(p => p.map((x, i) => i === idx ? {...x, quantity: Math.max(0, x.quantity - 1)} : x))} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">-</button>
                      <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                      <button onClick={() => setInventoryForm(p => p.map((x, i) => i === idx ? {...x, quantity: x.quantity + 1} : x))} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowInventoryModal(null)}>Cancel</Button>
              <Button className="flex-1" onClick={initInventory} disabled={menuItems.length === 0}>Load Inventory</Button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowScheduleModal(null)}>
          <div className="bg-card w-full max-w-sm rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="font-playfair text-xl font-bold mb-1">Schedule Shift</h2>
            <p className="text-sm text-muted-foreground mb-5">{showScheduleModal.full_name}</p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Shift Date</label>
                <input type="date" value={scheduleForm.shift_date} onChange={e => setScheduleForm(p => ({...p, shift_date: e.target.value}))} className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Start Time</label>
                  <input type="time" value={scheduleForm.shift_start} onChange={e => setScheduleForm(p => ({...p, shift_start: e.target.value}))} className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">End Time</label>
                  <input type="time" value={scheduleForm.shift_end} onChange={e => setScheduleForm(p => ({...p, shift_end: e.target.value}))} className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <Input placeholder="Notes (optional)" value={scheduleForm.notes} onChange={e => setScheduleForm(p => ({...p, notes: e.target.value}))} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowScheduleModal(null)}>Cancel</Button>
              <Button className="flex-1" onClick={createSchedule}>Create Schedule</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}