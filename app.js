/**
 * ETOPS Flight Planner - Frontend Application
 * Main application logic and UI interactions
 */

class ETOPSApp {
    constructor() {
        this.map = null;
        this.calculator = new ETOPSCalculator();
        this.selectedAircraft = null;
        this.currentRoute = null;
        this.routeLayer = null;
        this.etopsLayer = null;
        this.alternatesLayer = null;
        
        this.init();
    }

    async init() {
        this.initializeMap();
        this.bindEvents();
        await this.initializeData();
        this.updateStatus('Application initialized');
    }

    async initializeData() {
        try {
            // Load aircraft data
            const aircraftResponse = await fetch('./data/aircraft.json');
            const aircraftData = await aircraftResponse.json();
            
            // Load airport data
            const airportsResponse = await fetch('./data/airports.json');
            const airportsData = await airportsResponse.json();
            
            // Set data in calculator
            this.calculator.setAircraftData(aircraftData);
            this.calculator.setAirportData(airportsData);
            
            // Populate airport dropdowns
            this.populateAirportDropdowns(airportsData);
            
            console.log('Data loaded successfully');
        } catch (error) {
            console.error('Error loading data:', error);
            this.updateStatus('Error loading data');
        }
    }

    initializeMap() {
        // Initialize Leaflet map
        this.map = L.map('map', {
            center: [35.0, 140.0], // Center on Japan
            zoom: 4,
            minZoom: 2,
            maxZoom: 10,
            worldCopyJump: false, // Disable world copy jump for better control
            maxBounds: [[-85, -540], [85, 540]] // Extended bounds for Pacific view
        });

        // Add dark tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors, © CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);

        // Initialize layer groups
        this.routeLayer = L.layerGroup().addTo(this.map);
        this.etopsLayer = L.layerGroup().addTo(this.map);
        this.alternatesLayer = L.layerGroup().addTo(this.map);

        // Add mouse coordinate tracking
        this.map.on('mousemove', (e) => {
            const coords = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
            document.getElementById('mouse-coords').textContent = coords;
        });

        // Add click handler for airport selection
        this.map.on('click', (e) => {
            this.handleMapClick(e);
        });
    }

    populateAirportDropdowns(airportsData) {
        const departureSelect = document.getElementById('departure-airport');
        const arrivalSelect = document.getElementById('arrival-airport');
        
        if (!departureSelect || !arrivalSelect) {
            console.error('Airport select elements not found!');
            return;
        }
        
        // Group airports by category for better organization
        const majorAirports = [];
        const alternateAirports = [];
        
        Object.entries(airportsData).forEach(([code, airport]) => {
            const option = {
                code: code,
                display: `${code} - ${airport.name}`,
                category: airport.category || 'major'
            };
            
            if (airport.category === 'major') {
                majorAirports.push(option);
            } else {
                alternateAirports.push(option);
            }
        });
        
        // Sort alphabetically by code
        majorAirports.sort((a, b) => a.code.localeCompare(b.code));
        alternateAirports.sort((a, b) => a.code.localeCompare(b.code));
        
        // Add options to both dropdowns
        [departureSelect, arrivalSelect].forEach((select) => {
            // Clear existing options except the first placeholder
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            // Add major airports group
            if (majorAirports.length > 0) {
                const majorGroup = document.createElement('optgroup');
                majorGroup.label = 'Major Airports';
                majorAirports.forEach(airport => {
                    const option = document.createElement('option');
                    option.value = airport.code;
                    option.textContent = airport.display;
                    majorGroup.appendChild(option);
                });
                select.appendChild(majorGroup);
            }
            
            // Add alternate airports group
            if (alternateAirports.length > 0) {
                const alternateGroup = document.createElement('optgroup');
                alternateGroup.label = 'Alternate Airports';
                alternateAirports.forEach(airport => {
                    const option = document.createElement('option');
                    option.value = airport.code;
                    option.textContent = airport.display;
                    alternateGroup.appendChild(option);
                });
                select.appendChild(alternateGroup);
            }
        });
    }

