import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import './Login.css';

export default function Login() {
  const { currentUser } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/app', { replace: true });
    }
  }, [currentUser, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        // If email confirmation is enabled in Supabase, session will be null
        if (!data.session) {
          setError('Please check your email for a confirmation link, or disable Email Confirmations in Supabase settings.');
          setLoading(false);
          return;
        }
      }
      navigate('/app');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to authenticate');
    }
    setLoading(false);
  }

  async function handleGoogleSignIn() {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
      // Note: OAuth redirects, so navigate('/app') isn't hit immediately
    } catch (err) {
      console.error(err);
      setError('Failed to sign in with Google');
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="login-container"
      >
        <div className="login-header">
          <div className="login-logo">
            1%
          </div>
          <h2 className="login-title">
            {isLogin ? 'Welcome back' : 'Start your journey'}
          </h2>
          <p className="login-subtitle">
            {isLogin ? 'Enter your details to access your OS.' : 'Create an account to start tracking.'}
          </p>
        </div>

        <div className="login-card">
          {error && (
            <div className="login-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div>
              <label className="input-label" style={{ display: 'block', marginBottom: '4px' }}>Email</label>
              <div className="login-input-wrapper">
                <Mail className="login-input-icon" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="input-label" style={{ display: 'block', marginBottom: '4px' }}>Password</label>
              <div className="login-input-wrapper">
                <Lock className="login-input-icon" size={18} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="btn btn-primary login-btn"
              style={{ width: '100%' }}
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* <div className="login-divider">
            <div className="login-divider-line"></div>
            <span className="login-divider-text">OR</span>
            <div className="login-divider-line"></div>
          </div>

          <button 
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="login-google-btn"
          >
            <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button> */}
        </div>

        <div className="login-footer">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="btn btn-ghost"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
