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
        await this.initializeData();
        this.initializeMap();
        this.bindEvents();
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

        // Enter key support for input fields
        document.getElementById('departure-airport').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.calculateRoute();
        });

        document.getElementById('arrival-airport').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.calculateRoute();
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

        const depCode = document.getElementById('departure-airport').value.trim().toUpperCase();
        const arrCode = document.getElementById('arrival-airport').value.trim().toUpperCase();

        if (!depCode || !arrCode) {
            this.updateStatus('Please enter departure and arrival airports');
            return;
        }

        // Extract airport codes (first 3 characters if longer)
        const depAirportCode = depCode.length > 3 ? depCode.substring(0, 3) : depCode;
        const arrAirportCode = arrCode.length > 3 ? arrCode.substring(0, 3) : arrCode;

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

        // Show ETOPS circles along the route
        this.currentRoute.waypoints.forEach(waypoint => {
            const circle = L.circle([waypoint.lat, waypoint.lng], {
                radius: etopsDistanceKM * 1000, // Convert to meters
                color: '#f59e0b',
                weight: 1,
                opacity: 0.6,
                fillOpacity: 0.1
            }).addTo(this.etopsLayer);
        });
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