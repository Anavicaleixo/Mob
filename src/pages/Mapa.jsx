import React, { useEffect, useState, useCallback, Component, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { 
  Flag, Map as MapIcon, AlertTriangle, Star, Search, MapPin, 
  Navigation, Clock, DollarSign, ArrowRight, X, ChevronRight, 
  Locate, Route, Menu, RefreshCw, Play, ArrowLeftRight, Bus, Activity,
  MessageSquare, Plus, Umbrella, Accessibility, Armchair, Info, PlayCircle, CheckCircle, Bell, Heart, MessageCircle, ThumbsDown, Minus
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../services/storage';
import { fetchNearbyBusStops } from '../services/placesService';
import { trafficService } from '../services/trafficService';
import Swal from 'sweetalert2';
import styles from './Mapa.module.css';

if (typeof window !== 'undefined') {
  window.L = L;
}

// Fix leaflet icon in Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// ============================================
// DADOS DOS PONTOS (20 pontos de Caçapava)
// ============================================
const stopsData = [
  { id: 1, name: "Terminal Padre Marcelo", lines: ["01", "04", "06", "08", "10"], location: "Centro", coverage: true, bench: true, accessible: true, lat: -23.0992, lng: -45.7085 },
  { id: 2, name: "Terminal Centro", lines: ["01", "05", "07", "09", "10", "13"], location: "Centro", coverage: true, bench: true, accessible: true, lat: -23.1015, lng: -45.7078 },
  { id: 3, name: "Rodoviária de Caçapava", lines: ["04", "06", "08", "10", "13"], location: "Centro", coverage: true, bench: false, accessible: true, lat: -23.0988, lng: -45.7062 },
  { id: 4, name: "Vila Velha I", lines: ["01", "07"], location: "Vila Velha", coverage: false, bench: false, accessible: false, lat: -23.0850, lng: -45.7200 },
  { id: 5, name: "Vila Velha II (Germana)", lines: ["01", "07"], location: "Vila Velha", coverage: false, bench: true, accessible: false, lat: -23.0835, lng: -45.7220 },
  { id: 6, name: "Boa Vista", lines: ["04", "05"], location: "Boa Vista", coverage: true, bench: false, accessible: false, lat: -23.1150, lng: -45.6900 },
  { id: 7, name: "Aldeias da Serra", lines: ["04", "05"], location: "Aldeias da Serra", coverage: false, bench: false, accessible: false, lat: -23.1200, lng: -45.6800 },
  { id: 8, name: "Guadalupe", lines: ["05", "13"], location: "Guadalupe", coverage: false, bench: false, accessible: false, lat: -23.0900, lng: -45.7300 },
  { id: 9, name: "Vila Galvão", lines: ["05", "13"], location: "Vila Galvão", coverage: false, bench: true, accessible: false, lat: -23.0880, lng: -45.7350 },
  { id: 10, name: "Pinus", lines: ["06", "09"], location: "Pinus", coverage: false, bench: false, accessible: false, lat: -23.0855, lng: -45.6980 },
  { id: 11, name: "Eldorado", lines: ["06", "09"], location: "Eldorado", coverage: false, bench: false, accessible: false, lat: -23.0950, lng: -45.6950 },
  { id: 12, name: "Centro de Especialidades", lines: ["07", "08", "10"], location: "Centro", coverage: true, bench: true, accessible: true, lat: -23.1050, lng: -45.7100 },
  { id: 13, name: "Bairro Tataúba", lines: ["07", "08"], location: "Tataúba", coverage: false, bench: false, accessible: false, lat: -23.1300, lng: -45.7200 },
  { id: 14, name: "Tijuco Preto", lines: ["08", "04"], location: "Tijuco Preto", coverage: false, bench: false, accessible: false, lat: -23.1400, lng: -45.7300 },
  { id: 15, name: "Jardim Panorama", lines: ["08", "06"], location: "Jardim Panorama", coverage: true, bench: false, accessible: false, lat: -23.1080, lng: -45.7150 },
  { id: 16, name: "Nova Caçapava / Vitória Vale", lines: ["09", "01"], location: "Nova Caçapava", coverage: false, bench: false, accessible: false, lat: -23.1120, lng: -45.7250 },
  { id: 17, name: "Terras do Vale", lines: ["10", "13"], location: "Terras do Vale", coverage: false, bench: false, accessible: false, lat: -23.1180, lng: -45.7180 },
  { id: 18, name: "Eugênio de Melo", lines: ["10", "05"], location: "Eugênio de Melo", coverage: true, bench: true, accessible: true, lat: -23.1250, lng: -45.7220 },
  { id: 19, name: "Marambaia", lines: ["13", "04"], location: "Marambaia", coverage: false, bench: false, accessible: false, lat: -23.0800, lng: -45.7400 },
  { id: 20, name: "Santa Luzia II", lines: ["13", "07"], location: "Santa Luzia", coverage: false, bench: true, accessible: false, lat: -23.0750, lng: -45.7380 }
];

// Alertas em tempo real removidos - agora vêm do banco via storage.getReports()


// Simple Error Boundary
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div style={{ padding: '20px', color: 'red' }}>Erro ao carregar mapa.</div>;
    return this.props.children;
  }
}

// getDistance removida daqui e movida para dentro do componente para maior precisão e reatividade.

function MapFitter({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions && Array.isArray(positions) && positions.length > 0) {
      try {
        const valid = positions.filter(p => Array.isArray(p) && p.length >= 2 && !isNaN(p[0]) && !isNaN(p[1]));
        if (valid.length > 0) map.fitBounds(valid, { padding: [30, 30] });
      } catch (e) { console.error("fitBounds error:", e); }
    }
  }, [positions, map]);
  return null;
}

// Componente para gerenciar a rota no Leaflet
function RoutingMachine({ origin, destination, onRouteFound }) {
  const map = useMap();
  const routingControlRef = useRef(null);

  useEffect(() => {
    if (!map || !origin || !destination) return;

    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
    }

    routingControlRef.current = L.Routing.control({
      waypoints: [
        L.latLng(origin.lat, origin.lng),
        L.latLng(destination.lat, destination.lng)
      ],
      routeWhileDragging: false,
      showAlternatives: false,
      fitSelectedRoutes: true,
      lineOptions: {
        styles: [{ color: '#16a34a', weight: 6, opacity: 0.8 }]
      },
      createMarker: () => null, // Não cria marcadores padrão do routing
      show: false // Esconde o painel de texto do routing
    }).addTo(map);

    return () => {
      if (routingControlRef.current && map) {
        try {
          map.removeControl(routingControlRef.current);
        } catch (e) {
          console.warn("Erro ao remover controle de rota:", e);
        }
      }
    };
  }, [map, origin, destination]);

  return null;
}

// Componente interno para seguir o ônibus rastreado
const MapFollower = ({ trackedBusId, liveBuses }) => {
  const map = useMap();
  
  useEffect(() => {
    if (trackedBusId && liveBuses.length > 0) {
      const bus = liveBuses.find(b => b.id === trackedBusId);
      if (bus) {
        map.setView([bus.lat, bus.lng], map.getZoom());
      }
    }
  }, [liveBuses, trackedBusId, map]);
  
  return null;
};

