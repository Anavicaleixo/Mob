import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';

import Home from './pages/Home';
import Sobre from './pages/Sobre';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import RecuperarSenha from './pages/RecuperarSenha';
import RedefinirSenha from './pages/RedefinirSenha';


import Mapa from './pages/Mapa';
import Linhas from './pages/Linhas';
import Admin from './pages/Admin';
import Perfil from './pages/Perfil';
import Relatar from './pages/Relatar';
import Alertas from './pages/Alertas';
import Recompensas from './pages/Recompensas';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Header />
          <div style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/linhas" element={<Linhas />} />
              <Route path="/pontos" element={<Mapa />} />
              <Route path="/sobre" element={<Sobre />} />
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />


              <Route path="/admin" element={<Admin />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/relatar" element={<Relatar />} />
              <Route path="/alertas" element={<Alertas />} />
              <Route path="/recompensas" element={<Recompensas />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
