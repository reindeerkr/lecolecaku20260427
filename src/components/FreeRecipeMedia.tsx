import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { RecipeVideo } from '@/types';

interface FreeRecipeMediaProps {
  config?: {
    title: string;
    subtitle: string;
    youtubeLink?: string;
    videos: RecipeVideo[];
  };
}

const getYoutubeThumbnail = (url: string) => {
  try {
    const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
    if (!videoId) return '';
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  } catch (e) {
    return '';
  }
};

const getYoutubeEmbedUrl = (url: string) => {
  try {
    const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
    return `https://www.youtube.com/watch?v=${videoId}`;
  } catch (e) {
    return url;
  }
};

export default function FreeRecipeMedia({ config }: FreeRecipeMediaProps) {
  const title = config?.title || "무료 레시피 미디어";
  const subtitle = config?.subtitle || "WATCH ON YOUTUBE →";
  const youtubeLink = config?.youtubeLink || "https://youtube.com/@lecole_caku";
  const videos = config?.videos || [];

  const LOGO_FALLBACK = "https://firebasestorage.googleapis.com/v0/b/lecolecaku.appspot.com/o/logo%2Flccu_logo.png?alt=media";

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex justify-between items-center mb-16">
        <h3 className="text-4xl font-serif">{title}</h3>
        <a 
          href={youtubeLink} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-xs uppercase tracking-widest hover:text-brand-accent transition-colors"
        >
          {subtitle}
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {videos.map((video) => {
          const displayThumbnail = video.thumbnail || getYoutubeThumbnail(video.youtubeUrl) || LOGO_FALLBACK;
          
          return (
            <motion.div
              key={video.id}
              whileHover={{ y: -5 }}
              className="group cursor-pointer"
              onClick={() => window.open(video.youtubeUrl, '_blank')}
            >
              <div className="relative aspect-video rounded-sm overflow-hidden mb-6 bg-neutral-100">
                <img 
                  src={displayThumbnail} 
                  alt={video.title} 
                  className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${!video.thumbnail ? 'grayscale group-hover:grayscale-0' : ''}`}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    // If maxres failed and it was a youtube URL, try hqdefault
                    if (img.src.includes('maxresdefault')) {
                      img.src = img.src.replace('maxresdefault', 'hqdefault');
                    } else if (img.src !== LOGO_FALLBACK) {
                      // Final fallback to logo
                      img.src = LOGO_FALLBACK;
                    }
                  }}
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                    <Play className="text-white fill-white w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
              <h4 className="font-medium text-lg mb-2 group-hover:text-brand-accent transition-colors">{video.title}</h4>
              <div className="flex gap-4 text-[10px] uppercase text-neutral-400 tracking-widest">
                {video.description.split(' ').map((word, i) => (
                  <span key={i}>{word}</span>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
