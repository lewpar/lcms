import { useEffect, useRef } from 'react';

/**
 * Accessible confirmation dialog.
 *
 * Props:
 *   open        — boolean, whether to show the dialog
 *   title       — heading text
 *   message     — body text
 *   confirmLabel — label for the confirm button (default "Delete")
 *   danger      — if true, confirm button uses danger style (default true)
 *   onConfirm   — called when user confirms
 *   onCancel    — called when user cancels or presses Escape
 */
export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  danger = true,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="cdialog-backdrop" onClick={onCancel}>
      <div className="cdialog" role="dialog" aria-modal="true" aria-labelledby="cdialog-title" onClick={e => e.stopPropagation()}>
        <h3 id="cdialog-title" className="cdialog-title">{title}</h3>
        {message && <p className="cdialog-message">{message}</p>}
        <div className="cdialog-actions">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button
            ref={confirmRef}
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
