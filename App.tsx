import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, Settings, Code, X, Play, RefreshCw, CheckCircle2, ChevronDown, Check, ToggleLeft, ToggleRight, Loader2, UserCog, Briefcase } from 'lucide-react';
import { analyzeDataset } from './services/geminiService';
import { AnalysisView } from './components/AnalysisView';
import { DEFAULT_INPUT } from './constants';
import { AnalysisResult, LoadingState } from './types';

// CSV Configuration Interface
interface CsvConfig {
  delimiter: string;
  hasHeader: boolean;
  encoding: string;
  skipEmptyLines: boolean;
}

const PERSONAS = [
  { id: 'General Analyst', label: 'General Analyst', desc: 'Overview & general trends' },
  { id: 'Financial Auditor', label: 'Financial Auditor', desc: 'Profit, loss & margins' },
  { id: 'Marketing Strategist', label: 'Marketing Strategist', desc: 'Customer segments & conversion' },
  { id: 'Operations Manager', label: 'Operations Manager', desc: 'Efficiency & bottlenecks' },
  { id: 'Data Scientist', label: 'Data Scientist', desc: 'Distribution & outliers' },
];

const App: React.FC = () => {
  const [input, setInput] = useState<string>(DEFAULT_INPUT);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<string>(PERSONAS[0].id);
  
  // Upload Progress State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Active Config
  const [csvConfig, setCsvConfig] = useState<CsvConfig>({
    delimiter: 'auto',
    hasHeader: true,
    encoding: 'UTF-8',
    skipEmptyLines: true
  });

  // Temporary Config for Modal (allows Cancel/Apply pattern)
  const [tempConfig, setTempConfig] = useState<CsvConfig>(csvConfig);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Helper Functions ---

  const detectDelimiter = (text: string): string => {
    const candidates = [',', ';', '\t', '|'];
    const lines = text.split('\n').filter(l => l.trim().length > 0).slice(0, 5);
    if (lines.length === 0) return ',';

    let bestDelimiter = ',';
    let maxCount = 0;

    candidates.forEach(delim => {
      // Average count of delimiters per line
      const counts = lines.map(line => (line.split(delim).length - 1));
      const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
      
      // Heuristic: The delimiter should appear consistently and frequently
      // Check consistency (std dev or just simple uniformity?)
      // Simple: If it splits the line into > 1 part consistently
      if (avg > maxCount) {
        maxCount = avg;
        bestDelimiter = delim;
      }
    });

    return bestDelimiter;
  };

  // --- File Handling Logic ---

  const processFile = (file: File, config: CsvConfig = csvConfig) => {
    if (!file) return;
    
    // Update State
    setFileName(file.name);
    setCurrentFile(file);
    setResult(null); 
    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    const reader = new FileReader();
    
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    reader.onload = (e) => {
      let text = e.target?.result as string;
      
      // Handle Skip Empty Lines
      let lines = text.split(/\r\n|\n/);
      if (config.skipEmptyLines) {
        lines = lines.filter(line => line.trim() !== '');
      }
      
      if (lines.length === 0) {
        setError("The uploaded CSV file appears to be empty.");
        setIsUploading(false);
        return;
      }

      // Determine Delimiter
      let delimiter = config.delimiter;
      if (delimiter === 'auto') {
        delimiter = detectDelimiter(lines.slice(0, 10).join('\n'));
      } else if (delimiter === '\\t') {
        delimiter = '\t';
      }

      // Parse Headers
      let headers: string[] = [];
      let startRow = 0;

      if (config.hasHeader) {
        headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
        startRow = 1;
      } else {
        const firstRow = lines[0].split(delimiter);
        headers = firstRow.map((_, i) => `Column_${i + 1}`);
      }
      
      setCsvHeaders(headers);
      
      // Parse Rows (Preview Limit 50)
      const parsedRows = lines.slice(startRow, startRow + 50).map(line => {
        const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
        const rowObject: any = {};
        headers.forEach((h, i) => {
          rowObject[h] = values[i] || '';
        });
        return rowObject;
      });
      setRawData(parsedRows);

      // Prepare AI Context
      const sampleText = lines.slice(0, 25).join('\n');
      const description = `Analyze this raw CSV data:\n\n${sampleText}\n\nTask: Identify the data type, calculate percentage breakdowns of categorical columns, and provide a summary.`;

      setInput(description);
      setIsUploading(false);
    };

    reader.onerror = () => {
      setError("Failed to read the file.");
      setIsUploading(false);
    };

    // Use selected encoding
    reader.readAsText(file, config.encoding);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
    event.target.value = ''; // Reset
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      processFile(file);
    } else {
      setError("Please drop a valid .csv file.");
    }
  }, [csvConfig]);

  // --- Settings Logic ---

  const openSettingsModal = () => {
    setTempConfig({ ...csvConfig }); // Copy current to temp
    setIsSettingsOpen(true);
  };

  const applySettings = () => {
    setCsvConfig(tempConfig);
    setIsSettingsOpen(false);
    // Re-process file if one is loaded
    if (currentFile) {
      processFile(currentFile, tempConfig);
    }
  };

  // --- API Logic ---

  const handleAnalyze = async () => {
    if (!input.trim()) return;

    setLoadingState(LoadingState.ANALYZING);
    setError(null);
    setResult(null);

    try {
      const data = await analyzeDataset(input, selectedPersona);
      setResult(data);
      setLoadingState(LoadingState.COMPLETE);
    } catch (err) {
      setError("Failed to generate analysis. Please check your API key and try again.");
      setLoadingState(LoadingState.ERROR);
    }
  };

  const resetApp = () => {
    setResult(null);
    setFileName(null);
    setCurrentFile(null);
    setRawData([]);
    setInput(DEFAULT_INPUT);
    setLoadingState(LoadingState.IDLE);
    setUploadProgress(0);
    setIsUploading(false);
  };

  const openSourceCode = () => {
    window.open('https://github.com/mhassanmalikmhm/VisionCSV', '_blank');
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 selection:bg-cyan-500/30 overflow-x-hidden relative font-sans">
      
      {/* Background Gradients - Adjusted opacity for better contrast with text */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-cyan-600/10 blur-[130px] rounded-full pointer-events-none opacity-30 mix-blend-screen" />
      <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none opacity-20" />

      {/* Navbar */}
      <header className="fixed top-0 w-full bg-[#030712]/90 backdrop-blur-xl border-b border-slate-800 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo Area */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={resetApp}>
            {/* Custom Geometric Logo */}
            <div className="relative w-10 h-10 group-hover:scale-105 transition-transform duration-300">
               <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                <path d="M20 0L38 32H2L20 0Z" fill="url(#paint0_linear)" />
                <path d="M8 20L20 40L32 20" fill="#030712" />
                <path d="M20 12L28 26H12L20 12Z" fill="#22D3EE" />
                <defs>
                  <linearGradient id="paint0_linear" x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0EA5E9"/>
                    <stop offset="1" stopColor="#3B82F6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-white tracking-tight leading-none">Vision CSV</h1>
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mt-1">AI-Powered Insights</span>
            </div>
          </div>

          {/* Nav Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button 
              onClick={openSourceCode}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-200 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-600/50 rounded-lg transition-all"
            >
              <Code className="w-4 h-4" />
              Source Code
            </button>
            <button 
              onClick={openSettingsModal}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-800/40 rounded-lg transition-all"
            >
              <Settings className="w-4 h-4" />
              CSV Settings
            </button>
          </div>
        </div>
      </header>

      {/* CSV Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0B0F19] w-full max-w-md rounded-2xl border border-slate-600 shadow-2xl overflow-hidden relative ring-1 ring-cyan-500/20">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-[#0F1422]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <div className="p-1.5 bg-cyan-500/10 rounded-md border border-cyan-500/20">
                    <Settings className="w-4 h-4 text-cyan-400" />
                </div>
                CSV Settings
              </h3>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors hover:bg-slate-800 rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              
              {/* Delimiter Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Delimiter</label>
                <div className="relative">
                  <select
                    value={tempConfig.delimiter}
                    onChange={(e) => setTempConfig({...tempConfig, delimiter: e.target.value})}
                    className="w-full appearance-none bg-slate-900 border border-slate-600 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value=",">Comma (,)</option>
                    <option value=";">Semicolon (;)</option>
                    <option value="\t">Tab (\t)</option>
                    <option value="|">Pipe (|)</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Encoding Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Encoding</label>
                <div className="relative">
                  <select
                    value={tempConfig.encoding}
                    onChange={(e) => setTempConfig({...tempConfig, encoding: e.target.value})}
                    className="w-full appearance-none bg-slate-900 border border-slate-600 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer"
                  >
                    <option value="UTF-8">UTF-8 (Standard)</option>
                    <option value="ISO-8859-1">ISO-8859-1 (Latin-1)</option>
                    <option value="ASCII">ASCII</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Toggles Group */}
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700 space-y-4">
                
                {/* Header Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-200">First row is header</span>
                    <span className="text-xs text-slate-400">Use first row as column names</span>
                  </div>
                  <button 
                    onClick={() => setTempConfig({...tempConfig, hasHeader: !tempConfig.hasHeader})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0B0F19] ${tempConfig.hasHeader ? 'bg-cyan-600' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${tempConfig.hasHeader ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="h-px bg-slate-700 w-full" />

                {/* Empty Lines Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-200">Skip empty lines</span>
                    <span className="text-xs text-slate-400">Ignore blank rows in the file</span>
                  </div>
                  <button 
                    onClick={() => setTempConfig({...tempConfig, skipEmptyLines: !tempConfig.skipEmptyLines})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0B0F19] ${tempConfig.skipEmptyLines ? 'bg-cyan-600' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${tempConfig.skipEmptyLines ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#0F1422] border-t border-slate-700 flex justify-end gap-3">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={applySettings}
                className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="pt-32 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-h-[calc(100vh-80px)] flex flex-col">
        
        {/* If Results Exist, Show Analysis View */}
        {result ? (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={resetApp}
                className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-cyan-600 transition-colors border border-slate-700">
                  <Upload className="w-4 h-4" />
                </div>
                Upload New File
              </button>
              <div className="flex items-center gap-3">
                 <div className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-slate-300 text-xs font-medium flex items-center gap-2">
                  <UserCog className="w-3 h-3 text-cyan-400" />
                  {selectedPersona} Perspective
                 </div>
                 <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3" />
                  Analysis Complete
                </div>
              </div>
            </div>
            <AnalysisView 
              result={result} 
              rawData={rawData} 
              headers={csvHeaders} 
            />
          </div>
        ) : (
          /* Landing Page / Upload View */
          <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full animate-fade-in text-center">
            
            {/* Hero Text */}
            <h2 className="text-4xl sm:text-6xl font-black text-white mb-6 tracking-tight leading-tight">
              Analyze your CSV files with <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Vision CSV</span>
            </h2>
            
            <p className="text-slate-300 text-lg sm:text-xl max-w-2xl mb-12 leading-relaxed font-medium">
              Upload your data, choose your settings, and get intelligent insights and strategic goals instantly. <span className="text-cyan-400 font-bold">100% private</span> execution.
            </p>

            {/* Dropzone Card */}
            <div 
              className={`
                w-full max-w-3xl bg-[#0B0F19] rounded-3xl border-2 border-dashed transition-all duration-300 relative group overflow-hidden cursor-pointer
                ${isDragging 
                  ? 'border-cyan-500 bg-cyan-900/10 scale-[1.02]' 
                  : 'border-slate-700 hover:border-slate-500 hover:bg-[#111623]'}
              `}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => !fileName && !isUploading && fileInputRef.current?.click()}
            >
               {/* Decorative Glow */}
               <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              <div className="p-12 sm:p-20 flex flex-col items-center justify-center relative z-10">
                {isUploading ? (
                  // Uploading State
                  <div className="flex flex-col items-center animate-fade-in w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
                    <div className="w-20 h-20 bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-6 border border-cyan-500/30 relative">
                      <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                      <div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-full animate-pulse" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Reading File...</h3>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 mt-4 overflow-hidden border border-slate-600">
                       <div 
                         className="bg-cyan-500 h-full rounded-full transition-all duration-200 ease-out shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
                         style={{ width: `${uploadProgress}%` }}
                       />
                    </div>
                    <p className="text-slate-400 text-sm mt-3 font-mono">{uploadProgress}%</p>
                  </div>
                ) : fileName ? (
                   // File Selected State
                   <div className="animate-fade-in flex flex-col items-center w-full" onClick={(e) => e.stopPropagation()}>
                      <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/20">
                        <FileSpreadsheet className="w-10 h-10 text-emerald-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{fileName}</h3>
                      <p className="text-slate-300 text-sm mb-6">Ready for analysis</p>
                      
                      {/* Persona Selector */}
                      <div className="w-full max-w-sm mb-8 bg-slate-900/80 p-1.5 rounded-xl border border-slate-700 flex relative z-20">
                         <div className="relative w-full">
                           <select 
                             value={selectedPersona}
                             onChange={(e) => setSelectedPersona(e.target.value)}
                             className="w-full appearance-none bg-transparent text-slate-200 text-sm font-medium px-4 py-2.5 rounded-lg focus:outline-none cursor-pointer"
                           >
                              {PERSONAS.map(p => (
                                <option key={p.id} value={p.id} className="bg-[#0B0F19] text-slate-300">
                                  {p.label} - {p.desc}
                                </option>
                              ))}
                           </select>
                           <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                         </div>
                      </div>

                      <div className="flex gap-4">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setFileName(null); setCurrentFile(null); setRawData([]); setInput(DEFAULT_INPUT); }}
                          className="px-6 py-3 rounded-xl font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition-all border border-transparent hover:border-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAnalyze(); }}
                          disabled={loadingState === LoadingState.ANALYZING}
                          className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-semibold shadow-lg shadow-cyan-600/25 hover:shadow-cyan-600/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
                        >
                          {loadingState === LoadingState.ANALYZING ? (
                            <>
                              <RefreshCw className="w-5 h-5 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Play className="w-5 h-5 fill-current" />
                              Start Analysis
                            </>
                          )}
                        </button>
                      </div>
                   </div>
                ) : (
                  // Empty State
                  <>
                    <div className="w-20 h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-slate-700 group-hover:border-cyan-500/30 group-hover:shadow-[0_0_30px_-5px_rgba(34,211,238,0.2)]">
                      <Upload className="w-8 h-8 text-slate-300 group-hover:text-cyan-400 transition-colors" />
                    </div>
                    
                    <h3 className="text-xl font-semibold text-white mb-3">
                      Drag & drop your CSV file
                    </h3>
                    <button 
                      type="button"
                      className="text-slate-400 mb-8 hover:text-cyan-400 transition-colors font-medium"
                    >
                      or <span className="underline decoration-slate-600 underline-offset-4 hover:decoration-cyan-400">click to browse files</span>
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".csv"
                      className="hidden"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3 animate-slide-up">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                {error}
              </div>
            )}
            
          </div>
        )}

      </main>
    </div>
  );
};

export default App;