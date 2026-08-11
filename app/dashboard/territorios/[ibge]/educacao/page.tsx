import React from 'react';
import WaitingData from '@/components/dashboard/territorios/WaitingData';

export default function educacaoPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-6">Educação</h2>
      <WaitingData moduleName="Educação" />
    </div>
  );
}
