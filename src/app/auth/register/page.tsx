'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Loader2, UserPlus, Eye, EyeOff } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordChecks = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
  const allPass = Object.values(passwordChecks).every(Boolean);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!allPass) {
      setError('Password must contain uppercase, lowercase, and a number (min 8 characters)');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
                <UserPlus className="h-6 w-6 text-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Create account</h1>
              <p className="text-sm text-muted-foreground mt-1">Join M4vx Search</p>
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
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-all text-sm hover:border-muted-foreground/30"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-all text-sm hover:border-muted-foreground/30"
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
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-all text-sm pr-10 hover:border-muted-foreground/30"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex gap-3 mt-2 text-xs">
                  <span className={`${passwordChecks.minLength ? 'text-success' : 'text-muted-foreground'} transition-colors`}>
                    {passwordChecks.minLength ? '✓' : '•'} 8+ chars
                  </span>
                  <span className={`${passwordChecks.hasUpper ? 'text-success' : 'text-muted-foreground'} transition-colors`}>
                    {passwordChecks.hasUpper ? '✓' : '•'} Uppercase
                  </span>
                  <span className={`${passwordChecks.hasLower ? 'text-success' : 'text-muted-foreground'} transition-colors`}>
                    {passwordChecks.hasLower ? '✓' : '•'} Lowercase
                  </span>
                  <span className={`${passwordChecks.hasNumber ? 'text-success' : 'text-muted-foreground'} transition-colors`}>
                    {passwordChecks.hasNumber ? '✓' : '•'} Number
                  </span>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-foreground text-background rounded-xl font-medium
                  hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all text-sm"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-foreground hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
