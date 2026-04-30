import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, User, Search, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const [activeTab, setActiveTab]   = useState('manager');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('password123');
  const [showPass, setShowPass]     = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTimeout(() => {
      const role = activeTab;
      if (activeTab === 'manager' && !email.toLowerCase().includes('manager') && !email.toLowerCase().includes('mediator')) {
        setError('Please use a manager or mediator email.');
        setLoading(false);
        return;
      }
      login('mock-token-123', role);
      if (role === 'manager' || email.includes('mediator')) navigate('/');
      else navigate('/search');
      setLoading(false);
    }, 500);
  };

  return (
    <div className="login-root">
      {/* ── Full-screen looping video background ── */}
      <video
        className="login-video-bg"
        src="/flow-bg.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      {/* Dark overlay */}
      <div className="login-overlay" />

      {/* ── Floating logo ── */}
      <Link to="/about" className="login-brand">
        <div className="login-brand-icon">⛓</div>
        <span className="login-brand-text">Chain<span>Proof</span></span>
      </Link>

      {/* ── Glassmorphism login card ── */}
      <div className="login-card-wrap">
        <div className="login-card">

          {/* Header */}
          <div className="login-card-header">
            <Lock size={28} className="login-lock-icon" />
            <h1 className="login-title">Welcome Back</h1>
            <p className="login-subtitle">Secure access to the provenance portal</p>
          </div>

          {/* Tabs */}
          <div className="login-tabs">
            <button
              className={`login-tab ${activeTab === 'manager' ? 'active' : ''}`}
              onClick={() => { setActiveTab('manager'); setError(''); }}
            >
              <Shield size={15} />
              Manager
            </button>
            <button
              className={`login-tab ${activeTab === 'consumer' ? 'active' : ''}`}
              onClick={() => { setActiveTab('consumer'); setError(''); }}
            >
              <User size={15} />
              Consumer
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="login-form">
            {error && <div className="login-error">{error}</div>}

            <div className="login-field">
              <label className="login-label">
                <Mail size={12} />
                {activeTab === 'manager' ? 'Admin Email' : 'Customer Email'}
              </label>
              <input
                type="email"
                required
                className="login-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={activeTab === 'manager' ? 'manager@chainproof.io' : 'customer@chainproof.io'}
              />
            </div>

            <div className="login-field">
              <label className="login-label">
                <Lock size={12} />
                Password
              </label>
              <div className="login-input-wrap">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  className="login-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setShowPass(v => !v)}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <span className="login-spinner" />
              ) : (
                activeTab === 'manager' ? 'Access Manager Portal' : 'Login as Consumer'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="login-divider">
            <span>or</span>
          </div>

          {/* Driver shortcut */}
          <button
            onClick={() => navigate('/driver-scan')}
            className="login-driver-btn"
          >
            <Search size={15} />
            Quick QR Scan — Driver / Mediator
          </button>

          {/* Footer link */}
          <p className="login-footer-note">
            <Link to="/about">← Learn how ChainProof works</Link>
          </p>
        </div>
      </div>

      {/* Bottom chain label */}
      <div className="login-bottom-badge">
        <span className="login-dot" />
        Blockchain-anchored · Tamper-evident · Real-time
      </div>
    </div>
  );
}
