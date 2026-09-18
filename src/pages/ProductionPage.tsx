import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores';
import { formatDate, formatNumber } from '@/lib/utils';
import { 
  Plus, Calendar as CalendarIcon, Egg, CheckCircle, XCircle 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PoultryHouse {
  id: string;
  name: string;
}

interface EggProduction {
  id: string;
  date: string;
  poultry_house_id: string;
  batch_id: string | null;
  total_eggs: number;
  broken_eggs: number;
  sellable_eggs: number;
  notes: string;
  created_at: string;
  poultry_house: PoultryHouse | null;
}

export default function ProductionPage() {
  const isOwner = useAuthStore((state) => state.role === 'OWNER');
  
  const [productions, setProductions] = useState<EggProduction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    month: 0,
    layRate: 0
  });

  useEffect(() => {
    fetchProduction();
  }, []);

  const fetchProduction = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('egg_production')
        .select('*, poultry_house:poultry_houses(name)')
        .order('date', { ascending: false })
        .limit(100);
        
      if (error) throw error;
      setProductions(data || []);
      
      // Calculate simple stats
      if (data && data.length > 0) {
        let today = 0;
        const todayStr = new Date().toISOString().split('T')[0];
        
        data.forEach(p => {
          if (p.date === todayStr) today += p.total_eggs;
        });
        
        setStats({
          today,
          week: today * 7, // mockup
          month: today * 30, // mockup
          layRate: 85 // mockup
        });
      }
    } catch (error) {
      console.error('Error fetching production:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = productions.slice(0, 14).reverse().map(p => ({
    name: formatDate(p.date),
    total: p.total_eggs,
    sellable: p.sellable_eggs
  }));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production d'Oeufs</h1>
          <p className="text-sm text-gray-500">Suivi journalier de la ponte</p>
        </div>
        {isOwner && (
          <button 
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouvelle Saisie
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <Egg className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Aujourd'hui</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.today)}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Cette semaine</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.week)}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Ce mois</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.month)}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Taux de ponte</p>
            <p className="text-2xl font-bold text-gray-900">{stats.layRate}%</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Tendance de production (14 derniers jours)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" />
              <YAxis />
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <Tooltip />
              <Area type="monotone" dataKey="total" stroke="#16a34a" fillOpacity={1} fill="url(#colorTotal)" name="Total Oeufs" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Poulailler</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Cassés</th>
                <th className="px-4 py-3 text-right">Vendables</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Chargement...</td>
                </tr>
              ) : productions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Aucune production enregistrée.</td>
                </tr>
              ) : (
                productions.map(prod => (
                  <tr key={prod.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{formatDate(prod.date)}</td>
                    <td className="px-4 py-3 text-gray-600">{prod.poultry_house?.name || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatNumber(prod.total_eggs)}</td>
                    <td className="px-4 py-3 text-right text-red-500">{formatNumber(prod.broken_eggs)}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{formatNumber(prod.sellable_eggs)}</td>
                    <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{prod.notes}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
