import { supabase } from './supabase';
export const storage = {
  async getLines() {
    try {
      const { data, error } = await supabase.from('lines').select('*').order('name', { ascending: true });
      if (error) {
        console.warn("Tabela 'lines' não encontrada, tentando 'linhas'...");
        const { data: dataPt, error: errorPt } = await supabase.from('linhas').select('*').order('numero', { ascending: true });
        if (errorPt) throw errorPt;
        const resultsPt = (dataPt || []).map(l => ({
          ...l,
          name: l.numero || l.name,
          description: l.descricao || l.description,
          route: l.route || l.trajeto || l.extra_info
        }));
        if (resultsPt.length === 0) throw new Error("Banco vazio");
        return resultsPt;
      }
      const results = (data || []).map(l => ({
        ...l,
        name: l.name,
        description: l.description,
        route: l.route || l.trajeto || l.extra_info
      }));
      if (results.length === 0) throw new Error("Banco vazio");
      return results;
    } catch (err) {
      console.warn("Usando fallback de linhas (banco vazio ou erro)");
      return [
        { id: 'm1', name: '01', description: 'Vila Velha X Centro', route: 'Via Germana' },
        { id: 'm2', name: '04', description: 'Boa Vista X Rodoviária', route: 'Via Centro' },
        { id: 'm3', name: '05', description: 'Guadalupe X Rodoviária', route: 'Via Vila Galvão' },
        { id: 'm4', name: '10', description: 'Eldorado X Terminal', route: 'Via Pinus' }
      ];
    }
  },
  async getPopularLines() {
    try {
      const { data, error } = await supabase.from('lines').select('*').limit(5);
      let results = [];
      if (error) {
        const { data: dataPt, error: errorPt } = await supabase.from('linhas').select('*').limit(5);
        if (errorPt) throw errorPt;
        results = (dataPt || []).map(l => ({
          ...l,
          name: l.numero || l.name,
          description: l.descricao || l.description,
          popular: true
        }));
      } else {
        results = (data || []).map(l => ({
          ...l,
          name: l.name,
          description: l.description,
          popular: true
        }));
      }
      if (results.length === 0) throw new Error("Banco vazio");
      return results;
    } catch (err) {
      console.warn("Usando fallback de linhas populares (banco vazio ou erro)");
      return [
        { id: 'm1', name: '01', description: 'Vila Velha X Centro', popular: true },
        { id: 'm2', name: '04', description: 'Boa Vista X Rodoviária', popular: true },
        { id: 'm3', name: '05', description: 'Guadalupe X Rodoviária', popular: true }
      ];
    }
  },
  async addLine(lineData) {
    const dbData = {
      numero: lineData.name,
      descricao: lineData.description,
      route: lineData.route,
      extra_info: lineData.extra_info,
      popular: lineData.popular
    };
    const { data, error } = await supabase
      .from('linhas')
      .insert([dbData])
      .select()
      .single();
    if (error) throw error;
    return data ? { ...data, name: data.numero, description: data.descricao } : null;
  },
  async deleteLine(id) {
    const { error } = await supabase.from('linhas').delete().eq('id', id);
    if (error) throw error;
  },
  async updateLine(id, lineData) {
    const dbData = {
      numero: lineData.name,
      descricao: lineData.description,
      route: lineData.route,
      extra_info: lineData.extra_info,
      popular: lineData.popular
    };
    const { data, error } = await supabase
      .from('linhas')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async updatePoints(userId, newPoints) {
    const { data, error } = await supabase
      .from('perfis')
      .update({ pontos: newPoints })
      .eq('id', userId);
    if (error) throw error;
    return data;
  },
  async getReports() {
    const { data, error } = await supabase
      .from('reports')
      .select('*, perfis(nome, foto)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ? data.map(r => ({
      ...r,
      lineId: r.line_id
    })) : [];
  },
  async getStops() {
    try {
      const { data, error } = await supabase.from('stops').select('*');
      if (error) throw error;
      if (data && data.length > 0) return data;
      throw new Error("Banco de pontos vazio");
    } catch (err) {
      console.warn("Usando fallback de pontos (banco vazio ou erro)");
      return [
        { id: 1, name: "Terminal Padre Marcelo", lines: ["01", "04", "06", "08", "10"], location: "Centro", coverage: true, bench: true, accessible: true, lat: -23.0992, lng: -45.7085 },
        { id: 2, name: "Terminal Centro", lines: ["01", "05", "07", "09", "10", "13"], location: "Centro", coverage: true, bench: true, accessible: true, lat: -23.1015, lng: -45.7078 },
        { id: 3, name: "Rodoviária de Caçapava", lines: ["04", "06", "08", "10", "13"], location: "Centro", coverage: true, bench: false, accessible: true, lat: -23.0988, lng: -45.7062 },
        { id: 4, name: "Vila Velha I", lines: ["01", "07"], location: "Vila Velha", coverage: false, bench: false, accessible: false, lat: -23.0850, lng: -45.7200 },
        { id: 5, name: "Vila Velha II (Germana)", lines: ["01", "07"], location: "Vila Velha", coverage: false, bench: true, accessible: false, lat: -23.0835, lng: -45.7220 },
        { id: 6, name: "Boa Vista", lines: ["04", "05"], location: "Boa Vista", coverage: true, bench: false, accessible: false, lat: -23.1150, lng: -45.6900 },
        { id: 7, name: "Aldeias da Serra", lines: ["04", "05"], location: "Aldeias da Serra", coverage: false, bench: false, accessible: false, lat: -23.1200, lng: -45.6800 },
        { id: 8, name: "Guadalupe", lines: ["05", "13"], location: "Guadalupe", coverage: false, bench: false, accessible: false, lat: -23.0900, lng: -45.7300 },
        { id: 9, name: "Vila Galvão", lines: ["05", "13"], location: "Vila Galvão", coverage: false, bench: true, accessible: false, lat: -23.0880, lng: -45.7350 },
        { id: 10, name: "Pinus", lines: ["06", "09"], location: "Pinus", coverage: false, bench: false, accessible: false, lat: -23.0855, lng: -45.6980 }
      ];
    }
  },
  async getRewards() {
    const { data, error } = await supabase
      .from('recompensas')
      .select('*')
      .order('custo', { ascending: true });
    if (error) {
       const res = await supabase.from('rewards').select('*').order('cost', { ascending: true });
       if (!res.error && res.data) return res.data;
       throw error;
    }
    return data ? data.map(r => ({
      ...r,
      title: r.titulo || r.title,
      cost: r.custo || r.cost,
      description: r.descricao || r.description
    })) : [];
  },
  async addStop(stopData) {
    const { data, error } = await supabase.from('stops').insert([stopData]).select().single();
    if (error) throw error;
    return data;
  },
  async deleteStop(id) {
    const { error } = await supabase.from('stops').delete().eq('id', id);
    if (error) throw error;
  },
  async updateStop(id, stopData) {
    const { data, error } = await supabase
      .from('stops')
      .update(stopData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async deleteReport(id) {
    const { error } = await supabase.from('reports').delete().eq('id', id);
    if (error) throw error;
  },
  async updateReport(id, fields) {
    const { data, error } = await supabase
      .from('reports')
      .update(fields)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async login(email, password) {
    console.log("[Auth] Tentando login para:", email);
    if (email === 'admin@mobtracker.com' && password === 'admin123') {
      console.log("[Auth] Credenciais de Admin detectadas. Usando sessão mock.");
      const mockUser = { id: 'admin-dev-id', email: 'admin@mobtracker.com', role: 'authenticated' };
      try {
        localStorage.setItem('mobtracker_mock_user', JSON.stringify(mockUser));
      } catch (e) {
        console.warn("[Auth] Não foi possível salvar sessão no localStorage:", e);
      }
      return mockUser;
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        console.error("[Auth] Erro retornado pelo Supabase:", error.message);
        throw error;
      }
      localStorage.removeItem('mobtracker_mock_user');
      return data.user;
    } catch (err) {
      if (email === 'admin@mobtracker.com' && password === 'admin123') {
        const mockUser = { id: 'admin-dev-id', email: 'admin@mobtracker.com', role: 'authenticated' };
        localStorage.setItem('mobtracker_mock_user', JSON.stringify(mockUser));
        return mockUser;
      }
      throw err;
    }
  },
  async signup(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });
    if (error) throw error;
    return data.user;
  },
  async adminCreateUser(email, password) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data, error } = await tempClient.auth.signUp({
      email,
      password
    });
    if (error) throw error;
    return data.user;
  },
  async logout() {
    localStorage.removeItem('mobtracker_mock_user');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (session?.user) return session.user;
    const savedMock = localStorage.getItem('mobtracker_mock_user');
    if (savedMock) {
      return JSON.parse(savedMock);
    }
    return null;
  },
  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    if (error) throw error;
  },
  async addReport(report) {
    const { lineId, stopId, type, title, description, author, userId } = report;
    const { data, error } = await supabase
      .from('reports')
      .insert([{ 
        line_id: lineId || null, 
        stop_id: stopId || null,
        type, 
        description, 
        author: author || 'Anônimo',
        user_id: userId || null
      }])
      .select()
      .single();
    if (error) throw error;
    if (userId) {
      try {
        const { data: profile } = await supabase
          .from('perfis')
          .select('pontos')
          .eq('id', userId)
          .single();
        const currentPoints = profile?.pontos || 0;
        await supabase
          .from('perfis')
          .update({ pontos: currentPoints + 10 })
          .eq('id', userId);
      } catch (err) {
        console.error("Erro ao atualizar pontos:", err);
      }
    }
    return { ...data, lineId: data.line_id, stopId: data.stop_id };
  },
  async getReportsByStop(stopId) {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('stop_id', stopId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async createPasswordRequest(email, reason) {
    const { data, error } = await supabase
      .from('password_requests')
      .insert([{ email, reason, status: 'pendente' }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async getPasswordRequests() {
    const { data, error } = await supabase
      .from('password_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async updatePasswordRequestStatus(id, status) {
    const { data, error } = await supabase
      .from('password_requests')
      .update({ status })
      .eq('id', id)
      .select();
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Não foi possível atualizar (possível bloqueio de permissão RLS no banco).");
    }
  },
  async addRating(rating) {
    const { lineId, userId, type, value } = rating;
    const { data, error } = await supabase
      .from('ratings')
      .insert([{
        line_id: lineId,
        user_id: userId,
        rating_type: type,
        rating_value: value
      }])
      .select()
      .single();
    if (error) throw error;
    if (userId) {
      try {
        const profile = await this.getProfile(userId);
        const currentPoints = profile?.pontos || 0;
        await this.updatePoints(userId, currentPoints + 5);
      } catch (err) {
        console.error("Erro ao atualizar pontos da avaliação:", err);
      }
    }
    return data;
  },
  async getLineRatings(lineId) {
    const { data, error } = await supabase
      .from('ratings')
      .select('rating_type, rating_value')
      .eq('line_id', lineId);
    if (error) throw error;
    if (!data || data.length === 0) return { avgLine: 0, avgDriver: 0, total: 0 };
    const lineRatings = data.filter(r => r.rating_type === 'line');
    const driverRatings = data.filter(r => r.rating_type === 'driver');
    const avgLine = lineRatings.length > 0 
      ? lineRatings.reduce((sum, r) => sum + r.rating_value, 0) / lineRatings.length 
      : 0;
    const avgDriver = driverRatings.length > 0 
      ? driverRatings.reduce((sum, r) => sum + r.rating_value, 0) / driverRatings.length 
      : 0;
    return {
      avgLine: parseFloat(avgLine.toFixed(1)),
      avgDriver: parseFloat(avgDriver.toFixed(1)),
      total: data.length
    };
  },
  async getProfile(userId) {
    if (!userId) return null;
    let { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error && error.code === '42703') { 
       console.warn("Coluna 'foto' não encontrada na tabela 'perfis'. Buscando dados básicos.");
       const res = await supabase.from('perfis').select('id, nome, email, pontos, criado_em').eq('id', userId).maybeSingle();
       data = res.data;
       error = res.error;
    }
    if (!data && (!error || error.code === 'PGRST116')) {
      const { data: newProfile, error: createError } = await supabase
        .from('perfis')
        .insert([{ id: userId, pontos: 50 }])
        .select()
        .single();
      if (createError) throw createError;
      return { ...newProfile, points: newProfile.pontos, created_at: newProfile.criado_em };
    }
    if (error) throw error;
    return data ? { ...data, points: data.pontos, created_at: data.criado_em } : null;
  },
  async getProfiles() {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .order('criado_em', { ascending: false });
    if (error) throw error;
    return (data || []).map(p => ({
      ...p,
      points: p.pontos,
      created_at: p.criado_em
    }));
  },
  async updateProfile(id, profileData) {
    const dbData = {
      nome: profileData.nome,
      email: profileData.email,
      pontos: profileData.points,
    };
    if (profileData.foto !== undefined) {
      dbData.foto = profileData.foto;
    }
    const { data, error } = await supabase
      .from('perfis')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async deleteProfile(id) {
    const { error } = await supabase.from('perfis').delete().eq('id', id);
    if (error) throw error;
  },
  async getUserReports(userId) {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async getFavorites(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('favorites')
      .select('stop_id')
      .eq('user_id', userId);
    if (error) throw error;
    return data ? data.map(f => f.stop_id) : [];
  },
  async toggleFavorite(userId, stopId) {
    if (!userId) return false;
    const stopIdStr = stopId.toString();
    console.log("Tentando toggle favorito para:", { userId, stopId: stopIdStr });
    const { data: existing, error: findError } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('stop_id', stopIdStr)
      .maybeSingle();
    if (findError) {
      console.error("Erro Supabase (Select):", findError);
      throw new Error(`Erro ao buscar: ${findError.message}`);
    }
    if (existing) {
      const { error: delError } = await supabase
        .from('favorites')
        .delete()
        .eq('id', existing.id);
      if (delError) {
        console.error("Erro Supabase (Delete):", delError);
        throw new Error(`Erro ao remover: ${delError.message}`);
      }
      return false;
    } else {
      const { error: insError } = await supabase
        .from('favorites')
        .insert([{ user_id: userId, stop_id: stopIdStr }]);
      if (insError) {
        console.error("Erro Supabase (Insert):", insError);
        throw new Error(`Erro ao salvar: ${insError.message}`);
      }
      return true;
    }
  },
  async getRedemptions(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('resgates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      const res = await supabase.from('redemptions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (!res.error && res.data) return res.data;
      console.warn("Tabela 'resgates'/'redemptions' não encontrada:", error.message);
      return [];
    }
    return data || [];
  },
  async redeemReward(userId, rewardId, cost, title) {
    if (!userId) throw new Error("Usuário não autenticado");
    const profile = await this.getProfile(userId);
    if (!profile || profile.points < cost) {
      throw new Error("Saldo de pontos insuficiente");
    }
    const { error: redemptionError } = await supabase
      .from('resgates')
      .insert([{
        user_id: userId,
        reward_id: rewardId,
        title: title,
        cost: cost
      }]);
    if (redemptionError) {
       await supabase.from('redemptions').insert([{ user_id: userId, reward_id: rewardId, title, cost }]);
    }
    const { error: updateError } = await supabase
      .from('perfis')
      .update({ pontos: profile.pontos - cost })
      .eq('id', userId);
    if (updateError) throw updateError;
    return true;
  },
  async getUserRatings(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return data || [];
  },
  async addTrip(userId, lineId) {
    if (!userId) throw new Error("Usuário não autenticado");
    const validLines = ['01', '04', '05', '06', '07', '08', '09', '10', '13'];
    const formattedLine = lineId?.toString().padStart(2, '0');
    if (!validLines.includes(formattedLine)) {
      throw new Error("Linha inválida! Por favor, selecione uma das linhas oficiais (01, 04, 05, 06, 07, 08, 09, 10, 13).");
    }
    const { data, error } = await supabase
      .from('viagens')
      .insert([{
        user_id: userId,
        line_id: formattedLine
      }])
      .select()
      .single();
    if (error) {
      await supabase.from('trips').insert([{ user_id: userId, line_id: formattedLine }]);
      console.warn("Tabela 'viagens' não encontrada. Usando fallback.");
    }
    try {
      const profile = await this.getProfile(userId);
      const currentPoints = profile?.pontos || 0;
      const { error: updateError } = await supabase
        .from('perfis')
        .update({ pontos: currentPoints + 20 })
        .eq('id', userId)
        .select();
      if (updateError) throw updateError;
    } catch (err) {
      console.error("Erro ao atualizar pontos da viagem:", err);
    }
    return data;
  },
  async getUserTrips(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('viagens')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      const res = await supabase.from('trips').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (!res.error && res.data) return res.data;
      return [];
    }
    return data || [];
  },
  async toggleLike(reportId, userId, authorUserId) {
    if (!userId) throw new Error("Login necessário");
    const { data: existing } = await supabase
      .from('report_likes')
      .select('*')
      .eq('report_id', reportId)
      .eq('user_id', userId)
      .maybeSingle();
    if (existing) {
      await supabase.from('report_likes').delete().eq('id', existing.id);
      return { action: 'removed' };
    } else {
      await supabase.from('report_likes').insert([{ report_id: reportId, user_id: userId }]);
      await supabase.from('report_dislikes').delete().eq('report_id', reportId).eq('user_id', userId);
      const profile = await this.getProfile(userId);
      await this.updatePoints(userId, (profile?.pontos || 0) + 2);
      return { action: 'added' };
    }
  },
  async toggleDislike(reportId, userId) {
    if (!userId) throw new Error("Login necessário");
    const { data: existing } = await supabase
      .from('report_dislikes')
      .select('*')
      .eq('report_id', reportId)
      .eq('user_id', userId)
      .maybeSingle();
    if (existing) {
      await supabase.from('report_dislikes').delete().eq('id', existing.id);
      return { action: 'removed' };
    } else {
      await supabase.from('report_dislikes').insert([{ report_id: reportId, user_id: userId }]);
      await supabase.from('report_likes').delete().eq('report_id', reportId).eq('user_id', userId);
      return { action: 'added' };
    }
  },
  async getReportStats(reportId, userId) {
    const promises = [
      supabase.from('report_likes').select('*', { count: 'exact', head: true }).eq('report_id', reportId),
      supabase.from('report_dislikes').select('*', { count: 'exact', head: true }).eq('report_id', reportId),
      supabase.from('report_replies').select('*', { count: 'exact', head: true }).eq('report_id', reportId)
    ];
    if (userId) {
      promises.push(
        supabase.from('report_likes').select('id').eq('report_id', reportId).eq('user_id', userId).maybeSingle()
      );
      promises.push(
        supabase.from('report_dislikes').select('id').eq('report_id', reportId).eq('user_id', userId).maybeSingle()
      );
    }
    const results = await Promise.all(promises);
    return {
      likes: results[0].count || 0,
      dislikes: results[1].count || 0,
      replies: results[2].count || 0,
      isLiked: userId && results[3]?.data ? true : false,
      isDisliked: userId && results[4]?.data ? true : false
    };
  },
  async addReply(reportId, userId, authorName, content) {
    const { data, error } = await supabase
      .from('report_replies')
      .insert([{ report_id: reportId, user_id: userId, author_name: authorName, content }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async getReplies(reportId) {
    const { data, error } = await supabase
      .from('report_replies')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true });
    return data || [];
  },
  async getAlerts(includeAll = false) {
    try {
      if (!includeAll) {
        const { data, error } = await supabase.from('alerts').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(a => ({ ...a, source: 'alerts', author: 'Admin MobTracker' }));
      }
      const [alertsRes, reportsRes] = await Promise.all([
        supabase.from('alerts').select('*').order('created_at', { ascending: false }),
        supabase.from('reports').select('*').order('created_at', { ascending: false })
      ]);
      let all = [];
      if (!alertsRes.error && alertsRes.data) {
        all = [...all, ...alertsRes.data.map(a => ({ 
          ...a, 
          source: 'alerts',
          author: 'Admin MobTracker'
        }))];
      }
      if (!reportsRes.error && reportsRes.data) {
        all = [...all, ...reportsRes.data.map(r => ({
          ...r,
          title: r.description.substring(0, 40) + '...',
          type: r.type || 'moderado', 
          source: 'reports'
        }))];
      }
      return all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (err) {
      console.error("Erro ao buscar alertas unificados:", err);
      return [];
    }
  },
  async deleteAlert(id, source = 'reports') {
    const table = source === 'alerts' ? 'alerts' : 'reports';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return true;
  },
  async addAlert(alertData) {
    const finalData = { ...alertData };
    delete finalData.source; 
    const { data, error } = await supabase.from('alerts').insert([finalData]).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  async updateAlert(id, alertData, source = 'reports') {
    const finalData = { ...alertData };
    delete finalData.source;
    delete finalData.id;
    delete finalData.created_at;
    console.group('Diagnóstico de Atualização de Alerta');
    console.log('ID buscado:', id, 'Tabelas para busca:', ['alerts', 'reports']);
    let targetTable = null;
    let finalId = id;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const isNumeric = !isNaN(id) && !isUUID;
    console.log(`[Auth] Analisando ID: ${id} | UUID: ${isUUID} | Numérico: ${isNumeric}`);
    for (const table of ['alerts', 'reports']) {
      try {
        if (table === 'alerts' && isUUID) continue; 
        if (table === 'reports' && isNumeric) {
        }
        let res = await supabase.from(table).select('id').eq('id', id).maybeSingle();
        if (res.data) {
          targetTable = table;
          finalId = id;
          break;
        }
      } catch (e) {
        console.warn(`[Auth] Erro ao buscar na tabela ${table}:`, e.message);
      }
    }
    if (!targetTable) {
      console.groupEnd();
      throw new Error(`O alerta com ID ${id} não foi encontrado.`);
    }
    let dataToUpdate = {};
    if (targetTable === 'alerts') {
      dataToUpdate = {
        title: finalData.title || '',
        description: finalData.description || '',
        type: finalData.type || 'moderado',
        location: finalData.location || '',
        line_id: finalData.line_id || null
      };
    } else {
      dataToUpdate = {
        description: finalData.description || '',
        type: finalData.type || 'moderado',
        author: 'Admin MobTracker'
      };
      if (finalData.line_id) dataToUpdate.line_id = finalData.line_id;
    }
    Object.keys(dataToUpdate).forEach(key => {
      if (dataToUpdate[key] === undefined) delete dataToUpdate[key];
    });
    console.log('Dados finais para UPDATE:', dataToUpdate);
    const { data, error } = await supabase
      .from(targetTable)
      .update(dataToUpdate)
      .eq('id', finalId)
      .select()
      .maybeSingle();
    console.log('Resposta do Supabase:', { data, error });
    console.groupEnd();
    if (error) {
      console.error('Erro detalhado do banco:', error);
      if (error.code === '42703') {
        throw new Error(`Erro de Banco de Dados: Uma das colunas enviadas não existe na tabela '${targetTable}'. Detalhe: ${error.message}`);
      }
      throw new Error(`Erro ao atualizar: ${error.message}`);
    }
    return data;
  },
  async getBusPasses() {
    const { data, error } = await supabase
      .from('bus_passes')
      .select('*')
      .order('cost', { ascending: true });
    if (error) {
      console.warn("Tabela 'bus_passes' não encontrada. Usando dados locais.");
      return null;
    }
    return data || [];
  },
  async getProfiles() {
    let { data, error } = await supabase
      .from('perfis')
      .select('*')
      .order('pontos', { ascending: false });
    if (error && error.code === '42703') {
      const res = await supabase.from('perfis').select('id, nome, email, pontos, criado_em').order('pontos', { ascending: false });
      data = res.data;
      error = res.error;
    }
    if (error) throw error;
    return data ? data.map(p => ({
      ...p,
      points: p.pontos,
      created_at: p.criado_em
    })) : [];
  },
  async deleteProfile(id) {
    const { error } = await supabase.from('perfis').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
  async updateProfile(id, profileData) {
    const dbData = {
      id: id,
      nome: profileData.nome,
      email: profileData.email,
      pontos: profileData.points
    };
    if (profileData.foto) dbData.foto = profileData.foto;
    const { data, error } = await supabase
      .from('perfis')
      .upsert(dbData)
      .select()
      .maybeSingle();
    if (error && error.code === '42703') {
       delete dbData.foto;
       const res = await supabase.from('perfis').upsert(dbData).select().maybeSingle();
       return res.data;
    }
    if (error) throw error;
    return data;
  }
};
