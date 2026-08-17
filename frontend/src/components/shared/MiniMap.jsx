import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const MiniMap = ({ latitude, longitude, label, height = 200 }) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!lat || !lng || (lat === 0 && lng === 0)) {
    return (
      <div style={{
        height,
        background: 'var(--background)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontSize: '13px',
        border: '1px dashed var(--border)'
      }}>
        Lokasi GPS tidak tersedia
      </div>
    );
  }

  const position = [lat, lng];

  return (
    <MapContainer
      center={position}
      zoom={15}
      style={{ height, width: '100%', borderRadius: '8px' }}
      scrollWheelZoom={false}
      dragging={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <Marker position={position}>
        {label && <Popup>{label}</Popup>}
      </Marker>
    </MapContainer>
  );
};

export default MiniMap;
