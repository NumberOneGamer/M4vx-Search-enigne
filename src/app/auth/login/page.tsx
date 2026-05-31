'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex justify-between items-center p-4 md:p-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          <span className="text-gradient">M4vx</span>
          <span className="text-muted-foreground"> Search</span>
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4">
                <LogIn className="h-6 w-6 text-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Sign in</h1>
              <p className="text-sm text-muted-foreground mt-1">Welcome back to M4vx Search</p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg mb-5"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setTouched(prev => ({ ...prev, email: true })); }}
                  onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                  required
                  autoComplete="email"
                  className={`w-full px-3 py-2.5 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-all text-sm
                    ${touched.email && !email ? 'border-destructive' : 'border-input hover:border-muted-foreground/30'}`}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setTouched(prev => ({ ...prev, password: true })); }}
                    onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                    required
                    autoComplete="current-password"
                    className={`w-full px-3 py-2.5 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-all text-sm pr-10
                      ${touched.password && !password ? 'border-destructive' : 'border-input hover:border-muted-foreground/30'}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-foreground text-background rounded-xl font-medium
                  hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all text-sm"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-foreground hover:underline font-medium">
                Register
              </Link>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
