import { useEffect, useState } from 'react';

const ICON_GROUPS = [
  { label: 'General',  icons: ['📄','📋','📝','✏️','📌','🔖','📎','🗂️','🗒️','📃'] },
  { label: 'Learning', icons: ['📚','📖','🎓','🧠','💡','🔬','🧪','🏆','🎯','📐'] },
  { label: 'Topics',   icons: ['💻','⚙️','🔧','📊','📈','🗺️','🌐','📡','🔑','🛠️'] },
  { label: 'Media',    icons: ['▶','🎬','🖼️','📰','🎵','🎙️','📷','🖥️','📱','🔊'] },
  { label: 'Status',   icons: ['✅','❌','⚠️','❓','ℹ️','🚀','⭐','🔴','🟡','🟢'] },
  { label: 'People',   icons: ['👤','👥','🤝','👋','🏢','🌍','💬','📢','🧑‍💻','👩‍🏫'] },
];

export default function IconPickerDialog({ open, current, onSelect, onClose }) {
  const [pending, setPending] = useState(current || '');

  useEffect(() => {
    if (open) setPending(current || '');
  }, [open, current]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleApply = () => {
    onSelect(pending);
    onClose();
  };

  const handleClear = () => {
    onSelect('');
    onClose();
  };

  return (
    <div className="ipd-backdrop" onClick={onClose}>
      <div className="ipd-dialog" onClick={e => e.stopPropagation()}>
        <div className="ipd-header">
          <span className="ipd-title">
            Pick Icon {pending ? <span style={{ marginLeft: 6 }}>{pending}</span> : ''}
          </span>
          <button className="ipd-close btn btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="ipd-list">
          {ICON_GROUPS.map(group => (
            <div key={group.label} className="ipd-group">
              <div className="ipd-group-label">{group.label}</div>
              <div className="ipd-grid">
                {group.icons.map(icon => (
                  <button
                    key={icon}
                    className={`ipd-icon-btn${pending === icon ? ' selected' : ''}`}
                    onClick={() => setPending(icon)}
                    title={icon}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="ipd-footer">
          {current && (
            <button className="btn btn-secondary btn-sm" onClick={handleClear}>
              Clear Icon
            </button>
          )}
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={!pending} onClick={handleApply}>
              Set Icon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
