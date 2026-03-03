import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Parcel } from '../types';
import { STATUS_COLORS, WILLAYAS, PARCEL_STATUSES } from '../constants';
import { Edit2, Trash2, Printer, Filter, MoreVertical, ExternalLink, Package, XCircle, QrCode, Download, FileSpreadsheet, FileText, FileJson, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MapPin, Tag, ArrowUpDown, ArrowUp, ArrowDown, Search, X, RefreshCcw, Upload, PlusCircle } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { safeFetch } from '../utils/api';

const TicketContent: React.FC<{ parcel: Parcel | null }> = ({ parcel }) => {
  if (!parcel) return null;
  return (
    <div className="text-black">
      {/* QR Code Section */}
      <div className="flex justify-center mb-2 p-2 bg-white border border-neutral-100 rounded-xl">
        <QRCodeSVG 
          value={parcel.tracking} 
          size={120}
          level="H"
          includeMargin={true}
        />
      </div>

      {/* Main Info */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-center border-b border-neutral-100 pb-1">
          <span className="font-mono font-black text-2xl">{parcel.tracking}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-0.5">
            <span className="text-[10px] text-neutral-400 uppercase font-bold block">État</span>
            <span className="text-sm font-bold uppercase bg-black text-white px-2 py-0.5 rounded">
              {parcel.status}
            </span>
          </div>
          <div className="space-y-0.5 text-right">
            <span className="text-[10px] text-neutral-400 uppercase font-bold block">Date</span>
            <span className="text-sm font-bold">{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        <div className="space-y-1 pt-1">
          <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-100">
            <span className="text-[10px] text-neutral-400 uppercase font-bold block">Expéditeur</span>
            <p className="font-bold">{parcel.sender}</p>
            <p className="text-xs">{parcel.mobile}</p>
          </div>

          <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-100">
            <span className="text-[10px] text-neutral-400 uppercase font-bold block">Destination</span>
            <p className="font-bold">{parcel.willaya}</p>
            <p className="text-xs">{parcel.location}</p>
          </div>
        </div>

        <div className="pt-2 border-t-2 border-dashed border-neutral-300">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-neutral-400 uppercase font-bold">Produit</span>
            <span className="font-bold">{parcel.product}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-[10px] text-neutral-400 uppercase font-bold">Montant</span>
            <span className="text-sm font-normal text-black">{(parcel.amount || 0).toFixed(2)} DA</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ParcelList: React.FC = () => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [parcelToDelete, setParcelToDelete] = useState<number | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    tracking: '',
    sender: '',
    mobile: '',
    product: '',
    willaya: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedParcelId, setExpandedParcelId] = useState<number | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Parcel; direction: 'asc' | 'desc' } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pageSize, setPageSize] = useState<number | 'Tous'>(25);
  const [selectedParcelIds, setSelectedParcelIds] = useState<number[]>([]);
  const [isBulkPrinting, setIsBulkPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const bulkPrintRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const handleBulkPrint = useReactToPrint({
    contentRef: bulkPrintRef,
  });

  const toggleParcelSelection = (id: number) => {
    setSelectedParcelIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const toggleAllSelection = () => {
    if (selectedParcelIds.length === currentParcels.length) {
      setSelectedParcelIds([]);
    } else {
      setSelectedParcelIds(currentParcels.map(p => p.id));
    }
  };

  useEffect(() => {
    fetchParcels();
  }, []);

  const fetchParcels = async () => {
    setIsRefreshing(true);
    try {
      const data = await safeFetch('/api/parcels', {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      setParcels(data);
    } catch (error) {
      console.error('Error fetching parcels:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let successCount = 0;
        let errorCount = 0;

        for (const row of data) {
          try {
            // Map common column names to our structure
            const parcelData = {
              tracking: row.Tracking || row.tracking || `TRK${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
              sender: row.Expéditeur || row.sender || 'Importé',
              mobile: String(row.Mobile || row.mobile || ''),
              willaya: row.Willaya || row.willaya || 'Alger',
              location: row.Emplacement || row.location || '',
              amount: Number(row.Montant || row.amount || 0),
              product: row.Produit || row.product || '',
              status: row.Statut || row.status || 'Nouveau',
              image: null
            };

            await safeFetch('/api/parcels', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user?.token}` 
              },
              body: JSON.stringify(parcelData)
            });
            successCount++;
          } catch (err) {
            console.error('Error importing row:', err);
            errorCount++;
          }
        }

        alert(`Importation terminée: ${successCount} succès, ${errorCount} erreurs.`);
        fetchParcels();
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Erreur lors de la lecture du fichier. Assurez-vous qu\'il s\'agit d\'un fichier Excel ou CSV valide.');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDelete = async () => {
    if (!parcelToDelete) return;
    try {
      await safeFetch(`/api/parcels/${parcelToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      setParcels(parcels.filter(p => p.id !== parcelToDelete));
      setParcelToDelete(null);
    } catch (error) {
      console.error('Error deleting parcel:', error);
    }
  };

  const resetFilters = () => {
    setAdvancedFilters({
      tracking: '',
      sender: '',
      mobile: '',
      product: '',
      willaya: '',
      status: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const filteredParcels = parcels.filter(p => {
    const matchesTracking = p.tracking.toLowerCase().includes(advancedFilters.tracking.toLowerCase());
    const matchesSender = p.sender.toLowerCase().includes(advancedFilters.sender.toLowerCase());
    const matchesMobile = p.mobile.includes(advancedFilters.mobile);
    const matchesProduct = p.product?.toLowerCase().includes(advancedFilters.product.toLowerCase()) || false;
    const matchesWillaya = advancedFilters.willaya === '' || p.willaya === advancedFilters.willaya;
    const matchesStatus = advancedFilters.status === '' || p.status === advancedFilters.status;
    
    let matchesDate = true;
    if (advancedFilters.dateFrom || advancedFilters.dateTo) {
      const parcelDate = new Date(p.created_at);
      parcelDate.setHours(0, 0, 0, 0);
      
      if (advancedFilters.dateFrom) {
        const fromDate = new Date(advancedFilters.dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (parcelDate < fromDate) matchesDate = false;
      }
      
      if (advancedFilters.dateTo) {
        const toDate = new Date(advancedFilters.dateTo);
        toDate.setHours(0, 0, 0, 0);
        if (parcelDate > toDate) matchesDate = false;
      }
    }

    return matchesTracking && matchesSender && matchesMobile && matchesProduct && matchesWillaya && matchesStatus && matchesDate;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [advancedFilters]);

  const sortedParcels = [...filteredParcels].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = pageSize === 'Tous' ? 1 : Math.ceil(sortedParcels.length / Number(pageSize));
  const startIndex = pageSize === 'Tous' ? 0 : (currentPage - 1) * Number(pageSize);
  const currentParcels = pageSize === 'Tous' ? sortedParcels : sortedParcels.slice(startIndex, startIndex + Number(pageSize));

  const handleSort = (key: keyof Parcel) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const exportToCSV = () => {
    const headers = ['Tracking', 'Expéditeur', 'Mobile', 'Willaya', 'Emplacement', 'Montant', 'Produit', 'Statut', 'Date'];
    const rows = filteredParcels.map(p => [
      p.tracking,
      p.sender,
      p.mobile,
      p.willaya,
      p.location,
      p.amount,
      p.product,
      p.status,
      new Date(p.created_at).toLocaleDateString()
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `colis_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportOpen(false);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredParcels.map(p => ({
      Tracking: p.tracking,
      Expéditeur: p.sender,
      Mobile: p.mobile,
      Willaya: p.willaya,
      Emplacement: p.location,
      Montant: p.amount,
      Produit: p.product,
      Statut: p.status,
      Date: new Date(p.created_at).toLocaleDateString()
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Colis");
    XLSX.writeFile(workbook, `colis_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    setIsExportOpen(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Liste des Colis", 14, 15);
    
    const tableData = sortedParcels.map(p => [
      p.tracking,
      p.sender,
      p.willaya,
      (p.amount || 0).toFixed(2) + " DA",
      p.status,
      new Date(p.created_at).toLocaleDateString()
    ]);

    autoTable(doc, {
      head: [['Tracking', 'Expéditeur', 'Willaya', 'Montant', 'Statut', 'Date']],
      body: tableData,
      startY: 20,
      theme: 'grid',
      headStyles: { fillColor: [249, 115, 22] }
    });

    doc.save(`colis_export_${new Date().toISOString().split('T')[0]}.pdf`);
    setIsExportOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Liste des colis</h2>
          <p className="text-neutral-500">Gérez et suivez tous vos colis enregistrés.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={fetchParcels}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors text-neutral-600 font-medium disabled:opacity-50"
            title="Actualiser la liste"
          >
            <RefreshCcw size={20} className={`text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImport} 
            accept=".csv, .xlsx, .xls" 
            className="hidden" 
          />

          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 px-4 py-2.5 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors text-neutral-600 font-medium disabled:opacity-50"
          >
            <Upload size={20} className={`text-green-600 ${isImporting ? 'animate-bounce' : ''}`} />
            {isImporting ? 'Importation...' : 'Importer'}
          </button>

          <button 
            onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-all font-medium ${
              isAdvancedSearchOpen 
                ? 'bg-orange-50 border-orange-200 text-orange-600 shadow-sm' 
                : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <Search size={20} />
            Recherche Avancée
          </button>

          {selectedParcelIds.length > 0 && (
            <div className="flex gap-2">
              <button 
                onClick={() => handleBulkPrint()}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all font-medium shadow-lg shadow-orange-600/20"
              >
                <Printer size={20} />
                Imprimer ({selectedParcelIds.length})
              </button>
              <button 
                onClick={() => setSelectedParcelIds([])}
                className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-all font-medium"
                title="Désélectionner tout"
              >
                <X size={20} />
              </button>
            </div>
          )}

          <div className="relative">
            <button 
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center gap-2 px-4 py-2.5 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors text-neutral-600 font-medium"
            >
              <Download size={20} className="text-purple-600" />
              Exporter
            </button>
            
            <AnimatePresence>
              {isExportOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsExportOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-neutral-100 z-20 py-2 overflow-hidden"
                  >
                    <button 
                      onClick={exportToExcel}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                    >
                      <FileSpreadsheet size={18} className="text-green-600" />
                      Excel (.xlsx)
                    </button>
                    <button 
                      onClick={exportToPDF}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                    >
                      <FileText size={18} className="text-red-600" />
                      PDF (.pdf)
                    </button>
                    <button 
                      onClick={exportToCSV}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                    >
                      <FileJson size={18} className="text-blue-600" />
                      CSV (.csv)
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          <Link 
            to="/add"
            className="bg-orange-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-orange-700 transition-all text-center flex items-center justify-center gap-2"
          >
            <PlusCircle size={20} className="text-white" />
            Nouveau Colis
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {isAdvancedSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <Filter size={20} className="text-orange-600" />
                  Filtres de recherche
                </h3>
                <button 
                  onClick={resetFilters}
                  className="text-sm text-neutral-500 hover:text-orange-600 flex items-center gap-1 transition-colors"
                >
                  <RefreshCcw size={14} />
                  Réinitialiser
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Tracking</label>
                  <input 
                    type="text"
                    placeholder="Code de tracking..."
                    className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-sm"
                    value={advancedFilters.tracking}
                    onChange={e => setAdvancedFilters(prev => ({ ...prev, tracking: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Expéditeur</label>
                  <input 
                    type="text"
                    placeholder="Nom de l'expéditeur..."
                    className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-sm"
                    value={advancedFilters.sender}
                    onChange={e => setAdvancedFilters(prev => ({ ...prev, sender: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Mobile</label>
                  <input 
                    type="text"
                    placeholder="Numéro de téléphone..."
                    className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-sm"
                    value={advancedFilters.mobile}
                    onChange={e => setAdvancedFilters(prev => ({ ...prev, mobile: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Produit</label>
                  <input 
                    type="text"
                    placeholder="Nom du produit..."
                    className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-sm"
                    value={advancedFilters.product}
                    onChange={e => setAdvancedFilters(prev => ({ ...prev, product: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Willaya</label>
                  <select 
                    className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-sm"
                    value={advancedFilters.willaya}
                    onChange={e => setAdvancedFilters(prev => ({ ...prev, willaya: e.target.value }))}
                  >
                    <option value="">Toutes les willayas</option>
                    {WILLAYAS.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">État</label>
                  <select 
                    className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-sm"
                    value={advancedFilters.status}
                    onChange={e => setAdvancedFilters(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="">Tous les états</option>
                    {PARCEL_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Date du</label>
                  <input 
                    type="date"
                    className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-sm"
                    value={advancedFilters.dateFrom}
                    onChange={e => setAdvancedFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Date au</label>
                  <input 
                    type="date"
                    className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-sm"
                    value={advancedFilters.dateTo}
                    onChange={e => setAdvancedFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">
                  <input 
                    type="checkbox" 
                    checked={selectedParcelIds.length === currentParcels.length && currentParcels.length > 0}
                    onChange={toggleAllSelection}
                    className="w-4 h-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
                  />
                </th>
                <th className="px-6 py-4 font-semibold">Photo</th>
                <th className="px-6 py-4 font-semibold">Tracking</th>
                <th className="px-6 py-4 font-semibold">Expéditeur</th>
                <th className="px-6 py-4 font-semibold">Produit</th>
                <th className="px-6 py-4 font-semibold">Willaya</th>
                <th className="px-6 py-4 font-semibold">Emplacement</th>
                <th className="px-6 py-4 font-semibold">Montant</th>
                <th 
                  className="px-6 py-4 font-semibold cursor-pointer hover:bg-neutral-100 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    État
                    {sortConfig?.key === 'status' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : (
                      <ArrowUpDown size={14} className="text-neutral-300" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-neutral-500">Chargement des données...</td>
                </tr>
              ) : currentParcels.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-neutral-500">Aucun colis trouvé.</td>
                </tr>
              ) : (
                currentParcels.map(parcel => (
                  <React.Fragment key={parcel.id}>
                    <tr 
                      className={`hover:bg-neutral-50 transition-colors group cursor-pointer ${expandedParcelId === parcel.id ? 'bg-blue-50/30' : ''}`}
                      onClick={() => setExpandedParcelId(expandedParcelId === parcel.id ? null : parcel.id)}
                    >
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedParcelIds.includes(parcel.id)}
                          onChange={() => toggleParcelSelection(parcel.id)}
                          className="w-4 h-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        {parcel.image ? (
                          <img 
                            src={parcel.image} 
                            alt="Colis" 
                            className="w-12 h-12 rounded-lg object-cover cursor-pointer hover:scale-110 transition-transform"
                            onClick={(e) => { e.stopPropagation(); setViewImage(parcel.image!); }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-400">
                            <Package size={20} />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-neutral-900">{parcel.tracking}</span>
                          <span className="text-xs text-neutral-400">{new Date(parcel.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-neutral-900">{parcel.sender}</span>
                          <span className="text-xs text-neutral-500">{parcel.mobile}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-neutral-900 font-medium">{parcel.product || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-neutral-900">{parcel.willaya}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-neutral-500">{parcel.location}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-neutral-900">{(parcel.amount || 0).toFixed(2)} DA</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[parcel.status]}`}>
                          {parcel.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedParcel(parcel); setIsPreviewOpen(true); }}
                            className="p-2 text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                            title="Imprimer"
                          >
                            <Printer size={18} />
                          </button>
                          <Link 
                            to={`/edit/${parcel.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Modifier"
                          >
                            <Edit2 size={18} />
                          </Link>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setParcelToDelete(parcel.id); }}
                            className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Supprimer"
                          >
                            <Trash2 size={18} />
                          </button>
                          <div className="ml-2 text-neutral-300">
                            {expandedParcelId === parcel.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </div>
                      </td>
                    </tr>
                    <AnimatePresence>
                      {expandedParcelId === parcel.id && (
                        <tr>
                          <td colSpan={10} className="p-0 border-none">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden bg-neutral-50/50"
                            >
                              <div className="px-24 py-6 grid grid-cols-3 gap-8">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                                    <Tag size={14} />
                                    Produit
                                  </div>
                                  <p className="text-neutral-900 font-medium">{parcel.product || 'N/A'}</p>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                                    <MapPin size={14} />
                                    Localisation précise
                                  </div>
                                  <p className="text-neutral-900 font-medium">{parcel.location || 'N/A'}</p>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                                    <Package size={14} />
                                    Willaya
                                  </div>
                                  <p className="text-neutral-900 font-medium">{parcel.willaya}</p>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-neutral-100">
          {loading ? (
            <div className="p-8 text-center text-neutral-500">Chargement...</div>
          ) : currentParcels.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">Aucun colis trouvé.</div>
          ) : (
            currentParcels.map(parcel => (
              <div 
                key={parcel.id} 
                className={`p-4 space-y-4 cursor-pointer transition-colors ${expandedParcelId === parcel.id ? 'bg-blue-50/30' : ''}`}
                onClick={() => setExpandedParcelId(expandedParcelId === parcel.id ? null : parcel.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedParcelIds.includes(parcel.id)}
                        onChange={() => toggleParcelSelection(parcel.id)}
                        className="w-5 h-5 rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
                      />
                    </div>
                    {parcel.image ? (
                      <img 
                        src={parcel.image} 
                        alt="Colis" 
                        className="w-16 h-16 rounded-xl object-cover"
                        onClick={(e) => { e.stopPropagation(); setViewImage(parcel.image!); }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400">
                        <Package size={24} />
                      </div>
                    )}
                    <div>
                      <p className="font-mono font-bold text-neutral-900">{parcel.tracking}</p>
                      <p className="text-xs text-neutral-400">{new Date(parcel.created_at).toLocaleDateString()}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[parcel.status]}`}>
                        {parcel.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedParcel(parcel); setIsPreviewOpen(true); }}
                      className="p-2 text-orange-500 hover:text-orange-600"
                    >
                      <Printer size={18} />
                    </button>
                    <Link 
                      to={`/edit/${parcel.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 text-blue-500 hover:text-blue-600"
                    >
                      <Edit2 size={18} />
                    </Link>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setParcelToDelete(parcel.id); }}
                      className="p-2 text-red-500 hover:text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-neutral-400 text-xs uppercase font-bold tracking-wider">Expéditeur</p>
                    <p className="font-medium text-neutral-900">{parcel.sender}</p>
                    <p className="text-neutral-500">{parcel.mobile}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400 text-xs uppercase font-bold tracking-wider">Produit</p>
                    <p className="font-medium text-neutral-900">{parcel.product || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400 text-xs uppercase font-bold tracking-wider">Willaya</p>
                    <p className="font-medium text-neutral-900">{parcel.willaya}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400 text-xs uppercase font-bold tracking-wider">Emplacement</p>
                    <p className="text-neutral-500">{parcel.location}</p>
                  </div>
                </div>
                
                <AnimatePresence>
                  {expandedParcelId === parcel.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden pt-2 space-y-3 border-t border-neutral-100"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Produit</span>
                        <span className="text-sm font-medium text-neutral-900">{parcel.product || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Localisation</span>
                        <span className="text-sm font-medium text-neutral-900">{parcel.location}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="pt-2 flex justify-between items-center border-t border-neutral-50">
                  <span className="text-xs text-neutral-400">Montant:</span>
                  <span className="font-bold text-neutral-900">{(parcel.amount || 0).toFixed(2)} DA</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-neutral-500">
              Affichage de <span className="font-medium text-neutral-900">{startIndex + 1}</span> à <span className="font-medium text-neutral-900">{pageSize === 'Tous' ? sortedParcels.length : Math.min(startIndex + Number(pageSize), sortedParcels.length)}</span> sur <span className="font-medium text-neutral-900">{sortedParcels.length}</span> colis
            </p>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Afficher:</label>
              <select 
                value={pageSize} 
                onChange={(e) => {
                  const val = e.target.value;
                  setPageSize(val === 'Tous' ? 'Tous' : Number(val));
                  setCurrentPage(1);
                }}
                className="text-sm bg-white border border-neutral-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="Tous">Tous</option>
              </select>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 border border-neutral-200 rounded-lg hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                          currentPage === pageNum
                            ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                            : 'text-neutral-600 hover:bg-white hover:border-neutral-200 border border-transparent'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === currentPage - 2 ||
                    pageNum === currentPage + 2
                  ) {
                    return <span key={pageNum} className="px-1 text-neutral-400">...</span>;
                  }
                  return null;
                })}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 border border-neutral-200 rounded-lg hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden Print Component */}
      <div className="hidden">
        <div ref={printRef} className="p-8 w-[100mm] mx-auto bg-white text-neutral-900 font-sans">
          <TicketContent parcel={selectedParcel} />
        </div>
      </div>

      {/* Hidden Bulk Print Component */}
      <div className="hidden">
        <div ref={bulkPrintRef} className="bg-white text-neutral-900 font-sans">
          <style>{`
            @media print {
              .page-break {
                page-break-before: always;
                break-before: page;
              }
            }
          `}</style>
          {parcels.filter(p => selectedParcelIds.includes(p.id)).map((parcel, index) => (
            <div key={parcel.id} className={`p-8 w-[100mm] mx-auto ${index > 0 ? 'page-break' : ''}`}>
              <TicketContent parcel={parcel} />
            </div>
          ))}
        </div>
      </div>

      {/* Print Preview Modal */}
      {isPreviewOpen && selectedParcel && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col"
          >
            <div className="p-4 border-b border-neutral-100 flex justify-between items-center">
              <h3 className="font-bold text-neutral-900">Aperçu avant impression</h3>
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 bg-neutral-100 flex justify-center">
              <div className="bg-white shadow-lg p-8 w-[100mm] min-h-[120mm] h-fit">
                <TicketContent parcel={selectedParcel} />
              </div>
            </div>

            <div className="p-4 border-t border-neutral-100 flex gap-3">
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="flex-1 px-4 py-2 border border-neutral-200 rounded-xl text-neutral-600 hover:bg-neutral-50 font-medium transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={() => { handlePrint(); setIsPreviewOpen(false); }}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                Imprimer
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Image Modal */}
      {viewImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setViewImage(null)}
        >
          <div className="max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-neutral-100 flex justify-between items-center">
              <h3 className="font-bold text-neutral-900">Aperçu de la photo</h3>
              <button 
                onClick={() => setViewImage(null)}
                className="text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-4 flex justify-center bg-neutral-50">
              <img src={viewImage} alt="Full size" className="max-h-[70vh] w-auto rounded-lg shadow-lg" />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {parcelToDelete !== null && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">Supprimer le colis ?</h3>
              <p className="text-neutral-500 mb-8">
                Cette action est irréversible. Toutes les données associées à ce colis seront définitivement supprimées.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setParcelToDelete(null)}
                  className="flex-1 px-4 py-3 border border-neutral-200 rounded-xl text-neutral-600 hover:bg-neutral-50 font-bold transition-all"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
