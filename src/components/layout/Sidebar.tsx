import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, UserPlus, DoorOpen, History, Home, ChevronLeft, ChevronRight, Truck, LogOut, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/entrada', icon: DoorOpen, label: 'Registrar Entrada' },
  { to: '/visitantes', icon: Users, label: 'Visitantes' },
  { to: '/cadastro', icon: UserPlus, label: 'Novo Cadastro' },
  { to: '/idosos', icon: Home, label: 'Idosos' },
  { to: '/saidas-idosos', icon: LogOut, label: 'Saída Temporária' },
  { to: '/frota', icon: Truck, label: 'Frota' },
  { to: '/historico', icon: History, label: 'Histórico' },
  { to: '/backup', icon: Download, label: 'Backup/Exportar' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn('fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300', collapsed ? 'w-20' : 'w-64')}>
      <div className="flex h-full flex-col">
        <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-4">
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="font-display text-lg font-bold text-sidebar-primary-foreground">Asilo Dom Bosco</h1>
              <p className="text-xs text-sidebar-foreground/70">Controle de Visitantes</p>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200', isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', collapsed && 'justify-center')}>
              <item.icon className={cn('h-5 w-5 shrink-0', collapsed && 'h-6 w-6')} />
              {!collapsed && <span className="animate-fade-in">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          {!collapsed && <p className="text-center text-xs text-sidebar-foreground/60">Sistema Offline v1.0</p>}
        </div>
      </div>
    </aside>
  );
}
