import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { DollarSign, ShoppingBag, Truck, Star, AlertCircle, TrendingUp, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, subDays } from 'date-fns';

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="bg-background border border-foreground/10 rounded-2xl p-5">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-foreground" />
      </div>
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    <p className="text-sm font-medium text-foreground mt-0.5">{label}</p>
    {sub && <p className="text-xs text-foreground/60 mt-0.5">{sub}</p>}
  </div>
);

const COMPLAINT_COLORS = {
  open: 'bg-red-100 text-red-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

export default function ManagementConsole() {
  const [orders, setOrders] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [updatingComplaint, setUpdatingComplaint] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Order.list('-created_date', 200),
      base44.entities.Complaint.list('-created_date', 100),
    ]).then(([o, c]) => { setOrders(o); setComplaints(c); setLoading(false); });
  }, []);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayOrders = orders.filter(o => o.order_date === today);
  const totalRevenue = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0);
  const todayRevenue = todayOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0);
  const avgRating = orders.filter(o => o.customer_rating).reduce((s, o, _, a) => s + o.customer_rating / a.length, 0);
  const openComplaints = complaints.filter(c => c.status === 'open').length;

  // Last 7 days revenue chart
  const revenueData = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    const label = format(subDays(new Date(), 6 - i), 'MMM d');
    const rev = orders.filter(o => o.order_date === d && o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0);
    return { date: label, revenue: parseFloat(rev.toFixed(2)) };
  });

  const statusData = [
    { name: 'Delivered', count: orders.filter(o => o.status === 'delivered').length, fill: '#16a34a' },
    { name: 'In Transit', count: orders.filter(o => o.status === 'in_transit').length, fill: '#9333ea' },
    { name: 'Pending', count: orders.filter(o => o.status === 'pending').length, fill: '#ca8a04' },
    { name: 'Cancelled', count: orders.filter(o => o.status === 'cancelled').length, fill: '#dc2626' },
  ];

  const updateComplaint = async (id, status, resolution = '') => {
    setUpdatingComplaint(id);
    const user = await base44.auth.me();
    await base44.entities.Complaint.update(id, { status, resolution, resolved_by: user.email });
    const updated = await base44.entities.Complaint.list('-created_date', 100);
    setComplaints(updated);
    setUpdatingComplaint(null);
  };

  const tabs = ['overview', 'orders', 'complaints'];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto bg-background">
      <div className="mb-8">
        <h1 className="font-sans text-2xl font-bold text-foreground mb-1">Management Console</h1>
        <p className="text-foreground/60 text-sm">Track deliveries, revenue, and customer feedback</p>
      </div>

      {/* Tabs */}
       <div className="flex gap-1 bg-foreground/5 p-1 rounded-xl w-fit mb-6 border border-foreground/10">
         {tabs.map(t => (
           <button
             key={t}
             onClick={() => setActiveTab(t)}
             className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === t ? 'bg-background shadow-sm text-foreground border border-foreground/10' : 'text-foreground/60 hover:text-foreground'}`}
           >
             {t}
           </button>
         ))}
       </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-foreground/5 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard icon={DollarSign} label="Total Revenue" value={`$${totalRevenue.toFixed(0)}`} sub={`$${todayRevenue.toFixed(0)} today`} color="bg-green-100 text-green-700" />
                <StatCard icon={ShoppingBag} label="Total Orders" value={orders.length} sub={`${todayOrders.length} today`} color="bg-blue-100 text-blue-700" />
                <StatCard icon={Star} label="Avg. Rating" value={avgRating > 0 ? avgRating.toFixed(1) : '—'} sub="Customer satisfaction" color="bg-yellow-100 text-yellow-700" />
                <StatCard icon={AlertCircle} label="Open Complaints" value={openComplaints} sub={`${complaints.length} total`} color="bg-red-100 text-red-700" />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-background border border-foreground/10 rounded-2xl p-5">
                  <h3 className="font-semibold text-sm mb-4 text-foreground">Revenue (Last 7 Days)</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [`$${v}`, 'Revenue']} />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-background border border-foreground/10 rounded-2xl p-5">
                  <h3 className="font-semibold text-sm mb-4 text-foreground">Order Status Breakdown</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={statusData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4,4,0,0]} fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {activeTab === 'orders' && (
            <div className="bg-background border border-foreground/10 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-foreground/10 bg-foreground/3">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-foreground/60 uppercase tracking-wide">Customer</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-foreground/60 uppercase tracking-wide">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-foreground/60 uppercase tracking-wide">Total</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-foreground/60 uppercase tracking-wide">Driver</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-foreground/60 uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-foreground/60 uppercase tracking-wide">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 50).map(order => (
                      <tr key={order.id} className="border-b border-foreground/10 hover:bg-foreground/3 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{order.customer_name || order.customer_email}</p>
                          <p className="text-xs text-foreground/60">{order.delivery_address?.slice(0, 30)}...</p>
                        </td>
                        <td className="px-4 py-3 text-foreground/60">{order.order_date}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">${order.total?.toFixed(2)}</td>
                        <td className="px-4 py-3 text-foreground/60">{order.driver_name || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                            order.status === 'in_transit' ? 'bg-purple-100 text-purple-700' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {order.customer_rating ? (
                            <span className="flex items-center gap-1 text-yellow-600">
                              <Star className="w-3 h-3 fill-current" /> {order.customer_rating}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'complaints' && (
            <div className="space-y-3">
              {complaints.length === 0 ? (
                <div className="text-center py-12 bg-background border border-foreground/10 rounded-2xl">
                  <CheckCircle className="w-10 h-10 text-foreground mx-auto mb-3" />
                  <p className="font-semibold text-foreground">No complaints!</p>
                  <p className="text-foreground/60 text-sm">Keep up the great work</p>
                </div>
              ) : complaints.map(c => (
                <div key={c.id} className="bg-background border border-foreground/10 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <p className="font-medium text-foreground">{c.customer_name || c.customer_email}</p>
                      <p className="text-xs text-foreground/60 capitalize mt-0.5">{c.type?.replace('_', ' ')} · {c.city}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${COMPLAINT_COLORS[c.status]}`}>
                      {c.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mb-3">{c.description}</p>
                  {c.status === 'open' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-foreground/20 text-foreground hover:bg-foreground/5" onClick={() => updateComplaint(c.id, 'under_review')} disabled={updatingComplaint === c.id}>
                        Under Review
                      </Button>
                      <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90" onClick={() => updateComplaint(c.id, 'resolved', 'Issue acknowledged and resolved.')} disabled={updatingComplaint === c.id}>
                        Resolve
                      </Button>
                    </div>
                  )}
                  {c.resolution && <p className="text-xs text-foreground/60 mt-2 italic">Resolution: {c.resolution}</p>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}