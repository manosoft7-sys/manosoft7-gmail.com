import React, { useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { safeFetch } from '../utils/api';
import { 
  Database, 
  Download, 
  Upload, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2,
  FileUp,
  History
} from 'lucide-react';
import { motion } from 'motion/react';

export const DatabaseSettings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/db/backup', {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      
      if (!response.ok) throw new Error('Échec de la sauvegarde');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_colis_${new Date().toISOString().split('T')[0]}.db`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setMessage({ type: 'success', text: 'Sauvegarde téléchargée avec succès.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('ATTENTION: La restauration de la base de données écrasera toutes les données actuelles. Voulez-vous continuer ?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setLoading(true);
    setMessage(null);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/db/restore', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user?.token}` },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Échec de la restauration');

      setMessage({ type: 'success', text: 'Base de données restaurée avec succès. L\'application utilise maintenant les nouvelles données.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Paramètres de la base de données</h2>
        <p className="text-neutral-500">Gérez les sauvegardes et la restauration de vos données.</p>
      </div>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-100 text-green-700' 
              : 'bg-red-50 border-red-100 text-red-700'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <p className="text-sm font-medium">{message.text}</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Card */}
        <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-6">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Download size={28} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-neutral-900">Sauvegarde</h3>
            <p className="text-neutral-500 text-sm mt-1">
              Téléchargez une copie complète de la base de données actuelle pour la conserver en lieu sûr.
            </p>
          </div>
          <button
            onClick={handleBackup}
            disabled={loading}
            className="w-full bg-neutral-900 text-white py-3 rounded-xl font-bold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
            Télécharger la sauvegarde
          </button>
        </div>

        {/* Restore Card */}
        <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-6">
          <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center">
            <Upload size={28} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-neutral-900">Restauration</h3>
            <p className="text-neutral-500 text-sm mt-1">
              Restaurez les données à partir d'un fichier de sauvegarde (.db). Cette action est irréversible.
            </p>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleRestore}
            accept=".db"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <FileUp size={20} />}
            Restaurer une sauvegarde
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex gap-4">
        <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-full flex-shrink-0 flex items-center justify-center">
          <AlertTriangle size={20} />
        </div>
        <div>
          <h4 className="font-bold text-amber-900">Conseils de sécurité</h4>
          <ul className="text-sm text-amber-800 mt-2 space-y-1 list-disc list-inside">
            <li>Effectuez des sauvegardes régulières, surtout avant des opérations importantes.</li>
            <li>Conservez vos fichiers de sauvegarde dans un endroit sécurisé et hors ligne.</li>
            <li>Ne restaurez que des fichiers provenant de sources sûres.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
