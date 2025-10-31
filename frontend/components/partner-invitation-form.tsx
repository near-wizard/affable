'use client';

import { Mail, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { useState } from 'react';

interface PartnerInvitationFormProps {
  campaignId: string | number;
  campaignName: string;
  onSuccess?: () => void;
}

export function PartnerInvitationForm({
  campaignId,
  campaignName,
  onSuccess,
}: PartnerInvitationFormProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<null | 'success' | 'error'>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setStatus('error');
      setStatusMessage('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      // API call to invite partner
      const response = await fetch(
        `/api/campaigns/${campaignId}/invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            partner_email: email,
            invitation_message: message,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send invitation');
      }

      setStatus('success');
      setStatusMessage(`Invitation sent to ${email}`);
      setEmail('');
      setMessage('');

      // Call onSuccess callback after 2 seconds
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (error) {
      setStatus('error');
      setStatusMessage(
        error instanceof Error ? error.message : 'Failed to send invitation'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-foreground mb-2">Invite Partner</h3>
        <p className="text-sm text-muted-foreground">
          Send an invitation to a partner to join this campaign ({campaignName})
        </p>
      </div>

      {status === 'success' && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
          <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700">{statusMessage}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{statusMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Partner Email Address *
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              placeholder="partner@example.com"
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Personal Message (Optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isLoading}
            placeholder="Tell them why this is a great opportunity..."
            rows={4}
            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground mt-1">
            This message will be included in the invitation email
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            <strong>What happens next:</strong> Your partner will receive an email with:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Campaign details and commission information</li>
              <li>Your company contact information</li>
              <li>A direct signup link</li>
              <li>Their personal invitation message</li>
            </ul>
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading || !email}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Sending...
            </>
          ) : (
            <>
              <Send size={16} />
              Send Invitation
            </>
          )}
        </button>
      </form>
    </div>
  );
}
