import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Package,
  Gem,
  LogOut,
  Menu,
  X,
  UsersRound,
  MessageSquare,
  Sun,
  Moon,
  Sparkles,
  BarChart3,
  Settings,
  Truck,
  DollarSign,
  Wallet,
  Clock,
  UserCog,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandWordmark } from '@/components/BrandWordmark';

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    const handleResize = () => setIsLargeScreen(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock scroll on mobile when sidebar is open
  useEffect(() => {
    if (sidebarOpen && !isLargeScreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [sidebarOpen, isLargeScreen]);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
    { to: '/appointments', label: 'Agendamentos', icon: Calendar, adminOnly: false },
    { to: '/clients', label: 'Clientes', icon: Users, adminOnly: false },
    { to: '/messages', label: 'Mensagens', icon: MessageSquare, adminOnly: false },
    { to: '/services', label: 'Serviços', icon: Gem, adminOnly: true },
    { to: '/packages', label: 'Pacotes', icon: Package, adminOnly: true },
    { to: '/team', label: 'Equipe', icon: UsersRound, adminOnly: true },
    { to: '/suppliers', label: 'Fornecedores', icon: Truck, adminOnly: true },
    { to: '/finance', label: 'Financeiro', icon: DollarSign, adminOnly: true },
    { to: '/cash-flow', label: 'Fluxo de Caixa', icon: Wallet, adminOnly: true },
    { to: '/reports', label: 'Relatórios', icon: BarChart3, adminOnly: true },
    { to: '/staff-management', label: 'Atendentes', icon: UserCog, adminOnly: true },
    { to: '/business-hours', label: 'Horários', icon: Clock, adminOnly: true },
    { to: '/settings', label: 'Configurações', icon: Settings, adminOnly: true },
  ].filter((item) => !item.adminOnly || isAdmin);

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  return (
    <div className="flex h-screen overflow-hidden bg-background grain">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && !isLargeScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isLargeScreen ? (collapsed ? 80 : 280) : 280,
          x: isLargeScreen ? 0 : (sidebarOpen ? 0 : -280)
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border lg:relative shadow-2xl lg:shadow-none'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center justify-between px-6 py-8 shrink-0',
          collapsed && 'justify-center px-2'
        )}>
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary shadow-glow ring-2 ring-primary/25">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            {!collapsed && <BrandWordmark variant="sidebar" />}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-sidebar-foreground/60 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-4">
          <nav className="space-y-1 py-4">
            {!collapsed && (
              <p className="px-3 mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/30">
                Core System
              </p>
            )}
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'group nav-item-glow flex items-center gap-4 px-3 py-3 text-[13px] font-medium transition-all duration-200 border border-transparent',
                    active
                      ? 'active text-white border-sidebar-border bg-sidebar-accent shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                      : 'text-sidebar-foreground/50 hover:text-white hover:bg-white/5',
                    collapsed && 'justify-center px-0'
                  )}
                >
                  <item.icon className={cn(
                    'h-[20px] w-[20px] transition-transform duration-300 group-hover:scale-110',
                    active ? 'text-primary' : 'text-current opacity-70'
                  )} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="p-4 mt-auto border-t border-white/5 bg-black/20">
          <div className={cn(
            'flex items-center gap-3 p-2 rounded-sm bg-white/5 border border-white/5',
            collapsed && 'justify-center p-1'
          )}>
            <Avatar className="h-9 w-9 border border-white/10 shrink-0">
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold font-display">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{profile?.full_name}</p>
                <p className="text-[10px] text-sidebar-foreground/40 uppercase tracking-wider">{profile?.role}</p>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="secondary"
              size="icon"
              className="hidden lg:flex h-8 w-8 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            
            {!collapsed && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[11px] font-bold text-red-500/80 hover:text-red-500 hover:bg-red-500/5 uppercase tracking-widest"
                onClick={signOut}
              >
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 lg:h-20 flex items-center justify-between px-4 sm:px-6 lg:px-10 border-b border-border bg-background/80 backdrop-blur-xl z-30 shrink-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-10 w-10 border border-border"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-[10px] sm:text-xs lg:text-sm font-bold font-display uppercase tracking-[2px] sm:tracking-[3px] text-muted-foreground/60 truncate">
              {navItems.find((i) => i.to === location.pathname)?.label ?? 'Platform'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
             <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="h-10 w-10 border-border bg-transparent hover:bg-accent transition-all duration-300"
              >
                <Sun className="h-[20px] w-[20px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[20px] w-[20px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
          </div>
        </header>

        {/* Viewport */}
        <main className="flex-1 overflow-y-auto scroll-smooth outline-none">
          <div className="mx-auto max-w-[1400px] min-h-full px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-12 animate-reveal">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
