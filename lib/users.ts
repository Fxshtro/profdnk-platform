import { hashPassword, generateToken } from './auth';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: 'admin' | 'psychologist';
  isBlocked: boolean;
  subscription?: {
    isActive: boolean;
    endDate: string;
  };
  createdAt: string;
}

export const INITIAL_USERS: Array<{
  id: string;
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'psychologist';
  isBlocked: boolean;
  subscription?: {
    isActive: boolean;
    endDate: string;
  };
  createdAt: string;
}> = [
  {
    id: 'admin-1',
    email: 'admin@profdnk.ru',
    password: 'admin123',
    fullName: 'Администратор',
    role: 'admin',
    isBlocked: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'psych-1',
    email: 'psychologist@profdnk.ru',
    password: 'psych123',
    fullName: 'Иванов Иван Иванович',
    role: 'psychologist',
    isBlocked: false,
    subscription: {
      isActive: true,
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    createdAt: new Date().toISOString(),
  },
];

export async function initializeUsers(): Promise<void> {
  const existingUsers = localStorage.getItem('users');
  
  if (!existingUsers) {
    const users: User[] = [];
    
    for (const userData of INITIAL_USERS) {
      const passwordHash = await hashPassword(userData.password);
      const { password, ...user } = userData;
      users.push({ ...user, passwordHash });
    }
    
    localStorage.setItem('users', JSON.stringify(users));
    console.log('Users initialized:', users.map(u => ({ email: u.email, role: u.role })));
  }
}

export function getUserByEmail(email: string): User | null {
  const users = JSON.parse(localStorage.getItem('users') || '[]') as User[];
  return users.find(u => u.email === email) || null;
}

export function getUserById(id: string): User | null {
  const users = JSON.parse(localStorage.getItem('users') || '[]') as User[];
  return users.find(u => u.id === id) || null;
}

export async function createUser(userData: {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'psychologist';
  subscription?: User['subscription'];
}): Promise<User> {
  const users = JSON.parse(localStorage.getItem('users') || '[]') as User[];
  
  const newUser: User = {
    id: `user-${Date.now()}`,
    email: userData.email,
    passwordHash: await hashPassword(userData.password),
    fullName: userData.fullName,
    role: userData.role,
    isBlocked: false,
    subscription: userData.subscription,
    createdAt: new Date().toISOString(),
  };
  
  users.push(newUser);
  localStorage.setItem('users', JSON.stringify(users));
  
  return newUser;
}

export function updateUser(id: string, updates: Partial<User>): User | null {
  const users = JSON.parse(localStorage.getItem('users') || '[]') as User[];
  const index = users.findIndex(u => u.id === id);
  
  if (index === -1) return null;
  
  users[index] = { ...users[index], ...updates };
  localStorage.setItem('users', JSON.stringify(users));
  
  return users[index];
}

export function getAllPsychologists(): User[] {
  const users = JSON.parse(localStorage.getItem('users') || '[]') as User[];
  return users.filter(u => u.role === 'psychologist');
}

export interface Application {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  specialization: string;
  education: string;
  experience: string;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
}

export function getApplications(): Application[] {
  return JSON.parse(localStorage.getItem('applications') || '[]');
}

export function saveApplication(application: Application): void {
  const applications = getApplications();
  applications.push(application);
  localStorage.setItem('applications', JSON.stringify(applications));
}

export function updateApplication(id: string, updates: Partial<Application>): void {
  const applications = getApplications();
  const index = applications.findIndex(a => a.id === id);
  
  if (index !== -1) {
    applications[index] = { ...applications[index], ...updates };
    localStorage.setItem('applications', JSON.stringify(applications));
  }
}
