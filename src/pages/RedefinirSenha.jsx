import React, { useState, useEffect } from 'react';
import { Lock, Bus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import styles from './Login.module.css';
import logoImg from '../assets/logo.png';

export default function RedefinirSenha() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Tenta capturar a sessão assim que a página carrega
    // O Supabase precisa de um tempinho para processar o hash da URL (#access_token=...)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Se não encontrar sessão imediata, espera um pouco e tenta de novo
        // pois o processamento do token pode ser assíncrono
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (!retrySession) {
            setError("Link de recuperação inválido ou expirado. Por favor, solicite um novo e-mail.");
          }
          setCheckingSession(false);
        }, 1000);
      } else {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Sessão de recuperação não encontrada. Tente clicar no link do e-mail novamente.");
      }

      const userEmail = session?.user?.email;
      if (userEmail) {
        try {
          const { data: updatedData, error: updateErr } = await supabase
            .from('password_requests')
            .update({ status: 'resolvido' })
            .ilike('email', userEmail.trim())
            .select();
            
          if (updateErr) console.error("Update error:", updateErr);
          if (!updatedData || updatedData.length === 0) {
            console.error("Nenhuma linha foi atualizada. Isso confirma bloqueio de RLS no Supabase.");
          }
        } catch(err) {
          console.error("Erro ao atualizar status do request:", err);
        }
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setMessage("Senha atualizada com sucesso! Você será redirecionado para o login.");
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || "Erro ao atualizar senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.brand}>
        <img src={logoImg} alt="MobTracker Logo" style={{ height: '180px', marginBottom: '0.25rem' }} />
        <p>Nova Senha</p>
        <span>Digite sua nova senha abaixo.</span>
      </div>

      <div className={styles.card}>
        {checkingSession ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Verificando link de recuperação...</div>
        ) : message ? (
          <div style={{ color: 'var(--color-success)', textAlign: 'center', fontWeight: '500' }}>{message}</div>
        ) : (
          <form onSubmit={handleUpdatePassword}>
            {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
            
            <div className={styles.formGroup}>
              <label>Nova Senha</label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={18} />
                <input 
                  type="password" 
                  placeholder="Mínimo 6 caracteres" 
                  className={styles.input}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={!!error}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Confirmar Nova Senha</label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={18} />
                <input 
                  type="password" 
                  placeholder="Confirme sua senha" 
                  className={styles.input}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={!!error}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className={styles.btnPrimary} 
              disabled={loading || !!error} 
              style={{ marginTop: '1rem' }}
            >
              {loading ? 'Atualizando...' : 'Atualizar Senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
