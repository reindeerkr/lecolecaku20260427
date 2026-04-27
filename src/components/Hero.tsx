import { motion } from 'framer-motion';

export default function Hero({ config, instagramUrl }: { 
  config?: { title: string, subtitle: string, image: string },
  instagramUrl?: string 
}) {
  const title = config?.title || "프랑스에서 유학한\n프로 셰프의 감각적인 공간";
  const subtitle = config?.subtitle || "L'ecole Caku Baking Studio";
  const image = config?.image || "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&q=80&w=2000";
  const igLink = instagramUrl?.startsWith('http') ? instagramUrl : `https://instagram.com/${instagramUrl}`;

  return (
    <section className="relative min-h-[90vh] md:h-[90vh] flex items-center justify-center overflow-hidden pt-20 md:pt-0">
      <motion.div 
        key={image}
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="absolute inset-0 z-0"
      >
        <img 
          src={image} 
          alt="Baking Studio Hero"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/30" />
      </motion.div>

      <div className="relative z-10 text-center px-6 pt-32 pb-20 md:py-0">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="text-white/80 uppercase tracking-[0.2em] md:tracking-[0.3em] text-[10px] md:text-sm mb-4 md:mb-6"
        >
          {subtitle}
        </motion.p>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="text-white text-3xl sm:text-4xl md:text-7xl font-serif leading-[1.3] md:leading-tight mb-10 md:mb-8 whitespace-pre-line italic drop-shadow-lg"
        >
          {title}
        </motion.h2>
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 1.5, duration: 1 }}
           className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <a 
            href="#classes" 
            className="w-full sm:w-auto inline-block border border-brand-accent bg-brand-accent/10 backdrop-blur-sm text-brand-accent px-10 py-4 uppercase tracking-wider hover:bg-brand-accent hover:text-brand-ink transition-all duration-300 font-bold text-sm"
          >
            클래스 둘러보기
          </a>
          <a 
            href={igLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-block border border-white/30 bg-white/5 backdrop-blur-sm text-white/90 px-10 py-4 uppercase tracking-wider hover:bg-white/10 hover:text-white transition-all duration-300 font-medium text-sm"
          >
            인스타그램 바로가기
          </a>
        </motion.div>
      </div>


      {/* Decorative micro-interaction */}
      <motion.div 
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50"
      >
        <div className="w-[1px] h-12 bg-white/30 mx-auto mb-2" />
        <span className="text-[10px] uppercase tracking-widest">Scroll</span>
      </motion.div>
    </section>
  );
}
