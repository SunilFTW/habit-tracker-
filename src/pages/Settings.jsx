import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Settings as SettingsIcon, User, Target, Palette, Database,
  Info, Download, Upload, Check, Droplets, Flame, Beef,
  Footprints, Weight, Moon, Sun, Save
} from 'lucide-react';

const ACCENT_COLORS = [
  { name: 'Purple', value: '#7C6BF0' },
  { name: 'Cyan', value: '#00D4FF' },
  { name: 'Green', value: '#34D399' },
  { name: 'Pink', value: '#F472B6' },
  { name: 'Orange', value: '#FB923C' },
  { name: 'Yellow', value: '#FBBF24' },
  { name: 'Red', value: '#F87171' },
  { name: 'Blue', value: '#60A5FA' },
];

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

const sectionVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const TABLES = ['settings', 'metrics', 'habits', 'habitLogs', 'meals', 'hardThings'];

async function exportData(currentUser) {
  if (!currentUser) return;
  const data = {};
  for (const table of TABLES) {
    const { data: rows } = await supabase.from(table).select('*').eq('user_id', currentUser.id);
    data[table] = rows || [];
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `1percent-os-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importData(file, currentUser) {
  if (!currentUser) return Promise.reject("No user");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        for (const [tableName, rows] of Object.entries(data)) {
          if (TABLES.includes(tableName) && Array.isArray(rows)) {
            await supabase.from(tableName).delete().eq('user_id', currentUser.id);
            if (rows.length > 0) {
              const newRows = rows.map(r => {
                const { id, ...rest } = r;
                return { ...rest, user_id: currentUser.id };
              });
              await supabase.from(tableName).insert(newRows);
            }
          }
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function SettingRow({ icon: Icon, label, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 'var(--space-4)', padding: 'var(--space-3) 0',
      borderBottom: '1px solid var(--glass-border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
        {Icon && <Icon size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
        <span style={{ fontSize: 'var(--fs-base)', color: 'var(--text-secondary)', fontWeight: 'var(--fw-medium)' }}>{label}</span>
      </div>
      <div style={{ flexShrink: 0 }}>
        {children}
      </div>
    </div>
  );
}

function InlineInput({ value, onSave, type = 'text', suffix = '', min, max, step }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  function handleStart() {
    setDraft(value ?? '');
    setEditing(true);
  }

  function handleSaveLocal() {
    onSave(type === 'number' ? Number(draft) : draft);
    setEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSaveLocal();
    if (e.key === 'Escape') setEditing(false);
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <input
          className="input"
          type={type}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          min={min}
          max={max}
          step={step}
          style={{ width: type === 'time' ? 130 : 120, textAlign: 'right' }}
        />
        {suffix && <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-tertiary)' }}>{suffix}</span>}
        <button className="btn btn-ghost btn-icon btn-sm" onClick={handleSaveLocal}>
          <Check size={14} style={{ color: 'var(--accent-success)' }} />
        </button>
      </div>
    );
  }

  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={handleStart}
      style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}
    >
      {value ?? '—'}{suffix && ` ${suffix}`}
    </button>
  );
}

export default function Settings() {
  const { currentUser } = useAuth();
  const fileInputRef = useRef(null);
  const [importStatus, setImportStatus] = useState(null);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    fetchSettings();
  }, [currentUser]);

  async function fetchSettings() {
    if (!currentUser) return;
    const { data } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', currentUser.id);
    if (data) {
      const s = {};
      data.forEach(item => {
        s[item.key] = item.value;
      });
      setSettings(s);
    }
  }

  async function saveSetting(key, value) {
    if (!currentUser) return;
    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('key', key)
      .maybeSingle();
      
    if (existing) {
      await supabase.from('settings').update({ value }).eq('id', existing.id);
    } else {
      await supabase.from('settings').insert([{ user_id: currentUser.id, key, value }]);
    }
    fetchSettings();
  }

  const {
    userName, waterGoal, calorieGoal, proteinGoal, stepGoal, weightGoal, sleepGoal, wakeGoal, accentColor
  } = settings;

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImportStatus('importing');
      await importData(file, currentUser);
      setImportStatus('success');
      setTimeout(() => setImportStatus(null), 3000);
      fetchSettings();
    } catch {
      setImportStatus('error');
      setTimeout(() => setImportStatus(null), 3000);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <motion.div
      className="page-container"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Header */}
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <SettingsIcon style={{ width: 28, height: 28, color: 'var(--accent-primary)' }} />
          <span className="text-gradient">Settings</span>
        </h1>
        <p>Customize your Habit Tracker experience.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 640 }}>

        {/* Profile Section */}
        <motion.div
          className="card"
          variants={sectionVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.05 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'var(--accent-primary-dim)', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <User size={18} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 'var(--fw-semibold)' }}>Profile</h2>
          </div>
          <SettingRow icon={User} label="Name">
            <InlineInput
              value={userName}
              onSave={v => saveSetting('userName', v)}
            />
          </SettingRow>
        </motion.div>

        {/* Goals Section */}
        <motion.div
          className="card"
          variants={sectionVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.1 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'var(--accent-success-dim)', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <Target size={18} style={{ color: 'var(--accent-success)' }} />
            </div>
            <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 'var(--fw-semibold)' }}>Goals</h2>
          </div>
          <SettingRow icon={Droplets} label="Water Goal">
            <InlineInput value={waterGoal} onSave={v => saveSetting('waterGoal', v)} type="number" suffix="ml" min={500} step={100} />
          </SettingRow>
          <SettingRow icon={Flame} label="Calorie Goal">
            <InlineInput value={calorieGoal} onSave={v => saveSetting('calorieGoal', v)} type="number" suffix="kcal" min={500} step={50} />
          </SettingRow>
          <SettingRow icon={Beef} label="Protein Goal">
            <InlineInput value={proteinGoal} onSave={v => saveSetting('proteinGoal', v)} type="number" suffix="g" min={10} step={5} />
          </SettingRow>
          <SettingRow icon={Footprints} label="Step Goal">
            <InlineInput value={stepGoal} onSave={v => saveSetting('stepGoal', v)} type="number" suffix="steps" min={1000} step={500} />
          </SettingRow>
          <SettingRow icon={Weight} label="Weight Goal">
            <InlineInput value={weightGoal} onSave={v => saveSetting('weightGoal', v)} type="number" suffix="kg" min={30} step={0.5} />
          </SettingRow>
          <SettingRow icon={Moon} label="Sleep Time">
            <InlineInput value={sleepGoal} onSave={v => saveSetting('sleepGoal', v)} type="time" />
          </SettingRow>
          <SettingRow icon={Sun} label="Wake Time">
            <InlineInput value={wakeGoal} onSave={v => saveSetting('wakeGoal', v)} type="time" />
          </SettingRow>
        </motion.div>

        {/* Theme Section */}
        <motion.div
          className="card"
          variants={sectionVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.15 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'var(--accent-secondary-dim)', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <Palette size={18} style={{ color: 'var(--accent-secondary)' }} />
            </div>
            <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 'var(--fw-semibold)' }}>Theme</h2>
          </div>
          <div style={{ marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', fontWeight: 'var(--fw-medium)' }}>Accent Color</span>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            {ACCENT_COLORS.map(c => (
              <button
                key={c.value}
                onClick={() => saveSetting('accentColor', c.value)}
                title={c.name}
                style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-md)',
                  background: c.value, border: accentColor === c.value ? '3px solid var(--text-primary)' : '3px solid transparent',
                  cursor: 'pointer', transition: 'all var(--transition-fast)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: accentColor === c.value ? `0 0 16px ${c.value}40` : 'none'
                }}
              >
                {accentColor === c.value && <Check size={18} style={{ color: '#fff' }} />}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Data Section */}
        <motion.div
          className="card"
          variants={sectionVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.2 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'var(--accent-warning-dim)', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <Database size={18} style={{ color: 'var(--accent-warning)' }} />
            </div>
            <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 'var(--fw-semibold)' }}>Data</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: 'var(--space-4)', background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)'
            }}>
              <div>
                <div style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-medium)', color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                  Export Data
                </div>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-tertiary)' }}>
                  Download all your data as JSON
                </div>
              </div>
              <button className="btn btn-secondary" onClick={() => exportData(currentUser)}>
                <Download size={16} />
                Export
              </button>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: 'var(--space-4)', background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)'
            }}>
              <div>
                <div style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-medium)', color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                  Import Data
                </div>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-tertiary)' }}>
                  Restore from a JSON backup
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                {importStatus === 'success' && (
                  <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent-success)', fontWeight: 'var(--fw-medium)' }}>
                    ✓ Imported!
                  </span>
                )}
                {importStatus === 'error' && (
                  <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent-danger)', fontWeight: 'var(--fw-medium)' }}>
                    ✗ Failed
                  </span>
                )}
                {importStatus === 'importing' && (
                  <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent-warning)', fontWeight: 'var(--fw-medium)' }}>
                    Importing…
                  </span>
                )}
                <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={16} />
                  Import
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* About Section */}
        <motion.div
          className="card"
          variants={sectionVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.25 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'var(--accent-primary-dim)', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <Info size={18} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 'var(--fw-semibold)' }}>About</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--glass-border)' }}>
              <span style={{ fontSize: 'var(--fs-base)', color: 'var(--text-secondary)' }}>App</span>
              <span style={{ fontSize: 'var(--fs-base)', color: 'var(--text-primary)', fontWeight: 'var(--fw-semibold)' }}>Habit Tracker</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--glass-border)' }}>
              <span style={{ fontSize: 'var(--fs-base)', color: 'var(--text-secondary)' }}>Version</span>
              <span style={{ fontSize: 'var(--fs-base)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>1.0.0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--glass-border)' }}>
              <span style={{ fontSize: 'var(--fs-base)', color: 'var(--text-secondary)' }}>Stack</span>
              <span style={{ fontSize: 'var(--fs-base)', color: 'var(--text-primary)' }}>React + Vite + Supabase</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0' }}>
              <span style={{ fontSize: 'var(--fs-base)', color: 'var(--text-secondary)' }}>Storage</span>
              <span style={{ fontSize: 'var(--fs-base)', color: 'var(--text-primary)' }}>Supabase (cloud)</span>
            </div>
          </div>

          <div style={{
            marginTop: 'var(--space-5)', padding: 'var(--space-4)',
            background: 'var(--glass-bg)', borderRadius: 'var(--radius-md)',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-tertiary)', lineHeight: 1.7 }}>
              Built with 💜 for the relentless pursuit of becoming
              <br />
              <span style={{ fontWeight: 'var(--fw-semibold)', color: 'var(--accent-primary)' }}>1% better, every single day.</span>
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
