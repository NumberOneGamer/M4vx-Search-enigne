'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, RefreshCw, Save, Loader2, Sliders } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { Skeleton } from '@/components/ui/skeleton';

interface Setting {
  id: number;
  key: string;
  value: string;
  description: string | null;
  category: string;
}

const RANKING_KEYS = [
  { key: 'ranking_relevanceWeight', label: 'Keyword Relevance', desc: 'Weight for keyword matching score', default: 0.30 },
  { key: 'ranking_contentQualityWeight', label: 'Content Quality', desc: 'Weight for content quality score', default: 0.20 },
  { key: 'ranking_freshnessWeight', label: 'Freshness', desc: 'Weight for page freshness score', default: 0.10 },
  { key: 'ranking_backlinkWeight', label: 'Backlinks', desc: 'Weight for backlink count score', default: 0.15 },
  { key: 'ranking_engagementWeight', label: 'Engagement', desc: 'Weight for user engagement score', default: 0.10 },
  { key: 'ranking_domainAuthorityWeight', label: 'Domain Authority', desc: 'Weight for domain authority score', default: 0.15 },
];

const CATEGORIES = [
  { key: 'crawler', label: 'Crawler', icon: '🕷️' },
  { key: 'search', label: 'Search', icon: '🔍' },
  { key: 'cache', label: 'Cache', icon: '⚡' },
  { key: 'extractor', label: 'Extractor', icon: '📦' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const { addToast } = useToast();

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        const values: Record<string, string> = {};
        data.forEach((s: Setting) => { values[s.key] = s.value; });
        RANKING_KEYS.forEach(rk => { if (!values[rk.key]) values[rk.key] = String(rk.default); });
        setEditedValues(values);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async (key: string, value: string) => {
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        addToast({ type: 'success', title: 'Saved', description: key });
      } else {
        const data = await res.json();
        addToast({ type: 'error', title: 'Failed', description: data.message });
      }
    } catch {
      addToast({ type: 'error', title: 'Failed to save' });
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const rankTotal = RANKING_KEYS.reduce((sum, rk) => sum + parseFloat(editedValues[rk.key] || '0'), 0);
  const rankValid = Math.abs(rankTotal - 1.0) < 0.01;

  const getCategorySettings = (cat: string) =>
    settings.filter((s) => s.category === cat && !s.key.startsWith('ranking_'));

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <Skeleton className="h-96 rounded-xl mb-6" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Configure ranking algorithm and system preferences</p>
        </div>
        <button onClick={fetchSettings} className="p-2 rounded-xl hover:bg-accent transition-colors border border-border">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-foreground">Ranking Algorithm Weights</h2>
            <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${rankValid ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
              Total: {rankTotal.toFixed(2)} {rankValid ? '✓' : '(should be 1.00)'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-5">Drag sliders to adjust ranking factors. Values must sum to 1.00.</p>
          <div className="space-y-5">
            {RANKING_KEYS.map((rk, i) => {
              const val = parseFloat(editedValues[rk.key] || '0');
              return (
                <motion.div key={rk.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-foreground">{rk.label}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={val}
                        onChange={(e) => setEditedValues((prev) => ({ ...prev, [rk.key]: e.target.value }))}
                        className="w-16 px-2 py-1 text-sm bg-background border border-input rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button onClick={() => handleSave(rk.key, String(val))} disabled={saving[rk.key]} className="p-1.5 hover:bg-accent rounded-lg disabled:opacity-50" title="Save">
                        {saving[rk.key] ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : <Save className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={val}
                    onChange={(e) => setEditedValues((prev) => ({ ...prev, [rk.key]: e.target.value }))}
                    className="w-full h-1.5 bg-accent rounded-full appearance-none cursor-pointer accent-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-0.5">{rk.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {CATEGORIES.map((cat, ci) => {
          const catSettings = getCategorySettings(cat.key);
          if (!catSettings.length) return null;
          return (
            <motion.div key={cat.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + ci * 0.05 }} className="bg-card border border-border rounded-xl p-6 shadow-card">
              <h2 className="text-lg font-semibold text-foreground mb-4">{cat.icon} {cat.label} Settings</h2>
              <div className="space-y-3">
                {catSettings.map((setting, i) => (
                  <motion.div key={setting.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }} className="flex items-center gap-4 py-2">
                    <div className="flex-1 min-w-0">
                      <label className="text-sm font-medium text-foreground">{setting.key.replace(`${cat.key}_`, '')}</label>
                      {setting.description && <p className="text-xs text-muted-foreground">{setting.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="text"
                        value={editedValues[setting.key] || ''}
                        onChange={(e) => setEditedValues((prev) => ({ ...prev, [setting.key]: e.target.value }))}
                        className="w-36 px-2 py-1.5 text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button onClick={() => handleSave(setting.key, editedValues[setting.key] || '')} disabled={saving[setting.key]} className="p-2 hover:bg-accent rounded-lg disabled:opacity-50">
                        {saving[setting.key] ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Save className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
