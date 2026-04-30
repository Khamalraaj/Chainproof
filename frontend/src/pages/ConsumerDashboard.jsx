import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, MapPin, Clock, ArrowRight, UserCheck, ShieldCheck } from 'lucide-react';
import { fetchPendingHandoffs, signHandoff } from '../api/api';

export default function ConsumerDashboard() {
  const navigate = useNavigate();
  const [pending, setPending] = useState([]);
  
  const loadPending = async () => {
    const data = await fetchPendingHandoffs();
    setPending(data);
  };

  useEffect(() => { loadPending(); }, []);

  // Mock data for the consumer's active orders
  const myOrders = [
    { id: 'SHP-229697', item: 'Tomato - Apple', status: 'In Transit', location: 'Banglore', lastUpdate: '2 mins ago' },
    { id: 'SHP-884122', item: 'Potato', status: 'Delivered', location: 'Chennai', lastUpdate: '2 days ago' }
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '20px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: '800', letterSpacing: '-1px' }}>Hello, Customer 👋</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Welcome to your personalized provenance portal.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>

        
        {/* Search Section */}
        <div className="glass-card" style={{ padding: '32px' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={20} color="var(--color-accent)" /> Track Shipment
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>Enter your shipment ID below to view the live truth trail.</p>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const id = e.target.shipId.value;
            if(id) navigate(`/shipment/${id}`);
          }} style={{ display: 'flex', gap: '10px' }}>
            <input name="shipId" type="text" className="input-field" placeholder="SHP-XXXXX" style={{ flex: 1 }} />
            <button type="submit" className="btn btn-primary">Track</button>
          </form>

          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
             <h4 style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Shipment Actions</h4>
             <button onClick={() => navigate('/handoff')} className="btn btn-outline" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
               <Package size={18} /> Confirm Receipt / Log Handoff
             </button>
          </div>
        </div>

        {/* Orders Section */}
        <div style={{ gridColumn: 'span 2' }}>
          <h3 style={{ marginBottom: '24px' }}>My Active Shipments</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {myOrders.map(order => (
              <div 
                key={order.id} 
                className="glass-card" 
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '24px', cursor: 'pointer', transition: 'transform 0.2s' 
                }}
                onClick={() => navigate(`/shipment/${order.id}`)}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <div style={{ width: '50px', height: '50px', background: '#f0f4ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={24} color="var(--color-accent)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>{order.id}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{order.item}</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</div>
                    <div style={{ color: order.status === 'Delivered' ? 'var(--color-green)' : 'var(--color-accent)', fontWeight: '700' }}>{order.status}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Location</div>
                    <div style={{ fontWeight: '600' }}><MapPin size={14} /> {order.location}</div>
                  </div>
                  <ArrowRight size={20} color="var(--border-light)" />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="glass-card" style={{ marginTop: '40px', padding: '24px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', border: 'none' }}>
        <h4 style={{ marginBottom: '8px' }}>🛡️ Blockchain Verified</h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          All data shown here is cross-referenced with the Ethereum Mainnet. We ensure that your perishable goods remain within safe temperature limits throughout their journey.
        </p>
      </div>
    </div>
  );
}
