import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DARK_POPUP_CSS = `
  .leaflet-popup-content-wrapper {
    background: #111827 !important;
    color: white !important;
    border: none !important;
    padding: 0 !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important;
  }
  .leaflet-popup-content {
    margin: 0 !important;
  }
  .leaflet-popup-tip {
    background: #111827 !important;
    box-shadow: none !important;
  }
  .leaflet-popup-close-button {
    color: rgba(255,255,255,0.6) !important;
  }
  .leaflet-popup-close-button:hover {
    color: white !important;
  }
`;
import { Button } from '@/components/ui/button';
import { Truck, CheckCircle, Beef, Salad, GlassWater, Blend, Filter } from 'lucide-react';

const CATEGORY_ICON_COMPONENTS = { meat: Beef, salad: Salad, drink: GlassWater, smoothie: Blend };
import { format } from 'date-fns';

// Fix leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createDriverIcon = (driverStatus, hasAssigned, selected = false) => {
  let bgColor = '#9ca3af'; // gray - no orders
  let shapeHtml = '<circle cx="50%" cy="50%" r="35%" fill="none" stroke="white" stroke-width="2"/>';

  if (hasAssigned) {
    bgColor = '#f59e0b'; // amber - waiting for driver acceptance
    shapeHtml = '<circle cx="50%" cy="50%" r="40%" fill="white"/>';
  } else if (driverStatus === 'accepted') {
    bgColor = '#22c55e'; // green - accepted/en route
    shapeHtml = '<polygon points="50%,20% 80%,70% 50%,60% 20%,70%" fill="white"/>';
  } else if (driverStatus === 'delivering') {
    bgColor = '#3b82f6'; // blue - actively delivering
    shapeHtml = '<polygon points="50%,20% 80%,70% 50%,60% 20%,70%" fill="white"/>';
  }

  return L.divIcon({
    html: `<div style="background:${bgColor};border:2px solid white;border-radius:50%;width:${selected ? 28 : 22}px;height:${selected ? 28 : 22}px;display:flex;align-items:center;justify-content:center;box-shadow:0 ${selected ? 3 : 2}px ${selected ? 8 : 6}px rgba(0,0,0,0.25)"><svg width="100%" height="100%" viewBox="0 0 100 100">${shapeHtml}</svg></div>`,
    iconSize: [selected ? 28 : 22, selected ? 28 : 22], 
    iconAnchor: [selected ? 14 : 11, selected ? 14 : 11], 
    className: ''
  });
};

