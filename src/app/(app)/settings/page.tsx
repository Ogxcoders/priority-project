'use client';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { CURRENCIES } from '@/lib/constants';
import CustomSelect from '@/components/CustomSelect';

/* ===== Reusable Toggle Component ===== */
function Toggle({ label, icon, value, field, onUpdate, desc }: {
  label: string; icon: string; value: boolean; field: string;
  onUpdate: (f: string, v: unknown) => void; desc?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--g-04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <span className="material-icons-round" style={{ fontSize: 20, color: 'var(--primary)', flexShrink: 0 }}>{icon}</span>
        <div>
          <span style={{ fontFamily: 'Rajdhani', fontWeight: 600, fontSize: 15, color: 'var(--t-eee)' }}>{label}</span>
          {desc && <p style={{ fontSize: 10, color: 'var(--t-555)', margin: '2px 0 0', lineHeight: 1.3 }}>{desc}</p>}
        </div>
      </div>
      <div className={`toggle-track${value ? ' on' : ''}`} onClick={() => onUpdate(field, !value)}>
        <div className="toggle-thumb" />
      </div>
    </div>
  );
}

/* ===== Section Header Component ===== */
function SectionHeader({ icon, label, gm }: { icon: string; label: string; gm?: boolean }) {
  const fh = (gm ?? true) ? 'Orbitron' : 'Inter';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
      <span className="material-icons-round" style={{ fontSize: 16, color: 'var(--primary)' }}>{icon}</span>
      <span style={{ fontFamily: fh, fontSize: 10, fontWeight: 700, color: 'var(--primary)', letterSpacing: (gm ?? true) ? 2 : 1, textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

/* ===== Option Button Row ===== */
function OptionRow({ label, options, value, onChange }: {
  label: string; options: { value: string; icon: string; label: string }[];
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label className="input-label">{label}</label>
      <div style={{ display: 'flex', gap: 6 }}>
        {options.map(o => (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            flex: 1, padding: '10px 4px', borderRadius: 10, cursor: 'pointer', transition: 'all .2s',
            background: value === o.value ? 'linear-gradient(135deg,rgba(var(--primary-rgb,255,69,0),0.15),rgba(var(--primary-rgb,255,69,0),0.05))' : 'var(--g-03)',
            border: value === o.value ? '1.5px solid var(--primary)' : '1px solid var(--g-06)',
            color: value === o.value ? 'var(--t-fff)' : 'var(--t-666)',
            fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <span className="material-icons-round" style={{ fontSize: 16, color: value === o.value ? 'var(--primary)' : 'var(--t-666)' }}>{o.icon}</span>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ===== Hour Options ===== */
const hourOptions = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: (i % 12 || 12) + (i >= 12 ? ' PM' : ' AM'),
  icon: i >= 6 && i < 18 ? 'light_mode' : 'dark_mode',
}));

/* ===== Accent Color Presets ===== */
const ACCENT_COLORS = [
  '#FF4500', '#f43f5e', '#ec4899', '#a855f7',
  '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6',
  '#22c55e', '#84cc16', '#eab308', '#f97316',
];

export default function SettingsPage() {
  const { profile, updateProfileField, showToast } = useData();
  const { logout, user } = useAuth();

  if (!profile) return null;

  const gm = profile.gameMode ?? true;
  const currencyOptions = CURRENCIES.map(c => ({
    value: c.code,
    label: `${c.symbol} ${c.code} — ${c.name}`,
  }));

  return (
    <div>
      {/* ═══════════════════════════════════════════ */}
      {/* 👤 PROFILE                                  */}
      {/* ═══════════════════════════════════════════ */}
      <div className="glass-card" style={{ borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <SectionHeader icon="person" label="Profile" gm={gm} />
        <label className="input-label">
          <span className="material-icons-round" style={{ fontSize: 12, marginRight: 4, verticalAlign: 'middle' }}>badge</span>
          {gm ? 'Commander Name' : 'Display Name'}
        </label>
        <input className="input-field" value={profile.name}
          onChange={e => updateProfileField('name', e.target.value)}
          onBlur={() => showToast('Name updated!')} />
        {user?.email && (
          <div style={{ marginTop: 12 }}>
            <label className="input-label">
              <span className="material-icons-round" style={{ fontSize: 12, marginRight: 4, verticalAlign: 'middle' }}>mail</span>
              Email
            </label>
            <div className="input-field" style={{ opacity: 0.7, cursor: 'default', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13 }}>{user.email}</span>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* 🎮 MODE                                     */}
      {/* ═══════════════════════════════════════════ */}
      <div className="glass-card" style={{ borderRadius: 16, padding: '4px 16px', marginBottom: 16 }}>
        <Toggle label={gm ? 'Game Mode 🎮' : 'Game Mode'} icon="sports_esports" value={gm} field="gameMode"
          onUpdate={updateProfileField} desc={gm ? 'Anime/gaming UI with effects' : 'Toggle for gaming theme'} />
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* 📐 LAYOUT PREFERENCES                       */}
      {/* ═══════════════════════════════════════════ */}
      <div className="glass-card" style={{ borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <SectionHeader icon="dashboard" label="Layout Preferences" gm={gm} />
        <OptionRow
          label={gm ? 'Quest Page View' : 'Tasks View'}
          options={[
            { value: 'card', icon: 'view_agenda', label: 'Card' },
            { value: 'list', icon: 'view_list', label: 'List' },
            { value: 'sheet', icon: 'table_chart', label: 'Sheet' },
          ]}
          value={profile.questView ?? 'card'}
          onChange={v => updateProfileField('questView', v)}
        />
        <OptionRow
          label={gm ? 'Bounty Board View' : 'Projects View'}
          options={[
            { value: 'card', icon: 'view_agenda', label: 'Card' },
            { value: 'grid', icon: 'grid_view', label: 'Grid' },
            { value: 'sheet', icon: 'table_chart', label: 'Sheet' },
          ]}
          value={profile.boardView ?? 'card'}
          onChange={v => updateProfileField('boardView', v)}
        />
        <OptionRow
          label={gm ? 'Strategic Map View' : 'Calendar View'}
          options={[
            { value: 'calendar', icon: 'calendar_month', label: gm ? 'Map' : 'Calendar' },
            { value: 'timeline', icon: 'view_timeline', label: 'Timeline' },
            { value: 'sheet', icon: 'table_chart', label: 'Sheet' },
          ]}
          value={profile.mapView ?? 'calendar'}
          onChange={v => updateProfileField('mapView', v)}
        />
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* ✨ FEATURES                                  */}
      {/* ═══════════════════════════════════════════ */}
      <div className="glass-card" style={{ borderRadius: 16, padding: '4px 16px', marginBottom: 16 }}>
        <div style={{ padding: '12px 0 0' }}>
          <SectionHeader icon="auto_awesome" label="Features" gm={gm} />
        </div>
        <Toggle label="Subtasks" icon="checklist" value={profile.showSubtasks ?? true} field="showSubtasks" onUpdate={updateProfileField} />
        <Toggle label={gm ? 'Threat Level' : 'Priority System'} icon="flag" value={profile.showPriority ?? true} field="showPriority" onUpdate={updateProfileField} />
        <Toggle label="Time Blocking" icon="schedule" value={profile.showTimeBlocks ?? true} field="showTimeBlocks" onUpdate={updateProfileField} />
        <Toggle label="Progress Bars" icon="trending_up" value={profile.showProgress ?? true} field="showProgress" onUpdate={updateProfileField} />
        <Toggle label={gm ? 'Streak 🔥' : 'Streak Tracking'} icon="local_fire_department" value={profile.showStreak ?? true} field="showStreak" onUpdate={updateProfileField} />
        <Toggle label={gm ? 'Show Loot 💰' : 'Budget/Money'} icon="paid" value={profile.showLoot ?? false} field="showLoot" onUpdate={updateProfileField} />
        {gm && (
          <>
            <Toggle label="XP & Levels ⚡" icon="military_tech" value={profile.showXP ?? true} field="showXP" onUpdate={updateProfileField} desc="Track XP progress and level up" />
            <Toggle label="Achievements 🏆" icon="emoji_events" value={profile.showAchievements ?? false} field="showAchievements" onUpdate={updateProfileField} desc="Unlock badges for milestones" />
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* 🎨 APPEARANCE                                */}
      {/* ═══════════════════════════════════════════ */}
      <div className="glass-card" style={{ borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <SectionHeader icon="palette" label="Appearance" gm={gm} />

        {/* Theme */}
        <label className="input-label">Theme</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['dark', 'eduplex'] as const).map(t => (
            <button key={t} onClick={() => updateProfileField('theme', t)}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 10, cursor: 'pointer', transition: 'all .3s',
                background: profile.theme === t ? (t === 'dark' ? 'linear-gradient(135deg,rgba(255,69,0,0.15),rgba(255,69,0,0.05))' : 'linear-gradient(135deg,rgba(200,249,2,0.15),rgba(200,249,2,0.05))') : 'var(--g-03)',
                border: profile.theme === t ? `1.5px solid ${t === 'dark' ? '#FF4500' : '#C8F902'}` : '1px solid var(--g-06)',
                color: profile.theme === t ? 'var(--t-fff)' : 'var(--t-666)',
                fontFamily: gm ? 'Orbitron' : 'Inter', fontSize: 10, fontWeight: 700, letterSpacing: gm ? 1 : 0.5, textTransform: 'uppercase',
              }}>
              <span className="material-icons-round" style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }}>{t === 'dark' ? 'dark_mode' : 'light_mode'}</span>{t === 'dark' ? 'Dark' : 'Eduplex'}
            </button>
          ))}
        </div>

        {/* Accent Color */}
        <label className="input-label">Accent Color</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {ACCENT_COLORS.map(c => (
            <button key={c} onClick={() => updateProfileField('accentColor', c)} style={{
              width: 32, height: 32, borderRadius: 10, background: c, cursor: 'pointer',
              border: (profile.accentColor ?? '#FF4500') === c ? '2.5px solid var(--t-fff)' : '2px solid transparent',
              boxShadow: (profile.accentColor ?? '#FF4500') === c ? `0 0 14px ${c}60` : 'none',
              transition: 'all .2s', transform: (profile.accentColor ?? '#FF4500') === c ? 'scale(1.15)' : 'scale(1)',
            }} />
          ))}
        </div>

        {/* Card Style */}
        <OptionRow
          label="Card Style"
          options={[
            { value: 'glass', icon: 'blur_on', label: 'Glass' },
            { value: 'flat', icon: 'crop_square', label: 'Flat' },
            { value: 'outlined', icon: 'check_box_outline_blank', label: 'Outlined' },
            { value: 'elevated', icon: 'layers', label: 'Elevated' },
          ]}
          value={profile.cardStyle ?? 'glass'}
          onChange={v => updateProfileField('cardStyle', v)}
        />

        {/* Font Size */}
        <OptionRow
          label="Font Size"
          options={[
            { value: 'small', icon: 'text_decrease', label: 'Small' },
            { value: 'medium', icon: 'text_fields', label: 'Medium' },
            { value: 'large', icon: 'text_increase', label: 'Large' },
          ]}
          value={profile.fontSize ?? 'medium'}
          onChange={v => updateProfileField('fontSize', v)}
        />

        {/* Compact + Animations */}
        <Toggle label="Compact Mode" icon="density_small" value={profile.compactMode ?? false} field="compactMode"
          onUpdate={updateProfileField} desc="Reduce spacing for more content" />
        <Toggle label="Animations" icon="animation" value={profile.animationsEnabled ?? true} field="animationsEnabled"
          onUpdate={updateProfileField} desc="Toggle micro-animations and effects" />
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* ⚙️ GENERAL                                   */}
      {/* ═══════════════════════════════════════════ */}
      <div className="glass-card" style={{ borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <SectionHeader icon="settings" label="General" gm={gm} />

        {/* Currency — only when loot is visible */}
        {(profile.showLoot ?? false) && (
          <div style={{ marginBottom: 12 }}>
            <label className="input-label">
              <span className="material-icons-round" style={{ fontSize: 12, marginRight: 4, verticalAlign: 'middle' }}>payments</span>
              Currency
            </label>
            <CustomSelect
              value={profile.currency}
              options={currencyOptions}
              onChange={v => updateProfileField('currency', v)}
              icon="payments"
            />
          </div>
        )}

        {/* Work Hours */}
        <label className="input-label">
          <span className="material-icons-round" style={{ fontSize: 12, marginRight: 4, verticalAlign: 'middle' }}>schedule</span>
          {gm ? 'Daily Grind Hours' : 'Work Hours'}
        </label>
        <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <label className="input-label" style={{ fontSize: 9 }}>Start</label>
            <CustomSelect
              value={String(profile.startHour)}
              options={hourOptions}
              onChange={v => updateProfileField('startHour', Number(v))}
              icon="wb_sunny"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="input-label" style={{ fontSize: 9 }}>End</label>
            <CustomSelect
              value={String(profile.endHour)}
              options={hourOptions}
              onChange={v => updateProfileField('endHour', Number(v))}
              icon="nights_stay"
            />
          </div>
        </div>
      </div>

      {/* General Toggles */}
      <div className="glass-card" style={{ borderRadius: 16, padding: '4px 16px', marginBottom: 16 }}>
        <Toggle label={gm ? 'Combat Alerts' : 'Notifications'} icon="notifications" value={profile.notifications} field="notifications" onUpdate={updateProfileField} />
        <Toggle label="Stealth Mode" icon="visibility_off" value={profile.stealth} field="stealth" onUpdate={updateProfileField} desc="Hide sensitive info" />
        <Toggle label="Sound FX" icon="volume_up" value={profile.sound} field="sound" onUpdate={updateProfileField} />
        <Toggle label="Confirm Deletes" icon="delete_sweep" value={profile.confirmTaskDelete} field="confirmTaskDelete" onUpdate={updateProfileField} />
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* 🚪 LOGOUT + VERSION                          */}
      {/* ═══════════════════════════════════════════ */}
      <button className="btn-ghost w-full" style={{ marginBottom: 8, color: '#f43f5e', borderColor: 'rgba(244,63,94,0.2)' }}
        onClick={async () => { await logout(); window.location.href = '/login'; }}>
        <span className="material-icons-round" style={{ fontSize: 16 }}>logout</span>
        Logout
      </button>

      <p style={{ textAlign: 'center', fontSize: 10, color: 'var(--t-444)', marginTop: 16, letterSpacing: 2, textTransform: 'uppercase' }}>
        Priority Commander v2.0 • Phase 1 — Feature Toggles
      </p>
    </div>
  );
}
