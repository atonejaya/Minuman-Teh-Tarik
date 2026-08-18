# Travel Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Travel Monitor page for Owner to view planned vs actual sales route on a map for a specific salesperson and date.

**Architecture:** New RPC function `get_travel_monitor` returns visit plan + GPS tracks. New React page `TravelMonitorPage.jsx` renders a Leaflet map with planned route (dashed blue line + colored markers) and actual GPS trail (polyline). Route registered in App.jsx, sidebar entry added.

**Tech Stack:** React 19, Leaflet/react-leaflet, Supabase RPC, Vite 8

## Global Constraints

- Owner-only access (route inside `<RequireRole roles={['OWNER', 'ADMIN']} />`)
- GPS tracking only runs during active visits (5-min interval in VisitWizard)
- SalesVisit is aggregate root — GPS is monitoring layer only
- Indonesian UI text throughout
- Inline styles with CSS variables (`var(--surface)`, `var(--border)`, etc.)
- Lazy loading for page components

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/20260818_travel_monitor.sql` | Create | RPC function `get_travel_monitor` |
| `frontend/src/modules/visits/pages/TravelMonitorPage.jsx` | Create | Main page component |
| `frontend/src/App.jsx` | Modify | Add route + lazy import |
| `frontend/src/layouts/sidebarConfig.js` | Modify | Add menu item |

---

### Task 1: SQL Migration — `get_travel_monitor` RPC

**Files:**
- Create: `supabase/migrations/20260818_travel_monitor.sql`

**Interfaces:**
- Consumes: `SalesVisit`, `Warung`, `SalesGpsTrack`, `User` tables
- Produces: `get_travel_monitor(p_sales_id integer, p_date date)` → JSONB

- [ ] **Step 1: Create migration file**

```sql
-- Travel Monitor: fetch planned visits + GPS tracks for a salesperson on a date
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.get_travel_monitor(
  p_sales_id integer,
  p_date date
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'visits', (
      SELECT coalesce(jsonb_agg(row_to_json(v)), '[]'::jsonb)
      FROM (
        SELECT
          sv.id,
          sv.status,
          sv.visit_order,
          sv.check_in_time,
          sv.check_out_time,
          sv.check_in_latitude,
          sv.check_in_longitude,
          sv.check_out_latitude,
          sv.check_out_longitude,
          w.id AS warung_id,
          w.name AS warung_name,
          w.code AS warung_code,
          w.address AS warung_address,
          w.latitude AS warung_latitude,
          w.longitude AS warung_longitude
        FROM public."SalesVisit" sv
        JOIN public."Warung" w ON w.id = sv.warung_id
        WHERE sv.sales_id = p_sales_id
          AND sv.visit_date = p_date
        ORDER BY sv.visit_order ASC NULLS LAST, sv.id ASC
      ) v
    ),
    'gps_tracks', (
      SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT
          g.latitude,
          g.longitude,
          g.tracked_at,
          g.visit_id
        FROM public."SalesGpsTrack" g
        WHERE g.sales_id = p_sales_id
          AND g.tracked_at >= p_date::timestamptz
          AND g.tracked_at < (p_date + interval '1 day')::timestamptz
        ORDER BY g.tracked_at ASC
      ) t
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_travel_monitor(integer, date) TO authenticated;
```

- [ ] **Step 2: Run migration in Supabase SQL Editor**

Copy the SQL above into Supabase SQL Editor and execute. Verify no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260818_travel_monitor.sql
git commit -m "feat: add get_travel_monitor RPC function"
```

---

### Task 2: TravelMonitorPage Component

**Files:**
- Create: `frontend/src/modules/visits/pages/TravelMonitorPage.jsx`

**Interfaces:**
- Consumes: `get_travel_monitor` RPC via supabase client
- Produces: Full-page component with map + side panel

- [ ] **Step 1: Create TravelMonitorPage.jsx**

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Navigation, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../../../utils/supabase';

const STATUS_COLORS = {
  COMPLETED: '#22c55e',
  DELIVERED: '#eab308',
  STOCK_COUNTED: '#f59e0b',
  CHECKED_IN: '#f59e0b',
  PLANNED: '#9ca3af',
  CANCELLED: '#ef4444',
};

const STATUS_LABELS = {
  COMPLETED: 'Selesai',
  DELIVERED: 'Diantar',
  STOCK_COUNTED: 'Stok Dihitung',
  CHECKED_IN: 'Check-in',
  PLANNED: 'Direncanakan',
  CANCELLED: 'Dibatalkan',
};

function createIcon(color) {
  return L.divIcon({
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
    html: `<div style="
      width:24px;height:24px;border-radius:50%;
      background:${color};border:3px solid white;
      box-shadow:0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
  });
}

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [bounds, map]);
  return null;
}

function formatDate(d) {
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(t) {
  if (!t) return '-';
  return new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export default function TravelMonitorPage() {
  const navigate = useNavigate();
  const [salesList, setSalesList] = useState([]);
  const [selectedSales, setSelectedSales] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [visits, setVisits] = useState([]);
  const [gpsTracks, setGpsTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    supabase
      .from('User')
      .select('id, name')
      .eq('role', 'SALES')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        setSalesList(data || []);
        if (data?.length && !selectedSales) setSelectedSales(String(data[0].id));
      });
  }, []);

  const fetchData = async () => {
    if (!selectedSales || !selectedDate) return;
    setLoading(true);
    const { data } = await supabase.rpc('get_travel_monitor', {
      p_sales_id: Number(selectedSales),
      p_date: selectedDate,
    });
    setVisits(data?.visits || []);
    setGpsTracks(data?.gps_tracks || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchData, 30000);
    return () => clearInterval(intervalRef.current);
  }, [selectedSales, selectedDate]);

  const center = visits.length
    ? [visits[0].warung_latitude || -6.2088, visits[0].warung_longitude || 106.8456]
    : [-6.2088, 106.8456];

  const bounds = [];
  visits.forEach((v) => {
    if (v.warung_latitude && v.warung_longitude) bounds.push([v.warung_latitude, v.warung_longitude]);
  });
  gpsTracks.forEach((t) => {
    if (t.latitude && t.longitude) bounds.push([t.latitude, t.longitude]);
  });

  const plannedRoute = visits
    .filter((v) => v.warung_latitude && v.warung_longitude)
    .map((v) => [v.warung_latitude, v.warung_longitude]);

  const actualTrail = gpsTracks
    .filter((t) => t.latitude && t.longitude)
    .map((t) => [t.latitude, t.longitude]);

  const completedCount = visits.filter((v) => v.status === 'COMPLETED').length;
  const lastTrack = gpsTracks.length ? gpsTracks[gpsTracks.length - 1] : null;
  const isActive = lastTrack && (Date.now() - new Date(lastTrack.tracked_at).getTime()) < 30 * 60 * 1000;

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>
          <ArrowLeft size={20} />
        </button>
        <h3 style={{ margin: 0, fontSize: '16px' }}>Monitoring Perjalanan</h3>
        <select
          value={selectedSales}
          onChange={(e) => setSelectedSales(e.target.value)}
          style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '14px' }}
        >
          {salesList.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '14px' }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Side Panel */}
        <div style={{ width: '300px', background: 'var(--surface)', borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '12px', flexShrink: 0 }}>
          {/* GPS Status */}
          <div style={{ marginBottom: '16px', padding: '10px', borderRadius: '8px', background: isActive ? '#f0fdf4' : '#fef2f2', border: `1px solid ${isActive ? '#bbf7d0' : '#fecaca'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: isActive ? '#22c55e' : '#ef4444' }} />
              {isActive ? 'Aktif' : 'Tidak Aktif'}
              {lastTrack && <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '12px' }}>
                · {formatTime(lastTrack.tracked_at)}
              </span>}
            </div>
          </div>

          {/* Summary */}
          <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Kunjungan: {completedCount}/{visits.length} selesai · GPS: {gpsTracks.length} titik
          </div>

          {/* Visit List */}
          <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600 }}>Rencana Kunjungan</h4>
          {visits.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Tidak ada data</p>}
          {visits.map((v, i) => (
            <div key={v.id} style={{
              padding: '10px', marginBottom: '8px', borderRadius: '8px',
              border: `2px solid ${STATUS_COLORS[v.status] || '#e5e7eb'}`,
              background: 'var(--background, #fff)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, color: '#fff',
                  background: STATUS_COLORS[v.status] || '#9ca3af',
                }}>
                  {i + 1}
                </span>
                <span style={{ fontWeight: 600, fontSize: '13px' }}>{v.warung_name}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '26px' }}>
                <div>{v.warung_address}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <span style={{ color: STATUS_COLORS[v.status], fontWeight: 500 }}>
                    {STATUS_LABELS[v.status] || v.status}
                  </span>
                  {v.check_in_time && <span>→ {formatTime(v.check_out_time)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          {loading && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1000, background: 'var(--surface)', padding: '8px 16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
              Memuat...
            </div>
          )}
          <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            {bounds.length >= 2 && <FitBounds bounds={bounds} />}

            {/* Planned route — dashed blue line */}
            {plannedRoute.length >= 2 && (
              <Polyline positions={plannedRoute} pathOptions={{ color: '#3b82f6', dashArray: '8 8', weight: 3, opacity: 0.7 }} />
            )}

            {/* Actual GPS trail — solid green line */}
            {actualTrail.length >= 2 && (
              <Polyline positions={actualTrail} pathOptions={{ color: '#22c55e', weight: 3, opacity: 0.8 }} />
            )}

            {/* Warung markers */}
            {visits.map((v, i) => {
              if (!v.warung_latitude || !v.warung_longitude) return null;
              return (
                <Marker
                  key={v.id}
                  position={[v.warung_latitude, v.warung_longitude]}
                  icon={createIcon(STATUS_COLORS[v.status] || '#9ca3af')}
                >
                  <Popup>
                    <div style={{ fontSize: '13px' }}>
                      <strong>{v.warung_name}</strong><br />
                      {v.warung_code} · {v.warung_address}<br />
                      Status: <span style={{ color: STATUS_COLORS[v.status] }}>{STATUS_LABELS[v.status]}</span><br />
                      {v.check_in_time && `Check-in: ${formatTime(v.check_in_time)}`}<br />
                      {v.check_out_time && `Check-out: ${formatTime(v.check_out_time)}`}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* GPS track markers (first & last) */}
            {actualTrail.length > 0 && (
              <>
                <Marker
                  position={actualTrail[0]}
                  icon={L.divIcon({
                    className: '',
                    iconSize: [16, 16],
                    iconAnchor: [8, 8],
                    html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
                  })}
                >
                  <Popup><div style={{ fontSize: '12px' }}>Titik Awal · {formatTime(gpsTracks[0]?.tracked_at)}</div></Popup>
                </Marker>
                <Marker
                  position={actualTrail[actualTrail.length - 1]}
                  icon={L.divIcon({
                    className: '',
                    iconSize: [16, 16],
                    iconAnchor: [8, 8],
                    html: `<div style="width:16px;height:16px;border-radius:50%;background:#ef4444;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
                  })}
                >
                  <Popup><div style={{ fontSize: '12px' }}>Titik Akhir · {formatTime(lastTrack?.tracked_at)}</div></Popup>
                </Marker>
              </>
            )}
          </MapContainer>

          {/* Legend */}
          <div style={{ position: 'absolute', bottom: '16px', right: '16px', zIndex: 1000, background: 'var(--surface)', padding: '10px 14px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ width: 20, height: 3, background: '#3b82f6', display: 'inline-block' }} /> Rute Rencana
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 20, height: 3, background: '#22c55e', display: 'inline-block' }} /> Jejak GPS Aktual
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify component compiles**

Run: `cd frontend && npm run build`
Expected: Build succeeds (may have chunk size warning, that's fine)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/modules/visits/pages/TravelMonitorPage.jsx
git commit -m "feat: add TravelMonitorPage component"
```

---

### Task 3: Register Route in App.jsx

**Files:**
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `TravelMonitorPage` component (default export)
- Produces: Route `/travel-monitor` available at `/travel-monitor`

- [ ] **Step 1: Add lazy import**

Find the existing lazy imports section in `App.jsx`. Add after the `LiveTrackingPage` import:

```jsx
const TravelMonitorPage = lazy(() => import('./modules/visits/pages/TravelMonitorPage.jsx'));
```

- [ ] **Step 2: Add route**

Find the `<Route path="live-tracking" ...>` line inside the `<Route element={<RequireRole roles={['OWNER', 'ADMIN']} />}>` block. Add after it:

```jsx
<Route path="travel-monitor" element={<TravelMonitorPage />} />
```

- [ ] **Step 3: Verify route works**

Run: `cd frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: register /travel-monitor route"
```

---

### Task 4: Add Sidebar Menu Entry

**Files:**
- Modify: `frontend/src/layouts/sidebarConfig.js`

**Interfaces:**
- Consumes: `Route` icon from lucide-react
- Produces: Menu item visible in sidebar under "Operasional"

- [ ] **Step 1: Add menu item**

Find the `children` array inside the `operasional` group. Add after the `live-tracking` item:

```js
{ to: '/travel-monitor', label: 'Monitoring Perjalanan', icon: Route },
```

Make sure `Route` is imported from `lucide-react` at the top of the file. If not, add it to the existing import.

- [ ] **Step 2: Verify sidebar shows the new item**

Run: `cd frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/layouts/sidebarConfig.js
git commit -m "feat: add Monitoring Perjalanan to sidebar"
```

---

### Task 5: Build, Deploy, and Verify

**Files:** None (deployment step)

- [ ] **Step 1: Build production**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Deploy to Cloudflare Workers**

Run: `npx wrangler deploy`
Expected: Deployed to https://operasional.atonejaya.workers.dev

- [ ] **Step 3: Run migration in Supabase SQL Editor**

Copy the SQL from Task 1 into Supabase SQL Editor and execute.

- [ ] **Step 4: Test in browser**

Navigate to https://operasional.atonejaya.workers.dev/travel-monitor
- Select a salesperson
- Select today's date
- Verify map shows planned visits as colored markers
- Verify GPS trail (if any) shows as green polyline
- Verify dashed blue line connects planned route
- Verify side panel shows visit list with status

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: Travel Monitor — monitoring perjalanan sales (planned vs actual)"
```
