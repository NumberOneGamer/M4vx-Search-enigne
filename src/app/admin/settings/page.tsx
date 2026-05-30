'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Settings as SettingsIcon, RefreshCw, Save, Loader2 } from 'lucide-react';

interface Setting {
  id: number;
  key: string;
  value: string;
  description: string | null;
  category: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `Saved: ${key}` });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.message || 'Failed to save' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save setting' });
    } finally {
      setSaving(false);
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
      <div className="flex justify-center py-16">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <button onClick={fetchSettings} className="p-2 hover:bg-accent rounded-lg">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {message && (
        <div className={`text-sm p-3 rounded-lg mb-4 ${
          message.type === 'success'
            ? 'bg-green-500/10 text-green-600'
            : 'bg-destructive/10 text-destructive'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-card border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Ranking Algorithm Weights</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Configure how each factor contributes to the overall ranking score. Values should sum to 1.0.
          </p>
          <div className="space-y-4">
            {rankingKeys.map((rk) => {
              const val = editedValues[rk.key] || '0';
              return (
                <div key={rk.key} className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium">{rk.label}</label>
                    <p className="text-xs text-muted-foreground">{rk.desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={val}
                      onChange={(e) =>
                        setEditedValues((prev) => ({ ...prev, [rk.key]: e.target.value }))
                      }
                      className="w-20 px-2 py-1.5 text-sm border border-input rounded-lg bg-background text-right focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      onClick={() => handleSave(rk.key, val)}
                      disabled={saving}
                      className="p-1.5 hover:bg-accent rounded-lg disabled:opacity-50"
                      title="Save"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">All Settings</h2>
          <div className="space-y-3">
            {settings
              .filter((s) => !s.key.startsWith('ranking_'))
              .map((setting) => (
                <div key={setting.id} className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium">{setting.key}</label>
                    {setting.description && (
                      <p className="text-xs text-muted-foreground">{setting.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editedValues[setting.key] || ''}
                      onChange={(e) =>
                        setEditedValues((prev) => ({ ...prev, [setting.key]: e.target.value }))
                      }
                      className="w-48 px-2 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      onClick={() => handleSave(setting.key, editedValues[setting.key] || '')}
                      disabled={saving}
                      className="p-1.5 hover:bg-accent rounded-lg disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
