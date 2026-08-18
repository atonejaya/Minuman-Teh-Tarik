# Travel Monitor — Monitoring Perjalanan Sales

## Overview

Halaman baru untuk Owner memantau perjalanan Sales pada hari tertentu. Menampilkan perbandingan rute yang direncanakan (planned route) vs perjalanan aktual (actual GPS track) di peta.

## Route

`/travel-monitor` (Owner-only)

## Data Sources

- **Planned visits**: `get_sales_visit_plan(p_date)` — data kunjungan terencana per tanggal
- **GPS tracks**: `SalesGpsTrack` — jejak GPS aktual sales
- **Visit status**: `SalesVisit` — status check-in/out, waktu, koordinat

## Layout

```
┌─────────────────────────────────────────┐
│ [←] Monitoring Perjalanan               │
├──────────┬──────────────────────────────┤
│ Sales:   │                              │
│ [ANDI ▼] │          PETA                │
│          │                              │
│ Tanggal: │  🟢 Titik Awal               │
│ [18/08]  │    ↓                        │
│          │  🔵 Warung A (completed)     │
│ ─────────│    ↓                        │
│ Rencana: │  🟡 Warung B (in progress)  │
│ 1. Warung A ✓ 08:30-09:15             │
│ 2. Warung B 🟡 09:30                  │
│ 3. Warung C ○ belum                   │
│ 4. Warung D ○ belum                   │
│ ─────────│  🔴 Warung D ○              │
│ GPS:     │    ↓                        │
│ Aktif 🟢 │  ⬛ Titik Akhir             │
│ 5 min lalu                              │
├──────────┴──────────────────────────────┤
│ Status Sales                            │
│ 🟢 Aktif · Terakhir: 5 menit lalu     │
│ Kunjungan: 2/4 · Selesai: 1           │
└─────────────────────────────────────────┘
```

## Map Layers

### Planned Route
- Garis putus-putus biru connecting warung markers (berdasarkan visit_order)
- Warung markers dengan warna berdasarkan status:
  - 🟢 Hijau = COMPLETED
  - 🟡 Kuning = CHECKED_IN / STOCK_COUNTED / DELIVERED
  - ⚪ Abu = PLANNED (belum dikunjungi)
  - 🔴 Merah = CANCELLED

### Actual GPS Trail
- Polylene hijau/oren dari SalesGpsTrack (filter by sales_id + date)
- Titik awal = GPS pertama hari itu
- Titik akhir = GPS terakhir hari itu

### Titik Awal & Akhir
- Titik awal: GPS pertama hari itu (atau check-in pertama coordinates)
- Titik akhir: GPS terakhir hari itu (atau check-out terakhir coordinates)

## SQL Changes

### RPC: `get_travel_monitor(p_sales_id integer, p_date date)`

Returns JSONB with:
- `visits`: array of visits with warung info, status, check_in/out times, coordinates
- `gps_tracks`: array of {latitude, longitude, tracked_at, visit_id}

### Migration File

`20260818_travel_monitor.sql`

## Frontend Components

### `TravelMonitorPage.jsx`
- Sales selector dropdown (fetch all active sales users)
- Date picker (default: today)
- MapContainer with Leaflet
- Side panel: planned visit list + GPS status
- Auto-refresh every 30 seconds

### Dependencies
- Reuse `react-leaflet` (already in package.json)
- Reuse existing patterns from `LiveTrackingPage.jsx`

## Sidebar

Tambah menu "Monitoring Perjalanan" di bawah "Live Tracking" di `sidebarConfig.js`.

## Constraints

- Owner-only access (enforced via RLS + frontend route guard)
- GPS tracking only runs during active visits (5-min interval in VisitWizard)
- SalesVisit is the aggregate root — GPS is monitoring layer only
- No changes to SalesVisit workflow
