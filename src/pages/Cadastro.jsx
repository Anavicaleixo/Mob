import React, { useState } from 'react';
import { Mail, Lock, Bus, User, Camera } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../services/storage';
import styles from './Login.module.css'; 
import logoImg from '../assets/logo.png';


export default function Cadastro() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [foto, setFoto] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signup, logout } = useAuth();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) { // Limite de 1MB para Base64 no banco
        setError("A imagem deve ter menos de 1MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const authData = await signup(email, password);
      const userObj = authData?.user || authData;
      
      if (userObj && userObj.id) {
        // Criar perfil com nome e foto
        await storage.updateProfile(userObj.id, {
          nome,
          email,
          points: 50, // Pontos iniciais de boas-vindas
          foto
        });
      }

      await logout();
      setSuccessMsg("Conta criada com sucesso!");
      setNome('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFoto(null);
      
    } catch (err) {
      setError(err.message || "Erro ao fazer cadastro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.brand}>
        <img src={logoImg} alt="MobTracker Logo" style={{ height: '180px', marginBottom: '0.25rem' }} />
        <p>Crie sua conta</p>
        <span>Junte-se à comunidade e ajude a melhorar nossa mobilidade.</span>
      </div>

      <div className={styles.card}>
        <form onSubmit={handleSignup}>
          {error && <div style={{color: 'red', marginBottom: '1rem', textAlign: 'center', fontSize: '0.875rem'}}>{error}</div>}
          {successMsg && <div style={{color: '#10b981', marginBottom: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: 'bold'}}>{successMsg}</div>}
          
          <label className={styles.avatarUploader}>
            <input 
              type="file" 
              className={styles.fileInput} 
              accept="image/*" 
              onChange={handleFileChange} 
            />
            {foto ? (
              <img src={foto} alt="Preview" className={styles.avatarPreview} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                <Camera size={32} />
                <span>Foto de Perfil</span>
              </div>
            )}
          </label>

          <div className={styles.formGroup}>
            <label>Nome Completo</label>
            <div className={styles.inputWrapper}>
              <User className={styles.inputIcon} size={18} />
              <input 
                type="text" 
                placeholder="Seu nome" 
                className={styles.input}
                value={nome}
                onChange={e => setNome(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>E-mail</label>
            <div className={styles.inputWrapper}>
              <Mail className={styles.inputIcon} size={18} />
              <input 
                type="email" 
                placeholder="Seu e-mail" 
                className={styles.input}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Senha</label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} size={18} />
              <input 
                type="password" 
                placeholder="Sua senha (mín. 6 chars)" 
                className={styles.input}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Confirmar Senha</label>
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
              />
            </div>
          </div>

          <button type="submit" className={styles.btnPrimary} disabled={loading} style={{marginTop: '1rem'}}>
            {loading ? 'Cadastrando...' : 'Criar Conta'}
          </button>
        </form>

        <div className={styles.divider}>ou</div>

        <Link to="/login" className={styles.btnOutline} style={{display: 'block', textAlign: 'center', textDecoration: 'none'}}>
          Já tenho uma conta
        </Link>
      </div>
    </div>
  );
}
