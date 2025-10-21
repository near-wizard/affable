// app/api/partners/[partnerId]/dashboard/route.ts
import { getCurrentUser, requireRole } from '@/lib/auth';

export async function GET(req: Request) {
  // Your code never knows it's Clerk!
  const user = await requireRole('vendor', 'admin');
  
  // Access control
  const vendorId = parseInt(req.url.split('/')[5]);
  if (user.role === 'vendor' && user.vendorId !== vendorId) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Your business logic...
}