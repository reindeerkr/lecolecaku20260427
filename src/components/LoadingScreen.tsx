import { motion } from 'framer-motion';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] bg-brand-warm flex flex-col items-center justify-center">
      <div className="relative">
        {/* Animated Circle Logo Wrapper */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="w-24 h-24 rounded-full border border-brand-accent/20 flex items-center justify-center p-2"
        >
          <div className="w-full h-full rounded-full border-t-2 border-brand-accent animate-spin" style={{ animationDuration: '2s' }} />
        </motion.div>
        
        {/* Inner Text or Logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] text-brand-accent font-serif tracking-widest uppercase italic">Caku</span>
        </div>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center"
      >
        <h2 className="text-brand-ink font-serif italic text-lg tracking-wider">L'ecole Caku</h2>
        <p className="text-[10px] text-brand-accent/60 uppercase tracking-[0.3em] mt-2">Loading Studio...</p>
      </motion.div>
    </div>
  );
}
