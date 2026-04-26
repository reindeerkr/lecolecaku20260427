import { motion } from 'framer-motion';

export default function About({ config }: { config?: { title: string, content: string, image: string, quote?: string, chefName?: string } }) {
  const title = config?.title || "18년의 업력, \n최고 수준의 베이킹 아카이빙";
  const content = config?.content || "레꼴케이쿠는 단순한 베이킹 스튜디오를 넘어, 18년간 축적된 최고 수준의 브랜드 자산을 공유하는 공간입니다. 프랑스 에꼴 르노뜨르 유학파 셰프 함정임의 감각이 담긴 레시피와 클래스를 통해 깊이 있는 디저트 세계를 경험해 보세요.";
  const image = config?.image || "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1000";
  const quote = config?.quote || "“디저트의 질감과 따뜻한 분위기가 온전히 돋보이는 공간”";
  const chefName = config?.chefName || "Chef Ham Jeong-im";

  return (
    <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
      >
        <img 
          src={image} 
          alt="Chef Working"
          className="w-full aspect-[4/5] object-cover rounded-sm shadow-2xl shadow-brand-accent/20"
          referrerPolicy="no-referrer"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay: 0.2 }}
      >
        <h3 className="text-3xl font-serif mb-8 leading-relaxed whitespace-pre-line italic">
          {title}
        </h3>
        <p className="text-neutral-600 leading-loose mb-8">
          {content}
        </p>
        <div className="space-y-4 text-sm text-neutral-500 italic">
          <p>{quote}</p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-[1px] bg-brand-accent" />
            <span>{chefName}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
