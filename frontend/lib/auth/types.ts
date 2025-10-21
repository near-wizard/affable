// lib/auth/types.ts
export interface User {
    id: string;
    email: string;
    name: string;
    role: 'vendor' | 'partner' | 'admin';
    vendorId?: number;
    partnerId?: number;
    imageUrl?: string;
    emailVerified: boolean;
    createdAt: Date;
  }
  
  export interface AuthProvider {
    getCurrentUser(): Promise<User | null>;
    signIn(email: string, password: string): Promise<User>;
    signUp(data: SignUpData): Promise<User>;
    signOut(): Promise<void>;
    updateUser(userId: string, data: Partial<User>): Promise<User>;
    deleteUser(userId: string): Promise<void>;
    getUserById(userId: string): Promise<User | null>;
  }
  
  export interface SignUpData {
    email: string;
    password: string;
    name: string;
    role: 'vendor' | 'partner';
  }