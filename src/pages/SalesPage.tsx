import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus } from 'lucide-react';

export default function SalesPage() {
  const { isOwner } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'eggs' | 'animals'>('eggs');
  const [eggSales, setEggSales] = useState<any[]>([]);
  const [animalSales, setAnimalSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSales();
  }, [activeTab]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      if (activeTab === 'eggs') {
        const { data } = await supabase
          .from('egg_sales')
          .select('*')
          .order('date', { ascending: false });
        setEggSales(data || []);
      } else {
        const { data } = await supabase
          .from('animal_sales')
          .select('*')
          .order('date', { ascending: false });
        setAnimalSales(data || []);
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Ventes</h1>
        {isOwner && (
          <div className="space-x-3">
            <button className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center">
              <Plus size={16} className="mr-2" /> Vente Oeufs
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center">
              <Plus size={16} className="mr-2" /> Vente Animaux
            </button>
          </div>
        )}
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('eggs')}
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === 'eggs' 
                  ? 'border-green-500 text-green-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Ventes d'Oeufs
            </button>
            <button
              onClick={() => setActiveTab('animals')}
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === 'animals' 
                  ? 'border-green-500 text-green-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Ventes d'Animaux
            </button>
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
             <div className="text-center py-10 text-gray-500">Chargement...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix Unitaire</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeTab === 'eggs' ? (
                    eggSales.map(s => (
                      <tr key={s.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(s.date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{s.customer_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{s.quantity} plateaux</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{formatCurrency(s.unit_price)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{formatCurrency(s.total_price)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                           <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                             Payé
                           </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    animalSales.map(s => (
                      <tr key={s.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(s.date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{s.customer_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{s.quantity} têtes</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{formatCurrency(s.unit_price)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{formatCurrency(s.total_price)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                           <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                             Payé
                           </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
