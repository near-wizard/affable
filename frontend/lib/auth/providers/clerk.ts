// lib/auth/providers/clerk.ts
import { currentUser, auth as clerkAuth } from '@clerk/nextjs/server';
import { AuthProvider, User, SignUpData } from '../types';
import { db } from '@/lib/db';

export class ClerkAuthProvider implements AuthProvider {
  async getCurrentUser(): Promise<User | null> {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    // Map Clerk user to your User type
    return this.mapClerkUserToUser(clerkUser);
  }

  async signIn(email: string, password: string): Promise<User> {
    // Clerk handles this via their UI components
    throw new Error('Use Clerk UI components for sign in');
  }

  async signUp(data: SignUpData): Promise<User> {
    // Clerk handles this via their UI components
    throw new Error('Use Clerk UI components for sign up');
  }

  async signOut(): Promise<void> {
    const { signOut } = await import('@clerk/nextjs/server');
    await signOut();
  }

  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    const { clerkClient } = await import('@clerk/nextjs/server');
    await clerkClient.users.updateUser(userId, {
      firstName: data.name?.split(' ')[0],
      lastName: data.name?.split(' ')[1],
    });
    
    // Update your database
    await db.query(`
      UPDATE users SET name = $1, updated_at = NOW()
      WHERE clerk_id = $2
    `, [data.name, userId]);

    return this.getUserById(userId) as Promise<User>;
  }

  async deleteUser(userId: string): Promise<void> {
    const { clerkClient } = await import('@clerk/nextjs/server');
    await clerkClient.users.deleteUser(userId);
    
    // Clean up your database
    await db.query('DELETE FROM users WHERE clerk_id = $1', [userId]);
  }

  async getUserById(userId: string): Promise<User | null> {
    const { clerkClient } = await import('@clerk/nextjs/server');
    const clerkUser = await clerkClient.users.getUser(userId);
    return this.mapClerkUserToUser(clerkUser);
  }

  private async mapClerkUserToUser(clerkUser: any): Promise<User> {
    // Get additional data from YOUR database
    const result = await db.query(`
      SELECT role, vendor_id, partner_id 
      FROM users 
      WHERE clerk_id = $1
    `, [clerkUser.id]);

    const userData = result.rows[0];

    return {
      id: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
      role: userData?.role || 'partner',
      vendorId: userData?.vendor_id,
      partnerId: userData?.partner_id,
      imageUrl: clerkUser.imageUrl,
      emailVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
      createdAt: new Date(clerkUser.createdAt),
    };
  }
}