import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Upload, FileText, CheckCircle, AlertCircle, Download, Wand2, RefreshCw, Briefcase, FileType } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { extractTextFromFile } from './services/fileService';
import { analyzeResumeWithGemini, optimizeResumeWithGemini } from './services/geminiService';
import { AnalysisResult, AppState, Tab } from './types';
import ScoreGauge from './components/ScoreGauge';

const App: React.FC = () => {
  // State
  const [jobDescription, setJobDescription] = useState<string>('');
  const [resumeText, setResumeText] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [optimizedResume, setOptimizedResume] = useState<string>('');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.INPUT);

  const fileInputRef = useRef<HTMLInputElement>(null);


// Inside your App component useEffect
useEffect(() => {
  const handleWPMessage = async (event: MessageEvent) => {
    if (!event.data.type) return;

    // Helper to turn DataURL (Base64) back into a File-like object
    const dataURLtoText = async (dataUrl: string) => {
     try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        
        // INTEGRITY LOG
        console.log(`%c 📥 [BRIDGE] Reconstructed Blob: ${blob.size} bytes | Type: ${blob.type}`, 'color: #00ff88; font-weight: bold;');
        
        if (blob.size < 100) throw new Error("File too small to be a valid PDF.");
        return blob;
      } catch (e) {
        console.error("❌ Failed to reconstruct PDF from DataURL", e);
        throw e;
      }
    };
if (event.data.type === 'START_ANALYSIS') {
      try {
        const blob = await dataURLtoBlob(event.data.resumeData);
        const file = new File([blob], event.data.fileName || "resume.pdf", { type: "application/pdf" });
        
        // Pass the fresh File object to your service
        const cleanText = await extractTextFromFile(file);
        
        const result = await analyzeResumeWithGemini(cleanText, event.data.jobDesc);
        
        window.parent.postMessage({ 
          type: 'SCORE_RESULT', 
          percentage: result.matchScore 
        }, "*");
      } catch (err: any) {
        console.error("Analysis Error:", err);
        window.parent.postMessage({ 
          type: 'SCORE_RESULT', 
          error: "Invalid PDF structure. Please try a different file." 
        }, "*");
      }
    }

    if (event.data.type === 'START_OPTIMIZATION') {
      try {
        const cleanText = await dataURLtoText(event.data.resumeData);
        const result = await optimizeResumeWithGemini(cleanText, event.data.jobDesc);
        
        // Return the plain text result
        window.parent.postMessage({ 
          type: 'OPTIMIZE_COMPLETE', 
          optimizedData: result 
        }, "*");
      } catch (err) {
         window.parent.postMessage({ type: 'SCORE_RESULT', error: "Optimization failed." }, "*");
      }
    }
  };

  window.addEventListener("message", handleWPMessage);
  return () => window.removeEventListener("message", handleWPMessage);
}, []);
  // Handlers
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setAppState(AppState.ANALYZING); // Temporary loading state for file
    setErrorMsg(null);
    
    try {
      const text = await extractTextFromFile(file);
      setResumeText(text);
      setAppState(AppState.IDLE);
    } catch (err: any) {
      console.error("Upload error details:", err);
      setErrorMsg(`Error parsing file: ${err.message || "Unknown error"}. Please try copy-pasting text.`);
      setAppState(AppState.IDLE);
    }
  };

  const handleAnalyze = async () => {
    if (!jobDescription.trim() || !resumeText.trim()) {
      setErrorMsg("Please provide both a Job Description and a Resume.");
      return;
    }
    setErrorMsg(null);
    setAppState(AppState.ANALYZING);
    try {
      const result = await analyzeResumeWithGemini(resumeText, jobDescription);
      setAnalysisResult(result);
      setActiveTab(Tab.ANALYSIS);
      setAppState(AppState.VIEW_ANALYSIS);
    } catch (err) {
      console.error("ACTUAL ERROR DETAILS:", err); 
      console.error("Error Message:", err.message);  
      setErrorMsg("Failed to analyze resume. Please try again.");
      setAppState(AppState.ERROR);
    }
  };

  const handleOptimize = async () => {
    if (!jobDescription.trim() || !resumeText.trim()) {
      setErrorMsg("Please provide inputs first.");
      return;
    }
    setErrorMsg(null);
    setAppState(AppState.OPTIMIZING);
    try {
      const result = await optimizeResumeWithGemini(resumeText, jobDescription);
      setOptimizedResume(result);
      setActiveTab(Tab.OPTIMIZED);
      setAppState(AppState.VIEW_OPTIMIZED);
    } catch (err) {
      setErrorMsg("Failed to optimize resume. Please try again.");
      setAppState(AppState.ERROR);
    }
  };

  const handleDownload = (format: 'txt' | 'pdf') => {
    if (!optimizedResume) return;

    if (format === 'txt') {
      const blob = new Blob([optimizedResume], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'optimized_resume.txt';
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const doc = new jsPDF();
      const lines = doc.splitTextToSize(optimizedResume, 180);
      let cursorY = 10;
      const pageHeight = doc.internal.pageSize.height;
      
      lines.forEach((line: string) => {
        if (cursorY + 10 > pageHeight) {
          doc.addPage();
          cursorY = 10;
        }
        doc.text(line, 10, cursorY);
        cursorY += 7;
      });
      doc.save('optimized_resume.pdf');
    }
  };

  // Render Helpers
  const renderLoading = (message: string) => (
    <div className="flex flex-col items-center justify-center h-full p-12 text-center animate-fade-in">
      <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
      <h3 className="text-xl font-semibold text-slate-700">{message}</h3>
      <p className="text-slate-500 mt-2">AI is working its magic...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">ResuMate AI</h1>
          </div>
          <nav className="flex gap-4">
             <button 
                onClick={() => setActiveTab(Tab.INPUT)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === Tab.INPUT ? 'bg-slate-100 text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
             >
               Input
             </button>
             <button 
                onClick={() => { if(analysisResult) setActiveTab(Tab.ANALYSIS); }}
                disabled={!analysisResult}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === Tab.ANALYSIS ? 'bg-slate-100 text-indigo-600' : 'text-slate-600'} ${!analysisResult && 'opacity-50 cursor-not-allowed'}`}
             >
               Analysis
             </button>
             <button 
                onClick={() => { if(optimizedResume) setActiveTab(Tab.OPTIMIZED); }}
                disabled={!optimizedResume}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === Tab.OPTIMIZED ? 'bg-slate-100 text-indigo-600' : 'text-slate-600'} ${!optimizedResume && 'opacity-50 cursor-not-allowed'}`}
             >
               Optimized
             </button>
          </nav>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {errorMsg && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{errorMsg}</p>
                <button onClick={() => setErrorMsg(null)} className="ml-auto text-sm underline">Dismiss</button>
            </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">
          
          {/* TAB 1: INPUTS */}
          {activeTab === Tab.INPUT && (
            <div className="grid grid-cols-1 md:grid-cols-2 h-full divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {/* Job Description Column */}
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-slate-800">Job Description</h2>
                </div>
                <p className="text-sm text-slate-500 mb-3">Paste the job posting you want to target.</p>
                <textarea
                  className="flex-grow w-full p-4 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm text-white placeholder-slate-400"
                  placeholder="Paste job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>

              {/* Resume Input Column */}
              <div className="p-6 flex flex-col h-full bg-slate-50/50">
                <div className="flex items-center gap-2 mb-4">
                  <FileType className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-slate-800">Your Resume</h2>
                </div>
                
                <div className="mb-4">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".pdf,.docx,.txt"
                        onChange={handleFileUpload}
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-slate-600 font-medium"
                    >
                        <Upload className="w-4 h-4" />
                        {fileName ? fileName : "Upload Resume (PDF, DOCX, TXT)"}
                    </button>
                </div>

                <div className="relative flex items-center justify-center mb-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                    <span className="relative bg-slate-50 px-2 text-xs text-slate-400 font-medium uppercase">Or paste text</span>
                </div>

                <textarea
                  className="flex-grow w-full p-4 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm text-white placeholder-slate-400 mb-6"
                  placeholder="Paste your current resume content here..."
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                />

                <div className="flex gap-3 mt-auto">
                    <button
                        onClick={handleAnalyze}
                        disabled={appState === AppState.ANALYZING || !jobDescription || !resumeText}
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm hover:shadow-md"
                    >
                        {appState === AppState.ANALYZING ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                            <CheckCircle className="w-5 h-5" />
                        )}
                        Analyze
                    </button>
                    <button
                        onClick={handleOptimize}
                        disabled={appState === AppState.OPTIMIZING || !jobDescription || !resumeText}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm hover:shadow-md"
                    >
                         {appState === AppState.OPTIMIZING ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                            <Wand2 className="w-5 h-5" />
                        )}
                        Optimize
                    </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANALYSIS */}
          {activeTab === Tab.ANALYSIS && (
            <div className="h-full">
              {appState === AppState.ANALYZING ? (
                 renderLoading("Analyzing your resume against the job description...")
              ) : analysisResult ? (
                <div className="p-8 h-full overflow-y-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                     {/* Score Card */}
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">ATS Match Score</h3>
                        <ScoreGauge score={analysisResult.matchScore} />
                        <p className="text-center text-sm text-slate-500 mt-2">{analysisResult.summary}</p>
                     </div>

                     {/* Keywords */}
                     <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                           <AlertCircle className="w-5 h-5 text-amber-500" />
                           Missing Keywords
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {analysisResult.missingKeywords.length > 0 ? (
                                analysisResult.missingKeywords.map((kw, i) => (
                                    <span key={i} className="px-3 py-1 bg-red-50 text-red-700 border border-red-100 rounded-full text-sm">
                                        {kw}
                                    </span>
                                ))
                            ) : (
                                <span className="text-emerald-600 text-sm">Great job! No major missing keywords found.</span>
                            )}
                        </div>
                        
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-3">ATS Compatibility Tips</h3>
                            <ul className="space-y-2">
                                {analysisResult.atsTips.map((tip, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0"></div>
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                          <h3 className="font-semibold text-slate-800 mb-3">Grammar & Clarity</h3>
                          <ul className="space-y-2">
                            {analysisResult.grammarIssues.length > 0 ? analysisResult.grammarIssues.map((item, i) => (
                                <li key={i} className="text-sm text-slate-600 list-disc ml-4">{item}</li>
                            )) : <li className="text-sm text-emerald-600">No grammar issues detected.</li>}
                          </ul>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                          <h3 className="font-semibold text-slate-800 mb-3">Formatting Suggestions</h3>
                          <ul className="space-y-2">
                            {analysisResult.formattingSuggestions.length > 0 ? analysisResult.formattingSuggestions.map((item, i) => (
                                <li key={i} className="text-sm text-slate-600 list-disc ml-4">{item}</li>
                            )) : <li className="text-sm text-emerald-600">Formatting looks good.</li>}
                          </ul>
                      </div>
                  </div>
                  
                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleOptimize}
                        
                        disabled={appState === AppState.OPTIMIZING} 
                        className={`flex items-center justify-center gap-2 text-white px-6 py-3 rounded-lg shadow-sm transition-all font-medium 
                            ${appState === AppState.OPTIMIZING ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                        {appState === AppState.OPTIMIZING ? (
                            <div className="flex items-center gap-2">
                                <RefreshCw className="w-5 h-5 animate-spin" /> 
                                <span>Applying Optimization...</span>
                            </div>
                        ) : (
                            
                            <>
                                <Wand2 className="w-5 h-5" />
                                <span>Apply AI Optimization</span>
                            </>
                        )}
                    </button>
                </div>
                </div>
              ) : null}
            </div>
          )}

           {/* TAB 3: OPTIMIZED */}
           {activeTab === Tab.OPTIMIZED && (
            <div className="h-full flex flex-col">
                {appState === AppState.OPTIMIZING ? (
                    renderLoading("Rewriting your resume to match the job description...")
                ) : (
                    <div className="flex-grow flex flex-col md:flex-row h-full overflow-hidden">
                        {/* Preview Area */}
                       <div className="flex-grow p-8 overflow-y-auto bg-slate-100">
    <div className="bg-white shadow-lg p-10 min-h-[800px] max-w-3xl mx-auto rounded-sm">
        {/* Apply the styling classes to the wrapper div */}
        <div className="prose prose-sm md:prose-base max-w-none text-slate-800">
            {/* Remove the className prop from ReactMarkdown */}
            <ReactMarkdown>
                {optimizedResume}
            </ReactMarkdown>
        </div>
    </div>
</div>
                        
                        {/* Actions Sidebar */}
                        <div className="w-full md:w-80 bg-white border-l border-slate-200 p-6 flex flex-col gap-4 shadow-sm z-10">
                            <h3 className="font-bold text-lg text-slate-800">Export Options</h3>
                            <p className="text-sm text-slate-500 mb-4">Download your optimized resume.</p>
                            
                            <button 
                                onClick={() => handleDownload('pdf')}
                                className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                            >
                                <Download className="w-4 h-4" />
                                Download PDF
                            </button>
                            <button 
                                onClick={() => handleDownload('txt')}
                                className="flex items-center justify-center gap-2 w-full py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                            >
                                <FileText className="w-4 h-4" />
                                Download Text
                            </button>
                            
                            <hr className="my-4 border-slate-100" />
                            
                            <div className="bg-indigo-50 p-4 rounded-lg">
                                <h4 className="text-sm font-semibold text-indigo-900 mb-2">Optimization Note</h4>
                                <p className="text-xs text-indigo-700 leading-relaxed">
                                    This resume has been rewritten to target a 95% match with your JD. It uses standard formatting compatible with most ATS scanners.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
           )}

        </div>
      </main>
      
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
            &copy; {new Date().getFullYear()} ResuMate AI. Powered CygniSoft Inc.
        </div>
      </footer>
    </div>
  );
};

export default App;