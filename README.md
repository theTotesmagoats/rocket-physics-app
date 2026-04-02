# 🚀 Rocket Physics Simulator

## What This Is

An educational rocket physics simulator that teaches aerodynamics through interactive flight prediction. Built in **modular pieces** so you can break one thing and fix one thing — no cascading failures.

Built with the Feynman philosophy: *"What I cannot create, I do not understand."*

---

## 🏗️ Architecture Philosophy

Each JavaScript module has ONE responsibility:

```
js/
├── config.js              # User-configurable constants
├── physics-constants.js   # Physical constants (G, air density)
├── drag-module.js         # Drag calculation ONLY
├── thrust-module.js       # Thrust curve handling
├── flight-phases.js       # Detecting phase transitions
├── trajectory-engine.js   # Main simulation loop
├── wind-model.js          # Wind effects on horizontal position
├── parachute-physics.js   # Parachute deployment and drag
├── rocket-builder.js      # Component selection logic
├── landing-predictor.js   # Calculate final landing position
└── visualizer.js          # Draw everything (swappable)
```

---

## 📚 The Feynman Approach

Every module exposes two things:
1. **The calculation** — what happens
2. **The explanation** — why it happens

Example from `drag-module.js`:
```javascript
function calculateDrag(velocity, area, dragCoefficient) {
    const force = 0.5 * AIR_DENSITY * velocity² * dragCoefficient * area;
    
    return {
        value: force,
        explanation: `At ${velocity} m/s, drag is ${force} N. Double the speed and drag quadruples.`
    };
}
```

---

## 🚀 How to Use

### Quick Start
1. Open `index.html` in a browser (or use GitHub Pages)
2. Select your rocket, motor, and parachute
3. Set wind conditions
4. Click "Simulate Launch"
5. Read the Feynman-style explanations for each phase

### What You'll Learn
- **Why drag scales with velocity squared** — not linearly!
- **How total impulse differs from thrust** — and why both matter
- **Why parachute size affects landing position** — bigger isn't always better
- **The four phases of flight** — and the physics that dominates each

---

## 🔧 Iteration Strategy

The app is designed to be iterated on piece by piece:

| Phase | Module | What You Learn |
|-------|--------|----------------|
| 1 | `drag-module.js` | Why shape matters — velocity² relationship |
| 2 | `thrust-module.js` | Motor selection — impulse vs. thrust tradeoffs |
| 3 | `trajectory-engine.js` | Combining forces — net acceleration |
| 4 | `wind-model.js` + `parachute-physics.js` | Landing prediction (where most sims fail) |
| 5 | `visualizer.js` | Can be completely swapped out |

---

## 📊 Key Physics

### The Drag Equation (Paramount for Landing Prediction)
```
F_drag = ½ × ρ × v² × C_d × A
```

- **ρ** (rho) = air density (~1.225 kg/m³ at sea level)
- **v** = velocity
- **C_d** = drag coefficient (shape-dependent, ~0.75 for rockets)
- **A** = cross-sectional area

**Why it matters:** At low speeds, ignore it and get decent predictions. At rocket speeds? It dominates everything.

### Flight Phases
1. **Powered Ascent** — Thrust fights gravity and drag
2. **Coasting Ascent** — Gravity wins, drag slows you down  
3. **Apogee** — Velocity = 0 (momentarily)
4. **Descent** — Parachute drag vs. gravity + wind drift ← *Landing prediction lives here*

---

## 🛠️ Running Locally

```bash
git clone https://github.com/theTotesmagoats/rocket-physics-app.git
cd rocket-physics-app
python3 -m http.server 8000
# Open http://localhost:8000
```

Or just open `index.html` directly in a browser.

---

## 📝 Data Files

- **`data/motors.json`** — Motor specs and thrust curves (A through E class)
- **`data/rockets.json`** — Rocket body options with mass properties  
- **`data/parachutes.json`** — Parachute types with drag coefficients

---

## 🔮 Future Enhancements

- [ ] Real-time altitude telemetry simulation
- [ ] Motor thrust curve visualization
- [ ] Multiple rocket comparison mode
- [ ] Export flight data as CSV
- [ ] Wind shear modeling (wind changes with altitude)
- [ ] Altimeter-based ejection simulation

---

## 📖 Feynman Quotes Embedded in the Code

> *"The math is easy. The hard part is knowing when the math stops working."*  
> — Drag module, about subsonic assumptions

> *"What I cannot create, I do not understand."*  
> — README, core philosophy

> *"Nature does not care how well your equations work."*  
> — Landing predictor, about prediction uncertainty

---

## 🤝 Contributing

Each module is isolated. Pick one, break it, fix it, understand why.

1. Fork the repo
2. Edit ONE module at a time
3. Test by running the simulation
4. Read the console output for debugging
5. Submit a PR with what you learned

---

*Built for learning. Break things. Fix them. Understand why.*