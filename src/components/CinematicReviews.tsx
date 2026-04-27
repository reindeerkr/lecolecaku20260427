import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ReviewItem } from '@/types';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';

export default function CinematicReviews({ config }: { config?: { title: string; subtitle: string } }) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'reviews'), where('isDisplayed', '==', true));
    const unsubscribe = onSnapshot(q, (snap) => {
      const reviewData = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReviewItem[];
      setReviews(reviewData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'reviews');
    });

    return () => unsubscribe();
  }, []);

  if (loading) return null;

  const title = config?.title || "Cinematic Moments";
  const subtitle = config?.subtitle || "Student Stories";

  return (
    <div className="max-w-4xl mx-auto px-6 text-center">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="mb-24"
      >
        <span className="text-[10px] uppercase tracking-[0.4em] text-brand-accent mb-4 block">{subtitle}</span>
        <h3 className="text-4xl font-serif italic text-inherit tracking-tight">{title}</h3>
      </motion.div>

      <div className="space-y-32">
        {reviews.length === 0 ? (
          <div className="py-20 opacity-40 text-inherit uppercase tracking-[0.4em] text-xs font-serif italic">
            Reviews are being curated...
          </div>
        ) : reviews.map((review, index) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="group"
          >
            <p className="text-xl md:text-3xl font-serif leading-relaxed mb-10 text-inherit max-w-2xl mx-auto">
              “{review.content}”
            </p>
            <div className="flex items-center justify-center gap-4 opacity-50 group-hover:opacity-100 transition-all duration-500">
              <div className="w-12 h-[1px] bg-brand-accent/50" />
              <span className="text-[10px] uppercase tracking-[0.3em] font-medium text-brand-accent">{review.author}</span>
              <div className="w-12 h-[1px] bg-brand-accent/50" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
