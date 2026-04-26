import { useState, useEffect } from 'react';
import { Instagram } from 'lucide-react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface InstagramMedia {
  id: string;
  media_type: string;
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
}

interface SNSFeedsProps {
  config?: {
    username: string;
    title: string;
    blogTitle: string;
    blogLinkText: string;
    blogLink: string;
    accessToken?: string;
  };
}

const snsImagesFallback = [
  "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1548365328-8c6db3220e4c?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1558326567-98ae2405596b?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&q=80&w=400",
];

export default function SNSFeeds({ config }: SNSFeedsProps) {
  const [media, setMedia] = useState<InstagramMedia[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const accessToken = config?.accessToken;

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const q = query(collection(db, 'sns_gallery'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const urls = snap.docs.map(doc => doc.data().url);
        setGalleryImages(urls);
      } catch (err) {
        console.error("Gallery fetch error:", err);
      }
    };
    fetchGallery();
  }, []);

  useEffect(() => {
    if (accessToken) {
      setIsLoading(true);
      fetch(`https://graph.instagram.com/me/media?fields=id,media_type,media_url,permalink,thumbnail_url&access_token=${accessToken}&limit=6`)
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            setMedia(data.data);
          }
        })
        .catch(err => console.error("Instagram fetch error:", err))
        .finally(() => setIsLoading(false));
    } else {
      setMedia([]);
    }
  }, [accessToken]);

  const username = config?.username || "@lecole_caku";
  const title = config?.title || "Latest from Instagram";
  const blogTitle = config?.blogTitle || "함셰프의 베이킹 일기";
  const blogLinkText = config?.blogLinkText || "Naver Blog 바로가기 →";
  const blogLink = config?.blogLink || "#";

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
        <div>
          <a 
            href={`https://instagram.com/${username.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-baseline gap-3"
          >
            <h3 className="text-2xl font-serif group-hover:text-brand-accent transition-colors">{username}</h3>
            <Instagram className="w-4 h-4 text-neutral-300 group-hover:text-brand-accent transition-colors" />
          </a>
          <p className="text-neutral-500 text-xs uppercase tracking-widest mt-2">{title}</p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <h4 className="font-medium text-sm">{blogTitle}</h4>
          <a 
            href={blogLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-neutral-400 text-xs underline underline-offset-4 hover:text-brand-accent transition-colors"
          >
            {blogLinkText}
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
        {galleryImages.length > 0 ? (
          galleryImages.map((src, index) => (
            <a 
              key={index} 
              href={`https://instagram.com/${username.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square group relative overflow-hidden cursor-pointer"
            >
              <img 
                src={src} 
                alt={`Gallery photo ${index}`} 
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-brand-accent/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Instagram className="text-white w-6 h-6" />
              </div>
            </a>
          ))
        ) : isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square bg-neutral-100 animate-pulse" />
          ))
        ) : media.length > 0 ? (
          media.map((item) => (
            <a 
              key={item.id} 
              href={item.permalink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="aspect-square group relative overflow-hidden cursor-pointer"
            >
              <img 
                src={item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url} 
                alt="Instagram post" 
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-brand-accent/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Instagram className="text-white w-6 h-6" />
              </div>
            </a>
          ))
        ) : (
          snsImagesFallback.map((src, index) => (
            <a 
              key={index} 
              href={`https://instagram.com/${username.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square group relative overflow-hidden cursor-pointer"
            >
              <img 
                src={src} 
                alt={`SNS ${index}`} 
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-brand-accent/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Instagram className="text-white w-6 h-6" />
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
