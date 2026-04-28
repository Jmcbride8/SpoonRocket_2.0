import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, Plus, Minus, X, ChefHat, Star, Leaf, Droplets, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const CATEGORY_ICONS = {
  meat: '🥩',
  salad: '🥗',
  drink: '🥤',
  smoothie: '🥤',
};

const CATEGORY_LABELS = {
  meat: 'Main',
  salad: 'Salad',
  drink: 'Drink',
  smoothie: 'Smoothie',
};

const CATEGORY_COLORS = {
  meat: 'bg-orange-50 border-orange-200 text-orange-800',
  salad: 'bg-green-50 border-green-200 text-green-800',
  drink: 'bg-blue-50 border-blue-200 text-blue-800',
  smoothie: 'bg-purple-50 border-purple-200 text-purple-800',
};

export default function CustomerMenu() {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [address, setAddress] = useState('');
  const [instructions, setInstructions] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    base44.entities.MenuItem.filter({ menu_date: today, is_active: true }).then(setMenuItems).finally(() => setLoading(false));
  }, []);

  const addToCart = (item) => {
    setCart(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
  };

  const removeFromCart = (item) => {
    setCart(prev => {
      const updated = { ...prev };
      if (updated[item.id] <= 1) delete updated[item.id];
      else updated[item.id]--;
      return updated;
    });
  };

  const cartItems = menuItems.filter(item => cart[item.id]);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * cart[item.id], 0);
  const deliveryFee = 1.99;
  const total = subtotal + deliveryFee;
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const handleCheckout = async () => {
    if (!address.trim()) return alert('Please enter your delivery address.');
    setCheckingOut(true);
    const user = await base44.auth.me();
    await base44.entities.Order.create({
      customer_email: user.email,
      customer_name: user.full_name,
      delivery_address: address,
      city: 'San Francisco',
      items: cartItems.map(item => ({
        menu_item_id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        quantity: cart[item.id],
      })),
      subtotal,
      delivery_fee: deliveryFee,
      total,
      status: 'pending',
      payment_status: 'pending',
      special_instructions: instructions,
      order_date: today,
    });
    setCart({});
    setShowCart(false);
    setCheckingOut(false);
    setAddress('');
    setInstructions('');
    alert('Order placed! Your food is on its way 🎉');
  };

  const categories = ['meat', 'salad', 'drink', 'smoothie'];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative bg-primary overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-8 text-8xl">🍽️</div>
          <div className="absolute bottom-2 left-12 text-6xl">✨</div>
        </div>
        <div className="relative max-w-2xl mx-auto px-6 py-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <ChefHat className="w-6 h-6 text-primary-foreground/80" />
            <span className="text-primary-foreground/80 text-sm font-medium tracking-widest uppercase">SpoonDash</span>
          </div>
          <h1 className="font-playfair text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
            Today's Menu
          </h1>
          <p className="text-primary-foreground/70 text-sm">
            {format(new Date(), 'EEEE, MMMM d')} · Fresh & delivered to your door
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-32 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : menuItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🍽️</div>
            <h2 className="font-playfair text-2xl font-semibold text-foreground mb-2">No menu today</h2>
            <p className="text-muted-foreground">Check back soon — we update daily!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {categories.map(cat => {
              const items = menuItems.filter(m => m.category === cat);
              if (!items.length) return null;
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{CATEGORY_ICONS[cat]}</span>
                    <h2 className="font-semibold text-foreground">{CATEGORY_LABELS[cat]}</h2>
                  </div>
                  <div className="space-y-3">
                    {items.map(item => (
                      <div key={item.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex gap-4 p-4">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-24 h-24 object-cover rounded-xl flex-shrink-0" />
                          ) : (
                            <div className="w-24 h-24 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0 text-3xl">
                              {CATEGORY_ICONS[cat]}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-foreground text-base leading-tight">{item.name}</h3>
                              <span className="font-bold text-primary text-lg whitespace-nowrap">${item.price.toFixed(2)}</span>
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                            )}
                            {item.calories && (
                              <p className="text-xs text-muted-foreground mt-1">{item.calories} cal</p>
                            )}
                            <div className="flex items-center gap-2 mt-3">
                              {cart[item.id] ? (
                                <div className="flex items-center gap-2">
                                  <button onClick={() => removeFromCart(item)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-5 text-center font-semibold text-sm">{cart[item.id]}</span>
                                  <button onClick={() => addToCart(item)} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors">
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => addToCart(item)} className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors">
                                  <Plus className="w-3.5 h-3.5" />
                                  Add
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart button */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={() => setShowCart(true)}
            className="flex items-center gap-3 bg-primary text-primary-foreground px-6 py-3.5 rounded-full shadow-xl font-medium text-sm hover:bg-primary/90 transition-all hover:scale-105"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>View order · {cartCount} item{cartCount !== 1 ? 's' : ''}</span>
            <span className="font-bold">${total.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center" onClick={() => setShowCart(false)}>
          <div className="bg-card w-full max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-playfair text-xl font-bold">Your Order</h2>
              <button onClick={() => setShowCart(false)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              {cartItems.map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{CATEGORY_ICONS[item.category]}</span>
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} each</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeFromCart(item)} className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-semibold w-4 text-center">{cart[item.id]}</span>
                    <button onClick={() => addToCart(item)} className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 mb-4">
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground mb-3">
                <span>Delivery fee</span><span>${deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base">
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <input
                type="text"
                placeholder="Delivery address *"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-4 py-3 border border-input rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Textarea
                placeholder="Special instructions (optional)"
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                className="resize-none text-sm"
                rows={2}
              />
            </div>

            <Button
              onClick={handleCheckout}
              disabled={checkingOut || !address.trim()}
              className="w-full rounded-xl py-3 text-base font-semibold"
            >
              {checkingOut ? 'Placing order...' : `Place Order · $${total.toFixed(2)}`}
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-2">Stripe payment coming soon · Demo mode</p>
          </div>
        </div>
      )}
    </div>
  );
}