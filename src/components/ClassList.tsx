import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ClassItem } from '@/types';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';

export default function ClassList({ config: propConfig }: { config?: { title: string; subtitle: string } }) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch classes
    const q = query(collection(db, 'classes'), where('isActive', '==', true));
    const unsubscribeClasses = onSnapshot(q, (snap) => {
      const classData = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ClassItem[];
      setClasses(classData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'classes');
    });

    return () => {
      unsubscribeClasses();
    };
  }, []);

  if (loading) return (
    <div className="max-w-7xl mx-auto px-6 py-20 text-center font-serif italic text-neutral-400">
      Loading Class Information...
    </div>
  );

  const title = propConfig?.title || '시그니처 베이킹 클래스';
  const subtitle = propConfig?.subtitle || 'BAKING CLASSES';

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 md:mb-16 gap-4">
        <div>
          <Badge variant="outline" className="mb-4 border-brand-accent/20 text-brand-accent uppercase tracking-widest text-[10px]">{subtitle}</Badge>
          <h3 className="text-2xl md:text-4xl font-serif text-brand-warm">{title}</h3>
        </div>
        <a href="#schedule" className="text-xs md:text-sm underline underline-offset-4 text-neutral-500 hover:text-brand-ink transition-colors">
          전체 스케줄 보기
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
        {classes.length === 0 ? (
          <div className="col-span-full py-20 text-center font-serif italic text-neutral-400 opacity-50 text-sm">
            No active classes at the moment.
          </div>
        ) : classes.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
          >
             <Card className={`border-0 shadow-none bg-transparent group cursor-pointer ${item.isSoldOut ? 'pointer-events-none' : ''}`}>
               <CardHeader className="p-0 overflow-hidden rounded-md mb-4 md:mb-6 relative">
                 {item.isSoldOut && (
                   <div className="absolute inset-0 z-10 bg-black/60 flex items-center justify-center">
                     <span className="text-white font-serif italic text-xl md:text-2xl tracking-widest border border-white/30 px-6 py-2 backdrop-blur-sm">Sold Out</span>
                   </div>
                 )}
                 <img 
                   src={item.thumbnail} 
                   alt={item.title}
                   className={`w-full aspect-square object-cover transition-transform duration-500 ${item.isSoldOut ? 'grayscale-[30%]' : 'group-hover:scale-105'}`}
                   referrerPolicy="no-referrer"
                 />
               </CardHeader>
               <CardContent className="p-0">
                 <div className="flex items-center gap-2 mb-3 md:mb-4">
                   <Badge variant="secondary" className="bg-neutral-100 text-neutral-600 text-[9px] md:text-[10px] font-normal uppercase">
                     {(item as any).category || 'Baking'}
                   </Badge>
                   {item.isSoldOut && (
                     <Badge variant="destructive" className="bg-red-500 text-[10px] font-normal uppercase">
                       마감
                     </Badge>
                   )}
                 </div>
                 <CardTitle className={`text-lg md:text-xl font-serif mb-1 md:mb-2 ${item.isSoldOut ? 'text-neutral-400' : 'text-brand-warm'}`}>{item.title}</CardTitle>
                 <p className={`text-xs md:text-sm ${item.isSoldOut ? 'text-neutral-500' : 'text-neutral-400'}`}>₩{item.price.toLocaleString()}</p>
               </CardContent>
               <CardFooter className="p-0 mt-4 md:mt-6">
                 <Button 
                   variant={item.isSoldOut ? "secondary" : "outline"}
                   disabled={item.isSoldOut}
                   className={`w-full text-xs md:text-sm h-10 md:h-11 rounded-none transition-all ${item.isSoldOut ? 'bg-neutral-100 text-neutral-400' : 'hover:bg-brand-ink hover:text-white border-brand-accent/20 text-brand-warm'}`}
                 >
                   {item.isSoldOut ? '신청마감' : '신청하기'}
                 </Button>
               </CardFooter>
             </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
