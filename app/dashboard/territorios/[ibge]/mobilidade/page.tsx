import React from 'react';
import WaitingData from '@/components/dashboard/territorios/WaitingData';

export default function mobilidadePage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-6">Mobilidade</h2>
      <WaitingData moduleName="Mobilidade" />
    </div>
  );
}
