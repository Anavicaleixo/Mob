import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../services/storage';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';

export default function Relatar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [lines, setLines] = useState([]);
  const [formData, setFormData] = useState({
    lineId: location.state?.lineId || '',
    type: 'warning',
    description: location.state?.stopName ? `Relato sobre o ponto: ${location.state.stopName}. ` : ''
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    storage.getLines().then(setLines);
  }, []);

  if (!user) {
    return <Navigate to="/login" />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const profile = await storage.getProfile(user.id);
      await storage.addReport({
        ...formData,
        author: profile?.nome || (user?.email ? user.email.split('@')[0] : 'Anônimo'),
        userId: user?.id
      });
      setMsg('Relato enviado com sucesso! Você ganhou +10 MobPontos!');
      setFormData({ lineId: '', type: 'warning', description: '' });
      setTimeout(() => navigate('/pontos'), 3000); // Envia para o mapa após 3 segundos
    } catch (err) {
      setMsg(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 2rem' }}>
      <h1 style={{ color: 'var(--color-primary-dark)', marginBottom: '1rem' }}>Relatar Ocorrência</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>Sua informação ajuda milhares de pessoas a se programarem melhor.</p>
      
      <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
        {msg && <div style={{ marginBottom: '1.5rem', padding: '1rem', background: msg.includes('Erro') ? '#fee2e2' : '#dcfce7', color: msg.includes('Erro') ? '#991b1b' : '#166534', borderRadius: '8px', fontWeight: 'bold' }}>{msg}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Linha de Ônibus</label>
            <select 
              required 
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '4px' }}
              value={formData.lineId}
              onChange={e => setFormData({...formData, lineId: e.target.value})}
            >
              <option value="" disabled>Selecione a linha...</option>
              {lines.map(l => (
                <option key={l.id} value={l.name}>Linha {l.name} - {l.description.split('X')[0]}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Tipo de Relato</label>
            <select 
              required 
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '4px' }}
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
            >
              <option value="warning">Atraso / Problema Médio</option>
              <option value="negative">Ônibus Quebrado / Superlotação</option>
              <option value="positive">Tudo Certo / Rápido e Vazio</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Descrição do que aconteceu</label>
            <textarea 
              required 
              placeholder="Ex: O ônibus quebrou na avenida principal..."
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '4px', minHeight: '100px' }}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            ></textarea>
          </div>

          <button type="submit" disabled={loading} style={{ background: 'var(--color-primary-dark)', color: 'white', border: 'none', padding: '1rem', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '0.5rem' }}>
            {loading ? 'Enviando...' : 'Publicar Relato'}
          </button>
        </form>
      </div>
    </div>
  );
}
