/* ============================================================
   WPT Efficiency Calculator — Application Logic
   Physics engine + UI controller + routing + animations
   ============================================================ */

// ==================== WPT PHYSICS ENGINE ====================

const WPT = {
  MU_0: 4 * Math.PI * 1e-7,       // Permeability of free space (H/m)
  RHO_COPPER: 1.68e-8,            // Resistivity of copper (Ω·m)
  WIRE_DIAMETER: 1e-3,            // Default wire diameter 1mm

  /** Self-inductance using Wheeler's approximation for flat circular coil (H) */
  selfInductance(radiusM, turns) {
    return this.MU_0 * turns * turns * Math.PI * radiusM / 2;
  },

  /** Mutual inductance via Neumann formula for identical coaxial coils (H) */
  mutualInductance(radiusM, turns, distanceM) {
    const r4 = Math.pow(radiusM, 4);
    const denom = 2 * Math.pow(radiusM * radiusM + distanceM * distanceM, 1.5);
    return this.MU_0 * Math.PI * turns * turns * r4 / denom;
  },

  /** Coupling coefficient k (dimensionless, 0–1) */
  couplingCoefficient(radiusM, distanceM) {
    const r2 = radiusM * radiusM;
    return Math.pow(radiusM, 3) / Math.pow(r2 + distanceM * distanceM, 1.5);
  },

  /** DC resistance of coil wire (Ω) */
  coilResistance(radiusM, turns) {
    const wireLength = 2 * Math.PI * radiusM * turns;
    const wireArea = Math.PI * Math.pow(this.WIRE_DIAMETER / 2, 2);
    return this.RHO_COPPER * wireLength / wireArea;
  },

  /** Quality factor Q (dimensionless) */
  qualityFactor(radiusM, turns, frequencyHz) {
    const omega = 2 * Math.PI * frequencyHz;
    const L = this.selfInductance(radiusM, turns);
    const R = this.coilResistance(radiusM, turns);
    return omega * L / R;
  },

  /** Maximum system efficiency at resonance (series-series compensation) */
  efficiency(k, Qt, Qr) {
    const kQQ = k * k * Qt * Qr;
    // Maximum efficiency formula: η = k²Q₁Q₂ / (1 + √(1 + k²Q₁Q₂))²
    const denom = Math.pow(1 + Math.sqrt(1 + kQQ), 2);
    return Math.min(kQQ / denom, 1.0);  // cap at 100%
  },

  /** Full calculation from user-facing parameters */
  calculate(params) {
    const r  = params.radius / 100;           // cm → m
    const n  = params.turns;
    const d  = params.airGap / 100;           // cm → m
    const f  = params.frequency * 1000;       // kHz → Hz
    const pIn = params.inputPower;            // W

    const L   = this.selfInductance(r, n);
    const M   = this.mutualInductance(r, n, d);
    const k   = this.couplingCoefficient(r, d);
    const R   = this.coilResistance(r, n);
    const Q   = this.qualityFactor(r, n, f);
    const eta = this.efficiency(k, Q, Q);
    const pOut  = Math.min(pIn * eta, pIn);   // never exceed input
    const pLoss = pIn - pOut;

    return {
      selfInductance: L,
      mutualInductance: M,
      couplingCoefficient: k,
      coilResistance: R,
      qualityFactor: Q,
      efficiency: eta,
      powerOutput: pOut,
      powerLoss: pLoss,
      inputPower: pIn
    };
  }
};


// ==================== NAVIGATION / ROUTING ====================

function navigate(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Show target
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');

  // Update nav active state
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const navLink = document.getElementById('nav-' + page);
  if (navLink) navLink.classList.add('active');

  // Close mobile menu
  document.getElementById('nav-links').classList.remove('open');
  document.getElementById('hamburger').classList.remove('open');

  // Scroll to top
  window.scrollTo(0, 0);

  // Update URL hash
  history.pushState(null, '', '#' + page);

  // Recalculate if going to calculator
  if (page === 'calculator') recalculate();
}

// Handle nav link clicks
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    navigate(link.dataset.page);
  });
});

// Handle hash on load
window.addEventListener('DOMContentLoaded', () => {
  const hash = location.hash.replace('#', '') || 'landing';
  navigate(hash);
  recalculate();
  drawFieldLines();
  startEnergyAnimation();
  initScrollReveal();
  initFloatingParticles();
});

