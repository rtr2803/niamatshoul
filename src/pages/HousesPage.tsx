import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores';
import { 
  Plus, 
  Home,
  AlertCircle
} from 'lucide-react';

export default function HousesPage() {
  const { isOwner } = useAuthStore();
  const [houses, setHouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    capacity: 250,
    house_type: 'standard',
    status: 'active',
    is_active: true,
    description: '',
    notes: ''
  });

  useEffect(() => {
    fetchHouses();
  }, []);

  const fetchHouses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('poultry_houses')
        .select('*')
        .order('name');

      if (error) throw error;
      setHouses(data || []);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des poulaillers.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const codeToUse = formData.code.trim() || `P${houses.length + 1}`;
      const payload = {
        name: formData.name.trim(),
        code: codeToUse,
        capacity: Number(formData.capacity) || 250,
        house_type: formData.house_type || 'standard',
        status: 'active',
        is_active: true,
        description: formData.description || null,
        notes: formData.notes || null
      };

      const { error } = await supabase
        .from('poultry_houses')
        .insert([payload]);

      if (error) throw error;

      setIsModalOpen(false);
      setFormData({
        name: '',
        code: '',
        capacity: 250,
        house_type: 'standard',
        status: 'active',
        is_active: true,
        description: '',
        notes: ''
      });
      fetchHouses();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du poulailler.');
    }
  };

  const getCapacityColor = (current: number, max: number) => {
    if (max === 0) return 'bg-gray-200';
    const ratio = current / max;
    if (ratio < 0.5) return 'bg-green-500';
    if (ratio < 0.85) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Poulaillers</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gérez les bâtiments et espaces d'élevage de votre ferme.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Poulailler
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : houses.length === 0 ? (
         <div className="mt-6 text-center bg-white rounded-lg shadow p-12 border border-gray-200">
            <Home className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun poulailler</h3>
            <p className="mt-1 text-sm text-gray-500">Commencez par ajouter un bâtiment.</p>
            <div className="mt-6">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Poulailler
              </button>
            </div>
         </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {houses.map((house) => {
            const currentOccupancy = 0; // TODO: fetch from actual lots
            const capacityRatio = Math.min((currentOccupancy / house.capacity) * 100, 100);

            return (
              <div key={house.id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Home className="h-6 w-6 text-gray-400" aria-hidden="true" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          {house.code}
                        </dt>
                        <dd className="flex items-baseline">
                          <div className="text-lg font-medium text-gray-900">
                            {house.name}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3">
                  <div className="text-sm">
                    <div className="flex justify-between text-gray-500 mb-1">
                      <span>Occupation</span>
                      <span>{currentOccupancy} / {house.capacity}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getCapacityColor(currentOccupancy, house.capacity)}`}
                        style={{ width: `${capacityRatio}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${house.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {house.is_active ? 'Actif' : 'Inactif'}
                    </span>
                    <button className="text-sm text-indigo-600 hover:text-indigo-900 font-medium">
                      Voir les lots
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Nouveau Poulailler</h3>
                  <form onSubmit={handleCreateHouse} className="space-y-4">
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Nom</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Code</label>
                        <input
                          type="text"
                          required
                          value={formData.code}
                          onChange={e => setFormData({...formData, code: e.target.value})}
                          className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Capacité (Nombre d'animaux)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={formData.capacity}
                        onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})}
                        className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        rows={2}
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        Créer
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
