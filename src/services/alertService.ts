import { supabase } from '@/lib/supabase';
import { Notification } from '@/types';

export const alertService = {
  async getAlerts(filters?: { status?: 'unread' | 'read' | 'dismissed' }) {
    let query = supabase.from('notifications').select('*');
    if (filters?.status) query = query.eq('status', filters.status);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error('Erreur alertes : ' + error.message);
    return (data || []) as Notification[];
  },

  async getUnreadAlerts() {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'unread');
    if (error) throw new Error('Erreur alertes non lues : ' + error.message);
    return count || 0;
  },

  async markAsRead(id: string) {
    const { error } = await supabase.from('notifications').update({ status: 'read' }).eq('id', id);
    if (error) throw new Error('Erreur : ' + error.message);
  },

  async markAllAsRead() {
    const { error } = await supabase.from('notifications').update({ status: 'read' }).eq('status', 'unread');
    if (error) throw new Error('Erreur : ' + error.message);
  },

  async dismissAlert(id: string) {
    const { error } = await supabase.from('notifications').update({ status: 'dismissed' }).eq('id', id);
    if (error) throw new Error('Erreur : ' + error.message);
  },

  async checkAlerts() {
    // Check feed stock
    const { data: prods } = await supabase.from('inventory_products').select('name, current_stock, reorder_level');
    for (const p of prods || []) {
      if (p.reorder_level && p.current_stock <= p.reorder_level) {
        await supabase.from('notifications').insert([{
          severity: 'warning',
          title: 'Stock bas : ' + p.name,
          message: `Le stock actuel (${p.current_stock}) est inférieur ou égal au niveau de réapprovisionnement (${p.reorder_level}).`,
          status: 'unread'
        }]);
      }
    }
  },

  async getAlertRules() {
    const { data, error } = await supabase.from('alert_rules').select('*');
    if (error) throw new Error('Erreur règles : ' + error.message);
    return data || [];
  },

  async updateAlertRule(id: string, data: any) {
    const { error } = await supabase.from('alert_rules').update(data).eq('id', id);
    if (error) throw new Error('Erreur : ' + error.message);
  }
};
