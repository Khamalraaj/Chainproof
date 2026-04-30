import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createShipment } from '../api/api';
import { anchorShipmentOnChain } from '../api/blockchain';
import { Thermometer, Zap, Download, CheckCircle, Package } from 'lucide-react';
import QRCode from 'qrcode';

export default function CreateShipment() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [successId, setSuccessId] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [formData, setFormData] = useState({
    producerName: '',
    goodsType: 'tomato',
    origin: '',
    destination: '',
    temperatureThreshold: '8',
    initialTemperature: '4.5'
  });

  const vegetableTypes = ["beans", "beetroot", "bitter_gourd", "broccoli", "cabbage", "capsicum", "carrot", "cauliflower", "cucumber", "eggplant", "okra", "onion", "peas", "potato", "radish", "spinach", "tomato"];

  // AUTO-POPULATE REALISTIC SENSOR VALUES
  const simulateSensor = (type) => {
    const isAmbient = type === 'onion' || type === 'potato';
    const threshold = isAmbient ? '25' : '8';
    const randomTemp = isAmbient 
      ? (18 + Math.random() * 6).toFixed(1) 
      : (3.5 + Math.random() * 3).toFixed(1);
    
    setFormData(prev => ({
      ...prev,
      goodsType: type,
      temperatureThreshold: threshold,
      initialTemperature: randomTemp
    }));
  };

  useEffect(() => {
    simulateSensor('tomato');
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'goodsType') {
      simulateSensor(value);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tempId = 'SHP-' + Math.floor(Math.random() * 1000000);
      const shipmentData = { ...formData, shipmentId: tempId };

      await createShipment(shipmentData);
      
      // Generate QR Code
      const url = await QRCode.toDataURL(tempId, {
        width: 400,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' }
      });
      
      setQrDataUrl(url);
      setSuccessId(tempId);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to initialize shipment');
    }
    setLoading(false);
  };

  if (successId) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '500px', margin: '40px auto', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '40px' }}>
          <div style={{ width: '80px', height: '80px', background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle size={40} color="#059669" />
          </div>
          <h2 style={{ marginBottom: '8px' }}>Shipment Initialized!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>ID: <strong style={{ color: 'var(--color-accent)' }}>{successId}</strong></p>
          
          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '32px' }}>
            <img src={qrDataUrl} alt="Shipment QR" style={{ width: '100%', maxWidth: '250px', display: 'block', margin: '0 auto' }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '12px' }}>Scan this QR for Handoff & Tracking</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <a 
              href={qrDataUrl} 
              download={`${successId}-QR.png`} 
              className="btn btn-primary" 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', textDecoration: 'none' }}
            >
              <Download size={18} /> Save QR Code as PNG
            </a>
            <button onClick={() => navigate('/')} className="btn btn-outline">
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '50px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>📦 New Shipment</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Initialize Blockchain & AI Monitoring</p>
      </div>
      
      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '40px' }}>
        <div className="input-group">
          <label style={{ fontWeight: '700' }}>Producer / Farm Name</label>
          <input required type="text" name="producerName" className="input-field" value={formData.producerName} onChange={handleChange} placeholder="e.g. Green Valley Farms" />
        </div>

        <div className="input-group">
          <label style={{ fontWeight: '700' }}>Vegetable Type</label>
          <select name="goodsType" className="input-field" style={{ fontWeight: '600' }} value={formData.goodsType} onChange={handleChange}>
            {vegetableTypes.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="input-group">
            <label style={{ fontWeight: '700' }}>Origin City</label>
            <input required type="text" name="origin" className="input-field" value={formData.origin} onChange={handleChange} placeholder="e.g. Chennai" />
          </div>
          <div className="input-group">
            <label style={{ fontWeight: '700' }}>Destination City</label>
            <input required type="text" name="destination" className="input-field" value={formData.destination} onChange={handleChange} placeholder="e.g. Bangalore" />
          </div>
        </div>

        <div style={{ background: '#f0f9ff', padding: '20px', borderRadius: '16px', border: '1px solid #bae6fd', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#0369a1', fontWeight: '800', fontSize: '0.9rem' }}>
            <Zap size={16} /> AI & SENSOR INITIALIZATION
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label style={{ color: '#0369a1', fontSize: '0.75rem' }}>SAFE THRESHOLD (°C)</label>
              <input required type="number" name="temperatureThreshold" className="input-field" style={{ background: 'white', fontWeight: 'bold' }} value={formData.temperatureThreshold} onChange={handleChange} />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label style={{ color: '#0369a1', fontSize: '0.75rem' }}>INITIAL SENSOR READING (°C)</label>
              <div style={{ position: 'relative' }}>
                <input required type="number" step="0.1" name="initialTemperature" className="input-field" style={{ background: 'white', fontWeight: 'bold', paddingRight: '40px' }} value={formData.initialTemperature} onChange={handleChange} />
                <Thermometer size={18} style={{ position: 'absolute', right: '12px', top: '12px', color: '#0369a1' }} />
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#0369a1', marginTop: '12px', opacity: 0.8 }}>
            Values auto-populated based on {formData.goodsType} biological profiles.
          </p>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '54px', fontSize: '1.1rem', fontWeight: '700' }} disabled={loading}>
          {loading ? 'Securing on Blockchain...' : 'Initialize Shipment'}
        </button>
      </form>
    </div>
  );
}

