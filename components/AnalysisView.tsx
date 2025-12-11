import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, Message } from '../types';
import { 
  LayoutDashboard, FileText, Table as TableIcon, 
  ArrowUp, ArrowDown, Minus, Target, TrendingUp, 
  Download, PieChart as PieIcon, BarChart3, LineChart as LineIcon,
  Send, Bot, User, MessageSquare
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { sendChatMessage } from '../services/geminiService';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface AnalysisViewProps {
  result: AnalysisResult;
  rawData: any[];
  headers: string[];
}

const COLORS = ['#0891b2', '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'];

export const AnalysisView: React.FC<AnalysisViewProps> = ({ result, rawData, headers }) => {
  const { summary, inferredType, keyMetrics, recommendation, charts } = result;
  
  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { role: 'assistant', content: `Hello! I've analyzed your ${inferredType} data. Ask me anything specific about it!`, timestamp: Date.now() }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // PDF Ref
  const reportRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Handle PDF Download
  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    
    const element = reportRef.current;
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2, // Higher resolution
        backgroundColor: '#030712', // Match dark theme background
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`VisionCSV_Report_${inferredType.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
      alert("Could not generate PDF. Please try again.");
    }
  };

  // Handle Chat Submit
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg: Message = { role: 'user', content: chatInput, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      // Prepare context: Summary + metrics
      const context = `
        Data Type: ${inferredType}.
        Summary: ${summary}.
        Key Metrics: ${keyMetrics.map(k => `${k.label}: ${k.value}`).join(', ')}.
        Strategic Goal: ${recommendation.goal} - ${recommendation.strategy}.
      `;
      
      const responseText = await sendChatMessage(
        chatMessages.map(m => ({ role: m.role, content: m.content })),
        userMsg.content,
        context
      );

      const aiMsg: Message = { role: 'assistant', content: responseText, timestamp: Date.now() };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: Message = { role: 'assistant', content: "Sorry, I'm having trouble connecting right now.", timestamp: Date.now() };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const renderChart = (chart: any, index: number) => {
    const CommonProps = {
      data: chart.data,
      margin: { top: 10, right: 30, left: 0, bottom: 0 }
    };

    return (
      <div key={index} className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-sm flex flex-col h-[300px]">
        <div className="mb-4">
          <h4 className="font-semibold text-slate-100 flex items-center gap-2">
            {chart.chartType === 'pie' ? <PieIcon className="w-4 h-4 text-pink-400" /> : <BarChart3 className="w-4 h-4 text-cyan-400" />}
            {chart.title}
          </h4>
          {chart.description && <p className="text-xs text-slate-300 mt-1">{chart.description}</p>}
        </div>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            {chart.chartType === 'line' ? (
              <LineChart {...CommonProps}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" vertical={false} />
                <XAxis dataKey={chart.xAxisKey} stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={{ stroke: '#475569' }} />
                <YAxis stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={{ stroke: '#475569' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#475569', color: '#f8fafc', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Line type="monotone" dataKey={chart.dataKey} stroke="#0ea5e9" strokeWidth={3} dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            ) : chart.chartType === 'area' ? (
              <AreaChart {...CommonProps}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" vertical={false} />
                <XAxis dataKey={chart.xAxisKey} stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={{ stroke: '#475569' }} />
                <YAxis stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={{ stroke: '#475569' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#475569', color: '#f8fafc', borderRadius: '8px' }} 
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey={chart.dataKey} stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
              </AreaChart>
            ) : chart.chartType === 'pie' ? (
              <PieChart>
                <Pie
                  data={chart.data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey={chart.dataKey || 'value'}
                >
                  {chart.data.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#475569', color: '#f8fafc', borderRadius: '8px' }} 
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Legend wrapperStyle={{ color: '#e2e8f0' }} />
              </PieChart>
            ) : (
              <BarChart {...CommonProps}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" vertical={false} />
                <XAxis dataKey={chart.xAxisKey} stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={{ stroke: '#475569' }} />
                <YAxis stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={{ stroke: '#475569' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#475569', color: '#f8fafc', borderRadius: '8px' }} 
                  cursor={{fill: '#334155', opacity: 0.4}} 
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Bar dataKey={chart.dataKey} fill="#0891b2" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* Report Container (Captured for PDF) */}
      <div ref={reportRef} className="space-y-6 bg-[#030712] p-4 -m-4 sm:p-0 sm:m-0">
        
        {/* Header Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-800/60 p-6 rounded-2xl border border-slate-700 shadow-sm">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Detected Context</h3>
            <p className="text-2xl font-bold text-white flex items-center gap-2">
              {inferredType}
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs border border-indigo-500/30">Auto-Detected</span>
            </p>
          </div>
          <button 
            onClick={handleDownloadPDF}
            className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors border border-slate-600 shadow-lg"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {keyMetrics.map((metric, idx) => (
            <div key={idx} className="bg-slate-800/80 p-5 rounded-xl border border-slate-700 hover:border-slate-500 transition-colors group">
              <p className="text-slate-300 text-sm font-medium mb-1 group-hover:text-slate-200 transition-colors">{metric.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{metric.value}</span>
                {metric.trend === 'up' && <ArrowUp className="w-4 h-4 text-emerald-400" />}
                {metric.trend === 'down' && <ArrowDown className="w-4 h-4 text-rose-400" />}
                {metric.trend === 'neutral' && <Minus className="w-4 h-4 text-slate-400" />}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Executive Summary */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg flex flex-col">
            <div className="bg-slate-900/80 px-6 py-4 border-b border-slate-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <h4 className="font-semibold text-slate-100">Executive Summary</h4>
            </div>
            <div className="p-6">
              <p className="text-slate-200 leading-relaxed text-sm">
                {summary}
              </p>
            </div>
          </div>

          {/* Strategic Goal Recommendation */}
          <div className="bg-gradient-to-br from-indigo-950 to-slate-900 rounded-xl border border-indigo-500/30 overflow-hidden shadow-lg flex flex-col relative">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Target className="w-24 h-24 text-indigo-400" />
            </div>
            <div className="bg-slate-900/60 px-6 py-4 border-b border-indigo-500/20 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <h4 className="font-semibold text-slate-100">Strategic Goal</h4>
            </div>
            <div className="p-6 flex flex-col justify-center h-full z-10">
              <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-2">Recommended Target (Next Quarter)</h5>
              <p className="text-2xl font-bold text-white mb-4">{recommendation?.goal || "N/A"}</p>
              
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Action Plan</h5>
              <p className="text-slate-200 text-sm font-medium">{recommendation?.strategy || "Review data to formulate strategy."}</p>
            </div>
          </div>
        </div>
        
        {/* Visual Insights Section */}
        {charts && charts.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 px-1">
              <PieIcon className="w-5 h-5 text-cyan-400" />
              Visual Insights
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {charts.map((chart, idx) => renderChart(chart, idx))}
            </div>
          </div>
        )}

        {/* Data Table Section */}
        {rawData.length > 0 && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
              <div className="bg-slate-900/80 px-6 py-4 border-b border-slate-700 flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-emerald-400" />
              <h4 className="font-semibold text-slate-100">Raw Data Preview</h4>
              <span className="text-xs text-slate-400 ml-auto">First {rawData.length} rows</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs uppercase bg-slate-900/90 text-slate-300 font-semibold">
                  <tr>
                    {headers.map((header) => (
                      <th key={header} className="px-6 py-3 font-semibold tracking-wider whitespace-nowrap border-b border-slate-700">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {rawData.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-700/50 transition-colors">
                      {headers.map((header) => (
                        <td key={`${i}-${header}`} className="px-6 py-3 whitespace-nowrap text-slate-200">
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

      {/* Chat Interface (Outside of PDF Report Ref) */}
      <div className="bg-slate-800/80 rounded-2xl border border-slate-700 overflow-hidden shadow-xl flex flex-col mt-8">
        <div className="bg-slate-900/80 px-6 py-4 border-b border-slate-700 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <h4 className="font-semibold text-slate-100">Chat with your Data</h4>
          <span className="text-xs text-slate-400 ml-auto hidden sm:inline">Ask questions about trends, outliers, or specific records</span>
        </div>
        
        {/* Messages Area */}
        <div className="h-[300px] overflow-y-auto p-4 space-y-4 bg-[#0B0F19]">
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`
                max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed flex gap-3 shadow-md
                ${msg.role === 'user' 
                  ? 'bg-cyan-600 text-white rounded-br-none' 
                  : 'bg-slate-800 text-slate-100 border border-slate-600 rounded-bl-none'}
              `}>
                 <div className="mt-0.5 shrink-0">
                    {msg.role === 'user' ? <User className="w-4 h-4 opacity-70" /> : <Bot className="w-4 h-4 text-cyan-400" />}
                 </div>
                 {msg.content}
              </div>
            </div>
          ))}
          {isChatLoading && (
             <div className="flex justify-start animate-pulse">
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl rounded-bl-none px-4 py-3 text-sm text-slate-300 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-cyan-500/50" />
                  Thinking...
                </div>
             </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleChatSubmit} className="p-4 bg-slate-900 border-t border-slate-700 flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask a question about your data..."
            className="flex-1 bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-400 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
          />
          <button 
            type="submit"
            disabled={!chatInput.trim() || isChatLoading}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center justify-center w-14 shadow-lg shadow-cyan-900/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};