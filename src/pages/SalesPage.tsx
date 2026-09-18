import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, AlertCircle, TrendingUp } from 'lucide-react';

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState<'eggs' | 'animals'>('eggs');
  const [eggSales, setEggSales] = useState<any[]>([]);
  const [animalSales, setAnimalSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showEggModal, setShowEggModal] = useState(false);
  const [showAnimalModal, setShowAnimalModal] = useState(false);

  // Egg Sale Form
  const [eggForm, setEggForm] = useState({
    date: new Date().toISOString().split('T')[0],
    customer_id: '',
    customer_name: '',
    quantity: 10, // plateaux
    unit_price: 35.0, // DH per plateau
    paid_amount: 350.0,
    notes: ''
  });

  // Animal Sale Form
  const [animalForm, setAnimalForm] = useState({
    date: new Date().toISOString().split('T')[0],
    lot_id: '',
    customer_id: '',
    customer_name: '',
    quantity: 5,
    unit_price: 70.0,
    paid_amount: 350.0,
    notes: ''
  });

  useEffect(() => {
    fetchMetadata();
    fetchSales();
  }, [activeTab]);

  const fetchMetadata = async () => {
    try {
      const [custRes, lotsRes] = await Promise.all([
        supabase.from('customers').select('*').order('name'),
        supabase.from('animal_lots').select('*, breed:animal_breeds(name)').eq('status', 'active').order('lot_number')
      ]);

      if (custRes.data) setCustomers(custRes.data);
      if (lotsRes.data) {
        setLots(lotsRes.data);
        if (!animalForm.lot_id && lotsRes.data.length > 0) {
          setAnimalForm(prev => ({ ...prev, lot_id: lotsRes.data[0].id }));
        }
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  };

  const fetchSales = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'eggs') {
        const { data, error } = await supabase
          .from('egg_sales')
          .select('*, customer:customers(name)')
          .order('date', { ascending: false });
        if (error) throw error;
        setEggSales(data || []);
      } else {
        const { data, error } = await supabase
          .from('animal_sales')
          .select('*, customer:customers(name), animal_lot:animal_lots(lot_number)')
          .order('date', { ascending: false });
        if (error) throw error;
        setAnimalSales(data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des ventes.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEggSale = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      let targetCustId = eggForm.customer_id;

      // Create new customer if typed and none selected
      if (!targetCustId && eggForm.customer_name.trim()) {
        const { data: newCust, error: cErr } = await supabase
          .from('customers')
          .insert([{ name: eggForm.customer_name.trim(), is_active: true }])
          .select()
          .single();
        if (!cErr && newCust) {
          targetCustId = newCust.id;
          setCustomers(prev => [...prev, newCust]);
        }
      }

      const totalAmount = Number(eggForm.quantity) * Number(eggForm.unit_price);
      const paidAmount = Number(eggForm.paid_amount) || 0;
      const paymentStatus = paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'pending';

      const saleNumber = `VE-${Date.now().toString().slice(-6)}`;

      const { error: saleErr } = await supabase
        .from('egg_sales')
        .insert([{
          sale_number: saleNumber,
          date: eggForm.date,
          customer_id: targetCustId || null,
          quantity: Number(eggForm.quantity) || 1,
          unit: 'plateau',
          unit_price: Number(eggForm.unit_price) || 0,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          payment_status: paymentStatus,
          notes: eggForm.notes || null
        }]);

      if (saleErr) throw saleErr;

      // Also record revenue in revenues table if money was paid
      if (paidAmount > 0) {
        await supabase.from('revenues').insert([{
          date: eggForm.date,
          category: 'egg_sales',
          description: `Vente d'œufs ${saleNumber}`,
          amount: paidAmount,
          customer_id: targetCustId || null
        }]);
      }

      setShowEggModal(false);
      fetchSales();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la vente d\'œufs.');
    }
  };

  const handleCreateAnimalSale = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      if (!animalForm.lot_id) throw new Error('Veuillez sélectionner un lot d\'animaux.');

      let targetCustId = animalForm.customer_id;
      if (!targetCustId && animalForm.customer_name.trim()) {
        const { data: newCust, error: cErr } = await supabase
          .from('customers')
          .insert([{ name: animalForm.customer_name.trim(), is_active: true }])
          .select()
          .single();
        if (!cErr && newCust) {
          targetCustId = newCust.id;
          setCustomers(prev => [...prev, newCust]);
        }
      }

      const totalAmount = Number(animalForm.quantity) * Number(animalForm.unit_price);
      const paidAmount = Number(animalForm.paid_amount) || 0;
      const paymentStatus = paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'pending';

      const saleNumber = `VA-${Date.now().toString().slice(-6)}`;

      const { error: saleErr } = await supabase
        .from('animal_sales')
        .insert([{
          sale_number: saleNumber,
          date: animalForm.date,
          lot_id: animalForm.lot_id,
          customer_id: targetCustId || null,
          quantity: Number(animalForm.quantity) || 1,
          unit_price: Number(animalForm.unit_price) || 0,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          payment_status: paymentStatus,
          notes: animalForm.notes || null
        }]);

      if (saleErr) throw saleErr;

      // Record SALE ledger event for the animal lot
      await supabase.from('animal_lot_events').insert([{
        lot_id: animalForm.lot_id,
        event_type: 'SALE',
        quantity: -Math.abs(Number(animalForm.quantity) || 1),
        date: animalForm.date,
        notes: `Vente ${saleNumber}`
      }]);

      // Record revenue
      if (paidAmount > 0) {
        await supabase.from('revenues').insert([{
          date: animalForm.date,
          category: 'animal_sales',
          description: `Vente animaux ${saleNumber}`,
          amount: paidAmount,
          customer_id: targetCustId || null
        }]);
      }

      setShowAnimalModal(false);
      fetchSales();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la vente d\'animaux.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ventes & Encaissements</h1>
          <p className="text-sm text-gray-500">Suivi des ventes d'œufs et d'animaux.</p>
        </div>
        <div className="space-x-3">
          <button 
            onClick={() => setShowEggModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center shadow-sm"
          >
            <Plus size={16} className="mr-2" /> + Vente Œufs
          </button>
          <button 
            onClick={() => setShowAnimalModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center shadow-sm"
          >
            <Plus size={16} className="mr-2" /> + Vente Animaux
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="ml-3 text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('eggs')}
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === 'eggs' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Ventes d'Œufs ({eggSales.length})
            </button>
            <button
              onClick={() => setActiveTab('animals')}
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === 'animals' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Ventes d'Animaux ({animalSales.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
             <div className="text-center py-10 text-gray-500">Chargement...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Date</th>
                    <th className="px-6 py-3 text-left font-medium">Client</th>
                    <th className="px-6 py-3 text-left font-medium">{activeTab === 'eggs' ? 'Quantité' : 'Lot / Quantité'}</th>
                    <th className="px-6 py-3 text-right font-medium">Prix Unitaire</th>
                    <th className="px-6 py-3 text-right font-medium">Total</th>
                    <th className="px-6 py-3 text-right font-medium">Payé</th>
                    <th className="px-6 py-3 text-center font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {activeTab === 'eggs' ? (
                    eggSales.length === 0 ? (
                      <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Aucune vente d'œufs enregistrée.</td></tr>
                    ) : (
                      eggSales.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{formatDate(s.date)}</td>
                          <td className="px-6 py-4 text-gray-700 font-semibold">{s.customer?.name || 'Client comptant'}</td>
                          <td className="px-6 py-4 font-medium text-gray-900">{s.quantity} {s.unit || 'plateaux'}</td>
                          <td className="px-6 py-4 text-right font-medium">{formatCurrency(s.unit_price)}</td>
                          <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(s.total_amount)}</td>
                          <td className="px-6 py-4 text-right text-green-600 font-medium">{formatCurrency(s.paid_amount || 0)}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                              s.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                              s.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {s.payment_status === 'paid' ? 'Payé' : s.payment_status === 'partial' ? 'Partiel' : 'En attente'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )
                  ) : (
                    animalSales.length === 0 ? (
                      <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Aucune vente d'animaux enregistrée.</td></tr>
                    ) : (
                      animalSales.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{formatDate(s.date)}</td>
                          <td className="px-6 py-4 text-gray-700 font-semibold">{s.customer?.name || 'Client comptant'}</td>
                          <td className="px-6 py-4 font-medium text-gray-900">{s.animal_lot?.lot_number || 'Lot'} ({s.quantity} têtes)</td>
                          <td className="px-6 py-4 text-right font-medium">{formatCurrency(s.unit_price)}</td>
                          <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(s.total_amount)}</td>
                          <td className="px-6 py-4 text-right text-green-600 font-medium">{formatCurrency(s.paid_amount || 0)}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                              s.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                              s.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {s.payment_status === 'paid' ? 'Payé' : s.payment_status === 'partial' ? 'Partiel' : 'En attente'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Vente Oeufs */}
      {showEggModal && (
        <div className="fixed inset-0 z-50 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nouvelle Vente d'Œufs</h3>
            <form onSubmit={handleCreateEggSale} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Date *</label>
                <input
                  type="date"
                  required
                  value={eggForm.date}
                  onChange={e => setEggForm({...eggForm, date: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Client</label>
                <select
                  value={eggForm.customer_id}
                  onChange={e => setEggForm({...eggForm, customer_id: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                >
                  <option value="">Client occasionnel / comptant</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {!eggForm.customer_id && (
                  <input
                    type="text"
                    placeholder="Ou saisir le nom du client..."
                    value={eggForm.customer_name}
                    onChange={e => setEggForm({...eggForm, customer_name: e.target.value})}
                    className="mt-2 block w-full rounded-md border border-gray-300 py-1.5 px-3 text-xs"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Quantité (Plateaux) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={eggForm.quantity}
                    onChange={e => {
                      const q = Number(e.target.value) || 0;
                      const tot = q * eggForm.unit_price;
                      setEggForm({...eggForm, quantity: q, paid_amount: tot});
                    }}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">≈ {eggForm.quantity * 30} œufs</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Prix unitaire (DH/plateau) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={eggForm.unit_price}
                    onChange={e => {
                      const up = Number(e.target.value) || 0;
                      const tot = eggForm.quantity * up;
                      setEggForm({...eggForm, unit_price: up, paid_amount: tot});
                    }}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Total Vente (DH)</label>
                  <input
                    type="text"
                    disabled
                    value={formatCurrency(eggForm.quantity * eggForm.unit_price)}
                    className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 py-2 px-3 text-sm font-bold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Montant Encaissé (DH) *</label>
                  <input
                    type="number"
                    step="0.5"
                    value={eggForm.paid_amount}
                    onChange={e => setEggForm({...eggForm, paid_amount: Number(e.target.value) || 0})}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Notes</label>
                <input
                  type="text"
                  value={eggForm.notes}
                  onChange={e => setEggForm({...eggForm, notes: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEggModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-md text-sm font-semibold hover:bg-amber-700"
                >
                  Enregistrer la vente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Vente Animaux */}
      {showAnimalModal && (
        <div className="fixed inset-0 z-50 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nouvelle Vente d'Animaux</h3>
            <form onSubmit={handleCreateAnimalSale} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Date *</label>
                <input
                  type="date"
                  required
                  value={animalForm.date}
                  onChange={e => setAnimalForm({...animalForm, date: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Lot d'origine *</label>
                <select
                  required
                  value={animalForm.lot_id}
                  onChange={e => setAnimalForm({...animalForm, lot_id: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                >
                  <option value="">Sélectionner un lot...</option>
                  {lots.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.lot_number} - {l.breed?.name || 'Volailles'} (Dispo: {l.current_quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Client</label>
                <select
                  value={animalForm.customer_id}
                  onChange={e => setAnimalForm({...animalForm, customer_id: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                >
                  <option value="">Client occasionnel / comptant</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {!animalForm.customer_id && (
                  <input
                    type="text"
                    placeholder="Ou saisir le nom du client..."
                    value={animalForm.customer_name}
                    onChange={e => setAnimalForm({...animalForm, customer_name: e.target.value})}
                    className="mt-2 block w-full rounded-md border border-gray-300 py-1.5 px-3 text-xs"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Quantité (Têtes) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={animalForm.quantity}
                    onChange={e => {
                      const q = Number(e.target.value) || 0;
                      const tot = q * animalForm.unit_price;
                      setAnimalForm({...animalForm, quantity: q, paid_amount: tot});
                    }}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Prix unitaire (DH/tête) *</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={animalForm.unit_price}
                    onChange={e => {
                      const up = Number(e.target.value) || 0;
                      const tot = animalForm.quantity * up;
                      setAnimalForm({...animalForm, unit_price: up, paid_amount: tot});
                    }}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Total Vente (DH)</label>
                  <input
                    type="text"
                    disabled
                    value={formatCurrency(animalForm.quantity * animalForm.unit_price)}
                    className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 py-2 px-3 text-sm font-bold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Montant Encaissé (DH) *</label>
                  <input
                    type="number"
                    step="1"
                    value={animalForm.paid_amount}
                    onChange={e => setAnimalForm({...animalForm, paid_amount: Number(e.target.value) || 0})}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Notes</label>
                <input
                  type="text"
                  value={animalForm.notes}
                  onChange={e => setAnimalForm({...animalForm, notes: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAnimalModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700"
                >
                  Enregistrer la vente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
