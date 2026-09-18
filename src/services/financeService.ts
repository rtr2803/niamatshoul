import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { startOfMonth, endOfMonth } from 'date-fns';

export const financeService = {
  async getExpenses(filters?: { category?: string }) {
    let query = supabase.from('expenses').select('*');
    if (filters?.category) query = query.eq('category', filters.category);
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw new Error('Erreur dépenses : ' + error.message);
    return data;
  },

  async createExpense(data: any) {
    const id = uuidv4();
    const { data: expense, error } = await supabase.from('expenses').insert([{ id, ...data }]).select().single();
    if (error) throw new Error('Erreur création dépense : ' + error.message);

    await supabase.from('financial_transactions').insert([{
      id: uuidv4(),
      type: 'EXPENSE',
      amount: data.amount,
      date: data.date,
      description: data.description || 'Dépense'
    }]);
    return expense;
  },

  async getRevenues(filters?: { category?: string }) {
    let query = supabase.from('revenues').select('*');
    if (filters?.category) query = query.eq('category', filters.category);
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw new Error('Erreur revenus : ' + error.message);
    return data;
  },

  async createRevenue(data: any) {
    const id = uuidv4();
    const { data: revenue, error } = await supabase.from('revenues').insert([{ id, ...data }]).select().single();
    if (error) throw new Error('Erreur création revenu : ' + error.message);

    await supabase.from('financial_transactions').insert([{
      id: uuidv4(),
      type: 'REVENUE',
      amount: data.amount,
      date: data.date,
      description: data.description || 'Revenu'
    }]);
    return revenue;
  },

  async getDebts(filters?: { status?: string }) {
    let query = supabase.from('debts').select('*, supplier:suppliers(*)');
    if (filters?.status) query = query.eq('status', filters.status);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error('Erreur dettes : ' + error.message);
    return data;
  },

  async createDebt(data: any) {
    const id = uuidv4();
    const { data: debt, error } = await supabase.from('debts').insert([{ id, ...data, remaining_amount: data.total_amount, status: 'unpaid' }]).select().single();
    if (error) throw new Error('Erreur création dette : ' + error.message);
    return debt;
  },

  async createDebtPayment(debtId: string, data: any) {
    const paymentId = uuidv4();
    const { error: payError } = await supabase.from('debt_payments').insert([{
      id: paymentId,
      debt_id: debtId,
      ...data
    }]);
    if (payError) throw new Error('Erreur paiement : ' + payError.message);

    const { data: debt, error: debtError } = await supabase.from('debts').select('remaining_amount').eq('id', debtId).single();
    if (debtError) throw new Error('Erreur dette : ' + debtError.message);

    const newRemaining = (debt.remaining_amount || 0) - data.amount;
    await supabase.from('debts').update({
      remaining_amount: newRemaining,
      status: newRemaining <= 0 ? 'paid' : 'partial'
    }).eq('id', debtId);

    await supabase.from('financial_transactions').insert([{
      id: uuidv4(),
      type: 'EXPENSE', // Payment of debt is money leaving
      amount: data.amount,
      date: data.date || new Date().toISOString(),
      description: 'Paiement de dette'
    }]);
  },

  async getReceivables(filters?: { status?: string }) {
    let query = supabase.from('receivables').select('*, customer:customers(*)');
    if (filters?.status) query = query.eq('status', filters.status);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error('Erreur créances : ' + error.message);
    return data;
  },

  async createReceivable(data: any) {
    const id = uuidv4();
    const { data: rec, error } = await supabase.from('receivables').insert([{ id, ...data, remaining_amount: data.total_amount, status: 'unpaid' }]).select().single();
    if (error) throw new Error('Erreur création créance : ' + error.message);
    return rec;
  },

  async createReceivablePayment(receivableId: string, data: any) {
    const paymentId = uuidv4();
    await supabase.from('receivable_payments').insert([{
      id: paymentId,
      receivable_id: receivableId,
      ...data
    }]);

    const { data: rec } = await supabase.from('receivables').select('remaining_amount').eq('id', receivableId).single();
    const newRemaining = (rec?.remaining_amount || 0) - data.amount;
    await supabase.from('receivables').update({
      remaining_amount: newRemaining,
      status: newRemaining <= 0 ? 'paid' : 'partial'
    }).eq('id', receivableId);

    await supabase.from('financial_transactions').insert([{
      id: uuidv4(),
      type: 'REVENUE', // Payment received is money entering
      amount: data.amount,
      date: data.date || new Date().toISOString(),
      description: 'Encaissement de créance'
    }]);
  },

  async getFinancialTransactions(filters?: { type?: string }) {
    let query = supabase.from('financial_transactions').select('*');
    if (filters?.type) query = query.eq('type', filters.type);
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw new Error('Erreur transactions : ' + error.message);
    return data;
  },

  async getMonthlyRevenue() {
    const start = startOfMonth(new Date());
    const { data, error } = await supabase.from('financial_transactions')
      .select('amount')
      .eq('type', 'REVENUE')
      .gte('date', start.toISOString());
    if (error) throw new Error('Erreur : ' + error.message);
    return data.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  },

  async getMonthlyExpenses() {
    const start = startOfMonth(new Date());
    const { data, error } = await supabase.from('financial_transactions')
      .select('amount')
      .eq('type', 'EXPENSE')
      .gte('date', start.toISOString());
    if (error) throw new Error('Erreur : ' + error.message);
    return data.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  },

  async getNetResult(startDate: Date, endDate: Date) {
    const { data, error } = await supabase.from('financial_transactions')
      .select('amount, type')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());
    if (error) throw new Error('Erreur : ' + error.message);
    
    let result = 0;
    data.forEach(d => {
      if (d.type === 'REVENUE') result += d.amount;
      else if (d.type === 'EXPENSE') result -= d.amount;
    });
    return result;
  },

  async getTotalDebts() {
    const { data, error } = await supabase.from('debts').select('remaining_amount').neq('status', 'paid');
    if (error) throw new Error('Erreur : ' + error.message);
    return data.reduce((acc, curr) => acc + (curr.remaining_amount || 0), 0);
  },

  async getTotalReceivables() {
    const { data, error } = await supabase.from('receivables').select('remaining_amount').neq('status', 'paid');
    if (error) throw new Error('Erreur : ' + error.message);
    return data.reduce((acc, curr) => acc + (curr.remaining_amount || 0), 0);
  }
};
