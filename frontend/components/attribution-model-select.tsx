'use client';

import { HelpCircle } from 'lucide-react';
import { useState } from 'react';

interface AttributionModelSelectProps {
  value: string;
  onChange: (value: string) => void;
  showDescription?: boolean;
}

const ATTRIBUTION_MODELS = {
  last_click: {
    name: 'Last Click (Default)',
    description: 'Give 100% credit to the last affiliate click before conversion. Simple and easy to understand.',
    pros: ['Simple', 'Incentivizes final touchpoint', 'Easy to explain'],
    cons: ['May not credit earlier marketing efforts'],
  },
  first_click: {
    name: 'First Click',
    description: 'Give 100% credit to the first affiliate link clicked. Good for top-of-funnel awareness.',
    pros: ['Credits awareness efforts', 'Good for new campaigns'],
    cons: ['May overvalue initial contact'],
  },
  linear: {
    name: 'Linear',
    description: 'Distribute credit equally across all affiliate touchpoints. Fair middle ground.',
    pros: ['Balanced approach', 'Fair to all touchpoints'],
    cons: ['May not reflect actual conversion drivers'],
  },
  time_decay: {
    name: 'Time Decay',
    description: 'Give more credit to recent clicks, less to older ones. Weights recent engagement more heavily.',
    pros: ['Reflects actual customer journey', 'Values recent engagement'],
    cons: ['More complex to explain'],
  },
};

export function AttributionModelSelect({
  value,
  onChange,
  showDescription = true,
}: AttributionModelSelectProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const currentModel = ATTRIBUTION_MODELS[value as keyof typeof ATTRIBUTION_MODELS];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="block text-sm font-medium text-foreground">
          Attribution Model *
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
            <div className="absolute left-0 top-6 z-50 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg">
              <p className="font-semibold mb-2">How attribution works:</p>
              <p>When a customer clicks an affiliate link and later makes a purchase, the attribution model determines how much credit that partner gets. This affects their commission payout.</p>
            </div>
          )}
        </div>
      </div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
      >
        {Object.entries(ATTRIBUTION_MODELS).map(([key, model]) => (
          <option key={key} value={key}>
            {model.name}
          </option>
        ))}
      </select>

      {showDescription && currentModel && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <p className="text-sm text-slate-700">{currentModel.description}</p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-semibold text-green-700 mb-1">✓ Pros:</p>
              <ul className="space-y-1 text-slate-600">
                {currentModel.pros.map((pro, i) => (
                  <li key={i}>• {pro}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-amber-700 mb-1">⚠ Cons:</p>
              <ul className="space-y-1 text-slate-600">
                {currentModel.cons.map((con, i) => (
                  <li key={i}>• {con}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
