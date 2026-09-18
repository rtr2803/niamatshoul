import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores';
import { formatDate } from '@/lib/utils';
import { 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  AlertCircle,
  MoreVertical,
  Edit2,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AnimalsPage() {
  const { isOwner } = useAuthStore();
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    lot_number: `LOT-${Date.now().toString().slice(-6)}`,
    animal_type_id: '',
    breed_id: '',
    sex: 'mixed', // strictly lowercase for PostgreSQL constraint
    birth_date: '',
    origin: 'Élevage propre',
    initial_quantity: 100,
    poultry_house_id: '',
    acquisition_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Inline custom breed state
  const [showNewBreedInput, setShowNewBreedInput] = useState(false);
  const [newBreedName, setNewBreedName] = useState('');
  const [isCreatingBreed, setIsCreatingBreed] = useState(false);

  // Inline quick house creation state
  const [showQuickHouse, setShowQuickHouse] = useState(false);
  const [quickHouseName, setQuickHouseName] = useState('');
  const [quickHouseCapacity, setQuickHouseCapacity] = useState(250);
  const [isCreatingHouse, setIsCreatingHouse] = useState(false);

  const [animalTypes, setAnimalTypes] = useState<any[]>([]);
  const [breeds, setBreeds] = useState<any[]>([]);
  const [houses, setHouses] = useState<any[]>([]);

  useEffect(() => {
    fetchLots();
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [typesRes, breedsRes, housesRes] = await Promise.all([
        supabase.from('animal_types').select('*').order('name'),
        supabase.from('animal_breeds').select('*').order('name'),
        supabase.from('poultry_houses').select('*').order('name')
      ]);

      if (typesRes.data && typesRes.data.length > 0) {
        setAnimalTypes(typesRes.data);
        setFormData(prev => ({
          ...prev,
          animal_type_id: prev.animal_type_id || typesRes.data[0].id
        }));
      }

      if (breedsRes.data) {
        setBreeds(breedsRes.data);
      }

      if (housesRes.data && housesRes.data.length > 0) {
        setHouses(housesRes.data);
        setFormData(prev => ({
          ...prev,
          poultry_house_id: prev.poultry_house_id || housesRes.data[0].id
        }));
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  };

  const fetchLots = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('animal_lots')
        .select(`
          *,
          animal_type:animal_types(name),
          breed:animal_breeds(name),
          poultry_house:poultry_houses(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLots(data || []);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors du chargement des lots.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewBreed = async () => {
    if (!newBreedName.trim()) return;
    try {
      setIsCreatingBreed(true);
      const targetTypeId = formData.animal_type_id || (animalTypes[0]?.id ?? 'c0000000-0000-0000-0000-000000000001');
      const { data, error } = await supabase
        .from('animal_breeds')
        .insert([{
          name: newBreedName.trim(),
          animal_type_id: targetTypeId,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      setBreeds(prev => [...prev, data]);
      setFormData(prev => ({
        ...prev,
        animal_type_id: targetTypeId,
        breed_id: data.id
      }));
      setNewBreedName('');
      setShowNewBreedInput(false);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'ajout de la race.');
    } finally {
      setIsCreatingBreed(false);
    }
  };

  const handleQuickCreateHouse = async () => {
    if (!quickHouseName.trim()) return;
    try {
      setIsCreatingHouse(true);
      const code = `P${houses.length + 1}`;
      const { data, error } = await supabase
        .from('poultry_houses')
        .insert([{
          name: quickHouseName.trim(),
          code,
          capacity: Number(quickHouseCapacity) || 250,
          house_type: 'standard',
          status: 'active',
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      setHouses(prev => [...prev, data]);
      setFormData(prev => ({ ...prev, poultry_house_id: data.id }));
      setQuickHouseName('');
      setShowQuickHouse(false);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du poulailler.');
    } finally {
      setIsCreatingHouse(false);
    }
  };

  const handleCreateLot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);

      // Auto-create custom breed if typed
      let finalBreedId = formData.breed_id || null;
      if (showNewBreedInput && newBreedName.trim()) {
        const targetTypeId = formData.animal_type_id || animalTypes[0]?.id;
        const { data: createdBreed, error: bErr } = await supabase
          .from('animal_breeds')
          .insert([{
            name: newBreedName.trim(),
            animal_type_id: targetTypeId,
            is_active: true
          }])
          .select()
          .single();

        if (!bErr && createdBreed) {
          finalBreedId = createdBreed.id;
          setBreeds(prev => [...prev, createdBreed]);
        }
      }

      const initialQty = Number(formData.initial_quantity) || 1;
      const targetTypeId = formData.animal_type_id || (animalTypes[0]?.id ?? null);
      const targetHouseId = formData.poultry_house_id || (houses[0]?.id ?? null);

      const { data: newLot, error } = await supabase
        .from('animal_lots')
        .insert([{
          lot_number: formData.lot_number,
          animal_type_id: targetTypeId,
          breed_id: finalBreedId,
          sex: formData.sex.toLowerCase(), // strictly lowercase ('male', 'female', 'mixed', 'unknown')
          birth_date: formData.birth_date || null,
          origin: formData.origin || 'Achat',
          initial_quantity: initialQty,
          current_quantity: initialQty,
          poultry_house_id: targetHouseId,
          acquisition_date: formData.acquisition_date,
          status: 'active', // strictly lowercase ('active', 'sold', 'transferred', 'deceased', 'archived')
          notes: formData.notes || null
        }])
        .select()
        .single();

      if (error) throw error;

      // Add INITIAL_STOCK ledger event
      if (newLot) {
        await supabase.from('animal_lot_events').insert([{
          lot_id: newLot.id,
          event_type: 'INITIAL_STOCK',
          quantity: initialQty,
          date: formData.acquisition_date,
          poultry_house_id: targetHouseId,
          notes: 'Entrée initiale du lot'
        }]);
      }

      setIsModalOpen(false);
      setShowNewBreedInput(false);
      setShowQuickHouse(false);
      fetchLots();

      // Reset form with new lot number
      setFormData({
        ...formData,
        lot_number: `LOT-${Date.now().toString().slice(-6)}`,
        initial_quantity: 100,
        notes: ''
      });
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du lot.');
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'active':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Actif</span>;
      case 'sold':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Vendu</span>;
      case 'quarantine':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Quarantaine</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const filteredLots = lots.filter(lot => {
    const statusMatch = filterStatus === 'ALL' || (lot.status || '').toLowerCase() === filterStatus.toLowerCase();
    const typeMatch = filterType === 'ALL' || lot.animal_type_id === filterType;
    const searchMatch = !searchQuery.trim() || 
      (lot.lot_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lot.breed?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lot.poultry_house?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && typeMatch && searchMatch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Animaux</h1>
          <p className="mt-2 text-sm text-gray-700">
            Liste de tous les lots d'animaux présents ou passés dans la ferme.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Lot
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative rounded-md shadow-sm flex-1 max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border"
            placeholder="Rechercher un lot..."
          />
        </div>
        <div className="flex gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm border"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="sold">Vendu</option>
            <option value="quarantine">Quarantaine</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm border"
          >
            <option value="ALL">Tous les types</option>
            {animalTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erreur</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredLots.length === 0 ? (
        <div className="text-center bg-white rounded-lg shadow p-12 border border-gray-200">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun lot d'animaux</h3>
          <p className="mt-1 text-sm text-gray-500">
            Commencez par créer un nouveau lot pour suivre votre élevage.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Lot
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
          <ul role="list" className="divide-y divide-gray-200">
            {filteredLots.map((lot) => (
              <li key={lot.id}>
                <Link to={`/animals/${lot.id}`} className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {lot.lot_number}
                        </p>
                        {getStatusBadge(lot.status)}
                      </div>
                      <div className="ml-2 flex-shrink-0 flex">
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex sm:gap-6">
                        <p className="flex items-center text-sm text-gray-500">
                          {lot.animal_type?.name || 'Volailles'} {lot.breed ? `- ${lot.breed.name}` : ''}
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          Poulailler: {lot.poultry_house?.name || '-'}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <p>
                          Qté: <span className="font-medium text-gray-900">{lot.current_quantity}</span> / {lot.initial_quantity}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-xl sm:p-6">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Nouveau Lot d'Animaux</h3>
                  <form onSubmit={handleCreateLot} className="space-y-4">
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Numéro de lot</label>
                      <input
                        type="text"
                        required
                        value={formData.lot_number}
                        onChange={e => setFormData({...formData, lot_number: e.target.value})}
                        className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Type d'animal</label>
                        <select
                          required
                          value={formData.animal_type_id}
                          onChange={e => setFormData({...formData, animal_type_id: e.target.value})}
                          className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="">Sélectionner...</option>
                          {animalTypes.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-sm font-medium text-gray-700">Race</label>
                          <button
                            type="button"
                            onClick={() => setShowNewBreedInput(!showNewBreedInput)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                          >
                            {showNewBreedInput ? 'Annuler' : '+ Autre race'}
                          </button>
                        </div>
                        
                        {!showNewBreedInput ? (
                          <select
                            value={formData.breed_id}
                            onChange={e => {
                              if (e.target.value === '__add_new__') {
                                setShowNewBreedInput(true);
                              } else {
                                setFormData({...formData, breed_id: e.target.value});
                              }
                            }}
                            className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                          >
                            <option value="">Sélectionner une race...</option>
                            {breeds.map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                            <option value="__add_new__">+ Ajouter une race personnalisée...</option>
                          </select>
                        ) : (
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              placeholder="Nom (ex: Beldi Mix, Brahma...)"
                              value={newBreedName}
                              onChange={e => setNewBreedName(e.target.value)}
                              className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            />
                            <button
                              type="button"
                              onClick={handleAddNewBreed}
                              disabled={isCreatingBreed || !newBreedName.trim()}
                              className="px-3 py-2 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {isCreatingBreed ? '...' : 'Ajouter'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Sexe</label>
                        <select
                          required
                          value={formData.sex}
                          onChange={e => setFormData({...formData, sex: e.target.value})}
                          className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="mixed">Mixte</option>
                          <option value="female">Femelle</option>
                          <option value="male">Mâle</option>
                          <option value="unknown">Inconnu</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Quantité initiale</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={formData.initial_quantity}
                          onChange={e => setFormData({...formData, initial_quantity: parseInt(e.target.value) || 0})}
                          className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">Poulailler</label>
                        <button
                          type="button"
                          onClick={() => setShowQuickHouse(!showQuickHouse)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          {showQuickHouse ? 'Annuler' : '+ Nouveau poulailler'}
                        </button>
                      </div>

                      {!showQuickHouse ? (
                        <select
                          required
                          value={formData.poultry_house_id}
                          onChange={e => {
                            if (e.target.value === '__add_new__') {
                              setShowQuickHouse(true);
                            } else {
                              setFormData({...formData, poultry_house_id: e.target.value});
                            }
                          }}
                          className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="">Sélectionner un poulailler...</option>
                          {houses.map(h => (
                            <option key={h.id} value={h.id}>{h.name} (Cap: {h.capacity})</option>
                          ))}
                          <option value="__add_new__">+ Créer un nouveau bâtiment...</option>
                        </select>
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-md border border-gray-200 space-y-2">
                          <p className="text-xs text-gray-600 font-medium">Ajouter un nouveau poulailler rapide :</p>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Nom (ex: Poulailler 5)"
                              value={quickHouseName}
                              onChange={e => setQuickHouseName(e.target.value)}
                              className="block w-full rounded-md border border-gray-300 py-1.5 px-2 text-sm"
                            />
                            <input
                              type="number"
                              placeholder="Capacité (ex: 250)"
                              value={quickHouseCapacity}
                              onChange={e => setQuickHouseCapacity(parseInt(e.target.value) || 250)}
                              className="block w-full rounded-md border border-gray-300 py-1.5 px-2 text-sm"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleQuickCreateHouse}
                            disabled={isCreatingHouse || !quickHouseName.trim()}
                            className="w-full py-1.5 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {isCreatingHouse ? 'Création...' : 'Créer et sélectionner ce poulailler'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Date de naissance</label>
                        <input
                          type="date"
                          value={formData.birth_date}
                          onChange={e => setFormData({...formData, birth_date: e.target.value})}
                          className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Date d'acquisition</label>
                        <input
                          type="date"
                          required
                          value={formData.acquisition_date}
                          onChange={e => setFormData({...formData, acquisition_date: e.target.value})}
                          className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Origine / Fournisseur</label>
                      <input
                        type="text"
                        value={formData.origin}
                        onChange={e => setFormData({...formData, origin: e.target.value})}
                        className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Notes</label>
                      <textarea
                        rows={2}
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        Créer le lot
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
