import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { BarChart3, ShoppingBag, Truck, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Company View', icon: BarChart3, route: '/management' },
  { value: 'user', label: 'Customer View', icon: ShoppingBag, route: '/' },
  { value: 'driver', label: 'Driver View', icon: Truck, route: '/driver' },
];

export default function RoleSwitcher({ currentRole }) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const { checkUserAuth } = useAuth();
  const navigate = useNavigate();

  const current = ROLE_OPTIONS.find(r => r.value === currentRole) || ROLE_OPTIONS[0];

  const switchRole = async (role) => {
    if (role.value === currentRole) { setOpen(false); return; }
    setSwitching(true);
    setOpen(false);
    await base44.auth.updateMe({ role: role.value });
    await checkUserAuth();
    navigate(role.route);
    setSwitching(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={switching}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/10 hover:bg-background/20 transition-colors text-background text-xs font-medium"
      >
        <current.icon className="w-3.5 h-3.5" />
        <span>{switching ? 'Switching...' : current.label}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 bottom-full mb-2 w-44 bg-white rounded-xl shadow-xl border border-border z-50 overflow-hidden">
            {ROLE_OPTIONS.map(role => {
              const Icon = role.icon;
              const active = role.value === currentRole;
              return (
                <button
                  key={role.value}
                  onClick={() => switchRole(role)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left",
                    active ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-foreground/5"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {role.label}
                  {active && <span className="ml-auto text-xs text-primary">●</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}