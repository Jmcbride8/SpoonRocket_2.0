import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Truck, CheckCircle, Beef, Salad, GlassWater, Blend } from 'lucide-react';

const CATEGORY_ICON_COMPONENTS = { meat: Beef, salad: Salad, drink: GlassWater, smoothie: Blend };
import { format } from 'date-fns';

// Fix leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const driverIcon = L.divIcon({
  html: `<div style="background:#165a34;border:2px solid white;border-radius:8px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.25)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="6" cy="18" r="1.5"/><circle cx="18" cy="18" r="1.5"/><path d="M4 6V4h16v2" fill="white"/></svg></div>`,
  iconSize: [32, 32], iconAnchor: [16, 16], className: ''
});

const orderIcon = L.divIcon({
  html: `<div style="background:#3b82f6;border:2px solid white;border-radius:6px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.2)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M4 4h16v14c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V4z"/><line x1="8" y1="8" x2="16" y2="8" stroke="white" stroke-width="1.5"/><line x1="8" y1="12" x2="16" y2="12" stroke="white" stroke-width="1.5"/></svg></div>`,
  iconSize: [28, 28], iconAnchor: [14, 14], className: ''
});

const selectedDriverIcon = L.divIcon({
  html: `<div style="background:#16a34a;border:2.5px solid white;border-radius:8px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(22,163,74,0.4)"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="6" cy="18" r="1.5"/><circle cx="18" cy="18" r="1.5"/><path d="M4 6V4h16v2" fill="white"/></svg></div>`,
  iconSize: [40, 40], iconAnchor: [20, 20], className: ''
});

