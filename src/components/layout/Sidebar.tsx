import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, UserPlus, DoorOpen, History, Home, ChevronLeft, ChevronRight, Truck, LogOut, Settings, ScrollText, Menu, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const allNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'operador', 'visualizador'] },
  { to: '/entrada', icon: DoorOpen, label: 'Registrar Entrada', roles: ['admin', 'operador'] },
  { to: '/visitantes', icon: Users, label: 'Visitantes', roles: ['admin', 'operador', 'visualizador'] },
  { to: '/cadastro', icon: UserPlus, label: 'Novo Cadastro', roles: ['admin', 'operador'] },
  { to: '/idosos', icon: Home, label: 'Idosos', roles: ['admin', 'operador', 'visualizador'] },
  { to: '/saidas-idosos', icon: LogOut, label: 'Saída Temporária', roles: ['admin', 'operador', 'visualizador'] },
  { to: '/frota', icon: Truck, label: 'Frota', roles: ['admin', 'operador', 'visualizador'] },
  { to: '/historico', icon: History, label: 'Histórico', roles: ['admin', 'operador', 'visualizador'] },
  { to: '/relatorios', icon: FileText, label: 'Relatórios', roles: ['admin', 'operador', 'visualizador'] },
  { to: '/configuracoes', icon: Settings, label: 'Configurações', roles: ['admin'] },
];

const adminOnlyItems = [
  { to: '/auditoria', icon: ScrollText, label: 'Logs de Auditoria' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, role, logout } = useSupabaseAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/auth');
  }
  
  const isAdmin = role === 'admin';
  const navItems = allNavItems.filter(item => item.roles.includes(role || 'visualizador'));

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="font-display text-lg font-bold text-sidebar-primary-foreground">Asilo Dom Bosco</h1>
            <p className="text-xs text-sidebar-foreground/70">Sistema de Portaria</p>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hidden lg:flex">
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200', isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', collapsed && 'justify-center')}>
            <item.icon className={cn('h-5 w-5 shrink-0', collapsed && 'h-6 w-6')} />
            {!collapsed && <span className="animate-fade-in">{item.label}</span>}
          </NavLink>
        ))}
        {isAdmin && adminOnlyItems.map((item) => (
          <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200', isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', collapsed && 'justify-center')}>
            <item.icon className={cn('h-5 w-5 shrink-0', collapsed && 'h-6 w-6')} />
            {!collapsed && <span className="animate-fade-in">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        {!collapsed && profile && (
          <div className="mb-3 px-3">
            <p className="text-sm font-medium text-sidebar-foreground">{profile.nome}</p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{role}</p>
          </div>
        )}
        <Button 
          variant="ghost" 
          onClick={handleLogout} 
          className={cn('w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', collapsed ? 'justify-center' : 'justify-start gap-2')}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 z-50 p-4">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-background">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-sidebar text-sidebar-foreground">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className={cn('fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 hidden lg:block', collapsed ? 'w-20' : 'w-64')}>
        {sidebarContent}
      </aside>
    </>
  );
}
