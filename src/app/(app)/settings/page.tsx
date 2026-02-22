'use client';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { CURRENCIES } from '@/lib/constants';
import CustomSelect from '@/components/CustomSelect';

function Toggle({ label, icon, value, field, onUpdate }: { label: string; icon: string; value: boolean; field: string; onUpdate: (f: string, v: unknown) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--g-04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="material-icons-round" style={{ fontSize: 20, color: 'var(--primary)' }}>{icon}</span>
        <span style={{ fontFamily: 'Rajdhani', fontWeight: 600, fontSize: 15, color: 'var(--t-eee)' }}>{label}</span>
      </div>
      <div className={`toggle-track${value ? ' on' : ''}`} onClick={() => onUpdate(field, !value)}>
        <div className="toggle-thumb" />
      </div>
    </div>
  );
}

const hourOptions = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: (i % 12 || 12) + (i >= 12 ? ' PM' : ' AM'),
  icon: i >= 6 && i < 18 ? 'light_mode' : 'dark_mode',
}));

export default function SettingsPage() {
  const { profile, updateProfileField, showToast } = useData();
  const { logout, user } = useAuth();
  const isEdu = profile?.theme === 'eduplex';

  if (!profile) return null;

  const currencyOptions = CURRENCIES.map(c => ({
    value: c.code,
    label: `${c.symbol} ${c.code} — ${c.name}`,
  }));

  return (
    <div>
      {/* Toggles Section */}
      <div className="glass-card" style={{ borderRadius: 16, padding: '4px 16px', marginBottom: 16 }}>
        <Toggle label="Combat Alerts" icon="notifications" value={profile.notifications} field="notifications" onUpdate={updateProfileField} />
        <Toggle label="Stealth Mode" icon="visibility_off" value={profile.stealth} field="stealth" onUpdate={updateProfileField} />
        <Toggle label="Sound FX" icon="volume_up" value={profile.sound} field="sound" onUpdate={updateProfileField} />
        <Toggle label="Confirm Deletes" icon="delete_sweep" value={profile.confirmTaskDelete} field="confirmTaskDelete" onUpdate={updateProfileField} />
        <Toggle label="Show Loot" icon="paid" value={profile.showLoot ?? false} field="showLoot" onUpdate={updateProfileField} />
      </div>

      {/* Theme Section */}
      <div className="glass-card" style={{ borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <span className="material-icons-round" style={{ fontSize: 16, color: 'var(--primary)' }}>palette</span>
          <span style={{ fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700, color: 'var(--primary)', letterSpacing: 2, textTransform: 'uppercase' }}>Theme</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['dark', 'eduplex'] as const).map(t => (
            <button key={t} onClick={() => updateProfileField('theme', t)}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 10, cursor: 'pointer', transition: 'all .3s',
                background: profile.theme === t ? (t === 'dark' ? 'linear-gradient(135deg,rgba(255,69,0,0.15),rgba(255,69,0,0.05))' : 'linear-gradient(135deg,rgba(200,249,2,0.15),rgba(200,249,2,0.05))') : 'var(--g-03)',
                border: profile.theme === t ? `1.5px solid ${t === 'dark' ? '#FF4500' : '#C8F902'}` : '1px solid var(--g-06)',
                color: profile.theme === t ? 'var(--t-fff)' : 'var(--t-666)',
                fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
              }}>
              <span className="material-icons-round" style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }}>{t === 'dark' ? 'dark_mode' : 'light_mode'}</span>{t === 'dark' ? 'Dark' : 'Eduplex'}
            </button>
          ))}
        </div>
      </div>

      {/* Currency — only when loot is visible */}
      {(profile.showLoot ?? false) && (
        <div className="glass-card" style={{ borderRadius: 16, padding: 16, marginBottom: 16 }}>
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
      <div className="glass-card" style={{ borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <span className="material-icons-round" style={{ fontSize: 16, color: 'var(--primary)' }}>schedule</span>
          <span style={{ fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700, color: 'var(--primary)', letterSpacing: 2, textTransform: 'uppercase' }}>Daily Grind Hours</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="input-label">Start</label>
            <CustomSelect
              value={String(profile.startHour)}
              options={hourOptions}
              onChange={v => updateProfileField('startHour', Number(v))}
              icon="wb_sunny"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="input-label">End</label>
            <CustomSelect
              value={String(profile.endHour)}
              options={hourOptions}
              onChange={v => updateProfileField('endHour', Number(v))}
              icon="nights_stay"
            />
          </div>
        </div>
      </div>

      {/* Profile — Commander Name + Email */}
      <div className="glass-card" style={{ borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <span className="material-icons-round" style={{ fontSize: 16, color: 'var(--primary)' }}>person</span>
          <span style={{ fontFamily: isEdu ? 'DM Sans' : 'Orbitron', fontSize: 10, fontWeight: 700, color: 'var(--primary)', letterSpacing: isEdu ? 0 : 2, textTransform: 'uppercase' }}>Profile</span>
        </div>
        <label className="input-label">
          <span className="material-icons-round" style={{ fontSize: 12, marginRight: 4, verticalAlign: 'middle' }}>badge</span>
          Commander Name
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

      {/* Logout */}
      <button className="btn-ghost w-full" style={{ marginBottom: 8, color: '#f43f5e', borderColor: 'rgba(244,63,94,0.2)' }}
        onClick={async () => { await logout(); window.location.href = '/login'; }}>
        <span className="material-icons-round" style={{ fontSize: 16 }}>logout</span>
        Logout
      </button>

      {/* Version */}
      <p style={{ textAlign: 'center', fontSize: 10, color: 'var(--t-444)', marginTop: 16, letterSpacing: 2, textTransform: 'uppercase' }}>
        Priority Commander v1.0 • Appwrite Backend
      </p>
    </div>
  );
}
