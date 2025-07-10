# ETOPS Flight Planner

A web-based flight planning simulator for twin-engine aircraft operating under ETOPS (Extended-range Twin-engine Operation Performance Standards) regulations.

## Features

- **Aircraft Selection**: Choose from 42 twin-engine aircraft with different ETOPS ratings
- **Route Planning**: Calculate optimal great circle routes between airports
- **ETOPS Compliance**: Verify route compliance with ETOPS regulations
- **Interactive Map**: Visualize routes and ETOPS areas on a world map
- **Alternate Airports**: Find suitable alternate airports along the route

## Quick Start

1. Start a local web server:
```bash
python3 -m http.server 8000
```

2. Open your browser and navigate to:
```
http://localhost:8000
```

3. Select an aircraft, enter departure/arrival airports (e.g., NRT, LAX), and calculate the route.

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
- ✅ Aircraft and airport databases
- ✅ User interface and styling
- ✅ Basic route calculation
- 🔄 Pacific route display optimization (in progress)

## Known Issues

- Pacific transoceanic routes may display incorrectly on the map (calculation is correct)
- See `journal.md` for detailed development notes

## Contributing

This is a personal educational project. Feel free to fork and modify for your own use.

## License

MIT License