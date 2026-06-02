import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, Activity, Brain, Target, Shield, Zap } from 'lucide-react';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <div className="landing-nav-logo-icon">1%</div>
          <span style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>1% OS</span>
        </div>
        <div className="landing-nav-links">
          {currentUser ? (
            <button onClick={() => navigate('/app')} className="btn" style={{ background: '#fff', color: '#000' }}>
              Dashboard
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/login')} className="btn btn-ghost">
                Log In
              </button>
              <button onClick={() => navigate('/login')} className="btn" style={{ background: '#fff', color: '#000' }}>
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
            <h1 className="landing-title">Your Life, Quantified.</h1>
            <p className="landing-subtitle">
              1% OS is a premium, distraction-free environment for ambitious individuals. Track your fitness, discipline, and daily goals—all in one place.
            </p>
            
            <div className="landing-cta">
              <button onClick={() => navigate('/login')} className="btn btn-primary landing-cta-btn">
                Start Your Free Trial <ArrowRight size={20} />
              </button>
              <span className="landing-cta-text">No credit card required to start</span>
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
              icon={<Activity />}
              title="Total Fitness"
              desc="Log workouts, track macros, and visualize body transformation."
            />
            <FeatureCard 
              icon={<Target />}
              title="Discipline Tracker"
              desc="Build elite days. Maintain streaks. Become undeniable."
            />
            <FeatureCard 
              icon={<Brain />}
              title="Deep Work"
              desc="Timer and analytics for professional growth and learning."
            />
            <FeatureCard 
              icon={<Shield />}
              title="Privacy First"
              desc="Your data securely synced across your devices via our cloud infrastructure."
            />
            <FeatureCard 
              icon={<Zap />}
              title="Blazing Fast"
              desc="Built with a local-first architecture so it never makes you wait."
            />
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="card">
      <div className="feature-icon-wrapper">
        {icon}
      </div>
      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{title}</h3>
      <p style={{ color: 'var(--text-secondary)' }}>{desc}</p>
    </div>
  );
}
