# 3D Globe Landing Page

A premium landing page prototype built with Vite + React + TypeScript + CesiumJS, featuring a 3D interactive globe with venue markers, tour routes, and realistic 3D buildings.

## Features

- 🌍 **3D Globe Visualization** - Powered by CesiumJS without Cesium Ion
- 🏢 **3D Buildings** - Real building footprints from OpenStreetMap
- 🎯 **Venue Markers** - Interactive markers for tour stops
- 🛣️ **Tour Routes** - Elegant geodesic arcs connecting venues  
- 📱 **Premium UI** - Glass morphism design with cinematic animations
- 🚀 **Performance Optimized** - Efficient rendering and data loading

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Generate data (optional - runs automatically during build)
npm run data:v1              # Generate stops from Excel
npm run data:buildings:v1    # Fetch building footprints
```

## Deployment on Cloudflare Pages

### Recommended Settings

**Cloudflare Pages Configuration:**
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Node.js version:** `20` (recommended)

### Deployment Modes

#### Mode A: Dynamic Build (Recommended)
Generates data during build process on Cloudflare Pages.

**Requirements:**
- Commit `data/Cities, Venues.xlsx` to your repository
- Ensure stable network connectivity during build

**Cloudflare Pages Settings:**
```
Build command: npm run build
Output directory: dist
Environment variables: (none required)
```

The build process will automatically:
1. Generate stops data from Excel file
2. Fetch building footprints from OpenStreetMap
3. Build the application

#### Mode B: Static Build (Network-Free)
Uses pre-generated data artifacts for stable, network-free builds.

**Setup:**
1. Generate data locally:
   ```bash
   npm run data:v1
   npm run data:buildings:v1
   ```

2. Commit generated files:
   ```bash
   git add public/data/
   git commit -m "Add pre-generated data artifacts"
   ```

3. Configure Cloudflare Pages:
   ```
   Build command: npm run build
   Output directory: dist
   Environment variables: SKIP_DATA_GEN=1
   ```

**Benefits:**
- ✅ Faster builds (no data generation)
- ✅ Network-independent builds
- ✅ Consistent results
- ✅ No external API dependencies during build

### Troubleshooting

**Build fails with "Excel file not found":**
- Ensure `data/Cities, Venues.xlsx` is committed to repo
- Or use Mode B with `SKIP_DATA_GEN=1`

**Build fails with "XLSX.readFile is not a function":**
- This has been fixed in the latest version
- Ensure you're using the updated scripts with proper ESM imports

**Build fails during building data fetch:**
- Network connectivity issue with OpenStreetMap
- Use Mode B for reliable builds

**Build timeout:**
- Building data fetch can take 2-3 minutes
- Consider using Mode B for faster builds
- Cloudflare Pages has a 20-minute build timeout (usually sufficient)

## Architecture

- **Frontend:** Vite + React + TypeScript
- **3D Engine:** CesiumJS (tokenless, no Cesium Ion)
- **Imagery:** NASA GIBS (Blue Marble) + OSM (street tiles)
- **Building Data:** OpenStreetMap via Overpass API
- **Deployment:** Cloudflare Pages / Vercel compatible

## Tokenless Mode

This app runs **without Cesium Ion** — no tokens, no Ion API.

**Providers in use:**
- **Terrain:** `EllipsoidTerrainProvider`
- **Imagery (overview):** NASA GIBS Blue Marble
- **Imagery (venue):** OpenStreetMap raster tiles
- **Buildings:** GeoJSON from Overpass API

**Do NOT add:**
- `Cesium.Ion.defaultAccessToken`
- `createWorldTerrain()`
- Ion imagery or 3D tiles
- Any Ion assets

**Dev guardrails:** In development, the app warns in the console if an Ion token is set or if requests hit `api.cesium.com` / `ion.cesium.com`.

## Tokenless Verification Checklist

Before release, verify no Ion usage:

1. Open DevTools → Network tab
2. Filter by `cesium` or search for `ion`
3. Confirm **no** requests to `api.cesium.com` or `ion.cesium.com`
4. Confirm no `access_token` in request URLs
