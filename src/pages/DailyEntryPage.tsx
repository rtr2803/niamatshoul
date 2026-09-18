import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PoultryHouse, InventoryProduct } from '@/types';
import { saveDailyEntry } from '@/services/dailyEntryService';

export default function DailyEntryPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [houseId, setHouseId] = useState('');
  const [houses, setHouses] = useState<PoultryHouse[]>([]);
  const [feedProducts, setFeedProducts] = useState<InventoryProduct[]>([]);
  const [animalCount, setAnimalCount] = useState(0);

  const [mortality, setMortality] = useState(0);
  const [eggsTotal, setEggsTotal] = useState(0);
  const [eggsBroken, setEggsBroken] = useState(0);
  const [feedProductId, setFeedProductId] = useState('');
  const [feedBags, setFeedBags] = useState(0);
  const [feedKg, setFeedKg] = useState(0);
  const [greenForageKg, setGreenForageKg] = useState(0);
  const [temperature, setTemperature] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchHouses();
    fetchFeedProducts();
  }, []);

  useEffect(() => {
    if (houseId) {
      const house = houses.find((h) => h.id === houseId);
      setAnimalCount((house as any)?.current_quantity || house?.capacity || 0);
    } else {
      setAnimalCount(0);
    }
  }, [houseId, houses]);

  const fetchHouses = async () => {
    try {
      const { data } = await supabase.from('poultry_houses').select('*').order('name');
      if (data) setHouses(data as PoultryHouse[]);
    } catch (err) {
      console.error('Error fetching houses:', err);
    }
  };

  const fetchFeedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_products')
        .select('*, category:inventory_categories(name)')
        .order('name');
      if (error) throw error;
      if (data && data.length > 0) {
        setFeedProducts(data as InventoryProduct[]);
        setFeedProductId(prev => prev || data[0].id);
      }
    } catch (err) {
      console.error('Error fetching feed products:', err);
    }
  };

  const handleFeedBagsChange = (bags: number) => {
    setFeedBags(bags);
    setFeedKg(bags * 50); // Auto calc
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!date) return setError('La date est requise');
    if (!houseId) return setError('Le poulailler est requis');
    if (eggsTotal < 0) return setError('La production d\'oeufs ne peut pas être négative');
    if (eggsBroken < 0 || eggsBroken > eggsTotal) return setError('Oeufs cassés invalides');
    if (feedKg < 0) return setError('Consommation d\'aliment invalide');
    if (mortality < 0) return setError('Mortalité invalide');

    try {
      setLoading(true);
      await saveDailyEntry({
        date,
        houseId,
        mortality,
        eggsTotal,
        eggsBroken,
        feedProductId: feedProductId || undefined,
        feedKg,
        greenForageKg,
        temperature: temperature === '' ? undefined : Number(temperature),
        notes
      });
      setSuccess('Journée enregistrée avec succès !');
      // Reset form fields
      setHouseId('');
      setMortality(0);
      setEggsTotal(0);
      setEggsBroken(0);
      setFeedProductId('');
      setFeedBags(0);
      setFeedKg(0);
      setGreenForageKg(0);
      setTemperature('');
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const eggsSellable = eggsTotal - eggsBroken;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <h1 className="text-2xl font-bold text-gray-900">Saisie Journalière</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">{error}</div>}
        {success && <div className="bg-green-50 text-green-600 p-4 rounded-md mb-6">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Poulailler</label>
              <select value={houseId} onChange={e => setHouseId(e.target.value)} required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500">
                <option value="">Sélectionner un poulailler...</option>
                {houses.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
              {houseId && <div className="text-xs text-gray-500 mt-1">Population actuelle : {animalCount} oiseaux</div>}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Santé & Production</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mortalité (nombre)</label>
                <input type="number" min="0" value={mortality} onChange={e => setMortality(Number(e.target.value))} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Production d'oeufs - Total</label>
                <input type="number" min="0" value={eggsTotal} onChange={e => setEggsTotal(Number(e.target.value))} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Oeufs cassés/abîmés</label>
                <input type="number" min="0" max={eggsTotal} value={eggsBroken} onChange={e => setEggsBroken(Number(e.target.value))} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500" />
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-md flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">Oeufs vendables :</span>
              <span className="text-lg font-bold text-blue-900">{Math.max(0, eggsSellable)}</span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Alimentation & Environnement</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aliment composé (Produit)</label>
                <select value={feedProductId} onChange={e => setFeedProductId(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500">
                  <option value="">Sélectionner un produit...</option>
                  {feedProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de sacs</label>
                <input type="number" min="0" step="0.1" value={feedBags} onChange={e => handleFeedBagsChange(Number(e.target.value))} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kg consommés (Total)</label>
                <input type="number" min="0" step="0.1" value={feedKg} onChange={e => setFeedKg(Number(e.target.value))} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fourrage vert (kg estimés)</label>
                <input type="number" min="0" step="0.1" value={greenForageKg} onChange={e => setGreenForageKg(Number(e.target.value))} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Température (°C)</label>
                <input type="number" step="0.1" value={temperature} onChange={e => setTemperature(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ex: 24.5" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500" />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Observations</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Observations sur le comportement, symptômes..." className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"></textarea>
          </div>

          <div className="pt-4">
            <button type="submit" disabled={loading} className="w-full flex justify-center py-4 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors">
              {loading ? 'Enregistrement en cours...' : 'ENREGISTRER LA JOURNÉE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
