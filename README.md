# ⚡ WPT Efficiency Calculator

A web-based engineering tool that calculates **wireless power transfer (WPT) efficiency** for electric vehicle charging coil systems. Built for electrical engineering students, researchers, and EV charging system designers.

> Input your coil parameters and instantly get coupling coefficient, system efficiency, and power loss estimates — no simulation software needed.

---

## 🖥️ Live Preview

Open `index.html` in any modern browser, or deploy to any static hosting platform.

---

## 📸 Screenshots

### Landing Page
Dark navy hero with gradient text, feature cards, and direct link to the foundational research paper.

### Calculator
Real-time parameter input with synchronized sliders, instant efficiency metrics, detailed coil parameters, and animated SVG coil visualization.

### About
Mathematical models documentation, research foundation, and paper citation.

---

## ✨ Features

### Core Features
- **Parameter Input Form** — Coil radius, number of turns, air gap distance, operating frequency, and input power
- **Real-Time Calculation** — Results update instantly as you adjust any parameter
- **Results Dashboard** — System efficiency (%), coupling coefficient (k), power output (W), power loss (W)
- **Detailed Parameters** — Self-inductance, mutual inductance, quality factor, coil resistance
- **Color-Coded Gauges** — Visual indicators that change color based on efficiency levels

### Advanced Features
- **Comparison Mode** — Toggle to compare two coil configurations side-by-side with delta values
- **Animated Coil Diagram** — SVG visualization of transmitter/receiver coils with magnetic field lines and energy transfer particles
- **PDF Export** — Print-optimized stylesheet for generating reports

### Design
- Dark navy theme with electric blue accents and glassmorphism
- Responsive layout for desktop, tablet, and mobile
- Modern typography (Inter + JetBrains Mono)
- Subtle grid background and micro-animations

---

## 🧮 Physics Engine

The calculator implements validated electromagnetic models from published WPT research:

| Formula | Description |
|---------|-------------|
| `L = μ₀ · N² · π · r / 2` | Self-inductance (Wheeler approximation) |
| `M = (μ₀ · π · N² · r⁴) / (2 · (r² + d²)^(3/2))` | Mutual inductance (Neumann formula) |
| `k = r³ / (r² + d²)^(3/2)` | Coupling coefficient |
| `Q = 2πfL / R` | Quality factor |
| `η = k²Q₁Q₂ / (1 + √(1 + k²Q₁Q₂))²` | Maximum system efficiency (series-series compensation) |

### Assumptions
- Identical coaxial circular coils
- Copper wire (ρ = 1.68 × 10⁻⁸ Ω·m), 1mm diameter
- DC resistance model (skin effect and proximity effect not included)
- No core losses modeled
- Series-series resonant compensation topology

### Reference Paper
> Kurs, A., Karalis, A., Moffatt, R., Joannopoulos, J. D., Fisher, P., & Soljačić, M. (2007). *Wireless Power Transfer via Strongly Coupled Magnetic Resonances.* Science, 317(5834), 83–86.
>
> DOI: [10.1126/science.1143254](https://doi.org/10.1126/science.1143254)

---

## 🚀 Getting Started

### Option 1: Open Directly
Simply open `index.html` in your web browser — no build step or server required.

### Option 2: Local Server
```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx serve .
```

Then open `http://localhost:8080` in your browser.

---

## 📁 Project Structure

```
WPT Efficiency Calculator/
├── index.html      # SPA with Landing, Calculator, and About pages
├── styles.css      # Complete design system (dark navy theme)
├── app.js          # Physics engine, routing, animations, comparison mode
└── README.md       # This file
```

### No Dependencies
This project uses **zero external dependencies** — just vanilla HTML, CSS, and JavaScript. The only external resource is Google Fonts (Inter + JetBrains Mono) loaded via CDN.

---

## 🛠️ Customization

### Google Analytics
Replace `GA_MEASUREMENT_ID` in the `<head>` of `index.html` with your actual GA4 measurement ID:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR_ID_HERE"></script>
```

### Research Paper Link
The DOI link currently points to the foundational Kurs et al. paper. To link your own paper, search for `doi.org/10.1126/science.1143254` in `index.html` and replace with your DOI.

### Author Bio
Update the "About the Author" section in `index.html` (search for `about-author`) with your information.

### Design Tokens
All colors, fonts, spacing, and transitions are defined as CSS custom properties in `styles.css`:
```css
:root {
  --bg-primary: #060b1e;
  --accent: #00b4ff;
  --accent-bright: #00e5ff;
  --text: #ffffff;
  --font: 'Inter', system-ui, sans-serif;
  --mono: 'JetBrains Mono', monospace;
  /* ... more tokens */
}
```

---

## 🌐 Deployment

This is a static site. Deploy anywhere:

| Platform | Command / Steps |
|----------|----------------|
| **Vercel** | `npx vercel` |
| **Netlify** | Drag and drop folder in dashboard |
| **GitHub Pages** | Push to repo → Settings → Pages → Deploy from branch |
| **Cloudflare Pages** | Connect repo → Auto deploy |

---

## 📱 Browser Support

- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+
- Mobile browsers (responsive layout)

---

## 📄 License

MIT License — free for academic and commercial use.

---

## 🤝 Contributing

Contributions welcome! Potential improvements:
- Add skin effect resistance model for high-frequency accuracy
- Support asymmetric coil configurations (different Tx/Rx radii)
- Add more compensation topologies (SP, PS, PP)
- Interactive 3D coil visualization
- Save/load parameter presets

---

Built with ⚡ for the WPT research community.
