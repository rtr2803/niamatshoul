import React, { useState, useEffect } from 'react';
import { 
  Bird, Egg, TrendingUp, AlertTriangle, Package, DollarSign, 
  ArrowDownCircle, CreditCard, Users, Loader2 
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  getDashboardKPIs, getEggProductionChart, getMortalityChart, 
  getFeedConsumptionChart, getRevenueExpenseChart, getHatchRateChart, 
  getPopulationChart 
} from '@/services/dashboardService';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { DashboardKPIs } from '@/types';

const defaultKPIs: DashboardKPIs = {
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

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [eggChart, setEggChart] = useState<any[]>([]);
  const [mortalityChart, setMortalityChart] = useState<any[]>([]);
  const [feedChart, setFeedChart] = useState<any[]>([]);
  const [financeChart, setFinanceChart] = useState<any[]>([]);
  const [populationChart, setPopulationChart] = useState<any[]>([]);
  const [hatchChart, setHatchChart] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [
        kpiData,
        eggData,
        mortalityData,
        feedData,
        financeData,
        popData,
        hatchData
      ] = await Promise.all([
        getDashboardKPIs().catch(() => null),
        getEggProductionChart().catch(() => []),
        getMortalityChart().catch(() => []),
        getFeedConsumptionChart().catch(() => []),
        getRevenueExpenseChart().catch(() => []),
        getPopulationChart().catch(() => []),
        getHatchRateChart().catch(() => [])
      ]);

      setKpis(kpiData || defaultKPIs);
      setEggChart(eggData || []);
      setMortalityChart(mortalityData || []);
      setFeedChart(feedData || []);
      setFinanceChart(financeData || []);
      setPopulationChart(popData || []);
      setHatchChart(hatchData || []);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !kpis) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord</h1>

      {/* KPIs Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard icon={<Bird className="text-white" />} color="bg-primary-600" label="Total Animaux" value={formatNumber(kpis.totalAnimals)} />
        <KpiCard icon={<Egg className="text-white" />} color="bg-accent-500" label="Oeufs Aujourd'hui" value={formatNumber(kpis.eggsToday)} />
        <KpiCard icon={<TrendingUp className="text-white" />} color="bg-primary-500" label="Oeufs ce Mois" value={formatNumber(kpis.eggsThisMonth)} />
        <KpiCard icon={<AlertTriangle className="text-white" />} color="bg-red-500" label="Mortalité Aujourd'hui" value={formatNumber(kpis.mortalityToday)} />
        <KpiCard icon={<Package className="text-white" />} color="bg-blue-500" label="Stock Aliment" value={`${formatNumber(kpis.feedStock)} kg`} />
        
        <KpiCard icon={<DollarSign className="text-white" />} color="bg-green-500" label="Revenu ce Mois" value={formatCurrency(kpis.revenueThisMonth)} />
        <KpiCard icon={<ArrowDownCircle className="text-white" />} color="bg-red-500" label="Dépenses ce Mois" value={formatCurrency(kpis.expenseThisMonth)} />
        <KpiCard icon={<TrendingUp className="text-white" />} color="bg-primary-700" label="Résultat Net" value={formatCurrency(kpis.netResultThisMonth)} />
        <KpiCard icon={<CreditCard className="text-white" />} color="bg-orange-500" label="Dettes Fournisseurs" value={formatCurrency(kpis.supplierDebt)} />
        <KpiCard icon={<Users className="text-white" />} color="bg-blue-600" label="Créances Clients" value={formatCurrency(kpis.customerCredit)} />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Production d'Oeufs (30 jours)">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={eggChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="total" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} name="Total Oeufs" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Mortalité (30 jours)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mortalityChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#ef4444" name="Mortalité" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Consommation d'Aliment (30 jours)">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={feedChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="amount" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Consommation (kg)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenus vs Dépenses (6 mois)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={financeChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#22c55e" name="Revenus" />
              <Bar dataKey="expense" fill="#ef4444" name="Dépenses" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Population par Poulailler">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={populationChart} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Tooltip />
              <Bar dataKey="count" fill="#0ea5e9" name="Population" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Taux d'Éclosion par Lot">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hatchChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="batchName" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="rate" fill="#f59e0b" name="Taux %" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      
      {/* Alerts Section (Placeholder for future) */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Dernières Alertes</h3>
        <p className="text-sm text-gray-500">Aucune alerte pour le moment.</p>
      </div>
    </div>
  );
}

function KpiCard({ icon, color, label, value }: { icon: React.ReactNode, color: string, label: string, value: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col justify-center items-center text-center kpi-card">
      <div className={`p-3 rounded-lg mb-2 ${color}`}>
        {icon}
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}
