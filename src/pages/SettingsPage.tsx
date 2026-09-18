import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores';
import { 
  Settings, Users, Bell, Info, Shield, Database, Download, 
  Save, Plus, Edit2, Check, AlertCircle, Thermometer, X
} from 'lucide-react';

export default function SettingsPage() {
  const { isOwner, user } = useAuthStore();

  // Farm Settings State
  const [farmData, setFarmData] = useState({
    id: '',
    name: 'Ferme Avicole',
    area_hectares: 3,
    currency: 'MAD',
    address: '',
    notes: ''
  });
  const [loadingFarm, setLoadingFarm] = useState(true);
  const [savingFarm, setSavingFarm] = useState(false);
  const [farmSuccessMsg, setFarmSuccessMsg] = useState('');
  const [farmErrorMsg, setFarmErrorMsg] = useState('');

  // Incubators Management State
  const [incubators, setIncubators] = useState<any[]>([]);
  const [loadingIncubators, setLoadingIncubators] = useState(true);
  const [isIncubatorModalOpen, setIsIncubatorModalOpen] = useState(false);
  const [editingIncubator, setEditingIncubator] = useState<any>(null);
  const [incubatorForm, setIncubatorForm] = useState({
    name: '',
    capacity: 500,
    status: 'active',
    notes: ''
  });
  const [savingIncubator, setSavingIncubator] = useState(false);

  // Users & Partners State
  const [profiles, setProfiles] = useState<any[]>([]);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [invitingPartner, setInvitingPartner] = useState(false);
  const [partnerMsg, setPartnerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Push notifications state
  const [pushStatus, setPushStatus] = useState<string>('default');

  useEffect(() => {
    fetchFarm();
    fetchIncubators();
    fetchProfiles();
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    }
  }, []);

  const fetchFarm = async () => {
    try {
      setLoadingFarm(true);
      const { data, error } = await supabase.from('farm').select('*').limit(1).single();
      if (data) {
        setFarmData({
          id: data.id,
          name: data.name || 'Ferme Avicole',
          area_hectares: data.area_hectares || 3,
          currency: data.currency || 'MAD',
          address: data.address || '',
          notes: data.notes || ''
        });
      }
    } catch (err) {
      console.error('Error loading farm settings:', err);
    } finally {
      setLoadingFarm(false);
    }
  };

  const handleSaveFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    try {
      setSavingFarm(true);
      setFarmSuccessMsg('');
      setFarmErrorMsg('');

      const payload = {
        name: farmData.name.trim(),
        area_hectares: Number(farmData.area_hectares) || 3,
        currency: farmData.currency.trim() || 'MAD',
        address: farmData.address.trim(),
        notes: farmData.notes.trim(),
        updated_at: new Date().toISOString()
      };

      let resError;
      if (farmData.id) {
        const { error } = await supabase.from('farm').update(payload).eq('id', farmData.id);
        resError = error;
      } else {
        const { error } = await supabase.from('farm').insert([payload]);
        resError = error;
      }

      if (resError) throw resError;

      setFarmSuccessMsg('Paramètres de la ferme enregistrés avec succès !');
      setTimeout(() => setFarmSuccessMsg(''), 4000);
      await fetchFarm();
    } catch (err: any) {
      setFarmErrorMsg('Erreur lors de la sauvegarde : ' + (err.message || 'Erreur inconnue'));
    } finally {
      setSavingFarm(false);
    }
  };

  const fetchIncubators = async () => {
    try {
      setLoadingIncubators(true);
      const { data, error } = await supabase.from('incubators').select('*').order('name');
      if (data) setIncubators(data);
    } catch (err) {
      console.error('Error fetching incubators:', err);
    } finally {
      setLoadingIncubators(false);
    }
  };

  const openNewIncubatorModal = () => {
    setEditingIncubator(null);
    setIncubatorForm({
      name: `Incubateur ${incubators.length + 1}`,
      capacity: 500,
      status: 'active',
      notes: ''
    });
    setIsIncubatorModalOpen(true);
  };

  const openEditIncubatorModal = (inc: any) => {
    setEditingIncubator(inc);
    setIncubatorForm({
      name: inc.name,
      capacity: inc.capacity || 500,
      status: inc.status || 'active',
      notes: inc.notes || ''
    });
    setIsIncubatorModalOpen(true);
  };

  const handleSaveIncubator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incubatorForm.name.trim() || !incubatorForm.capacity) return;
    try {
      setSavingIncubator(true);
      const payload = {
        name: incubatorForm.name.trim(),
        capacity: parseInt(String(incubatorForm.capacity)) || 500,
        status: incubatorForm.status,
        notes: incubatorForm.notes.trim() || null,
        is_active: incubatorForm.status !== 'inactive',
        updated_at: new Date().toISOString()
      };

      if (editingIncubator) {
        const { error } = await supabase.from('incubators').update(payload).eq('id', editingIncubator.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('incubators').insert([payload]);
        if (error) throw error;
      }

      setIsIncubatorModalOpen(false);
      setEditingIncubator(null);
      await fetchIncubators();
    } catch (err: any) {
      alert('Erreur lors de l\'enregistrement de l\'incubateur : ' + (err.message || 'Erreur inconnue'));
    } finally {
      setSavingIncubator(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data } = await supabase.from('profiles').select('*').order('created_at');
      if (data) setProfiles(data);
    } catch (err) {
      console.error('Error loading profiles:', err);
    }
  };

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerEmail.trim()) return;
    try {
      setInvitingPartner(true);
      setPartnerMsg(null);

      // Add partner to profiles
      const { error } = await supabase.from('profiles').insert([{
        email: partnerEmail.trim().toLowerCase(),
        full_name: partnerName.trim() || 'Partenaire',
        role: 'PARTNER'
      }]);

      if (error) {
        if (error.code === '23505') {
          throw new Error('Un compte ou invitation existe déjà avec cet email.');
        }
        throw error;
      }

      setPartnerMsg({ type: 'success', text: `Partenaire ${partnerEmail} ajouté avec succès !` });
      setPartnerEmail('');
      setPartnerName('');
      await fetchProfiles();
    } catch (err: any) {
      setPartnerMsg({ type: 'error', text: err.message || 'Erreur lors de l\'ajout du partenaire' });
    } finally {
      setInvitingPartner(false);
    }
  };

  const handleRequestPush = async () => {
    if (!('Notification' in window)) {
      alert('Ce navigateur ne supporte pas les notifications push.');
      return;
    }
    const perm = await Notification.requestPermission();
    setPushStatus(perm);
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Paramètres & Configuration</h1>
        <p className="text-sm text-gray-500">Gérez les informations de l'exploitation, le parc d'incubateurs et les partenaires.</p>
      </div>

      <div className="grid gap-6">
        {/* Farm Settings Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <Info className="text-green-600 w-5 h-5" />
            <h2 className="text-lg font-semibold text-gray-800">Informations de la Ferme</h2>
          </div>

          {farmSuccessMsg && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center text-sm">
              <Check className="w-4 h-4 mr-2 text-green-600 flex-shrink-0" />
              {farmSuccessMsg}
            </div>
          )}

          {farmErrorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center text-sm">
              <AlertCircle className="w-4 h-4 mr-2 text-red-600 flex-shrink-0" />
              {farmErrorMsg}
            </div>
          )}

          {loadingFarm ? (
            <div className="py-6 text-center text-gray-400">Chargement des informations...</div>
          ) : (
            <form onSubmit={handleSaveFarm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la ferme / Exploitation</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-green-500 focus:border-green-500 text-sm disabled:bg-gray-100" 
                    value={farmData.name}
                    onChange={e => setFarmData({ ...farmData, name: e.target.value })}
                    disabled={!isOwner} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Superficie totale (Hectares)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    min="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-green-500 focus:border-green-500 text-sm disabled:bg-gray-100" 
                    value={farmData.area_hectares}
                    onChange={e => setFarmData({ ...farmData, area_hectares: parseFloat(e.target.value) || 0 })}
                    disabled={!isOwner} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse / Localisation</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Niamat Shoul, Maroc"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-green-500 focus:border-green-500 text-sm disabled:bg-gray-100" 
                    value={farmData.address}
                    onChange={e => setFarmData({ ...farmData, address: e.target.value })}
                    disabled={!isOwner} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Devise monétaire</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-green-500 focus:border-green-500 text-sm disabled:bg-gray-100" 
                    value={farmData.currency}
                    onChange={e => setFarmData({ ...farmData, currency: e.target.value })}
                    disabled={!isOwner} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes ou description</label>
                <textarea 
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-green-500 focus:border-green-500 text-sm disabled:bg-gray-100" 
                  value={farmData.notes}
                  onChange={e => setFarmData({ ...farmData, notes: e.target.value })}
                  disabled={!isOwner} 
                />
              </div>

              {isOwner && (
                <div className="flex justify-end pt-2">
                  <button 
                    type="submit"
                    disabled={savingFarm}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-medium text-sm transition shadow-sm disabled:opacity-50"
                  >
                    <Save size={16} />
                    {savingFarm ? 'Enregistrement...' : 'Enregistrer les modifications'}
                  </button>
                </div>
              )}
            </form>
          )}
        </section>

        {/* Incubators Management Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex items-center space-x-3">
              <Thermometer className="text-orange-500 w-5 h-5" />
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Parc des Incubateurs</h2>
                <p className="text-xs text-gray-500">Consultez, ajoutez et modifiez la capacité de vos incubateurs</p>
              </div>
            </div>
            {isOwner && (
              <button
                type="button"
                onClick={openNewIncubatorModal}
                className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white px-3.5 py-1.5 rounded-lg text-sm font-medium transition shadow-sm"
              >
                <Plus size={16} />
                + Nouvel Incubateur
              </button>
            )}
          </div>

          {loadingIncubators ? (
            <div className="py-6 text-center text-gray-400">Chargement des incubateurs...</div>
          ) : incubators.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-lg text-gray-400 text-sm">
              Aucun incubateur configuré. Cliquez sur « + Nouvel Incubateur » pour en ajouter un.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {incubators.map((inc) => (
                <div key={inc.id} className="p-4 border border-gray-200 rounded-xl bg-gray-50 hover:bg-white transition flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{inc.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Capacité : <span className="font-bold text-gray-800">{inc.capacity || 0}</span> œufs
                    </p>
                    <span className={`mt-1.5 inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
                      inc.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {inc.status === 'active' ? 'Actif' : inc.status === 'maintenance' ? 'Maintenance' : 'Inactif'}
                    </span>
                  </div>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => openEditIncubatorModal(inc)}
                      className="flex items-center gap-1 text-xs bg-white border border-gray-300 hover:border-gray-400 text-gray-700 px-3 py-1.5 rounded-lg shadow-sm font-medium transition"
                    >
                      <Edit2 size={13} />
                      Modifier
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Users & Partners Section */}
        {isOwner && (
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <Users className="text-purple-600 w-5 h-5" />
              <h2 className="text-lg font-semibold text-gray-800">Gestion des Utilisateurs & Partenaires</h2>
            </div>

            {partnerMsg && (
              <div className={`mb-4 p-3 rounded-lg flex items-center text-sm ${
                partnerMsg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {partnerMsg.type === 'success' ? <Check className="w-4 h-4 mr-2" /> : <AlertCircle className="w-4 h-4 mr-2" />}
                {partnerMsg.text}
              </div>
            )}

            <div className="space-y-4">
              <div className="divide-y divide-gray-100 border rounded-lg overflow-hidden bg-gray-50">
                {profiles.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{p.full_name || 'Utilisateur'}</p>
                      <p className="text-xs text-gray-500">{p.email}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded ${
                      p.role === 'OWNER' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {p.role === 'OWNER' ? 'Propriétaire' : 'Partenaire (Lecture seule)'}
                    </span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddPartner} className="pt-4 border-t border-gray-200 space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Ajouter un partenaire manuel</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input 
                    type="text" 
                    placeholder="Nom du partenaire (optionnel)" 
                    value={partnerName}
                    onChange={e => setPartnerName(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-sm" 
                  />
                  <input 
                    type="email" 
                    required
                    placeholder="Email du partenaire" 
                    value={partnerEmail}
                    onChange={e => setPartnerEmail(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-sm" 
                  />
                </div>
                <div className="flex justify-end">
                  <button 
                    type="submit"
                    disabled={invitingPartner || !partnerEmail.trim()}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium text-sm transition disabled:opacity-50"
                  >
                    {invitingPartner ? 'Ajout...' : 'Ajouter le partenaire'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* Notifications Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <Bell className="text-yellow-600 w-5 h-5" />
            <h2 className="text-lg font-semibold text-gray-800">Notifications & Alertes</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800 text-sm">Recevoir des alertes navigateur</p>
              <p className="text-xs text-gray-500 mt-0.5">Alertes critiques de mortalité (&gt; 2%) et rupture d'aliments</p>
            </div>
            <button 
              type="button"
              onClick={handleRequestPush}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium border transition ${
                pushStatus === 'granted' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
              }`}
            >
              {pushStatus === 'granted' ? 'Activées ✓' : 'Activer'}
            </button>
          </div>
        </section>

        {/* System & PWA Info */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <Download className="text-blue-600 w-5 h-5" />
            <h2 className="text-lg font-semibold text-gray-800">Installation Mobile (PWA)</h2>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Android :</strong> Ouvrir dans Chrome → Menu (3 points) → <em>Ajouter à l'écran d'accueil</em></p>
            <p><strong>iPhone / iPad :</strong> Ouvrir dans Safari → Bouton Partager → <em>Sur l'écran d'accueil</em></p>
          </div>
        </section>
      </div>

      {/* Incubator Create / Edit Modal */}
      {isIncubatorModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {editingIncubator ? 'Modifier l\'Incubateur' : 'Nouvel Incubateur'}
              </h2>
              <button 
                onClick={() => setIsIncubatorModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveIncubator} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom / Identifiant</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Incubateur 1"
                  value={incubatorForm.name}
                  onChange={(e) => setIncubatorForm({ ...incubatorForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacité maximale (en œufs)</label>
                <input
                  type="number"
                  required
                  min="10"
                  step="1"
                  placeholder="Ex: 500"
                  value={incubatorForm.capacity}
                  onChange={(e) => setIncubatorForm({ ...incubatorForm, capacity: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select
                  value={incubatorForm.status}
                  onChange={(e) => setIncubatorForm({ ...incubatorForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 text-sm"
                >
                  <option value="active">Actif</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactif</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Emplacement (optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: Salle d'incubation A"
                  value={incubatorForm.notes}
                  onChange={(e) => setIncubatorForm({ ...incubatorForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsIncubatorModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingIncubator}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm font-medium"
                >
                  {savingIncubator ? 'Enregistrement...' : editingIncubator ? 'Sauvegarder les modifications' : 'Créer l\'incubateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
