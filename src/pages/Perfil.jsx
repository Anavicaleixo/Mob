import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { 
  User, 
  Star, 
  MapPin, 
  Mail, 
  MessageSquare, 
  Heart, 
  ChevronRight,
  LogOut,
  Award,
  Bus,
  Bell,
  Clock,
  RefreshCw 
} from 'lucide-react';
import styles from './Perfil.module.css';
import { storage } from '../services/storage';
import Swal from 'sweetalert2';
export default function Perfil() {
  const { user, logout, updatePassword, login, resetPassword } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [userReports, setUserReports] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stops, setStops] = useState([]);
  useEffect(() => {
    if (user) {
      async function loadUserData() {
        setLoading(true);
        console.log("Iniciando carregamento de dados do usuário:", user.id);
        try {
          try {
            const prof = await storage.getProfile(user.id);
            setProfile(prof);
            console.log("Perfil carregado:", prof);
          } catch (e) {
            console.error("Erro ao carregar perfil:", e);
          }
          try {
            const reports = await storage.getUserReports(user.id);
            setUserReports(reports);
            console.log("Relatos carregados:", reports.length);
          } catch (e) {
            console.error("Erro ao carregar relatos:", e);
          }
          try {
            const [favIds, allStops] = await Promise.all([
              storage.getFavorites(user.id),
              storage.getStops()
            ]);
            setStops(allStops);
            const favStops = allStops.filter(s => favIds.includes(s.id?.toString()));
            setFavorites(favStops);
            console.log("Favoritos carregados:", favStops.length);
          } catch (e) {
            console.error("Erro ao carregar favoritos:", e);
          }
        } catch (err) {
          console.error("Erro geral no Perfil:", err);
        } finally {
          setLoading(false);
        }
      }
      loadUserData();
    }
  }, [user]);
  if (!user) {
    return <Navigate to="/login" />;
  }
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ nome: '', email: '', foto: null, senhaAtual: '' });
  useEffect(() => {
    if (profile) {
      setEditFormData({
        nome: profile.nome || '',
        email: user.email || '',
        foto: profile.foto || null,
        senhaAtual: ''
      });
    }
  }, [profile, user]);
  const handleEditSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editFormData.senhaAtual) {
        try {
          await login(user.email, editFormData.senhaAtual);
        } catch (e) {
          await Swal.fire({
            icon: 'error',
            title: 'Senha incorreta',
            text: 'A senha atual informada está incorreta.',
            confirmButtonColor: '#1c4f36',
            confirmButtonText: 'OK'
          });
          setLoading(false);
          return;
        }
      }
      await storage.updateProfile(user.id, {
        nome: editFormData.nome,
        email: editFormData.email,
        points: profile?.points || 0,
        foto: editFormData.foto
      });
      const updatedProf = await storage.getProfile(user.id);
      setProfile(updatedProf);
      setShowEditModal(false);
      setEditFormData(prev => ({ ...prev, senhaAtual: '' }));
      await Swal.fire({
        icon: 'success',
        title: 'Perfil atualizado!',
        text: 'Suas informações foram salvas com sucesso.',
        confirmButtonColor: '#1c4f36',
        confirmButtonText: 'OK',
        timer: 2000,
        timerProgressBar: true
      });
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      await Swal.fire({
        icon: 'error',
        title: 'Erro ao salvar',
        text: err.message || 'Ocorreu um erro ao salvar as alterações.',
        confirmButtonColor: '#1c4f36',
        confirmButtonText: 'OK'
      });
    } finally {
      setLoading(false);
    }
  };
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: 'warning',
          title: 'Arquivo muito grande',
          text: 'A imagem deve ter menos de 5MB',
          confirmButtonColor: '#1c4f36',
          confirmButtonText: 'OK'
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setEditFormData({ ...editFormData, foto: reader.result });
      reader.readAsDataURL(file);
    }
  };
  const userInitial = profile?.nome ? profile.nome.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'U');
  const userName = profile?.nome || (user.email ? user.email.split('@')[0] : 'Usuário');
  return (
    <div className={styles.pageContainer}>
      <header className={styles.profileHeader}>
        <div className={styles.userBasicInfo}>
          <div className={styles.avatarLarge}>
            {profile?.foto ? (
              <img src={profile.foto} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              userInitial
            )}
          </div>
          <div className={styles.userNameContainer}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h1>{userName.charAt(0).toUpperCase() + userName.slice(1)}</h1>
              <button 
                onClick={() => setShowEditModal(true)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Editar Perfil
              </button>
            </div>
            <div className={styles.userEmail}>
              <Mail size={16} color="#10b981" />
              <span>{user.email}</span>
            </div>
          </div>
          <button onClick={logout} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
             Sair <LogOut size={16} color="#10b981" />
          </button>
        </div>
        {}
        {showEditModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
            <div style={{ background: 'white', padding: '2.5rem', borderRadius: '24px', width: '90%', maxWidth: '450px', position: 'relative' }}>
              <h2 style={{ marginBottom: '1.5rem', color: '#1e293b' }}>Editar Perfil</h2>
              <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ alignSelf: 'center', marginBottom: '1rem' }}>
                  <label style={{ cursor: 'pointer', display: 'block' }}>
                    <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #10b981', overflow: 'hidden', position: 'relative' }}>
                      {editFormData.foto ? <img src={editFormData.foto} alt="P" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={40} color="#94a3b8" />}
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(16, 185, 129, 0.8)', padding: '4px', textAlign: 'center' }}>
                        <Clock size={12} color="white" />
                      </div>
                    </div>
                  </label>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569' }}>Nome Completo</label>
                  <input 
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} 
                    value={editFormData.nome} 
                    onChange={e => setEditFormData({...editFormData, nome: e.target.value})}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569' }}>E-mail</label>
                  <input 
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', background: '#f8fafc' }} 
                    value={editFormData.email} 
                    readOnly
                  />
                  <small style={{ color: '#94a3b8', fontSize: '0.7rem' }}>O e-mail é vinculado à sua conta de login.</small>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569' }}>Senha Atual</label>
                  <input 
                    type="password"
                    placeholder="Digite sua senha atual para confirmar alterações"
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} 
                    value={editFormData.senhaAtual || ''} 
                    onChange={e => setEditFormData({...editFormData, senhaAtual: e.target.value})}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <Link 
                      to="/redefinir-senha"
                      style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Esqueceu a senha?
                    </Link>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: 'none', background: '#1c4f36', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Salvar Alterações</button>
                </div>
              </form>
            </div>
          </div>
        )}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{profile?.points || 0}</span>
            <div className={styles.statLabel}>
              <Star size={16} fill="#10b981" color="#10b981" /> MobPontos
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{userReports.length}</span>
            <div className={`${styles.statLabel} ${styles.relatos}`}>
              <MessageSquare size={16} color="#10b981" /> Relatos
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{favorites.length}</span>
            <div className={`${styles.statLabel} ${styles.favoritos}`}>
              <Heart size={16} color="#10b981" /> Favoritos
            </div>
          </div>
        </div>
      </header>
      <main className={styles.contentBody}>
        <section className={styles.favoritesSection}>
          <div className={styles.favoritesHeader}>
            <div className={styles.sectionTitle}>
              <Heart size={20} color="#10b981" />
              <span>Pontos favoritos</span>
            </div>
            <Link to="/pontos" state={{ filterFavorites: true }} className={styles.linkMap}>
              Ver mapa <ChevronRight size={16} color="#10b981" />
            </Link>
          </div>
          <div className={styles.favoritesList}>
            {favorites.length > 0 ? (
              favorites.map(stop => (
                <Link key={stop.id} to="/pontos" className={styles.favCardMini}>
                  <div className={styles.favIconBox}>
                    <MapPin size={20} color="#10b981" />
                  </div>
                  <div className={styles.favInfoMini}>
                    <strong>{stop.name}</strong>
                    <span>{stop.location}</span>
                  </div>
                  <ChevronRight size={18} color="#10b981" />
                </Link>
              ))
            ) : (
              <div className={styles.emptyState}>
                <Heart size={48} className={styles.emptyIcon} color="#10b981" />
                <p>Nenhum ponto favoritado ainda</p>
                <Link to="/pontos" className={styles.exploreLink}>Explorar pontos →</Link>
              </div>
            )}
          </div>
        </section>
        <section className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <MessageSquare size={20} color="#10b981" />
            <span>Meus últimos relatos</span>
          </div>
        </section>
        <div className={styles.userReportsList}>
          {userReports.length > 0 ? (
            userReports.map(report => (
              <div key={report.id} className={styles.reportItemMini}>
                <div className={styles.reportHeaderMini}>
                  <div className={styles.reportUserGroup}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#1c4f36', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold', overflow: 'hidden', marginRight: '0.5rem' }}>
                      {profile?.foto ? <img src={profile.foto} alt="Av" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : userInitial}
                    </div>
                    <span className={styles.reportUserName}>{userName}</span>
                  </div>
                  <span className={styles.reportTimeMini}>
                    <Clock size={12} color="#10b981" /> {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className={styles.reportContent}>
                  <p className={styles.reportDescription}>
                    {report.description?.replace('[OUTROS]', '').trim()}
                  </p>
                </div>
                <div className={styles.reportFooter}>
                  {report.line_id && <span className={styles.reportLineLabel}>Linha {report.line_id}</span>}
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <MessageSquare size={48} className={styles.emptyIcon} color="#10b981" />
              <p>Você ainda não publicou relatos</p>
            </div>
          )}
        </div>
        <section className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <span>Acesso rápido</span>
          </div>
        </section>
        <div className={styles.quickAccessGrid}>
          <Link to="/recompensas" className={styles.quickAccessCard}>
            <div className={styles.cardMainInfo}>
              <div className={`${styles.iconWrapper} ${styles.iconRewards}`}>
                <Award size={20} color="#10b981" />
              </div>
              <span>Minhas recompensas</span>
            </div>
            <ChevronRight className={styles.chevron} size={18} color="#10b981" />
          </Link>
          <Link to="/linhas" className={styles.quickAccessCard}>
            <div className={styles.cardMainInfo}>
              <div className={`${styles.iconWrapper} ${styles.iconLines}`}>
                <Bus size={20} color="#10b981" />
              </div>
              <span>Linhas de ônibus</span>
            </div>
            <ChevronRight className={styles.chevron} size={18} color="#10b981" />
          </Link>
          <Link to="/pontos" className={styles.quickAccessCard}>
            <div className={styles.cardMainInfo}>
              <div className={`${styles.iconWrapper} ${styles.iconMap}`}>
                <MapPin size={20} color="#10b981" />
              </div>
              <span>Pontos no mapa</span>
            </div>
            <ChevronRight className={styles.chevron} size={18} color="#10b981" />
          </Link>
          <Link to="/alertas" className={styles.quickAccessCard}>
            <div className={styles.cardMainInfo}>
              <div className={`${styles.iconWrapper} ${styles.iconAlerts}`}>
                <Bell size={20} color="#10b981" />
              </div>
              <span>Alertas</span>
            </div>
            <ChevronRight className={styles.chevron} size={18} color="#10b981" />
          </Link>
        </div>
      </main>
    </div>
  );
}