/**
 * LicensesRunRateWidget - V8 Design System
 * Displays monthly and yearly software license run rates with next renewal
 */

import { CreditCard, Calendar } from 'lucide-react';
import { useSoftwareLicenses } from '@/modules/budget/hooks/useSoftwareLicenses';
import { format } from 'date-fns';

export function LicensesRunRateWidget() {
  const { data: licenses = [], isLoading } = useSoftwareLicenses();

  const totalAnnualCost = licenses.reduce((sum, l) => sum + (l.annual_cost || 0), 0);
  const monthlyRunRate = totalAnnualCost / 12;
  const licenseCount = licenses.length;

  // Find next upcoming renewal date
  const today = new Date();
  const upcomingRenewals = licenses
    .filter(l => l.renewal_date && new Date(l.renewal_date) >= today)
    .sort((a, b) => new Date(a.renewal_date!).getTime() - new Date(b.renewal_date!).getTime());
  const nextRenewal = upcomingRenewals[0]?.renewal_date;

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${Math.round(value / 1000).toLocaleString()}K`;
    }
    return value.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="ct-licenses-widget">
        <div className="ct-licenses-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="ct-licenses-widget">
      <div className="ct-licenses-header">
        <div className="ct-licenses-icon">
          <CreditCard size={20} />
        </div>
        <div className="ct-licenses-title">
          <span className="ct-licenses-label">Software Licenses</span>
          <span className="ct-licenses-count">{licenseCount} active</span>
        </div>
      </div>
      
      <div className="ct-licenses-value">
        <span className="ct-licenses-currency">ریال</span>
        <span>{formatCurrency(monthlyRunRate)}</span>
        <span className="ct-licenses-period">/mo</span>
      </div>

      <div className="ct-licenses-footer">
        <div className="ct-licenses-yearly">
          <span className="ct-licenses-yearly-label">Yearly</span>
          <span className="ct-licenses-yearly-value">
            <span className="ct-licenses-currency">ریال</span> {formatCurrency(totalAnnualCost)}
          </span>
        </div>
        {nextRenewal && (
          <div className="ct-licenses-renewal">
            <Calendar size={12} />
            <span>Next: {format(new Date(nextRenewal), 'MMM d')}</span>
          </div>
        )}
      </div>
    </div>
  );
}