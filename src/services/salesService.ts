import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { financeService } from './financeService';
import { animalService } from './animalService';

export const salesService = {
  async getEggSales(filters?: { customerId?: string }) {
    let query = supabase.from('egg_sales').select('*, customer:customers(*)');
    if (filters?.customerId) query = query.eq('customer_id', filters.customerId);
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw new Error('Erreur ventes d\'oeufs : ' + error.message);
    return data;
  },

  async createEggSale(data: any) {
    const id = uuidv4();
    const totalAmount = data.quantity * data.unit_price;
    
    const { data: sale, error } = await supabase.from('egg_sales').insert([{
      id,
      ...data,
      total_amount: totalAmount
    }]).select().single();
    if (error) throw new Error('Erreur création vente : ' + error.message);

    // Revenue
    if (data.paid_amount > 0) {
      await financeService.createRevenue({
        amount: data.paid_amount,
        date: data.date,
        category: 'Vente Oeufs',
        description: `Vente d'œufs ${id}`
      });
    }

    // Receivable if not fully paid
    if (data.paid_amount < totalAmount) {
      await financeService.createReceivable({
        customer_id: data.customer_id,
        total_amount: totalAmount - data.paid_amount,
        date: data.date,
        description: `Reste à payer vente œufs ${id}`
      });
    }

    return sale;
  },

  async getAnimalSales(filters?: { customerId?: string }) {
    let query = supabase.from('animal_sales').select('*, customer:customers(*), animal_lot:animal_lots(*)');
    if (filters?.customerId) query = query.eq('customer_id', filters.customerId);
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw new Error('Erreur ventes d\'animaux : ' + error.message);
    return data;
  },

  async createAnimalSale(data: any) {
    const id = uuidv4();
    const totalAmount = data.quantity * data.unit_price;

    const { data: sale, error } = await supabase.from('animal_sales').insert([{
      id,
      ...data,
      total_amount: totalAmount
    }]).select().single();
    if (error) throw new Error('Erreur création vente animaux : ' + error.message);

    // Update lot (event)
    await animalService.createLotEvent({
      lot_id: data.lot_id || data.animal_lot_id,
      event_type: 'SALE',
      quantity: data.quantity,
      date: data.date,
      notes: `Vente ${id}`
    });

    // Revenue
    if (data.paid_amount > 0) {
      await financeService.createRevenue({
        amount: data.paid_amount,
        date: data.date,
        category: 'Vente Animaux',
        description: `Vente animaux ${id}`
      });
    }

    // Receivable if not fully paid
    if (data.paid_amount < totalAmount) {
      await financeService.createReceivable({
        customer_id: data.customer_id,
        total_amount: totalAmount - data.paid_amount,
        date: data.date,
        description: `Reste à payer vente animaux ${id}`
      });
    }

    return sale;
  },

  async updateSalePayment(saleType: 'egg' | 'animal', saleId: string, paidAmount: number) {
    const table = saleType === 'egg' ? 'egg_sales' : 'animal_sales';
    const { error } = await supabase.from(table).update({ paid_amount: paidAmount }).eq('id', saleId);
    if (error) throw new Error('Erreur mise à jour paiement : ' + error.message);
  }
};
