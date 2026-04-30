import React, { useState, useRef, useEffect } from 'react';
import { logHandoff, fetchShipmentDetails } from '../api/api';
import { anchorHandoffOnChain } from '../api/blockchain';
import { Truck, CheckCircle, Camera, Upload, Zap } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

// Native canvas signature pad — no library needed
const SignaturePad = ({ padRef }) => {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
    canvas.style.background = 'white';

    // Expose helpers to parent
    padRef.current = {
      isEmpty: () => {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        return !data.some(v => v !== 0 && v !== 255);
      },
      getTrimmedCanvas: () => canvas,
      clear: () => ctx.clearRect(0, 0, canvas.width, canvas.height),
    };
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    isDrawing.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stop = (e) => {
    e.preventDefault();
    isDrawing.current = false;
  };

  return (
    <canvas
      ref={canvasRef}
      width={436}
      height={180}
      onMouseDown={start}
      onMouseMove={move}
      onMouseUp={stop}
      onMouseLeave={stop}
      onTouchStart={start}
      onTouchMove={move}
      onTouchEnd={stop}
      style={{ display: 'block', cursor: 'crosshair', width: '100%', touchAction: 'none' }}
    />
  );
};

export default function MediatorHandoff() {
  const [step, setStep] = useState(1);
  const [shipmentId, setShipmentId] = useState('');
  const [temperature, setTemperature] = useState('');
  const [locationName, setLocationName] = useState('');
  const [isDocVerified, setIsDocVerified] = useState(false);
  const [shipmentData, setShipmentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [availableShipments, setAvailableShipments] = useState([]);
  const sigPad = useRef({});
  const scannerRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const shps = await fetchShipments();
      // Filter for shipments that are approved but not yet dispatched (waiting for first handoff)
      setAvailableShipments(shps.filter(s => !s.isDelivered) || []);
    };
    load();
  }, []);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startCamera = async () => {
    setIsScanning(true);
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;
    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => { setShipmentId(decodedText); stopCamera(); },
        () => {}
      );
    } catch (err) {
      alert("Camera access denied: " + err);
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const html5QrCode = new Html5Qrcode("reader");
    try {
      const decodedText = await html5QrCode.scanFile(file, true);
      setShipmentId(decodedText);
      alert("QR Scanned: " + decodedText);
    } catch {
      alert("No QR code found in image.");
    }
  };

  const handleSubmit = async () => {
    if (!isDocVerified) return alert('Please verify driver credentials');
    if (!sigPad.current || sigPad.current.isEmpty()) return alert('Please provide a signature');

    setLoading(true);
    try {
      const signatureBase64 = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
      const finalTemp = parseFloat(temperature) || 4.5;
      const docHash = 'DOC-' + Math.random().toString(36).substr(2, 9);

      console.log("🚀 Anchoring handoff to blockchain...");
      const txHash = await anchorHandoffOnChain(
        shipmentId,
        locationName,
        finalTemp,
        docHash,
        signatureBase64
      );
      console.log("✅ Confirmed:", txHash);

      // 2. Save locally
      const formData = new FormData();
      formData.append('shipmentId', shipmentId);
      formData.append('temperature', String(finalTemp));
      formData.append('locationName', locationName);
      formData.append('mediatorSignature', signatureBase64);
      const res = await logHandoff(formData);
      if (!res.success) {
        alert(`Warning: Blockchain updated, but local record update failed: ${res.message}`);
      }


      setSuccess(`Anchored to Blockchain!\nTx: ${txHash}`);
      setStep(4);
    } catch (err) {
      console.error("❌ Handoff Error:", err);
      alert(`Blockchain Error: ${err.message || 'Transaction failed.'}`);
    }
    setLoading(false);
  };

  const nextStep = async () => {
    if (step === 1 && !shipmentId) return alert('Please scan or enter Shipment ID');
    if (step === 1) {
      setLoading(true);
      try {
        const details = await fetchShipmentDetails(shipmentId);
        if (details?.shipment) {
          setShipmentData(details.shipment);
          const rand = (details.shipment.temperatureThreshold - 1.5 + Math.random() * 3).toFixed(1);
          setTemperature(rand);
        } else {
          setTemperature((4.5 + Math.random() * 2).toFixed(1));
        }
      } catch {
        setTemperature((4.5 + Math.random() * 2).toFixed(1));
      }
      setLoading(false);
    }
    setStep(s => s + 1);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>📦 Log Handoff</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Record Physical Custody Transfer</p>
      </div>

      {step < 4 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ width: '40px', height: '6px', borderRadius: '3px', background: s <= step ? 'var(--color-accent)' : 'var(--border-light)' }} />
          ))}
        </div>
      )}

      <div className="glass-card" style={{ padding: '32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Zap size={48} color="var(--color-accent)" style={{ margin: '0 auto 16px', display: 'block' }} />
            <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>Sending to Blockchain...</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              👀 Check MetaMask for a confirmation popup
            </div>
          </div>
        ) : (
          <>
            {step === 1 && (
              <div className="animate-fade-in">
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ width: '80px', height: '80px', background: '#f0f4ff', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Truck size={40} color="var(--color-accent)" />
                  </div>
                  <h3 style={{ marginBottom: '8px' }}>Step 1: Identify Shipment</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Scan QR or enter ID manually</p>
                </div>
                <div id="reader" style={{ width: '100%', marginBottom: isScanning ? '16px' : '0' }} />
                {!isScanning ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                    <button onClick={startCamera} className="btn btn-outline" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '20px' }}>
                      <Camera size={24} /><span style={{ fontSize: '0.8rem' }}>Use Camera</span>
                    </button>
                    <label className="btn btn-outline" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '20px', cursor: 'pointer' }}>
                      <Upload size={24} /><span style={{ fontSize: '0.8rem' }}>Upload Photo</span>
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                    </label>
                  </div>
                ) : (
                  <button onClick={stopCamera} className="btn btn-outline" style={{ width: '100%', marginBottom: '20px', color: 'var(--color-red)' }}>Stop Scanner</button>
                )}
                {availableShipments.length > 0 && !isScanning && (
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>AVAILABLE FOR PICKUP</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {availableShipments.slice(0, 3).map(s => (
                        <div 
                          key={s._id} 
                          onClick={() => setShipmentId(s.shipmentId)}
                          style={{ 
                            padding: '12px', 
                            background: shipmentId === s.shipmentId ? '#f0f4ff' : 'white', 
                            border: `1px solid ${shipmentId === s.shipmentId ? 'var(--color-accent)' : 'var(--border-light)'}`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.85rem'
                          }}
                        >
                          <div>
                            <strong>{s.shipmentId}</strong>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.origin} → {s.destination}</div>
                          </div>
                          {!s.isDispatched && <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '10px' }}>Waiting</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="input-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>OR ENTER SHIPMENT ID MANUALLY</label>
                  <input type="text" className="input-field" style={{ textAlign: 'center', fontSize: '1.1rem', letterSpacing: '2px' }} value={shipmentId} onChange={e => setShipmentId(e.target.value)} placeholder="SHP-XXXXX" />
                </div>
                <button onClick={nextStep} className="btn btn-primary" style={{ width: '100%', padding: '14px' }}>Next: Driver Details</button>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-in">
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <h3>Step 2: Driver Details</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Shipment: <strong>{shipmentId}</strong></p>
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)' }}>DRIVER FULL NAME</label>
                  <input type="text" className="input-field" placeholder="e.g. John Doe" value={locationName} onChange={e => setLocationName(e.target.value)} />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)' }}>DRIVER LICENSE / ID</label>
                  <input type="text" className="input-field" placeholder="DL-XXXXXXXX" />
                </div>
                <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="checkbox" id="docCheck" style={{ width: '20px', height: '20px' }} checked={isDocVerified} onChange={e => setIsDocVerified(e.target.checked)} />
                    <label htmlFor="docCheck" style={{ fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}>✅ I have verified the driver's identity</label>
                  </div>
                </div>
                <button onClick={nextStep} className="btn btn-primary" style={{ width: '100%', padding: '14px' }}>Next: Signature</button>
              </div>
            )}

            {step === 3 && (
              <div className="animate-fade-in">
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <h3>Step 3: Digital Signature</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sign below to anchor to blockchain</p>
                </div>
                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '2px dashed var(--border-light)', marginBottom: '12px', background: 'white' }}>
                  <SignaturePad padRef={sigPad} />
                </div>
                <button onClick={() => sigPad.current?.clear()} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '20px' }}>
                  Clear Signature
                </button>
                <button onClick={handleSubmit} className="btn btn-primary" style={{ width: '100%', padding: '14px', background: '#10b981' }}>
                  ⛓️ Finalize & Anchor to Chain
                </button>
                <button onClick={() => setStep(2)} style={{ width: '100%', background: 'none', border: 'none', color: 'var(--text-secondary)', marginTop: '12px', cursor: 'pointer' }}>Go Back</button>
              </div>
            )}

            {step === 4 && (
              <div className="animate-fade-in" style={{ textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  <CheckCircle size={40} color="#059669" />
                </div>
                <h2>Handoff Anchored!</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '12px', fontSize: '0.85rem', wordBreak: 'break-all' }}>{success}</p>
                <button onClick={() => { setStep(1); setShipmentId(''); setLocationName(''); setIsDocVerified(false); setSuccess(null); }} className="btn btn-primary" style={{ width: '100%', marginTop: '24px' }}>
                  New Handoff
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
