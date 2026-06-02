import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard, Dumbbell, Palette, Target, Sparkles,
  Scissors, ClipboardList, Zap, Eye, Trophy, Settings, MoreHorizontal, LogOut
} from 'lucide-react';

const navItems = [
  { path: '/app', icon: LayoutDashboard, label: 'Dashboard', section: 'core' },
  { path: '/app/discipline', icon: Target, label: 'Discipline', section: 'core' },
  { path: '/app/hard-thing', icon: Zap, label: 'Hard Thing', section: 'core' },
  { path: '/app/fitness', icon: Dumbbell, label: 'Fitness', section: 'track' },
  { path: '/app/growth', icon: Palette, label: 'Growth', section: 'track' },
  { path: '/app/life', icon: ClipboardList, label: 'Life', section: 'track' },
  { path: '/app/skincare', icon: Sparkles, label: 'Skincare', section: 'care' },
  { path: '/app/haircare', icon: Scissors, label: 'Haircare', section: 'care' },
  { path: '/app/future-self', icon: Eye, label: 'Future Me', section: 'reflect' },
  { path: '/app/wins', icon: Trophy, label: 'Wins', section: 'reflect' },
  { path: '/app/settings', icon: Settings, label: 'Settings', section: 'system' },
];

const mobileItems = [
  { path: '/app', icon: LayoutDashboard, label: 'Home' },
  { path: '/app/discipline', icon: Target, label: 'Discipline' },
  { path: '/app/hard-thing', icon: Zap, label: 'Hard Thing' },
  { path: '/app/fitness', icon: Dumbbell, label: 'Fitness' },
  { path: '/app/wins', icon: Trophy, label: 'Wins' },
];

const sections = {
  core: 'Core',
  track: 'Track',
  care: 'Self Care',
  reflect: 'Reflect',
  system: 'System',
};

export default function Layout({ children }) {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [accentColor, setAccentColor] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    
    async function fetchColor() {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('user_id', currentUser.id)
        .eq('key', 'accentColor')
        .single();
        
      if (data) {
        setAccentColor(data.value);
      } else {
        setAccentColor('#7C6BF0');
      }
    }
    fetchColor();
  }, [currentUser]);

  useEffect(() => {
    if (accentColor) {
      document.documentElement.style.setProperty('--accent-primary', accentColor);
    }
  }, [accentColor]);

  return (
    <div className="app-layout">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">1%</div>
          <span className="sidebar-title">1% OS</span>
        </div>
        <nav className="sidebar-nav">
          {Object.entries(sections).map(([key, label]) => (
            <div key={key}>
              <div className="nav-section-label">{label}</div>
              {navItems.filter(item => item.section === key).map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  end={item.path === '/app'}
                >
                  <item.icon className="nav-icon" />
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="account-manager">
          <div className="account-info">
            <div className="account-avatar">
              {currentUser?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="account-details">
              <span className="account-email">{currentUser?.email}</span>
              <span className="account-status">Pro Plan</span>
            </div>
          </div>
          <button 
            className="logout-btn"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/';
            }}
          >
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-nav">
        {mobileItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            end={item.path === '/app'}
          >
            <item.icon className="nav-icon" />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <NavLink
          to="/settings"
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
        >
          <MoreHorizontal className="nav-icon" />
          <span>More</span>
        </NavLink>
      </nav>
    </div>
  );
}
