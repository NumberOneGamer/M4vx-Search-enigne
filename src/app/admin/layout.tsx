'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  LayoutDashboard, Globe, List, BarChart3, Settings,
  Shield, LogOut, Menu, X, ChevronRight, HardDrive, Search,
  Newspaper, Monitor, Database, TrendingUp
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import type { AuthUser } from '@/types';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/crawl', label: 'Crawl Manager', icon: Globe },
  { href: '/admin/queue', label: 'Queue Monitor', icon: List },
  { href: '/admin/domains', label: 'Domains', icon: HardDrive },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/quality', label: 'Search Quality', icon: TrendingUp },
  { href: '/admin/monitoring', label: 'Monitoring', icon: Monitor },
  { href: '/admin/publishers', label: 'Publishers', icon: Newspaper },
  { href: '/admin/content', label: 'Content', icon: Database },
  { href: '/admin/blocklist', label: 'Blocklist', icon: Shield },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        router.push('/auth/login');
      });
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    document.cookie = 'auth_token=; path=/; max-age=0';
    router.push('/auth/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex bg-background">
        <div className="hidden lg:flex w-64 border-r border-border p-4 flex-col gap-4">
          <Skeleton className="h-8 w-32" />
          <div className="space-y-2 flex-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-10 w-full max-w-4xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : -280 }}
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border shadow-elevated lg:shadow-none lg:!translate-x-0`}
      >
        <div className={`flex h-full flex-col ${sidebarOpen ? '' : 'hidden lg:flex'}`}>
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Link href="/" className="text-lg font-bold tracking-tight">
              <span className="text-gradient">M4vx</span>
              <span className="text-muted-foreground text-sm font-normal"> Admin</span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-lg hover:bg-accent transition-colors">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150
                    ${isActive
                      ? 'bg-accent text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                    }`}
                >
                  <item.icon className={`h-4 w-4 ${isActive ? 'text-foreground' : ''}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-border">
            {user && (
              <div className="flex items-center justify-between px-2 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-accent transition-colors ml-2 shrink-0"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 glass border-b border-border flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-accent transition-colors"
            >
              <Menu className="h-5 w-5 text-muted-foreground" />
            </button>
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground">Admin</span>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === 'admin' && (
              <span className="text-xs bg-accent text-foreground px-2.5 py-0.5 rounded-full font-medium border border-border">
                Admin
              </span>
            )}
            <ThemeToggle />
          </div>
        </header>
        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
