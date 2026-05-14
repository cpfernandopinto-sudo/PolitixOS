import React from 'react';
import clsx from 'clsx';

interface BadgeStatusProps {
  type: 'sentimento' | 'risco' | 'crise';
  value: string | boolean;
}

export default function BadgeStatus({ type, value }: BadgeStatusProps) {
  let baseStyle = "px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center justify-center w-max";
  let colorStyle = "";
  const normalizedValue = value
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (type === 'sentimento') {
    switch (value) {
      case 'positivo':
        colorStyle = "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30";
        break;
      case 'neutro':
        colorStyle = "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30";
        break;
      case 'negativo':
        colorStyle = "bg-[#FF3B3B]/10 text-[#FF3B3B] border-[#FF3B3B]/30 shadow-[0_0_8px_rgba(255,59,59,0.2)]";
        break;
    }
  } else if (type === 'risco') {
    switch (normalizedValue) {
      case 'baixo':
        colorStyle = "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30";
        break;
      case 'medio':
        colorStyle = "bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/30";
        break;
      case 'alto':
      case 'critico':
        colorStyle = "bg-[#FF3B3B]/10 text-[#FF3B3B] border-[#FF3B3B]/30 shadow-[0_0_8px_rgba(255,59,59,0.2)]";
        break;
    }
  } else if (type === 'crise') {
    if (value) {
      colorStyle = "bg-[#FF3B3B] text-white border-[#FF3B3B] animate-pulse glow-danger";
      value = "Ativa";
    } else {
      colorStyle = "bg-gray-500/10 text-gray-400 border-gray-500/30";
      value = "Não";
    }
  }

  return (
    <span className={clsx(baseStyle, colorStyle)}>
      {typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : value.toString().charAt(0).toUpperCase() + value.toString().slice(1)}
    </span>
  );
}
