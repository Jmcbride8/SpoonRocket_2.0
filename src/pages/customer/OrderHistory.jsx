import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Star, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

export default function OrderHistory({ userEmail }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [rating, setRating] = useState({});
  const [hover, setHover] = useState({});
  const [review, setReview] = useState({});
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    base44.entities.Order.filter({ customer_email: userEmail }, '-created_date', 50)
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [userEmail]);

  const submitReview = async (orderId) => {
    setSaving(orderId);
    await base44.entities.Order.update(orderId, {
      customer_rating: rating[orderId],
      customer_review: review[orderId] || '',
    });
    setOrders(prev => prev.map(o => o.id === orderId
      ? { ...o, customer_rating: rating[orderId], customer_review: review[orderId] || '' }
      : o
    ));
    setSaving(null);
  };

  const STATUS_COLORS = {
    pending: 'bg-yellow-100 text-yellow-800',
    assigned: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    in_transit: 'bg-purple-100 text-purple-800',
    delivered: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-800',
  };

  if (loading) return (
    <div className="space-y-3">
      {[1,2,3].map(i => <div key={i} className="h-24 bg-foreground/5 rounded-2xl animate-pulse" />)}
    </div>
  );

  if (orders.length === 0) return (
    <div className="text-center py-16">
      <Package className="w-10 h-10 text-foreground/20 mx-auto mb-3" />
      <p className="text-foreground/60 text-sm">No orders yet. Place your first order!</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {orders.map(order => (
        <div key={order.id} className="bg-background border border-foreground/10 rounded-2xl overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === order.id ? null : order.id)}
            className="w-full text-left p-4 flex items-start justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                  {order.status?.replace('_', ' ')}
                </span>
                <span className="text-xs text-foreground/50">
                  {order.created_date ? format(new Date(order.created_date), 'MMM d, h:mm a') : ''}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground truncate">
                {order.items?.map(i => i.name).join(', ')}
              </p>
              <p className="text-xs text-foreground/50 mt-0.5">${order.total?.toFixed(2)} · {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</p>
              {order.customer_rating && (
                <div className="flex gap-0.5 mt-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`w-3 h-3 ${s <= order.customer_rating ? 'fill-yellow-400 text-yellow-400' : 'text-foreground/20'}`} />
                  ))}
                </div>
              )}
            </div>
            {expanded === order.id ? <ChevronUp className="w-4 h-4 text-foreground/40 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-foreground/40 shrink-0 mt-1" />}
          </button>

          {expanded === order.id && (
            <div className="px-4 pb-4 border-t border-foreground/10 pt-3 space-y-3">
              {/* Items */}
              <div className="space-y-1.5">
                {(order.items || []).map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-foreground/70">{item.name} ×{item.quantity}</span>
                    <span className="text-foreground">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-foreground/50">{order.delivery_address}</p>

              {/* Review section for delivered orders */}
              {order.status === 'delivered' && !order.customer_rating && (
                <div className="pt-3 border-t border-foreground/10 space-y-2">
                  <p className="text-sm font-medium text-foreground">Rate this order</p>
                  <div className="flex gap-1.5">
                    {[1,2,3,4,5].map(star => (
                      <button
                        key={star}
                        onMouseEnter={() => setHover(prev => ({ ...prev, [order.id]: star }))}
                        onMouseLeave={() => setHover(prev => ({ ...prev, [order.id]: 0 }))}
                        onClick={() => setRating(prev => ({ ...prev, [order.id]: star }))}
                      >
                        <Star className={`w-6 h-6 transition-colors ${star <= ((hover[order.id] || rating[order.id]) || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-foreground/20'}`} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    placeholder="Write a review (optional)"
                    value={review[order.id] || ''}
                    onChange={e => setReview(prev => ({ ...prev, [order.id]: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-foreground/10 rounded-xl text-xs bg-foreground/3 text-foreground placeholder-foreground/40 focus:outline-none resize-none"
                  />
                  <button
                    onClick={() => submitReview(order.id)}
                    disabled={saving === order.id || !rating[order.id]}
                    className="text-xs bg-foreground text-background px-4 py-1.5 rounded-full font-medium disabled:opacity-40"
                  >
                    {saving === order.id ? 'Saving...' : 'Submit'}
                  </button>
                </div>
              )}
              {order.customer_review && (
                <p className="text-xs text-foreground/60 italic border-l-2 border-primary/30 pl-2">"{order.customer_review}"</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}