    bindEvents() {
        // Aircraft selection
        document.getElementById('aircraft-select').addEventListener('change', (e) => {
            this.onAircraftChange(e.target.value);
        });

        // Route calculation
        document.getElementById('calculate-route').addEventListener('click', () => {
            this.calculateRoute();
        });

        // Map controls
        document.getElementById('toggle-etops').addEventListener('click', () => {
            this.toggleETOPSAreas();
        });

        document.getElementById('toggle-alternates').addEventListener('click', () => {
            this.toggleAlternates();
        });
    }

    onAircraftChange(aircraftCode) {
        if (!aircraftCode) {
            this.selectedAircraft = null;
            this.clearAircraftInfo();
            return;
        }

        const aircraft = this.calculator.aircraft[aircraftCode];
        if (aircraft) {
            this.selectedAircraft = aircraftCode;
            this.updateAircraftInfo(aircraft);
        }
    }

    updateAircraftInfo(aircraft) {
        // Calculate ETOPS distance
        const etopsDistanceNM = (aircraft.etops / 60) * aircraft.cruiseSpeed;
        
        document.getElementById('etops-rating').textContent = `${aircraft.etops} minutes`;
        document.getElementById('etops-distance').textContent = `${etopsDistanceNM.toFixed(0)} nm`;
        document.getElementById('aircraft-range').textContent = `${aircraft.range} nm`;
        document.getElementById('cruise-speed').textContent = `${aircraft.cruiseSpeed} kts`;
    }

    clearAircraftInfo() {
        document.getElementById('etops-rating').textContent = '-';
        document.getElementById('etops-distance').textContent = '-';
        document.getElementById('aircraft-range').textContent = '-';
        document.getElementById('cruise-speed').textContent = '-';
    }

    async calculateRoute() {
        if (!this.selectedAircraft) {
            this.updateStatus('Please select an aircraft first');
            return;
        }

        const depAirportCode = document.getElementById('departure-airport').value;
        const arrAirportCode = document.getElementById('arrival-airport').value;

        if (!depAirportCode || !arrAirportCode) {
            this.updateStatus('Please select departure and arrival airports');
            return;
        }

        const depAirport = this.calculator.airports[depAirportCode];
        const arrAirport = this.calculator.airports[arrAirportCode];

        if (!depAirport || !arrAirport) {
            this.updateStatus('Airport not found. Please check airport codes.');
            return;
        }

        try {
            this.updateStatus('Calculating route...');
            
            // Calculate route
            const route = this.calculator.calculateOptimalRoute(
                depAirport, 
                arrAirport, 
                this.selectedAircraft
            );

            // Check ETOPS compliance
            const etopsCheck = this.calculator.checkETOPSCompliance(this.selectedAircraft, route);

            this.currentRoute = route;
            this.updateRouteInfo(route, etopsCheck);
            this.displayRoute(route);
            this.displayAlternates(etopsCheck.alternateAirports);

            // Fit map to route
            this.fitMapToRoute(route);

            this.updateStatus('Route calculated successfully');
        } catch (error) {
            console.error('Error calculating route:', error);
            this.updateStatus('Error calculating route');
        }
    }

    updateRouteInfo(route, etopsCheck) {
        document.getElementById('route-distance').textContent = `${route.totalDistance.toFixed(0)} nm`;
        document.getElementById('flight-time').textContent = `${route.estimatedFlightTime.toFixed(1)} hours`;
        document.getElementById('fuel-consumption').textContent = `${route.fuelConsumption.toFixed(0)} kg`;
        
        const complianceElement = document.getElementById('etops-compliance');
        if (etopsCheck.compliant) {
            complianceElement.textContent = 'COMPLIANT';
            complianceElement.style.color = 'var(--accent-green)';
        } else {
            complianceElement.textContent = 'NON-COMPLIANT';
            complianceElement.style.color = 'var(--accent-red)';
        }
    }

