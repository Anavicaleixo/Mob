/**
 * PlacesService — Busca pontos de ônibus próximos usando:
 * 1. Google Maps JavaScript API (prioritário)
 * 2. Overpass API (OpenStreetMap) como fallback
 *
 * Raio fixo: 5 km
 */

const FIXED_RADIUS = 5000; // 5 km

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
    if (window.google && window.google.maps && window.google.maps.places) {
      resolve(window.google.maps);
      return;
    }

    const callbackName = `__googleMapsCallback_${Math.random().toString(36).substr(2, 9)}`;
    
    window[callbackName] = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps ou biblioteca Places não carregou corretamente'));
      }
      delete window[callbackName];
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      googleMapsPromise = null;
      reject(new Error('Falha ao carregar Google Maps API'));
      delete window[callbackName];
    };
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

async function fetchViaGoogleMaps(lat, lng) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.log('[PlacesService/Google] Sem chave API, pulando...');
    return null;
  }

  try {
    console.log('[PlacesService/Google] Carregando API com chave:', apiKey.substring(0, 10) + '...');
    const maps = await loadGoogleMapsAPI(apiKey);

    const dummyDiv = document.createElement('div');
    const service = new maps.places.PlacesService(dummyDiv);

    return new Promise((resolve) => {
      // Busca por bus_station e bus_stop
      service.nearbySearch(
        {
          location: new maps.LatLng(lat, lng),
          radius: FIXED_RADIUS,
          types: ['bus_station', 'bus_stop']
        },
        (results, status) => {
          if (status !== maps.places.PlacesServiceStatus.OK || !results) {
            console.log('[PlacesService/Google] Status:', status);
            if (status === 'ZERO_RESULTS') {
              console.log('[PlacesService/Google] Nenhum ponto encontrado pelo Google');
            }
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
                name: place.name || 'Ponto de Ônibus',
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
    return null;
  }
}

// ========================================
// Overpass API (OpenStreetMap) — Fallback
// ========================================
async function fetchViaOverpass(lat, lng) {
  console.log('[Overpass] Buscando pontos próximos a:', lat, lng, 'raio:', FIXED_RADIUS);
  
  const query = `
    [out:json][timeout:15];
    (
      node["highway"="bus_stop"](around:${FIXED_RADIUS},${lat},${lng});
      node["public_transport"="platform"](around:${FIXED_RADIUS},${lat},${lng});
      node["amenity"="bus_station"](around:${FIXED_RADIUS},${lat},${lng});
      way["highway"="bus_stop"](around:${FIXED_RADIUS},${lat},${lng});
    );
    out body;
    >;
    out skel qt;
  `;

  try {
    console.log('[Overpass] Enviando query...');
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
    console.log('[Overpass] Elementos encontrados:', elements.length);

    const processed = elements
      .filter(el => el.lat && el.lon)
      .map((el) => {
        const pLat = el.lat;
        const pLng = el.lon;
        const dist = haversineDistance(lat, lng, pLat, pLng);

        let name = el.tags?.name || '';
        if (!name) {
          const street = el.tags?.['addr:street'] || '';
          const ref = el.tags?.ref || '';
          if (street) {
            name = `Ponto - ${street}`;
          } else if (ref) {
            name = `Ponto ${ref}`;
          } else {
            name = 'Ponto de Ônibus';
          }
        }

        const vicinity = el.tags?.['addr:street'] || el.tags?.operator || '';

        return {
          place_id: `osm-${el.id}`,
          name: name,
          vicinity: vicinity,
          geometry: { location: { lat: pLat, lng: pLng } },
          distToUser: dist,
          source: 'overpass',
        };
      })
      .filter((p) => p.distToUser <= FIXED_RADIUS)
      .sort((a, b) => a.distToUser - b.distToUser)
      .slice(0, 30);

    console.log(
      `[Overpass] ${elements.length} elementos → ${processed.length} pontos dentro de ${FIXED_RADIUS}m`
    );
    return processed;
  } catch (err) {
    console.error('[Overpass] Erro detalhado:', err.message);
    return [];
  }
}

// ========================================
// API pública
// ========================================
export async function fetchNearbyBusStops(lat, lng, radius = FIXED_RADIUS) {
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    console.warn('[PlacesService] Coordenadas inválidas:', lat, lng);
    return [];
  }

  console.log('[PlacesService] Buscando pontos próximos a:', lat, lng, 'raio:', radius);

  // 1. Google Maps API (prioritário)
  const googleResults = await fetchViaGoogleMaps(lat, lng);
  if (googleResults && googleResults.length > 0) {
    console.log('[PlacesService] ✅ Usando resultados do Google Maps:', googleResults.length);
    return googleResults;
  }

  // 2. Overpass API como fallback
  console.log('[PlacesService] Google sem resultados, tentando Overpass...');
  const overpassResults = await fetchViaOverpass(lat, lng);
  if (overpassResults && overpassResults.length > 0) {
    console.log('[PlacesService] ✅ Usando resultados do Overpass:', overpassResults.length);
    return overpassResults;
  }

  // 3. Retorna array vazio
  console.log('[PlacesService] ❌ Nenhum ponto encontrado via APIs externas');
  return [];
}