'use client';

import { HelpCircle } from 'lucide-react';
import { useState } from 'react';

interface ConversionValiditySelectProps {
  validityType: string;
  validityValue: number;
  onValidityTypeChange: (type: string) => void;
  onValidityValueChange: (value: number) => void;
  showDescription?: boolean;
}

const VALIDITY_TYPES = {
  one_time: {
    name: 'One Time',
    description: 'Partner receives commission only once for this conversion.',
    examples: ['Single purchase', 'One-time transaction'],
    icon: '🎯',
  },
  days: {
    name: 'Days',
    description: 'Partner receives commission for a specific number of days after conversion.',
    examples: ['7 days', '30 days', '90 days'],
    icon: '📅',
  },
  months: {
    name: 'Months',
    description: 'Partner receives commission for a specific number of months after conversion.',
    examples: ['1 month', '3 months', '12 months'],
    icon: '📆',
  },
  years: {
    name: 'Years',
    description: 'Partner receives commission for a specific number of years after conversion.',
    examples: ['1 year', '2 years', '5 years'],
    icon: '📊',
  },
  lifetime: {
    name: 'Lifetime',
    description: 'Partner receives commission for as long as the customer remains active.',
    examples: ['Recurring billing', 'Subscription model', 'Ongoing service'],
    icon: '♾️',
  },
};

export function ConversionValiditySelect({
  validityType,
  validityValue,
  onValidityTypeChange,
  onValidityValueChange,
  showDescription = true,
}: ConversionValiditySelectProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const currentType = VALIDITY_TYPES[validityType as keyof typeof VALIDITY_TYPES];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="block text-sm font-medium text-foreground">
          Conversion Validity Period *
        </label>
        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <HelpCircle size={16} />
          </button>
          {showTooltip && (
            <div className="absolute left-0 top-6 z-50 w-72 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg">
              <p className="font-semibold mb-2">How conversion validity works:</p>
              <p>
                After a customer makes a purchase, the partner continues to receive
                commission for the duration you specify here. This applies to both
                one-time purchases and recurring subscriptions. The platform fee is
                always deducted from partner payouts.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">
            Validity Type
          </label>
          <select
            value={validityType}
            onChange={(e) => onValidityTypeChange(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            {Object.entries(VALIDITY_TYPES).map(([key, type]) => (
              <option key={key} value={key}>
                {type.icon} {type.name}
              </option>
            ))}
          </select>
        </div>

        {validityType !== 'lifetime' && validityType !== 'one_time' && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Duration
            </label>
            <input
              type="number"
              min="1"
              max={validityType === 'days' ? 365 : validityType === 'months' ? 60 : 20}
              value={validityValue}
              onChange={(e) => onValidityValueChange(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter duration"
            />
          </div>
        )}
      </div>

      {showDescription && currentType && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
          <p className="text-sm text-slate-700">{currentType.description}</p>
          <div className="text-xs text-slate-600">
            <p className="font-semibold text-amber-700 mb-1">Examples:</p>
            <ul className="space-y-1">
              {currentType.examples.map((example, i) => (
                <li key={i}>• {example}</li>
              ))}
            </ul>
          </div>
          {validityType !== 'lifetime' && validityType !== 'one_time' && (
            <div className="pt-2 border-t border-amber-200 text-xs text-amber-700 font-medium">
              Currently: {validityValue} {validityType === 'days' ? 'day(s)' : validityType === 'months' ? 'month(s)' : 'year(s)'}
            </div>
          )}
          {validityType === 'one_time' && (
            <div className="pt-2 border-t border-amber-200 text-xs text-amber-700 font-medium">
              Partner earns commission once per conversion
            </div>
          )}
          {validityType === 'lifetime' && (
            <div className="pt-2 border-t border-amber-200 text-xs text-amber-700 font-medium">
              Partner earns commission indefinitely as long as customer is active
            </div>
          )}
        </div>
      )}
    </div>
  );
}
