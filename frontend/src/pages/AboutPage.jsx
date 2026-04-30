import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './ScrollEffect.css';
import './AboutPage.css';

const FRAME_COUNT = 240;

// Helper to pad the frame number (e.g. 1 -> 001)
const currentFrame = index => (
  `/3d-scroll-2/ezgif-frame-${index.toString().padStart(3, '0')}.jpg`
);

const preloadImages = () => {
  for (let i = 1; i <= FRAME_COUNT; i++) {
    const img = new Image();
    img.src = currentFrame(i);
  }
};

const AboutPage = () => {
  const canvasRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Force black body background so no light theme bleeds through the canvas
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = '#000';
    document.documentElement.style.background = '#000';
    return () => {
      document.body.style.background = prev;
      document.documentElement.style.background = '';
    };
  }, []);

  useEffect(() => {
    preloadImages();
    const img = new Image();
    img.src = currentFrame(1);
    img.onload = () => {
      setImagesLoaded(true);
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        drawImageCover(context, img, canvas.width, canvas.height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleResize = () => {
    if (canvasRef.current) {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
      updateImage(Math.max(1, Math.min(FRAME_COUNT, Math.ceil(window.scrollY / 20)))); 
    }
  };

  const drawImageCover = (ctx, img, canvasWidth, canvasHeight) => {
    const imgRatio = img.width / img.height;
    const canvasRatio = canvasWidth / canvasHeight;
    let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

    if (canvasRatio > imgRatio) {
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / imgRatio;
      offsetY = (canvasHeight - drawHeight) / 2;
    } else {
      drawWidth = canvasHeight * imgRatio;
      drawHeight = canvasHeight;
      offsetX = (canvasWidth - drawWidth) / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  };

  const updateImage = index => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const img = new Image();
    img.src = currentFrame(index);
    img.onload = () => {
      drawImageCover(context, img, canvas.width, canvas.height);
    };
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const html = document.documentElement;
      
      const scrollTop = html.scrollTop;
      const maxScrollTop = html.scrollHeight - window.innerHeight;
      const scrollFraction = scrollTop / maxScrollTop;

      const frameIndex = Math.min(
        FRAME_COUNT - 1,
        Math.ceil(scrollFraction * FRAME_COUNT)
      );
      
      requestAnimationFrame(() => updateImage(frameIndex + 1));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="about-page-wrapper">
      <header className="about-header">
        <Link to="/" className="about-logo">
          <div className="about-logo-icon">⛓</div>
          <span className="about-logo-text">Chain<span>Proof</span></span>
        </Link>
        <nav className="about-nav">
          <Link to="/login" className="about-nav-cta">Login →</Link>
        </nav>
      </header>

      <div className="scroll-effect-wrapper" ref={scrollContainerRef}>
        <div className="canvas-container">
          <canvas ref={canvasRef} id="hero-lightpass" />
        </div>

      <div className="content-layers about-content-over-canvas" style={{paddingTop: '20vh', zIndex: 1, position: 'relative'}}>
        {/* HERO SECTION */}
        <section className="about-hero">
          <div className="about-hero-grid-bg"></div>
          <div className="about-hero-glow"></div>
          <div className="about-hero-content">
            <div className="about-hero-eyebrow">Blockchain Provenance for Perishable Goods</div>
            <h1 className="about-hero-title">The Shipment<br/><span className="accent">Truth Trail</span></h1>
            <p className="about-hero-subtitle">
              Every handoff. Every signature. Every temperature.
              Locked on-chain the moment it happens — tamper-evident,
              publicly verifiable, and unforgeable. No trust required.
            </p>
            <div className="about-hero-badges">
              <div className="about-badge"><span className="about-badge-dot"></span> Live Temperature Tracking</div>
              <div className="about-badge"><span className="about-badge-dot amber"></span> SHA-256 Document Hashing</div>
              <div className="about-badge"><span className="about-badge-dot red"></span> Auto Escalation Alerts</div>
            </div>
          </div>
        </section>

        {/* CHAIN STRIP */}
        <div className="about-chain-strip">
          <div className="about-chain-item"><div className="about-chain-node"></div><div className="about-chain-link"></div></div>
          <span className="about-chain-label">Farm</span>
          <div className="about-chain-item"><div className="about-chain-node"></div><div className="about-chain-link"></div></div>
          <span className="about-chain-label">Warehouse</span>
          <div className="about-chain-item"><div className="about-chain-node"></div><div className="about-chain-link"></div></div>
          <span className="about-chain-label">Truck</span>
          <div className="about-chain-item"><div className="about-chain-node"></div><div className="about-chain-link"></div></div>
          <span className="about-chain-label">Customs</span>
          <div className="about-chain-item"><div className="about-chain-node"></div><div className="about-chain-link"></div></div>
          <span className="about-chain-label">Cold Storage</span>
          <div className="about-chain-item"><div className="about-chain-node"></div><div className="about-chain-link"></div></div>
          <span className="about-chain-label">Retailer</span>
          <div className="about-chain-item"><div className="about-chain-node"></div><div className="about-chain-link"></div></div>
          <span className="about-chain-label">Consumer</span>
          <div className="about-chain-item"><div className="about-chain-node"></div></div>
        </div>

        {/* PROBLEM */}
        <section className="about-section">
          <div className="about-problem">
            <div className="about-problem-text">
              <div className="about-section-eyebrow">The Problem</div>
              <h2 className="about-section-title">Cold Chains Break.<br/>Blame Disappears.</h2>
              <p className="about-section-body">
                Every day in India, truckloads of vegetables, dairy, and medicines leave
                warehouses perfectly fine — and arrive spoiled. Nobody was watching the
                temperature in between, nobody can be held accountable, and the documents
                that should tell the truth have already been altered.
              </p>
              <div className="about-stat-block">
                <div className="about-stat-card">
                  <div className="about-stat-num">₹92K Cr</div>
                  <div className="about-stat-label">Annual food wastage</div>
                </div>
                <div className="about-stat-card red-card">
                  <div className="about-stat-num">40%</div>
                  <div className="about-stat-label">Perishables lost in transit</div>
                </div>
                <div className="about-stat-card red-card">
                  <div className="about-stat-num">0</div>
                  <div className="about-stat-label">Accountability without proof</div>
                </div>
                <div className="about-stat-card">
                  <div className="about-stat-num">10s</div>
                  <div className="about-stat-label">Time to log handoff</div>
                </div>
              </div>
            </div>
            <div className="about-problem-visual">
              <div className="about-alert-card">
                <div className="about-alert-level critical">⚠ Critical — Level 3 Escalation</div>
                <div className="about-alert-msg">SHP-004 temperature reached 14.2°C. No action in 15 min. Escalated to Senior Manager.</div>
                <div className="about-alert-time">02:14 ago</div>
              </div>
              <div className="about-alert-card">
                <div className="about-alert-level critical">🔴 Document Tampered</div>
                <div className="about-alert-msg">Hash mismatch on Handoff #3. Document locked. Flagged for review.</div>
                <div className="about-alert-time">07:41 ago</div>
              </div>
              <div className="about-alert-card">
                <div className="about-alert-level warning">⚡ Warning — Level 1</div>
                <div className="about-alert-msg">SHP-007 approaching threshold. Currently at 6.2°C. Monitor closely.</div>
                <div className="about-alert-time">12:05 ago</div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="about-section about-how-it-works">
          <div className="about-section-eyebrow">Full System Flow</div>
          <h2 className="about-section-title">Eight Steps.<br/>Zero Gaps.</h2>
          <div className="about-steps-grid">
            <div className="about-step-card"><div className="about-step-num">01</div><div className="about-step-icon">📦</div><div className="about-step-title">Shipment Created</div><div className="about-step-desc">Producer creates a shipment. A unique QR code is generated.</div></div>
            <div className="about-step-card"><div className="about-step-num">02</div><div className="about-step-icon">📲</div><div className="about-step-title">Mediator Logs Handoff</div><div className="about-step-desc">Scan QR, enter temperature, upload document, draw signature.</div></div>
            <div className="about-step-card"><div className="about-step-num">03</div><div className="about-step-icon">✍️</div><div className="about-step-title">Manager Signs Off</div><div className="about-step-desc">Manager reviews and signs digitally. GPS & timestamp locked.</div></div>
            <div className="about-step-card"><div className="about-step-num">04</div><div className="about-step-icon">🔐</div><div className="about-step-title">Document Hashed</div><div className="about-step-desc">Every uploaded document is converted to a SHA-256 hash instantly.</div></div>
            <div className="about-step-card"><div className="about-step-num">05</div><div className="about-step-icon">🌡️</div><div className="about-step-title">Temperature Live</div><div className="about-step-desc">Simulated live feed updates temperature every 2 minutes.</div></div>
            <div className="about-step-card"><div className="about-step-num">06</div><div className="about-step-icon">🚨</div><div className="about-step-title">Spoilage Alerts</div><div className="about-step-desc">Three-level escalation fires automatically on temperature breach.</div></div>
            <div className="about-step-card"><div className="about-step-num">07</div><div className="about-step-icon">🗺️</div><div className="about-step-title">Rerouting Triggered</div><div className="about-step-desc">System calculates nearest cold storage depot from GPS.</div></div>
            <div className="about-step-card"><div className="about-step-num">08</div><div className="about-step-icon">📱</div><div className="about-step-title">Anyone Verifies</div><div className="about-step-desc">Scan the QR. Full journey appears — tamper-evident. No login needed.</div></div>
          </div>
        </section>

        {/* USER ROLES */}
        <section className="about-section">
          <div className="about-section-eyebrow">Three Users</div>
          <h2 className="about-section-title">Three Dashboards.<br/>One Truth.</h2>
          <div className="about-roles-grid">
            <div className="about-role-card">
              <span className="about-role-emoji">🚛</span>
              <div className="about-role-name">Mediator</div>
              <div className="about-role-sub">Driver · Warehouse Staff</div>
              <div className="about-role-desc">Scans QR, enters temp, uploads doc, draws signature. Done in 10 seconds.</div>
              <ul className="about-role-features">
                <li>QR scan to load shipment instantly</li>
                <li>Manual temp entry + live reading</li>
                <li>Document upload with auto-hashing</li>
                <li>Digital signature pad</li>
              </ul>
            </div>
            <div className="about-role-card">
              <span className="about-role-emoji">🏢</span>
              <div className="about-role-name">Manager</div>
              <div className="about-role-sub">Operations · Logistics Head</div>
              <div className="about-role-desc">Reviews every handoff, signs off to approve. Shipment locked until signed.</div>
              <ul className="about-role-features">
                <li>Live map with color-coded markers</li>
                <li>Anomaly alert panel</li>
                <li>One-click reroute approval</li>
                <li>WhatsApp alerts</li>
              </ul>
            </div>
            <div className="about-role-card">
              <span className="about-role-emoji">🛒</span>
              <div className="about-role-name">Retailer</div>
              <div className="about-role-sub">Retailer · Consumer</div>
              <div className="about-role-desc">Scans QR. Sees full journey — every handoff, signature, temp. View only.</div>
              <ul className="about-role-features">
                <li>No login required</li>
                <li>QR scan → full truth trail</li>
                <li>Tamper flags highlighted in red</li>
                <li>Full document history downloadable</li>
              </ul>
            </div>
          </div>
        </section>

        {/* TECH STACK */}
        <section className="about-section about-tech">
          <div className="about-section-eyebrow">Technology</div>
          <h2 className="about-section-title">Built to Be<br/>Unbreakable.</h2>
          <div className="about-tech-grid">
            <div className="about-tech-pill"><div className="about-tech-name">React.js</div><div className="about-tech-cat">Frontend</div></div>
            <div className="about-tech-pill"><div className="about-tech-name">Node.js</div><div className="about-tech-cat">Backend API</div></div>
            <div className="about-tech-pill"><div className="about-tech-name">MongoDB</div><div className="about-tech-cat">Database</div></div>
            <div className="about-tech-pill"><div className="about-tech-name">SHA-256</div><div className="about-tech-cat">Hashing</div></div>
            <div className="about-tech-pill"><div className="about-tech-name">JWT</div><div className="about-tech-cat">Security</div></div>
            <div className="about-tech-pill"><div className="about-tech-name">Google Maps</div><div className="about-tech-cat">Routing</div></div>
            <div className="about-tech-pill"><div className="about-tech-name">Twilio</div><div className="about-tech-cat">Alerts</div></div>
            <div className="about-tech-pill"><div className="about-tech-name">WebSocket</div><div className="about-tech-cat">Live Updates</div></div>
            <div className="about-tech-pill"><div className="about-tech-name">QR</div><div className="about-tech-cat">Identity</div></div>
            <div className="about-tech-pill"><div className="about-tech-name">Simulated IoT</div><div className="about-tech-cat">Temperature</div></div>
          </div>
        </section>

        {/* MISSION */}
        <section className="about-section">
          <div className="about-mission-wrap">
            <div className="about-section-eyebrow" style={{display: 'flex', justifyContent: 'center'}}>Our Mission</div>
            <div className="about-mission-quote">
              Food reaches people.<br/>
              <span className="gold">Truth reaches everyone.</span>
            </div>
            <div className="about-mission-line"></div>
            <p className="about-mission-body">
              ChainProof was built to solve a problem hiding in plain sight —
              perishables spoil in transit, documents get altered, and nobody
              is accountable. We believe every person deserves an unforgeable record
              of what actually happened.
            </p>
          </div>
        </section>
      </div>
    </div>

    {/* ═══════════════════ FOOTER ═══════════════════ */}
    <footer className="about-footer">
      <div className="about-footer-grid">
        <div className="about-footer-brand">
          <span className="about-logo-text" style={{color: 'var(--text)'}}>CHAIN<span style={{color: '#1a56db'}}>PROOF</span></span>
          <p>Blockchain provenance for perishable goods. Every handoff locked. Every document hashed. Every truth preserved.</p>
        </div>
        <div className="about-footer-col">
          <div className="about-footer-col-title">Product</div>
          <ul>
            <li><Link to="/login">Manager Dashboard</Link></li>
            <li><Link to="/login">Mediator Handoff</Link></li>
            <li><Link to="/search">QR Verify</Link></li>
            <li><Link to="/search">Document Check</Link></li>
          </ul>
        </div>
        <div className="about-footer-col">
          <div className="about-footer-col-title">Company</div>
          <ul>
            <li><Link to="/">About</Link></li>
            <li><Link to="/">How It Works</Link></li>
            <li><Link to="#">Contact</Link></li>
            <li><Link to="#">Press Kit</Link></li>
          </ul>
        </div>
        <div className="about-footer-col">
          <div className="about-footer-col-title">Legal</div>
          <ul>
            <li><Link to="#">Privacy Policy</Link></li>
            <li><Link to="#">Terms of Service</Link></li>
            <li><Link to="#">Security</Link></li>
          </ul>
        </div>
      </div>
      <div className="about-footer-bottom">
        <span className="about-footer-copy">© 2024 ChainProof. All rights reserved.</span>
        <span className="about-footer-hash">Block Hash: <span>#a3f9c2d1e8b047…</span></span>
      </div>
    </footer>
    </div>
  );
};

export default AboutPage;
