import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { inventoryService } from './inventoryService';

export const feedService = {
  async getFeedConsumptions(filters?: { houseId?: string, startDate?: string, endDate?: string }) {
    let query = supabase.from('feed_consumptions').select(`
      *,
      poultry_house:poultry_houses(*),
      product:inventory_products(*)
    `);
    
    if (filters?.houseId) query = query.eq('poultry_house_id', filters.houseId);
    if (filters?.startDate) query = query.gte('date', filters.startDate);
    if (filters?.endDate) query = query.lte('date', filters.endDate);

    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw new Error('Erreur consommation : ' + error.message);
    return data;
  },

  async createFeedConsumption(data: any) {
    const id = uuidv4();
    const { data: consumption, error } = await supabase.from('feed_consumptions').insert([{
      id,
      ...data
    }]).select().single();
    if (error) throw new Error('Erreur création conso : ' + error.message);

    // Creates inventory transaction
    await inventoryService.createInventoryTransaction({
      product_id: data.product_id,
      transaction_type: 'CONSUMPTION',
      quantity: data.quantity,
      unit_price: 0, // Should probably be fetched, but ignoring for now
      date: data.date,
      notes: `Consommation bâtiment ${data.poultry_house_id}`
    });

    return consumption;
  },

  async getGreenForageRecords(filters?: { houseId?: string }) {
    let query = supabase.from('green_forage').select('*');
    if (filters?.houseId) query = query.eq('poultry_house_id', filters.houseId);
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw new Error('Erreur fourrage vert : ' + error.message);
    return data;
  },

  async createGreenForage(data: any) {
    const id = uuidv4();
    const { data: forage, error } = await supabase.from('green_forage').insert([{
      id,
      ...data
    }]).select().single();
    if (error) throw new Error('Erreur création fourrage : ' + error.message);
    return forage;
  },

  async getDailyFeedConsumption(date: string, houseId?: string) {
    let query = supabase.from('feed_consumptions')
      .select('quantity')
      .gte('date', startOfDay(new Date(date)).toISOString())
      .lte('date', endOfDay(new Date(date)).toISOString());
    
    if (houseId) query = query.eq('poultry_house_id', houseId);
    
    const { data, error } = await query;
    if (error) throw new Error('Erreur conso journalière : ' + error.message);
    return data.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  },

  async getFeedConsumptionTrend(days: number) {
    const startDate = subDays(new Date(), days);
    const { data, error } = await supabase.from('feed_consumptions')
      .select('date, quantity')
      .gte('date', startOfDay(startDate).toISOString())
      .order('date', { ascending: true });
    
    if (error) throw new Error('Erreur tendance conso : ' + error.message);

    const trend: Record<string, number> = {};
    data.forEach(d => {
      const day = format(new Date(d.date), 'yyyy-MM-dd');
      trend[day] = (trend[day] || 0) + d.quantity;
    });

    return Object.entries(trend).map(([date, total]) => ({ date, total }));
  },

  async getFeedCostPerBird(startDate: Date, endDate: Date) {
    // Simplify for now, ideally needs inventory prices
    return 0; // Placeholder until financial link
  }
};