const createOrderIcon = (order) => {
  const now = new Date();
  const orderTime = new Date(order.created_date);
  const minutesElapsed = Math.floor((now - orderTime) / (1000 * 60));
  
  let color = '#eab308'; // yellow
  if (minutesElapsed > 30) color = '#22c55e'; // green
  else if (minutesElapsed > 10) color = '#84cc16'; // lime
  
  return L.divIcon({
    html: `<div style="position:relative;width:36px;height:48px;display:flex;align-items:center;justify-content:center">
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48" fill="${color}" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2))">
        <path d="M18 0C8 0 0 8 0 18c0 18 18 30 18 30s18-12 18-30c0-10-8-18-18-18z"/>
        <circle cx="18" cy="18" r="7" fill="white"/>
      </svg>
    </div>`,
    iconSize: [36, 48], iconAnchor: [18, 48], className: ''
  });
};

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
  const [driverInventories, setDriverInventories] = useState({});
  const [ageFilter, setAgeFilter] = useState('all');

  const DEFAULT_CENTER = [37.7749, -122.4194];
  const today = format(new Date(), 'yyyy-MM-dd');

  const load = useCallback(async () => {
    const [dList, allOrders] = await Promise.all([
      base44.entities.Driver.filter({ status: 'on_shift' }),
      base44.entities.Order.list('-created_date', 200),
    ]);
    const oList = allOrders.filter(o => !['delivered', 'cancelled'].includes(o.status));
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

  const getOrderAge = (order) => {
    const now = new Date();
    const orderTime = new Date(order.created_date);
    return Math.floor((now - orderTime) / (1000 * 60)); // minutes
  };

  const getAgeCategory = (minutes) => {
    if (minutes > 60) return 'very_late';
    if (minutes > 30) return 'late';
    if (minutes > 10) return 'aging';
    return 'fresh';
  };

  const allActiveOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  
  const canServiceOrder = (order) => {
    if (!selectedDriver) return true;
    const driverInv = driverInventories[selectedDriver.id] || [];
    const invMap = {};
    driverInv.forEach(inv => {
      const remaining = (inv.quantity_loaded || 0) - (inv.quantity_sold || 0) - (inv.quantity_spoiled || 0);
      invMap[inv.menu_item_name] = remaining;
    });
    return (order.items || []).every(item => (invMap[item.name] || 0) >= item.quantity);
  };
  
  const filteredOrders = ageFilter === 'all' 
    ? allActiveOrders.filter(o => canServiceOrder(o))
    : allActiveOrders.filter(o => canServiceOrder(o) && getAgeCategory(getOrderAge(o)) === ageFilter);

  const getDriverStatus = (driver) => {
    const assignedOrders = orders.filter(o => o.driver_id === driver.id && !['delivered', 'cancelled'].includes(o.status));
    if (assignedOrders.length === 0) return 'unassigned';
    if (assignedOrders.some(o => ['accepted', 'in_transit'].includes(o.status))) return 'accepted';
    return 'assigned';
  };

  const hasAssignedNotAccepted = (driver) => {
    return orders.some(o => o.driver_id === driver.id && o.status === 'assigned');
  };

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
    <div className="flex flex-col bg-foreground" style={{ height: 'calc(100vh - 3.5rem)' }}>
      <style>{DARK_POPUP_CSS}</style>
      {/* Top bar */}
      <div className="px-6 py-4 border-b border-foreground/10 bg-white flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-sans text-xl font-bold text-foreground">Dispatch</h1>
          <p className="text-xs text-foreground/60">{drivers.length} active · {allActiveOrders.length} pending</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 bg-foreground/5 border border-foreground/10 rounded-lg px-2 py-1">
             <Filter className="w-3.5 h-3.5 text-foreground/60" />
             <select
               value={ageFilter}
               onChange={e => setAgeFilter(e.target.value)}
               className="bg-transparent text-xs font-medium text-foreground outline-none"
             >
               <option value="all">All Orders</option>
               <option value="fresh">Fresh (&lt;10m)</option>
               <option value="aging">Aging (10-30m)</option>
               <option value="late">Late (30-60m)</option>
               <option value="very_late">Very Late (&gt;60m)</option>
             </select>
           </div>
           {selectedDriver && (
             <div className="flex items-center gap-2 bg-foreground/5 border border-foreground/10 px-3 py-1.5 rounded-lg">
               <div className="w-2 h-2 rounded-full bg-foreground/40 animate-pulse" />
               <span className="text-sm font-medium text-foreground">{selectedDriver.full_name}</span>
               <button onClick={() => setSelectedDriver(null)} className="text-foreground/60 hover:text-foreground ml-1 text-lg leading-none">&times;</button>
             </div>
           )}
           <Button className="bg-foreground text-background hover:bg-foreground/90" size="sm" onClick={load}>Refresh</Button>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="md:hidden flex border-b border-border bg-foreground">
        {['map', 'drivers', 'orders'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? 'border-b-2 border-background text-background' : 'text-background/60'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className={`flex-1 relative ${tab !== 'map' ? 'hidden md:block' : ''}`}>
          <MapContainer center={DEFAULT_CENTER} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
            {drivers.map(driver => {
              if (!selectedDriver || selectedDriver.id === driver.id) {
                return driver.latitude && driver.longitude ? (
                  <Marker
                    key={driver.id}
                    position={[driver.latitude, driver.longitude]}
                    icon={createDriverIcon(getDriverStatus(driver), hasAssignedNotAccepted(driver), selectedDriver?.id === driver.id)}
                    eventHandlers={{ click: () => setSelectedDriver(driver) }}
                  >
                    <Popup>
                     <div className="text-sm min-w-[160px] bg-gray-900 text-white rounded p-2 -m-3">
                       <p className="font-bold mb-0.5">{driver.full_name}</p>
                       <p className="text-white/50 text-xs mb-2">{driver.city} · {driver.vehicle_plate}</p>
                       <p className="text-xs font-semibold text-white/70 mb-1">Inventory remaining:</p>
                       {(driverInventories[driver.id] || []).length === 0 ? (
                         <p className="text-xs text-white/40 italic">No inventory loaded</p>
                       ) : (
                         <div className="flex flex-col gap-1">
                           {(driverInventories[driver.id] || []).map(item => {
                             const rem = (item.quantity_loaded || 0) - (item.quantity_sold || 0) - (item.quantity_spoiled || 0);
                             return (
                               <div key={item.id} className="flex items-center justify-between gap-2">
                                 <span className="text-xs text-white/80">{item.menu_item_name}</span>
                                 <span className={`text-xs font-bold ${rem === 0 ? 'text-red-400' : rem <= 2 ? 'text-yellow-400' : 'text-green-400'}`}>{rem}</span>
                               </div>
                             );
                           })}
                         </div>
                       )}
                     </div>
                    </Popup>
                  </Marker>
                ) : null;
              }
              return null;
            })}
            {filteredOrders.map(order => (
               order.delivery_latitude && order.delivery_longitude ? (
                <Marker
                  key={order.id}
                  position={[order.delivery_latitude, order.delivery_longitude]}
                  icon={createOrderIcon(order)}
                >
                  <Popup>
                    <div className="text-sm min-w-[160px] bg-gray-900 text-white rounded p-2 -m-3">
                      <p className="font-bold mb-0.5">{order.customer_name}</p>
                      <p className="text-white/50 text-xs mb-2">{order.delivery_address}</p>
                      <div className="flex flex-col gap-0.5 mb-2">
                        {(order.items || []).map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-white/80">{item.name}</span>
                            <span className="text-white/50 ml-2">×{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                      {selectedDriver && order.status === 'pending' && (
                        <button
                          onClick={() => assignOrder(order)}
                          disabled={assigning === order.id}
                          className="mt-2 w-full bg-white text-gray-900 rounded px-2 py-1 text-xs font-medium hover:bg-white/90"
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
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background border border-foreground px-4 py-2 rounded-full text-sm text-foreground shadow-md pointer-events-none">
              Select a driver, then click an order to assign
            </div>
          )}
        </div>

        {/* Right Panel - side by side columns */}
        <div className={`w-full md:w-[640px] border-l border-border bg-background flex overflow-hidden ${tab === 'map' ? 'hidden md:flex' : tab === 'map' ? 'hidden' : 'flex'}`}>

          {/* Drivers with inventory */}
          <div className={`flex flex-col w-1/2 border-r border-border overflow-hidden ${tab === 'orders' ? 'hidden md:flex' : 'flex'}`}>
            <div className="px-4 py-3 border-b border-border bg-foreground shrink-0">
              <p className="text-xs font-semibold text-background/60 uppercase tracking-wide">Active Drivers</p>
            </div>
            <div className="overflow-y-auto flex-1">
              {drivers.length === 0 ? (
                <p className="text-sm text-foreground text-center py-6">No drivers on shift</p>
              ) : drivers.map(driver => (
                <button
                  key={driver.id}
                  onClick={() => setSelectedDriver(selectedDriver?.id === driver.id ? null : driver)}
                  className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors hover:bg-background/90 ${selectedDriver?.id === driver.id ? 'bg-background/80 border-l-2 border-l-foreground' : 'bg-background'}`}
                >
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${selectedDriver?.id === driver.id ? 'bg-foreground' : 'bg-foreground/10'}`}>
                      <Truck className={`w-4 h-4 ${selectedDriver?.id === driver.id ? 'text-background' : 'text-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{driver.full_name}</p>
                      <p className="text-xs text-foreground/60 truncate">{driver.city} · {driver.vehicle_plate}</p>
                    </div>
                    {selectedDriver?.id === driver.id && (
                      <div className="w-2 h-2 rounded-full bg-background shrink-0" />
                    )}
                  </div>
                  <InventoryBar driverId={driver.id} />
                </button>
              ))}
            </div>
          </div>

          {/* Orders with item breakdown */}
          <div className="flex-1 overflow-hidden flex flex-col bg-background w-1/2">
            <div className="px-4 py-3 border-b border-border bg-foreground shrink-0">
              <p className="text-xs font-semibold text-background/60 uppercase tracking-wide">
                {ageFilter === 'all' ? 'Pending Orders' : ageFilter.replace('_', ' ').toUpperCase()}
              </p>
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-8 h-8 text-background mx-auto mb-2" />
                  <p className="text-sm text-foreground">{ageFilter === 'all' ? 'All orders handled!' : 'No orders in this category'}</p>
                </div>
              ) : filteredOrders.map(order => (
                <div key={order.id} className="px-4 py-3 border-b border-border/50 bg-background hover:bg-background/80 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{order.customer_name || 'Customer'}</p>
                      {order.status === 'assigned' && (
                        <p className="text-xs text-amber-600 font-medium mt-0.5">⏳ Waiting for driver acceptance</p>
                      )}
                    </div>
                    <span className="font-bold text-sm text-foreground whitespace-nowrap">${order.total?.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-foreground/60 mb-2 line-clamp-1">{order.delivery_address}</p>
                  <div className="bg-foreground/5 rounded-lg px-2.5 py-2 mb-2 space-y-1">
                    {(order.items || []).map((item, i) => {
                      const CatIcon = CATEGORY_ICON_COMPONENTS[item.category] || Beef;
                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-foreground">
                            <CatIcon className="w-3 h-3 text-foreground shrink-0" />
                            <span className="truncate max-w-[100px]">{item.name}</span>
                          </span>
                          <span className="text-foreground/60 shrink-0">×{item.quantity}</span>
                        </div>
                      );
                    })}
                  </div>
                  {order.special_instructions && (
                    <p className="text-xs text-foreground/60 italic mb-2">📝 {order.special_instructions}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status]}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                    {selectedDriver && order.status === 'pending' && (
                      <button
                        onClick={() => assignOrder(order)}
                        disabled={assigning === order.id}
                        className="text-xs bg-foreground text-background px-3 py-1 rounded-full font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
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