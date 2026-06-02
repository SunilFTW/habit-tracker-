import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import {
  Eye, Plus, X, Edit3, Trash2, Sparkles,
  Target, Telescope, Mail, Heart, Quote, RefreshCw
} from 'lucide-react';

const TABS = [
  { key: 'goals', label: 'Goals', icon: Target },
  { key: 'vision', label: 'Vision', icon: Telescope },
  { key: 'letter', label: 'Letter', icon: Mail },
  { key: 'reasons', label: 'Reasons', icon: Heart },
];

const TAB_PLACEHOLDERS = {
  goals: { title: 'e.g. Become fluent in Japanese', content: 'Describe what achieving this goal looks like…' },
  vision: { title: 'e.g. My life in 5 years', content: 'Paint the picture of your ideal future…' },
  letter: { title: 'e.g. Dear Future Me', content: 'Write a letter to your future self…' },
  reasons: { title: 'e.g. Why I keep going', content: 'Remind yourself why this matters…' },
};

const TAB_EMPTY = {
  goals: { emoji: '🎯', text: 'No goals yet. What does your future self look like?' },
  vision: { emoji: '🔭', text: 'No vision entries yet. Dream big and write it down.' },
  letter: { emoji: '✉️', text: 'No letters yet. Write to your future self.' },
  reasons: { emoji: '💜', text: 'No reasons yet. Why are you doing all of this?' },
};

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

const cardVariants = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export default function FutureSelf() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('goals');
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [highlightSeed, setHighlightSeed] = useState(0);
  const [allEntries, setAllEntries] = useState([]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  async function fetchData() {
    const { data } = await supabase
      .from('futureSelf')
      .select('*')
      .eq('user_id', currentUser.id);
    if (data) setAllEntries(data);
  }

  const entries = useMemo(
    () => allEntries
      .filter(e => e.type === activeTab)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [allEntries, activeTab]
  );

  // Random highlight from ALL entries
  const highlight = useMemo(() => {
    if (allEntries.length === 0) return null;
    const idx = (Date.now() + highlightSeed) % allEntries.length;
    return allEntries[idx];
  }, [allEntries, highlightSeed]);

  function openAdd() {
    setEditingEntry(null);
    setTitle('');
    setContent('');
    setShowModal(true);
  }

  function openEdit(entry) {
    setEditingEntry(entry);
    setTitle(entry.title);
    setContent(entry.content);
    setShowModal(true);
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) return;
    if (editingEntry) {
      await supabase
        .from('futureSelf')
        .update({
          title: title.trim(),
          content: content.trim(),
        })
        .eq('id', editingEntry.id);
    } else {
      await supabase
        .from('futureSelf')
        .insert([{
          user_id: currentUser.id,
          type: activeTab,
          title: title.trim(),
          content: content.trim(),
          createdAt: new Date().toISOString(),
        }]);
    }
    setShowModal(false);
    setTitle('');
    setContent('');
    setEditingEntry(null);
    fetchData();
  }

  async function handleDelete(id) {
    await supabase.from('futureSelf').delete().eq('id', id);
    fetchData();
  }

  const ActiveIcon = TABS.find(t => t.key === activeTab)?.icon || Target;

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
        <div className="page-header-row">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Eye style={{ width: 28, height: 28, color: 'var(--accent-primary)' }} />
              <span className="text-gradient">Future Me</span>
            </h1>
            <p>Define who you're becoming. Your north star lives here.</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} />
            Add Entry
          </button>
        </div>
      </div>

      {/* Random Highlight */}
      <AnimatePresence mode="wait">
        {highlight && (
          <motion.div
            key={highlight.id + '-' + highlightSeed}
            className="card-gradient"
            style={{ marginBottom: 'var(--space-6)', position: 'relative', overflow: 'hidden' }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                <Sparkles size={14} style={{ color: 'var(--accent-warning)' }} />
                <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--accent-warning)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Random Reflection
                </span>
                <span className="badge badge-purple" style={{ marginLeft: 'var(--space-2)' }}>{highlight.type}</span>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setHighlightSeed(s => s + 1)}
                style={{ flexShrink: 0 }}
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-semibold)', marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
              {highlight.title}
            </h3>
            <p style={{ fontSize: 'var(--fs-base)', color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic' }}>
              "{highlight.content}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 'var(--space-6)' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <tab.icon size={14} />
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Entries */}
      <AnimatePresence mode="wait">
        {entries.length === 0 ? (
          <motion.div
            key="empty"
            className="empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>{TAB_EMPTY[activeTab].emoji}</span>
            <h3>{TAB_EMPTY[activeTab].text}</h3>
            <p style={{ marginTop: 'var(--space-2)' }}>
              Tap "Add Entry" to write your first {activeTab} entry.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            className="grid-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {entries.map((entry, i) => (
              <motion.div
                key={entry.id}
                className="card"
                variants={cardVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ delay: i * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 'var(--radius-md)',
                      background: 'var(--accent-primary-dim)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <ActiveIcon size={16} style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <h3 style={{
                      fontSize: 'var(--fs-md)', fontWeight: 'var(--fw-semibold)',
                      color: 'var(--text-primary)', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {entry.title}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-1)', flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(entry)}>
                      <Edit3 size={13} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(entry.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <p style={{
                  fontSize: 'var(--fs-base)', color: 'var(--text-secondary)',
                  lineHeight: 1.75, whiteSpace: 'pre-wrap', flex: 1
                }}>
                  {entry.content}
                </p>

                {/* Footer */}
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  {format(new Date(entry.createdAt), 'MMM d, yyyy')}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{editingEntry ? 'Edit Entry' : `New ${TABS.find(t => t.key === activeTab)?.label}`}</h2>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Title</label>
                  <input
                    className="input"
                    placeholder={TAB_PLACEHOLDERS[activeTab].title}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Content</label>
                  <textarea
                    className="input"
                    placeholder={TAB_PLACEHOLDERS[activeTab].content}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={6}
                    style={{ minHeight: 150 }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={!title.trim() || !content.trim()}
                  style={{ opacity: (!title.trim() || !content.trim()) ? 0.5 : 1 }}
                >
                  {editingEntry ? 'Save Changes' : 'Add Entry'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
