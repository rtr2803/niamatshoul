import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores';
import { formatDate, formatNumber } from '@/lib/utils';
import { 
  Plus, Search, Filter, Egg, Calendar, Truck, 
  CheckCircle, XCircle, MoreVertical, Thermometer 
} from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
}

interface Incubator {
  id: string;
  name: string;
}

interface IncubationBatch {
  id: string;
  batch_number: string;
  supplier_id: string;
  incubator_id: string;
  eggs_placed: number;
  received_date: string;
  incubation_date: string | null;
  expected_hatch_date: string | null;
  actual_hatch_date: string | null;
  eggs_hatched: number;
  eggs_failed: number;
  status: 'RECEIVED' | 'INCUBATING' | 'HATCHED' | 'FAILED';
  notes: string;
  created_at: string;
  supplier: Supplier | null;
  incubator: Incubator | null;
}
export default function IncubationPage() {
  const isOwner = useAuthStore((state) => state.isOwner);
  
  const [batches, setBatches] = useState<IncubationBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'ONGOING' | 'COMPLETED'>('ALL');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHatchModal, setShowHatchModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<IncubationBatch | null>(null);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('incubation_batches')
        .select('*, supplier:suppliers(name), incubator:incubators(name)')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setBatches(data || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Reçu</span>;
      case 'INCUBATING':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">En incubation</span>;
      case 'HATCHED':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Éclos</span>;
      case 'FAILED':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Échoué</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const calculateHatchRate = (hatched: number, total: number) => {
    if (!total || total === 0) return 0;
    return (hatched / total) * 100;
  };

  const getHatchRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredBatches = batches.filter(b => {
    if (filter === 'ALL') return true;
    if (filter === 'ONGOING') return b.status === 'RECEIVED' || b.status === 'INCUBATING';
    if (filter === 'COMPLETED') return b.status === 'HATCHED' || b.status === 'FAILED';
    return true;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incubation</h1>
          <p className="text-sm text-gray-500">Gérez vos lots d'incubation et d'éclosion</p>
        </div>
        {isOwner && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouveau Lot
          </button>
        )}
      </div>

      <div className="mb-6 flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setFilter('ALL')}
          className={`py-2 px-4 border-b-2 font-medium text-sm ${filter === 'ALL' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Tous
        </button>
        <button
          onClick={() => setFilter('ONGOING')}
          className={`py-2 px-4 border-b-2 font-medium text-sm ${filter === 'ONGOING' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          En cours
        </button>
        <button
          onClick={() => setFilter('COMPLETED')}
          className={`py-2 px-4 border-b-2 font-medium text-sm ${filter === 'COMPLETED' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Terminés
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBatches.map(batch => (
            <div key={batch.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <div className="flex items-center space-x-2">
                  <Egg className="w-5 h-5 text-gray-500" />
                  <span className="font-bold text-gray-900">{batch.batch_number}</span>
                </div>
                {getStatusBadge(batch.status)}
              </div>
              <div className="p-4 flex-grow space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 flex items-center"><Truck className="w-4 h-4 mr-1"/> Fournisseur</span>
                  <span className="font-medium">{batch.supplier?.name || '-'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 flex items-center"><Calendar className="w-4 h-4 mr-1"/> Date réception</span>
                  <span className="font-medium">{formatDate(batch.received_date)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 flex items-center"><Thermometer className="w-4 h-4 mr-1"/> Éclosion prévue</span>
                  <span className="font-medium">{batch.expected_hatch_date ? formatDate(batch.expected_hatch_date) : '-'}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500">Oeufs placés</p>
                    <p className="font-bold text-lg">{formatNumber(batch.eggs_placed)}</p>
                  </div>
                  {batch.status === 'HATCHED' && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Taux d'éclosion</p>
                      <p className={`font-bold text-lg ${getHatchRateColor(calculateHatchRate(batch.eggs_hatched, batch.eggs_placed))}`}>
                        {calculateHatchRate(batch.eggs_hatched, batch.eggs_placed).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {isOwner && batch.status === 'INCUBATING' && (
                <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end">
                  <button 
                    onClick={() => { setSelectedBatch(batch); setShowHatchModal(true); }}
                    className="text-sm bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition-colors"
                  >
                    Compléter éclosion
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
