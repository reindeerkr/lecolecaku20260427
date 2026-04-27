import { motion } from 'framer-motion';
import { BookOpen, Award, Globe, Coffee, Camera, Heart } from 'lucide-react';
import { HistoryItem } from '../types';

const ICON_MAP = {
  Globe,
  Book: BookOpen,
  Award,
  Coffee,
  Camera,
  Heart
};

interface BrandTimelineProps {
  config?: {
    title: string;
    subtitle: string;
    items: HistoryItem[];
  };
}

const defaultEvents: HistoryItem[] = [
  {
    year: "2008",
    title: "Le Cordon Bleu / Ecole Lenotre",
    description: "프랑스 최고의 요리 학교 디플로마 취득 및 유학",
    icon: 'Globe',
    side: 'left'
  },
  {
    year: "2012",
    title: "첫 번째 베이킹 도서 출간",
    description: "'손쉽게 즐기는 프랑스 디저트' 베스트셀러 등극",
    side: 'right',
    link: { text: "구매처 바로가기 →", url: "https://www.yes24.com" },
    icon: 'Book'
  },
  {
    year: "2016",
    title: "L'ecole Caku 오프라인 스튜디오 오픈",
    description: "프라이빗 베이킹 클래스 중심의 공간 구축",
    icon: 'Award',
    side: 'left'
  },
  {
    year: "2020",
    title: "메가 베이킹 서적 출간",
    description: "18년 업력의 정수가 담긴 다섯 번째 도서 출간",
    side: 'right',
    link: { text: "구매처 바로가기 →", url: "https://www.yes24.com" },
    icon: 'Book'
  }
];

export default function BrandTimeline({ config }: BrandTimelineProps) {
  const title = config?.title || "18 Years of Heritage";
  const subtitle = config?.subtitle || "Brand Narrative";
  const items = config?.items || defaultEvents;

  return (
    <div className="max-w-5xl mx-auto px-6">
      <div className="text-center mb-24">
        <h3 className="text-4xl font-serif mb-4">{title}</h3>
        <p className="text-neutral-500 uppercase tracking-widest text-[10px]">{subtitle}</p>
      </div>

      <div className="relative">
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[1px] bg-brand-accent/20 hidden md:block" />

        <div className="space-y-12 md:space-y-24">
          {items.map((event, index) => {
            const Icon = ICON_MAP[event.icon] || Globe;
            const isLeft = event.side === 'left';

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="flex flex-col md:flex-row items-center md:gap-0 gap-6"
              >
                {/* Desktop Left Side */}
                <div className={`hidden md:block flex-1 pr-12 text-right ${!isLeft ? 'invisible' : ''}`}>
                  <span className="text-3xl font-serif text-brand-accent mb-2 block">{event.year}</span>
                  <h4 className="text-xl font-medium mb-3">{event.title}</h4>
                  <p className="text-neutral-500 text-sm leading-relaxed">{event.description}</p>
                  {event.link && (
                    <a href={event.link.url} target="_blank" rel="noopener noreferrer" className="text-xs border-b border-brand-accent/30 mt-4 inline-block hover:text-brand-accent transition-colors">
                      {event.link.text}
                    </a>
                  )}
                </div>

                {/* Central Icon */}
                <div className="shrink-0 w-12 h-12 bg-[#111111] border border-brand-accent/30 rounded-full flex items-center justify-center z-10 shadow-[0_0_20px_rgba(196,164,132,0.1)]">
                  <Icon className="w-5 h-5 text-brand-accent" />
                </div>

                {/* Desktop Right Side / Mobile Content */}
                <div className={`flex-1 w-full md:pl-12 text-center md:text-left ${isLeft ? 'md:invisible' : ''}`}>
                  <span className="text-3xl font-serif text-brand-accent mb-1 md:mb-2 block">{event.year}</span>
                  <h4 className="text-lg md:text-xl font-medium mb-2 md:mb-3">{event.title}</h4>
                  <p className="text-neutral-500 text-sm leading-relaxed px-6 md:px-0">{event.description}</p>
                  {event.link && (
                    <a href={event.link.url} target="_blank" rel="noopener noreferrer" className="text-xs border-b border-brand-accent/30 mt-3 md:mt-4 inline-block hover:text-brand-accent transition-colors">
                      {event.link.text}
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
