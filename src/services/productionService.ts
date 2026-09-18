import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { startOfDay, endOfDay, subDays, format, startOfWeek, startOfMonth } from 'date-fns';

export const productionService = {
  async getEggProductions(filters?: { houseId?: string, startDate?: string, endDate?: string }) {
    let query = supabase.from('egg_production').select(`
      *,
      poultry_house:poultry_houses(*)
    `);
    
    if (filters?.houseId) query = query.eq('poultry_house_id', filters.houseId);
    if (filters?.startDate) query = query.gte('date', filters.startDate);
    if (filters?.endDate) query = query.lte('date', filters.endDate);

    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw new Error('Erreur productions : ' + error.message);
    return data || [];
  },

  async createEggProduction(data: {
    date: string;
    poultry_house_id: string;
    lot_id?: string;
    total_eggs?: number;
    broken_eggs?: number;
    good_eggs?: number;
    bad_eggs?: number;
    notes?: string;
  }) {
    const id = uuidv4();
    const total = data.total_eggs !== undefined 
      ? data.total_eggs 
      : (Number(data.good_eggs || 0) + Number(data.bad_eggs || 0));
    const broken = data.broken_eggs !== undefined 
      ? data.broken_eggs 
      : Number(data.bad_eggs || 0);

    const { data: created, error } = await supabase.from('egg_production').insert([{
      id,
      date: data.date,
      poultry_house_id: data.poultry_house_id,
      lot_id: data.lot_id || null,
      total_eggs: total,
      broken_eggs: broken,
      notes: data.notes || null
    }]).select().single();

    if (error) throw new Error('Erreur création production : ' + error.message);
    return created;
  },

  async updateEggProduction(id: string, data: any) {
    const { data: updated, error } = await supabase.from('egg_production').update(data).eq('id', id).select().single();
    if (error) throw new Error('Erreur mise à jour : ' + error.message);
    return updated;
  },

  async deleteEggProduction(id: string) {
    const { error } = await supabase.from('egg_production').delete().eq('id', id);
    if (error) throw new Error('Erreur suppression : ' + error.message);
  },

  async getTodayProduction() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.from('egg_production')
      .select('total_eggs')
      .eq('date', today);
    if (error) throw new Error('Erreur prod jour : ' + error.message);
    return (data || []).reduce((acc, curr) => acc + (curr.total_eggs || 0), 0);
  },

  async getWeekProduction() {
    const start = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const { data, error } = await supabase.from('egg_production')
      .select('total_eggs')
      .gte('date', start);
    if (error) throw new Error('Erreur prod semaine : ' + error.message);
    return (data || []).reduce((acc, curr) => acc + (curr.total_eggs || 0), 0);
  },

  async getMonthProduction() {
    const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const { data, error } = await supabase.from('egg_production')
      .select('total_eggs')
      .gte('date', start);
    if (error) throw new Error('Erreur prod mois : ' + error.message);
    return (data || []).reduce((acc, curr) => acc + (curr.total_eggs || 0), 0);
  },

  async getProductionTrend(days: number = 30) {
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
    const { data, error } = await supabase.from('egg_production')
      .select('date, total_eggs, sellable_eggs, broken_eggs')
      .gte('date', startDate)
      .order('date', { ascending: true });
    
    if (error) throw new Error('Erreur tendance : ' + error.message);

    const trend: Record<string, number> = {};
    (data || []).forEach(d => {
      trend[d.date] = (trend[d.date] || 0) + (d.total_eggs || 0);
    });

    return Object.entries(trend).map(([date, total]) => ({ date, total }));
  },

  async getLayingRate(houseId: string, startDate: Date, endDate: Date) {
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    const { data: productions, error: prodError } = await supabase.from('egg_production')
      .select('total_eggs')
      .eq('poultry_house_id', houseId)
      .gte('date', startStr)
      .lte('date', endStr);
    if (prodError) throw new Error('Erreur taux de ponte : ' + prodError.message);

    const totalEggs = (productions || []).reduce((acc, curr) => acc + (curr.total_eggs || 0), 0);

    const { data: lots, error: lotsError } = await supabase.from('animal_lots')
      .select('current_quantity')
      .eq('poultry_house_id', houseId)
      .eq('status', 'active');
    if (lotsError) throw new Error('Erreur lots pour taux : ' + lotsError.message);

    const activeHens = (lots || []).reduce((acc, curr) => acc + (curr.current_quantity || 0), 0);

    if (activeHens === 0) return 0;
    
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));
    return (totalEggs / (activeHens * days)) * 100;
  }
};
