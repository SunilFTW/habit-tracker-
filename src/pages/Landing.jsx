import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, CheckCircle2, TrendingUp, Calendar, Shield } from 'lucide-react';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <div className="landing-nav-logo-icon">
            <CheckCircle2 size={20} color="white" />
          </div>
          <span style={{ fontWeight: 'var(--fw-bold)', fontSize: '1.25rem', letterSpacing: '-0.02em' }}>Habit Tracker</span>
        </div>
        <div className="landing-nav-links">
          {currentUser ? (
            <button onClick={() => navigate('/app')} className="btn btn-primary">
              Dashboard
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/login')} className="btn btn-ghost" style={{ fontWeight: 'var(--fw-medium)' }}>
                Log In
              </button>
              <button onClick={() => navigate('/login')} className="btn btn-primary">
                Get Started
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main>
        <div className="landing-hero">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="landing-title">Master your daily routines.</h1>
            <p className="landing-subtitle">
              A beautifully minimal space to track your habits, manage daily tasks, and visualize your personal growth. No clutter, just progress.
            </p>
            
            <div className="landing-cta">
              <button onClick={() => navigate('/login')} className="btn btn-primary landing-cta-btn" style={{ padding: 'var(--space-4) var(--space-8)' }}>
                Start Tracking <ArrowRight size={20} />
              </button>
              <span className="landing-cta-text">Free forever for basic use.</span>
            </div>
          </motion.div>
        </div>

        {/* Features Grid */}
        <div className="landing-features">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid-3"
          >
            <FeatureCard 
              icon={<CheckCircle2 />}
              title="Unified Checklist"
              desc="See all your habits and daily tasks in one clean, centralized dashboard."
            />
            <FeatureCard 
              icon={<TrendingUp />}
              title="Visualize Progress"
              desc="Build streaks and see your completion rates grow over time."
            />
            <FeatureCard 
              icon={<Calendar />}
              title="Daily Discipline"
              desc="Separate mandatory habits from nice-to-haves and hit your targets."
            />
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-6)' }}>
      <div className="feature-icon-wrapper" style={{ margin: '0 auto var(--space-4)' }}>
        {icon}
      </div>
      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', fontWeight: 'var(--fw-semibold)' }}>{title}</h3>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}
