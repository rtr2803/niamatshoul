import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { 
  Plus, Package, ArrowRightLeft, AlertTriangle 
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  category_id: string;
  unit: string;
  packaging_size: number;
  current_stock: number;
  reorder_level: number;
  purchase_price: number;
  category: Category | null;
}

export default function InventoryPage() {
  const isOwner = useAuthStore((state) => state.isOwner);
  
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'TRANSACTIONS'>('PRODUCTS');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_products')
        .select('*, category:inventory_categories(name)')
        .order('name');
        
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatusColor = (current: number, reorder: number) => {
    if (current <= 0) return 'text-red-600 bg-red-100';
    if (current <= reorder) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventaire</h1>
          <p className="text-sm text-gray-500">Gérez vos produits et transactions</p>
        </div>
        {isOwner && (
          <div className="flex space-x-3">
            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center hover:bg-gray-50 transition-colors">
              <Plus className="w-5 h-5 mr-2 text-gray-500" />
              Nouveau Produit
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors">
              <ArrowRightLeft className="w-5 h-5 mr-2" />
              Nouvelle Transaction
            </button>
          </div>
        )}
      </div>

      <div className="mb-6 flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('PRODUCTS')}
          className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center ${activeTab === 'PRODUCTS' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <Package className="w-4 h-4 mr-2" />
          Produits
        </button>
        <button
          onClick={() => setActiveTab('TRANSACTIONS')}
          className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center ${activeTab === 'TRANSACTIONS' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Transactions
        </button>
      </div>

      {activeTab === 'PRODUCTS' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Catégorie</th>
                  <th className="px-4 py-3 text-right">Stock Actuel</th>
                  <th className="px-4 py-3 text-right">Prix d'Achat</th>
                  <th className="px-4 py-3 text-center">Unité</th>
                  <th className="px-4 py-3 text-right">Seuil Réappro.</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Chargement...</td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Aucun produit trouvé.</td>
                  </tr>
                ) : (
                  products.map(prod => {
                    const statusClass = getStockStatusColor(prod.current_stock, prod.reorder_level);
                    return (
                      <tr key={prod.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{prod.name}</td>
                        <td className="px-4 py-3 text-gray-600">{prod.category?.name || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-2 py-1 rounded-full font-semibold text-xs ${statusClass}`}>
                            {formatNumber(prod.current_stock)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(prod.purchase_price)}</td>
                        <td className="px-4 py-3 text-center text-gray-500">{prod.unit}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{formatNumber(prod.reorder_level)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'TRANSACTIONS' && (
        <div className="bg-white p-8 text-center rounded-lg border border-gray-200">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Historique des transactions</h3>
          <p className="text-gray-500">La vue des transactions sera implémentée prochainement.</p>
        </div>
      )}
    </div>
  );
}
