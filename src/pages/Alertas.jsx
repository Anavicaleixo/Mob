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
  Activity,
  RefreshCw,
  X,
  Trash2,
  Plus,
  Edit2,
  Save,
  XCircle
} from 'lucide-react';
import { storage } from '../services/storage';
import styles from './Alertas.module.css';
import Swal from 'sweetalert2';

export default function Alertas() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
  // Removed modal state; details now shown via SweetAlert
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'info',
    location: ''
  });

  useEffect(() => {
    async function loadAlerts() {
      try {
        const data = await storage.getAlerts();
        setAlerts(data);
        
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        setIsAdmin(currentUser?.isAdmin || false);
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

  const handleCreateAlert = async () => {
    if (!formData.title || !formData.description) {
      await Swal.fire({
        icon: 'warning',
        title: 'Campos obrigatórios',
        text: 'Preencha o título e a descrição do alerta.',
        confirmButtonColor: '#1c4f36'
      });
      return;
    }

    try {
      await storage.createAlert(formData);
      const updatedAlerts = await storage.getAlerts();
      setAlerts(updatedAlerts);
      setShowCreateModal(false);
      setFormData({ title: '', description: '', type: 'info', location: '' });
      
      await Swal.fire({
        icon: 'success',
        title: 'Alerta criado!',
        text: 'O alerta foi publicado com sucesso.',
        confirmButtonColor: '#1c4f36',
        timer: 2000
      });
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Erro ao criar',
        text: err.message,
        confirmButtonColor: '#1c4f36'
      });
    }
  };

  const handleEditAlert = async () => {
    if (!formData.title || !formData.description) {
      await Swal.fire({
        icon: 'warning',
        title: 'Campos obrigatórios',
        text: 'Preencha o título e a descrição do alerta.',
        confirmButtonColor: '#1c4f36'
      });
      return;
    }

    try {
      await storage.updateAlert(editingAlert.id, formData);
      const updatedAlerts = await storage.getAlerts();
      setAlerts(updatedAlerts);
      setEditingAlert(null);
      setFormData({ title: '', description: '', type: 'info', location: '' });
      
      if (selectedAlert?.id === editingAlert.id) {
        setSelectedAlert(null);
      }
      
      await Swal.fire({
        icon: 'success',
        title: 'Alerta atualizado!',
        text: 'O alerta foi atualizado com sucesso.',
        confirmButtonColor: '#1c4f36',
        timer: 2000
      });
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Erro ao atualizar',
        text: err.message,
        confirmButtonColor: '#1c4f36'
      });
    }
  };

  const handleViewDetails = async (alert) => {
    const guidance = getGuidance(alert.type).join('<br/>');
    await Swal.fire({
      title: `<strong>${alert.title}</strong>`,
      html: `
        <p>${alert.description}</p>
        <hr/>
        <p><strong>Local:</strong> ${alert.location || 'Geral'}</p>
        <p><strong>Publicado em:</strong> ${new Date(alert.created_at).toLocaleString('pt-BR')}</p>
        <p><strong>Orientações:</strong><br/>${guidance}</p>
      `,
      icon: 'info',
      confirmButtonColor: '#1c4f36',
      width: '500px',
      showCloseButton: true
    });
  };

  const handleDeleteAlert = async (alert) => {
    const result = await Swal.fire({
      title: 'Excluir Alerta',
      html: `
        <div style="text-align: left;">
          <p>Tem certeza que deseja excluir este alerta?</p>
          <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-top: 12px;">
            <strong style="color: #1C3A2E;">${alert.title}</strong>
            <p style="font-size: 14px; color: #64748b; margin-top: 8px;">${alert.description.substring(0, 100)}...</p>
          </div>
          <p style="color: #dc2626; margin-top: 12px; font-size: 14px;">⚠️ Esta ação não pode ser desfeita!</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await storage.deleteAlert(alert.id);
        setAlerts(prevAlerts => prevAlerts.filter(a => a.id !== alert.id));
        
        await Swal.fire({
          icon: 'success',
          title: 'Excluído!',
          text: 'O alerta foi removido com sucesso.',
          confirmButtonColor: '#1c4f36',
          timer: 2000
        });
      } catch (err) {
        await Swal.fire({
          icon: 'error',
          title: 'Erro ao excluir',
          text: err.message,
          confirmButtonColor: '#1c4f36'
        });
      }
    }
  };

  const openEditModal = (alert) => {
    setEditingAlert(alert);
    setFormData({
      title: alert.title,
      description: alert.description,
      type: alert.type,
      location: alert.location || ''
    });
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
          {isAdmin && (
            <button 
              className={`${styles.pill} ${styles.createBtn}`}
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} /> Novo Alerta
            </button>
          )}
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
                  {isAdmin && (
                    <div className={styles.cardActions}>
                      <button 
                        className={styles.editBtn}
                        onClick={() => openEditModal(alert)}
                        title="Editar alerta"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className={styles.deleteBtn}
                        onClick={() => handleDeleteAlert(alert)}
                        title="Excluir alerta"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
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
                    onClick={() => handleViewDetails(alert)}
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

      {/* Modal de Criar Alerta */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setShowCreateModal(false)}>
              <X size={24} />
            </button>
            
            <div className={styles.modalHeader}>
              <div className={styles.iconBox}>
                <Plus size={24} />
              </div>
              <div>
                <h2 className={styles.modalTitle}>Criar Novo Alerta</h2>
              </div>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Tipo de Alerta</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className={styles.select}
                >
                  <option value="info">Informativo</option>
                  <option value="aviso">Aviso</option>
                  <option value="alteracao">Alteração</option>
                  <option value="nova_linha">Nova Linha</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Título</label>
                <input 
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className={styles.input}
                  placeholder="Digite o título do alerta"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Descrição</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className={styles.textarea}
                  rows="4"
                  placeholder="Descreva o alerta detalhadamente"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Localização (opcional)</label>
                <input 
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className={styles.input}
                  placeholder="Ex: Centro, Zona Sul, etc."
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.secondaryBtn} onClick={() => setShowCreateModal(false)}>
                Cancelar
              </button>
              <button className={styles.primaryBtn} onClick={handleCreateAlert}>
                Publicar Alerta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Alerta */}
      {editingAlert && (
        <div className={styles.modalOverlay} onClick={() => setEditingAlert(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setEditingAlert(null)}>
              <X size={24} />
            </button>
            
            <div className={styles.modalHeader}>
              <div className={styles.iconBox}>
                <Edit2 size={24} />
              </div>
              <div>
                <h2 className={styles.modalTitle}>Editar Alerta</h2>
              </div>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Tipo de Alerta</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className={styles.select}
                >
                  <option value="info">Informativo</option>
                  <option value="aviso">Aviso</option>
                  <option value="alteracao">Alteração</option>
                  <option value="nova_linha">Nova Linha</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Título</label>
                <input 
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Descrição</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className={styles.textarea}
                  rows="4"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Localização (opcional)</label>
                <input 
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.secondaryBtn} onClick={() => setEditingAlert(null)}>
                Cancelar
              </button>
              <button className={styles.primaryBtn} onClick={handleEditAlert}>
                Salvar Alterações
              </button>
              {/* SweetAlert is used for detail view; modal removed */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}