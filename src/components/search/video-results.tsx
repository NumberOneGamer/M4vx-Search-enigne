'use client';

import { VideoResult } from '@/types';
import { timeAgo, highlightMatches } from '@/lib/utils';
import { Film, Clock, Eye, Play } from 'lucide-react';
import { useState } from 'react';
import { VideoPreviewModal } from './video-preview';

interface VideoResultsProps {
  results: VideoResult[];
  query: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatViews(count: number | null): string {
  if (!count) return '';
  if (count >= 1e6) return `${(count / 1e6).toFixed(1)}M`;
  if (count >= 1e3) return `${(count / 1e3).toFixed(1)}K`;
  return count.toString();
}

export function VideoResults({ results, query }: VideoResultsProps) {
  const [previewVideo, setPreviewVideo] = useState<VideoResult | null>(null);
  const highlightTerms = query ? [...query.split(/\s+/).filter(Boolean)] : [];

  if (!results.length) {
    return (
      <div className="text-center py-12">
        <Film className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">No videos found</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((video) => (
          <div key={video.id} className="group">
            <div
              className="relative aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer"
              onClick={() => setPreviewVideo(video)}
            >
              {video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Film className="w-10 h-10 text-muted-foreground/30" />
                </div>
              )}
              {video.duration && (
                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-xs font-medium">
                  {formatDuration(video.duration)}
                </span>
              )}
              {video.quality && (
                <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-[10px] font-medium uppercase">
                  {video.quality}
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                <Play className="w-12 h-12 text-white fill-white" />
              </div>
            </div>
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2"
            >
              <h3
                className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors"
                dangerouslySetInnerHTML={{ __html: highlightMatches(video.title, highlightTerms) }}
              />
            </a>
            {video.channelName && (
              <p className="text-xs text-muted-foreground mt-0.5" dangerouslySetInnerHTML={{ __html: highlightMatches(video.channelName, highlightTerms) }} />
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground/70 mt-0.5">
              {video.viewCount !== null && (
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {formatViews(video.viewCount)}
                </span>
              )}
              {video.publishDate && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {timeAgo(video.publishDate)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {previewVideo && (
        <VideoPreviewModal video={previewVideo} onClose={() => setPreviewVideo(null)} />
      )}
    </>
  );
}
