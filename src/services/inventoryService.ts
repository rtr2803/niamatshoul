import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const inventoryService = {
  async getInventoryProducts(categoryId?: string) {
    let query = supabase.from('inventory_products').select(`
      *,
      category:inventory_categories(*)
    `);
    if (categoryId) query = query.eq('category_id', categoryId);
    
    const { data, error } = await query.order('name', { ascending: true });
    if (error) throw new Error('Erreur produits : ' + error.message);
    return data;
  },

  async getInventoryProduct(id: string) {
    const { data, error } = await supabase.from('inventory_products').select(`
      *,
      category:inventory_categories(*),
      transactions:inventory_transactions(*)
    `).eq('id', id).single();
    if (error) throw new Error('Erreur produit : ' + error.message);
    return data;
  },

  async createInventoryProduct(data: any) {
    const id = uuidv4();
    const { data: product, error } = await supabase.from('inventory_products').insert([{
      id,
      ...data,
      current_stock: data.current_stock || 0
    }]).select().single();
    if (error) throw new Error('Erreur création produit : ' + error.message);
    return product;
  },

  async updateInventoryProduct(id: string, data: any) {
    const { current_stock, ...safeData } = data;
    const { data: updated, error } = await supabase.from('inventory_products').update(safeData).eq('id', id).select().single();
    if (error) throw new Error('Erreur mise à jour produit : ' + error.message);
    return updated;
  },

  async createInventoryTransaction(data: any) {
    const { data: product, error: prodError } = await supabase.from('inventory_products').select('current_stock').eq('id', data.product_id).single();
    if (prodError) throw new Error('Erreur vérification stock : ' + prodError.message);

    if (['CONSUMPTION', 'SALE', 'LOSS'].includes(data.transaction_type)) {
      if (product.current_stock < data.quantity) {
        throw new Error('Stock insuffisant pour cette opération.');
      }
    }

    const id = uuidv4();
    const { data: transaction, error } = await supabase.from('inventory_transactions').insert([{
      id,
      ...data,
      date: data.date || new Date().toISOString()
    }]).select().single();
    if (error) throw new Error('Erreur transaction : ' + error.message);
    return transaction;
  },

  async getProductTransactions(productId: string) {
    const { data, error } = await supabase.from('inventory_transactions')
      .select('*')
      .eq('product_id', productId)
      .order('date', { ascending: false });
    if (error) throw new Error('Erreur historique : ' + error.message);
    return data;
  },

  async getInventoryTransactions(filters?: { type?: string; productId?: string }) {
    let query = supabase.from('inventory_transactions').select(`
      *,
      product:inventory_products(*)
    `);
    if (filters?.type) query = query.eq('transaction_type', filters.type);
    if (filters?.productId) query = query.eq('product_id', filters.productId);
    
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw new Error('Erreur transactions : ' + error.message);
    return data;
  },

  async getFeedStock() {
    const { data, error } = await supabase.from('inventory_products')
      .select('current_stock, category:inventory_categories!inner(name)')
      .eq('category.name', 'Alimentation');
    if (error) throw new Error('Erreur stock aliment : ' + error.message);
    return data.reduce((acc, curr) => acc + (curr.current_stock || 0), 0);
  },

  async getLowStockProducts() {
    // Only return products where current_stock <= reorder_level
    // We can fetch all and filter in JS if complex, but supabase rpc or direct is better.
    // Wait, direct comparison of columns might need RPC, but let's fetch and filter for now
    const { data, error } = await supabase.from('inventory_products').select('*');
    if (error) throw new Error('Erreur alerte stock : ' + error.message);
    return data.filter(p => p.current_stock <= (p.reorder_level || 0));
  }
};
