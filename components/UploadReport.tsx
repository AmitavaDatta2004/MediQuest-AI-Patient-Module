import React from 'react';
import { UploadCloud, Loader2, ScanEye, FileText, Wand2, ArrowRight, Download, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { UploadedFile } from '../types';
import { ImageAnnotator } from './ImageAnnotator';

interface UploadReportProps {
  files: UploadedFile[];
  isUploading: boolean;
  processingStatus: string;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const UploadReport: React.FC<UploadReportProps> = ({
  files,
  isUploading,
  processingStatus,
  onFileUpload
}) => {

  const downloadAnnotatedImage = async (file: UploadedFile) => {
    const imageUrl = file.processedUrl || file.previewUrl;
    if (!imageUrl || !file.analysisResult) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (ctx) {
        // Draw Image
        ctx.drawImage(img, 0, 0);

        // Draw Annotations
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#ef4444'; // Red-500
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.fillStyle = '#ef4444';

        const findings = file.analysisResult?.findings || [];
        findings.forEach((finding, idx) => {
          if (finding.box_2d) {
             const { ymin, xmin, ymax, xmax } = finding.box_2d;
             const x = xmin * img.width;
             const y = ymin * img.height;
             const w = (xmax - xmin) * img.width;
             const h = (ymax - ymin) * img.height;

             // Box
             ctx.strokeRect(x, y, w, h);
             
             // Label bg
             const label = `${idx + 1}: ${finding.label}`;
             const textMetrics = ctx.measureText(label);
             ctx.fillStyle = 'rgba(0,0,0,0.7)';
             ctx.fillRect(x, y - 30, textMetrics.width + 10, 30);
             
             // Label text
             ctx.fillStyle = '#ffffff';
             ctx.fillText(label, x + 5, y - 8);
             ctx.fillStyle = '#ef4444'; // Reset for next stroke
          }
        });

        // Trigger Download
        const link = document.createElement('a');
        link.download = `processed-analysis-${file.name}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    };
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Medical Reports & Scans</h2>
        <p className="text-gray-500 text-lg">Upload X-rays, MRI scans, or medical documents for instant AI analysis.</p>
      </div>
      
      {/* Upload Zone */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-dashed border-brand-200 bg-white hover:border-brand-400 hover:bg-brand-50/50 transition-all duration-300 group cursor-pointer shadow-sm hover:shadow-md">
         <input type="file" id="fileUpload" className="hidden" accept="image/*,.pdf" onChange={onFileUpload} disabled={isUploading} />
         <label htmlFor="fileUpload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full p-12">
            {isUploading ? (
              <div className="flex flex-col items-center py-6">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin"></div>
                  <Loader2 className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-brand-600 animate-pulse" />
                </div>
                <span className="mt-6 text-xl font-semibold text-brand-700 animate-pulse">{processingStatus}</span>
                <p className="text-sm text-brand-500 mt-2">This usually takes 5-10 seconds</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                 <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-brand-100 transition-all duration-300">
                   <UploadCloud className="w-12 h-12 text-brand-600" />
                 </div>
                 <div className="text-center space-y-1">
                   <h3 className="text-2xl font-bold text-gray-900">Click to upload scan</h3>
                   <p className="text-gray-500 font-medium">Supported formats: JPG, PNG, PDF</p>
                 </div>
                 <div className="mt-4 flex gap-8 text-sm text-gray-400">
                    <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> HIPAA Compliant</span>
                    <span className="flex items-center gap-1"><Wand2 className="w-4 h-4" /> AI Enhanced</span>
                 </div>
              </div>
            )}
         </label>
      </div>

      <div className="space-y-10">
         {files.map(file => (
           <div key={file.id} className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden transition-all hover:shadow-2xl hover:shadow-gray-200/60">
              
              {/* Header Info */}
              <div className="flex flex-col md:flex-row md:items-center justify-between p-6 md:p-8 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 gap-4">
                 <div className="flex items-center gap-5">
                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 text-brand-600">
                      {file.type.includes('image') ? <ScanEye className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                    </div>
                    <div>
                       <h4 className="text-xl font-bold text-gray-900 leading-tight">{file.name}</h4>
                       <p className="text-sm text-gray-500 mt-1 font-medium">{new Date(file.date).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    {file.processedUrl && (
                      <span className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold border border-indigo-100 shadow-sm">
                        <Wand2 className="w-4 h-4" /> AI Enhanced
                      </span>
                    )}
                    <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide border shadow-sm ${file.analysisResult ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {file.analysisResult ? 'Analyzed' : 'Pending'}
                    </span>
                 </div>
              </div>

              <div className="p-6 md:p-10 space-y-12">
                {/* Visual Pipeline */}
                {file.type.includes('image') && (
                  <div className="space-y-8">
                    
                    {/* Pipeline Step 1 & 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 items-center">
                      {/* Original */}
                      <div className="space-y-3 group">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Input Source</span>
                            <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">Raw</span>
                        </div>
                        <div className="relative aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 shadow-inner">
                          {file.previewUrl ? (
                            <img src={file.previewUrl} alt="Original" className="w-full h-full object-contain mix-blend-multiply opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                          ) : <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-medium">No Preview</div>}
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <div className="bg-gray-50 p-3 rounded-full border border-gray-200 text-gray-400 rotate-90 md:rotate-0">
                            <ArrowRight className="w-6 h-6" />
                        </div>
                      </div>

                      {/* Processed */}
                      <div className="space-y-3 group">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">AI Processing</span>
                            <span className="text-xs font-bold bg-brand-50 text-brand-600 px-2 py-1 rounded">Denoised & Cropped</span>
                        </div>
                        <div className="relative aspect-[4/3] bg-gray-900 rounded-2xl overflow-hidden border-2 border-brand-100 shadow-lg ring-4 ring-brand-50">
                          {file.processedUrl ? (
                            <img src={file.processedUrl} alt="Processed" className="w-full h-full object-contain" />
                          ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                                <ScanEye className="w-8 h-8 opacity-50" />
                                <span className="text-sm font-medium">Processing...</span>
                             </div>
                          )}
                          {/* Overlay Gradient */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Interactive Viewer */}
                    <div className="bg-gray-900 rounded-3xl p-1 shadow-2xl overflow-hidden border border-gray-800">
                        <div className="bg-gray-800/50 px-6 py-4 flex items-center justify-between border-b border-gray-700/50">
                             <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-500/10 rounded-lg text-brand-400">
                                   <ScanEye className="w-5 h-5" />
                                </div>
                                <div>
                                    <h5 className="text-white font-bold">Interactive Analysis</h5>
                                    <p className="text-gray-400 text-xs">Hover over regions to see details</p>
                                </div>
                             </div>
                             <button 
                              onClick={() => downloadAnnotatedImage(file)}
                              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all border border-white/5 backdrop-blur-sm"
                            >
                              <Download className="w-3.5 h-3.5" /> Export Analysis
                           </button>
                        </div>
                        
                        <div className="min-h-[500px] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                             {(file.processedUrl || file.previewUrl) ? (
                                    <ImageAnnotator imageUrl={file.processedUrl || file.previewUrl || ''} findings={file.analysisResult?.findings || []} />
                                ) : (
                                    <div className="text-gray-500 flex flex-col items-center">
                                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                        Waiting for analysis data...
                                    </div>
                                )}
                        </div>
                    </div>

                  </div>
                )}

                {/* Analysis Report Text */}
                {file.analysisResult && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t border-gray-100">
                        {/* Summary Column */}
                        <div className="lg:col-span-1 space-y-6">
                             <div>
                                <h6 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-brand-500" /> Executive Summary
                                </h6>
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-gray-700 leading-relaxed text-sm shadow-inner">
                                    {file.analysisResult.summary}
                                </div>
                             </div>
                             
                             <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-amber-900 text-xs flex gap-3">
                                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
                                <p className="font-medium">{file.analysisResult.disclaimer}</p>
                             </div>
                        </div>

                        {/* Findings Column */}
                        <div className="lg:col-span-2">
                            <h6 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <ScanEye className="w-4 h-4 text-brand-500" /> Detailed Anomalies
                            </h6>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {file.analysisResult.findings && file.analysisResult.findings.length > 0 ? (
                                    file.analysisResult.findings.map((finding, idx) => (
                                        <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-brand-200 transition-all group">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="font-bold text-gray-900 group-hover:text-brand-700 transition-colors">{finding.label}</span>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide border ${
                                                    finding.confidence.toLowerCase().includes('high') 
                                                    ? 'bg-red-50 text-red-700 border-red-100' 
                                                    : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                                                }`}>
                                                    {finding.confidence}
                                                </span>
                                            </div>
                                            <p className="text-gray-600 text-sm leading-relaxed border-t border-gray-50 pt-3 mt-1">
                                                {finding.explanation}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-2 p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-center">
                                        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3 opacity-50" />
                                        <p className="text-gray-500 font-medium">No specific anomalies detected in the AI analysis.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                     </div>
                )}
              </div>
           </div>
         ))}
      </div>
    </div>
  );
};