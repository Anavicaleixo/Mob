# MobTracker 🚌

MobTracker é uma aplicação web inovadora voltada para a mobilidade urbana colaborativa. O sistema permite que os usuários acompanhem o transporte público, relatem problemas no trânsito ou nas frotas em tempo real, e ganhem recompensas pela sua contribuição ativa para uma cidade melhor.

## 🚀 Funcionalidades Principais

*   **🗺️ Mapa Interativo em Tempo Real**: 
    *   Visualize paradas de ônibus, rotas e sua própria localização.
    *   Consulte os pontos de interesse e navegue pelo mapa da cidade de forma fluida.

*   **⚠️ Sistema de Alertas e Relatos Colaborativos**: 
    *   **Criação de Relatos**: Crie alertas sobre problemas no transporte (ex: ônibus lotado, veículo quebrado, atraso severo, acidente na via, parada vandalizada).
    *   **Validação da Comunidade**: Interaja com relatos de outros usuários através de **Likes**, **Dislikes** e **Comentários**. Isso ajuda a validar a veracidade e atualidade das informações (Crowdsourcing).
    *   **Filtros**: Filtragem avançada de alertas no feed e no mapa por status e tipo de ocorrência.

*   **🚌 Consulta de Linhas e Itinerários**: 
    *   Pesquise por linhas de transporte específicas.
    *   Visualize detalhes dos itinerários para planejar melhor sua viagem.

*   **🏆 Sistema de Recompensas (Gamificação)**: 
    *   Ganhe pontos ao ser um cidadão ativo: criando relatos precisos que recebem avaliações positivas da comunidade.
    *   Consulte seu saldo de pontos.
    *   Troque seus pontos por benefícios exclusivos ou prêmios virtuais/físicos na vitrine de Recompensas.

*   **👤 Perfil de Usuário e Autenticação**: 
    *   Sistema completo de Cadastro e Login seguro.
    *   Recuperação e redefinição de senha.
    *   Edição de perfil (foto de avatar, dados pessoais).
    *   Histórico e rastreio de suas atividades e contribuições (alertas criados e curtidos).

*   **🛡️ Painel de Administração (Backoffice)**: 
    *   Área restrita e segura para administradores do sistema.
    *   Gestão de alertas: moderar, marcar como resolvido ou deletar relatos falsos.
    *   Gerenciamento global de usuários cadastrados na plataforma.

## 🛠️ Tecnologias Utilizadas

*   **Front-end**: React.js gerenciado com Vite para alta performance e hot-reloading rápido.
*   **Mapas**: Leaflet integrado via `react-leaflet`, juntamente com provedores de tiles open-source (OpenStreetMap).
*   **Back-end (BaaS)**: Supabase 
    *   **Banco de Dados**: PostgreSQL robusto.
    *   **Autenticação**: Supabase Auth (Email/Senha).
    *   **Segurança**: Políticas RLS (Row Level Security) rigorosas.
    *   **Storage**: Armazenamento de avatares e imagens de relatos.
*   **Estilização**: CSS Modules com um design system responsivo focado em Glassmorphism e UI moderna.

## 📦 Como Rodar o Projeto

1.  Clone este repositório para sua máquina local.
2.  Acesse a pasta do projeto: `cd MobTracker`
3.  Instale as dependências: 
    ```bash
    npm install
    ```
4.  Configure as variáveis de ambiente:
    *   Crie um arquivo chamado `.env` na raiz do projeto (mesmo nível do `package.json`).
    *   Preencha com as credenciais do seu projeto Supabase:
    ```env
    VITE_SUPABASE_URL=sua_url_do_projeto_supabase
    VITE_SUPABASE_ANON_KEY=sua_chave_anon_publica_do_supabase
    ```
5.  Inicie o servidor de desenvolvimento: 
    ```bash
    npm run dev
    ```
6.  Acesse a aplicação no navegador em `http://localhost:5173` (ou na porta que o Vite indicar no terminal).

## 📄 Scripts Disponíveis

- `npm run dev`: Inicia o servidor de desenvolvimento com hot-reload local.
- `npm run build`: Compila e otimiza o projeto para produção (gera a pasta `/dist`).
- `npm run lint`: Roda o ESLint para encontrar e reportar problemas no código.
- `npm run preview`: Inicia um servidor local para visualizar e testar o build de produção (`/dist`) antes do deploy final.