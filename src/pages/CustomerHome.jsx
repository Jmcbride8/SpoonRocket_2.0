import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { ShoppingBag, History, Clock } from 'lucide-react';
import CustomerMenu from './CustomerMenu';
import OrderTracking from './customer/OrderTracking';
import OrderDelivered from './customer/OrderDelivered';
import OrderHistory from './customer/OrderHistory';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'menu', label: 'Menu', icon: ShoppingBag },
  { key: 'tracking', label: 'My Order', icon: Clock },
  { key: 'history', label: 'History', icon: History },
];

export default function CustomerHome() {
  const [tab, setTab] = useState('menu');
  const [user, setUser] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [driver, setDriver] = useState(null);
  const [showDelivered, setShowDelivered] = useState(false);

  const loadActiveOrder = useCallback(async (currentUser) => {
    const email = currentUser?.email;
    if (!email) return;
    // Get most recent non-delivered, non-cancelled order
    const orders = await base44.entities.Order.filter({ customer_email: email }, '-created_date', 10);
    const active = orders.find(o => !['delivered', 'cancelled'].includes(o.status));
    const recentDelivered = orders.find(o => o.status === 'delivered' && !o.customer_rating);

    if (active) {
      setActiveOrder(active);
      // Load driver info if assigned
      if (active.driver_id) {
        const drivers = await base44.entities.Driver.filter({ id: active.driver_id });
        setDriver(drivers[0] || null);
      }
    } else if (recentDelivered && !showDelivered) {
      setActiveOrder(recentDelivered);
      setShowDelivered(true);
      setTab('tracking');
    } else {
      setActiveOrder(null);
      setDriver(null);
    }
  }, [showDelivered]);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      loadActiveOrder(u);
    });
  }, []);

  // Poll active order every 20s
  useEffect(() => {
    if (!user || tab !== 'tracking') return;
    const interval = setInterval(() => loadActiveOrder(user), 20000);
    return () => clearInterval(interval);
  }, [user, tab, loadActiveOrder]);

  // Switch to tracking tab when order placed
  const handleOrderPlaced = useCallback(() => {
    setTimeout(() => {
      loadActiveOrder(user);
      setTab('tracking');
    }, 1000);
  }, [user, loadActiveOrder]);

  const trackingBadge = activeOrder && !['delivered', 'cancelled'].includes(activeOrder.status);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Tab bar */}
      <div className="sticky top-0 z-20 bg-background border-b border-foreground/10 flex">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors relative",
                isActive ? "text-foreground border-b-2 border-foreground" : "text-foreground/40 hover:text-foreground/70"
              )}
            >
              <div className="relative">
                <Icon className="w-4 h-4" />
                {t.key === 'tracking' && trackingBadge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1">
        {tab === 'menu' && (
          <CustomerMenu onOrderPlaced={handleOrderPlaced} />
        )}

        {tab === 'tracking' && (
          <div className="max-w-lg mx-auto px-4 py-6">
            {showDelivered && activeOrder ? (
              <OrderDelivered
                order={activeOrder}
                onDone={() => {
                  setShowDelivered(false);
                  setActiveOrder(null);
                  setTab('menu');
                }}
              />
            ) : activeOrder ? (
              <OrderTracking order={activeOrder} driver={driver} />
            ) : (
              <div className="text-center py-20">
                <Clock className="w-10 h-10 text-foreground/20 mx-auto mb-3" />
                <p className="font-medium text-foreground mb-1">No active order</p>
                <p className="text-sm text-foreground/50">Place an order to see live tracking here</p>
                <button onClick={() => setTab('menu')} className="mt-4 text-sm text-primary font-medium hover:underline">
                  Browse today's menu →
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'history' && user && (
          <div className="max-w-lg mx-auto px-4 py-6">
            <h2 className="font-semibold text-foreground mb-4">Order History</h2>
            <OrderHistory userEmail={user.email} />
          </div>
        )}
      </div>
    </div>
  );
}