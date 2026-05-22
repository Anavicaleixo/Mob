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
import { linesDetailData } from '../data/linesData';
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
    <div style={{ display: 'flex', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #f1f5f9', gap: '1rem' }}>
      <div style={{ width: '32px', fontWeight: 'bold', color: '#64748b' }}>{pos}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span style={{ fontWeight: '700', color: '#1e293b' }}>Linha {linha}</span>
          <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: tagColor, color: tagText, fontWeight: 'bold' }}>{tag}</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{desc}</div>
      </div>
      <div style={{ width: '150px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.25rem' }}>
          <span style={{ color: '#64748b' }}>Popularidade</span>
          <span style={{ color: '#10b981', fontWeight: '700' }}>{rel}</span>
        </div>
        <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)', borderRadius: '3px' }}></div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '800', color: '#10b981', fontSize: '1rem', background: '#ecfdf5', padding: '0.5rem 0.75rem', borderRadius: '12px' }}>
        <Star size={16} fill="#10b981" color="#10b981" /> {star}
      </div>
    </div>
  );
}

function MapClickHandler({ onClick }) {
  useMapEvents({
    click(e) { onClick(e.latlng); }
  });
  return null;
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
        lineRatings.forEach(r => {
          const val = Math.round(r.rating_value);
          if (val >= 1 && val <= 5) counts[val-1]++;
        });
        
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <div className={styles.statsGrid}>
        <CardStat icon={<Bell />} title={stats.alerts.toString()} subtitle="Alertas Ativos" color="#10b981" sub2="Oficiais do sistema" />
        <CardStat icon={<MessageSquare />} title={stats.reports.toString()} subtitle="Relatos de Usuários" color="#10b981" sub2={`${reports.filter(r => r.type === 'negative').length} críticas recebidas`} />
        <CardStat icon={<Star />} title={stats.avgLine.toFixed(1)} subtitle="Avaliação das Linhas" color="#10b981" sub2={`Média motoristas: ${stats.avgDriver.toFixed(1)}`} />
        <CardStat icon={<Award />} title={stats.redemptions?.toString() || "0"} subtitle="Recompensas" color="#10b981" sub2={`${stats.totalPoints || 0} pts resgatados`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className={styles.tableContainer}>
          <h3 className={styles.statTitle} style={{ marginBottom: '2rem' }}>Distribuição de Feedbacks</h3>
          <div style={{ height: '300px', minWidth: 0 }}>
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
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <h3 className={styles.statTitle} style={{ marginBottom: '2rem' }}>Frequência de Notas</h3>
          <div style={{ height: '300px', minWidth: 0 }}>
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
        <div style={{ marginTop: '1rem' }}>
          {loading ? <p>Processando estatísticas...</p> : (
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
                  desc={line.description} 
                  rel={line.reportsCount} 
                  tag={line.positiveCount > 0 ? "Popular" : "Estável"} 
                  tagColor={line.positiveCount > 0 ? "#dcfce7" : "#f1f5f9"} 
                  tagText={line.positiveCount > 0 ? "#166534" : "#64748b"} 
                  star={(3.8 + Math.random() * 1.2).toFixed(1)}
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

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeader}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Gerenciar Usuários</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{profiles.length} usuários cadastrados no sistema</p>
        </div>
        <button className={styles.primaryBtn} onClick={() => { setEditingUser(null); setFormData({ nome: '', email: '', points: 0, password: '', foto: null }); setShowModal(true); }}>
          <Plus size={18} /> Novo Usuário
        </button>
      </div>

      {loading ? <p>Carregando...</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.modernTable}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>MobPontos</th>
                <th>Cadastro</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1c4f36', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', overflow: 'hidden' }}>
                        {p.foto ? <img src={p.foto} alt="Av" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p.nome ? p.nome[0] : 'U')}
                      </div>
                      <div style={{ fontWeight: '600' }}>{p.nome || 'Sem Nome'}</div>
                    </div>
                  </td>
                  <td><div style={{ color: '#64748b', fontSize: '0.875rem' }}>{p.email}</div></td>
                  <td>
                    <span style={{ background: '#ecfdf5', color: '#059669', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: '700' }}>
                      {p.points || 0} pts
                    </span>
                  </td>
                  <td><div style={{ fontSize: '0.875rem' }}>{p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '-'}</div></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className={styles.actionBtn} onClick={() => { setEditingUser(p); setFormData({ nome: p.nome || '', email: p.email, points: p.points || 0, password: '', foto: p.foto || null }); setShowModal(true); }} title="Editar"><Edit2 size={16} color="#10b981" /></button>
                      <button className={styles.actionBtn} onClick={() => handleDelete(p.id)} title="Excluir"><Trash2 size={16} color="#10b981" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ alignSelf: 'center', marginBottom: '0.5rem' }}>
                <label style={{ cursor: 'pointer', display: 'block' }}>
                  <input type="file" style={{ display: 'none' }} accept="image/*" onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        Swal.fire({ title: 'Atenção', text: 'A imagem deve ter menos de 5MB', icon: 'warning', confirmButtonColor: '#10b981' });
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => setFormData({ ...formData, foto: reader.result });
                      reader.readAsDataURL(file);
                    }
                  }} />
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e1', overflow: 'hidden' }}>
                    {formData.foto ? <img src={formData.foto} alt="P" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={24} color="#94a3b8" />}
                  </div>
                </label>
              </div>
              <div>
                <label className={styles.formLabel}>Nome Completo</label>
                <input className={styles.inputField} required value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} />
              </div>
              <div>
                <label className={styles.formLabel}>E-mail</label>
                <input className={styles.inputField} type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              {!editingUser && (
                <div>
                  <label className={styles.formLabel}>Senha Temporária</label>
                  <input className={styles.inputField} type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                </div>
              )}
              <div>
                <label className={styles.formLabel}>MobPontos</label>
                <input className={styles.inputField} type="number" required value={formData.points} onChange={e => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" className={styles.primaryBtn} style={{ flex: 1, justifyContent: 'center' }}>Salvar</button>
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
      // Formata as linhas para garantir que sejam enviadas corretamente
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
      // Limpa o formulário
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

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeader}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Pontos de Parada</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Gestão de terminais e pontos físicos</p>
        </div>
        <button className={styles.primaryBtn} onClick={() => { setEditingStop(null); setFormData({ name: '', location: '', lat: -23.100, lng: -45.700, lines: '', cobertura: false, banco: false, acessivel: false }); setShowModal(true); }}>
          <Plus size={18} /> Novo Ponto
        </button>
      </div>

      {loading ? <p>Carregando...</p> : (
        <div style={{ overflowX: 'auto' }}>
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
                  <td><div style={{ fontWeight: '600' }}>{stop.name}</div></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {(() => {
                        const linesData = stop.lines;
                        let linesArray = [];
                        if (Array.isArray(linesData)) linesArray = linesData;
                        else if (typeof linesData === 'string') linesArray = linesData.split(',').map(s => s.trim());
                        
                        return linesArray.map(l => (
                          <span key={l} style={{ background: '#f1f5f9', color: '#475569', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>{l}</span>
                        ));
                      })()}
                    </div>
                  </td>
                  <td><div style={{ fontSize: '0.875rem', color: '#64748b' }}>{stop.location}</div></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className={styles.actionBtn} onClick={() => handleEdit(stop)} title="Editar"><Edit2 size={16} color="#10b981" /></button>
                      <button className={styles.actionBtn} onClick={() => handleDelete(stop.id)} title="Excluir"><Trash2 size={16} color="#10b981" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '480px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem' }}>{editingStop ? 'Editar Ponto' : 'Adicionar Ponto'}</h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className={styles.formLabel}>Nome do Ponto</label>
                  <input className={styles.inputField} required placeholder="Ex: Terminal Matriz" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className={styles.formLabel}>Bairro</label>
                  <input className={styles.inputField} required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                </div>
              </div>
              <div>
                <label className={styles.formLabel}>Linhas (separadas por vírgula)</label>
                <input className={styles.inputField} required placeholder="Ex: 01, 04, 10" value={formData.lines} onChange={e => setFormData({...formData, lines: e.target.value})} />
              </div>
              
              <div style={{ display: 'flex', gap: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={formData.cobertura} onChange={e => setFormData({...formData, cobertura: e.target.checked})} /> Cobertura
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={formData.banco} onChange={e => setFormData({...formData, banco: e.target.checked})} /> Banco
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={formData.acessivel} onChange={e => setFormData({...formData, acessivel: e.target.checked})} /> Acessível
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className={styles.formLabel}>Latitude</label>
                  <input className={styles.inputField} type="number" step="any" value={formData.lat} onChange={e => setFormData({...formData, lat: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className={styles.formLabel}>Longitude</label>
                  <input className={styles.inputField} type="number" step="any" value={formData.lng} onChange={e => setFormData({...formData, lng: parseFloat(e.target.value) || 0})} />
                </div>
              </div>

              <div style={{ height: '200px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <MapContainer center={[formData.lat, formData.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapClickHandler onClick={(latlng) => setFormData({...formData, lat: latlng.lat, lng: latlng.lng})} />
                  <Marker position={[formData.lat, formData.lng]} />
                </MapContainer>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" className={styles.primaryBtn} style={{ flex: 1, justifyContent: 'center' }}>Salvar</button>
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
      console.log('[Admin] Alertas carregados do banco:', alerts);
      setReports(alerts);
      setLines(linesData);
    } catch(e) {
      console.error('[Admin] Erro ao carregar dados:', e);
    } finally { 
      setLoading(false); 
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingAlert) {
        const updated = await storage.updateAlert(editingAlert.id, formData, editingAlert.source);
        
        // Atualiza localmente o estado para garantir que a UI mude na hora
        setReports(prev => prev.map(r => {
          if (r.id === editingAlert.id) {
            return { 
              ...r, 
              ...updated, 
              source: editingAlert.source,
              // Mantemos o autor virtual se for da tabela alerts
              author: editingAlert.source === 'alerts' ? 'Admin MobTracker' : (updated.author || r.author)
            };
          }
          return r;
        }));

        Swal.fire({ title: 'Sucesso', text: 'Alerta atualizado!', icon: 'success', confirmButtonColor: '#10b981' });
      } else {
        await storage.addAlert({ ...formData, created_at: new Date().toISOString() });
        Swal.fire({ title: 'Sucesso', text: 'Alerta publicado!', icon: 'success', confirmButtonColor: '#10b981' });
      }
      setShowModal(false);
      load(); // Recarga de segurança
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Centro de Mensagens</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Alertas oficiais e relatos da comunidade</p>
        </div>
        <button className={styles.primaryBtn} onClick={() => { setEditingAlert(null); setFormData({ title: '', description: '', type: 'aviso', line_id: '' }); setShowModal(true); }}>
          <Plus size={18} /> Novo Alerta
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', margin: '1.5rem 0', background: '#f1f5f9', padding: '0.4rem', borderRadius: '12px', width: 'fit-content' }}>
        <button onClick={() => setActiveFilter('admin')} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: activeFilter === 'admin' ? 'white' : 'transparent', boxShadow: activeFilter === 'admin' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none', color: activeFilter === 'admin' ? '#1c4f36' : '#64748b', fontWeight: '700', cursor: 'pointer' }}>Oficiais</button>
        <button onClick={() => setActiveFilter('users')} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: activeFilter === 'users' ? 'white' : 'transparent', boxShadow: activeFilter === 'users' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none', color: activeFilter === 'users' ? '#1c4f36' : '#64748b', fontWeight: '700', cursor: 'pointer' }}>Comunidade</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {displayList.map(r => (
          <div key={r.id} style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', border: '1px solid #f1f5f9', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ 
                background: getTypeStyle(r.type).bg, 
                color: getTypeStyle(r.type).text, 
                padding: '0.2rem 0.6rem', 
                borderRadius: '6px', 
                fontSize: '0.7rem', 
                fontWeight: '800', 
                textTransform: 'uppercase' 
              }}>
                {getTypeStyle(r.type).label}
              </span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button className={styles.actionBtn} onClick={() => handleEdit(r)} title="Editar"><Edit2 size={16} color="#10b981" /></button>
                <button className={styles.actionBtn} onClick={async () => { await storage.deleteAlert(r.id, r.source); load(); }} title="Excluir"><Trash2 size={16} color="#10b981" /></button>
              </div>
            </div>
            <h4 style={{ fontWeight: '700', marginBottom: '0.5rem', color: '#1e293b' }}>{r.title || 'Alerta'}</h4>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: '1.5', marginBottom: '1.25rem' }}>{r.description}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#1c4f36', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.6rem' }}>{r.author ? r.author[0] : 'A'}</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569' }}>{r.author}</span>
                  <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 'bold' }}>
                    {r.line_id ? `Linha: ${r.line_id}` : (r.location || 'Ponto de Ônibus')}
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '480px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem' }}>{editingAlert ? 'Editar Alerta' : 'Novo Alerta'}</h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className={styles.formLabel}>Título</label>
                <input className={styles.inputField} required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div>
                <label className={styles.formLabel}>Tipo</label>
                <select className={styles.inputField} value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                  <option value="positivo">Positivo</option>
                  <option value="moderado">Moderado</option>
                  <option value="negativo">Negativo</option>
                </select>
              </div>
              <div>
                <label className={styles.formLabel}>Descrição</label>
                <textarea className={styles.inputField} rows={3} required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" className={styles.primaryBtn} style={{ flex: 1, justifyContent: 'center' }}>Publicar</button>
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
  const [coords, setCoords] = useState([]);

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
    try {
      setCoords(JSON.parse(line.route) || []);
    } catch(e) {
      setCoords([]);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, route: JSON.stringify(coords) };
    
    if (editingLine) {
      await storage.updateLine(editingLine.id, payload);
    } else {
      await storage.addLine(payload);
    }

    Swal.fire({
      icon: 'success',
      title: editingLine ? 'Linha Atualizada!' : 'Linha Criada!',
      text: 'O trajeto e as informações foram salvos.',
      confirmButtonColor: '#10b981',
      timer: 2000,
      showConfirmButton: false
    });

    setShowModal(false);
    setEditingLine(null);
    setCoords([]);
    loadLines();
  };

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeader}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Malha de Ônibus</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Rotas oficiais e traçados de GPS</p>
        </div>
        <button className={styles.primaryBtn} onClick={() => { setEditingLine(null); setFormData({ name: '', description: '', popular: false }); setCoords([]); setShowModal(true); }}>
          <Plus size={18} /> Nova Linha
        </button>
      </div>

      {loading ? <p>Carregando...</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.modernTable}>
            <thead>
              <tr>
                <th>Linha</th>
                <th>Descrição do Trajeto</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {lines.map(line => {
                let pts = 0;
                let rawRoute = line.route || line.trajeto || line.detalhes || line.extra_info;
                
                try { 
                  const parsed = typeof rawRoute === 'string' ? JSON.parse(rawRoute) : rawRoute;
                  if (Array.isArray(parsed)) {
                    pts = parsed.length;
                    line.route = JSON.stringify(parsed); // Normaliza para o resto do componente
                  }
                } catch(e) {}
                return (
                  <tr key={line.id}>
                    <td><div className={styles.lineBadge} style={{ background: '#1c4f36', color: 'white', display: 'inline-flex', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: '800' }}>{line.name}</div></td>
                    <td><div style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: '500' }}>{line.description}</div></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className={styles.actionBtn} onClick={() => handleEdit(line)} title="Editar"><Edit2 size={16} color="#10b981" /></button>
                        <button className={styles.actionBtn} onClick={() => handleDelete(line.id)} title="Excluir"><Trash2 size={16} color="#10b981" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className={styles.modalOverlay} style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15, 23, 42, 0.65)' }}>
          <div className={styles.modalContent} style={{ maxWidth: '440px', padding: '2rem', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px' }}>
                <Route size={24} color="#10b981" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>{editingLine ? 'Editar Linha' : 'Nova Linha'}</h3>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  <Bus size={18} />
                </div>
                <input 
                  className={styles.inputField} 
                  placeholder="Nº Linha" 
                  required 
                  style={{ paddingLeft: '3rem', height: '52px', borderRadius: '14px' }}
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>

              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  <MessageSquare size={18} />
                </div>
                <input 
                  className={styles.inputField} 
                  placeholder="Descrição (ex: Centro X Rodoviária)" 
                  required 
                  style={{ paddingLeft: '3rem', height: '52px', borderRadius: '14px' }}
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setShowModal(false)} style={{ flex: 1, height: '48px', borderRadius: '14px', fontWeight: '700' }}>Cancelar</button>
                <button type="submit" className={styles.primaryBtn} style={{ flex: 1, height: '48px', borderRadius: '14px', fontWeight: '700', justifyContent: 'center' }}>
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

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try { setRequests(await storage.getPasswordRequests()); } catch(e) {} finally { setLoading(false); }
  };

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeader}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Segurança do Sistema</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Solicitações de redefinição de acesso</p>
        </div>
      </div>

      {loading ? <p>Carregando...</p> : (
        <div style={{ overflowX: 'auto' }}>
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
                  <td><div style={{ fontWeight: '600' }}>{req.email}</div></td>
                  <td><div style={{ fontSize: '0.875rem', color: '#64748b' }}>{req.reason}</div></td>
                  <td><div style={{ fontSize: '0.875rem' }}>{new Date(req.created_at).toLocaleString('pt-BR')}</div></td>
                  <td>
                    <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800', background: req.status === 'pendente' ? '#f1f5f9' : '#ecfdf5', color: req.status === 'pendente' ? '#64748b' : '#059669' }}>{req.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    { id: 'pontos', label: 'Pontos de Parada', icon: <Navigation size={20} /> },
    { id: 'linhas', label: 'Linhas de Ônibus', icon: <Route size={20} /> },
    { id: 'senhas', label: 'Redefinição Senha', icon: <Key size={20} /> },
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
              {item.label}
              {activeTab === item.id && <ChevronRight size={16} style={{ marginLeft: 'auto' }} />}
            </div>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', padding: '1rem' }}>
          <div className={styles.navItem} onClick={logout} style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}>
            <LogOut size={20} color="#10b981" />
            Sair do Painel
          </div>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.header}>
          <div className={styles.welcomeSection}>
            <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', display: 'block' }}>Dashboard Administrativo</span>
            <h2>{menuItems.find(m => m.id === activeTab).label}</h2>
            <p>Seja bem-vindo ao painel administrativo do MobTracker.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'right', marginRight: '1rem' }}>
              <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#1e293b' }}>Administrador</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>{user.email}</div>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, #1c4f36 0%, #064e3b 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(28, 79, 54, 0.2)' }}>
              {user.email ? user.email[0].toUpperCase() : 'A'}
            </div>
          </div>
        </header>

        <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
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
