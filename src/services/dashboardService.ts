import { supabase } from '@/lib/supabase';
import { animalService } from './animalService';
import { productionService } from './productionService';
import { feedService } from './feedService';
import { financeService } from './financeService';
import { inventoryService } from './inventoryService';
import { DashboardKPIs } from '@/types';

export const dashboardService = {
  async getDashboardKPIs(): Promise<DashboardKPIs> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      // Query database tables directly with fallback to service methods
      const [
        totalAnimals,
        todayProdRes,
        monthProdRes,
        todayMortalityRes,
        feedStockRes,
        monthlyRev,
        monthlyExp,
        debtsRes,
        receivablesRes
      ] = await Promise.all([
        animalService.getTotalPopulation().catch(() => 0),
        supabase.from('egg_production').select('total_eggs').eq('date', today),
        supabase.from('egg_production').select('total_eggs').gte('date', startOfMonth),
        supabase.from('animal_lot_events').select('quantity').eq('event_type', 'MORTALITY').eq('date', today),
        supabase.from('inventory_products').select('current_stock').eq('category_id', 'e0000000-0000-0000-0000-000000000001'),
        financeService.getMonthlyRevenue().catch(() => 0),
        financeService.getMonthlyExpenses().catch(() => 0),
        supabase.from('debts').select('remaining_amount').neq('status', 'paid'),
        supabase.from('receivables').select('remaining_amount').neq('status', 'paid')
      ]);

      const eggsToday = (todayProdRes.data || []).reduce((sum, r) => sum + (r.total_eggs || 0), 0);
      const eggsThisMonth = (monthProdRes.data || []).reduce((sum, r) => sum + (r.total_eggs || 0), 0);
      const mortalityToday = Math.abs((todayMortalityRes.data || []).reduce((sum, r) => sum + (r.quantity || 0), 0));
      const feedStock = (feedStockRes.data || []).reduce((sum, r) => sum + (Number(r.current_stock) || 0), 0);
      const supplierDebt = (debtsRes.data || []).reduce((sum, r) => sum + (Number(r.remaining_amount) || 0), 0);
      const customerCredit = (receivablesRes.data || []).reduce((sum, r) => sum + (Number(r.remaining_amount) || 0), 0);

      const rev = Number(monthlyRev) || 0;
      const exp = Number(monthlyExp) || 0;

      return {
        totalAnimals: Number(totalAnimals) || 0,
        eggsToday,
        eggsThisMonth,
        mortalityToday,
        feedStock,
        revenueThisMonth: rev,
        expenseThisMonth: exp,
        netResultThisMonth: rev - exp,
        supplierDebt,
        customerCredit
      };
    } catch (err) {
      console.warn('Dashboard KPIs load error, returning default zeros:', err);
      return {
        totalAnimals: 0,
        eggsToday: 0,
        eggsThisMonth: 0,
        mortalityToday: 0,
        feedStock: 0,
        revenueThisMonth: 0,
        expenseThisMonth: 0,
        netResultThisMonth: 0,
        supplierDebt: 0,
        customerCredit: 0
      };
    }
  },

  async getPopulationChart(days: number = 30) {
    try {
      const { data } = await supabase.from('poultry_houses').select('name, capacity');
      const { data: lots } = await supabase.from('animal_lots').select('poultry_house_id, current_quantity').eq('status', 'active');
      
      return (data || []).map((h: any) => {
        const count = (lots || [])
          .filter((l: any) => l.poultry_house_id === h.id)
          .reduce((s: number, l: any) => s + (l.current_quantity || 0), 0);
        return {
          house: h.name,
          count,
          capacity: h.capacity
        };
      });
    } catch {
      return [];
    }
  },

  async getEggProductionChart(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startStr = startDate.toISOString().split('T')[0];

      const { data } = await supabase
        .from('egg_production')
        .select('date, total_eggs, broken_eggs, sellable_eggs')
        .gte('date', startStr)
        .order('date', { ascending: true });

      return (data || []).map((d: any) => ({
        date: d.date ? d.date.split('-').slice(1).join('/') : '',
        total: d.total_eggs || 0,
        sellable: d.sellable_eggs || 0,
        broken: d.broken_eggs || 0
      }));
    } catch {
      return [];
    }
  },

  async getMortalityChart(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startStr = startDate.toISOString().split('T')[0];

      const { data } = await supabase
        .from('animal_lot_events')
        .select('date, quantity')
        .eq('event_type', 'MORTALITY')
        .gte('date', startStr)
        .order('date', { ascending: true });

      return (data || []).map((d: any) => ({
        date: d.date ? d.date.split('-').slice(1).join('/') : '',
        count: Math.abs(d.quantity || 0)
      }));
    } catch {
      return [];
    }
  },

  async getFeedConsumptionChart(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startStr = startDate.toISOString().split('T')[0];

      const { data } = await supabase
        .from('feed_consumption')
        .select('date, kg_consumed')
        .gte('date', startStr)
        .order('date', { ascending: true });

      return (data || []).map((d: any) => ({
        date: d.date ? d.date.split('-').slice(1).join('/') : '',
        amount: Number(d.kg_consumed) || 0
      }));
    } catch {
      return [];
    }
  },

  async getRevenueExpenseChart(months: number = 6) {
    try {
      const { data: revs } = await supabase.from('revenues').select('date, amount');
      const { data: exps } = await supabase.from('expenses').select('date, amount');

      const monthMap: Record<string, { month: string; revenue: number; expense: number }> = {};
      
      const now = new Date();
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('fr-FR', { month: 'short' });
        monthMap[key] = { month: label, revenue: 0, expense: 0 };
      }

      (revs || []).forEach((r: any) => {
        const key = r.date ? r.date.substring(0, 7) : '';
        if (monthMap[key]) {
          monthMap[key].revenue += Number(r.amount) || 0;
        }
      });

      (exps || []).forEach((e: any) => {
        const key = e.date ? e.date.substring(0, 7) : '';
        if (monthMap[key]) {
          monthMap[key].expense += Number(e.amount) || 0;
        }
      });

      return Object.values(monthMap);
    } catch {
      return [];
    }
  },

  async getHatchRateChart() {
    try {
      const { data } = await supabase
        .from('incubation_batches')
        .select('batch_number, hatch_rate, eggs_placed, eggs_hatched')
        .order('date_received', { ascending: false })
        .limit(10);

      return (data || []).map((b: any) => ({
        batch: b.batch_number,
        rate: Number(b.hatch_rate) || 0,
        placed: b.eggs_placed || 0,
        hatched: b.eggs_hatched || 0
      }));
    } catch {
      return [];
    }
  }
};

export const getDashboardKPIs = dashboardService.getDashboardKPIs;
export const getPopulationChart = dashboardService.getPopulationChart;
export const getEggProductionChart = dashboardService.getEggProductionChart;
export const getMortalityChart = dashboardService.getMortalityChart;
export const getFeedConsumptionChart = dashboardService.getFeedConsumptionChart;
export const getRevenueExpenseChart = dashboardService.getRevenueExpenseChart;
export const getHatchRateChart = dashboardService.getHatchRateChart;
