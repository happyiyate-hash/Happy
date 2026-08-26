import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  Scissors,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Maximize2,
  Sparkles,
  Layers,
  Crop,
  Square,
} from 'lucide-react';

interface LogoCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  logoUrl: string;
  onApplyCrop: (croppedLogoUrl: string, message: string) => void;
}

export const LogoCropModal: React.FC<LogoCropModalProps> = ({
  isOpen,
  onClose,
  logoUrl,
  onApplyCrop,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [bgColor, setBgColor] = useState<'transparent' | 'dark' | 'white'>('transparent');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load image when logoUrl changes or modal opens
  useEffect(() => {
    if (!logoUrl || !isOpen) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = logoUrl;
    img.onload = () => {
      imageRef.current = img;
      setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      // Reset controls to centered default
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
    };
  }, [logoUrl, isOpen]);

  // Generate real-time 512x512 preview on hidden canvas
  const renderCroppedCanvas = useCallback((): string | null => {
    const img = imageRef.current;
    if (!img) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Fill background if chosen
    ctx.clearRect(0, 0, 512, 512);
    if (bgColor === 'white') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 512, 512);
    } else if (bgColor === 'dark') {
      ctx.fillStyle = '#0B0E17';
      ctx.fillRect(0, 0, 512, 512);
    }

    // Calculate crop parameters
    // Center of 512x512 canvas is (256, 256)
    const baseScale = Math.min(512 / img.naturalWidth, 512 / img.naturalHeight);
    const renderScale = baseScale * zoom;

    const drawW = img.naturalWidth * renderScale;
    const drawH = img.naturalHeight * renderScale;

    const drawX = (512 - drawW) / 2 + offsetX;
    const drawY = (512 - drawH) / 2 + offsetY;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    return canvas.toDataURL('image/png');
  }, [zoom, offsetX, offsetY, bgColor]);

  // Update live preview when controls change
  useEffect(() => {
    if (!isOpen) return;
    const dataUrl = renderCroppedCanvas();
    if (dataUrl) {
      setPreviewUrl(dataUrl);
    }
  }, [isOpen, renderCroppedCanvas]);

  // Mouse Dragging handlers for panning the crop area inside the frame
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setOffsetX(e.clientX - dragStart.x);
    setOffsetY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const handleSaveCrop = () => {
    const croppedUrl = renderCroppedCanvas();
    if (croppedUrl) {
      onApplyCrop(
        croppedUrl,
        `Logo manually cropped & equalized to 512×512 px square layout!`
      );
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-[#121624] border border-zinc-800 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl relative overflow-hidden">
        {/* Glow accent bar */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 blur-sm" />

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                Manual Logo Crop & 512×512 Equalizer
              </h3>
              <p className="text-[11px] text-zinc-400">
                Position and scale your logo to fit perfectly inside an equal 512×512 square frame.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Workspace: Main Crop Viewport & Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Interactive Drag & Crop Viewport (2 of 3 cols) */}
          <div className="sm:col-span-2 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-medium text-zinc-300">
              <span className="flex items-center gap-1">
                <Move className="w-3.5 h-3.5 text-teal-400" /> Drag to Pan / Align
              </span>
              <span className="font-mono text-zinc-400 text-[10px]">
                Original: {imgDimensions.width}×{imgDimensions.height} px
              </span>
            </div>

            {/* Interactive 1:1 Square Canvas Viewport Box */}
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`relative w-full aspect-square bg-[#070913] border-2 border-emerald-500/50 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing select-none shadow-inner flex items-center justify-center ${
                bgColor === 'white' ? 'bg-white' : bgColor === 'dark' ? 'bg-[#0B0E17]' : 'bg-[#070913]'
              }`}
            >
              {/* Grid Overlay Lines for Centering */}
              <div className="absolute inset-0 pointer-events-none border border-emerald-500/20 grid grid-cols-3 grid-rows-3 z-20">
                <div className="border-r border-b border-emerald-500/15" />
                <div className="border-r border-b border-emerald-500/15" />
                <div className="border-b border-emerald-500/15" />
                <div className="border-r border-b border-emerald-500/15" />
                <div className="border-r border-b border-emerald-500/15" />
                <div className="border-b border-emerald-500/15" />
                <div className="border-r border-emerald-500/15" />
                <div className="border-r border-emerald-500/15" />
                <div />
              </div>

              {/* 1:1 Target Frame Marker */}
              <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-emerald-400/40 z-20 rounded-xl" />

              {/* Positioned Logo Image */}
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Crop source"
                  draggable={false}
                  style={{
                    transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
                    maxHeight: '100%',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    transition: isDragging ? 'none' : 'transform 0.05s linear',
                  }}
                  className="pointer-events-none"
                />
              )}
            </div>
          </div>

          {/* Live Output 512x512 Preview & Controls (1 of 3 cols) */}
          <div className="space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1">
                <Square className="w-3.5 h-3.5 text-emerald-400" />
                512×512 Output
              </span>

              {/* Realtime Cropped Result Preview */}
              <div className="w-full aspect-square bg-[#070913] border border-zinc-800 rounded-xl p-1 flex items-center justify-center overflow-hidden shadow-md">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="512x512 preview"
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <span className="text-[10px] text-zinc-500">Generating...</span>
                )}
              </div>
            </div>

            {/* Background Style Switcher */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-zinc-400">Canvas Canvas Background:</span>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setBgColor('transparent')}
                  className={`py-1 text-[10px] rounded border font-semibold cursor-pointer transition-colors ${
                    bgColor === 'transparent'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  Alpha
                </button>
                <button
                  type="button"
                  onClick={() => setBgColor('dark')}
                  className={`py-1 text-[10px] rounded border font-semibold cursor-pointer transition-colors ${
                    bgColor === 'dark'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => setBgColor('white')}
                  className={`py-1 text-[10px] rounded border font-semibold cursor-pointer transition-colors ${
                    bgColor === 'white'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  White
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium flex items-center justify-center space-x-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Layout</span>
            </button>
          </div>
        </div>

        {/* Zoom Slider Control */}
        <div className="bg-[#080B14] border border-zinc-800 p-3 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
              <ZoomIn className="w-3.5 h-3.5 text-teal-400" /> Zoom Scale
            </span>
            <span className="font-mono text-emerald-400 font-bold">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <ZoomOut className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
            <ZoomIn className="w-4 h-4 text-zinc-500 shrink-0" />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveCrop}
            className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save & Crop Logo (512×512)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
