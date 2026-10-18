# 🌍 AeroGlobe AI — Interactive 3D Travel Globe, Cost Estimator & Itinerary Planner

An interactive 3D World Globe travel discovery & planning application where users filter destinations by:
1. **Desired Weather (Temperature Range)** in `°C` or `°F` (plus 1-click presets: *Tropical*, *Warm*, *Mild*, *Alpine*)
2. **Month of Travel** (`January` – `December`) with historical average daytime temperatures, daily sunshine hours, and seasonal pricing
3. **Number of Days for Travel** (`2` – `28` days)
4. **Expected Total Budget (Return Flight + Hotel)** across `£ GBP`, `$ USD`, `€ EUR`, and `₹ INR`
5. **Seasonality Preference**: **Off-Peak**, **On-Peak**, or **Both**
6. **Hotel Accommodation Preference**: Multi-select checkboxes for **5-Star Luxury**, **4-Star Boutique**, **3-Star Comfort**, and **Airbnb / Vacation Rental** (users can select any combination or all 4)

---

## ✨ Key Features

- **Interactive 3D WebGL Globe + 2D Map Toggle**:
  - Destinations matching the user's criteria **light up on the 3D Globe** with pulsing neon radar rings, elevated light pillars, animated 3D flight arcs from the user's departure airport hub, and floating badges displaying **Expected Flying Cost + Hotel Cost**.
  - Switch between **3D Globe** (`Globe.gl` / `Three.js`) and **2D Flat World Map** (`Leaflet.js`) at any time.
- **Click Any Location for Full Breakdown, AI Itinerary & Direct Booking**:
  - **Flight + Hotel Cost Breakdown**: Inspect side-by-side totals for **5-Star, 4-Star, 3-Star, and Airbnb** stays for the exact number of days selected.
  - **Custom Day-by-Day Itinerary Generator**: Prompts the user *"Would you like the tool to create a custom N-Day Itinerary for [City]?"* with selectable travel styles (*Balanced, Culture, Gastronomy, Relaxation, Adventure*) and PDF/Print export.
  - **Direct Flight & Hotel Booking Portals**: Pre-configured links to **Skyscanner**, **Google Flights**, **Kayak**, **Expedia**, **Booking.com** (filtered by chosen star ratings), **Airbnb**, and **Hotels.com**.

---

## 🚀 Quick Start

Double-click [`run_travel_planner.bat`](../run_travel_planner.bat) in the root folder, or run:

```bash
node server.js
# or
python server.py
```

Then open `http://127.0.0.1:8098` in your browser (or open `index.html` directly).
