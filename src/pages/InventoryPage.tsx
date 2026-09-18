import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';
import { 
  Plus, Package, ArrowRightLeft, Search, Filter, AlertCircle, TrendingUp, TrendingDown
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  category_id: string;
  unit: string;
  package_size: number;
  package_unit: string;
  current_stock: number;
  reorder_level: number;
  purchase_price: number;
  category: Category | null;
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'TRANSACTIONS'>('PRODUCTS');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  // New product form
  const [newProduct, setNewProduct] = useState({
    name: '',
    category_id: '',
    unit: 'kg',
    package_size: 50,
    package_unit: 'sac',
    purchase_price: 4.0,
    initial_stock_kg: 500,
    reorder_level: 100,
    description: ''
  });

  // New transaction form
  const [newTx, setNewTx] = useState({
    product_id: '',
    transaction_type: 'PURCHASE',
    quantity_type: 'bags', // 'bags' or 'kg'
    bags_count: 10,
    kg_quantity: 500,
    unit_price: 4.0,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, cRes, tRes] = await Promise.all([
        supabase.from('inventory_products').select('*, category:inventory_categories(name)').order('name'),
        supabase.from('inventory_categories').select('*').order('name'),
        supabase.from('inventory_transactions').select('*, product:inventory_products(name, unit)').order('date', { ascending: false }).limit(100)
      ]);

      if (pRes.error) throw pRes.error;
      setProducts(pRes.data || []);
      if (cRes.data) {
        setCategories(cRes.data);
        if (!newProduct.category_id && cRes.data.length > 0) {
          const feedCat = cRes.data.find(c => c.name.toLowerCase().includes('aliment')) || cRes.data[0];
          setNewProduct(prev => ({ ...prev, category_id: feedCat.id }));
        }
      }
      if (tRes.data) setTransactions(tRes.data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const targetCatId = newProduct.category_id || categories[0]?.id;
      const initialStock = Number(newProduct.initial_stock_kg) || 0;

      const { data: prod, error: pErr } = await supabase
        .from('inventory_products')
        .insert([{
          name: newProduct.name.trim(),
          category_id: targetCatId,
          unit: newProduct.unit || 'kg',
          package_size: Number(newProduct.package_size) || 50,
          package_unit: newProduct.package_unit || 'sac',
          purchase_price: Number(newProduct.purchase_price) || 0,
          current_stock: initialStock,
          reorder_level: Number(newProduct.reorder_level) || 50,
          description: newProduct.description || null,
          is_active: true
        }])
        .select()
        .single();

      if (pErr) throw pErr;

      // Also create an initial stock transaction
      if (prod && initialStock > 0) {
        await supabase.from('inventory_transactions').insert([{
          product_id: prod.id,
          transaction_type: 'PURCHASE',
          quantity: initialStock,
          unit_price: Number(newProduct.purchase_price) || 0,
          total_price: initialStock * (Number(newProduct.purchase_price) || 0),
          date: new Date().toISOString().split('T')[0],
          notes: 'Stock initial à la création du produit'
        }]);
      }

      setShowProductModal(false);
      setNewProduct({
        name: '',
        category_id: categories[0]?.id || '',
        unit: 'kg',
        package_size: 50,
        package_unit: 'sac',
        purchase_price: 4.0,
        initial_stock_kg: 500,
        reorder_level: 100,
        description: ''
      });
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du produit.');
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const selectedProd = products.find(p => p.id === newTx.product_id);
      if (!selectedProd) throw new Error('Veuillez sélectionner un produit');

      const pkgSize = selectedProd.package_size || 50;
      const totalKg = newTx.quantity_type === 'bags' 
        ? Number(newTx.bags_count) * pkgSize 
        : Number(newTx.kg_quantity);

      const isOutgoing = ['CONSUMPTION', 'LOSS', 'SALE'].includes(newTx.transaction_type);
      const signedQty = isOutgoing ? -Math.abs(totalKg) : Math.abs(totalKg);

      const { error: txErr } = await supabase
        .from('inventory_transactions')
        .insert([{
          product_id: selectedProd.id,
          transaction_type: newTx.transaction_type,
          quantity: signedQty,
          unit_price: Number(newTx.unit_price) || selectedProd.purchase_price || 0,
          total_price: Math.abs(signedQty) * (Number(newTx.unit_price) || selectedProd.purchase_price || 0),
          date: newTx.date,
          notes: newTx.notes || null
        }]);

      if (txErr) throw txErr;

      setShowTransactionModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement de la transaction.');
    }
  };

  const getStockStatusColor = (current: number, reorder: number) => {
    if (current <= 0) return 'text-red-700 bg-red-100';
    if (current <= reorder) return 'text-yellow-800 bg-yellow-100';
    return 'text-green-800 bg-green-100';
  };

  const filteredProducts = products.filter(p => {
    const catMatch = filterCategory === 'ALL' || p.category_id === filterCategory;
    const searchMatch = !searchQuery.trim() || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return catMatch && searchMatch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="sm:flex sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock & Aliments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez vos stocks d'aliments, sacs, fourrages et intrants de l'élevage.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button 
            onClick={() => setShowProductModal(true)}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
          >
            <Plus className="w-4 h-4 mr-2 text-gray-500" />
            + Nouveau Produit
          </button>
          <button 
            onClick={() => {
              if (products.length > 0 && !newTx.product_id) {
                setNewTx(prev => ({ ...prev, product_id: products[0].id }));
              }
              setShowTransactionModal(true);
            }}
            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none"
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            + Approvisionnement / Mouvement
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('PRODUCTS')}
          className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center ${activeTab === 'PRODUCTS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Package className="w-4 h-4 mr-2" />
          Liste des Produits & Aliments ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('TRANSACTIONS')}
          className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center ${activeTab === 'TRANSACTIONS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Historique des Mouvements ({transactions.length})
        </button>
      </div>

      {activeTab === 'PRODUCTS' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative rounded-md shadow-sm flex-1 max-w-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher un aliment..."
                className="block w-full rounded-md border-gray-300 pl-10 py-2 px-3 text-sm border focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm border focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="ALL">Toutes les catégories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center bg-white rounded-lg shadow p-12 border border-gray-200">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun produit ou aliment en stock</h3>
              <p className="mt-1 text-sm text-gray-500">Ajoutez vos aliments (Démarrage, Ponte, Croissance) pour suivre votre consommation.</p>
              <div className="mt-6 flex justify-center space-x-4">
                <button
                  onClick={() => setShowProductModal(true)}
                  className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  + Ajouter un aliment
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3">Produit / Aliment</th>
                      <th className="px-4 py-3">Catégorie</th>
                      <th className="px-4 py-3 text-right">Stock Actuel</th>
                      <th className="px-4 py-3 text-right">Équivalent Sacs (50kg)</th>
                      <th className="px-4 py-3 text-right">Prix d'Achat</th>
                      <th className="px-4 py-3 text-right">Seuil Alerte</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProducts.map(prod => {
                      const statusClass = getStockStatusColor(prod.current_stock, prod.reorder_level);
                      const bags = ((prod.current_stock || 0) / (prod.package_size || 50)).toFixed(1);
                      return (
                        <tr key={prod.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {prod.name}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{prod.category?.name || '-'}</td>
                          <td className="px-4 py-3 text-right font-bold">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                              {formatNumber(prod.current_stock)} {prod.unit}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 font-medium">
                            {bags} sacs
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">
                            {formatCurrency(prod.purchase_price)} / {prod.unit}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500">
                            {formatNumber(prod.reorder_level)} {prod.unit}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => {
                                setNewTx(prev => ({ ...prev, product_id: prod.id }));
                                setShowTransactionModal(true);
                              }}
                              className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded hover:bg-indigo-100 font-medium"
                            >
                              + Rapprovisionner
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'TRANSACTIONS' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Quantité</th>
                  <th className="px-4 py-3 text-right">Prix Total</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Aucun mouvement enregistré.</td>
                  </tr>
                ) : (
                  transactions.map(tx => {
                    const isPositive = Number(tx.quantity) > 0;
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900 font-medium">{formatDate(tx.date)}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{tx.product?.name || 'Produit'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            tx.transaction_type === 'PURCHASE' ? 'bg-green-100 text-green-800' :
                            tx.transaction_type === 'CONSUMPTION' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {tx.transaction_type === 'PURCHASE' ? 'Entrée / Achat' :
                             tx.transaction_type === 'CONSUMPTION' ? 'Consommation' : tx.transaction_type}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : ''}{formatNumber(tx.quantity)} {tx.product?.unit || 'kg'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {tx.total_price ? formatCurrency(tx.total_price) : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{tx.notes || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Creation Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nouveau Produit d'Alimentation / Stock</h3>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Nom du produit / aliment *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Aliment Ponte, Aliment Démarrage, Maïs..."
                  value={newProduct.name}
                  onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Catégorie *</label>
                <select
                  required
                  value={newProduct.category_id}
                  onChange={e => setNewProduct({...newProduct, category_id: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Poids d'un sac (kg)</label>
                  <input
                    type="number"
                    value={newProduct.package_size}
                    onChange={e => setNewProduct({...newProduct, package_size: Number(e.target.value) || 50})}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Prix unitaire (DH/kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newProduct.purchase_price}
                    onChange={e => setNewProduct({...newProduct, purchase_price: Number(e.target.value) || 0})}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Stock Initial (kg)</label>
                  <input
                    type="number"
                    value={newProduct.initial_stock_kg}
                    onChange={e => setNewProduct({...newProduct, initial_stock_kg: Number(e.target.value) || 0})}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-0.5">≈ {((newProduct.initial_stock_kg || 0) / (newProduct.package_size || 50)).toFixed(0)} sacs</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Alerte stock bas (kg)</label>
                  <input
                    type="number"
                    value={newProduct.reorder_level}
                    onChange={e => setNewProduct({...newProduct, reorder_level: Number(e.target.value) || 0})}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Description / Notes</label>
                <textarea
                  rows={2}
                  value={newProduct.description}
                  onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700"
                >
                  Créer le produit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction / Stock Inflow Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Entrée / Mouvement de Stock</h3>
            <form onSubmit={handleCreateTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Produit d'aliment *</label>
                <select
                  required
                  value={newTx.product_id}
                  onChange={e => {
                    const prod = products.find(p => p.id === e.target.value);
                    setNewTx({
                      ...newTx,
                      product_id: e.target.value,
                      unit_price: prod?.purchase_price || newTx.unit_price
                    });
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                >
                  <option value="">Sélectionner un produit...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Stock actuel: {p.current_stock} {p.unit})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Type de mouvement</label>
                  <select
                    value={newTx.transaction_type}
                    onChange={e => setNewTx({...newTx, transaction_type: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                  >
                    <option value="PURCHASE">Approvisionnement (Achat / Entrée)</option>
                    <option value="CONSUMPTION">Sortie / Consommation</option>
                    <option value="ADJUSTMENT">Ajustement d'inventaire</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    required
                    value={newTx.date}
                    onChange={e => setNewTx({...newTx, date: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mode de saisie de quantité</label>
                <div className="flex space-x-4 mb-2">
                  <label className="flex items-center text-xs">
                    <input
                      type="radio"
                      checked={newTx.quantity_type === 'bags'}
                      onChange={() => setNewTx({...newTx, quantity_type: 'bags'})}
                      className="mr-1.5"
                    />
                    Nombre de sacs (50 kg)
                  </label>
                  <label className="flex items-center text-xs">
                    <input
                      type="radio"
                      checked={newTx.quantity_type === 'kg'}
                      onChange={() => setNewTx({...newTx, quantity_type: 'kg'})}
                      className="mr-1.5"
                    />
                    Poids total en Kg
                  </label>
                </div>

                {newTx.quantity_type === 'bags' ? (
                  <div>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Nombre de sacs"
                      value={newTx.bags_count}
                      onChange={e => setNewTx({...newTx, bags_count: parseInt(e.target.value) || 0})}
                      className="block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                    />
                    <p className="text-xs text-indigo-600 mt-1 font-medium">
                      = {(newTx.bags_count || 0) * 50} kg au total
                    </p>
                  </div>
                ) : (
                  <div>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Quantité en kg"
                      value={newTx.kg_quantity}
                      onChange={e => setNewTx({...newTx, kg_quantity: parseFloat(e.target.value) || 0})}
                      className="block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Prix unitaire (DH/kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newTx.unit_price}
                    onChange={e => setNewTx({...newTx, unit_price: parseFloat(e.target.value) || 0})}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Total estimé (DH)</label>
                  <input
                    type="text"
                    disabled
                    value={formatCurrency(
                      (newTx.quantity_type === 'bags' ? (newTx.bags_count || 0) * 50 : (newTx.kg_quantity || 0)) * (newTx.unit_price || 0)
                    )}
                    className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 py-2 px-3 text-sm font-semibold text-gray-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Notes / Fournisseur</label>
                <input
                  type="text"
                  placeholder="ex: Fournisseur Alf Al Maghrib..."
                  value={newTx.notes}
                  onChange={e => setNewTx({...newTx, notes: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700"
                >
                  Enregistrer le mouvement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

