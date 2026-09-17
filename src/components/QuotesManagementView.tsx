import React from 'react';
import { Filament, Supply } from '../types';
import { SuppliersView } from './SuppliersView';

interface QuotesManagementViewProps {
  filaments: Filament[];
  supplies: Supply[];
  onRefreshData?: () => void;
  theme?: string;
  initialSection?: 'batch_quotes' | 'quotes' | 'purchases';
  onNavigateToSettings?: (subTab?: string) => void;
}

export const QuotesManagementView: React.FC<QuotesManagementViewProps> = ({
  filaments,
  supplies,
  onRefreshData,
  theme = 'standard',
  initialSection = 'batch_quotes',
  onNavigateToSettings,
}) => {
  return (
    <div className="space-y-6">
      <SuppliersView
        filaments={filaments}
        supplies={supplies}
        onRefreshData={onRefreshData}
        theme={theme}
        mode="procurement_only"
        initialSection={initialSection}
        onNavigateToSettings={onNavigateToSettings}
      />
    </div>
  );
};
