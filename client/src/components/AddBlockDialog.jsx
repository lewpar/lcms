import { useState, useRef, useEffect, useMemo } from 'react';

export default function AddBlockDialog({ open, blockTypes, onAdd, onClose }) {
  // Derive groups from the group field on each block type so AddBlockDialog
  // stays in sync with blockTypes.js without a separate GROUPS constant.
  const groups = useMemo(() => {
    const map = new Map();
    for (const bt of blockTypes) {
      if (!bt.group) continue;
      if (!map.has(bt.group)) map.set(bt.group, []);
      map.get(bt.group).push(bt.type);
    }
    return Array.from(map, ([label, types]) => ({ label, types }));
  }, [blockTypes]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setSelected(null);
      setTimeout(() => searchRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const blockMap = Object.fromEntries(blockTypes.map(b => [b.type, b]));
  const q = search.toLowerCase().trim();
  const filtered = q ? blockTypes.filter(b =>
    b.label.toLowerCase().includes(q) || b.type.includes(q)
  ) : null;

  const handleAdd = () => {
    if (!selected) return;
    onAdd(selected);
    onClose();
  };

  const renderBtn = (type) => {
    const bt = blockMap[type];
    if (!bt) return null;
    return (
      <button
        key={type}
        className={`abd-block-btn${selected === type ? ' selected' : ''}`}
        onClick={() => setSelected(type)}
        onDoubleClick={() => { onAdd(type); onClose(); }}
        title={bt.label}
      >
        <span className="abd-block-icon">{bt.icon}</span>
        <span className="abd-block-label">{bt.label}</span>
      </button>
    );
  };

  return (
    <div className="abd-backdrop" onClick={onClose}>
      <div className="abd-dialog" onClick={e => e.stopPropagation()}>
        <div className="abd-header">
          <span className="abd-title">Add Block</span>
          <button className="abd-close btn btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="abd-search-wrap">
          <input
            ref={searchRef}
            className="abd-search"
            type="text"
            placeholder="Search blocks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="abd-list">
          {filtered ? (
            filtered.length === 0
              ? <div className="abd-empty">No blocks match "{search}"</div>
              : <div className="abd-grid">{filtered.map(bt => renderBtn(bt.type))}</div>
          ) : (
            groups.map(group => {
              const items = group.types.filter(t => blockMap[t]);
              if (!items.length) return null;
              return (
                <div key={group.label} className="abd-group">
                  <div className="abd-group-label">{group.label}</div>
                  <div className="abd-grid">{items.map(renderBtn)}</div>
                </div>
              );
            })
          )}
        </div>

        <div className="abd-footer">
          <span className="abd-selection-hint">
            {selected ? `Selected: ${blockMap[selected]?.label}` : 'Click a block to select, double-click to add immediately'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={!selected} onClick={handleAdd}>Add Block</button>
          </div>
        </div>
      </div>
    </div>
  );
}
