import React, { useState } from 'react';
import { verifyDocument } from '../api/api';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

export default function DocumentVerify() {
  const [hash, setHash] = useState('');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!file || !hash) return;
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('savedHash', hash);
    formData.append('document', file);

    try {
      const res = await verifyDocument(formData);
      setResult(res);
    } catch (e) {
      alert('Verification failed due to a network error.');
    }
    setLoading(false);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px' }}>Verify Document Integrity</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Upload a document to verify its cryptographic hash against the locked blockchain record.
      </p>

      <form onSubmit={handleVerify} className="glass-card" style={{ marginBottom: '24px' }}>
        <div className="input-group">
          <label>Original Hash (from Shipment Trail)</label>
          <input required type="text" className="input-field" value={hash} onChange={e => setHash(e.target.value)} placeholder="Paste SHA-256 hash here..." />
        </div>
        
        <div className="input-group">
          <label>Upload Document to check</label>
          <input required type="file" className="input-field" style={{ padding: '8px' }} onChange={e => setFile(e.target.files[0])} />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={loading}>
          {loading ? 'Verifying...' : 'Verify Cryptographic Hash'}
        </button>
      </form>

      {result && (
        <div className="glass-card animate-fade-in" style={{ 
          border: `2px solid var(--color-${result.isGenuine ? 'green' : 'red'})`,
          background: `rgba(${result.isGenuine ? '16, 185, 129' : '239, 68, 68'}, 0.1)`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: `var(--color-${result.isGenuine ? 'green' : 'red'})` }}>
            {result.isGenuine ? <ShieldCheck size={32} /> : <ShieldAlert size={32} />}
            <h2 style={{ margin: 0 }}>{result.status}</h2>
          </div>
          <p style={{ marginBottom: '12px' }}>{result.message}</p>
          <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
            <div><strong>Saved Hash:</strong> {result.savedHash}</div>
            <div style={{ marginTop: '4px' }}><strong>Computed Hash:</strong> {result.newHash}</div>
          </div>
        </div>
      )}
    </div>
  );
}
