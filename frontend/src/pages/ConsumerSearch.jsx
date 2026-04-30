import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Shield, Package, MapPin, Truck, Camera, Upload } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { fetchShipments } from '../api/api';
import { Html5Qrcode } from 'html5-qrcode';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const truckIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

const RoadRoute = ({ shipment }) => {
  const [path, setPath] = useState([]);
  const [truckPos, setTruckPos] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!shipment.originCoords || !shipment.destCoords) return;
    const getRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${shipment.originCoords.lng},${shipment.originCoords.lat};${shipment.destCoords.lng},${shipment.destCoords.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setPath(coords);
          setTruckPos(coords[0]);
        }
      } catch (e) {
        const fallback = [[shipment.originCoords.lat, shipment.originCoords.lng], [shipment.destCoords.lat, shipment.destCoords.lng]];
        setPath(fallback);
        setTruckPos(fallback[0]);
      }
    };
    getRoute();
  }, [shipment.originCoords, shipment.destCoords]);

  // Animation effect synced with global shipment time
  useEffect(() => {
    if (path.length < 2) return;

    const animate = () => {
      const elapsed = Date.now() - shipment.createdAt;
      const duration = 60000; // 60 seconds for arrival

      const p = shipment.isDispatched ? Math.min(1, elapsed / duration) : 0;
      setProgress(p);

      const totalPoints = path.length;
      const currentIndex = Math.floor(p * (totalPoints - 1));
      const nextIndex = Math.min(currentIndex + 1, totalPoints - 1);
      const segmentProgress = (p * (totalPoints - 1)) - currentIndex;

      const currentPoint = path[currentIndex];
      const nextPoint = path[nextIndex];

      if (currentPoint && nextPoint) {
        const lat = currentPoint[0] + (nextPoint[0] - currentPoint[0]) * segmentProgress;
        const lng = currentPoint[1] + (nextPoint[1] - currentPoint[1]) * segmentProgress;
        setTruckPos([lat, lng]);
      }

      if (p < 1) {
        requestAnimationFrame(animate);
      }
    };

    const animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [path, shipment.createdAt]);

  if (path.length === 0) return null;

  return (
    <>
      <Polyline positions={path} pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.2, dashArray: '5, 10' }} />
      <Polyline positions={path.slice(0, Math.floor(progress * path.length) + 1)} pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.8 }} />
      {truckPos && (
        <Marker position={truckPos} icon={truckIcon}>
          <Popup>
            <div style={{ textAlign: 'center' }}>
              <strong>{!shipment.isDispatched ? '📦 Ready at Origin' : (progress >= 1 ? '⚠️ Awaiting Verification' : 'In Transit')}</strong><br/>
              Shipment: {shipment.shipmentId}<br/>
              Status: {shipment.status.toUpperCase()}
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
};

export default function ConsumerSearch() {
  const [shipmentId, setShipmentId] = useState('');
  const [shipments, setShipments] = useState([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const data = await fetchShipments();
      setShipments(data || []);
    };
    load();
    const interval = setInterval(load, 5000);
    window.addEventListener('storage', load);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', load);
      if (scannerRef.current) scannerRef.current.stop().catch(() => {});
    };
  }, []);


  // Update UI every 100ms for smooth animation sync
  useEffect(() => {
    const ticker = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);
    return () => clearInterval(ticker);
  }, []);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (shipmentId.trim()) {
      navigate(`/shipment/${shipmentId.trim()}`);
    }
  };

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

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 350px', gap: '24px', height: 'calc(100vh - 150px)' }}>
        
        {/* Search & Intro */}
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', background: '#f0f4ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={24} color="var(--color-accent)" />
            </div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '800', letterSpacing: '-1px' }}>
              Track <span style={{ color: 'var(--color-accent)' }}>Shipment</span>
            </h1>
          </div>

          <div className="glass-card" style={{ padding: '24px' }}>
            <div id="reader" style={{ width: '100%', marginBottom: isScanning ? '16px' : '0' }} />
            
            {!isScanning ? (
              <>
                <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                  <div className="input-group">
                    <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>ENTER SHIPMENT ID</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      style={{ padding: '12px', fontSize: '1.1rem', fontWeight: '700' }} 
                      placeholder="SHP-XXXXX" 
                      value={shipmentId} 
                      onChange={e => setShipmentId(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ height: '48px', fontWeight: '700' }}>
                    Verify on Blockchain
                  </button>
                </form>

                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>— OR —</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button onClick={startCamera} className="btn btn-outline" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
                    <Camera size={20} /><span style={{ fontSize: '0.75rem', fontWeight: '700' }}>Scan QR Code</span>
                  </button>
                  <label className="btn btn-outline" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', cursor: 'pointer' }}>
                    <Upload size={20} /><span style={{ fontSize: '0.75rem', fontWeight: '700' }}>Upload QR Image</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                  </label>
                </div>
              </>
            ) : (
              <button onClick={stopCamera} className="btn btn-outline" style={{ width: '100%', color: 'var(--color-red)' }}>Cancel Scanner</button>
            )}
          </div>

          <div className="glass-card" style={{ padding: '20px', background: '#f8fafc' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>Are you a logistics partner or driver?</p>
            <button onClick={() => navigate('/handoff')} className="btn btn-outline" style={{ width: '100%', fontSize: '0.85rem' }}>
              <Package size={16} /> Confirm Receipt / Log Handoff
            </button>
          </div>
        </div>

        {/* Live Map */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 1000, background: 'rgba(255,255,255,0.9)', padding: '8px 16px', borderRadius: '30px', fontSize: '0.7rem', fontWeight: '800', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
            LIVE FLEET MONITOR
          </div>
          <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
            <TileLayer 
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" 
              attribution='&copy; OpenStreetMap'
            />
            {shipments.map(s => (
              <React.Fragment key={s._id}>
                <RoadRoute shipment={s} />
              </React.Fragment>
            ))}
          </MapContainer>
        </div>

        {/* Active Fleet Sidebar (Matching Manager Side) */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={18} color="var(--color-accent)" /> In-Transit Orders
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {shipments.filter(s => !s.isDelivered).map(s => {
              const elapsed = currentTime - s.createdAt;
              const duration = 60000;

              const progress = s.isDispatched ? Math.min(100, (elapsed / duration) * 100) : 0;
              
              return (
                <div key={s._id} className="glass-card" style={{ padding: '16px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem' }}>{s.shipmentId}</h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{s.origin} → {s.destination}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '4px' }}>
                    <span>{!s.isDispatched ? 'Waiting for Dispatch' : (progress >= 100 ? '⚠️ Awaiting Verification' : 'In Transit')}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(0,0,0,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: 'var(--color-accent)', transition: 'width 0.1s linear' }} />
                  </div>
                </div>
              );
            })}

            {shipments.filter(s => s.isDelivered).length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--color-green)' }}>Recently Delivered</h3>
                {shipments.filter(s => s.isDelivered).map(s => (
                  <div key={s._id} className="glass-card" style={{ padding: '12px', marginBottom: '8px', borderLeft: '4px solid var(--color-green)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700' }}>{s.shipmentId}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Arrived at {s.destination}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Are you a logistics partner or driver?</p>
        <button onClick={() => navigate('/handoff')} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '12px 32px' }}>
          <Package size={18} /> Confirm Receipt / Log Handoff
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.7; }
          70% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
