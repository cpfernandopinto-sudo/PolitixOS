import React from 'react';
import WaitingData from '@/components/dashboard/territorios/WaitingData';

export default function ambientepoliticoPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-6">Ambiente Político</h2>
      <WaitingData moduleName="Ambiente Político" />
    </div>
  );
}
