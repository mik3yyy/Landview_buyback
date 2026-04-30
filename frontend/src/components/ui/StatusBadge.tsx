import React from 'react';
import { getStatusLabel } from '../../utils/formatters';

interface Props {
  status: string;
  daysUntilMaturity?: number;
}

export default function StatusBadge({ status, daysUntilMaturity }: Props) {
  const isOverdue = (status === 'active' || status === 'extended') &&
    daysUntilMaturity !== undefined && daysUntilMaturity < 0;

  if (isOverdue) {
    return (
      <span className="badge-overdue">Overdue</span>
    );
  }

  const classMap: Record<string, string> = {
    pending_review: 'bg-purple-100 text-purple-700 text-xs font-medium px-2.5 py-0.5 rounded-full',
    active: 'badge-active',
    completed: 'badge-completed',
    extended: 'badge-extended',
    payment_initiated: 'badge-payment_initiated',
  };

  return (
    <span className={classMap[status] || 'badge-active'}>
      {getStatusLabel(status)}
    </span>
  );
}
