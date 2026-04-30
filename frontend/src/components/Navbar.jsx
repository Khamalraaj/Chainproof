import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, PlusCircle, LogOut, CheckSquare, FileCheck, Brain, Map as MapIcon, ClipboardList, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchAnomalies } from '../api/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anomalyCount, setAnomalyCount] = React.useState(0);

  React.useEffect(() => {
    if (user && (user.role === 'manager' || user.role === 'senior_manager')) {
      const load = async () => {
        try {
          const data = await fetchAnomalies();
          setAnomalyCount(data.length);
        } catch (e) {}
      };
      load();
      const interval = setInterval(load, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        <Package className="text-accent" />
        Chain<span>Proof</span>
      </Link>
      
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        
        {/* PUBLIC / CUSTOMER FEATURES */}
        <Link to="/search" className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
           <Search size={16} /> Customer Tracking
        </Link>

        {user && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginLeft: '12px', paddingLeft: '12px', borderLeft: '1px solid var(--border-light)' }}>
            
            {/* CUSTOMER/MANAGER DASHBOARD LINK */}
            {(user.role === 'customer' || user.role === 'manager') && (
              <Link to="/" className="btn btn-outline">
                <MapIcon size={18} /> Live Map
              </Link>
            )}

            {/* MEDIATOR FEATURES */}
            {user.role === 'mediator' && (
              <Link to="/handoff" className="btn btn-primary">
                <ClipboardList size={18} /> Log Handoff
              </Link>
            )}

            {/* MANAGER FEATURES ONLY */}
            {(user.role === 'manager' || user.role === 'senior_manager') && (
              <>
                {anomalyCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-red)', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    <Brain size={14} /> {anomalyCount} Alerts
                  </div>
                )}
                <Link to="/handoff" className="btn btn-outline">
                  <ClipboardList size={18} /> Log Handoff
                </Link>
                <Link to="/signoff" className="btn btn-outline">
                  <CheckSquare size={18} /> Sign-off
                </Link>
                <Link to="/create" className="btn btn-primary animate-fade-in">
                  <PlusCircle size={18} /> New Shipment
                </Link>
              </>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '8px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-accent)', textTransform: 'uppercase', fontWeight: 'bold' }}>{user.role}</div>
              </div>
              <button onClick={handleLogout} className="btn" style={{ background: 'rgba(0,0,0,0.05)', padding: '8px' }}>
                <LogOut size={18} />
              </button>
            </div>
          </div>
        )}

        {!user && (
          <Link to="/login" className="btn btn-primary" style={{ marginLeft: '16px' }}>Login</Link>
        )}
      </div>
    </nav>
  );
}
