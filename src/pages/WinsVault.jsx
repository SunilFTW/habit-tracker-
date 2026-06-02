import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import {
  Trophy, Plus, X, Edit3, Trash2, Search,
  Sparkles, Award, Flag, TrendingUp, MessageSquare, RefreshCw, Filter
} from 'lucide-react';

const CATEGORIES = [
  { key: 'Achievement', icon: Award, color: 'var(--accent-primary)', badge: 'badge-purple' },
  { key: 'Milestone', icon: Flag, color: 'var(--accent-warning)', badge: 'badge-yellow' },
  { key: 'Progress', icon: TrendingUp, color: 'var(--accent-success)', badge: 'badge-green' },
  { key: 'Feedback', icon: MessageSquare, color: 'var(--accent-secondary)', badge: 'badge-cyan' },
];

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

export default function WinsVault() {
  const { currentUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingWin, setEditingWin] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Achievement');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterCat, setFilterCat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightSeed, setHighlightSeed] = useState(0);
  const [allWins, setAllWins] = useState([]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  async function fetchData() {
    const { data } = await supabase
      .from('wins')
      .select('*')
      .eq('user_id', currentUser.id);
    if (data) setAllWins(data);
  }

  const filteredWins = useMemo(() => {
    let results = [...allWins];
    if (filterCat !== 'All') {
      results = results.filter(w => w.category === filterCat);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        w => w.title.toLowerCase().includes(q) ||
             (w.description && w.description.toLowerCase().includes(q))
      );
    }
    results.sort((a, b) => new Date(b.date) - new Date(a.date));
    return results;
  }, [allWins, filterCat, searchQuery]);

  // Random win highlight
  const randomWin = useMemo(() => {
    if (allWins.length === 0) return null;
    const idx = (Date.now() + highlightSeed) % allWins.length;
    return allWins[idx];
  }, [allWins, highlightSeed]);

  function openAdd() {
    setEditingWin(null);
    setTitle('');
    setDescription('');
    setCategory('Achievement');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setShowModal(true);
  }

  function openEdit(win) {
    setEditingWin(win);
    setTitle(win.title);
    setDescription(win.description || '');
    setCategory(win.category);
    setDate(win.date);
    setShowModal(true);
  }

  async function handleSave() {
    if (!title.trim()) return;
    if (editingWin) {
      await supabase
        .from('wins')
        .update({
          title: title.trim(),
          description: description.trim(),
          category,
          date,
        })
        .eq('id', editingWin.id);
    } else {
      await supabase
        .from('wins')
        .insert([{
          user_id: currentUser.id,
          title: title.trim(),
          description: description.trim(),
          category,
          date,
          createdAt: new Date().toISOString(),
        }]);
    }
    setShowModal(false);
    setEditingWin(null);
    fetchData();
  }

  async function handleDelete(id) {
    await supabase.from('wins').delete().eq('id', id);
    fetchData();
  }

  function getCatMeta(catKey) {
    return CATEGORIES.find(c => c.key === catKey) || CATEGORIES[0];
  }

  // Category counts
  const counts = useMemo(() => {
    const map = { All: allWins.length };
    CATEGORIES.forEach(c => { map[c.key] = 0; });
    allWins.forEach(w => { if (map[w.category] !== undefined) map[w.category]++; });
    return map;
  }, [allWins]);

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
              <Trophy style={{ width: 28, height: 28, color: 'var(--accent-warning)' }} />
              <span className="text-gradient">Wins Vault</span>
            </h1>
            <p>Every victory matters. Celebrate your progress.</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} />
            Add Win
          </button>
        </div>
      </div>

      {/* Random Win Highlight */}
      <AnimatePresence mode="wait">
        {randomWin && (
          <motion.div
            key={randomWin.id + '-' + highlightSeed}
            className="card-gradient"
            style={{ marginBottom: 'var(--space-6)', position: 'relative' }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Sparkles size={14} style={{ color: 'var(--accent-warning)' }} />
                <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--accent-warning)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Motivational Boost
                </span>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setHighlightSeed(s => s + 1)}
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: '1.5rem' }}>🏆</span>
              <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>
                {randomWin.title}
              </h3>
            </div>
            {randomWin.description && (
              <p style={{ fontSize: 'var(--fs-base)', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 'var(--space-2)' }}>
                {randomWin.description}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span className={`badge ${getCatMeta(randomWin.category).badge}`}>{randomWin.category}</span>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                {format(new Date(randomWin.date), 'MMM d, yyyy')}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            className="input"
            placeholder="Search your wins…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>

        {/* Category Filter */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${filterCat === 'All' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterCat('All')}
          >
            <Filter size={12} />
            All ({counts.All})
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              className={`btn btn-sm ${filterCat === cat.key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterCat(cat.key)}
            >
              <cat.icon size={12} />
              {cat.key} ({counts[cat.key]})
            </button>
          ))}
        </div>
      </div>

      {/* Wins Grid */}
      <AnimatePresence mode="wait">
        {filteredWins.length === 0 ? (
          <motion.div
            key="empty"
            className="empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Trophy className="empty-state-icon" />
            <h3>{searchQuery || filterCat !== 'All' ? 'No wins match your filters' : 'No wins recorded yet'}</h3>
            <p style={{ marginTop: 'var(--space-2)' }}>
              {searchQuery || filterCat !== 'All'
                ? 'Try a different search or filter.'
                : 'Start recording your victories — big or small.'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={filterCat + searchQuery}
            className="grid-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {filteredWins.map((win, i) => {
              const meta = getCatMeta(win.category);
              const CatIcon = meta.icon;
              return (
                <motion.div
                  key={win.id}
                  className="card"
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
                >
                  {/* Card Top */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 'var(--radius-md)',
                      background: `color-mix(in srgb, ${meta.color} 15%, transparent)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <CatIcon size={18} style={{ color: meta.color }} />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-1)', flexShrink: 0 }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(win)}>
                        <Edit3 size={13} />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(win.id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {win.title}
                  </h3>

                  {/* Description */}
                  {win.description && (
                    <p style={{ fontSize: 'var(--fs-base)', color: 'var(--text-secondary)', lineHeight: 1.7, flex: 1 }}>
                      {win.description}
                    </p>
                  )}

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <span className={`badge ${meta.badge}`}>{win.category}</span>
                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                      {format(new Date(win.date), 'MMM d, yyyy')}
                    </span>
                  </div>
                </motion.div>
              );
            })}
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
                <h2>{editingWin ? 'Edit Win' : 'Record a Win'}</h2>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Title</label>
                  <input
                    className="input"
                    placeholder="What did you achieve?"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Description (optional)</label>
                  <textarea
                    className="input"
                    placeholder="Tell the story behind this win…"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Category</label>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.key}
                        className={`btn btn-sm ${category === cat.key ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setCategory(cat.key)}
                        type="button"
                      >
                        <cat.icon size={12} />
                        {cat.key}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Date</label>
                  <input
                    className="input"
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={!title.trim()}
                  style={{ opacity: !title.trim() ? 0.5 : 1 }}
                >
                  {editingWin ? 'Save Changes' : 'Record Win 🎉'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
