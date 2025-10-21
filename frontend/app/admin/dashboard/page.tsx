'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

export type SuspiciousActivityItem = {
  type: string
  entity: string
  detail: string
  action: string
}

export type PayoutItem = {
  partner: string
  amount: string
  status: string
  action: string
}

export type CampaignContentItem = {
  campaign: string
  contentPiece: string
  clicks: number
  conversions: number
  revenue: string
}

export type PartnerOverviewItem = {
  partner: string
  campaigns: number
  totalClicks: number
  totalConversions: number
  totalRevenue: string
}

export type AuditLogItem = {
  timestamp: string
  entity: string
  action: string
  admin: string
  reason: string
}

export type AdminDashboardData = {
  suspiciousActivity: SuspiciousActivityItem[]
  payouts: PayoutItem[]
  topCampaignContent: CampaignContentItem[]
  partnerOverview: PartnerOverviewItem[]
  auditLogs: AuditLogItem[]
}

// Dummy function that returns the data
export function getAdminDashboardData(): AdminDashboardData {
  return {
    suspiciousActivity: [
      { type: 'High CTR Link', entity: 'link_abc123', detail: '500 clicks in 5 min', action: 'Investigate' },
      { type: 'Duplicate Partner Account', entity: 'partner_xyz', detail: 'Same IP/email', action: 'Suspend' },
      { type: 'Unusual Conversion Spike', entity: 'campaign_23', detail: '$5000 revenue in 10 min', action: 'Review' },
    ],
    payouts: [
      { partner: 'partner_xyz', amount: '$500', status: 'Pending', action: 'Process' },
      { partner: 'partner_abc', amount: '$1,200', status: 'Failed', action: 'Retry' },
      { partner: 'partner_def', amount: '$750', status: 'Completed', action: '—' },
    ],
    topCampaignContent: [
      { campaign: 'Campaign 23', contentPiece: 'Video Ad 1', clicks: 1234, conversions: 56, revenue: '$450' },
      { campaign: 'Campaign 45', contentPiece: 'Tweet 42', clicks: 980, conversions: 42, revenue: '$320' },
      { campaign: 'Campaign 12', contentPiece: 'Email Template A', clicks: 1110, conversions: 65, revenue: '$540' },
    ],
    partnerOverview: [
      { partner: 'partner_xyz', campaigns: 3, totalClicks: 3450, totalConversions: 120, totalRevenue: '$1,200' },
      { partner: 'partner_abc', campaigns: 2, totalClicks: 2980, totalConversions: 105, totalRevenue: '$980' },
      { partner: 'partner_def', campaigns: 4, totalClicks: 4120, totalConversions: 150, totalRevenue: '$1,500' },
    ],
    auditLogs: [
      { timestamp: '2025-10-11 14:12', entity: 'partner_xyz', action: 'Suspended', admin: 'admin_john', reason: 'Duplicate account detected' },
      { timestamp: '2025-10-11 13:45', entity: 'campaign_23', action: 'Paused', admin: 'admin_sarah', reason: 'Unusual spike in conversions' },
      { timestamp: '2025-10-11 12:30', entity: 'link_abc123', action: 'Flagged', admin: 'admin_john', reason: 'High CTR detected' },
    ],
  }
}

export default function AdminDashboard() {
  const data: AdminDashboardData = getAdminDashboardData()

  return (
    <div className="p-6 space-y-6">

      {/* Suspicious Activity */}
      <Card>
        <CardHeader>
         Suspicious Activity
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.suspiciousActivity.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.entity}</TableCell>
                  <TableCell>{item.detail}</TableCell>
                  <TableCell>{item.action}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payouts */}
      <Card>
        <CardHeader >Payouts</CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.payouts.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>{item.partner}</TableCell>
                  <TableCell>{item.amount}</TableCell>
                  <TableCell>{item.status}</TableCell>
                  <TableCell>{item.action}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Campaigns & Content */}
      <Card>
      <CardHeader >Top Campaigns & Content</CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Content Piece</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Conversions</TableHead>
                <TableHead>Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topCampaignContent.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>{item.campaign}</TableCell>
                  <TableCell>{item.contentPiece}</TableCell>
                  <TableCell>{item.clicks}</TableCell>
                  <TableCell>{item.conversions}</TableCell>
                  <TableCell>{item.revenue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Partner Overview */}
      <Card>
        <CardHeader >Top Performing Partners</CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Campaigns</TableHead>
                <TableHead>Total Clicks</TableHead>
                <TableHead>Total Conversions</TableHead>
                <TableHead>Total Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.partnerOverview.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>{item.partner}</TableCell>
                  <TableCell>{item.campaigns}</TableCell>
                  <TableCell>{item.totalClicks}</TableCell>
                  <TableCell>{item.totalConversions}</TableCell>
                  <TableCell>{item.totalRevenue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card>
        <CardHeader title="Recent Audit Logs" />
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.auditLogs.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>{item.timestamp}</TableCell>
                  <TableCell>{item.entity}</TableCell>
                  <TableCell>{item.action}</TableCell>
                  <TableCell>{item.admin}</TableCell>
                  <TableCell>{item.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
