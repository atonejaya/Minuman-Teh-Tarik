import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { supabase } from '../../../utils/supabase';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createSalesIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="width:24px;height:24px;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const COLORS = ['#005DA4', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

const LiveTrackingPage = () => {
  const [salesmen, setSalesmen] = useState([]);
  const [tracks, setTracks] = useState({});
  const [selectedSales, setSelectedSales] = useState(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const fetchLocations = async () => {
    try {
      const { data: salesUsers } = await supabase
        .from('User')
        .select('id, name')
        .eq('role', 'SALES')
        .eq('is_active', true);

      setSalesmen(salesUsers || []);

      const newTracks = {};
      for (const sales of salesUsers || []) {
        const { data: lastTrack } = await supabase
          .from('SalesGpsTrack')
          .select('latitude, longitude, tracked_at, visit_id')
          .eq('sales_id', sales.id)
          .order('tracked_at', { ascending: false })
          .limit(1)
          .single();

        const { data: history } = await supabase
          .from('SalesGpsTrack')
          .select('latitude, longitude, tracked_at')
          .eq('sales_id', sales.id)
          .gte('tracked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('tracked_at', { ascending: true });

        newTracks[sales.id] = {
          name: sales.name,
          lastPosition: lastTrack ? { lat: lastTrack.latitude, lng: lastTrack.longitude } : null,
          lastSeen: lastTrack?.tracked_at || null,
          history: (history || []).map(t => [t.latitude, t.longitude]),
          isActive: lastTrack ? (Date.now() - new Date(lastTrack.tracked_at).getTime()) < 30 * 60 * 1000 : false,
        };
      }
      setTracks(newTracks);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching locations:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    intervalRef.current = setInterval(fetchLocations, 15000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const center = [-6.2088, 106.8456];

  return (
    <div style={{ height: 'calc(100vh - 64px)' }}>
      <div style={{ padding: '12px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '14px', fontWeight: '600' }}>Live Tracking:</span>
        <button
          onClick={() => setSelectedSales(null)}
          style={{
            padding: '4px 10px', borderRadius: '16px', border: '1px solid var(--border)',
            background: !selectedSales ? 'var(--primary)' : 'var(--surface)',
            color: !selectedSales ? 'white' : 'var(--text)',
            cursor: 'pointer', fontSize: '12px'
          }}
        >
          Semua
        </button>
        {salesmen.map((s, i) => {
          const track = tracks[s.id];
          return (
            <button
              key={s.id}
              onClick={() => setSelectedSales(s.id)}
              style={{
                padding: '4px 10px', borderRadius: '16px', border: '1px solid var(--border)',
                background: selectedSales === s.id ? COLORS[i % COLORS.length] : 'var(--surface)',
                color: selectedSales === s.id ? 'white' : 'var(--text)',
                cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              {track?.isActive && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2ecc71' }} />}
              {s.name}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ height: 'calc(100% - 52px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Memuat data lokasi...
        </div>
      ) : (
        <MapContainer center={center} zoom={12} style={{ height: 'calc(100% - 52px)', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
          {salesmen.map((s, i) => {
            if (selectedSales && selectedSales !== s.id) return null;
            const track = tracks[s.id];
            if (!track?.lastPosition) return null;
            return (
              <React.Fragment key={s.id}>
                <Marker
                  position={[track.lastPosition.lat, track.lastPosition.lng]}
                  icon={createSalesIcon(COLORS[i % COLORS.length])}
                >
                  <Popup>
                    <strong>{track.name}</strong><br />
                    {track.isActive ? '🟢 Aktif' : '⚪ Tidak aktif'}<br />
                    {track.lastSeen && (
                      <>Terakhir: {new Date(track.lastSeen).toLocaleString('id-ID')}</>
                    )}
                  </Popup>
                </Marker>
                {track.history.length > 1 && (
                  <Polyline
                    positions={track.history}
                    color={COLORS[i % COLORS.length]}
                    weight={3}
                    opacity={0.7}
                  />
                )}
              </React.Fragment>
            );
          })}
        </MapContainer>
      )}

      <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'var(--surface)', borderRadius: '8px', padding: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 1000, maxHeight: '200px', overflow: 'auto', minWidth: '200px' }}>
        <h4 style={{ margin: '0 0 8px', fontSize: '13px' }}>Status Sales</h4>
        {salesmen.map((s, i) => {
          const track = tracks[s.id];
          return (
            <div key={s.id} style={{ fontSize: '12px', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                <span style={{ fontWeight: '500' }}>{s.name}</span>
              </div>
              <div style={{ color: 'var(--text-muted)', marginLeft: '16px', fontSize: '11px' }}>
                {track?.isActive ? '🟢 GPS Aktif' : '⚪ Tidak ada sinyal'}
                {track?.lastSeen && <> · {new Date(track.lastSeen).toLocaleTimeString('id-ID')}</>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LiveTrackingPage;
