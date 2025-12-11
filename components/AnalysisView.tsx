
import React from 'react';
import { AnalysisResult } from '../types';
import { LayoutDashboard, FileText, Table as TableIcon, ArrowUp, ArrowDown, Minus, Target, TrendingUp } from 'lucide-react';

interface AnalysisViewProps {
  result: AnalysisResult;
  rawData: any[];
  headers: string[];
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ result, rawData, headers }) => {
  const { summary, inferredType, keyMetrics, recommendation } = result;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-sm">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Detected Context</h3>
          <p className="text-2xl font-bold text-white flex items-center gap-2">
            {inferredType}
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs border border-indigo-500/30">Auto-Detected</span>
          </p>
        </div>
      </div>

      <div className="space-y-6">
          
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {keyMetrics.map((metric, idx) => (
            <div key={idx} className="bg-slate-800/80 p-5 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
              <p className="text-slate-400 text-sm font-medium mb-1">{metric.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-100">{metric.value}</span>
                {metric.trend === 'up' && <ArrowUp className="w-4 h-4 text-emerald-400" />}
                {metric.trend === 'down' && <ArrowDown className="w-4 h-4 text-rose-400" />}
                {metric.trend === 'neutral' && <Minus className="w-4 h-4 text-slate-500" />}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Executive Summary */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg flex flex-col">
            <div className="bg-slate-900/50 px-6 py-4 border-b border-slate-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <h4 className="font-semibold text-slate-200">Executive Summary</h4>
            </div>
            <div className="p-6">
              <p className="text-slate-300 leading-relaxed text-sm">
                {summary}
              </p>
            </div>
          </div>

          {/* Strategic Goal Recommendation */}
          <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 rounded-xl border border-indigo-500/30 overflow-hidden shadow-lg flex flex-col relative">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Target className="w-24 h-24 text-indigo-400" />
            </div>
            <div className="bg-slate-900/50 px-6 py-4 border-b border-indigo-500/20 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <h4 className="font-semibold text-slate-200">Strategic Goal</h4>
            </div>
            <div className="p-6 flex flex-col justify-center h-full z-10">
              <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-2">Recommended Target (Next Quarter)</h5>
              <p className="text-2xl font-bold text-white mb-4">{recommendation?.goal || "N/A"}</p>
              
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Action Plan</h5>
              <p className="text-slate-300 text-sm">{recommendation?.strategy || "Review data to formulate strategy."}</p>
            </div>
          </div>
        </div>

        {/* Data Table Section */}
        {rawData.length > 0 && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
              <div className="bg-slate-900/50 px-6 py-4 border-b border-slate-700 flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-emerald-400" />
              <h4 className="font-semibold text-slate-200">Raw Data Preview</h4>
              <span className="text-xs text-slate-500 ml-auto">First {rawData.length} rows</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-400">
                <thead className="text-xs uppercase bg-slate-900/50 text-slate-400">
                  <tr>
                    {headers.map((header) => (
                      <th key={header} className="px-6 py-3 font-medium tracking-wider whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {rawData.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-700/30 transition-colors">
                      {headers.map((header) => (
                        <td key={`${i}-${header}`} className="px-6 py-3 whitespace-nowrap text-slate-300">
                          {row[header]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
