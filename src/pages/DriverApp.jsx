import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Truck, Package, CheckCircle, XCircle, AlertTriangle, Star, MapPin, Phone, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

const STATUS_COLORS = {
  off_duty: 'bg-gray-100 text-gray-600',
  on_shift: 'bg-green-100 text-green-700',
  delivering: 'bg-blue-100 text-blue-700',
};

export default function DriverApp() {
  const [driver, setDriver] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState(null);
  const [spoilageModal, setSpoilageModal] = useState(null);
  const [spoilageReason, setSpoilageReason] = useState('');
  const [spoilageQty, setSpoilageQty] = useState(1);
  const [ratingModal, setRatingModal] = useState(null);
  const [rating, setRating] = useState(5);
  const [tab, setTab] = useState('orders');

  const today = format(new Date(), 'yyyy-MM-dd');

  const load = async () => {
    try {
    const user = await base44.auth.me();
    const drivers = await base44.entities.Driver.filter({ user_email: user.email });
    if (drivers.length === 0) { setLoading(false); return; }
    const d = drivers[0];
    setDriver(d);

    const [inv, ord] = await Promise.all([
      base44.entities.DriverInventory.filter({ driver_id: d.id, shift_date: today }),
      base44.entities.Order.filter({ driver_id: d.id }),
    ]);
    setInventory(inv);
    setOrders(ord.filter(o => !['delivered', 'cancelled'].includes(o.status)));
    if (ord.find(o => o.status === 'accepted' || o.status === 'in_transit')) {
      setActiveOrder(ord.find(o => o.status === 'accepted' || o.status === 'in_transit'));
    }
    } catch (error) {
      if (error.status === 401) {
        setDriver(null);
        setInventory([]);
        setOrders([]);
        setActiveOrder(null);
        base44.auth.redirectToLogin(window.location.href);
        return;
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); const i = setInterval(load, 20000); return () => clearInterval(i); }, []);

  const startShift = async () => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await base44.entities.Driver.update(driver.id, {
        status: 'on_shift',
        shift_start: new Date().toISOString(),
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        last_location_update: new Date().toISOString(),
      });
      await load();
    });
  };

  const endShift = async () => {
    if (!confirm('End your shift?')) return;
    await base44.entities.Driver.update(driver.id, { status: 'off_duty', shift_end: new Date().toISOString() });
    await load();
  };

  const acceptOrder = async (order) => {
    await base44.entities.Order.update(order.id, { status: 'accepted', accepted_at: new Date().toISOString() });
    await base44.entities.Driver.update(driver.id, { status: 'delivering' });
    setActiveOrder(order);
    await load();
  };

  const rejectOrder = async (order) => {
    await base44.entities.Order.update(order.id, { status: 'pending', driver_id: null, driver_name: null });
    await load();
  };

  const markDelivered = async () => {
    if (!activeOrder) return;
    await base44.entities.Order.update(activeOrder.id, { status: 'delivered', delivered_at: new Date().toISOString() });
    await base44.entities.Driver.update(driver.id, { status: 'on_shift', total_deliveries: (driver.total_deliveries || 0) + 1 });
    // Update inventory sold count
    for (const item of activeOrder.items || []) {
      const inv = inventory.find(i => i.menu_item_id === item.menu_item_id);
      if (inv) await base44.entities.DriverInventory.update(inv.id, { quantity_sold: (inv.quantity_sold || 0) + (item.quantity || 1) });
    }
    setActiveOrder(null);
    setRatingModal(activeOrder);
    await load();
  };

  const reportSpoilage = async () => {
    await base44.entities.DriverInventory.update(spoilageModal.id, {
      quantity_spoiled: (spoilageModal.quantity_spoiled || 0) + spoilageQty,
      spoilage_reason: spoilageReason,
      spoilage_status: 'pending_review',
    });
    setSpoilageModal(null);
    setSpoilageReason('');
    setSpoilageQty(1);
    await load();
  };

  const submitRating = async () => {
    if (!ratingModal) return;
    await base44.entities.Order.update(ratingModal.id, { customer_rating: rating });
    setRatingModal(null);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-foreground/30 border-t-foreground rounded-full animate-spin" /></div>;

  if (!driver) return (
    <div className="flex flex-col items-center justify-center h-screen p-8 text-center">
      <Truck className="w-12 h-12 text-foreground/60 mb-4" />
      <h2 className="font-sans text-xl font-bold mb-2 text-foreground">Driver Profile Not Found</h2>
      <p className="text-foreground/60 text-sm">Contact operations to set up your driver profile.</p>
    </div>
  );

  const pendingOrders = orders.filter(o => o.status === 'assigned');
  const availableItems = inventory.filter(i => (i.quantity_loaded - i.quantity_sold - i.quantity_spoiled) > 0);
  const totalSales = inventory.reduce((s, i) => s + (i.quantity_sold || 0) * (i.price || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-foreground text-background px-6 pt-8 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-background/70 text-xs font-medium tracking-wider uppercase">Driver App</p>
            <h1 className="font-sans text-xl font-bold">{driver.full_name}</h1>
            <p className="text-background/70 text-sm">{driver.city} · {driver.vehicle_plate}</p>
          </div>
          <div>
            <span className={`text-xs px-3 py-1.5 rounded-full font-semibold capitalize ${driver.status === 'on_shift' ? 'bg-background/20 text-background' : driver.status === 'delivering' ? 'bg-background/20 text-background' : 'bg-background/10 text-background/70'}`}>
              {driver.status?.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-background/20 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-background">${totalSales.toFixed(0)}</p>
            <p className="text-xs text-background/70">Today's Sales</p>
          </div>
          <div className="bg-background/20 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-background">{driver.total_deliveries || 0}</p>
            <p className="text-xs text-background/70">Deliveries</p>
          </div>
          <div className="bg-background/20 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-background">{driver.rating ? driver.rating.toFixed(1) : '—'}</p>
            <p className="text-xs text-background/70">Rating</p>
          </div>
        </div>
      </div>

      {/* Shift controls */}
      <div className="px-4 py-4 border-b border-foreground/10 bg-background">
        {driver.status === 'off_duty' ? (
          <Button onClick={startShift} className="w-full gap-2 bg-foreground text-background hover:bg-foreground/90">
            <Navigation className="w-4 h-4" /> Start Shift
          </Button>
        ) : (
          <Button onClick={endShift} variant="outline" className="w-full gap-2 border-foreground/20 text-foreground hover:bg-foreground/5">
            <XCircle className="w-4 h-4" /> End Shift
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-foreground/10 bg-background">
        {['orders', 'inventory'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${tab === t ? 'border-b-2 border-foreground text-foreground' : 'text-foreground/60'}`}>
            {t} {t === 'orders' && pendingOrders.length > 0 && <span className="ml-1.5 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full inline-flex items-center justify-center">{pendingOrders.length}</span>}
          </button>
        ))}
      </div>

      <div className="px-8 py-4">
        {tab === 'orders' && (
          <div className="space-y-4">
            {/* Active order */}
            {activeOrder && (
              <div className="bg-foreground/5 border-2 border-foreground rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
                  <p className="text-sm font-semibold text-foreground">Active Delivery</p>
                </div>
                <p className="font-bold text-foreground text-base">{activeOrder.customer_name}</p>
                <div className="flex items-center gap-1.5 text-foreground/60 text-sm mt-1 mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{activeOrder.delivery_address}</span>
                </div>
                {activeOrder.customer_phone && (
                  <div className="flex items-center gap-1.5 text-foreground/60 text-sm mb-3">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{activeOrder.customer_phone}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {activeOrder.items?.map((item, i) => (
                    <span key={i} className="text-xs bg-foreground/10 px-2 py-1 rounded-full text-foreground">{item.quantity}× {item.name}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-lg">${activeOrder.total?.toFixed(2)}</span>
                  <Button onClick={markDelivered} className="gap-2 bg-foreground text-background hover:bg-foreground/90">
                    <CheckCircle className="w-4 h-4" /> Mark Delivered
                  </Button>
                </div>
              </div>
            )}

            {/* Pending assignments */}
            {pendingOrders.length === 0 && !activeOrder && (
              <div className="text-center py-12">
                <Truck className="w-10 h-10 text-foreground/60 mx-auto mb-3" />
                <p className="font-semibold text-foreground mb-1">No orders assigned</p>
                <p className="text-sm text-foreground/60">Dispatch will assign orders to you shortly</p>
              </div>
            )}

            {pendingOrders.map(order => (
              <div key={order.id} className="bg-background border border-foreground/10 rounded-2xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-foreground">{order.customer_name}</p>
                    <p className="text-sm text-foreground/60 mt-0.5">{order.delivery_address}</p>
                  </div>
                  <span className="font-bold text-foreground">${order.total?.toFixed(2)}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {order.items?.map((item, i) => (
                    <span key={i} className="text-xs bg-foreground/10 px-2 py-1 rounded-full text-foreground">{item.quantity}× {item.name}</span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 border-foreground/20 text-foreground hover:bg-foreground/5" onClick={() => rejectOrder(order)}>
                    <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                  </Button>
                  <Button size="sm" className="flex-1 bg-foreground text-background hover:bg-foreground/90" onClick={() => acceptOrder(order)}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Accept
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'inventory' && (
          <div className="space-y-3">
            {inventory.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-10 h-10 text-foreground/60 mx-auto mb-3" />
                <p className="font-semibold text-foreground mb-1">No inventory loaded</p>
                <p className="text-sm text-foreground/60">Operations will initialize your inventory</p>
              </div>
            ) : inventory.map(inv => {
              const remaining = (inv.quantity_loaded || 0) - (inv.quantity_sold || 0) - (inv.quantity_spoiled || 0);
              return (
                <div key={inv.id} className="bg-background border border-foreground/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{inv.menu_item_name}</p>
                      <p className="text-xs text-foreground/60 capitalize">{inv.menu_item_category}</p>
                    </div>
                    <span className={`text-sm font-bold ${remaining > 3 ? 'text-green-600' : remaining > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {remaining} left
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-foreground/60 mb-3">
                    <span>Loaded: {inv.quantity_loaded}</span>
                    <span>Sold: {inv.quantity_sold}</span>
                    <span className={inv.quantity_spoiled > 0 ? 'text-foreground' : ''}>Spoiled: {inv.quantity_spoiled}</span>
                  </div>
                  {inv.spoilage_status === 'pending_review' && (
                    <div className="flex items-center gap-1.5 text-xs text-foreground mb-2">
                      <AlertTriangle className="w-3.5 h-3.5" /> Spoilage pending review
                    </div>
                  )}
                  {remaining > 0 && inv.spoilage_status !== 'pending_review' && (
                    <Button size="sm" variant="outline" className="text-foreground border-foreground/20 hover:bg-foreground/5 gap-1.5" onClick={() => { setSpoilageModal(inv); setSpoilageQty(1); }}>
                      <AlertTriangle className="w-3.5 h-3.5" /> Report Spoilage
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Spoilage Modal */}
      {spoilageModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setSpoilageModal(null)}>
          <div className="bg-background w-full rounded-t-3xl p-6 border border-foreground/10" onClick={e => e.stopPropagation()}>
            <h2 className="font-sans text-lg font-bold mb-1 text-foreground">Report Spoilage</h2>
            <p className="text-sm text-foreground/60 mb-4">{spoilageModal.menu_item_name}</p>
            <div className="flex items-center gap-4 mb-4">
              <p className="text-sm font-medium text-foreground">Quantity spoiled:</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setSpoilageQty(Math.max(1, spoilageQty - 1))} className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center">-</button>
                <span className="font-bold text-foreground">{spoilageQty}</span>
                <button onClick={() => setSpoilageQty(spoilageQty + 1)} className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center text-background">+</button>
              </div>
            </div>
            <Textarea placeholder="Reason for spoilage *" value={spoilageReason} onChange={e => setSpoilageReason(e.target.value)} className="mb-4 resize-none bg-foreground/3 border-foreground/10 text-foreground placeholder-foreground/40" rows={3} />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-foreground/20 text-foreground hover:bg-foreground/5" onClick={() => setSpoilageModal(null)}>Cancel</Button>
              <Button className="flex-1 bg-foreground text-background hover:bg-foreground/90" onClick={reportSpoilage} disabled={!spoilageReason.trim()}>Submit Report</Button>
            </div>
          </div>
        </div>
      )}

      {/* Rating reminder modal */}
      {ratingModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-background w-full max-w-sm rounded-2xl p-6 text-center border border-foreground/10">
            <CheckCircle className="w-12 h-12 text-foreground mx-auto mb-3" />
            <h2 className="font-sans text-xl font-bold mb-1 text-foreground">Delivery Complete!</h2>
            <p className="text-sm text-foreground/60 mb-5">How did this delivery go?</p>
            <div className="flex justify-center gap-2 mb-5">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setRating(n)}>
                  <Star className={`w-8 h-8 ${n <= rating ? 'fill-foreground text-foreground' : 'text-foreground/30'}`} />
                </button>
              ))}
            </div>
            <Button className="w-full bg-foreground text-background hover:bg-foreground/90" onClick={submitRating}>Done</Button>
          </div>
        </div>
      )}
    </div>
  );
}