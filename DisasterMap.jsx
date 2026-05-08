import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
});

// Custom icons for different disaster types
const disasterIcons = {
  earthquake: L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }),
  wildfire: L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }),
  storm: L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }),
  volcano: L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }),
  default: L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }),
};

export default function DisasterMap() {
  const [events, setEvents] = useState([]);
  const [earthquakes, setEarthquakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDisasterData();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchDisasterData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDisasterData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch NASA EONET data (global events)
      const eonetRes = await axios.get('https://eonet.gsfc.nasa.gov/api/v3/events', {
        params: { limit: 100 }
      });
      setEvents(eonetRes.data.events || []);

      // Fetch USGS Earthquake data
      const earthquakeRes = await axios.get('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
      setEarthquakes(earthquakeRes.data.features || []);

      setLoading(false);
    } catch (err) {
      console.error('Error fetching disaster data:', err);
      setError('Failed to load disaster data. Please try again later.');
      setLoading(false);
    }
  };

  const getDisasterType = (event) => {
    const categories = event.categories || [];
    const category = categories[0]?.title?.toLowerCase() || 'unknown';
    
    if (category.includes('earthquake')) return 'earthquake';
    if (category.includes('fire') || category.includes('wildfire')) return 'wildfire';
    if (category.includes('storm') || category.includes('cyclone') || category.includes('hurricane')) return 'storm';
    if (category.includes('volcano')) return 'volcano';
    return 'default';
  };

  const getEarthquakeMagnitude = (earthquake) => {
    return earthquake.properties?.mag || 0;
  };

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px 20px', backgroundColor: '#f0f0f0', borderBottom: '2px solid #333' }}>
        <h1>🌍 Real-Time Global Disaster Map</h1>
        {loading && <p>Loading disaster data...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <p>Total Events: {events.length + earthquakes.length}</p>
      </div>

      <MapContainer 
        center={[20, 0]} 
        zoom={2} 
        style={{ flex: 1, width: '100%' }}
        maxBounds={[[-90, -180], [90, 180]]}
      >
        <TileLayer
          attribution='© OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* NASA EONET Events */}
        {events.map((event) =>
          event.geometries?.map((geo, idx) => (
            <Marker
              key={`eonet-${event.id}-${idx}`}
              position={[geo.coordinates[1], geo.coordinates[0]]}
              icon={disasterIcons[getDisasterType(event)]}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <strong>{event.title}</strong>
                  <br />
                  <small>{event.description}</small>
                  <br />
                  <br />
                  <strong>Categories:</strong>
                  {event.categories?.map((cat) => (
                    <div key={cat.id}>{cat.title}</div>
                  ))}
                  <br />
                  <small>Updated: {new Date(event.updated).toLocaleString()}</small>
                </div>
              </Popup>
            </Marker>
          ))
        )}

        {/* USGS Earthquakes */}
        {earthquakes.map((earthquake, idx) => {
          const magnitude = getEarthquakeMagnitude(earthquake);
          const [lon, lat] = earthquake.geometry.coordinates;
          const radius = Math.max(5, magnitude * 3); // Size based on magnitude

          return (
            <CircleMarker
              key={`earthquake-${idx}`}
              center={[lat, lon]}
              radius={radius}
              fillColor="red"
              color="darkred"
              weight={2}
              opacity={0.8}
              fillOpacity={0.5}
            >
              <Popup>
                <div>
                  <strong>Earthquake</strong>
                  <br />
                  <strong>Magnitude:</strong> {magnitude}
                  <br />
                  <strong>Location:</strong> {earthquake.properties.place}
                  <br />
                  <strong>Time:</strong> {new Date(earthquake.properties.time).toLocaleString()}
                  <br />
                  <a href={earthquake.properties.url} target="_blank" rel="noopener noreferrer">
                    More details
                  </a>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div style={{ padding: '10px 20px', backgroundColor: '#f9f9f9', fontSize: '12px', borderTop: '1px solid #ddd' }}>
        <strong>Legend:</strong> 🔴 Earthquakes | 🟠 Wildfires | 🔵 Storms | 🟡 Volcanoes | ⚫ Other Events
      </div>
    </div>
  );
}