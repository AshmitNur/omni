import { Link } from 'react-router-dom';
import { ArrowLeft, Ghost } from 'lucide-react';
import { GlowCard } from '../components/ui/spotlight-card';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <GlowCard customSize glowColor="purple" className="!flex !flex-col items-center w-full max-w-[480px] !p-10 md:!p-14 relative z-10 text-center">
        <motion.div
          initial={{ y: -10 }}
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Ghost className="w-16 h-16 text-white/20 mb-6" />
        </motion.div>

        <h1 className="text-6xl font-display font-black tracking-tight text-white mb-2">404</h1>
        <p className="text-lg text-white/40 font-medium mb-1">Page not found</p>
        <p className="text-sm text-white/25 max-w-xs mb-8">
          The page you're looking for doesn't exist or the profile hasn't been created yet.
        </p>

        <Link
          to="/"
          className="group flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white/80 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-all"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>
      </GlowCard>
    </div>
  );
}
