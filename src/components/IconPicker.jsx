import React, { useState } from 'react';
import * as LucideIcons from 'lucide-react';

// A curated list of habit-friendly icons
const AVAILABLE_ICONS = [
  'Target', 'Dumbbell', 'BookOpen', 'Droplets', 'Zap', 'Coffee', 'Moon', 'Sun', 
  'Heart', 'Activity', 'Briefcase', 'Music', 'Flame', 'Star', 'Wallet', 
  'GraduationCap', 'Plane', 'Car', 'Home', 'Phone', 'ShoppingCart', 'PenTool',
  'Camera', 'CheckCircle', 'Code', 'Gamepad2', 'Headphones', 'Utensils'
];

export function getIconComponent(iconName) {
  // Fallback to Target if iconName is invalid or missing
  const IconComponent = LucideIcons[iconName] || LucideIcons['Target'];
  return IconComponent;
}

export default function IconPicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const SelectedIcon = getIconComponent(value);

  return (
    <div className="icon-picker-container" style={{ position: 'relative' }}>
      <button 
        type="button"
        className="btn btn-secondary"
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)', 
          padding: 'var(--space-2) var(--space-3)', 
          background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)'
        }}
      >
        <SelectedIcon size={16} />
        <span style={{ fontSize: 'var(--fs-sm)' }}>Select Icon</span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 50,
          background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-2)',
          boxShadow: 'var(--shadow-lg)', width: 'max-content'
        }}>
          {AVAILABLE_ICONS.map(name => {
            const Icon = LucideIcons[name];
            const isSelected = value === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  onChange(name);
                  setIsOpen(false);
                }}
                title={name}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                  background: isSelected ? 'var(--accent-primary)' : 'transparent',
                  color: isSelected ? 'white' : 'var(--text-secondary)',
                  border: 'none', cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