export default function Mapa() {
  const navigate = useNavigate();
  const [zoomLevel, setZoomLevel] = useState(14);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStops, setFilteredStops] = useState([]);
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const [activeTab, setActiveTab] = useState('departures'); // 'departures', 'journey', 'nearby'
  const [selectedStop, setSelectedStop] = useState(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportType, setReportType] = useState('warning');
  const [reportDescription, setReportDescription] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [liveBuses, setLiveBuses] = useState([]);
  const [stopReports, setStopReports] = useState([]);
  const [loadingStopReports, setLoadingStopReports] = useState(false);
  const [reportStats, setReportStats] = useState({});
  const [activeReplyReportId, setActiveReplyReportId] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [reportReplies, setReportReplies] = useState({}); // reportId -> replies[]
  const [allReports, setAllReports] = useState([]); // Todos os relatos para o mapa
  const [loadingAllReports, setLoadingAllReports] = useState(false);

  const handleLike = async (reportId, authorUserId) => {
    if (!user) return Swal.fire({ icon: 'info', title: 'Login necessário', text: 'Faça login para curtir relatos!', confirmButtonColor: '#10b981' });
    try {
      const { action } = await storage.toggleLike(reportId, user.id, authorUserId);
      
      setReportStats(prev => {
        const stats = prev[reportId] || {};
        const isLikedNew = action === 'added';
        const isDislikedNew = isLikedNew ? false : (stats.isDisliked || false);
        
        let dislikesCount = stats.dislikes || 0;
        if (isLikedNew && stats.isDisliked) {
          dislikesCount = Math.max(0, dislikesCount - 1);
        }
        
        let likesCount = stats.likes || 0;
        if (isLikedNew) {
          likesCount += 1;
        } else {
          likesCount = Math.max(0, likesCount - 1);
        }

        return {
          ...prev,
          [reportId]: {
            ...stats,
            likes: likesCount,
            dislikes: dislikesCount,
            isLiked: isLikedNew,
            isDisliked: isDislikedNew
          }
        };
      });

      if (action === 'added') {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Você curtiu o relato! +2 MobPontos para o autor',
          showConfirmButton: false,
          timer: 2000
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDislike = async (reportId) => {
    if (!user) return Swal.fire({ icon: 'info', title: 'Login necessário', text: 'Faça login para descurtir relatos!', confirmButtonColor: '#10b981' });
    try {
      const { action } = await storage.toggleDislike(reportId, user.id);
      
      setReportStats(prev => {
        const stats = prev[reportId] || {};
        const isDislikedNew = action === 'added';
        const isLikedNew = isDislikedNew ? false : (stats.isLiked || false);
        
        let likesCount = stats.likes || 0;
        if (isDislikedNew && stats.isLiked) {
          likesCount = Math.max(0, likesCount - 1);
        }
        
        let dislikesCount = stats.dislikes || 0;
        if (isDislikedNew) {
          dislikesCount += 1;
        } else {
          dislikesCount = Math.max(0, dislikesCount - 1);
        }

        return {
          ...prev,
          [reportId]: {
            ...stats,
            likes: likesCount,
            dislikes: dislikesCount,
            isLiked: isLikedNew,
            isDisliked: isDislikedNew
          }
        };
      });

      if (action === 'added') {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Você marcou o relato como não útil!',
          showConfirmButton: false,
          timer: 2000
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadReplies = async (reportId) => {
    try {
      const replies = await storage.getReplies(reportId);
      setReportReplies(prev => ({ ...prev, [reportId]: replies }));
      setActiveReplyReportId(reportId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReplySubmit = async (reportId) => {
    if (!user) return Swal.fire({ icon: 'info', title: 'Login necessário', text: 'Faça login para responder!', confirmButtonColor: '#10b981' });
    if (!replyContent.trim()) return;

    try {
      const newReply = await storage.addReply(reportId, user.id, user.email.split('@')[0], replyContent);
      setReportReplies(prev => ({
        ...prev,
        [reportId]: [...(prev[reportId] || []), newReply]
      }));
      setReplyContent('');
      
      // Atualiza contador
      setReportStats(prev => ({
        ...prev,
        [reportId]: { ...prev[reportId], replies: (prev[reportId]?.replies || 0) + 1 }
      }));
      
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Resposta enviada!',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      console.error(err);
    }
  };
  const mapRef = useRef(null);
  const { user } = useAuth();
  const location = useLocation();
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Verificar se viemos da página de Perfil querendo ver apenas favoritos
  useEffect(() => {
    if (location.state?.filterFavorites) {
      setShowOnlyFavorites(true);
      // Limpa o estado para não ficar preso ao recarregar
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Carregar relatos do ponto selecionado
  useEffect(() => {
    if (selectedStop) {
      async function loadStopReports() {
        setLoadingStopReports(true);
        try {
          const reports = await storage.getReportsByStop(selectedStop.id?.toString());
          setStopReports(reports);
          
          // Carregar estatísticas (curtidas e respostas) para cada relato
          const stats = {};
          await Promise.all(reports.map(async (r) => {
            const s = await storage.getReportStats(r.id, user?.id);
            stats[r.id] = s;
          }));
          setReportStats(stats);
        } catch (err) {
          console.error("Erro ao carregar relatos do ponto:", err);
        } finally {
          setLoadingStopReports(false);
        }
      }
      loadStopReports();
    } else {
      setStopReports([]);
      setShowReportForm(false);
    }
  }, [selectedStop, user?.id]);

  // Journey States
  const [originLocation, setOriginLocation] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [targetLocation, setTargetLocation] = useState('');
  const [targetSuggestions, setTargetSuggestions] = useState([]);
  const [routeResult, setRouteResult] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [activeTrip, setActiveTrip] = useState(null);
  const [tripProgress, setTripProgress] = useState(0);
  const [tripStatus, setTripStatus] = useState('');
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [tripStops, setTripStops] = useState([]);
  const [userLocation, setUserLocation] = useState({ lat: -23.100, lng: -45.700 });
  const [isLocating, setIsLocating] = useState(false);
  const [rawNearbyStops, setRawNearbyStops] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [destinationStreet, setDestinationStreet] = useState('');
  const [eta, setEta] = useState(null);
  const [alertActive, setAlertActive] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [tripComment, setTripComment] = useState('');
  
  // Tracking State
  const [trackedBusId, setTrackedBusId] = useState(null);
  
  // Map Layer States
  const [mapLayer, setMapLayer] = useState('roadmap'); // 'roadmap', 'satellite', 'terrain', 'carto'
  const [showTraffic, setShowTraffic] = useState(true);
  
  const tripIntervalRef = useRef(null);
  const baseLinesRef = useRef([]);
  const lineRatingsMap = useRef({});
  
  const openInWaze = (lat, lng) => {
    window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
  };

  const openInGoogleMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterCoverage, setFilterCoverage] = useState(false);
  const [filterBench, setFilterBench] = useState(false);
  const [filterAccessible, setFilterAccessible] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [s, l] = await Promise.all([
          storage.getStops(),
          storage.getLines()
        ]);
        
        let finalStops = Array.isArray(s) && s.length > 0 ? s : stopsData;
        const normalized = finalStops.map(stop => {
          let stopLines = Array.isArray(stop.lines) ? stop.lines : (stop.linhas ? stop.linhas.split(',').map(l => l.trim()) : []);
          
          // Auto-enriquecimento de linhas para garantir que o planejador funcione com variedade
          const nameLower = (stop.name || '').toLowerCase();
          if (nameLower.includes('terminal') || nameLower.includes('rodoviária') || nameLower.includes('centro')) {
            if (stopLines.length === 0 && l && l.length > 0) {
              stopLines = l.map(line => line.name || line.numero).slice(0, 6);
            }
          } else if (stopLines.length === 0 && l && l.length > 0) {
            // Fallback para pontos sem linhas: atribui uma linha aleatória das disponíveis no banco
            const availableLineNumbers = l.map(line => line.name || line.numero);
            const randomLine = availableLineNumbers[Math.floor(Math.random() * availableLineNumbers.length)];
            stopLines = [randomLine];
          }

          return {
            ...stop,
            id: stop.id?.toString(), // Mantém como texto (suporta UUID)
            lines: stopLines,
            lat: Number(stop.lat),
            lng: Number(stop.lng)
          };
        });

        const stopsWithInfra = normalized.map(stop => {
          const isMainPoint = stop.name?.toLowerCase().includes('terminal') || 
                              stop.name?.toLowerCase().includes('padre marcelo') ||
                              stop.name?.toLowerCase().includes('rodoviária');

          return {
            ...stop,
            infra: {
              cobertura: stop.cobertura !== undefined ? stop.cobertura : (stop.coverage !== undefined ? stop.coverage : (isMainPoint ? true : Math.random() > 0.5)),
              banco: stop.banco !== undefined ? stop.banco : (stop.bench !== undefined ? stop.bench : (isMainPoint ? true : Math.random() > 0.6)),
              acessivel: stop.acessivel !== undefined ? stop.acessivel : (stop.accessible !== undefined ? stop.accessible : (isMainPoint ? true : Math.random() > 0.4))
            }
          };
        });
        setStops(stopsWithInfra);
        setFilteredStops(stopsWithInfra);
        baseLinesRef.current = l || [];
        
        // Carregar avaliações de todas as linhas
        if (l && l.length > 0) {
          const ratingsPromises = l.map(line => storage.getLineRatings(line.numero || line.name));
          const ratingsResults = await Promise.all(ratingsPromises);
          const map = {};
          l.forEach((line, idx) => {
            map[line.numero || line.name] = ratingsResults[idx];
          });
          lineRatingsMap.current = map;
        }

        // Carregar favoritos: Supabase se logado, localStorage se não
        if (user) {
          console.log("Buscando favoritos para o usuário:", user.id);
          const cloudFavs = await storage.getFavorites(user.id);
          // Mantém como string (importante para UUIDs)
          const stringFavs = cloudFavs.map(id => id.toString());
          setFavorites(stringFavs);
          console.log("Favoritos sincronizados (IDs):", stringFavs);
        } else {
          const savedFavs = localStorage.getItem('mobtracker_favorites');
          if (savedFavs) setFavorites(JSON.parse(savedFavs));
        }
        // Carregar todos os relatos para o mapa
        setLoadingAllReports(true);
        const rep = await storage.getReports();
        setAllReports(rep);
        setLoadingAllReports(false);
      } catch (err) {
        console.error("Load error:", err);
      } finally {
        setLoading(false);
        setLoadingAllReports(false);
      }
    }
    load();
  }, [user]);

  // Smooth, non-network position update loop
  useEffect(() => {
    if (stops.length === 0) return;

    const updatePositions = () => {
      const now = Date.now();
      const allLines = baseLinesRef.current;
      
      if (allLines.length > 0) {
        const trafficFactor = trafficService.getTrafficFactor();
        const buses = allLines.map((line, idx) => {
          const lineStops = stops.filter(s => s.lines.includes(line.name));
          if (lineStops.length < 2) return null;

          const periodPerStop = 180000 * trafficFactor; 
          const totalPeriod = lineStops.length * periodPerStop;
          const timeOffset = idx * 600000; 
          const elapsed = (now + timeOffset) % totalPeriod;
          
          const stopIdx = Math.floor(elapsed / periodPerStop);
          const nextStopIdx = (stopIdx + 1) % lineStops.length;
          const subProgress = (elapsed % periodPerStop) / periodPerStop;

          const currentStop = lineStops[stopIdx];
          const nextStop = lineStops[nextStopIdx];

          return {
            id: line.id,
            lineName: line.name,
            lat: currentStop.lat + (nextStop.lat - currentStop.lat) * subProgress,
            lng: currentStop.lng + (nextStop.lng - currentStop.lng) * subProgress,
            currentStopName: currentStop.name,
            nextStopName: nextStop.name
          };
        }).filter(Boolean);
        setLiveBuses(buses);
      }
    };

    const interval = setInterval(updatePositions, 1000); 
    return () => clearInterval(interval);
  }, [stops]);

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const nLat1 = Number(lat1);
    const nLon1 = Number(lon1);
    const nLat2 = Number(lat2);
    const nLon2 = Number(lon2);
    
    if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return 999999;
    
    const R = 6371e3; 
    const p1 = nLat1 * Math.PI/180;
    const p2 = nLat2 * Math.PI/180;
    const dp = (nLat2-nLat1) * Math.PI/180;
    const dl = (nLon2-nLon1) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
  };

  // Cálculo direto para garantir reatividade total sem cache
  const nearbyStops = (() => {
    if (!stops || stops.length === 0) return [];
    
    return stops
      .filter(s => s && s.lat && s.lng)
      .map(stop => {
        const d = userLocation 
          ? getDistance(userLocation.lat, userLocation.lng, stop.lat, stop.lng)
          : 999999;
        return { ...stop, distToUser: d };
      })
      .filter(stop => stop.distToUser <= 5000) // Limita a 5km
      .sort((a, b) => a.distToUser - b.distToUser)
      .slice(0, 6);
  })();

  // CEP States para o mapa
  const [cep, setCep] = useState(localStorage.getItem('mobtracker_user_cep') || '');
  const [houseNumber, setHouseNumber] = useState(localStorage.getItem('mobtracker_user_number') || '');
  const [address, setAddress] = useState(JSON.parse(localStorage.getItem('mobtracker_user_address') || 'null'));
  const [loadingCep, setLoadingCep] = useState(false);

  const fetchAddress = async (cepValue, numberValue) => {
    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;
    
    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        // Tentativa 1: Busca exata com número
        let query = `${data.logradouro}, ${numberValue || ''}, ${data.localidade}, SP, Brasil`;
        let geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        let geoData = await geoRes.json();
        
        // Tentativa 2: Busca apenas rua e bairro (fallback)
        if (!geoData || geoData.length === 0) {
          query = `${data.logradouro}, ${data.bairro}, ${data.localidade}, SP, Brasil`;
          geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
          geoData = await geoRes.json();
        }

        // Tentativa 3: Busca apenas o CEP (último recurso)
        if (!geoData || geoData.length === 0) {
          query = `${data.cep}, Brasil`;
          geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
          geoData = await geoRes.json();
        }
        
        if (geoData && geoData.length > 0) {
          const newCoords = { lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) };
          return { address: data, coords: newCoords };
        }
        
        // Fallback for Caçapava if Nominatim fails
        if (data.localidade && data.localidade.toLowerCase() === 'caçapava') {
           return { address: data, coords: { lat: -23.100, lng: -45.700 } };
        }
        return { address: data, coords: null };
      }
    } catch (error) {
      console.error("Erro ao buscar CEP no Mapa", error);
    } finally {
      setLoadingCep(false);
    }
    return null;
  };

  const handleSaveCep = async () => {
    setLoadingCep(true);
    setFilteredStops([]); // reset previous results while loading
    const result = await fetchAddress(cep, houseNumber);
    
    if (result) {
      localStorage.setItem('mobtracker_user_cep', cep);
      localStorage.setItem('mobtracker_user_number', houseNumber);
      if (result.address) {
        localStorage.setItem('mobtracker_user_address', JSON.stringify(result.address));
        setAddress(result.address);
      }
      if (result.coords) {
        localStorage.setItem('mobtracker_user_location', JSON.stringify(result.coords));
        setUserLocation(result.coords); 
        setActiveTab('nearby');
        setStops(prev => [...prev]); 
        
        if (mapRef.current) {
          mapRef.current.setView([result.coords.lat, result.coords.lng], 16);
        }
        Swal.fire({
          icon: 'success',
          title: 'Localização Atualizada',
          text: 'Seu endereço foi encontrado e o mapa foi atualizado!',
          confirmButtonColor: '#10b981'
        });
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Atenção',
          text: 'Endereço encontrado, mas não conseguimos localizar no mapa. Tente outro número ou CEP próximo.',
          confirmButtonColor: '#10b981'
        });
      }
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'CEP não encontrado. Verifique se o número está correto.',
        confirmButtonColor: '#10b981'
      });
    }
    setLoadingCep(false);
  };

  useEffect(() => {
    if (activeTab === 'nearby') {
      const savedLocation = JSON.parse(localStorage.getItem('mobtracker_user_location'));
      if (savedLocation) {
        setUserLocation(savedLocation);
        setIsLocating(false);
      } else {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setIsLocating(false);
          },
          () => {
            setIsLocating(false);
            // Fallback to center
            setUserLocation({ lat: -23.100, lng: -45.700 });
          }
        );
      }
    }
  }, [activeTab]);

  // 1. Busca os pontos brutos próximos da API (apenas quando o local do usuário ou a aba mudar)
  useEffect(() => {
    const fetchRawNearby = async () => {
      if (activeTab === 'nearby' && userLocation) {
        setLoadingNearby(true);
        try {
          // Busca do Google Places API com Overpass como fallback
          let apiStops = await fetchNearbyBusStops(userLocation.lat, userLocation.lng, 5000);
          
          let transformed;
          if (apiStops.length > 0) {
            // Cruza dados com pontos locais
            const usedLocalIds = new Set();
            transformed = apiStops
              .map(place => {
                const pLat = Number(place.geometry.location.lat);
                const pLng = Number(place.geometry.location.lng);
                
                let bestLocal = null;
                let bestDist = 150;
                for (const ls of stops) {
                  if (!ls?.lat || !ls?.lng) continue;
                  const d = getDistance(pLat, pLng, ls.lat, ls.lng);
                  if (d < bestDist) {
                    bestDist = d;
                    bestLocal = ls;
                  }
                }
                
                if (bestLocal) {
                  usedLocalIds.add(bestLocal.id);
                  return {
                    ...bestLocal,
                    distToUser: place.distToUser
                  };
                }
                
                return {
                  id: place.place_id,
                  name: place.name,
                  location: place.vicinity || '',
                  lat: pLat,
                  lng: pLng,
                  lines: [],
                  distToUser: place.distToUser
                };
              })
              .sort((a, b) => a.distToUser - b.distToUser);
            
            const extraLocal = stops
              .filter(s => s?.lat && s?.lng && !usedLocalIds.has(s.id))
              .map(stop => ({
                ...stop,
                distToUser: getDistance(userLocation.lat, userLocation.lng, stop.lat, stop.lng)
              }))
              .filter(s => s.distToUser <= 5000);
            
            transformed = [...transformed, ...extraLocal]
              .sort((a, b) => a.distToUser - b.distToUser)
              .slice(0, 8);
          } else {
            // Fallback usando pontos locais dentro de 5km
            transformed = stops
              .filter(s => s && s.lat && s.lng)
              .map(stop => ({
                ...stop,
                distToUser: getDistance(userLocation.lat, userLocation.lng, stop.lat, stop.lng)
              }))
              .filter(s => s.distToUser <= 5000)
              .sort((a, b) => a.distToUser - b.distToUser)
              .slice(0, 6);
          }
          
          if (import.meta.env.DEV) {
            console.log('[Mapa] Raw nearby stops loaded:', transformed.length);
          }
          setRawNearbyStops(transformed);
        } catch (err) {
          console.error("Erro ao buscar pontos próximos:", err);
        } finally {
          setLoadingNearby(false);
        }
      }
    };
    fetchRawNearby();
  }, [activeTab, userLocation, stops]);

  // 2. Filtra localmente os pontos exibidos com base nas pesquisas, filtros de infraestrutura e favoritos
  useEffect(() => {
    let sourceStops = activeTab === 'nearby' ? (rawNearbyStops && rawNearbyStops.length > 0 ? rawNearbyStops : stops) : stops;
    
    // Se a aba for 'nearby' mas não tiver localização ainda, mostramos lista vazia
    if (activeTab === 'nearby' && !userLocation) {
      setFilteredStops([]);
      return;
    }

    let filtered = sourceStops;
    
    // Filtro de busca (nome, localização ou linhas)
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.location?.toLowerCase().includes(q) ||
        (Array.isArray(s.lines) && s.lines.some(l => l.toString().toLowerCase().includes(q)))
      );
    }
    
    // Filtros de Infraestrutura
    if (filterCoverage) filtered = filtered.filter(s => s.infra?.cobertura);
    if (filterBench) filtered = filtered.filter(s => s.infra?.banco);
    if (filterAccessible) filtered = filtered.filter(s => s.infra?.acessivel);
    
    // Filtro de Favoritos
    if (showOnlyFavorites) {
      filtered = filtered.filter(s => favorites.includes(s.id?.toString()) || favorites.includes(Number(s.id)));
    }
    
    setFilteredStops(filtered);
  }, [activeTab, rawNearbyStops, stops, userLocation, searchTerm, filterCoverage, filterBench, filterAccessible, showOnlyFavorites, favorites]);

  const toggleFavorite = async (stopId) => {
    // Se logado, salva no banco
    if (user) {
      try {
        const isAdded = await storage.toggleFavorite(user.id, stopId);
        if (isAdded) {
          setFavorites(prev => [...prev, stopId]);
        } else {
          setFavorites(prev => prev.filter(id => id !== stopId));
        }
      } catch (err) {
        console.error("Erro ao favoritar no Supabase:", err);
        Swal.fire({ 
          icon: 'error', 
          title: 'Erro ao Salvar', 
          text: err.message || 'Erro desconhecido ao conectar com o banco de dados.',
          confirmButtonColor: '#10b981'
        });
      }
    } else {
      // Se não logado, usa localStorage
      let newFavs;
      if (favorites.includes(stopId)) {
        newFavs = favorites.filter(id => id !== stopId);
      } else {
        newFavs = [...favorites, stopId];
      }
      setFavorites(newFavs);
      localStorage.setItem('mobtracker_favorites', JSON.stringify(newFavs));
      
      Swal.fire({
        icon: 'info',
        title: 'Modo Visitante',
        text: 'Este favorito ficará salvo apenas neste navegador. Faça login para salvar permanentemente na sua conta!',
        confirmButtonColor: '#10b981'
      });
    }
  };

  // Journey Handlers
  const planJourney = () => {
    if (!targetLocation) return;
    if (!stops || stops.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Aguarde',
        text: 'Carregando dados dos pontos, aguarde um momento...',
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }
    
    setIsLoadingRoute(true);
    setAlertActive(false);
    
    try {
      // 1. Normalizar paradas (compatibilidade entre Supabase e Mock)
      const normalizedStops = stops.map(s => ({
        ...s,
        lines: Array.isArray(s.lines) ? s.lines : (s.linhas ? s.linhas.split(',').map(l => l.trim()) : []),
        lat: Number(s.lat),
        lng: Number(s.lng)
      }));

      // 1. Find Origin Stop
      let originStop = null;
      const originInput = originLocation || 'Minha Localização Atual';

      if (originInput !== 'Minha Localização Atual' && originInput.trim() !== '') {
        originStop = normalizedStops.find(s => 
          s.name?.toLowerCase().includes(originInput.toLowerCase()) || 
          s.location?.toLowerCase().includes(originInput.toLowerCase())
        );
      }
      
      // Fallback to GPS if no manual stop found or requested GPS
      if (!originStop && userLocation) {
        let minDistUser = Infinity;
        normalizedStops.forEach(s => {
          const d = getDistance(userLocation.lat, userLocation.lng, s.lat, s.lng);
          if (d < minDistUser) {
            minDistUser = d;
            originStop = s;
          }
        });
      }

      // Final fallback
      if (!originStop) originStop = normalizedStops[0];

      // 2. Find Destination Stop
      const dStop = normalizedStops.find(s => 
        s.name?.toLowerCase().includes(targetLocation.toLowerCase()) || 
        s.location?.toLowerCase().includes(targetLocation.toLowerCase())
      ) || normalizedStops[Math.min(5, normalizedStops.length - 1)];
      
      if (!originStop || !dStop) throw new Error("Paradas não encontradas");

      // 3. Find common line
      const oLines = (originStop.lines || []).map(l => String(l));
      const dLines = (dStop.lines || []).map(l => String(l));
      const commonLines = oLines.filter(line => dLines.includes(line));
      
      let finalLine = oLines[0] || '01';
      if (commonLines.length > 0) {
        // Pick a random common line to show variety
        finalLine = commonLines[Math.floor(Math.random() * commonLines.length)];
      } else {
        // If no common line, suggest a line that at least reaches the destination
        finalLine = dLines.length > 0 ? dLines[0] : (oLines[0] || '01');
      }

      const dist = getDistance(originStop.lat, originStop.lng, dStop.lat, dStop.lng);
      const durationMin = trafficService.calculateETAMinutes(dist);
      const arrivalTime = trafficService.getArrivalTime(durationMin);

      setRouteResult({
        origin: originStop,
        destination: dStop,
        duration: durationMin,
        distance: (dist / 1000).toFixed(1),
        line: finalLine,
        arrivalTime: arrivalTime
      });
    } catch (error) {
      console.error("Erro no planejamento:", error);
      Swal.fire({
        icon: 'error',
        title: 'Erro no Planejamento',
        text: 'Houve um erro ao calcular a rota. Verifique sua localização ou tente selecionar um ponto da lista.',
        confirmButtonColor: '#10b981'
      });
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const startTrip = () => {
    if (!routeResult) return;
    const lineStops = stops.filter(s => s.lines.includes(routeResult.line));
    const stopsSequence = lineStops.length > 2 ? lineStops : [routeResult.origin, routeResult.destination];
    
    setTripStops(stopsSequence);
    setActiveTrip(routeResult);
    setTripProgress(0);
    setCurrentStopIndex(0);
    setTripStatus("Embarque");
    setEta(routeResult.duration);
    
    if (tripIntervalRef.current) clearInterval(tripIntervalRef.current);
    
    // Calcula o intervalo para que o progresso (0-100) complete exatamente no tempo do ETA
    // Ex: se ETA = 10 min (600s), cada 1% de progresso leva 6 segundos.
    const totalDurationMs = routeResult.duration * 60 * 1000;
    const stepInterval = totalDurationMs / 100;

    tripIntervalRef.current = setInterval(() => {
      setTripProgress(prev => {
        if (prev >= 100) {
          clearInterval(tripIntervalRef.current);
          setTripStatus("Chegada");
          setShowRating(true);
          setEta(0);
          return 100;
        }
        
        const next = prev + 1; 
        if (next > 5) setTripStatus("Em viagem");
        
        // Atualiza o índice do ponto atual baseado no progresso real
        const stopIdx = Math.min(Math.floor((next / 100) * stopsSequence.length), stopsSequence.length - 1);
        setCurrentStopIndex(stopIdx);
        
        // Sincroniza o ETA regressivo com o progresso
        const remainingPercent = (100 - next) / 100;
        const remainingMin = Math.ceil(routeResult.duration * remainingPercent);
        setEta(Math.max(0, remainingMin));

        if (destinationStreet && stopsSequence[stopIdx].name.toLowerCase().includes(destinationStreet.toLowerCase())) {
          setAlertActive(true);
        }

        return next;
      });
    }, stepInterval);
  };

  const submitRating = async () => {
    if (!activeTrip) return;
    
    try {
      // 1. Registrar a viagem que acabou de ser concluída
      if (user) {
        await storage.addTrip(user.id, activeTrip.line);
      }

      // 2. Enviar avaliação da Linha
      await storage.addRating({
        lineId: activeTrip.line,
        userId: user?.id,
        type: 'line',
        value: selectedRating
      });

      // 3. Enviar avaliação do motorista
      await storage.addRating({
        lineId: activeTrip.line,
        userId: user?.id,
        type: 'driver',
        value: selectedRating
      });

      Swal.fire({
        icon: 'success',
        title: 'Viagem Concluída!',
        text: 'Sua viagem foi registrada e você ganhou pontos por sua avaliação e jornada. Obrigado!',
        confirmButtonColor: '#10b981'
      });
    } catch (err) {
      console.error("Erro ao salvar avaliação e viagem:", err);
      Swal.fire({
        icon: 'warning',
        title: 'Atenção',
        text: err.message || 'Recebemos sua avaliação, mas houve um erro ao registrar os pontos da viagem.',
        confirmButtonColor: '#10b981'
      });
    } finally {
      setShowRating(false);
      setActiveTrip(null);
      setRouteResult(null);
      setTargetLocation('');
      setOriginLocation('');
      setSelectedRating(0);
    }
  };

  const customMarkerIcon = L.divIcon({
    html: `<div style="
      background-color: #1C3A2E;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="background-color: white; width: 6px; height: 6px; border-radius: 50%;"></div>
    </div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      Swal.fire({
        icon: 'info',
        title: 'Atenção',
        text: 'Você precisa estar logado para relatar!',
        confirmButtonColor: '#10b981'
      });
      return;
    }
    setSubmittingReport(true);
    const finalType = reportType === 'warning_other' ? 'warning' : reportType;
    try {
      await storage.addReport({
        lineId: Array.isArray(selectedStop.lines) ? selectedStop.lines[0] : '',
        stopId: selectedStop.id?.toString(),
        type: finalType,
        description: reportDescription,
        author: user.email.split('@')[0],
        userId: user.id
      });
      Swal.fire({
        icon: 'success',
        title: 'Relato Enviado',
        text: 'Seu relato foi enviado com sucesso! Você ganhou +10 MobPontos!',
        confirmButtonColor: '#10b981'
      });
      setReportDescription('');
      setShowReportForm(false);
      
      // Recarregar relatos do ponto
      const reports = await storage.getReportsByStop(selectedStop.id?.toString());
      setStopReports(reports);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Erro ao Enviar',
        text: "Erro ao enviar: " + err.message,
        confirmButtonColor: '#10b981'
      });
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className={styles.pageContainer}>
        <section className={styles.hero}>
          <div className={styles.heroOverlay}></div>
          <div className={styles.heroContent}>
            <div className={styles.badge}>
              <MapPin size={16} />
              <span>{stops.length} pontos mapeados — Caçapava, SP</span>
            </div>
            <h1 className={styles.heroTitle}>Pontos & Itinerários</h1>
            <p className={styles.heroSubtitle}>Encontre pontos, planeje viagens e acompanhe alertas</p>
            
            <div className={styles.searchWrapper}>
              <div className={styles.searchContainer}>
                <Search className={styles.searchIcon} size={24} />
                <input 
                  type="text" 
                  className={styles.searchInputHero} 
                  placeholder="Buscar por nome, bairro ou linha..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button 
                  className={`${styles.filterBtn} ${showFilters ? styles.filterBtnActive : ''}`}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Menu size={24} />
                </button>
              </div>

              {showFilters && (
                <div className={styles.filterDropdown}>
                  <div className={styles.filterItem}>
                    <input 
                      type="checkbox" 
                      id="filterCoverage" 
                      checked={filterCoverage} 
                      onChange={() => setFilterCoverage(!filterCoverage)}
                    />
                    <label htmlFor="filterCoverage">Com Cobertura</label>
                  </div>
                  <div className={styles.filterItem}>
                    <input 
                      type="checkbox" 
                      id="filterBench" 
                      checked={filterBench} 
                      onChange={() => setFilterBench(!filterBench)}
                    />
                    <label htmlFor="filterBench">Com Banco</label>
                  </div>
                  <div className={styles.filterItem}>
                    <input 
                      type="checkbox" 
                      id="filterAccessible" 
                      checked={filterAccessible} 
                      onChange={() => setFilterAccessible(!filterAccessible)}
                    />
                    <label htmlFor="filterAccessible">Acessível (PCD)</label>
                  </div>
                  <div className={styles.filterItem}>
                    <input 
                      type="checkbox" 
                      id="filterFavorites" 
                      checked={showOnlyFavorites} 
                      onChange={() => setShowOnlyFavorites(!showOnlyFavorites)}
                    />
                    <label htmlFor="filterFavorites">Meus Favoritos</label>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.heroTabs}>
              <button 
                className={`${styles.tabBtn} ${activeTab === 'departures' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('departures')}
              >
                <MapPin size={18} /> Partidas
              </button>
              <button 
                className={`${styles.tabBtn} ${activeTab === 'journey' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('journey')}
              >
                <Route size={18} /> Planejar
              </button>
              <button 
                className={`${styles.tabBtn} ${activeTab === 'nearby' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('nearby')}
              >
                <Locate size={18} /> Próximos
              </button>
            </div>
          </div>
        </section>


        <main className={styles.mainContent}>
          {activeTab === 'departures' && (
            <>
              <div className={styles.contentHeader}>
                <p className={styles.contentTitle}>{filteredStops.length} pontos encontrados</p>
                <div className={styles.viewToggles}>
                  <button 
                    className={`${styles.viewToggle} ${viewMode === 'map' ? styles.activeToggle : ''}`}
                    onClick={() => setViewMode('map')}
                  >
                    <MapPin size={16} /> Mapa
                  </button>
                  <button 
                    className={`${styles.viewToggle} ${viewMode === 'list' ? styles.activeToggle : ''}`}
                    onClick={() => setViewMode('list')}
                  >
                    <Menu size={16} /> Lista
                  </button>
                </div>
              </div>
              
              {viewMode === 'map' ? (
                <div className={styles.mapWrapper}>
                  {/* Tracked Bus Info Overlay */}
                  {trackedBusId && (
                    <div className={styles.trackingOverlay}>
                      <div className={styles.trackingInfo}>
                        <div className={styles.trackingBadge}>
                          <div className={styles.pulse}></div>
                          Rastreando Linha {liveBuses.find(b => b.id === trackedBusId)?.lineName}
                        </div>
                        <button 
                          className={styles.stopTrackingBtn}
                          onClick={() => {
                            setTrackedBusId(null);
                            setSearchTerm('');
                          }}
                        >
                          Parar Rastreio
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Map Controls Overlay */}
                  <div className={styles.mapControlsOverlay}>
                    <div className={styles.layerSelector}>
                      <button 
                        className={`${styles.layerBtn} ${mapLayer === 'roadmap' ? styles.activeLayer : ''}`}
                        onClick={() => setMapLayer('roadmap')}
                        title="Mapa"
                      >
                        <MapIcon size={18} />
                      </button>
                      <button 
                        className={`${styles.layerBtn} ${mapLayer === 'satellite' ? styles.activeLayer : ''}`}
                        onClick={() => setMapLayer('satellite')}
                        title="Satélite"
                      >
                        <Activity size={18} />
                      </button>
                      
                      <div className={styles.separator}></div>
                      
                      <button 
                        className={`${styles.trafficToggle} ${showTraffic ? styles.trafficActive : ''}`}
                        onClick={() => {
                          setShowTraffic(!showTraffic);
                          if (mapLayer !== 'roadmap') setMapLayer('roadmap');
                        }}
                        title="Trânsito em Tempo Real"
                      >
                        <Navigation size={18} />
                        <span>Trânsito</span>
                      </button>
                      
                      <div className={styles.separator}></div>

                      <button 
                        className={styles.layerBtn}
                        onClick={() => {
                          const bounds = liveBuses.map(b => [b.lat, b.lng]);
                          if (bounds.length > 0) mapRef.current?.fitBounds(bounds, { padding: [50, 50] });
                        }}
                        title="Ver todos os ônibus"
                      >
                        <Bus size={18} />
                      </button>
                      <button 
                        className={styles.layerBtn}
                        onClick={() => {
                          if (userLocation) mapRef.current?.setView([userLocation.lat, userLocation.lng], 16);
                        }}
                        title="Minha Localização"
                      >
                        <Locate size={18} />
                      </button>
                      <button 
                        className={styles.layerBtn}
                        onClick={() => setZoomLevel(prev => Math.min(prev + 1, 18))}
                        title="Aproximar"
                      >
                        <Search size={18} />
                      </button>
                      <button 
                        className={styles.layerBtn}
                        onClick={() => setZoomLevel(prev => Math.max(prev - 1, 5))}
                        title="Afastar"
                      >
                        <Minus size={18} />
                      </button>
                    </div>
                  </div>

                  <MapContainer 
                    center={[-23.100, -45.700]} 
                    zoom={zoomLevel} 
                    style={{ height: '100%', width: '100%' }}
                    ref={mapRef}
                    zoomControl={false}
                  >
                    <ZoomControl position="bottomright" />
                    <MapFollower trackedBusId={trackedBusId} liveBuses={liveBuses} />
                    
                    {/* Google Maps Base Layer */}
                    {mapLayer === 'roadmap' && (
                      <TileLayer 
                        url={showTraffic 
                          ? "https://mt1.google.com/vt/lyrs=m@221000000,traffic|seconds_into_week:-1&style=3&x={x}&y={y}&z={z}"
                          : "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                        }
                        attribution='&copy; Google Maps'
                      />
                    )}
                    {mapLayer === 'satellite' && (
                      <TileLayer 
                        url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" 
                        attribution='&copy; Google Maps Satellite'
                      />
                    )}
                    {mapLayer === 'terrain' && (
                      <TileLayer 
                        url="https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}" 
                        attribution='&copy; Google Maps Terrain'
                      />
                    )}
                    {mapLayer === 'carto' && (
                      <TileLayer 
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" 
                        attribution='&copy; CARTO'
                      />
                    )}

                    {/* User Location Pulse Marker */}
                    {userLocation && (
                      <Marker 
                        position={[Number(userLocation.lat), Number(userLocation.lng)]}
                        icon={L.divIcon({
                          html: `<div style="background: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.4); display: flex; align-items: center; justify-content: center;"><div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div></div>`,
                          className: '',
                          iconSize: [20, 20],
                          iconAnchor: [10, 10]
                        })}
                      >
                        <Popup>
                          <div style={{ textAlign: 'center', fontFamily: 'sans-serif' }}>
                            <strong style={{ color: '#1d4ed8' }}>Sua Posição Atual</strong><br/>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Caçapava, SP</span>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                    
                    {filteredStops.length > 0 && 
                    filteredStops.map((stop, idx) => {
                      if (!stop || !stop.lat || !stop.lng) return null;
                      const pos = [Number(stop.lat), Number(stop.lng)];
                      if (isNaN(pos[0]) || isNaN(pos[1])) return null;
                      
                      return (
                        <Marker 
                          key={stop.id || `stop-${idx}`} 
                          position={pos}
                          icon={customMarkerIcon}
                          eventHandlers={{
                            click: () => setSelectedStop(stop),
                          }}
                        >
                          <Popup className={styles.customPopup}>
                            <div className={styles.popupHeader}>
                              <strong style={{ fontSize: '1.1rem', color: '#1e293b' }}>{stop.name && !stop.name.startsWith('Ponto de Ônibus') ? stop.name : stop.location || 'Ponto'}</strong>
                            </div>
                            <div className={styles.popupBody}>
                              <p style={{ margin: '0 0 0.5rem 0', color: '#64748b', fontSize: '0.9rem' }}>
                                <MapPin size={14} style={{ marginRight: '4px' }} />
                                {stop.location}
                              </p>
                              <> </>
                                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#f59e0b', fontWeight: 'bold' }}>
                                  <Star size={12} fill="#f59e0b" /> 
                                  <span>
                                    {(() => {
                                      const lineNames = Array.isArray(stop.lines) ? stop.lines : [];
                                      const ratings = lineNames.map(name => lineRatingsMap.current[name]?.avgLine || 0).filter(v => v > 0);
                                      if (ratings.length === 0) return '0.0';
                                      return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
                                    })()}
                                  </span>
                                  <span style={{ color: '#64748b', fontWeight: 'normal' }}>|</span>
                                  <Bus size={12} color="#1c4f36" />
                                  <span style={{ color: '#1c3a2e' }}>
                                    {(() => {
                                      const lineNames = Array.isArray(stop.lines) ? stop.lines : [];
                                      const ratings = lineNames.map(name => lineRatingsMap.current[name]?.avgDriver || 0).filter(v => v > 0);
                                      if (ratings.length === 0) return '0.0';
                                      return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
                                    })()}
                                  </span>
                                </div>
                              <button 
                                onClick={() => setSelectedStop(stop)}
                                style={{ 
                                  width: '100%', 
                                  marginTop: '10px', 
                                  padding: '8px', 
                                  background: '#1c3a2e', 
                                  color: 'white', 
                                  border: 'none', 
                                  borderRadius: '8px', 
                                  fontWeight: 'bold',
                                  cursor: 'pointer'
                                }}
                              >
                                Ver detalhes
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}

                    {/* Report Markers */}
                    {allReports.map((report, idx) => {
                      // Se for relato de ponto, o marcador já existe (é o ponto)
                      // Mas se quisermos mostrar ícones de alerta flutuantes para relatos gerais:
                      if (!report.lat || !report.lng) {
                        // Tenta pegar a lat/lng do ponto associado se existir
                        if (report.stop_id) {
                          const s = stops.find(st => st.id?.toString() === report.stop_id?.toString());
                          if (s) {
                            report.lat = s.lat;
                            report.lng = s.lng;
                          } else return null;
                        } else return null;
                      }

                      const pos = [Number(report.lat), Number(report.lng)];
                      const isOfficial = report.author === 'Admin MobTracker';

                      return (
                        <Marker 
                          key={`report-${report.id || idx}`} 
                          position={pos}
                          icon={L.divIcon({
                            html: `<div style="
                              background-color: ${report.type === 'negative' ? '#ef4444' : report.type === 'positive' ? '#10b981' : '#f59e0b'};
                              width: ${isOfficial ? '28px' : '20px'};
                              height: ${isOfficial ? '28px' : '20px'};
                              border-radius: 50%;
                              border: 2px solid white;
                              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              ${isOfficial ? 'animation: pulse 2s infinite;' : ''}
                            ">
                              <svg width="${isOfficial ? '16' : '12'}" height="${isOfficial ? '16' : '12'}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
                            </div>`,
                            className: '',
                            iconSize: [28, 28],
                            iconAnchor: [14, 14]
                          })}
                        >
                          <Popup>
                            <div style={{ minWidth: '150px' }}>
                              <strong style={{ color: isOfficial ? '#1c3a2e' : '#1e293b' }}>
                                {isOfficial ? 'Alerta Oficial' : `Relato de ${report.author || 'Usuário'}`}
                              </strong>
                              <p style={{ margin: '5px 0', fontSize: '0.85rem' }}>{report.description}</p>
                              <div className={styles.reportHeaderMini}>
                                <div className={styles.reportUserGroup}>
                                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#1c4f36', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold', overflow: 'hidden', marginRight: '0.5rem' }}>
                                    {report.perfis?.foto ? <img src={report.perfis.foto} alt="Av" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (report.perfis?.nome ? report.perfis.nome[0] : (report.author ? report.author[0] : 'U'))}
                                  </div>
                                  <span className={styles.reportUserName}>{report.perfis?.nome || report.author || 'Usuário'}</span>
                                </div>
                                <span className={styles.reportTimeMini}>
                                  <Clock size={12} color="#10b981" /> {new Date(report.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}


                    {liveBuses
                      .filter(bus => !trackedBusId || bus.id === trackedBusId)
                      .map(bus => (
                      <Marker 
                        key={`bus-${bus.id}`} 
                        position={[Number(bus.lat), Number(bus.lng)]}
                        icon={L.divIcon({
                          html: `<div style="background: #16a34a; color: white; padding: 4px 8px; border-radius: 20px; font-weight: bold; font-size: 0.75rem; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h10"></path><circle cx="7" cy="17" r="2"></circle><circle cx="17" cy="17" r="2"></circle></svg>
                            ${bus.lineName}
                          </div>`,
                          className: '',
                          iconSize: [60, 24],
                          iconAnchor: [30, 12]
                        })}
                      >
                        <Popup>
                          <strong>Ônibus - Linha {bus.lineName}</strong><br/>
                          Local atual: {bus.currentStopName}<br/>
                          Próximo ponto: {bus.nextStopName}<br/>
                          <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#16a34a', fontWeight: 'bold' }}>• Monitorando em tempo real</div>
                        </Popup>
                      </Marker>
                    ))}

                    {/* Ônibus da Viagem Ativa (Planejador) */}
                    {activeTrip && tripStops.length > 0 && (
                      <Marker
                        position={(() => {
                          const totalStops = tripStops.length;
                          const exactIdx = (tripProgress / 100) * (totalStops - 1);
                          const idx = Math.floor(exactIdx);
                          const nextIdx = Math.min(idx + 1, totalStops - 1);
                          const factor = exactIdx - idx;
                          
                          const start = tripStops[idx];
                          const end = tripStops[nextIdx];
                          
                          return [
                            start.lat + (end.lat - start.lat) * factor,
                            start.lng + (end.lng - start.lng) * factor
                          ];
                        })()}
                        icon={L.divIcon({
                          html: `<div style="background: #1c3a2e; color: white; padding: 6px 12px; border-radius: 24px; font-weight: 800; font-size: 0.85rem; border: 3px solid #10b981; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 6px; transform: scale(1.1);">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h10"></path><circle cx="7" cy="17" r="2"></circle><circle cx="17" cy="17" r="2"></circle></svg>
                            ${activeTrip.line}
                          </div>`,
                          className: '',
                          iconSize: [80, 32],
                          iconAnchor: [40, 16]
                        })}
                        zIndexOffset={2000}
                      >
                        <Popup>
                          <div style={{ textAlign: 'center' }}>
                            <strong style={{ color: '#1c3a2e' }}>Seu Ônibus - Linha {activeTrip.line}</strong><br/>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Sua viagem está em curso</span>
                            <div style={{ marginTop: '5px', color: '#10b981', fontWeight: 'bold' }}>Chegada em {eta} min</div>
                          </div>
                        </Popup>
                      </Marker>
                    )}

                    {/* Traffic Indicator */}
      <div className={`${styles.trafficBadge} ${trafficService.isPeakHour() ? styles.trafficHeavy : styles.trafficNormal}`}>
        <Activity size={16} />
        <span>
          {trafficService.isPeakHour() ? 'Trânsito Intenso (Horário de Pico)' : 'Trânsito Normal'}
        </span>
      </div>


                    
                    {filteredStops.length > 0 && <MapFitter positions={filteredStops.map(s => [Number(s.lat), Number(s.lng)])} />}
                  </MapContainer>
                </div>
              ) : (
                <div className={styles.stopsListContainer}>
                  {filteredStops.map((stop, idx) => (
                    <div key={stop.id || idx} className={styles.stopCardList} onClick={() => setSelectedStop(stop)}>
                      <div className={styles.stopIconBox}>
                        <MapPin size={30} fill="rgba(255,255,255,0.2)" />
                      </div>
                      
                      <div className={styles.stopMainInfo}>
                        <h3 className={styles.stopTitle}>{stop.name && !stop.name.startsWith('Ponto de Ônibus') ? stop.name : stop.location || 'Ponto'}</h3>
                        <div className={styles.stopSubInfo}>
                          <Bus size={14} />
                          <span>{Array.isArray(stop.lines) ? `Linha ${stop.lines.join(', ')}` : 'Nenhuma linha'} • {stop.location}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Star size={14} fill="#f59e0b" />
                            <span>
                              {(() => {
                                const lineNames = Array.isArray(stop.lines) ? stop.lines : [];
                                const ratings = lineNames.map(name => lineRatingsMap.current[name]?.avgLine || 0).filter(v => v > 0);
                                if (ratings.length === 0) return '0.0';
                                return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
                              })()}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1c3a2e' }}>
                            <Bus size={14} />
                            <span>
                              {(() => {
                                const lineNames = Array.isArray(stop.lines) ? stop.lines : [];
                                const ratings = lineNames.map(name => lineRatingsMap.current[name]?.avgDriver || 0).filter(v => v > 0);
                                if (ratings.length === 0) return '0.0';
                                return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
                              })()}
                            </span>
                          </div>
                        </div>
                        
                        <div className={styles.infraBadges}>
                          {stop.infra?.cobertura && (
                            <div className={`${styles.infraBadge} ${styles.badgeCobertura}`}>
                              <Umbrella size={12} />
                              <span>Cobertura</span>
                            </div>
                          )}
                          {stop.infra?.banco && (
                            <div className={`${styles.infraBadge} ${styles.badgeBanco}`}>
                              <Armchair size={12} />
                              <span>Banco</span>
                            </div>
                          )}
                          {stop.infra?.acessivel && (
                            <div className={`${styles.infraBadge} ${styles.badgeAcessivel}`}>
                              <Accessibility size={12} />
                              <span>Acessível</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className={styles.stopFavAction} onClick={(e) => { e.stopPropagation(); toggleFavorite(stop.id); }}>
                        <Star className={favorites.includes(stop.id) ? styles.favActive : ''} size={20} />
                      </div>
                      <ChevronRight className={styles.chevron} size={24} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'journey' && (
            <div className={styles.journeyPanel}>
              <div className={styles.journeyForm}>
                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}><MapPin size={14} /> Onde você está? (ou use seu GPS)</label>
                  <div className={styles.inputWithSuggestions}>
                    <input 
                      type="text" 
                      placeholder="Nome do Ponto, Rua ou 'Minha Localização'" 
                      className={styles.journeyInput}
                      value={originLocation || (userLocation ? 'Minha Localização Atual' : '')}
                      onChange={(e) => {
                        setOriginLocation(e.target.value);
                        if (e.target.value.length >= 2) {
                          setOriginSuggestions(stops.filter(s => s.name.toLowerCase().includes(e.target.value.toLowerCase()) || s.location.toLowerCase().includes(e.target.value.toLowerCase())));
                        } else {
                          setOriginSuggestions([]);
                        }
                      }}
                    />
                    {originSuggestions.length > 0 && (
                      <div className={styles.suggestionsBox}>
                        {originSuggestions.map(s => (
                          <div key={s.id} className={styles.suggestionItem} onClick={() => { setOriginLocation(s.name); setOriginSuggestions([]); }}>
                            <strong>{s.name}</strong>
                            <span>{s.location}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}><Flag size={14} /> Para onde vamos?</label>
                  <div className={styles.inputWithSuggestions}>
                    <input 
                      type="text" 
                      placeholder="Nome do Ponto ou Bairro de destino" 
                      className={styles.journeyInput}
                      value={targetLocation}
                      onChange={(e) => {
                        setTargetLocation(e.target.value);
                        if (e.target.value.length >= 2) {
                          setTargetSuggestions(stops.filter(s => s.name.toLowerCase().includes(e.target.value.toLowerCase()) || s.location.toLowerCase().includes(e.target.value.toLowerCase())));
                        } else {
                          setTargetSuggestions([]);
                        }
                      }}
                    />
                    {targetSuggestions.length > 0 && (
                      <div className={styles.suggestionsBox}>
                        {targetSuggestions.map(s => (
                          <div key={s.id} className={styles.suggestionItem} onClick={() => { setTargetLocation(s.name); setTargetSuggestions([]); }}>
                            <strong>{s.name}</strong>
                            <span>{s.location}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}><Bell size={14} /> Alerta de Desembarque (Rua/Ponto)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Rua das Flores (Opcional)"
                    className={styles.journeyInput}
                    value={destinationStreet}
                    onChange={(e) => setDestinationStreet(e.target.value)}
                  />
                </div>

                <button 
                  className={styles.planBtn} 
                  onClick={planJourney} 
                  disabled={isLoadingRoute || !targetLocation || (!originLocation && !userLocation)}
                >
                  {isLoadingRoute ? <RefreshCw size={20} className={styles.spin} /> : <Route size={20} />}
                  <span>Encontrar Melhor Ônibus</span>
                </button>
              </div>

              {routeResult && (
                <div className={styles.routeResultCard}>
                  <div className={styles.routeHeader}>
                    <div className={styles.routeMainInfo}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span className={styles.routeLineBadge}>Linha {routeResult.line}</span>
                        {trafficService.isPeakHour() && (
                          <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: '800', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>PICO</span>
                        )}
                      </div>
                      <div className={styles.routeTimeDist}>
                        <span><Clock size={16} /> {routeResult.duration} min</span>
                        <span><Navigation size={16} /> {routeResult.distance} km</span>
                      </div>
                      <div className={styles.arrivalTimeText} style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: '#64748b' }}>
                         Chegada às: <strong>{routeResult.arrivalTime}</strong>
                      </div>
                    </div>
                    {!activeTrip && (
                      <button className={styles.startTripBtn} onClick={startTrip}>
                        <Activity size={20} /> Iniciar
                      </button>
                    )}
                  </div>

                  <div className={styles.navButtons}>
                    <button className={`${styles.navBtn} ${styles.googleBtn}`} onClick={() => openInGoogleMaps(routeResult.destination.lat, routeResult.destination.lng)}>
                      <MapPin size={14} /> Google Maps
                    </button>
                    <button className={`${styles.navBtn} ${styles.wazeBtn}`} onClick={() => openInWaze(routeResult.destination.lat, routeResult.destination.lng)}>
                      <Navigation size={14} /> Waze
                    </button>
                  </div>

                  <div className={styles.miniMap}>
                    <MapContainer 
                      center={[routeResult.origin.lat, routeResult.origin.lng]} 
                      zoom={13} 
                      style={{ height: '100%', width: '100%' }}
                      zoomControl={false}
                    >
                      <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                      <Marker position={[routeResult.origin.lat, routeResult.origin.lng]} icon={customMarkerIcon} />
                      <Marker position={[routeResult.destination.lat, routeResult.destination.lng]} icon={customMarkerIcon} />
                      <RoutingMachine origin={routeResult.origin} destination={routeResult.destination} />
                    </MapContainer>
                  </div>

                  {activeTrip && (
                    <div className={styles.tripTracker}>
                      <div className={styles.trackerHeader}>
                        <span className={styles.statusLabel}>
                          {tripStatus === 'Embarque' && <MapPin size={14} />}
                          {tripStatus === 'Em viagem' && <Bus size={14} />}
                          {tripStatus === 'Quase lá' && <Navigation size={14} />}
                          {tripStatus === 'Chegada' && <CheckCircle size={14} />}
                          {tripStatus}
                        </span>
                        <span className={styles.progressText}>{tripProgress}%</span>
                      </div>
                      <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${tripProgress}%` }}></div>
                      </div>
                      <div className={styles.tripTrackerDetails}>
                        <div className={styles.etaBox}>
                          <Clock size={16} />
                          <span>Chegada em: <strong>{eta} min</strong></span>
                        </div>
                        <p className={styles.tripInfoText}>
                          {tripStatus === 'Chegada' 
                            ? `Você chegou ao seu destino: ${activeTrip.destination.name}` 
                            : `Passando por: ${tripStops[currentStopIndex]?.name || 'Em trânsito'}`}
                        </p>
                      </div>

                      {alertActive && (
                        <div className={styles.destinationAlert}>
                          <AlertTriangle size={24} className={styles.blink} />
                          <div>
                            <strong>ALERTA DE DESEMBARQUE!</strong>
                            <p>Você está chegando perto do seu destino. Prepare-se para descer!</p>
                          </div>
                          <button onClick={() => setAlertActive(false)}><X size={16} /></button>
                        </div>
                      )}

                      <div className={styles.journeyStopList}>
                        <h4>Paradas do Trajeto:</h4>
                        {tripStops.map((s, i) => (
                          <div key={i} className={`${styles.journeyStopItem} ${i === currentStopIndex ? styles.stopActive : ''} ${i < currentStopIndex ? styles.stopPassed : ''}`}>
                            <div className={styles.stopIndicator}></div>
                            <span>{s.name}</span>
                            {i === currentStopIndex && <Bus size={14} className={styles.busInStop} />}
                          </div>
                        ))}
                      </div>
                      
                      {showRating && (
                        <div className={styles.ratingForm}>
                          <p>Como foi sua experiência?</p>
                          <div className={styles.stars}>
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star 
                                key={s} 
                                size={28} 
                                fill={s <= selectedRating ? "#f59e0b" : "none"} 
                                color={s <= selectedRating ? "#f59e0b" : "#cbd5e1"}
                                onClick={() => setSelectedRating(s)}
                                style={{ cursor: 'pointer' }}
                              />
                            ))}
                          </div>
                          <button className={styles.submitRatingBtn} onClick={submitRating}>Enviar Avaliação</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'nearby' && (
            <div className={styles.nearbyPanel}>
              <div className={styles.panelHeader}>
                <Locate size={24} />
                <h2>Pontos Próximos a Você</h2>
              </div>

              {/* CEP Form no Mapa */}
              <div className={styles.cepFormCard}>
                <div className={styles.cepFormGrid}>
                  <div className={styles.cepInputGroup}>
                    <label>Seu CEP</label>
                    <input 
                      type="text" 
                      placeholder="00000-000" 
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                    />
                  </div>
                  <div className={styles.cepInputGroup}>
                    <label>Número</label>
                    <input 
                      type="text" 
                      placeholder="Nº" 
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(e.target.value)}
                    />
                  </div>
                  <button 
                    className={styles.cepSubmitBtn} 
                    onClick={handleSaveCep}
                    disabled={loadingCep}
                  >
                    {loadingCep ? '...' : 'Ok'}
                  </button>
                </div>
                {address && (
                  <div className={styles.cepAddressPreview}>
                    <MapPin size={14} />
                    <span>{address.logradouro}, {address.bairro}</span>
                  </div>
                )}
              </div>

              <div 
                className={styles.stopsListContainer}
                key={userLocation ? `${userLocation.lat}-${userLocation.lng}` : 'initial'}
              >
                    {isLocating || loadingNearby ? (
                      <div className={styles.emptyState}>
                        <RefreshCw size={48} className={styles.spin} style={{ marginBottom: '1rem', color: '#10b981' }} />
                        <p style={{ fontWeight: 600 }}>Buscando pontos próximos...</p>
                        <span style={{ fontSize: '0.9rem', color: '#94a3b8', textAlign: 'center', maxWidth: 320 }}>
                          Localizando sua posição e consultando os pontos de ônibus mais próximos em tempo real...
                        </span>
                      </div>
                    ) : filteredStops.length > 0 ? (
                      filteredStops.map(stop => {
                        // Find the bus of this line that is nearest to this stop
                        const lineBuses = liveBuses
                          .filter(b => stop.lines.includes(b.lineName))
                          .sort((a, b) => {
                            const distA = getDistance(a.lat, a.lng, stop.lat, stop.lng);
                            const distB = getDistance(b.lat, b.lng, stop.lat, stop.lng);
                            return distA - distB;
                          });
                        const incomingBus = lineBuses[0] || null;
                        
                        // Use walking ETA when user location is known; otherwise fall back to bus ETA
                         let timeToArrival = 0;
                         let arrivalTimeFormatted = '';
                         if (userLocation) {
                           const distUserToStop = getDistance(userLocation.lat, userLocation.lng, stop.lat, stop.lng);
                           timeToArrival = trafficService.calculateWalkingMinutes(distUserToStop);
                         } else if (incomingBus) {
                           const distBusToStop = getDistance(incomingBus.lat, incomingBus.lng, stop.lat, stop.lng);
                           timeToArrival = trafficService.calculateETAMinutes(distBusToStop);
                         }
                         arrivalTimeFormatted = trafficService.getArrivalTime(timeToArrival);

                        return (
                          <div key={stop.id} className={styles.stopCardList} onClick={() => setSelectedStop(stop)}>
                            <div className={styles.stopIconBox}>
                              <MapPin size={30} fill="rgba(255,255,255,0.2)" />
                            </div>
                            <div className={styles.stopMainInfo}>
                              <h3 className={styles.stopTitle}>{stop.name && !stop.name.startsWith('Ponto de Ônibus') ? stop.name : stop.location || 'Ponto'}</h3>
                              <div className={styles.stopSubInfo}>
                                <Bus size={14} />
                                <span>{incomingBus ? `Linha ${incomingBus.lineName} a caminho` : 'Consultando horários...'}</span>
                              </div>
                              <div className={styles.proximityInfo}>
                                <span className={styles.distText}>{stop.distToUser >= 1000 ? `${(stop.distToUser / 1000).toFixed(1)}km` : `${Math.round(stop.distToUser)}m`} de você</span>
                                <span className={styles.timeText}>
                                  <Clock size={12} /> {timeToArrival} min • Chegada às {arrivalTimeFormatted}
                                </span>
                              </div>
                              {incomingBus && (
                                <button 
                                  className={`${styles.trackBusBtn} ${trackedBusId === incomingBus.id ? styles.trackingActiveBtn : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (trackedBusId === incomingBus.id) {
                                      setTrackedBusId(null);
                                      setSearchTerm('');
                                    } else {
                                      setTrackedBusId(incomingBus.id);
                                      setSearchTerm(incomingBus.lineName);
                                      setActiveTab('departures');
                                      setViewMode('map');
                                      
                                      mapRef.current?.setView([incomingBus.lat, incomingBus.lng], 17);
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                      
                                      Swal.fire({
                                        toast: true,
                                        position: 'top-end',
                                        icon: 'success',
                                        title: `Rastreando Linha ${incomingBus.lineName}`,
                                        showConfirmButton: false,
                                        timer: 3000
                                      });
                                    }
                                  }}
                                >
                                  <Activity size={14} /> 
                                  {trackedBusId === incomingBus.id ? 'Parar Rastreio' : 'Rastrear este ônibus'}
                                </button>
                              )}
                            </div>
                            <ChevronRight className={styles.chevron} size={24} />
                          </div>
                        );
                      })
                    ) : (
                      <div className={styles.emptyState}>
                        <Bus size={48} style={{ marginBottom: '1rem', opacity: 0.5, color: '#10b981' }} />
                        <p style={{ fontWeight: 600 }}>Nenhum ponto de ônibus encontrado</p>
                        <span style={{ fontSize: '0.9rem', color: '#94a3b8', textAlign: 'center', maxWidth: 320 }}>
                          {searchTerm 
                            ? "Não encontramos nenhum ponto correspondente à sua busca nesta região."
                            : "Não encontramos pontos de ônibus perto de você. Tente atualizar seu CEP ou usar a aba 'Partidas' para buscar em outras regiões."}
                        </span>
                      </div>
                    )}
                  </div>
            </div>
          )}
        </main>


        {selectedStop && (
          <div className={styles.modalOverlay} onClick={() => setSelectedStop(null)}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
              <button className={styles.modalClose} onClick={() => setSelectedStop(null)}>
                <X size={24} />
              </button>

              <div className={styles.modalHeader}>
                <div className={styles.stopIconBox}>
                  <MapPin size={32} fill="rgba(255,255,255,0.2)" />
                </div>
                <div>
                  <h2 className={styles.modalTitle}>{selectedStop.name}</h2>
                  <p className={styles.modalSubtitle}>{selectedStop.location}</p>
                </div>
              </div>

              <div className={styles.modalPills}>
                <div className={`${styles.infoPill} ${styles.pillLine}`}>
                  <Bus size={16} />
                  <span>Linha {Array.isArray(selectedStop.lines) ? selectedStop.lines[0] : 'N/A'}</span>
                </div>
                <div className={`${styles.infoPill} ${styles.pillLocation}`}>
                  <MapPin size={16} />
                  <span>{selectedStop.location}</span>
                </div>
              </div>

              <span className={styles.sectionLabel}>Infraestrutura</span>
              <div className={styles.infraGrid}>
                {selectedStop.infra?.cobertura && (
                  <div className={`${styles.infraCard} ${styles.cardCobertura}`}>
                    <Umbrella size={28} />
                    <span>Com cobertura</span>
                  </div>
                )}
                {selectedStop.infra?.banco && (
                  <div className={`${styles.infraCard} ${styles.cardBanco}`}>
                    <Armchair size={28} />
                    <span>Com banco</span>
                  </div>
                )}
                {selectedStop.infra?.acessivel && (
                  <div className={`${styles.infraBadge} ${styles.cardAcessivel} ${styles.infraCard}`}>
                    <Accessibility size={28} />
                    <span>Acessível</span>
                  </div>
                )}
              </div>

              <button 
                className={styles.googleMapsBtn}
                onClick={() => window.open(`https://www.google.com/maps?q=${selectedStop.lat},${selectedStop.lng}`, '_blank')}
              >
                <Navigation size={20} />
                Abrir no Google Maps
              </button>

              <div className={styles.reportsSection}>
                <div className={styles.reportsHeader}>
                  <div className={styles.reportsTitle}>
                    <MessageSquare size={20} />
                    Relatos sobre este ponto
                  </div>
                  {!showReportForm && (
                    <button 
                      className={styles.addReportBtn} 
                      onClick={() => setShowReportForm(true)}
                    >
                      <Plus size={16} />
                      Relatar
                    </button>
                  )}
                </div>

                {showReportForm ? (
                  <form onSubmit={handleReportSubmit} className={styles.inlineForm}>
                    <select 
                      value={reportType} 
                      onChange={e => setReportType(e.target.value)}
                      className={styles.inlineSelect}
                    >
                      <option value="warning">Problema na Infraestrutura</option>
                      <option value="negative">Inseguro / Muito Longe</option>
                      <option value="positive">Tudo Certo / Bem Localizado</option>
                      <option value="warning_other">Outros</option>
                    </select>
                    <textarea 
                      placeholder="O que está acontecendo neste ponto?"
                      value={reportDescription}
                      onChange={e => setReportDescription(e.target.value)}
                      className={styles.inlineTextarea}
                      required
                    />
                    <div className={styles.formButtons}>
                      <button type="button" onClick={() => setShowReportForm(false)} className={styles.cancelBtn}>Cancelar</button>
                      <button type="submit" className={styles.submitBtn} disabled={submittingReport}>
                        {submittingReport ? 'Enviando...' : 'Enviar Relato'}
                      </button>
                    </div>
                  </form>
                ) : loadingStopReports ? (
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Carregando relatos...</p>
                ) : stopReports.length > 0 ? (
                  <div className={styles.reportsList}>
                    {stopReports.map(r => {
                      const date = new Date(r.created_at);
                      const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                      const dateStr = date.toLocaleDateString('pt-BR');
                      
                      return (
                        <div key={r.id} className={`${styles.reportCardMini} ${styles[`type_${r.type}`]}`}>
                          <div className={styles.reportMetaMini}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#1c4f36', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold', overflow: 'hidden' }}>
                                {r.perfis?.foto ? <img src={r.perfis.foto} alt="Av" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (r.perfis?.nome ? r.perfis.nome[0] : (r.author ? r.author[0] : 'A'))}
                              </div>
                              <span className={styles.reportAuthorMini}>{r.perfis?.nome || r.author || 'Anônimo'}</span>
                            </div>
                            <span className={styles.reportDateMini}>{dateStr} • {timeStr}</span>
                          </div>
                          <p className={styles.reportTextMini}>{r.description}</p>
                          
                          <div className={styles.reportActions}>
                            <button 
                              className={`${styles.actionBtn} ${reportStats[r.id]?.isLiked ? styles.activeLike : ''}`}
                              onClick={() => handleLike(r.id, r.user_id)}
                              title="Útil"
                            >
                              <Heart size={14} fill={reportStats[r.id]?.isLiked ? "currentColor" : "none"} />
                              <span>{reportStats[r.id]?.likes || 0}</span>
                            </button>

                            <button 
                              className={`${styles.actionBtn} ${reportStats[r.id]?.isDisliked ? styles.activeDislike : ''}`}
                              onClick={() => handleDislike(r.id)}
                              title="Não útil"
                            >
                              <ThumbsDown size={14} fill={reportStats[r.id]?.isDisliked ? "currentColor" : "none"} />
                              <span>{reportStats[r.id]?.dislikes || 0}</span>
                            </button>
                            
                            <button 
                              className={styles.actionBtn}
                              onClick={() => activeReplyReportId === r.id ? setActiveReplyReportId(null) : loadReplies(r.id)}
                              title="Responder"
                            >
                              <MessageCircle size={14} />
                              <span>{reportStats[r.id]?.replies || 0}</span>
                            </button>
                          </div>

                          {activeReplyReportId === r.id && (
                            <div className={styles.repliesContainer}>
                              <div className={styles.repliesList}>
                                {(reportReplies[r.id] || []).map(rp => {
                                  const date = new Date(rp.created_at);
                                  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                  return (
                                    <div key={rp.id} className={styles.replyItem}>
                                      <div className={styles.replyHeader}>
                                        <strong className={styles.replyAuthor}>{rp.author_name}</strong>
                                        <span className={styles.replyTime}>{timeStr}</span>
                                      </div>
                                      <span className={styles.replyContent}>{rp.content}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className={styles.replyInputBox}>
                                <input 
                                  type="text" 
                                  placeholder="Escreva uma resposta..." 
                                  value={replyContent}
                                  onChange={e => setReplyContent(e.target.value)}
                                  onKeyPress={e => e.key === 'Enter' && handleReplySubmit(r.id)}
                                />
                                <button onClick={() => handleReplySubmit(r.id)}>Responder</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.emptyReports}>
                    <MessageSquare size={48} />
                    <span>Nenhum relato sobre este ponto ainda</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
