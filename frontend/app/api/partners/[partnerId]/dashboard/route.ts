// app/api/partners/[partnerId]/dashboard/route.ts
import { getCurrentUser, requireRole } from '@/lib/auth';

export async function GET(req: Request) {
  // Your code never knows it's Clerk!
  const user = await requireRole('partner', 'admin');
  
  // Access control
  const partnerId = parseInt(req.url.split('/')[5]);
  if (user.role === 'partner' && user.partnerId !== partnerId) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Your business logic...
}