// Handle back/forward
window.addEventListener('popstate', () => {
  const hash = location.hash.replace('#', '') || 'landing';
  navigate(hash);
});

// Mobile hamburger
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('nav-links').classList.toggle('open');
  document.getElementById('hamburger').classList.toggle('open');
});


// ==================== INPUT SYNCHRONIZATION ====================

function syncInput(source, targetId) {
  const target = document.getElementById(targetId);
  if (target) target.value = source.value;
  recalculate();
}


// ==================== CALCULATOR LOGIC ====================

let compareMode = false;
let activeConfig = 'A';

function getParams(config) {
  return {
    radius:     parseFloat(document.getElementById('radius-' + config).value) || 15,
    turns:      parseInt(document.getElementById('turns-' + config).value) || 20,
    airGap:     parseFloat(document.getElementById('gap-' + config).value) || 10,
    frequency:  parseFloat(document.getElementById('freq-' + config).value) || 85,
    inputPower: parseFloat(document.getElementById('power-' + config).value) || 1000
  };
}

function recalculate() {
  const paramsA = getParams('A');
  const resultsA = WPT.calculate(paramsA);

  if (!compareMode) {
    renderSingleResults(resultsA, paramsA);
    updateDiagram(paramsA, resultsA);
  } else {
    const paramsB = getParams('B');
    const resultsB = WPT.calculate(paramsB);
    renderCompareResults(resultsA, resultsB);
    // Diagram shows active config
    const activeParams = activeConfig === 'A' ? paramsA : paramsB;
    const activeResults = activeConfig === 'A' ? resultsA : resultsB;
    updateDiagram(activeParams, activeResults);
  }
}


// ==================== RESULTS RENDERING ====================

function formatValue(val, decimals) {
  if (isNaN(val) || !isFinite(val)) return '—';
  return val.toFixed(decimals);
}

function formatSI(val) {
  if (isNaN(val) || !isFinite(val)) return '—';
  if (Math.abs(val) >= 1)        return val.toFixed(3) + ' H';
  if (Math.abs(val) >= 1e-3)     return (val * 1e3).toFixed(3) + ' mH';
  if (Math.abs(val) >= 1e-6)     return (val * 1e6).toFixed(3) + ' μH';
  return (val * 1e9).toFixed(3) + ' nH';
}

function formatResistance(val) {
  if (isNaN(val) || !isFinite(val)) return '—';
  if (val >= 1)     return val.toFixed(4) + ' Ω';
  if (val >= 1e-3)  return (val * 1e3).toFixed(3) + ' mΩ';
  return (val * 1e6).toFixed(3) + ' μΩ';
}

function efficiencyClass(eta) {
  if (eta >= 0.7) return 'high';
  if (eta >= 0.4) return 'medium';
  return 'low';
}

function renderSingleResults(r, params) {
  const effPct = r.efficiency * 100;

  document.getElementById('res-efficiency').innerHTML =
    formatValue(effPct, 2) + '<span class="result-unit">%</span>';
  document.getElementById('res-coupling').innerHTML =
    formatValue(r.couplingCoefficient, 6);
  document.getElementById('res-power-out').innerHTML =
    formatValue(r.powerOutput, 2) + '<span class="result-unit">W</span>';
  document.getElementById('res-power-loss').innerHTML =
    formatValue(r.powerLoss, 2) + '<span class="result-unit">W</span>';

  // Gauges
  const gaugeEff = document.getElementById('gauge-efficiency');
  gaugeEff.style.width = Math.min(effPct, 100) + '%';
  gaugeEff.className = 'gauge-fill ' + efficiencyClass(r.efficiency);

  const gaugeK = document.getElementById('gauge-coupling');
  gaugeK.style.width = (Math.min(r.couplingCoefficient, 1) * 100) + '%';
  gaugeK.className = 'gauge-fill ' + (r.couplingCoefficient > 0.3 ? 'high' : r.couplingCoefficient > 0.1 ? 'medium' : 'low');

  // Secondary
  document.getElementById('res-inductance').textContent = formatSI(r.selfInductance);
  document.getElementById('res-mutual').textContent = formatSI(r.mutualInductance);
  document.getElementById('res-quality').textContent = formatValue(r.qualityFactor, 1);
  document.getElementById('res-resistance').textContent = formatResistance(r.coilResistance);
}

