import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { DollarSign, ShoppingBag, Truck, Star, AlertCircle, TrendingUp, CheckCircle, Clock, XCircle, Edit2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, startOfYear, endOfYear } from 'date-fns';

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
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [updatingComplaint, setUpdatingComplaint] = useState(null);
  const [financialPeriod, setFinancialPeriod] = useState('day'); // day, week, ytd
  const [editingOrderStatus, setEditingOrderStatus] = useState(null);
  const [editingDriverOrders, setEditingDriverOrders] = useState(null);
  const [updatingOrder, setUpdatingOrder] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Order.list('-created_date', 500),
      base44.entities.Complaint.list('-created_date', 100),
      base44.entities.Driver.list(),
    ]).then(([o, c, d]) => { setOrders(o); setComplaints(c); setDrivers(d); setLoading(false); });
  }, []);

  const today = format(new Date(), 'yyyy-MM-dd');
  const yearStart = format(startOfYear(new Date()), 'yyyy-MM-dd');
  const weekStart = format(subDays(new Date(), 6), 'yyyy-MM-dd');

  // Calculate financials based on period
  let relevantOrders = [];
  if (financialPeriod === 'day') relevantOrders = orders.filter(o => o.order_date === today);
  else if (financialPeriod === 'week') relevantOrders = orders.filter(o => new Date(o.order_date) >= new Date(weekStart));
  else if (financialPeriod === 'ytd') relevantOrders = orders.filter(o => new Date(o.order_date) >= new Date(yearStart));

  const todayOrders = orders.filter(o => o.order_date === today);
  const totalRevenue = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0);
  const periodRevenue = relevantOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0);
  const periodDelivered = relevantOrders.filter(o => o.status === 'delivered').length;
  const todayRevenue = todayOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0);
  const avgRating = orders.filter(o => o.customer_rating).reduce((s, o, _, a) => s + o.customer_rating / a.length, 0);
  const openComplaints = complaints.filter(c => c.status === 'open').length;

  // Revenue chart data (last 7 days)
  const revenueData = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    const label = format(subDays(new Date(), 6 - i), 'MMM d');
    const rev = orders.filter(o => o.order_date === d && o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0);
    return { date: label, revenue: parseFloat(rev.toFixed(2)) };
  });

  // Weekly revenue (last 4 weeks)
  const weeklyData = Array.from({ length: 4 }, (_, i) => {
    const end = subDays(new Date(), i * 7);
    const start = subDays(end, 7);
    const label = `Week ${4 - i}`;
    const rev = orders.filter(o => {
      const oDate = new Date(o.order_date);
      return oDate >= start && oDate <= end && o.status === 'delivered';
    }).reduce((s, o) => s + (o.total || 0), 0);
    return { week: label, revenue: parseFloat(rev.toFixed(2)) };
  }).reverse();

  // YTD monthly data
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    const monthLabel = new Date(2026, i, 1).toLocaleString('default', { month: 'short' });
    const rev = orders.filter(o => {
      const oDate = new Date(o.order_date);
      return oDate.getMonth() === i && oDate.getFullYear() === 2026 && o.status === 'delivered';
    }).reduce((s, o) => s + (o.total || 0), 0);
    return { month: monthLabel, revenue: parseFloat(rev.toFixed(2)) };
  });

  const statusData = [
    { name: 'Delivered', count: orders.filter(o => o.status === 'delivered').length, fill: '#22c55e' },
    { name: 'In Transit', count: orders.filter(o => o.status === 'in_transit').length, fill: '#9333ea' },
    { name: 'Pending', count: orders.filter(o => o.status === 'pending').length, fill: '#eab308' },
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

  // Customer analytics
  const uniqueCustomers = [...new Set(orders.map(o => o.customer_email))].length;
  const customerOrders = orders.reduce((acc, o) => {
    if (!acc[o.customer_email]) {
      acc[o.customer_email] = {
        email: o.customer_email,
        name: o.customer_name,
        orders: 0,
        totalSpent: 0,
        lastOrder: o.order_date,
        avgRating: [],
      };
    }
    acc[o.customer_email].orders += 1;
    acc[o.customer_email].totalSpent += o.total || 0;
    acc[o.customer_email].lastOrder = new Date(o.order_date) > new Date(acc[o.customer_email].lastOrder) ? o.order_date : acc[o.customer_email].lastOrder;
    if (o.customer_rating) acc[o.customer_email].avgRating.push(o.customer_rating);
    return acc;
  }, {});

  const customerList = Object.values(customerOrders).sort((a, b) => new Date(b.lastOrder) - new Date(a.lastOrder));
  const totalLTV = customerList.reduce((s, c) => s + c.totalSpent, 0);
  const avgLTV = uniqueCustomers > 0 ? totalLTV / uniqueCustomers : 0;
  const repeatCustomers = customerList.filter(c => c.orders > 1).length;

  const updateOrderStatus = async (orderId, newStatus) => {
    setUpdatingOrder(orderId);
    await base44.entities.Order.update(orderId, { status: newStatus });
    const updated = await base44.entities.Order.list('-created_date', 500);
    setOrders(updated);
    setEditingOrderStatus(null);
    setUpdatingOrder(null);
  };

  const updateDriverOrder = async (orderId, newDriverId) => {
    setUpdatingOrder(orderId);
    const selectedDriver = drivers.find(d => d.id === newDriverId);
    await base44.entities.Order.update(orderId, { driver_id: newDriverId, driver_name: selectedDriver.full_name });
    const updated = await base44.entities.Order.list('-created_date', 500);
    setOrders(updated);
    setEditingDriverOrders(null);
    setUpdatingOrder(null);
  };

  const tabs = ['overview', 'orders', 'customers', 'drivers', 'complaints'];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto bg-background">
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
              {/* Financial Period Selector */}
              <div className="flex gap-2 mb-6">
                {['day', 'week', 'ytd'].map(period => (
                  <button
                    key={period}
                    onClick={() => setFinancialPeriod(period)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      financialPeriod === period
                        ? 'bg-foreground text-background'
                        : 'bg-foreground/10 text-foreground hover:bg-foreground/20'
                    }`}
                  >
                    {period === 'day' ? 'Today' : period === 'week' ? 'This Week' : 'Year to Date'}
                  </button>
                ))}
              </div>

              {/* Top Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                  icon={DollarSign}
                  label={financialPeriod === 'day' ? "Today's Revenue" : financialPeriod === 'week' ? "Weekly Revenue" : "YTD Revenue"}
                  value={`$${periodRevenue.toFixed(0)}`}
                  sub={`${periodDelivered} delivered`}
                  color="bg-green-100 text-green-700"
                />
                <StatCard
                  icon={ShoppingBag}
                  label={financialPeriod === 'day' ? "Today's Orders" : financialPeriod === 'week' ? "Weekly Orders" : "YTD Orders"}
                  value={relevantOrders.length}
                  sub={`${relevantOrders.filter(o => o.status === 'delivered').length} delivered`}
                  color="bg-blue-100 text-blue-700"
                />
                <StatCard
                  icon={TrendingUp}
                  label="Avg Order Value"
                  value={`$${periodDelivered > 0 ? (periodRevenue / periodDelivered).toFixed(2) : '0'}`}
                  sub={`${periodDelivered} total`}
                  color="bg-purple-100 text-purple-700"
                />
                <StatCard
                  icon={Star}
                  label="Avg Rating"
                  value={avgRating > 0 ? avgRating.toFixed(1) : '—'}
                  sub="Customer satisfaction"
                  color="bg-yellow-100 text-yellow-700"
                />
              </div>

              {/* Charts Grid */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Daily Revenue (7 days) */}
                <div className="bg-background border border-foreground/10 rounded-2xl p-5">
                  <h3 className="font-semibold text-sm mb-4 text-foreground">Revenue - Last 7 Days</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20% / 0.1)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" />
                      <YAxis tick={{ fontSize: 11 }} stroke="currentColor" />
                      <Tooltip formatter={(v) => [`$${v}`, 'Revenue']} />
                      <Line type="monotone" dataKey="revenue" stroke="currentColor" strokeWidth={2} dot={{ fill: 'currentColor' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Weekly Revenue (last 4 weeks) */}
                <div className="bg-background border border-foreground/10 rounded-2xl p-5">
                  <h3 className="font-semibold text-sm mb-4 text-foreground">Revenue - Last 4 Weeks</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20% / 0.1)" />
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="currentColor" />
                      <YAxis tick={{ fontSize: 11 }} stroke="currentColor" />
                      <Tooltip formatter={(v) => [`$${v}`, 'Revenue']} />
                      <Bar dataKey="revenue" radius={[4,4,0,0]} fill="currentColor" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* YTD Monthly Breakdown */}
              <div className="bg-background border border-foreground/10 rounded-2xl p-5 mb-6">
                <h3 className="font-semibold text-sm mb-4 text-foreground">Year to Date - Monthly Breakdown</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20% / 0.1)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="currentColor" />
                    <YAxis tick={{ fontSize: 11 }} stroke="currentColor" />
                    <Tooltip formatter={(v) => [`$${v}`, 'Revenue']} />
                    <Bar dataKey="revenue" radius={[4,4,0,0]} fill="currentColor" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Order Status Breakdown */}
              <div className="bg-background border border-foreground/10 rounded-2xl p-5">
                <h3 className="font-semibold text-sm mb-4 text-foreground">Order Status Breakdown (All Time)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={statusData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="currentColor" />
                    <YAxis tick={{ fontSize: 11 }} stroke="currentColor" />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4,4,0,0]} fill="currentColor" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {activeTab === 'customers' && (
            <>
              {/* Customer KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                  icon={ShoppingBag}
                  label="Total Customers"
                  value={uniqueCustomers}
                  sub={`${repeatCustomers} returning`}
                  color="bg-blue-100 text-blue-700"
                />
                <StatCard
                  icon={DollarSign}
                  label="Total LTV"
                  value={`$${totalLTV.toFixed(0)}`}
                  sub={`${orders.length} orders`}
                  color="bg-green-100 text-green-700"
                />
                <StatCard
                  icon={TrendingUp}
                  label="Avg LTV"
                  value={`$${avgLTV.toFixed(2)}`}
                  sub={`${uniqueCustomers > 0 ? (totalLTV / orders.length).toFixed(2) : '0'} avg order`}
                  color="bg-purple-100 text-purple-700"
                />
                <StatCard
                  icon={Star}
                  label="Repeat Rate"
                  value={`${uniqueCustomers > 0 ? ((repeatCustomers / uniqueCustomers) * 100).toFixed(0) : '0'}%`}
                  sub={`${repeatCustomers} customers`}
                  color="bg-yellow-100 text-yellow-700"
                />
              </div>

              {/* Customer Table */}
              <div className="bg-background border border-foreground/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-foreground/10 bg-foreground/3">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-foreground/60 uppercase tracking-wide">Customer</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-foreground/60 uppercase tracking-wide">Orders</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-foreground/60 uppercase tracking-wide">Lifetime Value</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-foreground/60 uppercase tracking-wide">Avg Order</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-foreground/60 uppercase tracking-wide">Last Ordered</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-foreground/60 uppercase tracking-wide">Avg Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerList.map(cust => (
                        <tr key={cust.email} className="border-b border-foreground/10 hover:bg-foreground/3 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{cust.name || cust.email}</p>
                            <p className="text-xs text-foreground/60">{cust.email}</p>
                          </td>
                          <td className="px-4 py-3 text-foreground font-medium">{cust.orders}</td>
                          <td className="px-4 py-3 text-foreground font-semibold">${cust.totalSpent.toFixed(2)}</td>
                          <td className="px-4 py-3 text-foreground/60">${(cust.totalSpent / cust.orders).toFixed(2)}</td>
                          <td className="px-4 py-3 text-foreground/60">{cust.lastOrder}</td>
                          <td className="px-4 py-3">
                            {cust.avgRating.length > 0 ? (
                              <span className="flex items-center gap-1 text-yellow-600">
                                ⭐ {(cust.avgRating.reduce((a, b) => a + b, 0) / cust.avgRating.length).toFixed(1)}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                      <th className="text-left px-4 py-3 text-xs font-semibold text-foreground/60 uppercase tracking-wide">Actions</th>
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
                          {editingOrderStatus === order.id ? (
                            <Select value={order.status} onValueChange={(val) => updateOrderStatus(order.id, val)}>
                              <SelectTrigger className="w-32 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="assigned">Assigned</SelectItem>
                                <SelectItem value="accepted">Accepted</SelectItem>
                                <SelectItem value="in_transit">In Transit</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                              order.status === 'in_transit' ? 'bg-purple-100 text-purple-700' :
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {order.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {order.customer_rating ? (
                            <span className="flex items-center gap-1 text-yellow-600">
                              ⭐ {order.customer_rating}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingOrderStatus(editingOrderStatus === order.id ? null : order.id)} disabled={updatingOrder === order.id}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'drivers' && (
            <div className="space-y-4">
              {drivers.map(driver => {
                const driverOrders = orders.filter(o => o.driver_id === driver.id && !['delivered', 'assigned', 'cancelled'].includes(o.status));
                return (
                  <div key={driver.id} className="bg-background border border-foreground/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-foreground">{driver.full_name}</p>
                        <p className="text-xs text-foreground/60">{driver.city} · {driver.vehicle_plate}</p>
                      </div>
                      <Badge className={`${
                        driver.status === 'on_shift' ? 'bg-green-100 text-green-700' :
                        driver.status === 'delivering' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {driver.status}
                      </Badge>
                    </div>

                    {driverOrders.length === 0 ? (
                      <p className="text-xs text-foreground/60 italic">No assigned orders</p>
                    ) : (
                      <div className="space-y-2">
                        {driverOrders.map(order => (
                          <div key={order.id} className={`rounded-lg p-3 flex flex-col gap-2 ${editingDriverOrders === order.id ? 'bg-foreground/5 border border-foreground/20' : 'bg-foreground/3'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{order.customer_name}</p>
                                <p className="text-xs text-foreground/60 truncate">{order.delivery_address}</p>
                              </div>
                              <Button size="icon" variant="ghost" className="h-6 w-6 ml-2 shrink-0" onClick={() => setEditingDriverOrders(editingDriverOrders === order.id ? null : order.id)} disabled={updatingOrder === order.id}>
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            </div>

                            {editingDriverOrders === order.id && (
                              <div className="space-y-2 pt-2 border-t border-foreground/10">
                                <div>
                                  <label className="text-xs font-medium text-foreground/60 block mb-1">Driver</label>
                                  <Select value={order.driver_id || ''} onValueChange={(val) => updateDriverOrder(order.id, val)}>
                                    <SelectTrigger className="w-full h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {drivers.map(d => (
                                        <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-foreground/60 block mb-1">Status</label>
                                  <Select value={order.status} onValueChange={(val) => updateOrderStatus(order.id, val)}>
                                    <SelectTrigger className="w-full h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Pending</SelectItem>
                                      <SelectItem value="assigned">Assigned</SelectItem>
                                      <SelectItem value="accepted">Accepted</SelectItem>
                                      <SelectItem value="in_transit">In Transit</SelectItem>
                                      <SelectItem value="delivered">Delivered</SelectItem>
                                      <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}

                            {editingDriverOrders !== order.id && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-foreground/60">Status:</span>
                                <span className="px-2 py-1 rounded bg-foreground/10 text-foreground font-medium">{order.status}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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