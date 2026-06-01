import React, { useEffect, useState, Component, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { 
  Flag, Map as MapIcon, AlertTriangle, Star, Search, MapPin, 
  Navigation, Clock, X, ChevronRight, Locate, Route, Menu, 
  RefreshCw, Bus, Activity, MessageSquare, Plus, Umbrella, 
  Accessibility, Armchair, CheckCircle, Bell, Heart, MessageCircle, 
  ThumbsDown, Minus
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
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;
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
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div style={{ padding: '20px', color: 'red' }}>Erro ao carregar mapa.</div>;
    return this.props.children;
  }
}
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
function RoutingMachine({ origin, destination }) {
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
      createMarker: () => null,
      show: false
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
  const [viewMode, setViewMode] = useState('map');
  const [activeTab, setActiveTab] = useState('departures');
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
  const [reportReplies, setReportReplies] = useState({});
  const [allReports, setAllReports] = useState([]);
  const [loadingAllReports, setLoadingAllReports] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
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
  const [trackedBusId, setTrackedBusId] = useState(null);
  const [mapLayer, setMapLayer] = useState('roadmap');
  const [showTraffic, setShowTraffic] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filterCoverage, setFilterCoverage] = useState(false);
  const [filterBench, setFilterBench] = useState(false);
  const [filterAccessible, setFilterAccessible] = useState(false);
  const [cep, setCep] = useState(localStorage.getItem('mobtracker_user_cep') || '');
  const [houseNumber, setHouseNumber] = useState(localStorage.getItem('mobtracker_user_number') || '');
  const [address, setAddress] = useState(JSON.parse(localStorage.getItem('mobtracker_user_address') || 'null'));
  const [loadingCep, setLoadingCep] = useState(false);
  const tripIntervalRef = useRef(null);
  const baseLinesRef = useRef([]);
  const lineRatingsMap = useRef({});
  const mapRef = useRef(null);
  const { user } = useAuth();
  const location = useLocation();
  const openInWaze = (lat, lng) => {
    window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
  };
  const openInGoogleMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };
  const fetchAddress = async (cepValue, numberValue) => {
    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;
    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        let query = `${data.logradouro}, ${numberValue || ''}, ${data.localidade}, SP, Brasil`;
        let geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        let geoData = await geoRes.json();
        if (!geoData || geoData.length === 0) {
          query = `${data.logradouro}, ${data.bairro}, ${data.localidade}, SP, Brasil`;
          geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
          geoData = await geoRes.json();
        }
        if (geoData && geoData.length > 0) {
          const newCoords = { lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) };
          return { address: data, coords: newCoords };
        }
        if (data.localidade && data.localidade.toLowerCase() === 'caçapava') {
           return { address: data, coords: { lat: -23.100, lng: -45.700 } };
        }
        return { address: data, coords: null };
      }
    } catch (error) {
      console.error("Erro ao buscar CEP", error);
    } finally {
      setLoadingCep(false);
    }
    return null;
  };
  const handleSaveCep = async () => {
    setLoadingCep(true);
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
        if (mapRef.current) {
          mapRef.current.setView([result.coords.lat, result.coords.lng], 16);
        }
        Swal.fire({
          icon: 'success',
          title: 'Localização Atualizada',
          text: 'Seu endereço foi encontrado!',
          confirmButtonColor: '#10b981'
        });
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Atenção',
          text: 'Endereço encontrado, mas não localizado no mapa.',
          confirmButtonColor: '#10b981'
        });
      }
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'CEP não encontrado.',
        confirmButtonColor: '#10b981'
      });
    }
    setLoadingCep(false);
  };
  const toggleFavorite = async (stopId) => {
    if (user) {
      try {
        const isAdded = await storage.toggleFavorite(user.id, stopId);
        if (isAdded) {
          setFavorites(prev => [...prev, stopId]);
        } else {
          setFavorites(prev => prev.filter(id => id !== stopId));
        }
      } catch (err) {
        console.error("Erro ao favoritar:", err);
        Swal.fire({ 
          icon: 'error', 
          title: 'Erro ao Salvar', 
          text: err.message,
          confirmButtonColor: '#10b981'
        });
      }
    } else {
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
        text: 'Faça login para salvar favoritos permanentemente!',
        confirmButtonColor: '#10b981'
      });
    }
  };
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
          title: 'Você curtiu o relato! +2 MobPontos',
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
          title: 'Relato marcado como não útil!',
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
        text: 'Seu relato foi enviado com sucesso! +10 MobPontos!',
        confirmButtonColor: '#10b981'
      });
      setReportDescription('');
      setShowReportForm(false);
      const reports = await storage.getReportsByStop(selectedStop.id?.toString());
      setStopReports(reports);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Erro ao Enviar',
        text: err.message,
        confirmButtonColor: '#10b981'
      });
    } finally {
      setSubmittingReport(false);
    }
  };
  const planJourney = () => {
    if (!targetLocation) return;
    if (!stops || stops.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Aguarde',
        text: 'Carregando dados dos pontos...',
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }
    setIsLoadingRoute(true);
    setAlertActive(false);
    try {
      const normalizedStops = stops.map(s => ({
        ...s,
        lines: Array.isArray(s.lines) ? s.lines : [],
        lat: Number(s.lat),
        lng: Number(s.lng)
      }));
      let originStop = null;
      const originInput = originLocation || 'Minha Localização Atual';
      if (originInput !== 'Minha Localização Atual' && originInput.trim() !== '') {
        originStop = normalizedStops.find(s => 
          s.name?.toLowerCase().includes(originInput.toLowerCase()) || 
          s.location?.toLowerCase().includes(originInput.toLowerCase())
        );
      }
      if (!originStop && userLocation) {
        let minDistUser = Infinity;
        normalizedStops.forEach(s => {
          const d = trafficService.calculateDistance(userLocation.lat, userLocation.lng, s.lat, s.lng);
          if (d < minDistUser) {
            minDistUser = d;
            originStop = s;
          }
        });
      }
      if (!originStop) originStop = normalizedStops[0];
      const dStop = normalizedStops.find(s => 
        s.name?.toLowerCase().includes(targetLocation.toLowerCase()) || 
        s.location?.toLowerCase().includes(targetLocation.toLowerCase())
      ) || normalizedStops[Math.min(5, normalizedStops.length - 1)];
      if (!originStop || !dStop) throw new Error("Paradas não encontradas");
      const oLines = (originStop.lines || []).map(l => String(l));
      const dLines = (dStop.lines || []).map(l => String(l));
      const commonLines = oLines.filter(line => dLines.includes(line));
      let finalLine = oLines[0] || '01';
      if (commonLines.length > 0) {
        finalLine = commonLines[Math.floor(Math.random() * commonLines.length)];
      } else if (dLines.length > 0) {
        finalLine = dLines[0];
      }
      const dist = trafficService.calculateDistance(originStop.lat, originStop.lng, dStop.lat, dStop.lng);
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
        text: 'Erro ao calcular rota. Tente novamente.',
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
        const stopIdx = Math.min(Math.floor((next / 100) * stopsSequence.length), stopsSequence.length - 1);
        setCurrentStopIndex(stopIdx);
        const remainingPercent = (100 - next) / 100;
        const remainingMin = Math.ceil(routeResult.duration * remainingPercent);
        setEta(Math.max(0, remainingMin));
        if (destinationStreet && stopsSequence[stopIdx]?.name?.toLowerCase().includes(destinationStreet.toLowerCase())) {
          setAlertActive(true);
        }
        return next;
      });
    }, stepInterval);
  };
  const submitRating = async () => {
    if (!activeTrip) return;
    try {
      if (user) {
        await storage.addTrip(user.id, activeTrip.line);
      }
      await storage.addRating({
        lineId: activeTrip.line,
        userId: user?.id,
        type: 'line',
        value: selectedRating
      });
      await storage.addRating({
        lineId: activeTrip.line,
        userId: user?.id,
        type: 'driver',
        value: selectedRating
      });
      Swal.fire({
        icon: 'success',
        title: 'Viagem Concluída!',
        text: 'Obrigado por avaliar!',
        confirmButtonColor: '#10b981'
      });
    } catch (err) {
      console.error("Erro ao salvar avaliação:", err);
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
  useEffect(() => {
    if (location.state?.filterFavorites) {
      setShowOnlyFavorites(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  useEffect(() => {
    async function load() {
      try {
        const [s, l] = await Promise.all([
          storage.getStops(),
          storage.getLines()
        ]);
        let finalStops = Array.isArray(s) && s.length > 0 ? s : stopsData;
        const normalized = finalStops.map(stop => {
          let stopLines = Array.isArray(stop.lines) ? stop.lines : [];
          const nameLower = (stop.name || '').toLowerCase();
          if ((nameLower.includes('terminal') || nameLower.includes('rodoviária')) && stopLines.length === 0 && l && l.length > 0) {
            stopLines = l.map(line => line.name || line.numero).slice(0, 6);
          }
          return {
            ...stop,
            id: stop.id?.toString(),
            lines: stopLines,
            lat: Number(stop.lat),
            lng: Number(stop.lng)
          };
        });
        const stopsWithInfra = normalized.map(stop => {
          const isMainPoint = stop.name?.toLowerCase().includes('terminal') || 
                              stop.name?.toLowerCase().includes('rodoviária');
          return {
            ...stop,
            infra: {
              cobertura: stop.cobertura !== undefined ? stop.cobertura : (stop.coverage !== undefined ? stop.coverage : (isMainPoint ? true : false)),
              banco: stop.banco !== undefined ? stop.banco : (stop.bench !== undefined ? stop.bench : (isMainPoint ? true : false)),
              acessivel: stop.acessivel !== undefined ? stop.acessivel : (stop.accessible !== undefined ? stop.accessible : (isMainPoint ? true : false))
            }
          };
        });
        setStops(stopsWithInfra);
        setFilteredStops(stopsWithInfra);
        baseLinesRef.current = l || [];
        if (l && l.length > 0) {
          const ratingsPromises = l.map(line => storage.getLineRatings(line.numero || line.name));
          const ratingsResults = await Promise.all(ratingsPromises);
          const map = {};
          l.forEach((line, idx) => {
            map[line.numero || line.name] = ratingsResults[idx];
          });
          lineRatingsMap.current = map;
        }
        if (user) {
          const cloudFavs = await storage.getFavorites(user.id);
          setFavorites(cloudFavs.map(id => id.toString()));
        } else {
          const savedFavs = localStorage.getItem('mobtracker_favorites');
          if (savedFavs) setFavorites(JSON.parse(savedFavs));
        }
        const rep = await storage.getReports();
        setAllReports(rep);
      } catch (err) {
        console.error("Load error:", err);
      } finally {
        setLoading(false);
        setLoadingAllReports(false);
      }
    }
    load();
  }, [user]);
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
  useEffect(() => {
    if (selectedStop) {
      async function loadStopReports() {
        setLoadingStopReports(true);
        try {
          const reports = await storage.getReportsByStop(selectedStop.id?.toString());
          setStopReports(reports);
          const stats = {};
          await Promise.all(reports.map(async (r) => {
            const s = await storage.getReportStats(r.id, user?.id);
            stats[r.id] = s;
          }));
          setReportStats(stats);
        } catch (err) {
          console.error("Erro ao carregar relatos:", err);
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
            setUserLocation({ lat: -23.100, lng: -45.700 });
          }
        );
      }
    }
  }, [activeTab]);
  useEffect(() => {
    if (activeTab === 'nearby' && userLocation) {
      setLoadingNearby(true);
      const stopsWithDistance = stops
        .filter(s => s?.lat && s?.lng && !isNaN(s.lat) && !isNaN(s.lng))
        .map(stop => {
          const distance = trafficService.calculateDistance(
            userLocation.lat, 
            userLocation.lng, 
            stop.lat, 
            stop.lng
          );
          const walkingTime = trafficService.calculateWalkingTime(distance);
          return {
            ...stop,
            distToUser: distance,
            walkingTime: walkingTime,
            arrivalTime: trafficService.getArrivalTime(walkingTime)
          };
        })
        .sort((a, b) => a.distToUser - b.distToUser)
        .slice(0, 10); 
      console.log('[Mapa] Pontos próximos encontrados:', stopsWithDistance.length);
      console.log('[Mapa] Detalhes:', stopsWithDistance.map(s => `${s.name}: ${Math.round(s.distToUser)}m (${s.walkingTime}min)`));
      setRawNearbyStops(stopsWithDistance);
      setLoadingNearby(false);
    }
  }, [activeTab, userLocation, stops]);
  useEffect(() => {
    let sourceStops = activeTab === 'nearby' ? rawNearbyStops : stops;
    if (activeTab === 'nearby' && !userLocation) {
      setFilteredStops([]);
      return;
    }
    let filtered = sourceStops;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.location?.toLowerCase().includes(q) ||
        (Array.isArray(s.lines) && s.lines.some(l => l.toString().toLowerCase().includes(q)))
      );
    }
    if (filterCoverage) filtered = filtered.filter(s => s.infra?.cobertura);
    if (filterBench) filtered = filtered.filter(s => s.infra?.banco);
    if (filterAccessible) filtered = filtered.filter(s => s.infra?.acessivel);
    if (showOnlyFavorites) {
      filtered = filtered.filter(s => favorites.includes(s.id?.toString()) || favorites.includes(Number(s.id)));
    }
    setFilteredStops(filtered);
  }, [activeTab, rawNearbyStops, stops, userLocation, searchTerm, filterCoverage, filterBench, filterAccessible, showOnlyFavorites, favorites]);
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
                              <strong style={{ fontSize: '1.1rem', color: '#1e293b' }}>{stop.name}</strong>
                            </div>
                            <div className={styles.popupBody}>
                              <p style={{ margin: '0 0 0.5rem 0', color: '#64748b', fontSize: '0.9rem' }}>
                                <MapPin size={14} style={{ marginRight: '4px' }} />
                                {stop.location}
                              </p>
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
                        <h3 className={styles.stopTitle}>{stop.name}</h3>
                        <div className={styles.stopSubInfo}>
                          <Bus size={14} />
                          <span>{Array.isArray(stop.lines) ? `Linha ${stop.lines.join(', ')}` : 'Nenhuma linha'} • {stop.location}</span>
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
                <h2>Pontos Mais Próximos a Você</h2>
              </div>
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
                      Localizando sua posição...
                    </span>
                  </div>
                ) : filteredStops.length > 0 ? (
                  filteredStops.map(stop => {
                    const walkingTimeMinutes = stop.walkingTime || Math.round(stop.distToUser / 1000 * 12);
                    const arrivalTimeFormatted = stop.arrivalTime || trafficService.getArrivalTime(walkingTimeMinutes);
                    let distanceText = '';
                    if (stop.distToUser >= 1000) {
                      distanceText = `${(stop.distToUser / 1000).toFixed(1)} km`;
                    } else {
                      distanceText = `${Math.round(stop.distToUser || 0)} m`;
                    }
                    return (
                      <div key={stop.id} className={styles.stopCardList} onClick={() => setSelectedStop(stop)}>
                        <div className={styles.stopIconBox}>
                          <MapPin size={30} fill="rgba(255,255,255,0.2)" />
                        </div>
                        <div className={styles.stopMainInfo}>
                          <h3 className={styles.stopTitle}>{stop.name}</h3>
                          <div className={styles.stopSubInfo}>
                            <Bus size={14} />
                            <span>{Array.isArray(stop.lines) ? `Linha ${stop.lines.join(', ')}` : 'Nenhuma linha'} • {stop.location}</span>
                          </div>
                          <div className={styles.proximityInfo}>
                            <span className={styles.distText}>
                              {distanceText} de você
                            </span>
                            <span className={styles.timeText}>
                              <Clock size={12} /> {walkingTimeMinutes} min a pé • Chegada às {arrivalTimeFormatted}
                            </span>
                          </div>
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
                        ? "Não encontramos nenhum ponto correspondente à sua busca num raio de 2km."
                        : `Não encontramos pontos de ônibus num raio de 2km. Tente um CEP diferente.`}
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