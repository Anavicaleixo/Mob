import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Award, 
  Star, 
  ShoppingBag, 
  Coffee, 
  Bus, 
  Ticket, 
  TrendingUp,
  Gift,
  ChevronRight,
  Info,
  Plus,
  DollarSign,
  Leaf,
  Users,
  MessageSquare,
  ThumbsUp,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { storage } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';
import styles from './Recompensas.module.css';

// Mapeamento de ícones para transformar texto do banco em componente
const iconMap = {
  'Bus': <Bus size={28} color="#10b981" />,
  'Coffee': <Coffee size={28} color="#10b981" />,
  'ShoppingBag': <ShoppingBag size={28} color="#10b981" />,
  'Ticket': <Ticket size={28} color="#10b981" />,
  'Gift': <Gift size={28} color="white" />,
  'Award': <Award size={28} color="#10b981" />
};

export default function Recompensas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentPoints, setCurrentPoints] = useState(0);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [userStats, setUserStats] = useState({
    redeemedCount: 0,
    totalEarned: 0,
    totalRedeemed: 0,
    contributions: 0,
    tripsCount: 0
  });

  const [busPasses, setBusPasses] = useState([]);

  async function loadData() {
    if (!user) return;
    setLoading(true);
    try {
      // Busca o perfil para ter os pontos reais do banco
      const prof = await storage.getProfile(user.id);
      const points = prof?.points || 0;
      setCurrentPoints(points);

      // Busca dados em paralelo, mas lidando com erros individuais para que uma tabela faltando não quebre tudo
      const fetchRewards = storage.getRewards().catch(() => []);
      const fetchReports = storage.getUserReports(user.id).catch(() => []);
      const fetchRedemptions = storage.getRedemptions(user.id).catch(() => []);
      const fetchRatings = storage.getUserRatings(user.id).catch(() => []);
      const fetchTrips = storage.getUserTrips(user.id).catch(() => []);
      const fetchPasses = storage.getBusPasses().catch(() => []);

      const [rewardsData, reports, redemptions, ratings, trips, passesData] = await Promise.all([
        fetchRewards,
        fetchReports,
        fetchRedemptions,
        fetchRatings,
        fetchTrips,
        fetchPasses
      ]);
      
      setRewards(rewardsData || []);
      
      const LOCAL_PASSES = [
        { id: 1, title: 'Passe de 1 viagem', desc: '1 passagem de ônibus municipal', cost: 100 },
        { id: 2, title: 'Passe de 5 viagens', desc: '5 passagens com 10% de desconto', cost: 450 },
        { id: 3, title: 'Passe de 10 viagens', desc: '10 passagens com 20% de desconto', cost: 800 },
        { id: 4, title: 'Passe mensal', desc: 'Passe mensal ilimitado', cost: 2500 },
      ];
      setBusPasses(passesData && passesData.length > 0 ? passesData : LOCAL_PASSES);
      
      // Calcula estatísticas reais
      const safeReports = reports || [];
      const safeRedemptions = redemptions || [];
      const safeRatings = ratings || [];
      const safeTrips = trips || [];

      const totalRedeemedPoints = safeRedemptions.reduce((sum, r) => sum + (r.cost || 0), 0);
      setUserStats({
        redeemedCount: safeRedemptions.length,
        totalEarned: points + totalRedeemedPoints,
        totalRedeemed: totalRedeemedPoints,
        contributions: safeReports.length + safeRatings.length,
        tripsCount: safeTrips.length
      });

      // Converte relatos em histórico
      const historyData = safeReports.map(r => ({
        id: `rep-${r.id}`,
        title: `Relato enviado (${r.type})`,
        date: new Date(r.created_at).toLocaleDateString('pt-BR'),
        timestamp: new Date(r.created_at).getTime(),
        points: 10,
        type: 'earn'
      }));

      // Adiciona resgates ao histórico
      const redemptionHistory = safeRedemptions.map(r => ({
        id: `red-${r.id}`,
        title: `Resgate: ${r.title}`,
        date: new Date(r.created_at).toLocaleDateString('pt-BR'),
        timestamp: new Date(r.created_at).getTime(),
        points: -r.cost,
        type: 'redeem'
      }));

      // Adiciona viagens ao histórico
      const tripsHistory = safeTrips.map(t => ({
        id: `trip-${t.id}`,
        title: `Viagem registrada (${t.line_id || 'Linha'})`,
        date: new Date(t.created_at).toLocaleDateString('pt-BR'),
        timestamp: new Date(t.created_at).getTime(),
        points: 20,
        type: 'earn'
      }));

      setHistory([...historyData, ...redemptionHistory, ...tripsHistory].sort((a, b) => b.timestamp - a.timestamp));

    } catch (err) {
      console.error("Erro ao carregar recompensas:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user]);

  const handleRedeem = async (reward) => {
    if (currentPoints < reward.cost) return;

    const result = await Swal.fire({
      title: 'Confirmar Resgate',
      text: `Deseja resgatar "${reward.title}" por ${reward.cost} pontos?`,
      icon: 'question',
      iconColor: '#10b981',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sim, resgatar!',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      await storage.redeemReward(user.id, reward.id, reward.cost, reward.title);
      Swal.fire({
        icon: 'success',
        iconColor: '#10b981',
        title: 'Resgate realizado!',
        text: 'Seu benefício foi resgatado com sucesso.',
        confirmButtonColor: '#10b981'
      });
      loadData(); // Recarrega dados
    } catch (err) {
      Swal.fire({
        icon: 'error',
        iconColor: '#10b981',
        title: 'Erro no Resgate',
        text: err.message,
        confirmButtonColor: '#10b981'
      });
    }
  };

  const handleQuickTrip = async () => {
    if (!user) {
      return Swal.fire({
        icon: 'info',
        iconColor: '#10b981',
        title: 'Atenção',
        text: 'Você precisa estar logado para registrar viagens!',
        confirmButtonColor: '#10b981'
      });
    }

    const { value: line } = await Swal.fire({
      title: 'Registrar Viagem',
      input: 'select',
      inputOptions: {
        '01': 'Linha 01',
        '04': 'Linha 04',
        '05': 'Linha 05',
        '06': 'Linha 06',
        '07': 'Linha 07',
        '08': 'Linha 08',
        '09': 'Linha 09',
        '10': 'Linha 10',
        '13': 'Linha 13'
      },
      inputLabel: 'Qual linha você está usando agora?',
      inputPlaceholder: 'Selecione uma linha',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      iconColor: '#10b981',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar'
    });

    if (!line) return;

    try {
      await storage.addTrip(user.id, line);
      Swal.fire({
        icon: 'success',
        iconColor: '#10b981',
        title: 'Viagem Registrada!',
        text: '+20 MobPontos adicionados à sua conta.',
        confirmButtonColor: '#10b981'
      });
      loadData();
    } catch (err) {
      Swal.fire({
        icon: 'warning',
        iconColor: '#10b981',
        title: 'Atenção',
        text: err.message || 'Não foi possível registrar sua viagem.',
        confirmButtonColor: '#10b981'
      });
    }
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div className={styles.headerOverlay}></div>
        <div className={styles.headerContent}>
          <div className={styles.badge}>
            <Gift size={16} color="white" />
            <span>Programa de Recompensas</span>
          </div>
          
          <h1 className={styles.title}>MobPontos</h1>
          <p className={styles.subtitle}>
            Contribua com relatos e avaliações, acumule pontos e troque por passagens de ônibus
          </p>

          <div className={styles.pointsCard}>
            <span className={styles.cardLabel}>Seu saldo</span>
            <div className={styles.pointsDisplay}>
              <Star size={48} fill="#10b981" color="#10b981" />
              <span className={styles.pointsValue}>{currentPoints}</span>
            </div>
            <span className={styles.pointsSublabel}>pontos disponíveis</span>
          </div>

          <div className={styles.headerInfoSection}>
            <h2 className={styles.headerInfoTitle}>Por que usar o ônibus?</h2>
            <p className={styles.headerInfoText}>
              O transporte coletivo é uma escolha inteligente para você e para a cidade. Veja por que cada viagem de ônibus faz diferença:
            </p>

            <div className={styles.headerBenefitsGrid}>
              <div className={styles.headerBenefitCard}>
                <div className={`${styles.benefitIcon} ${styles.iconDollar}`}>
                  <DollarSign size={20} color="#10b981" />
                </div>
                <div className={styles.benefitContent}>
                  <h3>Economia real</h3>
                  <p>Custa até 10x menos que carro próprio.</p>
                </div>
              </div>

              <div className={styles.headerBenefitCard}>
                <div className={`${styles.benefitIcon} ${styles.iconLeaf}`}>
                  <Leaf size={20} color="#10b981" />
                </div>
                <div className={styles.benefitContent}>
                  <h3>Sustentabilidade</h3>
                  <p>Reduz em 70% a emissão de CO₂.</p>
                </div>
              </div>

              <div className={styles.headerBenefitCard}>
                <div className={`${styles.benefitIcon} ${styles.iconBus}`}>
                  <Bus size={20} color="#10b981" />
                </div>
                <div className={styles.benefitContent}>
                  <h3>Mobilidade</h3>
                  <p>Acesso para toda a população.</p>
                </div>
              </div>

              <div className={styles.headerBenefitCard}>
                <div className={`${styles.benefitIcon} ${styles.iconUsers}`}>
                  <Users size={20} color="#10b981" />
                </div>
                <div className={styles.benefitContent}>
                  <h3>Menos trânsito</h3>
                  <p>Retira até 40 carros das ruas.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.mainContent}>
        <section className={styles.statsSection}>
          <h2 className={styles.sectionTitle}>Suas viagens de ônibus</h2>
          <div className={styles.statsCard}>
            <div className={styles.mainStat}>
              <span className={styles.bigNumber}>{userStats.redeemedCount}</span>
              <span className={styles.statDesc}>viagens resgatadas</span>
            </div>
            <div className={styles.divider}></div>
            <div className={styles.sideStats}>
              <div className={styles.sideStatItem}>
                <span>Pontos ganhos no total</span>
                <span className={styles.greenText}>{userStats.totalEarned} pts</span>
              </div>
              <div className={styles.sideStatItem}>
                <span>Pontos resgatados</span>
                <span className={styles.redText}>{userStats.totalRedeemed} pts</span>
              </div>
              <div className={styles.sideStatItem}>
                <span>Viagens registradas</span>
                <strong className={styles.greenText}>{userStats.tripsCount || 0}</strong>
              </div>
              <div className={styles.sideStatItem}>
                <span>Contribuições feitas</span>
                <strong>{userStats.contributions}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.earnSection}>
          <h2 className={styles.sectionTitle}>Como acumular pontos</h2>
          <div className={styles.earningGrid}>
            <div className={styles.earnCard} onClick={handleQuickTrip} style={{ cursor: 'pointer' }}>
              <div className={styles.earnIcon}><Bus size={20} color="#10b981" /></div>
              <div className={styles.earnText}>
                <h3>Registrar Viagem</h3>
                <p>No ônibus? Registre agora!</p>
              </div>
              <div className={styles.earnPoints}>+20 <Star size={14} fill="#10b981" color="#10b981" /></div>
            </div>

            <div className={styles.earnCard} onClick={() => navigate('/pontos')} style={{ cursor: 'pointer' }}>
              <div className={styles.earnIcon}><MessageSquare size={20} color="#10b981" /></div>
              <div className={styles.earnText}>
                <h3>Publicar um relato</h3>
                <p>Compartilhe sua experiência</p>
              </div>
              <div className={styles.earnPoints}>+10 <Star size={14} fill="#10b981" color="#10b981" /></div>
            </div>

            <div className={styles.earnCard} onClick={() => navigate('/linhas')} style={{ cursor: 'pointer' }}>
              <div className={styles.earnIcon}><Star size={20} color="#10b981" /></div>
              <div className={styles.earnText}>
                <h3>Avaliar uma linha</h3>
                <p>Avalie a qualidade do serviço</p>
              </div>
              <div className={styles.earnPoints}>+5 <Star size={14} fill="#10b981" color="#10b981" /></div>
            </div>

            <div className={styles.earnCard} onClick={() => navigate('/linhas')} style={{ cursor: 'pointer' }}>
              <div className={styles.earnIcon}><ThumbsUp size={20} color="#10b981" /></div>
              <div className={styles.earnText}>
                <h3>Curtir relatos</h3>
                <p>Curta a experiência dos outros</p>
              </div>
              <div className={styles.earnPoints}>+2 <Star size={14} fill="#10b981" color="#10b981" /></div>
            </div>

          </div>
        </section>

        <section className={styles.redeemSection}>
          <h2 className={styles.sectionTitle}>Resgatar passagens</h2>
          <div className={styles.redeemGrid}>
            {busPasses.map(pass => (
              <div 
                key={pass.id} 
                className={`${styles.redeemCard} ${currentPoints < pass.cost ? styles.disabled : ''}`}
                onClick={() => handleRedeem(pass)}
                style={{ cursor: currentPoints >= pass.cost ? 'pointer' : 'default' }}
              >
                <div className={styles.redeemHeader}>
                  <div className={styles.redeemInfo}>
                    <h3>{pass.title}</h3>
                    <p>{pass.description || pass.desc}</p>
                  </div>
                  <Ticket size={24} className={styles.ticketIcon} color="#10b981" />
                </div>
                <div className={styles.redeemFooter}>
                  <div className={styles.costInfo}>
                    <Star size={16} fill="#10b981" color="#10b981" />
                    <strong>{pass.cost} pts</strong>
                  </div>
                  {currentPoints >= pass.cost ? (
                    <span className={styles.availableBadge}>Disponível</span>
                  ) : (
                    <span className={styles.missingBadge}>Faltam {pass.cost - currentPoints} pts</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>


        <section className={styles.historySection}>
          <h2 className={styles.sectionTitle}>Histórico de transações</h2>
          <div className={styles.historyList}>
            {history.map(item => (
              <div key={item.id} className={styles.historyItem}>
                <div className={`${styles.historyIcon} ${item.type === 'redeem' ? styles.redeemIcon : ''}`}>
                  {item.type === 'redeem' ? <ShoppingBag size={18} color="#10b981" /> : <ArrowUpRight size={18} color="#10b981" />}
                </div>
                <div className={styles.historyInfo}>
                  <h3>{item.title}</h3>
                  <span>{item.date}</span>
                </div>
                <div className={`${styles.historyPoints} ${item.type === 'redeem' ? styles.negative : ''}`}>
                  {item.type === 'earn' ? '+' : ''}{item.points} <Star size={14} fill="#10b981" color="#10b981" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
