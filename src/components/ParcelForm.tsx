import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { WILLAYAS, PARCEL_STATUSES } from '../constants';
import { Parcel, ParcelStatus } from '../types';
import { Camera, Save, ArrowLeft, Loader2 } from 'lucide-react';
import { safeFetch } from '../utils/api';

export const ParcelForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    tracking: '',
    sender: '',
    mobile: '',
    willaya: WILLAYAS[0],
    location: '',
    amount: '',
    product: '',
    status: 'Nouveau' as ParcelStatus,
    image: ''
  });

  useEffect(() => {
    if (id) {
      fetchParcel();
    } else {
      // Generate random tracking for new parcel
      setFormData(prev => ({ ...prev, tracking: `TRK-${Math.random().toString(36).substring(2, 10).toUpperCase()}` }));
    }
  }, [id]);

  const fetchParcel = async () => {
    try {
      const parcels: Parcel[] = await safeFetch('/api/parcels', {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const parcel = parcels.find(p => p.id === parseInt(id!));
      if (parcel) {
        setFormData({
          tracking: parcel.tracking,
          sender: parcel.sender,
          mobile: parcel.mobile,
          willaya: parcel.willaya,
          location: parcel.location,
          amount: (parcel.amount ?? '').toString(),
          product: parcel.product,
          status: parcel.status,
          image: parcel.image || ''
        });
        setImagePreview(parcel.image || null);
      }
    } catch (error) {
      console.error('Error fetching parcel:', error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setFormData(prev => ({ ...prev, image: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = id ? `/api/parcels/${id}` : '/api/parcels';
      const method = id ? 'PUT' : 'POST';

      await safeFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          ...formData,
          amount: formData.amount ? parseFloat(formData.amount) : null
        })
      });

      navigate('/parcels');
    } catch (error: any) {
      console.error('Error saving parcel:', error);
      alert(error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors mb-2"
          >
            <ArrowLeft size={16} className="text-orange-500" />
            Retour
          </button>
          <h2 className="text-2xl font-bold text-neutral-900">
            {id ? 'Modifier le colis' : 'Ajouter un nouveau colis'}
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Code de Tracking</label>
              <input
                type="text"
                required
                value={formData.tracking}
                onChange={e => setFormData(prev => ({ ...prev, tracking: e.target.value }))}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Expéditeur</label>
              <input
                type="text"
                required
                value={formData.sender}
                onChange={e => setFormData(prev => ({ ...prev, sender: e.target.value }))}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Mobile</label>
              <input
                type="tel"
                required
                value={formData.mobile}
                onChange={e => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Willaya</label>
              <select
                value={formData.willaya}
                onChange={e => setFormData(prev => ({ ...prev, willaya: e.target.value }))}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
              >
                {WILLAYAS.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Emplacement</label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Montant (DA)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Produit</label>
              <input
                type="text"
                required
                value={formData.product}
                onChange={e => setFormData(prev => ({ ...prev, product: e.target.value }))}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">État du colis</label>
              <select
                value={formData.status}
                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as ParcelStatus }))}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
              >
                {PARCEL_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Photo du colis</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-200 border-dashed rounded-xl hover:border-orange-400 transition-colors cursor-pointer relative group">
                {imagePreview ? (
                  <div className="space-y-1 text-center">
                    <img src={imagePreview} alt="Preview" className="mx-auto h-32 w-auto rounded-lg object-cover" />
                    <button 
                      type="button"
                      onClick={() => { setImagePreview(null); setFormData(prev => ({ ...prev, image: '' })); }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Supprimer
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1 text-center">
                    <Camera className="mx-auto h-12 w-12 text-neutral-400 group-hover:text-orange-500 transition-colors" />
                    <div className="flex text-sm text-neutral-600">
                      <span className="relative cursor-pointer bg-white rounded-md font-medium text-orange-600 hover:text-orange-500 focus-within:outline-none">
                        Télécharger un fichier
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">PNG, JPG, GIF jusqu'à 10MB</p>
                  </div>
                )}
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} accept="image/*" />
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-8 py-4 bg-neutral-50 border-t border-neutral-200 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-600 text-white px-8 py-2.5 rounded-xl font-medium hover:bg-orange-700 focus:ring-4 focus:ring-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} className="text-white" />}
            {id ? 'Mettre à jour' : 'Enregistrer le colis'}
          </button>
        </div>
      </form>
    </div>
  );
};
