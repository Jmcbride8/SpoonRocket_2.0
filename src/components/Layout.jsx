import { Outlet, Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useState } from 'react';
import {
  ChefHat, Map, BarChart3, Truck, Settings, ShoppingBag,
  Menu, X, LogOut, User, Package, Clock, History
} from 'lucide-react';
import RoleSwitcher from './RoleSwitcher';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CustomerTabProvider, useCustomerTab } from '@/lib/CustomerTabContext';

const adminLinks = [
  { to: '/management', label: 'Management', icon: BarChart3 },
  { to: '/dispatch', label: 'Dispatch', icon: Map },
  { to: '/operations', label: 'Operations', icon: Settings },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/recipe-library', label: 'Recipes', icon: ChefHat },
  { to: '/menu-planner', label: 'Planner', icon: Package },
];

const driverLinks = [
  { to: '/driver', label: 'My Shift', icon: Truck },
];

const customerTabs = [
  { key: 'menu', label: 'Menu', icon: ShoppingBag },
  { key: 'tracking', label: 'My Order', icon: Clock },
  { key: 'history', label: 'History', icon: History },
];

function DrawerMenu({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute right-0 top-0 bottom-0 w-72 bg-foreground border-l border-foreground/10 flex flex-col pt-16"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function CustomerLayoutContent() {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { tab, setTab, trackingBadge } = useCustomerTab();

  const handleLogout = () => base44.auth.logout('/');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-foreground border-b border-foreground/10 h-14 flex items-center px-4 md:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 bg-background rounded-lg flex items-center justify-center">
            <ChefHat className="w-3.5 h-3.5 text-foreground" />
          </div>
          <span className="font-sans font-bold text-base text-background">SpoonDash</span>
        </div>

        {/* Hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto shrink-0"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu className="w-5 h-5 text-background" />
        </Button>
      </header>

      {/* Drawer */}
      <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="flex items-center justify-between px-5 pb-4 border-b border-foreground/10">
          <div>
            <p className="text-sm font-semibold text-background">{user?.full_name || user?.email}</p>
            <p className="text-xs text-background/50 capitalize">customer</p>
          </div>
          <button onClick={() => setDrawerOpen(false)}>
            <X className="w-5 h-5 text-background/60" />
          </button>
        </div>
        <div className="flex-1 p-4 space-y-1">
          {customerTabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setDrawerOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                tab === key
                  ? "bg-background/10 text-background"
                  : "text-background/60 hover:text-background hover:bg-foreground/10"
              )}
            >
              <div className="relative">
                <Icon className="w-4 h-4" />
                {key === 'tracking' && trackingBadge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
              {label}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-foreground/10 space-y-3">
          <RoleSwitcher currentRole={user?.role} />
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-background/60 hover:text-background hover:bg-foreground/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </DrawerMenu>

      {/* Main content */}
      <main className="flex-1 pt-14">
        <Outlet />
      </main>
    </div>
  );
}

function AdminDriverLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const links = user?.role === 'admin' ? adminLinks : driverLinks;
  const handleLogout = () => base44.auth.logout('/');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-foreground border-b border-foreground/10 h-14 flex items-center px-4 md:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 bg-background rounded-lg flex items-center justify-center">
            <ChefHat className="w-3.5 h-3.5 text-foreground" />
          </div>
          <span className="font-sans font-bold text-base text-background">SpoonDash</span>
        </div>

        {/* Nav links - scrollable on small screens */}
        <nav className="flex items-center gap-1 ml-6 overflow-x-auto no-scrollbar">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0",
                location.pathname === to || location.pathname.startsWith(to + '/')
                  ? "bg-background text-foreground"
                  : "text-background/60 hover:text-background hover:bg-foreground/10"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>

        {/* Hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto shrink-0"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu className="w-5 h-5 text-background" />
        </Button>
      </header>

      {/* Drawer */}
      <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="flex items-center justify-between px-5 pb-4 border-b border-foreground/10">
          <div>
            <p className="text-sm font-semibold text-background">{user?.full_name || user?.email}</p>
            <p className="text-xs text-background/50 capitalize">{user?.role}</p>
          </div>
          <button onClick={() => setDrawerOpen(false)}>
            <X className="w-5 h-5 text-background/60" />
          </button>
        </div>
        <div className="flex-1 p-4 space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setDrawerOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                location.pathname === to
                  ? "bg-background/10 text-background"
                  : "text-background/60 hover:text-background hover:bg-foreground/10"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>
        <div className="p-4 border-t border-foreground/10 space-y-3">
          <RoleSwitcher currentRole={user?.role} />
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-background/60 hover:text-background hover:bg-foreground/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </DrawerMenu>

      {/* Main content */}
      <main className="flex-1 pt-14">
        <Outlet />
      </main>
    </div>
  );
}

export default function Layout() {
  const { user } = useAuth();
  const isCustomer = !user?.role || user?.role === 'user';

  if (isCustomer) {
    return (
      <CustomerTabProvider>
        <CustomerLayoutContent />
      </CustomerTabProvider>
    );
  }

  return <AdminDriverLayout />;
}