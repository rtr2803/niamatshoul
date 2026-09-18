import React from 'react';
import { useAuthStore } from '@/stores';
import { Settings, Users, Bell, Info, Shield, Database, Download } from 'lucide-react';

export default function SettingsPage() {
  const { isOwner, user } = useAuthStore();

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-800">Paramètres</h1>

      <div className="grid gap-6">
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <Info className="text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-800">Informations de la Ferme</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nom de la ferme</label>
              <input type="text" className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500" defaultValue="Ferme Royale" disabled={!isOwner} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Adresse</label>
              <input type="text" className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500" defaultValue="Marrakech, Maroc" disabled={!isOwner} />
            </div>
          </div>
        </section>

        {isOwner && (
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <Users className="text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-800">Gestion des Utilisateurs</h2>
            </div>
            <div className="space-y-4">
               <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                 <div>
                   <p className="font-medium text-sm">{user?.email}</p>
                 </div>
                 <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded">Propriétaire</span>
               </div>
               <div className="pt-4 border-t border-gray-200">
                 <h4 className="text-sm font-medium text-gray-700 mb-2">Inviter un partenaire</h4>
                 <div className="flex space-x-2">
                   <input type="email" placeholder="Email du partenaire" className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500" />
                   <button className="bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-700">Envoyer l'invitation</button>
                 </div>
               </div>
            </div>
          </section>
        )}

        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <Bell className="text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-800">Notifications Push</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800 text-sm">Recevoir des notifications push</p>
              <p className="text-xs text-gray-500 mt-1">Alertes critiques sur vos appareils</p>
            </div>
            <button className="bg-gray-100 text-gray-800 border border-gray-300 px-3 py-1.5 rounded-md text-sm font-medium">Activer</button>
          </div>
        </section>

        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <Settings className="text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-800">Application</h2>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Version:</strong> 1.0.0</p>
            <p><strong>Statut:</strong> Synchronisé</p>
          </div>
        </section>
        
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <Download className="text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-800">Installer l'Application</h2>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Android:</strong> Ouvrir dans Chrome → Menu → Ajouter à l'écran d'accueil</p>
            <p><strong>iOS:</strong> Ouvrir dans Safari → Partager → Sur l'écran d'accueil</p>
          </div>
        </section>

      </div>
    </div>
  );
}
