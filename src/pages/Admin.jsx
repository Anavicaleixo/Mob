import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { storage } from '../services/storage';
import { Navigate } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Edit2, 
  Trash2, 
  Plus, 
  Bell, 
  MessageSquare, 
  Star, 
  Clock, 
  Activity, 
  Search, 
  MapPin, 
  Users, 
  LayoutDashboard,
  Map as MapIcon,
  AlertTriangle,
  LogOut,
  ChevronRight,
  TrendingUp,
  Award,
  Key,
  Navigation,
  Route,
  Bus,
  Camera
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Swal from 'sweetalert2';

const COLORS = ['#1c4f36', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import styles from './Admin.module.css';

let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// ---------- AUXILIARY COMPONENTS ----------

function CardStat({ icon, title, subtitle, sub2, color = '#10b981' }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.iconWrapper} style={{ backgroundColor: `${color}15`, color: color }}>
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <div className={styles.statTitle}>{subtitle}</div>
      <div className={styles.statValue}>{title}</div>
      {sub2 && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{sub2}</div>}
    </div>
  );
}

function RankingItem({ pos, linha, desc, rel, tag, tagColor, tagText, star, progress }) {
  return (
    <div className={styles.rankingItem}>
      <div className={styles.rankingPos}>{pos}</div>
      <div className={styles.rankingInfo}>
        <div className={styles.rankingHeader}>
          <span className={styles.rankingLinha}>Linha {linha}</span>
          <span className={styles.rankingTag} style={{ background: tagColor, color: tagText }}>{tag}</span>
        </div>
        <div className={styles.rankingDesc}>{desc}</div>
      </div>
      <div className={styles.rankingPopularidade}>
        <div className={styles.rankingPopularidadeHeader}>
          <span>Popularidade</span>
          <span className={styles.rankingRel}>{rel}</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
        </div>
      </div>
      <div className={styles.rankingStar}>
        <Star size={16} fill="#10b981" color="#10b981" /> {star}
      </div>
    </div>
  );
}

function MapClickHandler({ onClick }) {
  useMapEvents({
    click(e) { 
      if (onClick && typeof onClick === 'function') {
        onClick(e.latlng); 
      }
    }
  });
  return null;
}

