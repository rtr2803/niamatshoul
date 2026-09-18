import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  DollarSign, 
  Plus,
  Filter,
  Search
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

type TabType = 'transactions' | 'expenses' | 'revenues' | 'debts' | 'receivables';

export default function FinancePage() {
  const { isOwner } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('transactions');
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [receivables, setReceivables] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    revenuesMonth: 0,
    expensesMonth: 0,
    netResult: 0,
    totalDebts: 0,
    totalReceivables: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const { data: txData } = await supabase
        .from('financial_transactions')
        .select('*')
        .order('date', { ascending: false });

      const { data: dData } = await supabase
        .from('debts')
        .select('*, supplier:suppliers(name)')
        .order('date', { ascending: false });

      const { data: rData } = await supabase
        .from('receivables')
        .select('*, customer:customers(name)')
        .order('date', { ascending: false });

      setTransactions(txData || []);
      setDebts(dData || []);
      setReceivables(rData || []);

      // Calculate summaries
      let revMonth = 0;
      let expMonth = 0;
      
      const chartMap = new Map();
      
      txData?.forEach(t => {
        const isRev = t.type === 'REVENUE' || t.type === 'INCOME';
        const isExp = t.type === 'EXPENSE';
        const amount = Number(t.amount) || 0;

        if (t.date >= startOfMonth.substring(0, 10) && t.date <= endOfMonth.substring(0, 10)) {
          if (isRev) revMonth += amount;
          if (isExp) expMonth += amount;
        }
        
        const month = t.date ? t.date.substring(0, 7) : '';
        if (month) {
          if (!chartMap.has(month)) {
            chartMap.set(month, { name: month, revenues: 0, expenses: 0 });
          }
          const mData = chartMap.get(month);
          if (isRev) mData.revenues += amount;
          if (isExp) mData.expenses += amount;
        }
      });

      const tDebts = dData?.reduce((acc, d) => acc + (Number(d.remaining_amount) || (Number(d.total_amount) - Number(d.paid_amount)) || 0), 0) || 0;
      const tRec = rData?.reduce((acc, r) => acc + (Number(r.remaining_amount) || (Number(r.total_amount) - Number(r.paid_amount)) || 0), 0) || 0;

      setSummary({
        revenuesMonth: revMonth,
        expensesMonth: expMonth,
        netResult: revMonth - expMonth,
        totalDebts: tDebts,
        totalReceivables: tRec
      });

      const cData = Array.from(chartMap.values()).sort((a, b) => a.name.localeCompare(b.name)).slice(-6);
      setChartData(cData);

    } catch (error) {
      console.error('Error fetching finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Finances</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg"><TrendingUp size={24} /></div>
          <div>
            <p className="text-sm text-gray-500">Revenus ce mois</p>
            <p className="text-xl font-bold">{formatCurrency(summary.revenuesMonth)}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-lg"><TrendingDown size={24} /></div>
          <div>
            <p className="text-sm text-gray-500">Dépenses ce mois</p>
            <p className="text-xl font-bold">{formatCurrency(summary.expensesMonth)}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><DollarSign size={24} /></div>
          <div>
            <p className="text-sm text-gray-500">Résultat net</p>
            <p className="text-xl font-bold">{formatCurrency(summary.netResult)}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-lg"><AlertCircle size={24} /></div>
          <div>
            <p className="text-sm text-gray-500">Total dettes</p>
            <p className="text-xl font-bold">{formatCurrency(summary.totalDebts)}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-lg"><CreditCard size={24} /></div>
          <div>
            <p className="text-sm text-gray-500">Total créances</p>
            <p className="text-xl font-bold">{formatCurrency(summary.totalReceivables)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-80">
        <h3 className="text-lg font-semibold mb-4">Évolution Financière (6 derniers mois)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis />
            <RechartsTooltip formatter={(value) => formatCurrency(value as number)} />
            <Legend />
            <Bar dataKey="revenues" name="Revenus" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Dépenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {(['transactions', 'expenses', 'revenues', 'debts', 'receivables'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-6 font-medium text-sm border-b-2 ${
                  activeTab === tab 
                    ? 'border-green-500 text-green-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
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
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                     {(activeTab === 'debts' || activeTab === 'receivables') && (
                       <>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payé</th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restant</th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                       </>
                     )}
                   </tr>
                 </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activeTab === 'transactions' && transactions.map(t => {
                      const isRev = t.type === 'REVENUE' || t.type === 'INCOME';
                      return (
                        <tr key={t.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(t.date)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.description}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${isRev ? 'text-green-600' : 'text-red-600'}`}>
                            {isRev ? '+' : '-'}{formatCurrency(t.amount)}
                          </td>
                        </tr>
                      );
                    })}
                    {activeTab === 'expenses' && transactions.filter(t => t.type === 'EXPENSE').map(t => (
                      <tr key={t.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(t.date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                          -{formatCurrency(t.amount)}
                        </td>
                      </tr>
                    ))}
                    {activeTab === 'revenues' && transactions.filter(t => t.type === 'REVENUE' || t.type === 'INCOME').map(t => (
                      <tr key={t.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(t.date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                          +{formatCurrency(t.amount)}
                        </td>
                      </tr>
                    ))}
                    {activeTab === 'debts' && (debts.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-6 text-gray-400">Aucune dette fournisseur</td></tr>
                    ) : (
                      debts.map(d => (
                        <tr key={d.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(d.date || d.created_at)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {d.supplier?.name ? `Fournisseur : ${d.supplier.name}` : (d.notes || 'Dette Fournisseur')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(d.total_amount || d.amount || 0)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{formatCurrency(d.paid_amount || 0)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                            {formatCurrency(d.remaining_amount ?? ((d.total_amount || d.amount || 0) - (d.paid_amount || 0)))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              d.status === 'paid' ? 'bg-green-100 text-green-800' : d.status === 'partial' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {d.status === 'paid' ? 'Payé' : d.status === 'partial' ? 'Partiel' : 'En attente'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ))}
                    {activeTab === 'receivables' && (receivables.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-6 text-gray-400">Aucune créance client</td></tr>
                    ) : (
                      receivables.map(r => (
                        <tr key={r.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(r.date || r.created_at)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {r.customer?.name ? `Client : ${r.customer.name}` : (r.notes || 'Créance Client')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(r.total_amount || r.amount || 0)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{formatCurrency(r.paid_amount || 0)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                            {formatCurrency(r.remaining_amount ?? ((r.total_amount || r.amount || 0) - (r.paid_amount || 0)))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              r.status === 'paid' ? 'bg-green-100 text-green-800' : r.status === 'partial' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {r.status === 'paid' ? 'Payé' : r.status === 'partial' ? 'Partiel' : 'En attente'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ))}
                  </tbody>
               </table>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