const CATEGORY_ICONS = { meat: '🥩', salad: '🥗', drink: '🥤', smoothie: '🍹' };
// SVG icon strings for map popups (no emoji in map DOM)
const CATEGORY_SVG = {
  meat: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.6 6.62c-1.44 0-2.8.56-3.77 1.53L12 10.97l-2.71-2.72-.1-.08a4.43 4.43 0 0 0-6.18 0 4.43 4.43 0 0 0 0 6.19 4.43 4.43 0 0 0 6.18 0l2.71-2.71 2.83 2.83a5.27 5.27 0 0 0 3.77 1.53A5.33 5.33 0 0 0 24 10.67a5.33 5.33 0 0 0-5.4-4.05z"/></svg>`,
  salad: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>`,
  drink: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>`,
  smoothie: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/></svg>`,
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  in_transit: 'bg-purple-100 text-purple-800',
  delivered: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-800',
};

export default function DispatchScreen() {
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [tab, setTab] = useState('map');
  const [driverInventories, setDriverInventories] = useState({}); // { driverId: [inv items] }

  const DEFAULT_CENTER = [37.7749, -122.4194];
  const today = format(new Date(), 'yyyy-MM-dd');

  const load = useCallback(async () => {
    const [dList, oList] = await Promise.all([
      base44.entities.Driver.filter({ status: 'on_shift' }),
      base44.entities.Order.filter({ status: 'pending' }),
    ]);
    setDrivers(dList);
    setOrders(oList);

    // Load inventory for all active drivers
    const invResults = await Promise.all(
      dList.map(d => base44.entities.DriverInventory.filter({ driver_id: d.id, shift_date: today }))
    );
    const invMap = {};
    dList.forEach((d, i) => { invMap[d.id] = invResults[i]; });
    setDriverInventories(invMap);
  }, [today]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const assignOrder = async (order) => {
    if (!selectedDriver) return;
    setAssigning(order.id);
    await base44.entities.Order.update(order.id, {
      status: 'assigned',
      driver_id: selectedDriver.id,
      driver_name: selectedDriver.full_name,
      assigned_at: new Date().toISOString(),
    });
    await load();
    setAssigning(null);
  };

  const allActiveOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));

  const InventoryBar = ({ driverId }) => {
    const inv = driverInventories[driverId] || [];
    if (inv.length === 0) return <p className="text-xs text-muted-foreground italic px-1">No inventory loaded</p>;
    return (
      <div className="grid grid-cols-4 gap-1 mt-2">
        {inv.map(item => {
          const remaining = (item.quantity_loaded || 0) - (item.quantity_sold || 0) - (item.quantity_spoiled || 0);
          const pct = item.quantity_loaded > 0 ? remaining / item.quantity_loaded : 0;
          const CatIcon = CATEGORY_ICON_COMPONENTS[item.menu_item_category] || Truck;
          return (
            <div key={item.id} className="flex flex-col items-center gap-0.5">
              <CatIcon className="w-3.5 h-3.5 text-muted-foreground" />
              <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pct > 0.5 ? 'bg-green-500' : pct > 0.2 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
              <span className={`text-xs font-bold ${remaining === 0 ? 'text-red-500' : 'text-foreground'}`}>{remaining}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-playfair text-xl font-bold text-foreground">Dispatch</h1>
          <p className="text-xs text-muted-foreground">{drivers.length} drivers active · {orders.length} pending orders</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedDriver && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-green-800">{selectedDriver.full_name} selected</span>
              <button onClick={() => setSelectedDriver(null)} className="text-green-600 hover:text-green-800 ml-1 text-lg leading-none">&times;</button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="md:hidden flex border-b border-border bg-card">
        {['map', 'drivers', 'orders'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className={`flex-1 relative ${tab !== 'map' ? 'hidden md:block' : ''}`}>
          <MapContainer center={DEFAULT_CENTER} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
            {drivers.map(driver => (
              driver.latitude && driver.longitude ? (
                <Marker
                  key={driver.id}
                  position={[driver.latitude, driver.longitude]}
                  icon={selectedDriver?.id === driver.id ? selectedDriverIcon : driverIcon}
                  eventHandlers={{ click: () => setSelectedDriver(driver) }}
                >
                  <Popup>
                    <div className="text-sm min-w-[160px]">
                      <p className="font-bold mb-0.5">{driver.full_name}</p>
                      <p className="text-gray-500 text-xs mb-2">{driver.city} · {driver.vehicle_plate}</p>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Inventory remaining:</p>
                      {(driverInventories[driver.id] || []).length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No inventory loaded</p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {(driverInventories[driver.id] || []).map(item => {
                            const rem = (item.quantity_loaded || 0) - (item.quantity_sold || 0) - (item.quantity_spoiled || 0);
                            return (
                              <div key={item.id} className="flex items-center justify-between gap-2">
                                <span className="text-xs capitalize text-gray-700">{item.menu_item_category}: {item.menu_item_name}</span>
                                <span className={`text-xs font-bold ${rem === 0 ? 'text-red-500' : rem <= 2 ? 'text-yellow-600' : 'text-green-600'}`}>{rem}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ) : null
            ))}
            {allActiveOrders.map(order => (
              order.delivery_latitude && order.delivery_longitude ? (
                <Marker
                  key={order.id}
                  position={[order.delivery_latitude, order.delivery_longitude]}
                  icon={orderIcon}
                >
                  <Popup>
                    <div className="text-sm min-w-[160px]">
                      <p className="font-bold mb-0.5">{order.customer_name}</p>
                      <p className="text-gray-500 text-xs mb-2">{order.delivery_address}</p>
                      <div className="flex flex-col gap-0.5 mb-2">
                        {(order.items || []).map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-gray-700">{item.name}</span>
                            <span className="text-gray-500 ml-2">×{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                      <p className="font-semibold text-blue-700 text-sm">${order.total?.toFixed(2)}</p>
                      {selectedDriver && order.status === 'pending' && (
                        <button
                          onClick={() => assignOrder(order)}
                          disabled={assigning === order.id}
                          className="mt-2 w-full bg-primary text-white rounded px-2 py-1 text-xs font-medium"
                        >
                          {assigning === order.id ? 'Assigning...' : `Assign to ${selectedDriver.full_name}`}
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ) : null
            ))}
          </MapContainer>

          {!selectedDriver && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card border border-border px-4 py-2 rounded-full text-sm text-muted-foreground shadow-md pointer-events-none">
              Select a driver from the panel, then click an order to assign
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className={`w-full md:w-80 border-l border-border bg-card flex flex-col overflow-hidden ${tab === 'map' ? 'hidden md:flex' : tab === 'map' ? 'hidden' : 'flex'}`}>

          {/* Drivers with inventory */}
          <div className={tab === 'orders' ? 'hidden md:block' : 'block'}>
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Drivers</p>
            </div>
            <div className="overflow-y-auto max-h-72 md:max-h-80">
              {drivers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No drivers on shift</p>
              ) : drivers.map(driver => (
                <button
                  key={driver.id}
                  onClick={() => setSelectedDriver(selectedDriver?.id === driver.id ? null : driver)}
                  className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors hover:bg-secondary/50 ${selectedDriver?.id === driver.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''}`}
                >
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${selectedDriver?.id === driver.id ? 'bg-primary' : 'bg-secondary'}`}>
                      <Truck className={`w-4 h-4 ${selectedDriver?.id === driver.id ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{driver.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{driver.city} · {driver.vehicle_plate}</p>
                    </div>
                    {selectedDriver?.id === driver.id && (
                      <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    )}
                  </div>
                  {/* Inventory mini-bars */}
                  <InventoryBar driverId={driver.id} />
                </button>
              ))}
            </div>
          </div>

          {/* Orders with item breakdown */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pending Orders</p>
            </div>
            <div className="overflow-y-auto flex-1">
              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">All orders handled!</p>
                </div>
              ) : orders.map(order => (
                <div key={order.id} className="px-4 py-3 border-b border-border/50">
                  {/* Customer + total */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground">{order.customer_name || 'Customer'}</p>
                    <span className="font-bold text-sm text-primary whitespace-nowrap">${order.total?.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{order.delivery_address}</p>

                  {/* Order items breakdown */}
                  <div className="bg-secondary/50 rounded-lg px-2.5 py-2 mb-2 space-y-1">
                    {(order.items || []).map((item, i) => {
                      const CatIcon = CATEGORY_ICON_COMPONENTS[item.category] || Beef;
                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-foreground">
                            <CatIcon className="w-3 h-3 text-primary shrink-0" />
                            <span className="truncate max-w-[120px]">{item.name}</span>
                          </span>
                          <span className="text-muted-foreground shrink-0">×{item.quantity} · ${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Special instructions */}
                  {order.special_instructions && (
                    <p className="text-xs text-muted-foreground italic mb-2">📝 {order.special_instructions}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status]}`}>
                      {order.status}
                    </span>
                    {selectedDriver && order.status === 'pending' && (
                      <button
                        onClick={() => assignOrder(order)}
                        disabled={assigning === order.id}
                        className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {assigning === order.id ? '...' : 'Assign'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}