// ---------- TABELA RESPONSIVA COMPONENT ----------
function ResponsiveTable({ headers, data, renderRow, actions }) {
  return (
    <div className={styles.responsiveTableWrapper}>
      <div className={styles.desktopTable}>
        <table className={styles.modernTable}>
          <thead>
            <tr>
              {headers.map((header, idx) => (
                <th key={idx}>{header}</th>
              ))}
              {actions && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => renderRow(item, idx))}
          </tbody>
        </table>
      </div>
      
      <div className={styles.mobileCards}>
        {data.map((item, idx) => (
          <div key={idx} className={styles.mobileCard}>
            {headers.map((header, hidx) => (
              <div key={hidx} className={styles.mobileCardRow}>
                <span className={styles.mobileCardLabel}>{header}:</span>
                <span className={styles.mobileCardValue}>
                  {renderRow(item, idx).props.children[hidx]}
                </span>
              </div>
            ))}
            {actions && (
              <div className={styles.mobileCardActions}>
                {actions(item)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- ABAS ----------

function VisaoGeralTab() {
  const [lines, setLines] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ alerts: 0, reports: 0, avgLine: 0, avgDriver: 0, redemptions: 0, totalPoints: 0 });
  const [barChartData, setBarChartData] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [linesData, reportsData, ratingsData, redemptionsData, alertsData] = await Promise.all([
          storage.getLines(),
          storage.getReports(),
          supabase.from('ratings').select('*'),
          supabase.from('redemptions').select('*'),
          storage.getAlerts()
        ]);

        const linesList = linesData || [];
        const reportsList = reportsData || [];
        const ratingsList = ratingsData.data || [];
        const redemptionsList = redemptionsData.data || [];
        const allAlerts = alertsData || [];

        setLines(linesList);
        
        const unifiedReports = [
          ...reportsList,
          ...allAlerts.map(a => ({ ...a, author: 'Admin MobTracker' }))
        ];
        setReports(unifiedReports);

        const lineRatings = ratingsList.filter(r => r.rating_type === 'line');
        const driverRatings = ratingsList.filter(r => r.rating_type === 'driver');
        
        const avgL = lineRatings.length > 0 
          ? lineRatings.reduce((sum, r) => sum + r.rating_value, 0) / lineRatings.length 
          : 4.2;
          
        const avgD = driverRatings.length > 0 
          ? driverRatings.reduce((sum, r) => sum + r.rating_value, 0) / driverRatings.length 
          : 4.7;

        setStats({
          alerts: allAlerts.length,
          reports: reportsList.length,
          avgLine: avgL,
          avgDriver: avgD,
          redemptions: redemptionsList.length,
          totalPoints: redemptionsList.reduce((sum, r) => sum + (r.cost || 0), 0)
        });

        const counts = [0, 0, 0, 0, 0];
        if (lineRatings && lineRatings.length > 0) {
          lineRatings.forEach(r => {
            const val = Math.round(r.rating_value);
            if (val >= 1 && val <= 5) counts[val-1]++;
          });
        }
        
        setBarChartData([
          { name: '1★', uv: counts[0] },
          { name: '2★', uv: counts[1] },
          { name: '3★', uv: counts[2] },
          { name: '4★', uv: counts[3] },
          { name: '5★', uv: counts[4] }
        ]);

        setLoading(false);
      } catch (err) {
        console.error("Dashboard load error:", err);
        setLoading(false);
      }
    }
    load();
  }, []);

  const pieData = [
    { name: 'Crítico', value: reports.filter(r => r.type === 'negative').length || 0 },
    { name: 'Aviso', value: reports.filter(r => r.type === 'warning').length || 0 },
    { name: 'Positivo', value: reports.filter(r => r.type === 'positive').length || 0 },
    { name: 'Info', value: reports.filter(r => r.type === 'info').length || 0 }
  ];

  return (
    <div className={styles.visaoGeralContainer}>
      <div className={styles.statsGrid}>
        <CardStat icon={<Bell />} title={stats.alerts.toString()} subtitle="Alertas Ativos" color="#10b981" sub2="Oficiais do sistema" />
        <CardStat icon={<MessageSquare />} title={stats.reports.toString()} subtitle="Relatos de Usuários" color="#10b981" sub2={`${reports.filter(r => r.type === 'negative').length} críticas recebidas`} />
        <CardStat icon={<Star />} title={stats.avgLine.toFixed(1)} subtitle="Avaliação das Linhas" color="#10b981" sub2={`Média motoristas: ${stats.avgDriver.toFixed(1)}`} />
        <CardStat icon={<Award />} title={stats.redemptions?.toString() || "0"} subtitle="Recompensas" color="#10b981" sub2={`${stats.totalPoints || 0} pts resgatados`} />
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.tableContainer}>
          <div className={styles.chartWrapper}>
            <h3 className={styles.statTitle}>Distribuição de Feedbacks</h3>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                    labelLine={false}
                    label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <h3 className={styles.statTitle}>Frequência de Notas</h3>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="uv" fill="#1c4f36" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h3 className={styles.statTitle}>Ranking de Engajamento por Linha</h3>
          <TrendingUp size={20} color="#10b981" />
        </div>
        <div className={styles.rankingList}>
          {loading ? <p>Processando estatísticas...</p> : reports.length === 0 ? (
            <p className={styles.emptyState}>Nenhum dado de relato ainda.</p>
          ) : (
            lines
              .map(line => {
                const lineReports = reports.filter(r => r.line_id === line.name || r.lineId === line.name);
                return { ...line, reportsCount: lineReports.length, positiveCount: lineReports.filter(r => r.type === 'positive').length };
              })
              .sort((a, b) => b.reportsCount - a.reportsCount)
              .slice(0, 5)
              .map((line, idx) => (
                <RankingItem 
                  key={line.id}
                  pos={`#${idx + 1}`} 
                  linha={line.name} 
                  desc={line.description || 'Sem descrição'} 
                  rel={line.reportsCount} 
                  tag={line.positiveCount > 0 ? "Popular" : "Estável"} 
                  tagColor={line.positiveCount > 0 ? "#dcfce7" : "#f1f5f9"} 
                  tagText={line.positiveCount > 0 ? "#166534" : "#64748b"} 
                  star={(3.8 + (line.reportsCount % 12) / 10).toFixed(1)}
                  progress={Math.min(100, (line.reportsCount / (reports.length || 1)) * 500)}
                />
              ))
          )}
        </div>
      </div>
    </div>
  );
}

