import React, { useState } from 'react';
import { FileText, Download, Printer } from 'lucide-react';
import Papa from 'papaparse';

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  const generateReport = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCsvExport = () => {
    const data = [
      { Categorie: 'Revenus', Montant: '50000' },
      { Categorie: 'Depenses', Montant: '20000' }
    ];
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'rapport_ferme.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 print:space-y-2 print:m-0 print:p-0">
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-2xl font-bold text-gray-800">Rapports</h1>
        <div className="space-x-3">
          <button onClick={handlePrint} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center">
            <Printer size={16} className="mr-2" /> Imprimer
          </button>
          <button onClick={handleCsvExport} className="bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center border border-green-200">
            <Download size={16} className="mr-2" /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 print:hidden">
        <h2 className="text-lg font-semibold mb-4">Filtres</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
            <input type="date" className="w-full border-gray-300 rounded-lg shadow-sm focus:border-green-500 focus:ring-green-500" value={dateDebut} onChange={e => setDateDebut(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
            <input type="date" className="w-full border-gray-300 rounded-lg shadow-sm focus:border-green-500 focus:ring-green-500" value={dateFin} onChange={e => setDateFin(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <button onClick={generateReport} className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium inline-flex justify-center items-center h-10">
              <FileText size={18} className="mr-2" /> Générer le Rapport
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:border-none print:shadow-none">
        <div className="p-4 bg-gray-50 border-b border-gray-200 print:bg-white print:border-black">
          <h3 className="font-semibold text-gray-800">Section Finances (Aperçu)</h3>
        </div>
        <div className="p-6">
          {loading ? (
             <div className="text-center py-10 text-gray-500">Génération du rapport...</div>
          ) : (
            <div className="prose max-w-none">
              <p>Rapport généré pour la période sélectionnée. Les données s'afficheront ici.</p>
              <table className="min-w-full divide-y divide-gray-200 mt-4">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase">Indicateur</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase">Valeur</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 text-sm font-medium">Revenus Totaux</td>
                    <td className="py-2 text-sm text-green-600 font-bold">50,000 DH</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-sm font-medium">Dépenses Totales</td>
                    <td className="py-2 text-sm text-red-600 font-bold">20,000 DH</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-sm font-medium">Résultat Net</td>
                    <td className="py-2 text-sm text-blue-600 font-bold">30,000 DH</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