    displayRoute(route) {
        // Clear existing route
        this.routeLayer.clearLayers();

        // Create route polyline
        const routeCoords = route.waypoints.map(wp => [wp.lat, wp.lng]);
        
        // Debug: Log the coordinates
        console.log('Route waypoints for display:');
        routeCoords.forEach((coord, i) => {
            console.log(`WP${i}: lat=${coord[0].toFixed(4)}, lng=${coord[1].toFixed(4)}`);
        });
        
        // Check if transpacific route
        const depLng = route.departure.lng;
        const arrLng = route.arrival.lng;
        const crossesAntimeridian = Math.abs(arrLng - depLng) > 180;
        
        if (crossesAntimeridian) {
            // For transpacific routes, normalize coordinates for continuous display
            const normalizedCoords = this.normalizeTranspacificCoords(routeCoords);
            console.log('Normalized coordinates for transpacific display');
            
            const routeLine = L.polyline(normalizedCoords, {
                color: '#2563eb',
                weight: 3,
                opacity: 0.8
            }).addTo(this.routeLayer);
        } else {
            // For normal routes, use original approach
            const routeSegments = this.splitRouteAtAntimeridian(routeCoords);
            console.log(`Route split into ${routeSegments.length} segments`);
            
            routeSegments.forEach((segment, index) => {
                console.log(`Segment ${index}: ${segment.length} points`);
                const routeLine = L.polyline(segment, {
                    color: '#2563eb',
                    weight: 3,
                    opacity: 0.8
                }).addTo(this.routeLayer);
            });
        }

        // Add departure and arrival markers with appropriate coordinates
        let depCoords = [route.departure.lat, route.departure.lng];
        let arrCoords = [route.arrival.lat, route.arrival.lng];
        
        if (crossesAntimeridian) {
            // Use normalized coordinates for transpacific routes
            if (route.departure.lng < 0) depCoords[1] = route.departure.lng + 360;
            if (route.arrival.lng < 0) arrCoords[1] = route.arrival.lng + 360;
        }
        
        const depMarker = L.marker(depCoords, {
            icon: this.createAirportIcon('departure')
        }).addTo(this.routeLayer);

        const arrMarker = L.marker(arrCoords, {
            icon: this.createAirportIcon('arrival')
        }).addTo(this.routeLayer);

        // Add popups
        depMarker.bindPopup(`<b>Departure</b><br>${route.departure.name}`);
        arrMarker.bindPopup(`<b>Arrival</b><br>${route.arrival.name}`);
    }

    displayAlternates(alternates) {
        const alternatesList = document.getElementById('alternates-list');
        alternatesList.innerHTML = '';

        if (alternates.length === 0) {
            alternatesList.innerHTML = '<div class="no-data">No alternates found</div>';
            return;
        }

        alternates.forEach(alt => {
            if (alt.alternates && alt.alternates.length > 0) {
                alt.alternates.slice(0, 3).forEach(airport => {
                    const item = document.createElement('div');
                    item.className = 'alternate-item';
                    item.innerHTML = `
                        <span class="alternate-code">${airport.code}</span>
                        <span class="alternate-distance">${airport.distance.toFixed(0)} nm</span>
                    `;
                    alternatesList.appendChild(item);
                });
            }
        });
    }

    toggleETOPSAreas() {
        const button = document.getElementById('toggle-etops');
        const isActive = button.classList.contains('active');

        if (isActive) {
            this.etopsLayer.clearLayers();
            button.classList.remove('active');
            button.classList.remove('etops-warning-active');
            // Reset button style
            button.style.backgroundColor = '';
            button.style.borderColor = '';
            button.textContent = 'Show ETOPS Areas';
        } else {
            this.showETOPSAreas();
            button.classList.add('active');
        }
    }

