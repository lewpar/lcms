'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getAssets, deleteAsset, uploadAsset } from '../api.js';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaManager({ siteId, mode = 'full', onSelect, onClose, addToast }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // filename to confirm delete
  const [pickerSelected, setPickerSelected] = useState(null); // { filename, url }
  const fileRef = useRef();

  const loadAssets = async () => {
    setLoading(true);
    try {
      setAssets(await getAssets(siteId));
    } catch {
      addToast('Failed to load assets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAssets(); }, [siteId]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      await uploadAsset(siteId, file);
      await loadAssets();
      addToast('Image uploaded', 'success');
    } catch {
      addToast('Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    const filename = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteAsset(siteId, filename);
      await loadAssets();
      addToast('Asset deleted', 'success');
    } catch {
      addToast('Failed to delete asset', 'error');
    }
  };

  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(window.location.origin + url).catch(() => {});
    addToast('URL copied', 'success');
  };

  const grid = (
    <div className="media-grid">
      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: 8 }}>Loading…</p>
      ) : assets.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: 8 }}>No images uploaded yet.</p>
      ) : (
        assets.map(asset => (
          <div
            key={asset.filename}
            className={`media-item${mode === 'picker' && pickerSelected?.filename === asset.filename ? ' media-item--selected' : ''}`}
            onClick={mode === 'picker' ? () => setPickerSelected({ filename: asset.filename, url: asset.url }) : undefined}
            style={mode === 'picker' ? { cursor: 'pointer' } : undefined}
          >
            <img className="media-item-img" src={asset.url} alt={asset.filename} />
            <div className="media-item-info">
              <div className="media-item-filename" title={asset.filename}>{asset.filename}</div>
              <div className="media-item-size">{formatSize(asset.size)}</div>
              {mode === 'full' && (
                <div className="media-item-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleCopyUrl(asset.url)}
                    title="Copy URL"
                  >Copy URL</button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => setDeleteTarget(asset.filename)}
                    title="Delete"
                  >✕</button>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  const deleteDialog = deleteTarget && (
    <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: 8 }}>Delete image?</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, wordBreak: 'break-all' }}>
          <strong>{deleteTarget}</strong> will be permanently deleted.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
        </div>
      </div>
    </div>
  );

  if (mode === 'picker') {
    return createPortal(
      <>
        <div className="media-picker-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
          <div className="media-picker-dialog">
            <div className="media-toolbar">
              <span style={{ fontWeight: 700, fontSize: 16 }}>Select Image</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => fileRef.current.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading…' : '+ Upload'}
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
                <button className="btn btn-secondary btn-sm" onClick={onClose}>✕ Close</button>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 12px' }}>
              {assets.length} image{assets.length !== 1 ? 's' : ''}
            </p>
            {grid}
            <div className="media-picker-footer">
              <span className="media-picker-selection">
                {pickerSelected ? pickerSelected.filename : 'No image selected'}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={!pickerSelected}
                  onClick={() => { onSelect(pickerSelected); }}
                >Select</button>
              </div>
            </div>
          </div>
        </div>
        {deleteDialog}
      </>,
      document.body
    );
  }

  // full mode
  return (
    <>
      <div className="media-manager">
        <div className="media-toolbar">
          <span style={{ fontWeight: 700, fontSize: 18 }}>Media</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {assets.length} image{assets.length !== 1 ? 's' : ''}
            </span>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => fileRef.current.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : '+ Upload Image'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
          </div>
        </div>
        {grid}
      </div>
      {deleteDialog}
    </>
  );
}
