import { createShipmentOnChain, logHandoffOnChain, approveHandoffOnChain, markDeliveredOnChain } from './blockchain';

// STANDALONE MOCK API WITH 1-HOUR TTL AND PERSISTENCE
const CITY_COORDS = {
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'delhi': { lat: 28.7041, lng: 77.1025 },
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'trichy': { lat: 10.7905, lng: 78.7047 },
  'thiruvallur': { lat: 13.1494, lng: 79.9071 },
  'goa': { lat: 15.2993, lng: 74.1240 }
};

const DISTRICTS_INDIA = [
  { name: 'Kanchipuram', lat: 12.8342, lng: 79.7036 },
  { name: 'Nellore', lat: 14.4426, lng: 79.9865 },
  { name: 'Chittoor', lat: 13.2172, lng: 79.1003 },
  { name: 'Anantapur', lat: 14.6819, lng: 77.6006 },
  { name: 'Vijayawada', lat: 16.5062, lng: 80.6480 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Nagpur', lat: 21.1458, lng: 79.0882 },
  { name: 'Agra', lat: 27.1767, lng: 78.0081 },
  { name: 'Surat', lat: 21.1702, lng: 72.8311 },
  { name: 'Madurai', lat: 9.9252, lng: 78.1198 }
];

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const findNearestDistrict = (lat, lng) => {
  let nearest = DISTRICTS_INDIA[0];
  let minDist = getDistance(lat, lng, nearest.lat, nearest.lng);
  
  DISTRICTS_INDIA.forEach(d => {
    const dist = getDistance(lat, lng, d.lat, d.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = d;
    }
  });
  return { ...nearest, distance: Math.round(minDist) };
};


const getStored = (key, initial) => {
  const stored = localStorage.getItem(key);
  let data = stored ? JSON.parse(stored) : initial;
  if (key === 'cp_shipments') {
    const now = Date.now();
    // EXPIRATION SET TO 1 HOUR (3600000 ms)
    const filtered = data.filter(s => (now - s.createdAt) < 3600000);
    if (filtered.length !== data.length) {
      localStorage.setItem(key, JSON.stringify(filtered));
      data = filtered;
    }
  }
  if (!stored) localStorage.setItem(key, JSON.stringify(initial));
  return data;
};

const saveStored = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const predictShelfLife = (type, temp, threshold) => {
  let baseLife = 10;
  const t = type.toLowerCase();
  if (t === 'spinach') baseLife = 3;
  else if (t === 'tomato') baseLife = 7;
  else if (t === 'carrot') baseLife = 15;
  const deviation = temp - threshold;
  const finalLife = Math.max(0.5, baseLife - Math.max(0, deviation * 2));
  return { days: Math.round(finalLife * 10) / 10, confidence: Math.min(99, Math.round(temp > threshold ? 75 : 15)), status: temp > threshold + 2 ? 'red' : (temp > threshold ? 'amber' : 'green') };
};

export const loginUser = async (email) => {
  return new Promise(r => setTimeout(() => {
    let role = email.includes('mediator') ? 'mediator' : (email.includes('customer') ? 'customer' : 'manager');
    r({ token: 'mock-token-123', role, name: 'Demo User', email });
  }, 500));
};

export const fetchShipments = async () => {
  const all = getStored('cp_shipments', []);
  return new Promise(r => r(all.filter(s => s.isApproved)));
};

export const fetchShipmentDetails = async (id) => {
  return new Promise(resolve => {
    const all = getStored('cp_shipments', []);
    const s = all.find(x => x.shipmentId === id || x._id === id);
    if (s) {
      const handoffs = getStored('cp_history', []).filter(h => h.shipmentId === s.shipmentId);
      resolve({ shipment: s, handoffs });
    } else {
      resolve(null);
    }
  });
};

export const createShipment = async (data) => {
  const shipments = getStored('cp_shipments', []);
  const pending = getStored('cp_pending', []);
  
  const originKey = data.origin.toLowerCase();
  const destKey = data.destination.toLowerCase();
  const originCoords = CITY_COORDS[originKey] || { lat: 13.0827, lng: 80.2707 };
  const destCoords = CITY_COORDS[destKey] || { lat: 28.7041, lng: 77.1025 };

  const ml = predictShelfLife(data.goodsType, parseFloat(data.initialTemperature), parseFloat(data.temperatureThreshold));
  const newS = {
    _id: Math.random().toString(36).substr(2, 9),
    shipmentId: data.shipmentId || `SHP-${Math.floor(Math.random() * 900) + 100}-NEW`,
    producerName: data.producerName,
    goodsType: data.goodsType,
    origin: data.origin,
    destination: data.destination,
    currentLocation: originCoords,
    originCoords: originCoords,
    destCoords: destCoords,
    currentTemperature: parseFloat(data.initialTemperature),
    temperatureThreshold: parseFloat(data.temperatureThreshold),
    status: ml.status,
    shelfLifeDays: ml.days,
    spoilageConfidence: ml.confidence,
    statusMessage: ml.status === 'green' ? 'Optimal.' : 'Alert!',
    createdAt: Date.now(),
    isApproved: false
  };
  
  shipments.push(newS);
  saveStored('cp_shipments', shipments);
  
  pending.push({
    _id: 'h_init_' + newS._id,
    shipmentId: newS.shipmentId,
    locationName: newS.origin + " (Origin)",
    temperature: newS.currentTemperature,
    timestamp: new Date(),
    mediatorName: "System (Auto-Init)",
    isInit: true
  });
  saveStored('cp_pending', pending);
  
  return { success: true, shipmentId: newS.shipmentId };
};

export const logHandoff = async (formData) => {
  const shipments = getStored('cp_shipments', []);
  const history = getStored('cp_history', []);
  const rawShipmentId = formData.get('shipmentId');
  const temperature = parseFloat(formData.get('temperature'));
  const mediatorName = formData.get('locationName');
  const signature = formData.get('mediatorSignature');

  if (!rawShipmentId) return { success: false, message: 'Missing Shipment ID' };
  
  const shipmentId = rawShipmentId.trim().toUpperCase();
  console.log(`[API] Logging handoff for ${shipmentId}...`);

  const sIdx = shipments.findIndex(s => s.shipmentId.trim().toUpperCase() === shipmentId);
  
  if (sIdx !== -1) {
    const s = shipments[sIdx];
    console.log(`[API] Found shipment ${shipmentId}. Current isDispatched: ${s.isDispatched}`);
    
    // Update threshold if provided (useful for testing)
    const newThreshold = formData.get('temperatureThreshold');
    if (newThreshold) {
      s.temperatureThreshold = parseFloat(newThreshold);
    }

    s.currentTemperature = temperature;
    
    // Update ML prediction
    const ml = predictShelfLife(s.goodsType, temperature, s.temperatureThreshold);

    s.status = ml.status;
    s.shelfLifeDays = ml.days;
    s.spoilageConfidence = ml.confidence;
    
    // Start delivery immediately if it's the first handoff
    if (!s.isDispatched) {
      console.log(`[API] Dispatching shipment ${shipmentId} now.`);
      s.isDispatched = true;
      s.createdAt = Date.now(); // Start movement timer from 0%
    }
    
    saveStored('cp_shipments', shipments);

    // Record directly in history
    history.push({
      _id: 'h'+Date.now(),
      shipmentId: s.shipmentId,
      locationName: 'Transit / Handoff Point',
      temperature,
      timestamp: new Date(),
      mediatorName,
      mediatorSignature: signature,
      managerApproved: true,
      finalized: true,
      createdAt: new Date()
    });
    saveStored('cp_history', history);
    
    // Force other tabs to notice the change
    window.dispatchEvent(new Event('storage'));
    return { success: true };
  } else {
    console.warn(`[API] Shipment ${shipmentId} not found in stored records!`);
    return { success: false, message: 'Shipment not found' };
  }
};




export const fetchPendingHandoffs = async () => new Promise(r => r(getStored('cp_pending', [])));

export const signCreation = async (id, data) => {
  const pending = getStored('cp_pending', []);
  const shipments = getStored('cp_shipments', []);
  const history = getStored('cp_history', []);
  
  const pIdx = pending.findIndex(x => x._id === id);
  if (pIdx === -1) return { success: false, message: 'Record not found' };
  const p = pending[pIdx];

  if (data.status === 'rejected') {
    // If initial creation is rejected, delete the shipment record entirely
    const filteredShipments = shipments.filter(s => s.shipmentId !== p.shipmentId);
    saveStored('cp_shipments', filteredShipments);
    saveStored('cp_pending', pending.filter(x => x._id !== id));
    return { success: true, message: 'Shipment Creation Rejected' };
  }
  
  // Sign-off (Creation) is Manager Only
  const sIdx = shipments.findIndex(s => s.shipmentId === p.shipmentId);
  if (sIdx !== -1) {
    const s = shipments[sIdx];
    // 1. Anchor Creation on Blockchain (Strict)
    const txHash = await createShipmentOnChain(s);
    s.isApproved = true;
    s.isDispatched = false; 
    s.blockchainTx = txHash;
    saveStored('cp_shipments', shipments);
    
    history.push({ ...p, managerApproved: true, finalized: true, blockchainTx: txHash, createdAt: new Date() });
    saveStored('cp_history', history);
  }
  
  saveStored('cp_pending', pending.filter(x => x._id !== id));
  return { success: true, finalized: true };
};

export const signHandoff = async (id, data) => {
  const pending = getStored('cp_pending', []);
  const shipments = getStored('cp_shipments', []);
  const history = getStored('cp_history', []);
  
  const pIdx = pending.findIndex(x => x._id === id);
  if (pIdx === -1) return { success: false, message: 'Handoff not found' };
  const p = pending[pIdx];

  if (data.status === 'rejected') {
    saveStored('cp_pending', pending.filter(x => x._id !== id));
    return { success: true, message: 'Handoff Rejected' };
  }
  
  if (data.role === 'manager') {
    // 1. Anchor Manager Approval on Chain (Strict)
    const handoffIndex = history.filter(h => h.shipmentId === p.shipmentId && !h.isInit).length;
    const txHash = await approveHandoffOnChain(p.shipmentId, handoffIndex);
    
    p.managerApproved = true;
    p.managerSignature = data.managerSignature;
    p.blockchainTx = txHash;

    // Immediately finalize since consumer approval is no longer required
    const sIdx = shipments.findIndex(s => s.shipmentId === p.shipmentId);
    if (sIdx !== -1) {
      const s = shipments[sIdx];
      s.currentTemperature = p.temperature;
      
      // Update ML prediction based on new temperature
      const ml = predictShelfLife(s.goodsType, p.temperature, s.temperatureThreshold);
      s.status = ml.status;
      s.shelfLifeDays = ml.days;
      s.spoilageConfidence = ml.confidence;
      
      // If this is the first actual handoff, dispatch the truck
      if (!s.isDispatched) {
        s.isDispatched = true;
        s.createdAt = Date.now(); // Start the 3-minute timer now
      }
      
      saveStored('cp_shipments', shipments);
    }
    history.push({ ...p, finalized: true, createdAt: new Date() });
    saveStored('cp_history', history);
    saveStored('cp_pending', pending.filter(x => x._id !== id));
    return { success: true, finalized: true };
  }

  return { success: false, message: 'Unauthorized role' };
};

export const fetchAnomalies = async () => {
  const shipments = getStored('cp_shipments', []);
  const active = shipments.filter(s => s.status !== 'green' && s.isApproved && !s.isDelivered);
  
  return active.map(s => {
    const nearest = findNearestDistrict(s.currentLocation.lat, s.currentLocation.lng);
    return { ...s, nearestDistrict: nearest };
  });
};


export const approveReroute = async (id) => {
  const shipments = getStored('cp_shipments', []);
  const s = shipments.find(x => x.shipmentId === id);
  if (s) { s.isRerouted = true; s.status = 'amber'; saveStored('cp_shipments', shipments); }
  return { success: true };
};

export const confirmDelivery = async (id) => {
  const shipments = getStored('cp_shipments', []);
  const sIdx = shipments.findIndex(x => x.shipmentId === id || x._id === id);
  if (sIdx !== -1) {
    const s = shipments[sIdx];
    try {
      await markDeliveredOnChain(s.shipmentId);
      s.isDelivered = true;
      saveStored('cp_shipments', shipments);
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, message: 'Blockchain confirmation failed' };
    }
  }
  return { success: false, message: 'Shipment not found' };
};

export const deleteShipment = async (id) => {
  const shipments = getStored('cp_shipments', []);
  const filtered = shipments.filter(s => s._id !== id && s.shipmentId !== id);
  saveStored('cp_shipments', filtered);
  return { success: true };
};
