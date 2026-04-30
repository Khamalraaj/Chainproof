const nearbyDepots = [
  { name: 'Chennai Cold Storage - Ambattur', address: 'Ambattur Industrial Estate, Chennai' },
  { name: 'Koyambedu Cold Hub', address: 'Koyambedu Market Complex, Chennai' },
  { name: 'Sriperumbudur Depot', address: 'Sriperumbudur, Tamil Nadu' }
];

const getRandomDepot = () => {
  return nearbyDepots[Math.floor(Math.random() * nearbyDepots.length)];
};

const sendAlert = async (level, shipment) => {
  const depot = getRandomDepot();
  const messages = {
    1: `WARNING: Shipment ${shipment.shipmentId} approaching temperature limit. Currently at ${shipment.currentTemperature}°C`,
    2: `BREACH: Shipment ${shipment.shipmentId} exceeded limit at ${shipment.currentTemperature}°C. Suggested reroute: ${depot.name}`,
    3: `CRITICAL: Shipment ${shipment.shipmentId} breached for 15+ minutes. No action taken. Escalated to senior manager.`
  };

  console.log(`ALERT LEVEL ${level}:`, messages[level]);
  return { success: true, depot: level === 2 ? depot : null };
};

module.exports = { sendAlert, getRandomDepot };