import React, { useEffect, useRef, useState } from 'react';
import { X, Bus, Clock, Calendar, CalendarDays, CalendarRange, Sun, MapPin, ArrowRight, ArrowLeft, RefreshCw, Info, MessageSquare, Plus, Star, AlertTriangle, AlertOctagon, CheckCircle, CircleDot, ChevronDown, ChevronUp, Heart, MessageCircle, ThumbsDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { storage } from '../../services/storage';
import Swal from 'sweetalert2';
import styles from './LineModal.module.css';

function FrequencyCard({ label, icon, buses, trips, peak, offPeak, customLabel }) {
  const isNoOp = customLabel && (customLabel === 'Não opera' || customLabel === 'Sem operação');

  return (
    <div className={`${styles.freqCard} ${isNoOp ? styles.freqCardDisabled : ''}`}>
      <div className={styles.freqCardHeader}>
        <span className={styles.freqCardLabel}>{label}</span>
        <span className={styles.freqCardIcon}>{icon}</span>
      </div>
      {customLabel ? (
        <p className={styles.freqNoOp}>{customLabel}</p>
      ) : (
        <>
          <p className={styles.freqStat}><strong>{buses}</strong> <span>ônibus</span></p>
          <p className={styles.freqStat}><strong>{trips}</strong> <span>viagens</span></p>
        </>
      )}
    </div>
  );
}

function RouteSection({ direction, data }) {
  const isForward = direction === 'forward';
  return (
    <div className={styles.routeSection}>
      <div className={styles.routeHeader}>
        <div className={`${styles.routeDirection} ${isForward ? styles.routeForward : styles.routeReturn}`}>
          {isForward ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
          <span>{data.label}</span>
        </div>
      </div>
      <ol className={styles.stopList}>
        {data.stops.map((stop, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === data.stops.length - 1;
          return (
            <li key={idx} className={`${styles.stopItem} ${isFirst ? styles.stopFirst : ''} ${isLast ? styles.stopLast : ''}`}>
              <div className={styles.stopDot}>
                {isFirst || isLast ? <MapPin size={12} /> : null}
              </div>
              <span className={styles.stopName}>{stop}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function LineModal({ lineDetail, onClose }) {
  const overlayRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Extrair propriedades do lineDetail
  const { 
    title, 
    number, 
    description, 
    extension, 
    notes, 
    frequency, 
    duration, 
    peakTrafficTime, 
    forward, 
    return: ret 
  } = lineDetail;

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportType, setReportType] = useState('warning');
  const [reportDescription, setReportDescription] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const [showRatingForm, setShowRatingForm] = useState(true);
  const [lineRating, setLineRating] = useState(0);
  const [driverRating, setDriverRating] = useState(0);
  const [avgRatings, setAvgRatings] = useState({ avgLine: 0, avgDriver: 0, total: 0 });
  const [loadingRatings, setLoadingRatings] = useState(true);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const [reportStats, setReportStats] = useState({});
  const [activeReplyReportId, setActiveReplyReportId] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [reportReplies, setReportReplies] = useState({}); // reportId -> replies[]

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

  const handleRateLine = async (rating) => {
    if (!user) {
      Swal.fire({ icon: 'error', title: 'Acesso Negado', text: 'Você precisa estar logado para avaliar a linha!', confirmButtonColor: '#10b981' });
      return;
    }
    
    try {
      await storage.addRating({
        lineId: lineDetail.number?.toString(),
        userId: user.id,
        type: 'line',
        value: rating
      });
      setLineRating(rating);
      Swal.fire({ icon: 'success', title: 'Obrigado!', text: `Você avaliou a linha com ${rating} estrela(s).`, confirmButtonColor: '#10b981', timer: 2000, showConfirmButton: false });
      
      // Refresh averages
      const newAvgs = await storage.getLineRatings(lineDetail.number?.toString());
      setAvgRatings(newAvgs);
    } catch (err) {
      console.error("Erro ao avaliar linha:", err);
    }
  };

  const handleRateDriver = async (rating) => {
    if (!user) {
      Swal.fire({ icon: 'error', title: 'Acesso Negado', text: 'Você precisa estar logado para avaliar o motorista!', confirmButtonColor: '#10b981' });
      return;
    }

    try {
      await storage.addRating({
        lineId: lineDetail.number?.toString(),
        userId: user.id,
        type: 'driver',
        value: rating
      });
      setDriverRating(rating);
      Swal.fire({ icon: 'success', title: 'Obrigado!', text: `Você avaliou o motorista com nota ${rating}.`, confirmButtonColor: '#10b981', timer: 2000, showConfirmButton: false });
      
      // Refresh averages
      const newAvgs = await storage.getLineRatings(lineDetail.number?.toString());
      setAvgRatings(newAvgs);
    } catch (err) {
      console.error("Erro ao avaliar motorista:", err);
    }
  };

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';

    async function loadData() {
      try {
        const [allReports, ratingsData] = await Promise.all([
          storage.getReports(),
          storage.getLineRatings(lineDetail.number?.toString())
        ]);

        const lineReports = allReports.filter(r => 
          r.line_id?.toString() === lineDetail.number?.toString() || 
          r.lineId?.toString() === lineDetail.number?.toString()
        );
        
        setReports(lineReports);

        // Carregar estatísticas para cada relato
        const stats = {};
        await Promise.all(lineReports.map(async (r) => {
          const s = await storage.getReportStats(r.id, user?.id);
          stats[r.id] = s;
        }));
        setReportStats(stats);

        setAvgRatings(ratingsData);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoadingReports(false);
        setLoadingRatings(false);
      }
    }
    loadData();

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose, lineDetail.number, user?.id]);

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      Swal.fire({
        icon: 'error',
        title: 'Acesso Negado',
        text: 'Você precisa estar logado para enviar um relato!',
        confirmButtonColor: '#10b981'
      });
      return;
    }
    setSubmittingReport(true);
    
    // Mapeia tipos internos para tipos aceitos pelo banco de dados
    const finalType = reportType === 'warning_other' ? 'warning' : reportType;
    // Adiciona uma marcação se for "Outros" para podermos identificar na listagem
    const finalDescription = reportType === 'warning_other' ? `[OUTROS] ${reportDescription}` : reportDescription;
    
    try {
      await storage.addReport({
        lineId: lineDetail.number || '00',
        type: finalType,
        description: finalDescription,
        author: user?.email ? user.email.split('@')[0] : 'Anônimo',
        userId: user?.id
      });
      Swal.fire({
        icon: 'success',
        title: 'Relato Enviado',
        text: 'Relato enviado com sucesso! Você ganhou +10 MobPontos!',
        confirmButtonColor: '#10b981'
      });
      setReportDescription('');
      setShowReportForm(false);
      // Recarregar relatos
      const allReports = await storage.getReports();
      const lineReports = allReports.filter(r => 
        r.line_id?.toString() === lineDetail.number?.toString() || 
        r.lineId?.toString() === lineDetail.number?.toString()
      );
      setReports(lineReports);
    } catch (err) {
      console.error("Erro completo ao enviar relato:", err);
      Swal.fire({
        icon: 'error',
        title: 'Erro ao Enviar',
        text: "Erro ao enviar: " + (err.message || 'Erro desconhecido'),
        confirmButtonColor: '#10b981'
      });
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleRegisterTrip = async () => {
    if (!user) {
      Swal.fire({ icon: 'error', title: 'Acesso Negado', text: 'Você precisa estar logado para registrar uma viagem!', confirmButtonColor: '#10b981' });
      return;
    }

    try {
      await storage.addTrip(user.id, lineDetail.number?.toString());
      Swal.fire({
        icon: 'success',
        title: 'Boa viagem!',
        text: 'Sua viagem foi registrada e você ganhou +20 MobPontos!',
        confirmButtonColor: '#10b981',
        timer: 3000
      });
    } catch (err) {
      console.error("Erro ao registrar viagem:", err);
      Swal.fire({ 
        icon: 'warning', 
        title: 'Atenção', 
        text: err.message || 'Não foi possível registrar a viagem.', 
        confirmButtonColor: '#10b981' 
      });
    }
  };

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-label={`Detalhes da ${title}`}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.lineBadge}>{number}</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h2 className={styles.modalTitle}>{title}</h2>
              </div>
              <p className={styles.modalDescription}>{description}</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar modal">
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          { (loadingReports || loadingRatings) && (
            <div className={styles.loadingOverlay} style={{display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'}}>
              <span>Carregando informações...</span>
            </div>
          ) }
          {/* Extension info */}
          {extension && (
            <div className={styles.extensionBanner}>
              <span><ArrowRight size={14} style={{verticalAlign: 'middle', marginRight: '0.25rem'}} /> Ida: <strong>{extension.forward}</strong></span>
              <span><ArrowLeft size={14} style={{verticalAlign: 'middle', marginRight: '0.25rem'}} /> Volta: <strong>{extension.return}</strong></span>
              <span><RefreshCw size={14} style={{verticalAlign: 'middle', marginRight: '0.25rem'}} /> Total: <strong>{extension.total}</strong></span>
            </div>
          )}

          {/* Notes */}
          {notes && notes.length > 0 && (
            <div className={styles.notesBanner}>
              {notes.map((note, i) => (
                <div key={i} className={styles.noteItem}>
                  <Info size={14} />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          )}

          {/* Frequency */}
          {(frequency?.weekdays || frequency?.saturday || frequency?.sunday) && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}><Calendar size={16} /> Frequência</h3>
              <div className={styles.freqGrid}>
                {frequency.weekdays && (
                  <FrequencyCard
                    label="Dias Úteis"
                    icon={<CalendarDays size={16} />}
                    buses={frequency.weekdays.buses}
                    trips={frequency.weekdays.trips}
                    peak={frequency.weekdays.peak}
                    offPeak={frequency.weekdays.offPeak}
                    customLabel={frequency.weekdays.label}
                  />
                )}
                {frequency.saturday && (
                  <FrequencyCard
                    label="Sábados"
                    icon={<CalendarRange size={16} />}
                    buses={frequency.saturday.buses}
                    trips={frequency.saturday.trips}
                    peak={frequency.saturday.peak}
                    customLabel={frequency.saturday.label}
                  />
                )}
                {frequency.sunday && (
                  <FrequencyCard
                    label="Domingos"
                    icon={<Sun size={16} />}
                    buses={frequency.sunday.buses}
                    trips={frequency.sunday.trips}
                    peak={frequency.sunday.peak}
                    customLabel={frequency.sunday.label}
                  />
                )}
              </div>
            </section>
          )}

          {/* Duration */}
          {duration && (
            <div className={styles.durationBanner}>
              <Clock size={16} />
              <span>Tempo de percurso: <strong>{duration}</strong></span>
            </div>
          )}

          {/* Peak Traffic Time */}
          {peakTrafficTime && (
            <div className={styles.durationBanner} style={{ marginTop: '0.5rem', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
              <AlertTriangle size={16} color="#991b1b" />
              <span>Tempo médio de trânsito(ida e volta): <strong>{peakTrafficTime}</strong></span>
            </div>
          )}

          {/* Routes */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}><Bus size={16} /> Trajeto</h3>
            <div className={styles.routesGrid}>
              {forward && <RouteSection direction="forward" data={forward} />}
              {ret && <RouteSection direction="return" data={ret} />}
            </div>
          </section>

          {/* Ratings Section */}
          <div className={styles.reportsSection} style={{ borderTop: 'none', paddingTop: 0, marginTop: '1rem' }}>
            <div 
              className={styles.reportsHeader} 
              style={{ marginBottom: '1rem' }} 
            >
              <h3 className={styles.sectionTitle}>
                <Star size={16} /> Avaliações da Linha
                <span className={styles.avgBadge}>
                  <Star size={12} fill="#f59e0b" color="#f59e0b" /> {avgRatings.avgLine || '0.0'} 
                  <span style={{ margin: '0 4px', opacity: 0.5 }}>|</span>
                  <Bus size={12} color="#1c4f36" /> {avgRatings.avgDriver || '0.0'}
                </span>
              </h3>
            </div>

            {showRatingForm && (
              <div className={styles.ratingsBanner}>
                 <div className={styles.interactiveRating}>
                   <div className={styles.ratingRow}>
                     <div className={styles.ratingTitle}>
                       <Star size={16} fill="#f59e0b" color="#f59e0b" /> Avaliar Linha
                     </div>
                     <div className={styles.starsContainer}>
                       {[1, 2, 3, 4, 5].map((star) => (
                         <button 
                           key={`line-${star}`} 
                           className={styles.starBtn}
                           onClick={() => handleRateLine(star)}
                           title={`${star} Estrela(s)`}
                         >
                           <Star size={20} fill={lineRating >= star ? "#f59e0b" : "transparent"} color={lineRating >= star ? "#f59e0b" : "#cbd5e1"} />
                         </button>
                       ))}
                     </div>
                   </div>
                   <div className={styles.ratingRow}>
                     <div className={styles.ratingTitle}>
                       <Bus size={16} color="#1c4f36" /> Avaliar Motorista
                     </div>
                     <div className={styles.driverNumbers}>
                       {[1, 2, 3, 4, 5].map((num) => (
                         <button 
                           key={`driver-${num}`}
                           className={`${styles.numberBtn} ${driverRating === num ? styles.active : ''}`}
                           onClick={() => handleRateDriver(num)}
                           title={`Nota ${num}`}
                         >
                           {num}
                         </button>
                       ))}
                     </div>
                   </div>
                 </div>

              </div>
            )}
          </div>

          {/* Reports Section */}
          <div className={styles.reportsSection}>
            <div className={styles.reportsHeader}>
              <h3 className={styles.sectionTitle}>
                <MessageSquare size={16} /> Relatos da Linha
              </h3>
              {!showReportForm && (
                <button className={styles.addReportBtn} onClick={() => setShowReportForm(true)}>
                  <Plus size={14} /> Relatar
                </button>
              )}
            </div>

            {showReportForm && (
              <form onSubmit={handleReportSubmit} className={styles.inlineForm}>
                <select 
                  value={reportType} 
                  onChange={e => setReportType(e.target.value)}
                  className={styles.inlineSelect}
                >
                  <option value="warning">Atraso / Problema Médio</option>
                  <option value="negative">Ônibus Quebrado / Superlotação</option>
                  <option value="positive">Tudo Certo / Rápido e Vazio</option>
                  <option value="warning_other">Outros</option>
                </select>
                <textarea 
                  placeholder="O que está acontecendo nesta linha?"
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
            )}

            {loadingReports ? (
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Carregando relatos...</p>
            ) : reports.length > 0 ? (
              <div className={styles.reportsList}>
                {reports.map(r => {
                  const date = new Date(r.created_at);
                  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  const dateStr = date.toLocaleDateString('pt-BR');
                  
                  // Identifica se é um relato do tipo "Outros" pela marcação na descrição
                  const isOther = r.description?.startsWith('[OUTROS]');
                  const cleanDescription = isOther ? r.description.replace('[OUTROS]', '').trim() : r.description;

                  // Mapeamento de temas (substituindo positivo/negativo/neutro)
                  const typeIcons = {
                    warning: isOther ? <CircleDot size={14} /> : <AlertTriangle size={14} />,
                    negative: <AlertOctagon size={14} />,
                    positive: <CheckCircle size={14} />
                  };
                  const typeTexts = {
                    warning: isOther ? 'Outros' : 'Atraso / Problema',
                    negative: 'Ônibus Quebrado',
                    positive: 'Tudo Certo'
                  };

                  return (
                    <div key={r.id} className={`${styles.reportCard} ${isOther ? styles.type_other : styles[`type_${r.type}`]}`}>
                      <div className={styles.reportMeta}>
                        <div className={styles.metaLeft}>
                          <span className={`${styles.typeTag} ${isOther ? styles.other : styles[r.type]}`}>
                            {typeIcons[r.type] || <AlertTriangle size={14} />} {typeTexts[r.type] || 'Alerta'}
                          </span>
                          <span className={styles.reportAuthor}>{r.author || 'Anônimo'}</span>
                        </div>
                        <span className={styles.reportDate}>{dateStr} • {timeStr}</span>
                      </div>
                      <p className={styles.reportText}>{cleanDescription}</p>

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
                <MessageSquare size={32} opacity={0.3} />
                <p>Nenhum relato sobre esta linha ainda.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
