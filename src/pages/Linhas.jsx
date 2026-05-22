import React, { useEffect, useState } from 'react';
import { Bus, ChevronRight, Info, MapPin, AlertTriangle, ShieldCheck, Settings, Factory } from 'lucide-react';
import { storage } from '../services/storage';
import { linesDetailData } from '../data/linesData';
import LineModal from '../components/LineModal/LineModal';
import styles from './Linhas.module.css';

const LineCard = React.memo(({ line, detail, onClick }) => {
  const hasDetail = Boolean(detail);
  return (
    <button
      onClick={onClick}
      className={styles.lineButton}
    >
      <div className={styles.lineInfo}>
        <div className={styles.lineBadge}>
          {line.name}
        </div>

        <div className={styles.lineText}>
          <h3>
            LINHA {line.name}
            {detail && (
              <span className={styles.lineFrequency}>
                {detail.frequency?.weekdays?.trips
                  ? `${detail.frequency.weekdays.trips} viagens/dia`
                  : 'Ver detalhes'}
              </span>
            )}
          </h3>
          <p>
            {detail ? detail.description : (line.description || 'Sem descrição.')}
          </p>
        </div>
      </div>

      <div className={styles.rightIcon}>
        {hasDetail ? <Info size={18} /> : <ChevronRight size={22} />}
      </div>
    </button>
  );
});

export default function Linhas() {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLine, setSelectedLine] = useState(null);

  useEffect(() => {
    async function fetchLines() {
      try {
        const data = await storage.getLines();
        setLines(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchLines();
  }, []);

  const sortedLines = React.useMemo(() => {
    return [...lines].sort((a, b) => 
      (a.name || '').toString().localeCompare((b.name || '').toString(), undefined, { numeric: true })
    );
  }, [lines]);

  const handleLineClick = (line) => {
    // Tenta encontrar detalhes do banco ou arquivo estático
    const detail = line.detalhes || linesDetailData[line.name];
    if (detail) {
      setSelectedLine(detail);
    } else {
      // Fallback: constrói um detalhe mínimo a partir dos dados do banco
      setSelectedLine({
        number: line.name,
        title: line.nome || `Linha ${line.name}`,
        description: line.description || 'Sem descrição disponível.',
        frequency: {},
        forward: null,
        return: null,
        notes: [],
      });
    }
  };

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBackground} />
        <div className={styles.locationBadge}>
          <MapPin size={14} />
          Caçapava – SP
        </div>
        <h1 className={styles.heroTitle}>Linhas de Ônibus</h1>
        <p className={styles.heroSubtitle}>
          Itinerários, avaliações e relatos colaborativos da comunidade
        </p>
      </section>

      <div className={styles.content}>
        {/* Community Reports Alert Box */}
        <section className={styles.alertBox}>
          <div className={styles.alertHeader}>
            <AlertTriangle size={24} />
            <h2 className={styles.alertTitle}>Caçapava tem o pior transporte público do Vale?</h2>
          </div>
          <p className={styles.alertSubtitle}>
            Relatos acumulados até 2025 apontam problemas sérios. Confira:
          </p>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statIconWrapper}>
                  <Bus size={18} />
                </div>
                <h3 className={styles.statCardTitle}>Qualidade dos Ônibus</h3>
              </div>
              <p className={styles.statDescription}>
                Ônibus precários, sucateados, com bancos soltos, cheiro forte e quebras frequentes.
              </p>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statIconWrapper}>
                  <ShieldCheck size={18} />
                </div>
                <h3 className={styles.statCardTitle}>Segurança</h3>
              </div>
              <p className={styles.statDescription}>
                Problemas mecânicos e quebra de componentes em veículos escolares preocupam pais.
              </p>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statIconWrapper}>
                  <Settings size={18} />
                </div>
                <h3 className={styles.statCardTitle}>Operação</h3>
              </div>
              <p className={styles.statDescription}>
                Falta de cobradores, motoristas dirigindo e cobrando ao mesmo tempo, atrasos e falta de horários.
              </p>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statIconWrapper}>
                  <Factory size={18} />
                </div>
                <h3 className={styles.statCardTitle}>Infraestrutura</h3>
              </div>
              <p className={styles.statDescription}>
                Falta de iluminação e mato alto nos pontos de ônibus.
              </p>
            </div>
          </div>
        </section>

        {/* Lines List Section */}
        <section>
          <div className={styles.linesHeader}>
            <h2 className={styles.linesTitle}>Linhas Disponíveis</h2>
            <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>
              {lines.length} linhas encontradas
            </p>
          </div>

          <div className={styles.lineList}>
            {sortedLines.map((line) => (
              <LineCard 
                key={line.id} 
                line={line} 
                detail={line.detalhes || linesDetailData[line.name]} 
                onClick={() => handleLineClick(line)} 
              />
            ))}
          </div>
        </section>
      </div>

      {/* Modal */}
      {selectedLine && (
        <LineModal
          lineDetail={selectedLine}
          onClose={() => setSelectedLine(null)}
        />
      )}
    </div>
  );
}

