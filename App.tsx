
import React, { useState, useRef } from 'react';
import { BrainCircuit, Sparkles, Play, RefreshCw, Database, Upload, Table as TableIcon } from 'lucide-react';
import { analyzeDataset } from './services/geminiService';
import { AnalysisView } from './components/AnalysisView';
import { DEFAULT_INPUT } from './constants';
import { AnalysisResult, LoadingState } from './types';

const App: React.FC = () => {
  const [input, setInput] = useState<string>(DEFAULT_INPUT);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = async () => {
    if (!input.trim()) return;

    setLoadingState(LoadingState.ANALYZING);
    setError(null);
    setResult(null);

    try {
      const data = await analyzeDataset(input);
      setResult(data);
      setLoadingState(LoadingState.COMPLETE);
    } catch (err) {
      setError("Failed to generate analysis. Please check your API key and try again.");
      setLoadingState(LoadingState.ERROR);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
      
      if (lines.length === 0) {
        setError("The uploaded CSV file appears to be empty.");
        return;
      }

      // Basic CSV parsing
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      setCsvHeaders(headers);
      
      // Parse up to 50 rows for data preview
      const parsedRows = lines.slice(1, 51).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const rowObject: any = {};
        headers.forEach((h, i) => {
          rowObject[h] = values[i] || '';
        });
        return rowObject;
      });
      setRawData(parsedRows);

      // Construct a Prompt that includes ACTUAL data samples so Gemini can calculate percentages
      // We pass the first 20 rows as text context
      const sampleText = lines.slice(0, 25).join('\n');
      
      const description = `Analyze this raw CSV data:\n\n${sampleText}\n\nTask: Identify the data type, calculate percentage breakdowns of categorical columns (like Status), and provide a summary.`;

      setInput(description);
      setError(null);
    };

    reader.onerror = () => {
      setError("Failed to read the file.");
    };

    reader.readAsText(file);
    event.target.value = ''; // Reset
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-indigo-500/30">
      {/* Navbar */}
      <header className="fixed top-0 w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg shadow-lg shadow-indigo-500/20">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              Genius Co-Pilot
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Gemini 2.5 Flash Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        {/* Intro */}
        <div className="mb-8 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight">
            Instant Data Insights
          </h2>
          <p className="text-slate-400 text-lg">
            Upload your CSV to see percentages, status breakdowns, and strategic summaries instantly.
          </p>
        </div>

        {/* Input Area */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-1 shadow-xl mb-8">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full h-32 bg-slate-900/50 text-slate-200 p-6 rounded-xl border-none focus:ring-2 focus:ring-indigo-500/50 resize-none font-mono text-xs leading-relaxed opacity-70"
              placeholder="Paste data samples or upload a CSV..."
            />
            <div className="absolute top-4 right-4">
               <Database className="w-5 h-5 text-slate-600" />
            </div>
          </div>
          
          <div className="p-3 flex items-center justify-between bg-slate-800/50 rounded-b-xl border-t border-slate-700/50">
            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-lg transition-colors text-sm font-medium border border-slate-600/50 hover:border-slate-500"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload CSV Data</span>
              <span className="sm:hidden">CSV</span>
            </button>

            <button
              onClick={handleAnalyze}
              disabled={loadingState === LoadingState.ANALYZING}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-white transition-all
                ${loadingState === LoadingState.ANALYZING 
                  ? 'bg-slate-700 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 active:transform active:scale-95'}
              `}
            >
              {loadingState === LoadingState.ANALYZING ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            {error}
          </div>
        )}

        {/* Results Area */}
        {result && loadingState === LoadingState.COMPLETE && (
          <AnalysisView 
            result={result} 
            rawData={rawData} 
            headers={csvHeaders} 
          />
        )}

        {/* Empty State / Hint */}
        {!result && loadingState !== LoadingState.ANALYZING && !error && rawData.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
              <TableIcon className="w-8 h-8 text-slate-600 ml-1" />
            </div>
            <h3 className="text-slate-500 font-medium">No Data Loaded</h3>
            <p className="text-slate-600 text-sm mt-1">Upload a file to see the magic.</p>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;