function UsuariosTab() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ nome: '', email: '', points: 0, password: '', foto: null });

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await storage.getProfiles();
      setProfiles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await storage.updateProfile(editingUser.id, formData);
        Swal.fire({ title: 'Sucesso', text: 'Perfil atualizado!', icon: 'success', confirmButtonColor: '#10b981' });
      } else {
        if (!formData.password) throw new Error("Senha obrigatória");
        const user = await storage.adminCreateUser(formData.email, formData.password);
        await storage.updateProfile(user.id, { nome: formData.nome, email: formData.email, points: formData.points, foto: formData.foto });
        Swal.fire({ title: 'Sucesso', text: 'Usuário criado!', icon: 'success', confirmButtonColor: '#10b981' });
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      Swal.fire({ title: 'Erro', text: err.message, icon: 'error', confirmButtonColor: '#10b981' });
    }
  };

  const handleDelete = async (id) => {
    const res = await Swal.fire({ title: 'Excluir?', text: 'Remover perfil do banco?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' });
    if (res.isConfirmed) {
      await storage.deleteProfile(id);
      loadUsers();
    }
  };

  const headers = ['Nome', 'E-mail', 'MobPontos', 'Cadastro'];
  
  const renderUserRow = (user) => (
    <tr key={user.id}>
      <td>
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {user.foto ? <img src={user.foto} alt="Av" /> : (user.nome ? user.nome[0].toUpperCase() : 'U')}
          </div>
          <span className={styles.userName}>{user.nome || 'Sem Nome'}</span>
        </div>
      </td>
      <td className={styles.userEmail}>{user.email}</td>
      <td><span className={styles.pointsBadge}>{user.points || 0} pts</span></td>
      <td>{user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-'}</td>
      <td>
        <div className={styles.actionButtons}>
          <button className={styles.actionBtn} onClick={() => { setEditingUser(user); setFormData({ nome: user.nome || '', email: user.email, points: user.points || 0, password: '', foto: user.foto || null }); setShowModal(true); }} title="Editar">
            <Edit2 size={16} color="#10b981" />
          </button>
          <button className={styles.actionBtn} onClick={() => handleDelete(user.id)} title="Excluir">
            <Trash2 size={16} color="#10b981" />
          </button>
        </div>
      </td>
    </tr>
  );

  const userActions = (user) => (
    <>
      <button className={styles.actionBtn} onClick={() => { setEditingUser(user); setFormData({ nome: user.nome || '', email: user.email, points: user.points || 0, password: '', foto: user.foto || null }); setShowModal(true); }} title="Editar">
        <Edit2 size={16} color="#10b981" />
      </button>
      <button className={styles.actionBtn} onClick={() => handleDelete(user.id)} title="Excluir">
        <Trash2 size={16} color="#10b981" />
      </button>
    </>
  );

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeader}>
        <div>
          <h2>Gerenciar Usuários</h2>
          <p className={styles.tableSubtitle}>{profiles.length} usuários cadastrados no sistema</p>
        </div>
        <button className={styles.primaryBtn} onClick={() => { setEditingUser(null); setFormData({ nome: '', email: '', points: 0, password: '', foto: null }); setShowModal(true); }}>
          <Plus size={18} /> Novo Usuário
        </button>
      </div>

      {loading ? (
        <p className={styles.loadingState}>Carregando...</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className={styles.desktopOnly}>
            <table className={styles.modernTable}>
              <thead>
                <tr>
                  {headers.map((header, idx) => <th key={idx}>{header}</th>)}
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map(user => renderUserRow(user))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className={styles.mobileOnly}>
            {profiles.map(user => (
              <div key={user.id} className={styles.mobileCard}>
                <div className={styles.mobileCardRow}>
                  <span className={styles.mobileCardLabel}>Nome:</span>
                  <span className={styles.mobileCardValue}>
                    <div className={styles.userInfo}>
                      <div className={styles.userAvatar}>
                        {user.foto ? <img src={user.foto} alt="Av" /> : (user.nome ? user.nome[0].toUpperCase() : 'U')}
                      </div>
                      <span>{user.nome || 'Sem Nome'}</span>
                    </div>
                  </span>
                </div>
                <div className={styles.mobileCardRow}>
                  <span className={styles.mobileCardLabel}>E-mail:</span>
                  <span className={styles.mobileCardValue}>{user.email}</span>
                </div>
                <div className={styles.mobileCardRow}>
                  <span className={styles.mobileCardLabel}>MobPontos:</span>
                  <span className={styles.mobileCardValue}>
                    <span className={styles.pointsBadge}>{user.points || 0} pts</span>
                  </span>
                </div>
                <div className={styles.mobileCardRow}>
                  <span className={styles.mobileCardLabel}>Cadastro:</span>
                  <span className={styles.mobileCardValue}>{user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-'}</span>
                </div>
                <div className={styles.mobileCardActions}>
                  {userActions(user)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>
            <form onSubmit={handleSave}>
              <div className={styles.avatarUpload}>
                <label>
                  <input type="file" accept="image/*" onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        Swal.fire({ title: 'Atenção', text: 'A imagem deve ter menos de 5MB', icon: 'warning' });
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => setFormData({ ...formData, foto: reader.result });
                      reader.readAsDataURL(file);
                    }
                  }} />
                  <div className={styles.avatarPreview}>
                    {formData.foto ? <img src={formData.foto} alt="Preview" /> : <Camera size={24} color="#94a3b8" />}
                  </div>
                </label>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nome Completo</label>
                <input className={styles.inputField} required value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>E-mail</label>
                <input className={styles.inputField} type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              {!editingUser && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Senha Temporária</label>
                  <input className={styles.inputField} type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                </div>
              )}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>MobPontos</label>
                <input className={styles.inputField} type="number" required value={formData.points} onChange={e => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })} />
              </div>
              <div className={styles.modalButtons}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className={styles.primaryBtn}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PontosTab() {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStop, setEditingStop] = useState(null);
  const [formData, setFormData] = useState({ name: '', location: '', lat: -23.100, lng: -45.700, lines: '', cobertura: false, banco: false, acessivel: false });

  useEffect(() => { loadStops(); }, []);

  const loadStops = async () => {
    setLoading(true);
    try { setStops(await storage.getStops()); } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({ title: 'Excluir Ponto?', text: 'Esta ação não pode ser desfeita.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' });
    if(result.isConfirmed) { await storage.deleteStop(id); loadStops(); }
  };

  const handleEdit = (stop) => {
    setEditingStop(stop);
    setFormData({
      name: stop.name,
      location: stop.location,
      lat: stop.lat,
      lng: stop.lng,
      lines: Array.isArray(stop.lines) ? stop.lines.join(', ') : (stop.lines || ''),
      cobertura: !!stop.cobertura,
      banco: !!stop.banco,
      acessivel: !!stop.acessivel
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const formattedLines = formData.lines.split(',').map(s => s.trim()).filter(s => s !== '');
      
      const payload = { 
        name: formData.name,
        location: formData.location,
        lat: formData.lat,
        lng: formData.lng,
        lines: formattedLines 
      };

      if (editingStop) {
        await storage.updateStop(editingStop.id, payload);
      } else {
        await storage.addStop(payload);
      }
      
      Swal.fire({
        icon: 'success',
        title: editingStop ? 'Ponto Atualizado!' : 'Ponto Adicionado!',
        text: 'As informações foram salvas com sucesso.',
        confirmButtonColor: '#10b981',
        timer: 2000,
        showConfirmButton: false
      });
      
      setShowModal(false);
      setEditingStop(null);
      loadStops();
      setFormData({ name: '', location: '', lat: -23.100, lng: -45.700, lines: '', cobertura: false, banco: false, acessivel: false });
    } catch (err) {
      console.error("Erro ao adicionar ponto:", err);
      Swal.fire({
        icon: 'error',
        title: 'Erro ao Salvar',
        text: err.message || 'Verifique se todos os campos estão corretos.',
        confirmButtonColor: '#10b981'
      });
    }
  };

  const stopActions = (stop) => (
    <>
      <button className={styles.actionBtn} onClick={() => handleEdit(stop)} title="Editar">
        <Edit2 size={16} color="#10b981" />
      </button>
      <button className={styles.actionBtn} onClick={() => handleDelete(stop.id)} title="Excluir">
        <Trash2 size={16} color="#10b981" />
      </button>
    </>
  );

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeader}>
        <div>
          <h2>Pontos de Parada</h2>
          <p className={styles.tableSubtitle}>Gestão de terminais e pontos físicos</p>
        </div>
        <button className={styles.primaryBtn} onClick={() => { setEditingStop(null); setFormData({ name: '', location: '', lat: -23.100, lng: -45.700, lines: '', cobertura: false, banco: false, acessivel: false }); setShowModal(true); }}>
          <Plus size={18} /> Novo Ponto
        </button>
      </div>

      {loading ? (
        <p className={styles.loadingState}>Carregando...</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className={styles.desktopOnly}>
            <table className={styles.modernTable}>
              <thead>
                <tr>
                  <th>Nome do Terminal/Ponto</th>
                  <th>Linhas Atendidas</th>
                  <th>Bairro</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {stops.map(stop => (
                  <tr key={stop.id}>
                    <td><span className={styles.stopName}>{stop.name}</span></td>
                    <td>
                      <div className={styles.linesList}>
                        {(() => {
                          const linesData = stop.lines;
                          let linesArray = [];
                          if (Array.isArray(linesData)) linesArray = linesData;
                          else if (typeof linesData === 'string') linesArray = linesData.split(',').map(s => s.trim());
                          
                          return linesArray.map(l => (
                            <span key={l} className={styles.lineTag}>{l}</span>
                          ));
                        })()}
                      </div>
                    </td>
                    <td>{stop.location}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        {stopActions(stop)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className={styles.mobileOnly}>
            {stops.map(stop => (
              <div key={stop.id} className={styles.mobileCard}>
                <div className={styles.mobileCardRow}>
                  <span className={styles.mobileCardLabel}>Nome:</span>
                  <span className={styles.mobileCardValue}>{stop.name}</span>
                </div>
                <div className={styles.mobileCardRow}>
                  <span className={styles.mobileCardLabel}>Linhas:</span>
                  <span className={styles.mobileCardValue}>
                    <div className={styles.linesList}>
                      {(() => {
                        const linesData = stop.lines;
                        let linesArray = [];
                        if (Array.isArray(linesData)) linesArray = linesData;
                        else if (typeof linesData === 'string') linesArray = linesData.split(',').map(s => s.trim());
                        
                        return linesArray.map(l => (
                          <span key={l} className={styles.lineTag}>{l}</span>
                        ));
                      })()}
                    </div>
                  </span>
                </div>
                <div className={styles.mobileCardRow}>
                  <span className={styles.mobileCardLabel}>Bairro:</span>
                  <span className={styles.mobileCardValue}>{stop.location}</span>
                </div>
                <div className={styles.mobileCardActions}>
                  {stopActions(stop)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{editingStop ? 'Editar Ponto' : 'Adicionar Ponto'}</h3>
            <form onSubmit={handleSave}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nome do Ponto</label>
                  <input className={styles.inputField} required placeholder="Ex: Terminal Matriz" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Bairro</label>
                  <input className={styles.inputField} required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Linhas (separadas por vírgula)</label>
                <input className={styles.inputField} required placeholder="Ex: 01, 04, 10" value={formData.lines} onChange={e => setFormData({...formData, lines: e.target.value})} />
              </div>
              
              <div className={styles.checkboxGroup}>
                <label>
                  <input type="checkbox" checked={formData.cobertura} onChange={e => setFormData({...formData, cobertura: e.target.checked})} /> Cobertura
                </label>
                <label>
                  <input type="checkbox" checked={formData.banco} onChange={e => setFormData({...formData, banco: e.target.checked})} /> Banco
                </label>
                <label>
                  <input type="checkbox" checked={formData.acessivel} onChange={e => setFormData({...formData, acessivel: e.target.checked})} /> Acessível
                </label>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Latitude</label>
                  <input className={styles.inputField} type="number" step="any" value={formData.lat} onChange={e => setFormData({...formData, lat: parseFloat(e.target.value) || 0})} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Longitude</label>
                  <input className={styles.inputField} type="number" step="any" value={formData.lng} onChange={e => setFormData({...formData, lng: parseFloat(e.target.value) || 0})} />
                </div>
              </div>

              <div className={styles.mapContainer}>
                <MapContainer center={[formData.lat, formData.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapClickHandler onClick={(latlng) => setFormData({...formData, lat: latlng.lat, lng: latlng.lng})} />
                  <Marker position={[formData.lat, formData.lng]} />
                </MapContainer>
              </div>

              <div className={styles.modalButtons}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className={styles.primaryBtn}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertasTab() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '', type: 'aviso', line_id: '' });
  const [lines, setLines] = useState([]);
  const [activeFilter, setActiveFilter] = useState('admin');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [alerts, linesData] = await Promise.all([storage.getAlerts(true), storage.getLines()]);
      setReports(alerts);
      setLines(linesData);
    } catch(e) {
      console.error(e);
    } finally { 
      setLoading(false); 
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingAlert) {
        await storage.updateAlert(editingAlert.id, formData, editingAlert.source);
        Swal.fire({ title: 'Sucesso', text: 'Alerta atualizado!', icon: 'success', confirmButtonColor: '#10b981' });
      } else {
        await storage.addAlert({ ...formData, created_at: new Date().toISOString() });
        Swal.fire({ title: 'Sucesso', text: 'Alerta publicado!', icon: 'success', confirmButtonColor: '#10b981' });
      }
      setShowModal(false);
      load();
    } catch (err) {
      Swal.fire({ title: 'Erro', text: err.message, icon: 'error', confirmButtonColor: '#10b981' });
    }
  };

  const handleEdit = (alert) => {
    setEditingAlert(alert);
    setFormData({
      title: alert.title || '',
      description: alert.description || '',
      type: alert.type || 'aviso',
      line_id: alert.line_id || ''
    });
    setShowModal(true);
  };

  const TAG_COLORS = {
    positivo: { bg: '#ecfdf5', text: '#059669', label: 'Positivo' },
    moderado: { bg: '#fffbeb', text: '#d97706', label: 'Moderado' },
    negativo: { bg: '#fef2f2', text: '#dc2626', label: 'Negativo' },
    warning: { bg: '#fffbeb', text: '#d97706', label: 'Moderado' },
    positive: { bg: '#ecfdf5', text: '#059669', label: 'Positivo' },
    negative: { bg: '#fef2f2', text: '#dc2626', label: 'Negativo' },
    aviso: { bg: '#fffbeb', text: '#d97706', label: 'Moderado' },
    nova_linha: { bg: '#ecfdf5', text: '#059669', label: 'Positivo' },
  };

  const getTypeStyle = (type) => {
    return TAG_COLORS[type?.toLowerCase()] || { bg: '#f1f5f9', text: '#64748b', label: type };
  };

  const officialAlerts = reports.filter(r => r.source === 'alerts');
  const userReports = reports.filter(r => r.source === 'reports');
  const displayList = activeFilter === 'admin' ? officialAlerts : userReports;

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeader}>
        <div>
          <h2>Centro de Mensagens</h2>
          <p className={styles.tableSubtitle}>Alertas oficiais e relatos da comunidade</p>
        </div>
        <button className={styles.primaryBtn} onClick={() => { setEditingAlert(null); setFormData({ title: '', description: '', type: 'aviso', line_id: '' }); setShowModal(true); }}>
          <Plus size={18} /> Novo Alerta
        </button>
      </div>

      <div className={styles.filterButtons}>
        <button onClick={() => setActiveFilter('admin')} className={`${styles.filterBtn} ${activeFilter === 'admin' ? styles.activeFilter : ''}`}>Oficiais</button>
        <button onClick={() => setActiveFilter('users')} className={`${styles.filterBtn} ${activeFilter === 'users' ? styles.activeFilter : ''}`}>Comunidade</button>
      </div>

      <div className={styles.alertasGrid}>
        {displayList.map(r => (
          <div key={r.id} className={styles.alertaCard}>
            <div className={styles.alertaHeader}>
              <span className={styles.alertaType} style={{ background: getTypeStyle(r.type).bg, color: getTypeStyle(r.type).text }}>
                {getTypeStyle(r.type).label}
              </span>
              <div className={styles.alertaActions}>
                <button className={styles.actionBtn} onClick={() => handleEdit(r)}>
                  <Edit2 size={16} color="#10b981" />
                </button>
                <button className={styles.actionBtn} onClick={async () => {
                   const res = await Swal.fire({
                     title: 'Excluir Alerta?',
                     text: 'Tem certeza que deseja remover este alerta?',
                     icon: 'warning',
                     showCancelButton: true,
                     confirmButtonColor: '#ef4444'
                   });
                   if (res.isConfirmed) {
                     await storage.deleteAlert(r.id, r.source);
                     load();
                   }
                 }}><Trash2 size={16} color="#10b981" /></button>
              </div>
            </div>
            <h4 className={styles.alertaTitle}>{r.title || 'Alerta'}</h4>
            <p className={styles.alertaDescription}>{r.description}</p>
            <div className={styles.alertaFooter}>
              <div className={styles.alertaAuthor}>
                <div className={styles.authorAvatar}>{r.author ? r.author[0] : 'A'}</div>
                <div>
                  <div className={styles.authorName}>{r.author}</div>
                  <div className={styles.alertaLocation}>{r.line_id ? `Linha: ${r.line_id}` : (r.location || 'Ponto de Ônibus')}</div>
                </div>
              </div>
              <span className={styles.alertaDate}>{new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{editingAlert ? 'Editar Alerta' : 'Novo Alerta'}</h3>
            <form onSubmit={handleSave}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Título</label>
                <input className={styles.inputField} required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tipo</label>
                <select className={styles.inputField} value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                  <option value="positivo">Positivo</option>
                  <option value="moderado">Moderado</option>
                  <option value="negativo">Negativo</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Descrição</label>
                <textarea className={styles.inputField} rows={3} required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className={styles.modalButtons}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className={styles.primaryBtn}>Publicar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function LinhasTab() {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLine, setEditingLine] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', route: '', popular: false });

  useEffect(() => { loadLines(); }, []);

  const loadLines = async () => {
    setLoading(true);
    try { setLines(await storage.getLines()); } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    const res = await Swal.fire({ title: 'Excluir Linha?', text: 'Remover todos os dados desta rota?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' });
    if(res.isConfirmed) { await storage.deleteLine(id); loadLines(); }
  };

  const handleEdit = (line) => {
    setEditingLine(line);
    setFormData({ name: line.name, description: line.description, popular: !!line.popular });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingLine) {
      await storage.updateLine(editingLine.id, formData);
    } else {
      await storage.addLine(formData);
    }

    Swal.fire({
      icon: 'success',
      title: editingLine ? 'Linha Atualizada!' : 'Linha Criada!',
      text: 'As informações foram salvas com sucesso.',
      confirmButtonColor: '#10b981',
      timer: 2000,
      showConfirmButton: false
    });

    setShowModal(false);
    setEditingLine(null);
    loadLines();
  };

  const lineActions = (line) => (
    <>
      <button className={styles.actionBtn} onClick={() => handleEdit(line)} title="Editar">
        <Edit2 size={16} color="#10b981" />
      </button>
      <button className={styles.actionBtn} onClick={() => handleDelete(line.id)} title="Excluir">
        <Trash2 size={16} color="#10b981" />
      </button>
    </>
  );

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeader}>
        <div>
          <h2>Malha de Ônibus</h2>
          <p className={styles.tableSubtitle}>Rotas oficiais e traçados de GPS</p>
        </div>
        <button className={styles.primaryBtn} onClick={() => { setEditingLine(null); setFormData({ name: '', description: '', popular: false }); setShowModal(true); }}>
          <Plus size={18} /> Nova Linha
        </button>
      </div>

      {loading ? (
        <p className={styles.loadingState}>Carregando...</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className={styles.desktopOnly}>
            <table className={styles.modernTable}>
              <thead>
                <tr>
                  <th>Linha</th>
                  <th>Descrição do Trajeto</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {lines.map(line => (
                  <tr key={line.id}>
                    <td><span className={styles.lineBadge}>{line.name}</span></td>
                    <td>{line.description}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        {lineActions(line)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className={styles.mobileOnly}>
            {lines.map(line => (
              <div key={line.id} className={styles.mobileCard}>
                <div className={styles.mobileCardRow}>
                  <span className={styles.mobileCardLabel}>Linha:</span>
                  <span className={styles.mobileCardValue}>
                    <span className={styles.lineBadge}>{line.name}</span>
                  </span>
                </div>
                <div className={styles.mobileCardRow}>
                  <span className={styles.mobileCardLabel}>Descrição:</span>
                  <span className={styles.mobileCardValue}>{line.description}</span>
                </div>
                <div className={styles.mobileCardActions}>
                  {lineActions(line)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalIcon}>
              <Route size={24} color="#10b981" />
            </div>
            <h3>{editingLine ? 'Editar Linha' : 'Nova Linha'}</h3>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Número da Linha</label>
                <input 
                  className={styles.inputField} 
                  placeholder="Ex: 01, 02, 10" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Descrição</label>
                <input 
                  className={styles.inputField} 
                  placeholder="Ex: Centro X Rodoviária" 
                  required 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                />
              </div>
              <div className={styles.modalButtons}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className={styles.primaryBtn}>
                  {editingLine ? 'Atualizar' : 'Criar Linha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SolicitacoesSenhaTab() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    load(); 
    
    // Configura o real-time para escutar mudanças na tabela
    const channel = supabase
      .channel('password_requests_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'password_requests' }, 
        (payload) => {
          // Quando houver qualquer mudança (INSERT, UPDATE, DELETE), recarrega os dados
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const load = async () => {
    setLoading(true);
    try { setRequests(await storage.getPasswordRequests()); } catch(e) {} finally { setLoading(false); }
  };

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeader}>
        <div>
          <h2>Segurança do Sistema</h2>
          <p className={styles.tableSubtitle}>Solicitações de redefinição de acesso</p>
        </div>
      </div>

      {loading ? (
        <p className={styles.loadingState}>Carregando...</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className={styles.desktopOnly}>
            <table className={styles.modernTable}>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Motivo Informado</th>
                  <th>Solicitado em</th>
                  <th>Status</th>
                 </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id}>
                     <td>{req.email}</td>
                     <td>{req.reason}</td>
                     <td>{new Date(req.created_at).toLocaleString('pt-BR')}</td>
                     <td>
                      <span className={`${styles.statusBadge} ${req.status?.toLowerCase() !== 'resolvido' ? styles.statusPendente : styles.statusResolvido}`}>
                        {req.status || 'pendente'}
                      </span>
                    </td>
                   </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className={styles.mobileOnly}>
            {requests.map(req => (
              <div key={req.id} className={styles.mobileCard}>
                <div className={styles.mobileCardRow}>
                  <span className={styles.mobileCardLabel}>Usuário:</span>
                  <span className={styles.mobileCardValue}>{req.email}</span>
                </div>
                <div className={styles.mobileCardRow}>
                  <span className={styles.mobileCardLabel}>Motivo:</span>
                  <span className={styles.mobileCardValue}>{req.reason}</span>
                </div>
                <div className={styles.mobileCardRow}>
                  <span className={styles.mobileCardLabel}>Data:</span>
                  <span className={styles.mobileCardValue}>{new Date(req.created_at).toLocaleString('pt-BR')}</span>
                </div>
                <div className={styles.mobileCardRow}>
                  <span className={styles.mobileCardLabel}>Status:</span>
                  <span className={styles.mobileCardValue}>
                    <span className={`${styles.statusBadge} ${req.status?.toLowerCase() !== 'resolvido' ? styles.statusPendente : styles.statusResolvido}`}>
                      {req.status || 'pendente'}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Admin() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('geral');

  if (!user || user.email !== 'admin@mobtracker.com') {
    return <Navigate to="/login" />;
  }

  const menuItems = [
    { id: 'geral', label: 'Visão Geral', icon: <LayoutDashboard size={20} /> },
    { id: 'usuarios', label: 'Usuários', icon: <Users size={20} /> },
    { id: 'alertas', label: 'Alertas', icon: <Bell size={20} /> },
    { id: 'pontos', label: 'Pontos', icon: <Navigation size={20} /> },
    { id: 'linhas', label: 'Linhas', icon: <Route size={20} /> },
    { id: 'senhas', label: 'Senhas', icon: <Key size={20} /> },
  ];

  return (
    <div className={styles.adminContainer}>
      <aside className={styles.sidebar}>
        <div className={styles.logoArea}>
          <h1>MobAdmin</h1>
        </div>

        <nav className={styles.nav}>
          {menuItems.map(item => (
            <div 
              key={item.id} 
              className={`${styles.navItem} ${activeTab === item.id ? styles.activeNavItem : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
              {activeTab === item.id && <ChevronRight size={16} className={styles.navChevron} />}
            </div>
          ))}
        </nav>

        <div className={styles.logoutButton}>
          <div className={styles.navItem} onClick={logout}>
            <LogOut size={20} color="#10b981" />
            <span>Sair</span>
          </div>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.header}>
          <div className={styles.welcomeSection}>
            <span className={styles.welcomeBadge}>Dashboard Administrativo</span>
            <h2>{menuItems.find(m => m.id === activeTab).label}</h2>
            <p>Seja bem-vindo ao painel administrativo do MobTracker.</p>
          </div>
          <div className={styles.adminInfo}>
            <div className={styles.adminText}>
              <div className={styles.adminName}>Administrador</div>
              <div className={styles.adminEmail}>{user.email}</div>
            </div>
            <div className={styles.adminAvatar}>
              {user.email ? user.email[0].toUpperCase() : 'A'}
            </div>
          </div>
        </header>

        <div className={styles.tabContent}>
          {activeTab === 'geral' && <VisaoGeralTab />}
          {activeTab === 'usuarios' && <UsuariosTab />}
          {activeTab === 'alertas' && <AlertasTab />}
          {activeTab === 'pontos' && <PontosTab />}
          {activeTab === 'linhas' && <LinhasTab />}
          {activeTab === 'senhas' && <SolicitacoesSenhaTab />}
        </div>
      </main>
    </div>
  );
}