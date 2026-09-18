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
  date_received?: string;
  received_date?: string;
  date_placed?: string | null;
  incubation_date?: string | null;
  expected_hatch_date: string | null;
  actual_hatch_date: string | null;
  eggs_hatched: number;
  eggs_failed: number;
  status: string;
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
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [incubators, setIncubators] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [houses, setHouses] = useState<any[]>([]);
  const [breeds, setBreeds] = useState<any[]>([]);

  // Create form
  const [newBatch, setNewBatch] = useState({
    batch_number: `INC-${Date.now().toString().slice(-6)}`,
    supplier_id: '',
    incubator_id: '',
    eggs_placed: 200,
    date_received: new Date().toISOString().split('T')[0],
    date_placed: new Date().toISOString().split('T')[0],
    expected_hatch_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ''
  });

  // Hatch form
  const [hatchForm, setHatchForm] = useState({
    eggs_hatched: 170,
    eggs_failed: 30,
    actual_hatch_date: new Date().toISOString().split('T')[0],
    createLot: true,
    poultry_house_id: '',
    breed_id: ''
  });

  useEffect(() => {
    fetchBatches();
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [incRes, supRes, hRes, bRes] = await Promise.all([
        supabase.from('incubators').select('*').order('name'),
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('poultry_houses').select('*').order('name'),
        supabase.from('animal_breeds').select('*').order('name')
      ]);

      if (incRes.data) {
        setIncubators(incRes.data);
        if (incRes.data.length > 0) setNewBatch(prev => ({ ...prev, incubator_id: incRes.data[0].id }));
      }
      if (supRes.data) {
        setSuppliers(supRes.data);
      }
      if (hRes.data) {
        setHouses(hRes.data);
        if (hRes.data.length > 0) setHatchForm(prev => ({ ...prev, poultry_house_id: hRes.data[0].id }));
      }
      if (bRes.data) {
        setBreeds(bRes.data);
        if (bRes.data.length > 0) setHatchForm(prev => ({ ...prev, breed_id: bRes.data[0].id }));
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  };

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

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const placed = Number(newBatch.eggs_placed) || 1;
      const { error } = await supabase
        .from('incubation_batches')
        .insert([{
          batch_number: newBatch.batch_number,
          supplier_id: newBatch.supplier_id || null,
          incubator_id: newBatch.incubator_id || null,
          eggs_placed: placed,
          date_received: newBatch.date_received,
          date_placed: newBatch.date_placed,
          expected_hatch_date: newBatch.expected_hatch_date,
          status: 'incubating',
          notes: newBatch.notes || null
        }]);

      if (error) throw error;

      setShowCreateModal(false);
      setNewBatch({
        batch_number: `INC-${Date.now().toString().slice(-6)}`,
        supplier_id: '',
        incubator_id: incubators[0]?.id || '',
        eggs_placed: 200,
        date_received: new Date().toISOString().split('T')[0],
        date_placed: new Date().toISOString().split('T')[0],
        expected_hatch_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: ''
      });
      fetchBatches();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la création du lot d\'incubation');
    }
  };

  const handleCompleteHatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    try {
      const hatched = Number(hatchForm.eggs_hatched) || 0;
      const failed = Number(hatchForm.eggs_failed) || 0;

      let resultLotId = null;

      // Optionally create animal lot from hatch
      if (hatchForm.createLot && hatched > 0) {
        const lotNumber = `LOT-${selectedBatch.batch_number.replace('INC-', '')}`;
        const { data: newLot, error: lotErr } = await supabase
          .from('animal_lots')
          .insert([{
            lot_number: lotNumber,
            animal_type_id: 'c0000000-0000-0000-0000-000000000001',
            breed_id: hatchForm.breed_id || null,
            sex: 'mixed',
            birth_date: hatchForm.actual_hatch_date,
            origin: `Incubation ${selectedBatch.batch_number}`,
            initial_quantity: hatched,
            current_quantity: hatched,
            poultry_house_id: hatchForm.poultry_house_id || null,
            acquisition_date: hatchForm.actual_hatch_date,
            status: 'active',
            notes: `Issu de l'éclosion du lot ${selectedBatch.batch_number}`
          }])
          .select()
          .single();

        if (!lotErr && newLot) {
          resultLotId = newLot.id;
          await supabase.from('animal_lot_events').insert([{
            lot_id: newLot.id,
            event_type: 'HATCH',
            quantity: hatched,
            date: hatchForm.actual_hatch_date,
            notes: `Éclosion ${selectedBatch.batch_number}`
          }]);
        }
      }

      const { error: batchErr } = await supabase
        .from('incubation_batches')
        .update({
          eggs_hatched: hatched,
          eggs_failed: failed,
          actual_hatch_date: hatchForm.actual_hatch_date,
          status: 'completed',
          result_lot_id: resultLotId
        })
        .eq('id', selectedBatch.id);

      if (batchErr) throw batchErr;

      setShowHatchModal(false);
      setSelectedBatch(null);
      fetchBatches();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la validation de l\'éclosion');
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'received':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Reçu</span>;
      case 'incubating':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">En incubation</span>;
      case 'completed':
      case 'hatched':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Éclos</span>;
      case 'failed':
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
    const s = (b.status || '').toLowerCase();
    if (filter === 'ALL') return true;
    if (filter === 'ONGOING') return s === 'received' || s === 'incubating';
    if (filter === 'COMPLETED') return s === 'completed' || s === 'hatched' || s === 'failed';
    return true;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incubation</h1>
          <p className="text-sm text-gray-500">Gérez vos lots d'incubation et d'éclosion</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          + Nouveau Lot d'Incubation
        </button>
      </div>

      <div className="mb-6 flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setFilter('ALL')}
          className={`py-2 px-4 border-b-2 font-medium text-sm ${filter === 'ALL' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Tous ({batches.length})
        </button>
        <button
          onClick={() => setFilter('ONGOING')}
          className={`py-2 px-4 border-b-2 font-medium text-sm ${filter === 'ONGOING' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          En cours ({batches.filter(b => (b.status || '').toLowerCase() === 'incubating' || (b.status || '').toLowerCase() === 'received').length})
        </button>
        <button
          onClick={() => setFilter('COMPLETED')}
          className={`py-2 px-4 border-b-2 font-medium text-sm ${filter === 'COMPLETED' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Terminés ({batches.filter(b => (b.status || '').toLowerCase() === 'completed').length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="text-center bg-white rounded-lg shadow p-12 border border-gray-200">
          <Egg className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun lot d'incubation</h3>
          <p className="mt-1 text-sm text-gray-500">Commencez par placer un nouveau lot d'œufs dans l'incubateur.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              + Nouveau Lot
            </button>
          </div>
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
                  <span className="font-medium">{batch.supplier?.name || 'Propre élevage'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 flex items-center"><Calendar className="w-4 h-4 mr-1"/> Date mise</span>
                  <span className="font-medium">{formatDate(batch.date_placed || batch.date_received || batch.created_at)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 flex items-center"><Thermometer className="w-4 h-4 mr-1"/> Éclosion prévue</span>
                  <span className="font-medium">{batch.expected_hatch_date ? formatDate(batch.expected_hatch_date) : '-'}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500">Œufs placés</p>
                    <p className="font-bold text-lg">{formatNumber(batch.eggs_placed)}</p>
                  </div>
                  {(batch.status === 'completed' || batch.status === 'hatched') && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Taux d'éclosion</p>
                      <p className={`font-bold text-lg ${getHatchRateColor(calculateHatchRate(batch.eggs_hatched, batch.eggs_placed))}`}>
                        {calculateHatchRate(batch.eggs_hatched, batch.eggs_placed).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {(batch.status === 'incubating' || batch.status === 'received') && (
                <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end">
                  <button 
                    onClick={() => {
                      setSelectedBatch(batch);
                      setHatchForm({
                        eggs_hatched: Math.round(batch.eggs_placed * 0.85),
                        eggs_failed: Math.round(batch.eggs_placed * 0.15),
                        actual_hatch_date: new Date().toISOString().split('T')[0],
                        createLot: true,
                        poultry_house_id: houses[0]?.id || '',
                        breed_id: breeds[0]?.id || ''
                      });
                      setShowHatchModal(true);
                    }}
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

      {/* Modal Création Lot Incubation */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nouveau Lot d'Incubation</h3>
            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Numéro de lot</label>
                <input
                  type="text"
                  required
                  value={newBatch.batch_number}
                  onChange={e => setNewBatch({...newBatch, batch_number: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Incubateur *</label>
                <select
                  required
                  value={newBatch.incubator_id}
                  onChange={e => setNewBatch({...newBatch, incubator_id: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                >
                  <option value="">Sélectionner...</option>
                  {incubators.map(inc => (
                    <option key={inc.id} value={inc.id}>{inc.name} (Capacité: {inc.capacity})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Œufs placés *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newBatch.eggs_placed}
                    onChange={e => setNewBatch({...newBatch, eggs_placed: parseInt(e.target.value) || 0})}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Date mise en incubation</label>
                  <input
                    type="date"
                    required
                    value={newBatch.date_placed}
                    onChange={e => {
                      const dp = e.target.value;
                      const exp = new Date(new Date(dp).getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                      setNewBatch({...newBatch, date_placed: dp, date_received: dp, expected_hatch_date: exp});
                    }}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Date prévue d'éclosion (21 jours)</label>
                <input
                  type="date"
                  value={newBatch.expected_hatch_date}
                  onChange={e => setNewBatch({...newBatch, expected_hatch_date: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Notes / Origine des œufs</label>
                <textarea
                  rows={2}
                  value={newBatch.notes}
                  onChange={e => setNewBatch({...newBatch, notes: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700"
                >
                  Lancer l'incubation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Compléter Éclosion */}
      {showHatchModal && selectedBatch && (
        <div className="fixed inset-0 z-50 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Clôturer l'Éclosion</h3>
            <p className="text-xs text-gray-500 mb-4">Lot: {selectedBatch.batch_number} ({selectedBatch.eggs_placed} œufs placés)</p>
            <form onSubmit={handleCompleteHatch} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Poussins éclos *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max={selectedBatch.eggs_placed}
                    value={hatchForm.eggs_hatched}
                    onChange={e => {
                      const h = parseInt(e.target.value) || 0;
                      setHatchForm({
                        ...hatchForm,
                        eggs_hatched: h,
                        eggs_failed: Math.max(0, selectedBatch.eggs_placed - h)
                      });
                    }}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Œufs non éclos</label>
                  <input
                    type="number"
                    value={hatchForm.eggs_failed}
                    onChange={e => setHatchForm({...hatchForm, eggs_failed: parseInt(e.target.value) || 0})}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Date effective d'éclosion</label>
                <input
                  type="date"
                  required
                  value={hatchForm.actual_hatch_date}
                  onChange={e => setHatchForm({...hatchForm, actual_hatch_date: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-md border border-gray-200 space-y-2">
                <label className="flex items-center text-xs font-semibold text-gray-900">
                  <input
                    type="checkbox"
                    checked={hatchForm.createLot}
                    onChange={e => setHatchForm({...hatchForm, createLot: e.target.checked})}
                    className="mr-2"
                  />
                  Créer automatiquement le nouveau lot de poussins
                </label>

                {hatchForm.createLot && (
                  <div className="space-y-2 pt-1">
                    <div>
                      <label className="block text-xs text-gray-600">Poulailler de destination</label>
                      <select
                        value={hatchForm.poultry_house_id}
                        onChange={e => setHatchForm({...hatchForm, poultry_house_id: e.target.value})}
                        className="mt-1 block w-full rounded border-gray-300 py-1.5 px-2 text-xs"
                      >
                        {houses.map(h => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Race</label>
                      <select
                        value={hatchForm.breed_id}
                        onChange={e => setHatchForm({...hatchForm, breed_id: e.target.value})}
                        className="mt-1 block w-full rounded border-gray-300 py-1.5 px-2 text-xs"
                      >
                        {breeds.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHatchModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700"
                >
                  Valider l'éclosion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
