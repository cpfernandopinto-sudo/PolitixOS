"use client";

import React, { useState } from 'react';
import { EvidenceTrace, InsightObservationType } from '@/lib/territorios/types';
import { 
  Database, AlertCircle, FileSearch, CheckCircle2,
  CalendarDays, Tag, ShieldCheck, HelpCircle, 
  ChevronRight, X, FlaskConical, Target, BrainCircuit
} from 'lucide-react';

// ---------------------------------------------------------
// BADGES
// ---------------------------------------------------------

export function ConfidenceBadge({ level, reasoning }: { level: 'ALTA' | 'MÉDIA' | 'BAIXA'; reasoning?: string }) {
  const isHigh = level === 'ALTA';
  const isMed = level === 'MÉDIA';
  
  return (
    <div className={`group relative inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${
      isHigh ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
      isMed ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
      'text-rose-400 border-rose-500/30 bg-rose-500/10'
    }`}>
      <ShieldCheck size={12} />
      <span>{level}</span>

      {reasoning && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#0B0F19] border border-white/10 rounded-lg text-xs font-medium text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 normal-case tracking-normal">
          <span className="block font-bold text-slate-400 mb-1 uppercase tracking-widest text-[9px]">Justificativa</span>
          {reasoning}
        </div>
      )}
    </div>
  );
}

export function ObservationTypeBadge({ type }: { type: InsightObservationType }) {
  const config = {
    'FATO': { icon: Target, color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
    'INTERPRETAÇÃO': { icon: BrainCircuit, color: 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10' },
    'HIPÓTESE': { icon: FlaskConical, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  }[type];

  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${config.color}`}>
      <Icon size={12} />
      <span>{type}</span>
    </div>
  );
}

export function SourceBadge({ source, dataset, onClick }: { source: string; dataset?: string; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border border-slate-700 bg-slate-800/50 text-slate-300 hover:text-white hover:border-slate-500 transition-colors ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <Database size={12} className="text-cyan-500" />
      <span>{source}</span>
      {dataset && (
        <>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 truncate max-w-[150px]">{dataset}</span>
        </>
      )}
      {onClick && <ChevronRight size={12} className="text-slate-500 ml-1" />}
    </button>
  );
}

// ---------------------------------------------------------
// EVIDENCE DRAWER
// ---------------------------------------------------------

export function EvidenceDrawer({ 
  isOpen, 
  onClose, 
  evidence 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  evidence: EvidenceTrace | null 
}) {
  if (!isOpen || !evidence) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#020817]/80 backdrop-blur-sm z-40 transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-[#0B0F19] border-l border-white/5 z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-white/5 bg-[#0f172a]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <FileSearch className="text-cyan-400" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Trilha de Auditoria</h3>
              <p className="text-xs font-medium text-slate-400">Rastreabilidade do Indicador</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-8">
          
          {/* Source Box */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Database size={14} />
              Origem dos Dados
            </h4>
            
            <div className="bg-[#111726] border border-white/5 rounded-xl p-4 space-y-4">
              <div>
                <span className="block text-xs font-semibold text-slate-400 mb-1">Fonte Principal</span>
                <span className="text-sm font-bold text-white">{evidence.source}</span>
              </div>
              
              <div className="h-px w-full bg-white/5" />
              
              <div>
                <span className="block text-xs font-semibold text-slate-400 mb-1">Dataset Utilizado</span>
                <span className="text-sm font-medium text-slate-300">{evidence.dataset}</span>
              </div>
            </div>
          </div>

          {/* Temporal Box */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <CalendarDays size={14} />
              Temporalidade
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#111726] border border-white/5 rounded-xl p-4">
                <span className="block text-xs font-semibold text-slate-400 mb-1">Período Referência</span>
                <span className="text-sm font-bold text-white">{evidence.period}</span>
              </div>
              <div className="bg-[#111726] border border-white/5 rounded-xl p-4">
                <span className="block text-xs font-semibold text-slate-400 mb-1">Última Atualização</span>
                <span className="text-sm font-bold text-white">{evidence.lastUpdated}</span>
              </div>
            </div>
          </div>

          {/* Meta Box */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Tag size={14} />
              Metadados
            </h4>
            
            <div className="bg-[#111726] border border-white/5 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Nível de Confiança</span>
                <ConfidenceBadge level={evidence.confidence} />
              </div>
              
              {evidence.indicatorUsed && (
                <>
                  <div className="h-px w-full bg-white/5" />
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 mb-1">Indicador Específico</span>
                    <span className="text-sm font-medium text-slate-300">{evidence.indicatorUsed}</span>
                  </div>
                </>
              )}
              
              {evidence.transformationApplied && (
                <>
                  <div className="h-px w-full bg-white/5" />
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 mb-1">Transformação Aplicada</span>
                    <span className="text-sm font-medium text-slate-300">{evidence.transformationApplied}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Methodology */}
          {evidence.methodology && (
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <HelpCircle size={14} />
                Nota Metodológica
              </h4>
              
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
                <p className="text-sm text-slate-300 leading-relaxed">
                  {evidence.methodology}
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-5 md:p-6 border-t border-white/5 bg-[#0f172a]/50">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400/80 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
            <CheckCircle2 size={14} />
            Evidência verificada e alinhada com as diretrizes do PolitixOS.
          </div>
        </div>
      </div>
    </>
  );
}