function renderCompareResults(a, b) {
  const effA = a.efficiency * 100, effB = b.efficiency * 100;

  document.getElementById('cmp-eff-a').textContent = formatValue(effA, 2) + '%';
  document.getElementById('cmp-k-a').textContent = formatValue(a.couplingCoefficient, 6);
  document.getElementById('cmp-pout-a').textContent = formatValue(a.powerOutput, 2) + ' W';
  document.getElementById('cmp-ploss-a').textContent = formatValue(a.powerLoss, 2) + ' W';
  document.getElementById('cmp-q-a').textContent = formatValue(a.qualityFactor, 1);

  document.getElementById('cmp-eff-b').textContent = formatValue(effB, 2) + '%';
  document.getElementById('cmp-k-b').textContent = formatValue(b.couplingCoefficient, 6);
  document.getElementById('cmp-pout-b').textContent = formatValue(b.powerOutput, 2) + ' W';
  document.getElementById('cmp-ploss-b').textContent = formatValue(b.powerLoss, 2) + ' W';
  document.getElementById('cmp-q-b').textContent = formatValue(b.qualityFactor, 1);

  // Deltas
  setDelta('delta-eff', effB - effA, '%');
  setDelta('delta-k', b.couplingCoefficient - a.couplingCoefficient, '');
  setDelta('delta-pout', b.powerOutput - a.powerOutput, ' W');
  setDelta('delta-ploss', b.powerLoss - a.powerLoss, ' W');
  setDelta('delta-q', b.qualityFactor - a.qualityFactor, '');
}

function setDelta(id, val, unit) {
  const el = document.getElementById(id);
  const sign = val > 0 ? '+' : '';
  const decimals = Math.abs(val) > 1 ? 2 : 6;
  el.textContent = sign + formatValue(val, decimals) + unit;
  el.className = 'delta-value ' + (val > 0 ? 'delta-positive' : val < 0 ? 'delta-negative' : '');
}


// ==================== COMPARISON MODE ====================

function toggleCompare() {
  compareMode = document.getElementById('compare-checkbox').checked;
  document.getElementById('config-tabs').style.display = compareMode ? 'flex' : 'none';

  document.getElementById('single-results').style.display = compareMode ? 'none' : 'block';
  document.getElementById('compare-results').style.display = compareMode ? 'block' : 'none';

  if (compareMode) {
    switchConfig('A');
  }
  recalculate();
}

function switchConfig(config) {
  activeConfig = config;
  document.querySelectorAll('.config-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.config === config)
  );
  document.querySelectorAll('.config-inputs').forEach(i =>
    i.classList.toggle('active', i.id === 'inputs-' + config)
  );
  recalculate();
}


// ==================== SVG COIL DIAGRAM ====================

function drawFieldLines() {
  const g = document.getElementById('field-lines');
  g.innerHTML = '';

  const txX = 170, rxX = 430, cy = 110;
  const midX = (txX + rxX) / 2;
  const offsets = [-40, -25, -10, 10, 25, 40];

  offsets.forEach((offset, i) => {
    const y = cy + offset;
    const spread = Math.abs(offset) * 0.6;
    const cp1x = txX + 50, cp2x = rxX - 50;
    const cp1y = y - spread, cp2y = y - spread;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M${txX},${y} C${cp1x},${cp1y} ${cp2x},${cp2y} ${rxX},${y}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#00b4ff');
    path.setAttribute('stroke-width', '1');
    path.setAttribute('stroke-dasharray', '6,4');
    path.setAttribute('opacity', (0.4 - Math.abs(offset) * 0.005).toFixed(2));
    path.classList.add('field-line');
    g.appendChild(path);
  });
}

let animFrame;
const particles = [];

