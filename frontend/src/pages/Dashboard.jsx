import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Package, MapPin, Navigation, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { fetchShipments, fetchAnomalies, approveReroute, deleteShipment } from '../api/api';
import StatusBadge from '../components/StatusBadge';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
const icons = { green: createIcon('green'), amber: createIcon('orange'), red: createIcon('red') };

// Truck icon for moving vehicle
const truckIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png', // Premium delivery truck icon
  iconSize: [35, 35],
  iconAnchor: [17, 17],
  popupAnchor: [0, -15],
});

// COMPONENT TO FETCH AND RENDER REAL ROAD ROUTING (OSRM) WITH ANIMATED TRUCK
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

      const p = (shipment.isDispatched === true) ? Math.min(1, elapsed / duration) : 0;
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
      <Polyline 
        positions={path}
        pathOptions={{ 
          color: shipment.status === 'red' ? '#ef4444' : (shipment.status === 'amber' ? '#f59e0b' : '#3b82f6'),
          weight: 5,
          opacity: 0.4,
          lineJoin: 'round',
          dashArray: '10, 10'
        }}
      />
      {/* Animated Path (completed part) */}
      <Polyline 
        positions={path.slice(0, Math.floor(progress * path.length) + 1)}
        pathOptions={{ 
          color: shipment.status === 'red' ? '#ef4444' : (shipment.status === 'amber' ? '#f59e0b' : '#3b82f6'),
          weight: 5,
          opacity: 1,
          lineJoin: 'round'
        }}
      />
      {truckPos && (
        <Marker position={truckPos} icon={truckIcon}>
          <Popup>
            <div style={{ textAlign: 'center' }}>
              <strong>{!shipment.isDispatched ? '📦 Ready at Origin' : (progress >= 1 ? '⚠️ Awaiting Verification' : 'In Transit')}</strong><br/>
              Shipment: {shipment.shipmentId}<br/>
              Progress: {Math.round(progress * 100)}%
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
};

export default function Dashboard() {
  const [shipments, setShipments] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const load = async () => {
    try {
      const shps = await fetchShipments();
      const anom = await fetchAnomalies();
      
      setShipments(shps || []);
      setAnomalies(anom || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    window.addEventListener('storage', load);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', load);
    };
  }, []);

  useEffect(() => {
    const ticker = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    const cleanup = setInterval(async () => {
      const now = Date.now();
      const toDelete = shipments.filter(s => (now - s.createdAt) / 1000 >= 600);
      
      for (const s of toDelete) {
        await deleteShipment(s._id);
      }
      
      if (toDelete.length > 0) load();
    }, 2000);
    return () => clearInterval(cleanup);
  }, [shipments]);

  const handleReroute = async (id) => {
    try {
      await approveReroute(id);
      load();
    } catch (e) { alert('Failed to approve reroute'); }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', height: 'calc(100vh - 120px)' }}>
      
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-primary)' }}>📍 AI Logistics Command Center</h2>
          <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-green)' }}></span> Safe</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-amber)' }}></span> Warning</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-red)' }}></span> Critical</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
            <TileLayer 
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" 
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {shipments.map(s => (
              <React.Fragment key={s._id}>
                {s.destCoords && (
                  <Marker position={[s.destCoords.lat, s.destCoords.lng]} icon={new L.Icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    shadowSize: [41, 41]
                  })}>
                    <Popup>
                      <div style={{ textAlign: 'center' }}>
                        <strong>Destination</strong><br/>
                        {s.destination}
                      </div>
                    </Popup>
                  </Marker>
                )}
                <RoadRoute shipment={s} />
              </React.Fragment>
            ))}
          </MapContainer>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
        {anomalies.length > 0 && (
          <div>
            <h3 style={{ marginBottom: '12px', color: 'var(--color-red)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} /> Action Required
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {anomalies.map(a => (
                <div key={a._id} className="glass-card" style={{ border: `1px solid var(--color-${a.status})`, padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong style={{ color: `var(--color-${a.status})` }}>{a.shipmentId}</strong>
                    <span style={{ fontWeight: 'bold' }}>{a.currentTemperature?.toFixed(1)}°C</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    {a.statusMessage}
                  </p>
                  
                  {a.status === 'red' && !a.isRerouted && (
                    <button className="btn" style={{ background: 'var(--color-amber)', color: 'black', width: '100%', fontSize: '0.85rem' }} onClick={() => handleReroute(a.shipmentId)}>
                      Approve Reroute to Cold Storage
                    </button>
                  )}
                  {a.isRerouted && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-amber)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle size={14} /> Reroute Approved
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ marginBottom: '0px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
              <Navigation size={18} /> Active Fleet
            </h3>
            {shipments.filter(s => !s.isDelivered).map(s => {
              const elapsed = currentTime - s.createdAt;
              const duration = 60000;

              const progress = (s.isDispatched === true) ? Math.min(100, (elapsed / duration) * 100) : 0;
              
              return (
                <div key={s._id} className="glass-card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <Link to={`/shipment/${s.shipmentId}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
                      <div>
                        <h4 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {s.shipmentId}
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.origin} → {s.destination}</span>
                      </div>
                    </Link>
                    <StatusBadge status={s.status} />
                  </div>
                  
                  <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span>{!s.isDispatched ? 'Waiting for Dispatch' : (progress >= 100 ? 'Arrived - Pending Verification' : 'In Transit')}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: progress >= 100 ? 'var(--color-green)' : 'var(--color-accent)', transition: 'width 0.1s linear' }} />
                  </div>
                </div>
              );
            })}

            {shipments.filter(s => s.isDelivered).length > 0 && (
              <>
                <h3 style={{ marginTop: '20px', marginBottom: '0px', color: 'var(--color-green)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                  <CheckCircle size={18} /> Delivered Orders
                </h3>
                {shipments.filter(s => s.isDelivered).map(s => (
                  <div key={s._id} className="glass-card" style={{ padding: '16px', borderLeft: '4px solid var(--color-green)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Link to={`/shipment/${s.shipmentId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h4 style={{ margin: 0 }}>{s.shipmentId}</h4>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Delivered to {s.destination}</span>
                      </Link>
                      <button onClick={() => deleteShipment(s._id).then(() => load())} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
      </div>
    </div>
  </div>
  );
}
