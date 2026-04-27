import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from "@/components/ui/badge";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from "@/components/ui/carousel";
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';

export default function ScheduleGallery({ config: propConfig }: { config?: { title: string; subtitle: string } }) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch images from collection
    const q = query(collection(db, 'schedule_images'), orderBy('createdAt', 'asc'));
    const unsubscribeImages = onSnapshot(q, (snap) => {
      const imageData = snap.docs.map(doc => doc.data().url);
      setImages(imageData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'schedule_images');
    });

    return () => {
      unsubscribeImages();
    };
  }, []);

  if (loading) return null;

  const title = propConfig?.title || '이달의 클래스 스케줄';
  const subtitle = propConfig?.subtitle || 'SCHEDULE';

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="text-center mb-10 md:mb-16">
        <Badge variant="outline" className="mb-4 text-brand-accent border-brand-accent uppercase tracking-widest text-[10px]">{subtitle}</Badge>
        <h3 className="text-2xl md:text-4xl font-serif text-brand-warm">{title}</h3>
      </div>
      
      <Carousel className="w-full max-w-4xl mx-auto">
        <CarouselContent>
          {images.length === 0 ? (
            <CarouselItem>
              <div className="p-20 text-center opacity-30 uppercase tracking-[0.4em] text-xs font-serif italic text-white">
                No schedule images uploaded yet.
              </div>
            </CarouselItem>
          ) : images.map((src, index) => (
            <CarouselItem key={index}>
              <div className="p-1">
                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  className="aspect-square overflow-hidden rounded-md bg-white/5 border border-white/10"
                >
                  <img 
                    src={src} 
                    alt={`Schedule ${index + 1}`}
                    className="w-full h-full object-contain grayscale-[0.2] hover:grayscale-0 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {images.length > 1 && (
          <>
            <CarouselPrevious className="flex -left-4 md:-left-16 bg-brand-accent text-brand-warm border-none hover:bg-white hover:scale-110 transition-all shadow-2xl h-12 w-12 md:h-16 md:w-16" />
            <CarouselNext className="flex -right-4 md:-right-16 bg-brand-accent text-brand-warm border-none hover:bg-white hover:scale-110 transition-all shadow-2xl h-12 w-12 md:h-16 md:w-16" />
          </>
        )}
      </Carousel>
      
      {images.length > 1 && (
        <p className="text-center mt-12 text-sm text-neutral-500">
          * 좌우로 넘겨서 상세 스케줄을 확인하실 수 있습니다.
        </p>
      )}
    </div>
  );
}
