import { supabase } from '@/lib/supabase';

export const auditService = {
  async getAuditLogs(filters?: { tableName?: string, action?: string }) {
    let query = supabase.from('audit_logs').select('*');
    if (filters?.tableName) query = query.eq('table_name', filters.tableName);
    if (filters?.action) query = query.eq('action', filters.action);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
    if (error) throw new Error('Erreur logs : ' + error.message);
    return data;
  },

  async getEntityHistory(tableName: string, recordId: string) {
    const { data, error } = await supabase.from('audit_logs')
      .select('*')
      .eq('table_name', tableName)
      .eq('record_id', recordId)
      .order('created_at', { ascending: false });
    if (error) throw new Error('Erreur historique : ' + error.message);
    return data;
  }
};
