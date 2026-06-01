import React, { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { storage } from '../services/storage';
import styles from './Login.module.css';
import logoImg from '../assets/logo.png';

export default function RecuperarSenha() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      // 1. PRIMEIRO: Registrar a solicitação na tabela password_requests
      console.log('📝 Registrando solicitação para:', email);
      await storage.createPasswordRequest(email, 'Usuário solicitou redefinição de senha via formulário');
      console.log('✅ Solicitação registrada com sucesso!');
      
      // 2. SEGUNDO: Enviar o email de redefinição
      await storage.resetPassword(email);
      
      setMessage("Um e-mail com o link de redefinição foi enviado para " + email + ". Verifique sua caixa de entrada e a pasta de spam.");
    } catch (err) {
      console.error('❌ Erro:', err);
      setError(err.message || "Erro ao enviar e-mail de recuperação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.brand}>
        <img src={logoImg} alt="MobTracker Logo" style={{ height: '180px', marginBottom: '0.25rem' }} />
        <p>Recuperar Senha</p>
        <span>Enviaremos um link de redefinição para o seu e-mail.</span>
      </div>

      <div className={styles.card}>
        {message ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--color-success)', marginBottom: '1.5rem', fontWeight: '500' }}>{message}</div>
            <Link to="/login" className={styles.btnPrimary} style={{ textDecoration: 'none', display: 'block' }}>
              Voltar ao Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleResetPassword}>
            {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
            
            <div className={styles.formGroup}>
              <label>E-mail da conta</label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} size={18} />
                <input 
                  type="email" 
                  placeholder="Seu e-mail cadastrado" 
                  className={styles.input}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className={styles.btnPrimary} disabled={loading} style={{ marginTop: '1rem' }}>
              {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
            </button>

            <Link to="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>
              <ArrowLeft size={16} /> Voltar ao Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}