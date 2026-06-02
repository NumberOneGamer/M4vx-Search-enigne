'use client';

import { ImageResult } from '@/types';
import { Image, X, ExternalLink, Info, Maximize2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ImageResultsProps {
  results: ImageResult[];
  query: string;
}

function ImageViewerModal({ image, onClose, onNext, onPrev }: {
  image: ImageResult;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onNext) onNext();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose, onNext, onPrev]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full h-full max-w-5xl max-h-[90vh] m-4 flex flex-col lg:flex-row bg-background rounded-xl border border-border/50 shadow-modal overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-background/80 hover:bg-muted transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 flex items-center justify-center bg-black/40 min-h-[300px] relative">
          <img
            src={image.url}
            alt={image.altText || image.pageTitle || 'Image'}
            className="max-w-full max-h-[70vh] lg:max-h-[90vh] object-contain"
          />
          {onPrev && (
            <button onClick={onPrev} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/60 hover:bg-background/90 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          {onNext && (
            <button onClick={onNext} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/60 hover:bg-background/90 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>

        <div className="w-full lg:w-72 p-4 border-t lg:border-t-0 lg:border-l border-border/50 overflow-y-auto">
          {image.pageTitle && <h3 className="font-medium text-sm mb-2 line-clamp-2">{image.pageTitle}</h3>}
          {image.caption && <p className="text-xs text-muted-foreground mb-3">{image.caption}</p>}
          <div className="space-y-2 text-xs text-muted-foreground">
            {image.width && image.height && (
              <p className="flex items-center gap-1">
                <Maximize2 className="w-3 h-3" />
                {image.width} × {image.height}
              </p>
            )}
            {image.fileSize && <p className="flex items-center gap-1"><Info className="w-3 h-3" />{(image.fileSize / 1024).toFixed(1)} KB</p>}
            {image.mimeType && <p className="flex items-center gap-1"><Info className="w-3 h-3" />{image.mimeType}</p>}
            {image.dominantColor && (
              <p className="flex items-center gap-1">
                <span className="w-3 h-3 rounded border border-border/50" style={{ backgroundColor: image.dominantColor }} />
                {image.dominantColor}
              </p>
            )}
          </div>
          {image.pageUrl && (
            <a
              href={image.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline mt-3"
            >
              <ExternalLink className="w-3 h-3" />
              View source page
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function getColorClass(color: string | null): string {
  if (!color) return '';
  const colorMap: Record<string, string> = {
    white: 'bg-white border-border/30',
    black: 'bg-gray-900',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-400',
  };
  return colorMap[color.toLowerCase()] || '';
}

export function ImageResults({ results }: ImageResultsProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<Set<number>>(new Set());

  if (!results.length) {
    return (
      <div className="text-center py-12">
        <Image className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">No images found</p>
      </div>
    );
  }

  return (
    <>
      <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3">
        {results.map((image, index) => (
          <div
            key={image.id}
            className="break-inside-avoid mb-3 group cursor-pointer"
            onClick={() => setViewerIndex(index)}
          >
            <div className="relative rounded-lg overflow-hidden bg-muted">
              <img
                src={image.url}
                alt={image.altText || image.pageTitle || 'Image'}
                className={`w-full h-auto object-cover transition-all duration-300 ${loaded.has(image.id) ? 'opacity-100' : 'opacity-0'}`}
                loading="lazy"
                onLoad={() => setLoaded((prev) => new Set(prev).add(image.id))}
                style={{ aspectRatio: image.width && image.height ? `${image.width}/${image.height}` : undefined }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              {image.dominantColor && (
                <div className="absolute top-2 left-2 w-3 h-3 rounded-full border border-white/30 shadow-sm" style={{ backgroundColor: `#${image.dominantColor.replace('#', '')}` }} />
              )}
            </div>
            {(image.altText || image.caption || image.pageTitle) && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                {image.caption || image.altText || image.pageTitle}
              </p>
            )}
          </div>
        ))}
      </div>

      {viewerIndex !== null && (
        <ImageViewerModal
          image={results[viewerIndex]}
          onClose={() => setViewerIndex(null)}
          onNext={viewerIndex < results.length - 1 ? () => setViewerIndex(viewerIndex + 1) : undefined}
          onPrev={viewerIndex > 0 ? () => setViewerIndex(viewerIndex - 1) : undefined}
        />
      )}
    </>
  );
}
