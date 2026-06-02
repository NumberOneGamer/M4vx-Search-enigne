'use client';

import { VideoResult } from '@/types';
import { X, Play, ExternalLink, Eye, Clock, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { highlightMatches } from '@/lib/utils';

interface VideoPreviewModalProps {
  video: VideoResult;
  onClose: () => void;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VideoPreviewModal({ video, onClose }: VideoPreviewModalProps) {
  const [embedError, setEmbedError] = useState(false);
  const highlightTerms: string[] = [];
  const validEmbeds = ['/embed/', 'player.vimeo.com', 'dailymotion.com/embed'];
  const isValidEmbed = video.embedUrl && validEmbeds.some(e => video.embedUrl!.includes(e));
  const safeEmbedUrl: string | undefined = isValidEmbed ? video.embedUrl ?? undefined : undefined;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-3xl bg-background rounded-xl border border-border/50 shadow-modal overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-background/80 hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="aspect-video bg-muted relative">
          {isValidEmbed && !embedError ? (
            <iframe
              src={safeEmbedUrl}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
              onError={() => setEmbedError(true)}
            />
          ) : video.thumbnailUrl ? (
            <div className="relative w-full h-full">
              <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
              >
                <Play className="w-16 h-16 text-white fill-white group-hover:scale-110 transition-transform" />
              </a>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-16 h-16 text-muted-foreground/30" />
            </div>
          )}
          {embedError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 gap-3 p-4">
              <p className="text-sm text-muted-foreground">Could not load embedded video</p>
              <a href={video.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                <ExternalLink className="w-4 h-4" /> Open on {video.source || 'YouTube'}
              </a>
            </div>
          )}
          {video.duration && (
            <span className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/80 text-white text-sm font-medium">
              {formatDuration(video.duration)}
            </span>
          )}
        </div>

        <div className="p-4">
          <h2 className="text-lg font-semibold mb-2" dangerouslySetInnerHTML={{ __html: highlightMatches(video.title, highlightTerms) }} />
          {video.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-3" dangerouslySetInnerHTML={{ __html: highlightMatches(video.description, highlightTerms) }} />
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {video.channelName && (
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {video.channelName}
              </span>
            )}
            {video.viewCount !== null && (
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {video.viewCount.toLocaleString()} views
              </span>
            )}
            {video.publishDate && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(video.publishDate).toLocaleDateString()}
              </span>
            )}
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline ml-auto"
            >
              <ExternalLink className="w-4 h-4" />
              View source
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