function startEnergyAnimation() {
  const g = document.getElementById('energy-particles');
  g.innerHTML = '';

  for (let i = 0; i < 6; i++) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', '3');
    circle.setAttribute('fill', '#00e5ff');
    circle.setAttribute('opacity', '0');
    circle.setAttribute('filter', 'url(#glow)');
    g.appendChild(circle);

    particles.push({
      el: circle,
      progress: i / 6,
      speed: 0.003 + Math.random() * 0.002,
      yOffset: (Math.random() - 0.5) * 60
    });
  }

  function animate() {
    const txX = 170, rxX = 430, cy = 110;

    particles.forEach(p => {
      p.progress += p.speed;
      if (p.progress > 1) {
        p.progress = 0;
        p.yOffset = (Math.random() - 0.5) * 60;
      }

      const t = p.progress;
      const x = txX + (rxX - txX) * t;
      const bend = Math.sin(t * Math.PI) * -20;
      const y = cy + p.yOffset + bend;
      const opacity = Math.sin(t * Math.PI) * 0.7;

      p.el.setAttribute('cx', x);
      p.el.setAttribute('cy', y);
      p.el.setAttribute('opacity', opacity.toFixed(2));
    });

    animFrame = requestAnimationFrame(animate);
  }

  animate();
}

function updateDiagram(params, results) {
  // Update gap label
  document.getElementById('gap-label').textContent = 'Air Gap: ' + params.airGap + ' cm';

  // Adjust coil positions based on air gap (visual scaling)
  const gapFactor = Math.min(params.airGap / 50, 1); // normalize 0-1
  const txX = 160 + (1 - gapFactor) * 40;
  const rxX = 440 - (1 - gapFactor) * 40;

  // Scale coil size based on radius
  const rFactor = Math.min(params.radius / 30, 1);
  const ry = 35 + rFactor * 30;

  // Update TX coil
  const txCoil = document.getElementById('tx-coil');
  txCoil.querySelectorAll('ellipse').forEach((el, i) => {
    const offset = (i - 1) * 5;
    el.setAttribute('cx', txX + offset);
    el.setAttribute('ry', ry - Math.abs(offset));
    el.setAttribute('cy', 110);
  });

  // Update RX coil
  const rxCoil = document.getElementById('rx-coil');
  rxCoil.querySelectorAll('ellipse').forEach((el, i) => {
    const offset = (i - 1) * 5;
    el.setAttribute('cx', rxX + offset);
    el.setAttribute('ry', ry - Math.abs(offset));
    el.setAttribute('cy', 110);
  });

  // Update labels
  const txLabel = txCoil.parentElement.querySelector('text[x]');

  // Update field line opacity based on coupling
  const fieldOpacity = Math.min(results.couplingCoefficient * 3, 0.5);
  document.querySelectorAll('.field-line').forEach(l => {
    l.setAttribute('opacity', fieldOpacity.toFixed(2));
  });
}


// ==================== PDF EXPORT ====================

