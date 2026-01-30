// src/components/MapModal.jsx
import { useEffect, useRef, useState } from 'react';
import './MapModal.css';

const MapModal = ({ onClose, onConfirm, initialLat = null, initialLng = null }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Wait for DOM element to be ready
    if (!mapRef.current) return;

    // Load Leaflet CSS and JS dynamically
    const loadLeaflet = async () => {
      if (window.L) {
        // Small delay to ensure DOM is ready
        setTimeout(() => initializeMap(), 100);
        return;
      }

      // Load CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);

      // Load JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qjJsoR7dF9i+2ZHH4mYTyn93ZJTZfk=';
      script.crossOrigin = '';
      script.onload = () => {
        // Small delay to ensure DOM is ready
        setTimeout(() => initializeMap(), 100);
      };
      document.body.appendChild(script);
    };

    loadLeaflet();

    return () => {
      // Cleanup map on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerRef.current = null;
    };
  }, []);

  const initializeMap = () => {
    if (!window.L || mapInstanceRef.current || !mapRef.current) return;

    // Ensure map container has dimensions
    if (mapRef.current.offsetWidth === 0 || mapRef.current.offsetHeight === 0) {
      console.warn('Map container has no dimensions, retrying...');
      setTimeout(() => initializeMap(), 200);
      return;
    }

    let center = [40.7128, -74.0060]; // Default to New York
    let zoom = 13;

    if (initialLat && initialLng) {
      center = [parseFloat(initialLat), parseFloat(initialLng)];
      zoom = 15;
    }

    try {
      // Create map
      const map = window.L.map(mapRef.current, {
        preferCanvas: false
      }).setView(center, zoom);
      
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
      
      // Invalidate size after a short delay to ensure proper rendering
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
    } catch (error) {
      console.error('Error initializing map:', error);
    }

    // Add marker if initial coordinates provided
    if (initialLat && initialLng) {
      addMarker(parseFloat(initialLat), parseFloat(initialLng));
      setSelectedCoords({ lat: parseFloat(initialLat), lng: parseFloat(initialLng) });
    } else {
      // Try geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            map.setView([latitude, longitude], 15);
            addMarker(latitude, longitude);
            setSelectedCoords({ lat: latitude, lng: longitude });
          },
          (error) => {
            console.log('Could not get current location:', error);
          }
        );
      }
    }

    // Add click event
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      addMarker(lat, lng);
      setSelectedCoords({ lat, lng });
    });
  };

  const addMarker = (lat, lng) => {
    if (!mapInstanceRef.current) return;

    // Remove existing marker
    if (markerRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
    }

    // Add new marker
    markerRef.current = window.L.marker([lat, lng], {
      draggable: true
    }).addTo(mapInstanceRef.current);

    // Update coordinates when marker is dragged
    markerRef.current.on('dragend', (e) => {
      const newPos = e.target.getLatLng();
      setSelectedCoords({ lat: newPos.lat, lng: newPos.lng });
    });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 15);
          addMarker(latitude, longitude);
          setSelectedCoords({ lat: latitude, lng: longitude });
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Could not get your location. Please click on the map instead.');
        setIsLoading(false);
      }
    );
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      alert('Please enter a location to search for.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Restaurant-App/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 15);
          addMarker(lat, lng);
          setSelectedCoords({ lat, lng });
        }
      } else {
        alert('No locations found. Please try a different search term.');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedCoords) {
      alert('Please select a location on the map first.');
      return;
    }

    setIsLoading(true);
    try {
      // Reverse geocode the selected coordinates
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${selectedCoords.lat}&lon=${selectedCoords.lng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Restaurant-App/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();
      const address = data.address || {};

      const addressData = {
        address_line1: [address.house_number, address.road].filter(Boolean).join(' ') || '',
        address_line2: address.suburb || '',
        city: address.city || address.town || address.village || '',
        state: address.state || '',
        zipcode: address.postcode || '',
        country: address.country || 'United States',
        latitude: selectedCoords.lat,
        longitude: selectedCoords.lng
      };

      onConfirm(addressData);
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      alert('Could not get address for selected location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="map-modal-backdrop" onClick={onClose}>
      <div className="map-modal" onClick={(e) => e.stopPropagation()}>
        <div className="map-modal-header">
          <h3>
            <span className="map-modal-icon">📍</span>
            Select Location
          </h3>
          <button type="button" className="map-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="map-modal-search">
          <input
            type="text"
            className="map-modal-input"
            placeholder="Search for a location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? '...' : 'Search'}
          </button>
        </div>
        <div className="map-modal-body">
          <div id="locationMap" ref={mapRef} style={{ height: '400px', width: '100%', borderRadius: '8px' }}></div>
        </div>
        <div className="map-modal-footer">
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={handleUseCurrentLocation}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : '📍 Use current location'}
          </button>
          <div className="map-modal-footer-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={!selectedCoords || isLoading}
            >
              {isLoading ? 'Getting Address...' : '✓ Use This Location'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapModal;
