import React, { useState, useEffect } from 'react';
import { Stat, ParcelStatus } from '../types';
import { useAuth } from './AuthContext';
import { STATUS_COLORS, PARCEL_STATUSES } from '../constants';
import { Package, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, FileQuestion, AlertTriangle, Trash2, Copy, SearchX, Archive } from 'lucide-react';
import { safeFetch } from '../utils/api';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stat[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await safeFetch('/api/stats', {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getCount = (status: ParcelStatus) => {
    return stats.find(s => s.status === status)?.count || 0;
  };

  const totalParcels = stats.reduce((acc, curr) => acc + curr.count, 0);

  const statCards = [
    { label: 'Total Colis', value: totalParcels, icon: Package, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Nouveaux', value: getCount('Nouveau'), icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Livrés', value: getCount('Colis livré'), icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Livrés Archivés', value: getCount('Colis livré archivé'), icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Retours Archivés', value: getCount('Retour archivé'), icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Supprimés', value: getCount('Colis supprimé'), icon: Trash2, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Sans Étiquette', value: getCount('Colis sans étiquette'), icon: FileQuestion, color: 'text-neutral-600', bg: 'bg-neutral-50' },
    { label: 'Endommagés', value: getCount('Colis endommagé'), icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Vides', value: getCount('Colis vide'), icon: Package, color: 'text-stone-600', bg: 'bg-stone-50' },
    { label: 'Doubles', value: getCount('Colis double'), icon: Copy, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'N\'existe pas', value: getCount('N\'existe pas'), icon: SearchX, color: 'text-gray-600', bg: 'bg-gray-50' },
    { label: 'Archivés', value: getCount('Colis archivé'), icon: Archive, color: 'text-slate-600', bg: 'bg-slate-50' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Tableau de bord</h2>
        <p className="text-neutral-500">Aperçu global de vos activités de livraison.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white p-4 lg:p-6 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-8 h-8 lg:w-10 lg:h-10 ${card.bg} ${card.color} rounded-xl flex items-center justify-center mb-3 lg:mb-4`}>
                <Icon size={18} className="lg:w-5 lg:h-5" />
              </div>
              <p className="text-[10px] lg:text-sm font-medium text-neutral-500 uppercase tracking-wider">{card.label}</p>
              <p className="text-xl lg:text-2xl font-bold text-neutral-900">{card.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
