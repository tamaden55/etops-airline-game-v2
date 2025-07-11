# ETOPS Flight Planner

A web-based flight planning simulator for twin-engine aircraft operating under ETOPS (Extended-range Twin-engine Operation Performance Standards) regulations.

## 🌐 Live Demo

**Access the application here:** [https://tamaden55.github.io/etops-airline-game-v2](https://tamaden55.github.io/etops-airline-game-v2)

## Features

- **Aircraft Selection**: Choose from 42 twin-engine aircraft with different ETOPS ratings
- **Route Planning**: Calculate optimal great circle routes between airports
- **ETOPS Compliance**: Verify route compliance with ETOPS regulations
- **Interactive Map**: Visualize routes and ETOPS areas on a world map
- **Alternate Airports**: Find suitable alternate airports along the route

## Quick Start

### Option 1: Online Access (Recommended)
Simply visit the live demo: [https://tamaden55.github.io/etops-airline-game-v2](https://tamaden55.github.io/etops-airline-game-v2)

### Option 2: Local Development
1. Clone the repository:
```bash
git clone https://github.com/tamaden55/etops-airline-game-v2.git
cd etops-airline-game-v2
```

2. Start a local web server:
```bash
python3 -m http.server 8000
```

3. Open your browser and navigate to:
```
http://localhost:8000
```

### How to Use
1. Select an aircraft from the dropdown (ETOPS ratings are displayed)
2. Enter departure and arrival airports (e.g., NRT, LAX)
3. Click "Calculate Route" to see the optimal ETOPS-compliant route
4. Use "Show ETOPS Areas" and "Show Alternates" to explore safety zones

## Project Structure

```
etops-airline-game-v2/
├── index.html              # Main HTML file
├── styles.css              # Dark theme CSS
├── app.js                  # Frontend application
├── etops-calculator.js     # ETOPS calculation engine
├── data/
│   ├── aircraft.json       # Aircraft database (42 aircraft)
│   └── airports.json       # Airport database (25 airports)
├── test-etops.js           # Backend test script
└── debug-*.js              # Debug utilities
```

## Technologies Used

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Mapping**: Leaflet.js
- **Styling**: Custom dark theme with aviation-inspired design
- **Data**: JSON databases for aircraft and airports

## Aircraft Categories

- **Ultra Long Range**: A350-900 (370min ETOPS)
- **Long Range**: B777-ER series (207min ETOPS), B787 series (330min ETOPS)
- **Medium Range**: A320/B737 families (180min ETOPS)
- **Regional**: E-Jets, CRJ series (120min ETOPS)
- **Short Range**: Turboprops (60min ETOPS)

## Development Status

- ✅ Backend ETOPS calculation engine
- ✅ Aircraft and airport databases (42 aircraft, 25 airports)
- ✅ User interface and styling (aviation-themed dark UI)
- ✅ Route calculation with great circle routing
- ✅ Pacific transoceanic route display (fully resolved)
- ✅ ETOPS compliance checking and visualization
- ✅ Live deployment on GitHub Pages

## Deployment

This application is automatically deployed to GitHub Pages. Any changes pushed to the `main` branch will be reflected on the live site within a few minutes.

**Live URL:** [https://tamaden55.github.io/etops-airline-game-v2](https://tamaden55.github.io/etops-airline-game-v2)

## Contributing

This is a personal educational project. Feel free to fork and modify for your own use.

## License

MIT License