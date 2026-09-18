import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores';
import { formatDate } from '@/lib/utils';
import { 
  ArrowLeft,
  Activity,
  Calendar,
  Info,
  MapPin,
  TrendingDown,
  AlertCircle
} from 'lucide-react';

export default function AnimalLotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isOwner } = useAuthStore();
  const [lot, setLot] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchLotDetails();
    }
  }, [id]);

  const fetchLotDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: lotData, error: lotError } = await supabase
        .from('animal_lots')
        .select(`
          *,
          animal_type:animal_types(name),
          breed:animal_breeds(name),
          poultry_house:poultry_houses(name)
        `)
        .eq('id', id)
        .single();

      if (lotError) throw lotError;
      setLot(lotData);

      const { data: eventsData, error: eventsError } = await supabase
        .from('animal_lot_events')
        .select('*')
        .eq('lot_id', id)
        .order('event_date', { ascending: false });

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des détails du lot.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !lot) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erreur</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error || 'Lot introuvable'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Actif</span>;
      case 'SOLD':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Vendu</span>;
      case 'QUARANTINE':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Quarantaine</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'MORTALITY':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">Mortalité</span>;
      case 'TRANSFER':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">Transfert</span>;
      case 'SALE':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">Vente</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">{type}</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/animals" className="text-gray-400 hover:text-gray-500">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{lot.lot_number}</h1>
          {getStatusBadge(lot.status)}
        </div>
        
        {isOwner && (
          <div className="flex space-x-3">
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700">
              <TrendingDown className="h-4 w-4 mr-2" />
              Mortalité
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Transférer
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Info className="h-5 w-5 mr-2 text-gray-400" />
            Informations Générales
          </h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{lot.animal_type?.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Race</dt>
              <dd className="mt-1 text-sm text-gray-900">{lot.breed?.name || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Sexe</dt>
              <dd className="mt-1 text-sm text-gray-900">{lot.sex}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Origine</dt>
              <dd className="mt-1 text-sm text-gray-900">{lot.origin || '-'}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-gray-400" />
            Statut & Effectif
          </h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Poulailler Actuel</dt>
              <dd className="mt-1 text-sm text-gray-900 font-semibold">{lot.poultry_house?.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Quantité Actuelle</dt>
              <dd className="mt-1 text-lg font-bold text-indigo-600">{lot.current_quantity}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Quantité Initiale</dt>
              <dd className="mt-1 text-sm text-gray-900">{lot.initial_quantity}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Taux de survie</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {((lot.current_quantity / lot.initial_quantity) * 100).toFixed(1)}%
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Historique des Événements</h3>
        </div>
        
        {events.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Aucun événement enregistré pour ce lot.
          </div>
        ) : (
          <ul role="list" className="divide-y divide-gray-200">
            {events.map((event) => (
              <li key={event.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getEventBadge(event.event_type)}
                    <p className="ml-3 text-sm font-medium text-gray-900">
                      {new Date(event.event_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="ml-2 flex-shrink-0 flex">
                    <p className={`px-2 inline-flex text-sm leading-5 font-semibold rounded-full ${
                      event.quantity_change < 0 ? 'text-red-800' : 'text-green-800'
                    }`}>
                      {event.quantity_change > 0 ? '+' : ''}{event.quantity_change}
                    </p>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      {event.notes || 'Aucune note'}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
