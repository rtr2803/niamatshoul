import React, { useState } from 'react';
import { Bell, AlertTriangle, Info, CheckCircle, Settings } from 'lucide-react';
import { useAuthStore } from '@/stores';

export default function AlertsPage() {
  const { isOwner } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'alerts' | 'config'>('alerts');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold text-gray-800">Alertes</h1>
          <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">3 non lues</span>
        </div>
        {activeTab === 'alerts' && (
          <button className="text-sm text-green-600 font-medium hover:text-green-700">
            Tout marquer lu
          </button>
        )}
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('alerts')}
              className={`py-4 px-6 font-medium text-sm border-b-2 inline-flex items-center ${
                activeTab === 'alerts' 
                  ? 'border-green-500 text-green-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Bell size={18} className="mr-2" /> Alertes
            </button>
            {isOwner && (
              <button
                onClick={() => setActiveTab('config')}
                className={`py-4 px-6 font-medium text-sm border-b-2 inline-flex items-center ${
                  activeTab === 'config' 
                    ? 'border-green-500 text-green-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings size={18} className="mr-2" /> Configuration
              </button>
            )}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'alerts' ? (
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start space-x-4">
                <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-900">Mortalité élevée - Lot A</h4>
                  <p className="text-sm text-gray-600 mt-1">Le taux de mortalité a dépassé 2% aujourd'hui.</p>
                  <p className="text-xs text-gray-400 mt-2">Il y a 2 heures</p>
                </div>
                <button className="text-xs font-medium text-gray-500 hover:text-gray-700">Marquer lu</button>
              </div>
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex items-start space-x-4">
                <Info className="text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-900">Stock Aliment Bas</h4>
                  <p className="text-sm text-gray-600 mt-1">Le stock de Démarrage est en dessous de 500kg.</p>
                  <p className="text-xs text-gray-400 mt-2">Il y a 5 heures</p>
                </div>
                <button className="text-xs font-medium text-gray-500 hover:text-gray-700">Marquer lu</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Règles d'alerte</h3>
              <div className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h4 className="font-medium text-gray-900">Alerte Mortalité</h4>
                  <p className="text-sm text-gray-500">M'avertir si le taux de mortalité quotidien dépasse 2%</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
