/**
 * PlacesService — Busca pontos de ônibus próximos usando:
 * 1. Google Maps JavaScript API (se VITE_GOOGLE_MAPS_API_KEY estiver configurada)
 * 2. Overpass API (OpenStreetMap) como fallback gratuito
 *
 * Raio fixo: 2 km
 */

const FIXED_RADIUS = 2000; // 2 km — nunca muda

// ========================================
// Haversine — distância em metros
// ========================================
function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371e3;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ========================================
// Google Maps JavaScript API
// ========================================
let googleMapsPromise = null;

function loadGoogleMapsAPI(apiKey) {
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    // Já carregou antes?
    if (window.google && window.google.maps && window.google.maps.places) {
      resolve(window.google.maps);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps não carregou corretamente'));
      }
    };
    script.onerror = () => {
      googleMapsPromise = null;
      reject(new Error('Falha ao carregar Google Maps API'));
    };
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

async function fetchViaGoogleMaps(lat, lng) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null; // sem chave → vai pro fallback

  try {
    const maps = await loadGoogleMapsAPI(apiKey);

    // PlacesService precisa de um elemento DOM (pode ser invisível)
    const dummyDiv = document.createElement('div');
    const service = new maps.places.PlacesService(dummyDiv);

    return new Promise((resolve) => {
      service.nearbySearch(
        {
          location: new maps.LatLng(lat, lng),
          radius: FIXED_RADIUS,
          type: 'bus_station',
        },
        (results, status) => {
          if (status !== maps.places.PlacesServiceStatus.OK || !results) {
            console.log('[PlacesService/Google] Status:', status);
            resolve([]);
            return;
          }

          const processed = results
            .map((place) => {
              const pLat = place.geometry.location.lat();
              const pLng = place.geometry.location.lng();
              const dist = haversineDistance(lat, lng, pLat, pLng);

              return {
                place_id: place.place_id,
                name: place.name,
                vicinity: place.vicinity || '',
                geometry: { location: { lat: pLat, lng: pLng } },
                distToUser: dist,
                source: 'google',
              };
            })
            .filter((p) => p.distToUser <= FIXED_RADIUS)
            .sort((a, b) => a.distToUser - b.distToUser);

          console.log(
            `[PlacesService/Google] ${results.length} resultados → ${processed.length} dentro de ${FIXED_RADIUS}m`
          );
          resolve(processed);
        }
      );
    });
  } catch (err) {
    console.warn('[PlacesService/Google] Erro:', err.message);
    return null; // fallback
  }
}

// ========================================
// Overpass API (OpenStreetMap) — Fallback gratuito
// ========================================
async function fetchViaOverpass(lat, lng) {
  // Busca nós com tag highway=bus_stop OU public_transport=platform dentro do raio
  const query = `
    [out:json][timeout:10];
    (
      node["highway"="bus_stop"](around:${FIXED_RADIUS},${lat},${lng});
      node["public_transport"="platform"](around:${FIXED_RADIUS},${lat},${lng});
      node["amenity"="bus_station"](around:${FIXED_RADIUS},${lat},${lng});
    );
    out body;
  `;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const elements = data.elements || [];

    const processed = elements
      .map((el) => {
        const pLat = el.lat;
        const pLng = el.lon;
        const dist = haversineDistance(lat, lng, pLat, pLng);
        const name =
          el.tags?.name ||
          el.tags?.description ||
          el.tags?.ref ||
          `Ponto de ônibus #${el.id}`;

        return {
          place_id: `osm-${el.id}`,
          name,
          vicinity: el.tags?.['addr:street'] || el.tags?.operator || '',
          geometry: { location: { lat: pLat, lng: pLng } },
          distToUser: dist,
          source: 'overpass',
        };
      })
      .filter((p) => p.distToUser <= FIXED_RADIUS)
      .sort((a, b) => a.distToUser - b.distToUser);

    console.log(
      `[PlacesService/Overpass] ${elements.length} resultados → ${processed.length} dentro de ${FIXED_RADIUS}m`
    );
    return processed;
  } catch (err) {
    console.error('[PlacesService/Overpass] Erro:', err.message);
    return [];
  }
}

// ========================================
// API pública — tenta Google Maps, fallback para Overpass
// ========================================
export async function fetchNearbyBusStops(lat, lng, radius = FIXED_RADIUS) {
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    console.warn('[PlacesService] Coordenadas inválidas:', lat, lng);
    return [];
  }

  // 1. Tenta Google Maps JavaScript API
  const googleResults = await fetchViaGoogleMaps(lat, lng);
  if (googleResults !== null && googleResults.length > 0) {
    return googleResults;
  }

  // 2. Fallback: Overpass API (OpenStreetMap) — gratuito, sem chave
  console.log('[PlacesService] Usando Overpass API (OpenStreetMap) como fallback...');
  const overpassResults = await fetchViaOverpass(lat, lng);
  if (overpassResults.length > 0) {
    return overpassResults;
  }

  // 3. Nenhum resultado de nenhuma API
  console.log('[PlacesService] Nenhum ponto de ônibus encontrado dentro de 2km');
  return [];
}