function exportPDF() {
  const btn = document.getElementById('btn-export');
  const originalText = btn.innerHTML;
  btn.innerHTML = '&#x23F3; Generating PDF...';
  btn.disabled = true;

  // Check if jsPDF loaded
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert('PDF library failed to load. Please refresh the page and try again.');
    btn.innerHTML = originalText;
    btn.disabled = false;
    return;
  }

  try {
    const doc = new window.jspdf.jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    let y = 20;

    // --- Header background ---
    doc.setFillColor(6, 11, 30);
    doc.rect(0, 0, pageW, 42, 'F');

    doc.setTextColor(0, 180, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('WPT Efficiency Calculator', pageW / 2, y, { align: 'center' });
    y += 9;

    doc.setTextColor(136, 146, 176);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Wireless Power Transfer - Engineering Report', pageW / 2, y, { align: 'center' });
    y += 7;

    doc.setTextColor(73, 86, 112);
    doc.setFontSize(8);
    doc.text('Generated on ' + new Date().toLocaleString(), pageW / 2, y, { align: 'center' });
    y += 12;

    // --- Get current calculation data ---
    const params = getParams(compareMode ? activeConfig : 'A');
    const results = WPT.calculate(params);

    // --- Section helper ---
    function drawSection(title) {
      doc.setTextColor(0, 180, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 15, y);
      y += 2;
      doc.setDrawColor(0, 180, 255);
      doc.setLineWidth(0.5);
      doc.line(15, y, pageW - 15, y);
      y += 8;
    }

    function drawRows(data) {
      doc.setFontSize(10);
      data.forEach(function(row) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(row[0], 20, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text(String(row[1]), pageW - 20, y, { align: 'right' });
        y += 7;
      });
      y += 5;
    }

    // --- Input Parameters ---
    drawSection('Input Parameters');
    drawRows([
      ['Coil Radius', params.radius + ' cm'],
      ['Number of Turns', String(params.turns)],
      ['Air Gap Distance', params.airGap + ' cm'],
      ['Operating Frequency', params.frequency + ' kHz'],
      ['Input Power', params.inputPower + ' W']
    ]);

    // --- Primary Results ---
    drawSection('Results - Key Metrics');
    var effPct = (results.efficiency * 100).toFixed(2);
    drawRows([
      ['System Efficiency', effPct + ' %'],
      ['Coupling Coefficient (k)', results.couplingCoefficient.toFixed(6)],
      ['Power Output', results.powerOutput.toFixed(2) + ' W'],
      ['Power Loss', results.powerLoss.toFixed(2) + ' W']
    ]);

    // --- Detailed Parameters ---
    drawSection('Detailed Parameters');
    drawRows([
      ['Self-Inductance (L)', formatSI(results.selfInductance)],
      ['Mutual Inductance (M)', formatSI(results.mutualInductance)],
      ['Quality Factor (Q)', results.qualityFactor.toFixed(1)],
      ['Coil Resistance (R)', formatResistance(results.coilResistance)]
    ]);

    // --- Efficiency Assessment ---
    drawSection('Efficiency Assessment');

    var eta = results.efficiency;
    var assessment, assessColor;
    if (eta >= 0.7) {
      assessment = 'HIGH - Excellent coupling. Suitable for practical EV charging.';
      assessColor = [0, 180, 80];
    } else if (eta >= 0.4) {
      assessment = 'MEDIUM - Moderate coupling. Consider reducing air gap or increasing coil size.';
      assessColor = [200, 160, 0];
    } else {
      assessment = 'LOW - Weak coupling. Significant geometry optimization needed.';
      assessColor = [220, 60, 60];
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(assessColor[0], assessColor[1], assessColor[2]);
    doc.text(assessment, 20, y);
    y += 12;

    // --- Formulas Used ---
    drawSection('Mathematical Models Used');
    doc.setFontSize(8.5);
    doc.setFont('courier', 'normal');
    doc.setTextColor(60, 60, 60);
    var formulas = [
      'Self-Inductance (Wheeler):   L = u0 * N^2 * pi * r / 2',
      'Mutual Inductance (Neumann): M = (u0 * pi * N^2 * r^4) / (2*(r^2+d^2)^1.5)',
      'Coupling Coefficient:        k = r^3 / (r^2 + d^2)^1.5',
      'Quality Factor:              Q = 2*pi*f*L / R',
      'System Efficiency:           n = k^2*Q^2 / (1 + sqrt(1 + k^2*Q^2))^2'
    ];
    formulas.forEach(function(f) {
      doc.text(f, 20, y);
      y += 5.5;
    });
    y += 5;

    // --- Comparison Mode ---
    if (compareMode) {
      var paramsA = getParams('A');
      var paramsB = getParams('B');
      var resA = WPT.calculate(paramsA);
      var resB = WPT.calculate(paramsB);

      drawSection('Comparison: Config A vs Config B');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text('Metric', 20, y);
      doc.text('Config A', 90, y, { align: 'center' });
      doc.text('Config B', 140, y, { align: 'center' });
      doc.text('Delta', pageW - 20, y, { align: 'right' });
      y += 6;

      var cmpRows = [
        ['Efficiency', (resA.efficiency*100).toFixed(2)+'%', (resB.efficiency*100).toFixed(2)+'%', ((resB.efficiency-resA.efficiency)*100).toFixed(2)+'%'],
        ['Coupling (k)', resA.couplingCoefficient.toFixed(6), resB.couplingCoefficient.toFixed(6), (resB.couplingCoefficient-resA.couplingCoefficient).toFixed(6)],
        ['Power Out', resA.powerOutput.toFixed(2)+' W', resB.powerOutput.toFixed(2)+' W', (resB.powerOutput-resA.powerOutput).toFixed(2)+' W'],
        ['Power Loss', resA.powerLoss.toFixed(2)+' W', resB.powerLoss.toFixed(2)+' W', (resB.powerLoss-resA.powerLoss).toFixed(2)+' W']
      ];

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      cmpRows.forEach(function(row) {
        doc.text(row[0], 20, y);
        doc.text(row[1], 90, y, { align: 'center' });
        doc.text(row[2], 140, y, { align: 'center' });
        doc.text(row[3], pageW - 20, y, { align: 'right' });
        y += 6;
      });
    }

    // --- Footer ---
    var pageH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(0, 180, 255);
    doc.setLineWidth(0.3);
    doc.line(15, pageH - 18, pageW - 15, pageH - 18);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('WPT Efficiency Calculator by Huzaifa Himad', 15, pageH - 12);
    doc.text('(c) 2025-2026 - Built for the research community', 15, pageH - 8);
    doc.text('DOI: 10.5281/zenodo.19549898', pageW - 15, pageH - 12, { align: 'right' });

    // Save
    var timestamp = new Date().toISOString().slice(0, 10);
    doc.save('WPT_Report_' + timestamp + '.pdf');

  } catch (err) {
    console.error('PDF generation failed:', err);
    alert('PDF generation failed: ' + err.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}


// ==================== SCROLL REVEAL ====================

function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.feature-card, .about-card').forEach(el => {
    observer.observe(el);
  });
}


