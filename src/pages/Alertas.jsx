import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  Info, 
  Clock, 
  MapPin, 
  Filter, 
  ChevronRight,
  ShieldAlert,
  Wrench,
  Activity,
  RefreshCw,
  X
} from 'lucide-react';
import { storage } from '../services/storage';
import styles from './Alertas.module.css';

export default function Alertas() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
  const [selectedAlert, setSelectedAlert] = useState(null);

  useEffect(() => {
    async function loadAlerts() {
      try {
        const data = await storage.getAlerts();
        setAlerts(data);
      } catch (err) {
        console.error("Erro ao carregar alertas:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAlerts();
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'aviso': return <AlertTriangle size={20} />;
      case 'alteracao': return <RefreshCw size={20} />;
      case 'nova_linha': return <Activity size={20} />;
      case 'info': return <Info size={20} />;
      default: return <Bell size={20} />;
    }
  };

  const getCategoryLabel = (type) => {
    switch (type) {
      case 'aviso': return 'Aviso';
      case 'alteracao': return 'Alteração';
      case 'nova_linha': return 'Nova Linha';
      case 'info': return 'Informativo';
      default: return 'Geral';
    }
  };

  const getTimeAgo = (dateStr) => {
    const now = new Date();
    const alertDate = new Date(dateStr);
    const diffMs = now - alertDate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'agora mesmo';
    if (diffMins < 60) return `há ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `há ${diffHours} h`;
    return alertDate.toLocaleDateString('pt-BR');
  };

  const getGuidance = (type) => {
    switch (type) {
      case 'aviso':
        return [
          "Considere buscar rotas alternativas imediatas.",
          "Evite áreas de congestionamento relatadas.",
          "O tempo de espera pode ser superior ao normal."
        ];
      case 'alteracao':
        return [
          "Verifique o novo quadro de horários no app.",
          "Fique atento a possíveis mudanças de pontos de parada.",
          "O itinerário antigo pode não ser mais válido."
        ];
      case 'nova_linha':
        return [
          "Explore o novo itinerário completo no mapa.",
          "Confira os horários de partida e chegada.",
          "Esta linha pode ser uma opção mais rápida para você."
        ];
      case 'info':
        return [
          "Acompanhe as notícias para melhor planejar seu dia.",
          "Mantenha as notificações ativas para avisos urgentes.",
          "Compartilhe informações relevantes com outros passageiros."
        ];
      default:
        return [
          "Acompanhe o mapa em tempo real para atualizações.",
          "Planeje sua viagem com antecedência.",
          "Relate qualquer irregularidade que encontrar."
        ];
    }
  };

  const filteredAlerts = filter === 'todos' 
    ? alerts 
    : alerts.filter(a => a.type === filter);

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div className={styles.headerOverlay}></div>
        <div className={styles.headerContent}>
          <div className={styles.liveIndicator}>
            <span className={styles.monitorBadge}>
              <Activity size={14} /> Monitoramento em tempo real
            </span>
          </div>
          
          <div className={styles.mainTitleGroup}>
            <h1 className={styles.title}>Alertas</h1>
            <div className={styles.liveBadge}>
              <div className={styles.pulse}></div>
              AO VIVO
            </div>
          </div>
          
          <p className={styles.subtitle}>Informações e avisos em tempo real dos pontos e linhas</p>
        </div>
      </header>

      <div className={styles.filterSection}>
        <div className={styles.filterBar}>
          {['todos', 'aviso', 'alteracao', 'nova_linha', 'info'].map(f => (
            <button 
              key={f}
              className={`${styles.pill} ${filter === f ? styles.active : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'todos' ? 'Todos' : getCategoryLabel(f)}
            </button>
          ))}
        </div>
      </div>

      <main className={styles.mainContent}>
        {loading ? (
          <div className={styles.loadingState}>Carregando alertas...</div>
        ) : filteredAlerts.length > 0 ? (
          <div className={styles.alertsGrid}>
            {filteredAlerts.map(alert => (
              <div key={alert.id} className={`${styles.alertCard} ${styles[alert.type] || ''}`}>
                <div className={styles.cardHeader}>
                  <div className={styles.iconBox}>
                    {getIcon(alert.type)}
                  </div>
                  <div className={styles.categoryInfo}>
                    <span className={styles.categoryName}>{getCategoryLabel(alert.type)}</span>
                    <span className={styles.alertTime}>{getTimeAgo(alert.created_at)}</span>
                  </div>
                </div>
                
                <div className={styles.cardBody}>
                  <h3 className={styles.alertTitle}>{alert.title}</h3>
                  <p className={styles.alertDesc}>{alert.description}</p>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.locationInfo}>
                    <MapPin size={14} />
                    <span>{alert.location || 'Geral'}</span>
                  </div>
                  <button 
                    className={styles.detailsBtn}
                    onClick={() => setSelectedAlert(alert)}
                  >
                    Ver detalhes <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Bell size={48} opacity={0.2} />
            <p>Nenhum alerta {filter !== 'todos' ? 'desta categoria' : ''} no momento.</p>
          </div>
        )}
      </main>

      {/* Modal de Detalhes */}
      {selectedAlert && (
        <div className={styles.modalOverlay} onClick={() => setSelectedAlert(null)}>
          <div className={`${styles.modalContent} ${styles[selectedAlert.type] || ''}`} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setSelectedAlert(null)}>
              <X size={24} />
            </button>

            <div className={styles.modalHeader}>
              <div className={`${styles.iconBox} ${styles[selectedAlert.type]}`}>
                {getIcon(selectedAlert.type)}
              </div>
              <div>
                <span className={styles.modalCategory}>{getCategoryLabel(selectedAlert.type)}</span>
                <h2 className={styles.modalTitle}>{selectedAlert.title}</h2>
              </div>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <Clock size={18} />
                  <div className={styles.detailText}>
                    <label>Publicado em</label>
                    <span>{new Date(selectedAlert.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
                
                <div className={styles.detailItem}>
                  <MapPin size={18} />
                  <div className={styles.detailText}>
                    <label>Local afetado</label>
                    <span>{selectedAlert.location || 'Geral'}</span>
                  </div>
                </div>

                <div className={styles.detailItem}>
                  <Activity size={18} />
                  <div className={styles.detailText}>
                    <label>Status</label>
                    <span className={styles.statusBadge}>Em andamento</span>
                  </div>
                </div>

                <div className={styles.detailItem}>
                  <AlertTriangle size={18} />
                  <div className={styles.detailText}>
                    <label>Nível de Impacto</label>
                    <span className={styles.impactText}>Moderado</span>
                  </div>
                </div>
              </div>
              
              <div className={styles.descriptionBox}>
                <h3>Ocorrência Detalhada</h3>
                <p>{selectedAlert.description}</p>
              </div>

              <div className={styles.guidanceBox}>
                <h3>Orientações ao Passageiro</h3>
                <ul>
                  {getGuidance(selectedAlert.type).map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className={styles.sourceFooter}>
                <ShieldAlert size={14} />
                <span>Fonte: Centro de Monitoramento MobTracker</span>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.primaryBtn} onClick={() => setSelectedAlert(null)}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
