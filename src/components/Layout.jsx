import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useState } from 'react';
import {
  ChefHat, Map, BarChart3, Truck, Settings, ShoppingBag,
  Menu, X, LogOut, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const adminLinks = [
  { to: '/menu', label: 'Daily Menu', icon: ChefHat },
  { to: '/dispatch', label: 'Dispatch', icon: Map },
  { to: '/management', label: 'Management', icon: BarChart3 },
  { to: '/operations', label: 'Operations', icon: Settings },
];

const driverLinks = [
  { to: '/driver', label: 'My Shift', icon: Truck },
];

const customerLinks = [
  { to: '/', label: 'Order', icon: ShoppingBag },
];

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = user?.role === 'admin'
    ? adminLinks
    : user?.role === 'driver'
    ? driverLinks
    : customerLinks;

  const handleLogout = () => base44.auth.logout('/');

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-60 bg-card border-r border-border shrink-0">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-playfair font-bold text-lg text-foreground">SpoonDash</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                location.pathname === to || location.pathname.startsWith(to + '/')
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-7 h-7 bg-accent rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{user?.full_name || user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role || 'customer'}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <ChefHat className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-playfair font-bold text-base">SpoonDash</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border p-4 pt-16" onClick={e => e.stopPropagation()}>
            <nav className="space-y-1">
              {links.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    location.pathname === to
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 pt-4 border-t border-border">
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto md:pt-0 pt-14">
        <Outlet />
      </main>
    </div>
  );
}