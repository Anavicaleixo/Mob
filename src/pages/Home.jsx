import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MapPin, ChevronRight, Star, Smile, Frown, AlertCircle, Bus } from 'lucide-react';
import { storage } from '../services/storage';
import { linesDetailData } from '../data/linesData';
import LineModal from '../components/LineModal/LineModal';
import { useAuth } from '../contexts/AuthContext';
import styles from './Home.module.css';

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [popularLines, setPopularLines] = useState([]);
  const [allLines, setAllLines] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLine, setSelectedLine] = useState(null);
  const [nearbyStops, setNearbyStops] = useState([]);
  const [counts, setCounts] = useState({ lines: 0, reports: 0, negatives: 0 });


  const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371e3; 
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
  };

  const handleLineClick = (line) => {
    const detail = line.detalhes || linesDetailData[line.name];
    if (detail) {
      setSelectedLine(detail);
    } else {
      setSelectedLine({
        number: line.name,
        title: line.description || `Linha ${line.name}`,
        description: line.description || 'Sem descrição disponível.',
        frequency: {},
        forward: null,
        return: null,
        notes: [],
      });
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [popLinesData, allLinesData, reportsData, allStopsData] = await Promise.all([
          storage.getPopularLines(),
          storage.getLines(),
          storage.getReports(),
          storage.getStops()
        ]);
        const filteredLines = allLinesData.slice(0, 4);
        setPopularLines(filteredLines);
        setAllLines(allLinesData);
        setReports(reportsData.slice(0, 3));
        
        setCounts({
          lines: allLinesData.length,
          reports: reportsData.length,
          negatives: reportsData.filter(r => r.type === 'negative').length
        });

        // Calcular pontos próximos se houver localização salva
        const savedLocation = JSON.parse(localStorage.getItem('mobtracker_user_location'));
        if (savedLocation && allStopsData) {
          const sortedStops = allStopsData
            .map(stop => {
              const stopLat = Number(stop.lat);
              const stopLng = Number(stop.lng);
              const dist = getDistance(savedLocation.lat, savedLocation.lng, stopLat, stopLng);
              return {
                ...stop,
                distance: dist
              };
            })
            .filter(stop => stop.distance <= 2000) // Limita a 2km
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 3);
          setNearbyStops(sortedStops);
        }
      } catch (error) {
        console.error("Erro ao buscar dados", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [location.key]);

  const getReportIcon = (type) => {
    switch (type) {
      case 'positive': return <Smile size={24} color="#10b981" />;
      case 'negative': return <Frown size={24} color="#ef4444" />;
      case 'warning': return <Frown size={24} color="#f59e0b" />;
      default: return <Smile size={24} color="#10b981" />;
    }
  };

  const getReportClass = (type) => {
    switch (type) {
      case 'positive': return styles.reportPositive;
      case 'negative': return styles.reportNegative;
      case 'warning': return styles.reportWarning;
      default: return '';
    }
  };

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.locationBadge}>
          <MapPin size={16} color="white" /> Caçapava - SP
        </div>
        <h1 className={styles.heroTitle}>
          Mobilidade urbana<br/>
          <span>colaborativa</span>
        </h1>
        <p className={styles.heroSubtitle}>
          Registre relatos, acompanhe avaliações e ajude a pressionar por melhorias no transporte público de Caçapava
        </p>
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>{counts.lines}</span>
            <span className={styles.statLabel}>Linhas</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>{counts.reports}</span>
            <span className={styles.statLabel}>Relatos</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>{counts.negatives}</span>
            <span className={styles.statLabel}>Reclamações</span>
          </div>
        </div>
      </section>

      {/* Linhas em Destaque */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Linhas em destaque</h2>
            <p className={styles.sectionSubtitle}>Explore as linhas mais acessadas e comentadas pela comunidade</p>
          </div>
          <Link to="/linhas" className={styles.viewAllBtn}>
            Ver todas <ChevronRight size={16} color="white" />
          </Link>
        </div>

        <div className={styles.imageReferenceGrid}>
          {popularLines.map((line) => (
            <div 
              key={line.id} 
              className={styles.referenceCard}
              onClick={() => handleLineClick(line)}
              role="button"
              tabIndex={0}
            >
              <div className={styles.referenceBadge}>{line.name}</div>
              <div className={styles.referenceContent}>
                <div className={styles.referenceHeader}>
                  <div className={styles.referenceTag} style={{ background: '#fff7ed', color: '#c2410c' }}>
                    <Star size={12} fill="#f97316" color="#f97316" /> Destaque
                  </div>
                  <ChevronRight size={18} className={styles.referenceChevron} color="#f97316" />
                </div>
                <h3 className={styles.referenceTitle}>LINHA {line.name} - {line.description}</h3>
                <p className={styles.referenceRoute}>{line.route || 'Centro ➔ Bairros'}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pontos Próximos */}
      {user && (
        <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Pontos próximos à você</h2>
            <p className={styles.sectionSubtitle}>Com base na sua localização salva</p>
          </div>
          <Link to="/pontos" className={styles.viewAllBtn}>
            Ver mapa <ChevronRight size={16} color="white" />
          </Link>
        </div>

        {nearbyStops.length > 0 ? (
          <div className={styles.imageReferenceGrid}>
            {nearbyStops.map((stop) => (
              <div key={stop.id} className={styles.referenceCard} onClick={() => navigate('/pontos')}>
                <div className={styles.referenceBadge} style={{ background: 'var(--color-primary)' }}>
                  <MapPin size={24} color="white" />
                </div>
                <div className={styles.referenceContent}>
                  <div className={styles.referenceHeader}>
                    <div className={styles.referenceTag} style={{ background: '#dcfce7', color: '#166534' }}>
                       Próximo
                    </div>
                    <ChevronRight size={18} className={styles.referenceChevron} color="white" />
                  </div>
                  <h3 className={styles.referenceTitle}>{stop.name}</h3>
                  <p className={styles.referenceRoute}>
                    {stop.distance < 1000 
                      ? `${Math.round(stop.distance)} metros de distância` 
                      : `${(stop.distance / 1000).toFixed(1)} km de distância`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyNearby}>
            <MapPin size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} color="white" />
            <p>Nenhum ponto encontrado em um raio de 2km da sua localização.</p>
            <Link to="/pontos" style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none', marginTop: '0.5rem', display: 'inline-block' }}>
              Explorar outros pontos no mapa →
            </Link>
          </div>
        )}
      </section>
      )}

      {/* Últimos Relatos */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Últimos relatos da comunidade</h2>
            <p className={styles.sectionSubtitle}>Veja o que os passageiros estão dizendo</p>
          </div>
          <Link to="/linhas" className={styles.viewAllBtn}>
            Ver linhas <ChevronRight size={16} color="white" />
          </Link>
        </div>

        <div className={styles.reportsList}>
          {reports.map((report) => {
            // No schema atual o line_id de reports armazena a string do nome da linha (ex: "01")
            const line = allLines.find(l => l.name === report.lineId) || { name: report.lineId, description: 'Desconhecida' };
            return (
              <div key={report.id} className={`${styles.reportCard} ${getReportClass(report.type)}`}>
                <div className={styles.reportIcon}>
                  {getReportIcon(report.type)}
                </div>
                <div className={styles.reportContent}>
                  <div className={styles.reportLine}>LINHA {line.name} - {line.description.split('X')[0]}</div>
                  <div className={styles.reportDesc}>{report.description}</div>
                  <div className={styles.reportAuthor}>{report.author}</div>
                </div>
              </div>
            );
          })}

          {/* Contribute Card */}
          <div className={styles.ctaCard}>
            <div className={styles.ctaIcon}>
              <Bus size={28} color="white" />
            </div>
            <h3 className={styles.ctaTitle}>Contribua com sua experiência</h3>
            <p className={styles.ctaDesc}>Cada relato ajuda a construir um mapa de confiabilidade e pressionar por melhorias no transporte público.</p>
            <Link to="/linhas" className={styles.ctaBtn} style={{textDecoration: 'none'}}>Comentar uma linha <ChevronRight size={16} color="white" /></Link>
          </div>
        </div>
      </section>

      {/* Modal */}
      {selectedLine && (
        <LineModal
          lineDetail={selectedLine}
          onClose={() => setSelectedLine(null)}
        />
      )}
    </div>
  );
}
