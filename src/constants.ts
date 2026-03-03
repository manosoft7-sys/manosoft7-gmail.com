import { ParcelStatus } from "./types";

export const WILLAYAS = [
  "01-Adrar", "02-Chlef", "03-Laghouat", "04-Oum El Bouaghi", "05-Batna", "06-Béjaïa", "07-Biskra", "08-Béchar", 
  "09-Blida", "09-Boufarik", "10-Bouira", "11-Tamanrasset", "12-Tébessa", "13-Tlemcen", "14-Tiaret", "15-Tizi Ouzou", 
  "16-Alger", "16-Alger bab eloued", "16-Cheraga", "16-Gui de constantine", "16-Kouba", "16-Reghaia", "16-Birkhadem", "16-Bab ezzouar", "16-Birtouta",
  "17-Djelfa", "18-Jijel", "19-Sétif", "20-Saïda", "21-Skikda", "22-Sidi Bel Abbès", "23-Annabba", "24-Guelma", 
  "25-Constantine", "26-Médéa", "27-Mostaganem", "28-M'Sila", "29-Mascara", "30-Ouargla", "31-Oran", "32-El Bayadh", 
  "33-Illizi", "34-Bordj Bou Arréridj", "35-Boumerdès", "36-El Tarf", "37-Tindouf", "38-Tissemsilt", "39-El Oued", 
  "40-Khenchela", "41-Souk Ahras", "42-Tipaza", "43-Mila", "44-Aïn Defla", "45-Naâma", "46-Aïn Témouchent", 
  "47-Ghardaïa", "48-Relizane", "49-Timimoun", "50-Bordj Badji Mokhtar", "51-Ouled Djellal", "52-Béni Abbès", 
  "53-In Salah", "54-In Guezzam", "55-Touggourt", "56-Djanet", "57-M'Ghair", "58-El Meniaa", "Inconnu"
];

export const PARCEL_STATUSES: ParcelStatus[] = [
  "Nouveau",
  "Colis livré archivé",
  "Colis livré",
  "Retour archivé",
  "Colis supprimé",
  "Colis sans étiquette",
  "Colis endommagé",
  "Colis vide",
  "Colis double",
  "N'existe pas",
  "Colis archivé"
];

export const STATUS_COLORS: Record<ParcelStatus, string> = {
  "Nouveau": "bg-blue-100 text-blue-800",
  "Colis livré archivé": "bg-green-100 text-green-800",
  "Colis livré": "bg-emerald-100 text-emerald-800",
  "Retour archivé": "bg-orange-100 text-orange-800",
  "Colis supprimé": "bg-red-100 text-red-800",
  "Colis sans étiquette": "bg-neutral-100 text-neutral-800",
  "Colis endommagé": "bg-yellow-100 text-yellow-800",
  "Colis vide": "bg-stone-100 text-stone-800",
  "Colis double": "bg-purple-100 text-purple-800",
  "N'existe pas": "bg-gray-100 text-gray-800",
  "Colis archivé": "bg-slate-100 text-slate-800"
};