    showETOPSAreas() {
        if (!this.currentRoute || !this.selectedAircraft) return;

        this.etopsLayer.clearLayers();

        const aircraft = this.calculator.aircraft[this.selectedAircraft];
        const etopsDistanceNM = (aircraft.etops / 60) * aircraft.cruiseSpeed;
        const etopsDistanceKM = etopsDistanceNM * 1.852; // Convert to km for Leaflet

        // Check ETOPS compliance for visual styling
        const etopsCheck = this.calculator.checkETOPSCompliance(this.selectedAircraft, this.currentRoute);
        const isCompliant = etopsCheck.compliant;

        console.log('=== ETOPS AREAS DEBUG ===');
        console.log('Aircraft:', this.selectedAircraft, aircraft);
        console.log('ETOPS Rating:', aircraft.etops, 'minutes');
        console.log('Cruise Speed:', aircraft.cruiseSpeed, 'kts');
        console.log('ETOPS Distance:', etopsDistanceNM.toFixed(0), 'nm');
        console.log('Compliance Check:', isCompliant);
        console.log('Violations:', etopsCheck.violations.length);
        console.log('Route waypoints:', this.currentRoute.waypoints.length);
        
        // 詳細な違反調査
        etopsCheck.violations.forEach((violation, i) => {
            console.log(`Violation ${i+1}:`, 
                'WP:', violation.waypoint, 
                'Issue:', violation.issue,
                'Available alternates:', violation.alternates ? violation.alternates.length : 'N/A'
            );
        });
        
        // 代替空港検索の詳細デバッグ
        console.log('Alternate airports check:');
        this.currentRoute.waypoints.forEach((wp, i) => {
            const alternates = this.calculator.findAlternateAirports(wp, etopsDistanceNM);
            console.log(`WP${i} (${wp.lat.toFixed(2)}, ${wp.lng.toFixed(2)}): ${alternates.length} alternates`);
            if (alternates.length === 0) {
                console.log(`  -> VIOLATION: No alternates within ${etopsDistanceNM}nm`);
            } else {
                alternates.slice(0, 3).forEach(alt => {
                    console.log(`  -> ${alt.code}: ${alt.distance.toFixed(0)}nm`);
                });
            }
        });

        // Choose colors based on compliance
        const circleColor = isCompliant ? '#f59e0b' : '#ef4444'; // Orange for compliant, Red for non-compliant
        const fillOpacity = isCompliant ? 0.1 : 0.2; // More prominent fill for warnings
        const opacity = isCompliant ? 0.6 : 0.8; // More prominent border for warnings

        // Show ETOPS circles along the route
        this.currentRoute.waypoints.forEach((waypoint, index) => {
            const circle = L.circle([waypoint.lat, waypoint.lng], {
                radius: etopsDistanceKM * 1000, // Convert to meters
                color: circleColor,
                weight: isCompliant ? 1 : 2, // Thicker border for warnings
                opacity: opacity,
                fillOpacity: fillOpacity,
                className: isCompliant ? 'etops-compliant' : 'etops-warning'
            }).addTo(this.etopsLayer);

            // Add warning markers for non-compliant areas
            if (!isCompliant) {
                const warningIcon = L.divIcon({
                    className: 'etops-warning-icon',
                    html: `<div style="
                        background-color: #ef4444; 
                        color: white; 
                        width: 24px; 
                        height: 24px; 
                        border-radius: 50%; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        font-weight: bold; 
                        font-size: 16px;
                        border: 2px solid white;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    ">⚠</div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                });

                const warningMarker = L.marker([waypoint.lat, waypoint.lng], {
                    icon: warningIcon
                }).addTo(this.etopsLayer);

                warningMarker.bindPopup(`
                    <div style="text-align: center;">
                        <strong style="color: #ef4444;">⚠ ETOPS WARNING ⚠</strong><br>
                        <span style="font-size: 12px;">No suitable alternate airport<br>within ${aircraft.etops} minutes</span>
                    </div>
                `);
            }
        });

        // Add compliance status to button
        const button = document.getElementById('toggle-etops');
        if (!isCompliant) {
            button.style.backgroundColor = '#ef4444';
            button.style.borderColor = '#ef4444';
            button.textContent = '⚠ ETOPS Warning Areas';
            button.classList.add('etops-warning-active');
        } else {
            button.style.backgroundColor = '#f59e0b';
            button.style.borderColor = '#f59e0b';
            button.textContent = 'Show ETOPS Areas';
            button.classList.remove('etops-warning-active');
        }
    }

    toggleAlternates() {
        const button = document.getElementById('toggle-alternates');
        const isActive = button.classList.contains('active');

        if (isActive) {
            this.alternatesLayer.clearLayers();
            button.classList.remove('active');
        } else {
            this.showAlternates();
            button.classList.add('active');
        }
    }

    showAlternates() {
        if (!this.currentRoute) return;

        this.alternatesLayer.clearLayers();

        // Show all airports as potential alternates
        Object.entries(this.calculator.airports).forEach(([code, airport]) => {
            if (airport.suitable_for_etops) {
                const marker = L.marker([airport.lat, airport.lng], {
                    icon: this.createAirportIcon('alternate')
                }).addTo(this.alternatesLayer);

                marker.bindPopup(`<b>${code}</b><br>${airport.name}`);
            }
        });
    }

    createAirportIcon(type) {
        const colors = {
            departure: '#10b981',
            arrival: '#ef4444',
            alternate: '#f59e0b'
        };

        return L.divIcon({
            className: 'airport-icon',
            html: `<div style="background-color: ${colors[type]}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
    }

    fitMapToRoute(route) {
        // Check if this is a transpacific route (crosses antimeridian)
        const depLng = route.departure.lng;
        const arrLng = route.arrival.lng;
        const crossesAntimeridian = Math.abs(arrLng - depLng) > 180;
        
        if (crossesAntimeridian) {
            // For transpacific routes, center the map on the Pacific
            const avgLat = (route.departure.lat + route.arrival.lat) / 2;
            
            // Calculate Pacific-centered longitude
            let centerLng;
            if (depLng > 0 && arrLng < 0) {
                // East to West crossing (e.g., Japan to US)
                centerLng = (depLng + (arrLng + 360)) / 2;
                if (centerLng > 180) centerLng -= 360;
            } else {
                // West to East crossing
                centerLng = (arrLng + (depLng + 360)) / 2;
                if (centerLng > 180) centerLng -= 360;
            }
            
            console.log(`Transpacific route detected. Centering map at: ${avgLat.toFixed(2)}, ${centerLng.toFixed(2)}`);
            
            // Set view to Pacific center with appropriate zoom
            this.map.setView([avgLat, centerLng], 3);
            
            // Set specific bounds for Pacific view to avoid world wrapping
            const pacificBounds = L.latLngBounds([
                [Math.min(route.departure.lat, route.arrival.lat) - 15, 100],
                [Math.max(route.departure.lat, route.arrival.lat) + 15, 280]
            ]);
            
            this.map.fitBounds(pacificBounds, { 
                padding: [50, 50],
                maxZoom: 4 
            });
        } else {
            // For normal routes, use standard bounds fitting
            const bounds = L.latLngBounds([
                [route.departure.lat, route.departure.lng],
                [route.arrival.lat, route.arrival.lng]
            ]);

            this.map.fitBounds(bounds, { padding: [50, 50] });
        }
    }

    handleMapClick(e) {
        // Future: Allow clicking on map to select airports
        console.log('Map clicked:', e.latlng);
    }

    splitRouteAtAntimeridian(coords) {
        const segments = [];
        let currentSegment = [coords[0]];
        
        for (let i = 1; i < coords.length; i++) {
            const prevLng = coords[i - 1][1];
            const currentLng = coords[i][1];
            const lngDiff = currentLng - prevLng;
            
            // Check for antimeridian crossing (longitude jump > 180 degrees)
            if (Math.abs(lngDiff) > 180) {
                // End current segment
                segments.push([...currentSegment]);
                
                // Start new segment
                currentSegment = [coords[i]];
                console.log(`Antimeridian crossing detected between WP${i-1} and WP${i}`);
                console.log(`  Longitude jump: ${prevLng} -> ${currentLng} (diff: ${lngDiff})`);
            } else {
                // Continue current segment
                currentSegment.push(coords[i]);
            }
        }
        
        // Add the last segment
        if (currentSegment.length > 0) {
            segments.push(currentSegment);
        }
        
        return segments;
    }

    normalizeTranspacificCoords(coords) {
        // For transpacific routes, shift all negative longitudes to positive
        // This creates a continuous path across the Pacific
        const normalizedCoords = coords.map(coord => {
            let [lat, lng] = coord;
            
            // Convert negative longitudes to 180+ range for Pacific continuity
            if (lng < 0) {
                lng = lng + 360;
            }
            
            return [lat, lng];
        });
        
        console.log('Coordinate normalization:');
        coords.forEach((orig, i) => {
            const norm = normalizedCoords[i];
            if (orig[1] !== norm[1]) {
                console.log(`  WP${i}: ${orig[1]} -> ${norm[1]}`);
            }
        });
        
        return normalizedCoords;
    }

    normalizeRouteCoords(waypoints) {
        const coords = waypoints.map(wp => [wp.lat, wp.lng]);
        
        // Simple approach: just return the original coordinates
        // Let Leaflet handle the antimeridian crossing naturally
        return coords;
    }

    updateStatus(message) {
        document.getElementById('status-message').textContent = message;
        console.log('Status:', message);
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ETOPSApp();
});