export type UserRole = "admin" | "agent";

export interface User {
  username: string;
  token: string;
  role: UserRole;
}

export interface ManagedUser {
  id: number;
  username: string;
  role: UserRole;
  active: number;
}

export interface Parcel {
  id: number;
  tracking: string;
  sender: string;
  mobile: string;
  willaya: string;
  location: string;
  amount: number;
  product: string;
  status: ParcelStatus;
  image?: string;
  created_at: string;
}

export type ParcelStatus = 
  | "Nouveau"
  | "Colis livré archivé" 
  | "Colis livré" 
  | "Retour archivé" 
  | "Colis supprimé" 
  | "Colis sans étiquette" 
  | "Colis endommagé" 
  | "Colis vide" 
  | "Colis double" 
  | "N'existe pas" 
  | "Colis archivé";

export interface Stat {
  status: ParcelStatus;
  count: number;
}
