# ChainProof API Reference
## Base URL: http://localhost:5000/api

---

## AUTH

### Register
POST /auth/register
Body: { name, email, password, role, phone }
Roles: mediator | manager | senior_manager | retailer | consumer
Returns: { _id, name, email, role, token }

### Login
POST /auth/login
Body: { email, password }
Returns: { _id, name, email, role, token }

---

## SHIPMENT
All routes need: Header → Authorization: Bearer <token>

### Create Shipment
POST /shipment/create
Roles: manager, mediator
Body: { producerName, goodsType, origin, destination, temperatureThreshold, initialTemperature }
Returns: { message, shipment }

### Get All Shipments (for map dashboard)
GET /shipment/all
Returns: [ ...shipments ] with status: green | amber | red

### Get Single Shipment + Full Trail (public — no auth needed)
GET /shipment/:shipmentId
Returns: { shipment, handoffs: [...] }

### Approve Reroute
PATCH /shipment/reroute/:shipmentId
Roles: manager, senior_manager
Returns: { message, rerouteDestination, address }

### Override Temperature (DEMO ONLY)
PATCH /shipment/override-temperature/:shipmentId
Roles: manager
Body: { temperature }
Returns: { message, temperature, status }

### Mark Delivered
PATCH /shipment/deliver/:shipmentId
Roles: manager

---

## HANDOFF
All routes need: Header → Authorization: Bearer <token>
Use multipart/form-data for document upload

### Log Handoff (mediator)
POST /handoff/log
Form fields: { shipmentId, temperature, locationName, locationLat, locationLng, mediatorSignature (base64), notes }
File field: document (any file)
Returns: { message, handoff, documentHash, shipmentStatus }

### Manager Sign-off
PATCH /handoff/sign/:handoffId
Body: { managerSignature (base64), approved (true/false), notes }
Returns: { message }

### Verify Document (tamper check)
POST /handoff/verify-document
Form fields: { savedHash }
File field: document
Returns: { isGenuine, status: GENUINE | TAMPERED, message }

### Get Pending Sign-offs
GET /handoff/pending
Roles: manager, senior_manager
Returns: [ ...handoffs awaiting manager approval ]

### Get Handoffs for Shipment (public)
GET /handoff/:shipmentId
Returns: [ ...handoffs in order ]

---

## ALERTS

### Send Manual Alert
POST /alert/send
Roles: manager
Body: { shipmentId, level (1|2|3) }

### Get All Anomalies
GET /alert/anomalies
Returns: [ ...red and amber shipments ]

---

## SHIPMENT STATUS COLORS
green  → temperature safe, all good
amber  → temperature within 2°C of threshold (warning)
red    → temperature exceeded threshold (breach)

## ALERT LEVELS
1 → Warning — approaching limit → WhatsApp to manager
2 → Breach — limit crossed → urgent WhatsApp + reroute suggestion
3 → Critical — no action in 15min → escalated to senior manager
