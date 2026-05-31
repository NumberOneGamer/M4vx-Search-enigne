'use client';

import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, RefreshCw, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { Skeleton } from '@/components/ui/skeleton';

interface Setting {
  id: number;
  key: string;
  value: string;
  description: string | null;
  category: string;
}

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
        addToast({ type: 'success', title: 'Setting saved', description: key });
      } else {
        const data = await res.json();
        addToast({ type: 'error', title: 'Failed to save', description: data.message });
      }
    } catch {
      addToast({ type: 'error', title: 'Failed to save setting' });
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const rankingKeys = [
    { key: 'ranking_relevanceWeight', label: 'Keyword Relevance Weight', desc: 'Weight for keyword matching score' },
    { key: 'ranking_contentQualityWeight', label: 'Content Quality Weight', desc: 'Weight for content quality score' },
    { key: 'ranking_freshnessWeight', label: 'Freshness Weight', desc: 'Weight for page freshness score' },
    { key: 'ranking_backlinkWeight', label: 'Backlink Weight', desc: 'Weight for backlink count score' },
    { key: 'ranking_engagementWeight', label: 'Engagement Weight', desc: 'Weight for user engagement score' },
    { key: 'ranking_domainAuthorityWeight', label: 'Domain Authority Weight', desc: 'Weight for domain authority score' },
  ];

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <Skeleton className="h-80 rounded-xl mb-6" />
        <Skeleton className="h-80 rounded-xl" />
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
        <button
          onClick={fetchSettings}
          className="p-2 rounded-xl hover:bg-accent transition-colors border border-border"
        >
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6 shadow-card"
        >
          <h2 className="text-lg font-semibold text-foreground mb-1">Ranking Algorithm Weights</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Configure how each factor contributes to the overall ranking score. Values should sum to 1.0.
          </p>
          <div className="space-y-4">
            {rankingKeys.map((rk, i) => {
              const val = editedValues[rk.key] || '0';
              return (
                <motion.div
                  key={rk.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium text-foreground">{rk.label}</label>
                    <p className="text-xs text-muted-foreground">{rk.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={val}
                      onChange={(e) =>
                        setEditedValues((prev) => ({ ...prev, [rk.key]: e.target.value }))
                      }
                      className="w-20 px-2 py-1.5 text-sm bg-background border border-input rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    />
                    <button
                      onClick={() => handleSave(rk.key, val)}
                      disabled={saving[rk.key]}
                      className="p-2 hover:bg-accent rounded-lg disabled:opacity-50 transition-colors"
                      title="Save"
                    >
                      {saving[rk.key] ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Save className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-xl p-6 shadow-card"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">All Settings</h2>
          <div className="space-y-3">
            {settings
              .filter((s) => !s.key.startsWith('ranking_'))
              .map((setting, i) => (
                <motion.div
                  key={setting.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-4 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium text-foreground">{setting.key}</label>
                    {setting.description && (
                      <p className="text-xs text-muted-foreground">{setting.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      value={editedValues[setting.key] || ''}
                      onChange={(e) =>
                        setEditedValues((prev) => ({ ...prev, [setting.key]: e.target.value }))
                      }
                      className="w-48 px-2 py-1.5 text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    />
                    <button
                      onClick={() => handleSave(setting.key, editedValues[setting.key] || '')}
                      disabled={saving[setting.key]}
                      className="p-2 hover:bg-accent rounded-lg disabled:opacity-50 transition-colors"
                    >
                      {saving[setting.key] ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Save className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