// ==================== FLOATING PARTICLES ====================

function initFloatingParticles() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const particleContainer = document.createElement('div');
  particleContainer.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0;';
  hero.prepend(particleContainer);

  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    const size = 2 + Math.random() * 3;
    const x = Math.random() * 100;
    const duration = 15 + Math.random() * 20;
    const delay = Math.random() * duration;
    const opacity = 0.15 + Math.random() * 0.25;

    p.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: rgba(0, 180, 255, ${opacity});
      box-shadow: 0 0 ${size * 3}px rgba(0, 180, 255, ${opacity * 0.5});
      left: ${x}%;
      bottom: -10px;
      animation: particleRise ${duration}s linear ${delay}s infinite;
    `;
    particleContainer.appendChild(p);
  }

  // Inject the particle keyframe if not already present
  if (!document.getElementById('particle-keyframes')) {
    const style = document.createElement('style');
    style.id = 'particle-keyframes';
    style.textContent = `
      @keyframes particleRise {
        0% { transform: translateY(0) translateX(0); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(-100vh) translateX(${20 - Math.random() * 40}px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}


// ==================== ANIMATED COUNTERS ====================

let counterTimeout;

function animateValue(el, targetText) {
  el.classList.add('updating');
  el.innerHTML = targetText;
  clearTimeout(counterTimeout);
  counterTimeout = setTimeout(() => {
    el.classList.remove('updating');
  }, 350);
}

// Override renderSingleResults to use animated values
const _originalRenderSingle = renderSingleResults;

renderSingleResults = function(r, params) {
  const effPct = r.efficiency * 100;

  animateValue(document.getElementById('res-efficiency'),
    formatValue(effPct, 2) + '<span class="result-unit">%</span>');
  animateValue(document.getElementById('res-coupling'),
    formatValue(r.couplingCoefficient, 6));
  animateValue(document.getElementById('res-power-out'),
    formatValue(r.powerOutput, 2) + '<span class="result-unit">W</span>');
  animateValue(document.getElementById('res-power-loss'),
    formatValue(r.powerLoss, 2) + '<span class="result-unit">W</span>');

  // Gauges
  const gaugeEff = document.getElementById('gauge-efficiency');
  gaugeEff.style.width = Math.min(effPct, 100) + '%';
  gaugeEff.className = 'gauge-fill ' + efficiencyClass(r.efficiency);

  const gaugeK = document.getElementById('gauge-coupling');
  gaugeK.style.width = (Math.min(r.couplingCoefficient, 1) * 100) + '%';
  gaugeK.className = 'gauge-fill ' + (r.couplingCoefficient > 0.3 ? 'high' : r.couplingCoefficient > 0.1 ? 'medium' : 'low');

  // Secondary
  document.getElementById('res-inductance').textContent = formatSI(r.selfInductance);
  document.getElementById('res-mutual').textContent = formatSI(r.mutualInductance);
  document.getElementById('res-quality').textContent = formatValue(r.qualityFactor, 1);
  document.getElementById('res-resistance').textContent = formatResistance(r.coilResistance);
};
