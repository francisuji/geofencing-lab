// geo.js - Geometry helpers. PROVIDED: you do not need to change this file.
// Geofencing lab - Erasmus Mundus Master in Geospatial Technologies.

const EARTH_R = 6371000; // mean Earth radius (m)
const toRad = (deg) => (deg * Math.PI) / 180;

/** Great-circle (haversine) distance between two WGS84 points, in metres. */
function distanceMeters(lat1, lon1, lat2, lon2) {
  const p1 = toRad(lat1), p2 = toRad(lat2);
  const dp = p2 - p1, dl = toRad(lon2 - lon1);
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(a));
}

/** Ray-casting point-in-polygon test. ring = [[lat, lon], ...]. */
function pointInPolygon(lat, lon, ring) {
  const k = Math.cos(toRad(lat));               // scale longitudes at this latitude
  const x = lon * k, y = lat;
  let inside = false;
  for (let i = 0, n = ring.length; i < n; i++) {
    const x1 = ring[i][1] * k, y1 = ring[i][0];
    const x2 = ring[(i + 1) % n][1] * k, y2 = ring[(i + 1) % n][0];
    if ((y1 > y) !== (y2 > y) && x < x1 + ((y - y1) * (x2 - x1)) / (y2 - y1)) inside = !inside;
  }
  return inside;
}

/**
 * Is the point (lat, lon) inside this fence?  Works for circles and polygons.
 * USE THIS FUNCTION IN STEP 2.
 */
function isInsideFence(fence, lat, lon) {
  if (fence.kind === "circle") {
    return distanceMeters(lat, lon, fence.center[0], fence.center[1]) <= fence.radius_m;
  }
  return pointInPolygon(lat, lon, fence.ring);
}

/** GeoJSON FeatureCollection -> simple fence objects with [lat, lon] coordinates. */
function loadFences(geojson) {
  return geojson.features.map((f) => {
    const p = f.properties, g = f.geometry;
    const fence = { id: p.id, kind: p.kind, restricted: !!p.restricted, inside: false, count: 0 };
    if (g.type === "Point") {
      fence.center = [g.coordinates[1], g.coordinates[0]];     // GeoJSON is [lon, lat]!
      fence.radius_m = p.radius_m;
    } else {
      fence.ring = g.coordinates[0].slice(0, -1).map(([lon, lat]) => [lat, lon]);
    }
    return fence;
  });
}

if (typeof module !== "undefined") {
  module.exports = { distanceMeters, pointInPolygon, isInsideFence, loadFences };
}
