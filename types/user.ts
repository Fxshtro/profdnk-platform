export interface Subscription {
  isActive: boolean;
  endDate: string | null;
}

export interface Psychologist {
  id: string;
  login: string;
  email: string;
  fullName: string;
  subscription: Subscription;
  isBlocked: boolean;
  createdAt: string;
}

export interface Admin {
  id: string;
  login: string;
  email: string;
}

export type UserRole = 'psychologist' | 'admin';

export interface User {
  role: UserRole;
  psychologist?: Psychologist;
  admin?: Admin;
}
