'use client';

import React, { useState } from 'react';
import { Bug } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BugReportModal } from './bug-report-modal';
import type { DiagnosticData } from '@/lib/bug-report-utils';

interface BugReportButtonProps {
  diagnosticData: {
    consoleLogs: any[];
    networkRequests: any[];
  };
}

export function BugReportButton({ diagnosticData }: BugReportButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsModalOpen(true)}
              className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all duration-200 flex items-center justify-center hover:scale-110 active:scale-95"
              aria-label="Report a bug"
            >
              <Bug size={24} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            Report a bug
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <BugReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        diagnosticData={diagnosticData}
      />
    </>
  );
}
