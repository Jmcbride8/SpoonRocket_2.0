import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OrderDelivered({ order, onDone }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!order.customer_rating);

  const handleSubmit = async () => {
    setSaving(true);
    await base44.entities.Order.update(order.id, {
      customer_rating: rating,
      customer_review: review,
    });
    setSaving(false);
    setSaved(true);
  };

  return (
    <div className="flex flex-col items-center text-center gap-6 py-8">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-primary" />
      </div>
      <div>
        <h2 className="font-sans text-2xl font-bold text-foreground mb-1">Order Delivered! 🎉</h2>
        <p className="text-foreground/60 text-sm">Hope you enjoyed your meal</p>
      </div>

      <div className="w-full bg-background border border-foreground/10 rounded-2xl p-5 text-left">
        <p className="text-sm font-medium text-foreground mb-1">{order.items?.map(i => `${i.name} ×${i.quantity}`).join(', ')}</p>
        <p className="text-xs text-foreground/50">{order.delivery_address}</p>
      </div>

      {!saved ? (
        <div className="w-full space-y-4">
          <p className="font-medium text-foreground">How was your order?</p>
          <div className="flex justify-center gap-2">
            {[1,2,3,4,5].map(star => (
              <button
                key={star}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(star)}
              >
                <Star className={`w-8 h-8 transition-colors ${star <= (hover || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-foreground/20'}`} />
              </button>
            ))}
          </div>
          <textarea
            placeholder="Leave a review (optional)"
            value={review}
            onChange={e => setReview(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-foreground/10 rounded-xl text-sm bg-foreground/3 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
          />
          <Button
            onClick={handleSubmit}
            disabled={saving || rating === 0}
            className="w-full bg-foreground text-background rounded-xl"
          >
            {saving ? 'Saving...' : 'Submit Review'}
          </Button>
          <button onClick={onDone} className="text-sm text-foreground/50 hover:text-foreground underline">
            Skip
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-foreground/60">Thanks for your feedback!</p>
          {order.customer_rating && (
            <div className="flex justify-center gap-1">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`w-5 h-5 ${s <= (rating || order.customer_rating) ? 'fill-yellow-400 text-yellow-400' : 'text-foreground/20'}`} />
              ))}
            </div>
          )}
          <Button onClick={onDone} variant="outline" className="mt-2 rounded-xl">
            Back to Menu
          </Button>
        </div>
      )}
    </div>
  );
}