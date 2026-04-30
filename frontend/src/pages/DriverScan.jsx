import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, QrCode, ArrowLeft, Truck, Package } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function DriverScan() {
  const [isScanning, setIsScanning] = useState(false);
  const [shipmentId, setShipmentId] = useState('');
  const navigate = useNavigate();
  const scannerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startCamera = async () => {
    setIsScanning(true);
    const html5QrCode = new Html5Qrcode("driver-reader");
    scannerRef.current = html5QrCode;
    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          setShipmentId(decodedText);
          stopCamera();
          // After scan, take driver to the handoff entry page
          // Even if not logged in, we let them enter data, but finalization requires manager/consumer
          navigate(`/handoff?id=${decodedText.trim()}`);
        },
        () => {}
      );
    } catch (err) {
      alert("Camera error: " + err);
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <button onClick={() => navigate('/login')} className="btn btn-outline" style={{ marginBottom: '24px' }}>
        <ArrowLeft size={16} /> Back to Portal
      </button>

      <div className="glass-card animate-fade-in" style={{ textAlign: 'center', padding: '40px 24px' }}>
        <div style={{ width: '64px', height: '64px', background: '#f0f4ff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Truck size={32} color="var(--color-accent)" />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '8px' }}>Driver Quick Scan</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.9rem' }}>Scan the package QR code to initiate a handoff record.</p>

        <div id="driver-reader" style={{ width: '100%', marginBottom: isScanning ? '24px' : '0', borderRadius: '12px', overflow: 'hidden' }}></div>

        {!isScanning ? (
          <button onClick={startCamera} className="btn btn-primary" style={{ width: '100%', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '1.1rem' }}>
            <Camera size={24} /> Start Scanning
          </button>
        ) : (
          <button onClick={stopCamera} className="btn btn-outline" style={{ width: '100%', color: 'var(--color-red)' }}>Cancel</button>
        )}

        <div style={{ marginTop: '32px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
            🛡️ <strong>Secure Entry:</strong> Records initiated here will be queued for Manager and Consumer verification.
          </p>
        </div>
      </div>
    </div>
  );
}
