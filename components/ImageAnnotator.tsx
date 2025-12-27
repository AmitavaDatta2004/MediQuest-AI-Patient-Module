import React, { useState } from 'react';
import { MedicalFinding } from '../types';
import { AlertCircle, Info, ScanLine, Flame, Layers, MousePointer2 } from 'lucide-react';

interface ImageAnnotatorProps {
  imageUrl: string;
  findings: MedicalFinding[];
}

type ViewMode = 'box' | 'heatmap' | 'combined';

export const ImageAnnotator: React.FC<ImageAnnotatorProps> = ({ imageUrl, findings }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('combined');

  // Filter findings that actually have coordinates. Safely handle undefined/null findings.
  const visualFindings = (findings || []).filter(f => f.box_2d);
  const hasFindings = visualFindings.length > 0;

  // Helper to determine heatmap gradient based on confidence
  const getHeatmapStyle = (confidence: string) => {
    const c = confidence?.toLowerCase() || '';
    if (c.includes('high')) {
      // High Confidence: Intense Red, larger spread
      return 'radial-gradient(circle at center, rgba(220, 38, 38, 1) 0%, rgba(220, 38, 38, 0.6) 45%, transparent 85%)';
    } else if (c.includes('medium')) {
      // Medium Confidence: Orange, medium spread
      return 'radial-gradient(circle at center, rgba(234, 88, 12, 0.9) 0%, rgba(234, 88, 12, 0.5) 45%, transparent 85%)';
    } else {
      // Low/Unknown: Yellow/Gold, lighter
      return 'radial-gradient(circle at center, rgba(202, 138, 4, 0.8) 0%, rgba(202, 138, 4, 0.4) 45%, transparent 85%)';
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* View Toggle Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-400">
           <MousePointer2 className="w-4 h-4" />
           <span>Hover over highlighted areas for details</span>
        </div>
        <div className="flex bg-gray-800/50 p-1 rounded-lg border border-gray-700/50">
          <button
            onClick={() => setViewMode('box')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'box' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <ScanLine className="w-3.5 h-3.5" />
            <span>Boxes</span>
          </button>
          <button
            onClick={() => setViewMode('heatmap')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'heatmap' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Heatmap</span>
          </button>
          <button
            onClick={() => setViewMode('combined')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'combined' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Mixed</span>
          </button>
        </div>
      </div>

      {/* 
        Image Container Strategy:
        We need the overlays (absolute) to position themselves relative to the *exact* dimensions of the visible image.
        If we just use `w-full h-auto` on the img, it might stretch.
        Strategy: 
        1. Outer Flex Container: Centers the content.
        2. Relative Wrapper: `inline-block`. Shrinks to fit the image dimensions exactly.
        3. Image: `block`. Max constraints applied here.
      */}
      <div className="w-full bg-black/40 rounded-xl border border-gray-800 p-4 flex justify-center min-h-[400px]">
        
        <div className="relative inline-block max-w-full">
            {/* Base Image */}
            <img 
              src={imageUrl} 
              alt="Medical Scan Analysis" 
              className="block max-h-[600px] max-w-full h-auto w-auto object-contain rounded-lg"
              draggable={false}
            />

            {/* Layers Overlay - Positioned absolutely relative to the image wrapper */}
            
            {/* 1. Heatmap Layer */}
            {(viewMode === 'heatmap' || viewMode === 'combined') && (
              <div className="absolute inset-0 z-10 pointer-events-none">
                {visualFindings.map((finding, idx) => {
                  if (!finding.box_2d) return null;
                  const { ymin, xmin, ymax, xmax } = finding.box_2d;
                  const gradient = getHeatmapStyle(finding.confidence);

                  return (
                    <div
                      key={`heat-${idx}`}
                      className="absolute mix-blend-screen opacity-70 animate-pulse"
                      style={{
                        top: `${ymin * 100}%`,
                        left: `${xmin * 100}%`,
                        height: `${(ymax - ymin) * 100}%`,
                        width: `${(xmax - xmin) * 100}%`,
                        background: gradient,
                        filter: 'blur(12px)',
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* 2. Bounding Box Layer */}
            {(viewMode === 'box' || viewMode === 'combined') && visualFindings.map((finding, idx) => {
              if (!finding.box_2d) return null;
              const { ymin, xmin, ymax, xmax } = finding.box_2d;
              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={`box-${idx}`}
                  className={`absolute z-20 cursor-help transition-all duration-200 ${
                     isHovered ? 'z-30' : ''
                  }`}
                  style={{
                    top: `${ymin * 100}%`,
                    left: `${xmin * 100}%`,
                    height: `${(ymax - ymin) * 100}%`,
                    width: `${(xmax - xmin) * 100}%`,
                  }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* The Box Outline */}
                  <div className={`w-full h-full border-2 rounded-sm shadow-sm transition-colors duration-200 ${
                    isHovered 
                      ? 'border-white bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                      : 'border-red-500/80 hover:border-red-400'
                  }`}></div>

                  {/* Corner Markers for tech feel */}
                  <div className={`absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 -mt-[1px] -ml-[1px] ${isHovered ? 'border-white' : 'border-red-500'}`}></div>
                  <div className={`absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 -mt-[1px] -mr-[1px] ${isHovered ? 'border-white' : 'border-red-500'}`}></div>
                  <div className={`absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 -mb-[1px] -ml-[1px] ${isHovered ? 'border-white' : 'border-red-500'}`}></div>
                  <div className={`absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 -mb-[1px] -mr-[1px] ${isHovered ? 'border-white' : 'border-red-500'}`}></div>

                  {/* Floating Label (Top Right of Box) */}
                  <div className={`absolute -top-3 -right-3 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md transition-transform ${
                    isHovered ? 'bg-white text-gray-900 scale-110' : 'bg-red-600 text-white'
                  }`}>
                    {idx + 1}
                  </div>

                  {/* Enhanced Tooltip */}
                  {isHovered && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 bg-gray-900/95 backdrop-blur-md text-white rounded-lg p-3 shadow-2xl border border-gray-700 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none">
                      <div className="flex items-center gap-2 mb-1 border-b border-gray-700 pb-2">
                         <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[8px] font-bold">{idx + 1}</span>
                         <span className="font-semibold text-xs text-gray-100">{finding.label}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-400 uppercase tracking-wider font-medium">
                        <span>Confidence</span>
                        <span className="text-brand-400">{finding.confidence}</span>
                      </div>
                      {/* Triangle Pointer */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900/95"></div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty State Overlay */}
            {!hasFindings && (
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 text-white/80 text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
                 <Info className="w-3 h-3" /> No specific regions detected
              </div>
            )}
        </div>
      </div>
      
      {/* Legend below image */}
      {hasFindings && (
        <div className="flex flex-wrap gap-2 justify-center mt-2">
          {visualFindings.map((f, i) => (
             <div key={i} className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded text-[10px] text-gray-600 border border-gray-200" onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
                <span className="w-4 h-4 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-bold text-[9px]">{i + 1}</span>
                <span className="truncate max-w-[100px]">{f.label}</span>
             </div>
          ))}
        </div>
      )}
    </div>
  );
};