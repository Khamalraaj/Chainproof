import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, FileText, AlertTriangle, Brain, ShieldCheck, MapPin, Thermometer, User, Hash, Clock } from 'lucide-react';
import { fetchShipmentDetails, confirmDelivery } from '../api/api';

import { verifyShipmentOnChain } from '../api/blockchain';

export default function ShipmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [blockchainProof, setBlockchainProof] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await fetchShipmentDetails(id);
        setData(result);
        
        // 2. Cross-verify with Blockchain
        if (result && result.shipment) {
          const proof = await verifyShipmentOnChain(result.shipment.shipmentId);
          setBlockchainProof(proof);
        }
      } catch (e) {
        console.error("Verification error:", e);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Loading Shipment Truth Trail...</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: '50px' }}>Shipment Not Found</div>;

  const { shipment, handoffs } = data;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '100px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <button onClick={() => navigate(-1)} className="btn btn-outline">
          <ArrowLeft size={16} /> Back
        </button>
        {blockchainProof?.exists && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-green)', fontWeight: '700' }}>
            <ShieldCheck size={20} /> 
            Blockchain Verified
          </div>
        )}
      </div>

      {/* Header Info */}
      <div className="glass-card" style={{ marginBottom: '32px', borderTop: `6px solid var(--color-${shipment.status === 'green' ? 'success' : (shipment.status === 'amber' ? 'warning' : 'danger')})` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-1px' }}>{shipment.shipmentId}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>{shipment.goodsType} · {shipment.producerName}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              background: shipment.status === 'green' ? '#d1fae5' : (shipment.status === 'amber' ? '#fef3c7' : '#fee2e2'),
              color: shipment.status === 'green' ? '#065f46' : (shipment.status === 'amber' ? '#92400e' : '#b91c1c'),
              padding: '8px 20px', borderRadius: '40px', fontWeight: '800', textTransform: 'uppercase', fontSize: '0.9rem'
            }}>
              {shipment.status.toUpperCase()}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>Blockchain ID: {shipment.shipmentId.split('-')[1] || '0x442'}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginTop: '32px', padding: '20px', background: '#f8f9fa', borderRadius: '16px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Origin</span>
            <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {shipment.origin}</div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Current Destination</span>
            <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {shipment.isRerouted ? shipment.rerouteDestination : shipment.destination}</div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Temp Limit</span>
            <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}><Thermometer size={14} /> {shipment.temperatureThreshold}°C</div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Current Temp</span>
            <div style={{ fontWeight: '800', color: shipment.currentTemperature > shipment.temperatureThreshold ? 'var(--color-red)' : 'var(--color-green)', fontSize: '1.2rem' }}>
              {shipment.currentTemperature?.toFixed(1)}°C
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Shelf Life Left</span>
            <div style={{ fontWeight: '600', color: shipment.status === 'green' ? 'var(--color-green)' : 'var(--color-red)' }}>{shipment.shelfLifeDays} Days</div>
          </div>
        </div>

        {/* Driver Details Section */}
        <div style={{ marginTop: '24px', padding: '20px', background: '#eff6ff', borderRadius: '16px', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '50px', height: '50px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <User size={24} color="var(--color-accent)" />
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: '800', textTransform: 'uppercase' }}>Current Handler / Driver</span>
            <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#1e3a8a' }}>{handoffs[handoffs.length-1]?.mediatorName || 'Pending Dispatch'}</div>
            <p style={{ fontSize: '0.8rem', color: '#60a5fa' }}>Verified via Digital Signature</p>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        ⛓ Truth Trail <span style={{ fontSize: '0.9rem', fontWeight: '400', color: 'var(--text-muted)' }}>({handoffs.length} entries locked)</span>
      </h2>

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: '32px' }}>
        <div style={{ position: 'absolute', left: '7px', top: '0', bottom: '0', width: '2px', background: 'var(--border-light)' }}></div>
        
        {handoffs.map((h, i) => (
          <div key={h._id} className="animate-fade-in" style={{ position: 'relative', marginBottom: '40px' }}>
            <div style={{ 
              position: 'absolute', left: '-32px', top: '4px', width: '16px', height: '16px', 
              borderRadius: '50%', background: 'white', border: `3px solid ${h.managerApproved ? 'var(--color-green)' : 'var(--color-accent)'}`, zIndex: 2
            }}></div>
            
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={18} color="var(--color-accent)" /> {h.locationName}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(h.timestamp || h.createdAt).toLocaleString()}</p>
                </div>
                <div style={{ 
                  background: h.temperature > shipment.temperatureThreshold ? '#fee2e2' : '#f0f4ff',
                  color: h.temperature > shipment.temperatureThreshold ? '#b91c1c' : 'var(--color-accent)',
                  padding: '6px 14px', borderRadius: '8px', fontWeight: '800', fontSize: '1rem'
                }}>
                  {h.temperature}°C
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={16} color="var(--text-muted)" />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Handler / Driver</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{h.mediatorName}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '700', color: h.managerApproved ? 'var(--color-green)' : 'var(--text-muted)' }}>
                    <ShieldCheck size={14} /> Manager {h.managerApproved ? 'Verified' : 'Pending Audit'}
                  </div>
                </div>
              </div>

              <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  <Hash size={14} />
                  <span style={{ fontFamily: 'monospace' }}>Record: {h.finalized ? 'ANCHORED TO CHAIN' : 'PENDING APPROVAL'}</span>
                </div>
                {h.finalized && <div style={{ color: 'var(--color-green)', fontSize: '0.75rem', fontWeight: '700' }}>VERIFIED</div>}
              </div>
            </div>
          </div>
        ))}

        {/* Action Button for Customer */}
        {!shipment.isDelivered && (
          <div className="glass-card" style={{ marginTop: '40px', padding: '32px', textAlign: 'center', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '2px dashed var(--color-accent)' }}>
            <h3 style={{ marginBottom: '12px' }}>Package at Destination?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Please verify the physical condition and temperature integrity before confirming receipt.</p>
            <button 
              className="btn btn-primary" 
              style={{ padding: '12px 32px' }}
              onClick={async () => {
                if (window.confirm("Confirm receipt and quality check? This will lock the truth trail on the blockchain.")) {
                  const res = await confirmDelivery(shipment.shipmentId);
                  if (res.success) {
                    alert("Delivery Confirmed! Blockchain record updated.");
                    window.location.reload();
                  } else {
                    alert(res.message);
                  }
                }
              }}
            >
              <CheckCircle size={18} /> Confirm Receipt & Verify Quality
            </button>
          </div>
        )}

        {shipment.isDelivered && (
          <div className="glass-card" style={{ marginTop: '40px', padding: '32px', textAlign: 'center', background: 'var(--color-green)', color: 'white' }}>
            <CheckCircle size={48} style={{ marginBottom: '16px' }} />
            <h2>Order Delivered & Verified</h2>
            <p>The entire truth trail has been permanently locked on the Ethereum blockchain.</p>
          </div>
        )}
      </div>

    </div>
  );
}
