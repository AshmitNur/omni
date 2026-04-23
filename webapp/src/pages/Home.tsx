import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { LiquidButton } from '../components/ui/liquid-glass-button';

export default function Home() {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-screen w-full flex flex-col">
      {/* Navigation */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-gray-200 to-gray-500 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(0,0,0,0.5)]" />
          <span className="font-display font-black text-xl tracking-[0.15em] text-white">OMNI</span>
        </Link>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <Link 
            to="/register" 
            className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white/80 hover:text-white border border-white/10 rounded-md hover:bg-white/5 transition-colors"
          >
            Join OMNI
          </Link>
          <Link 
            to="/login" 
            className="group flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors shadow-[0_0_15px_rgba(59,130,246,0.5)]"
          >
            Sign In <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 mt-[-60px]">
        {/* Extremely wide OMNI text using CSS scale to match the image precisely if font doesn't natively support ultra-extended */}
        <h1 
          className="text-white font-display font-black tracking-[0.02em] leading-none select-none drop-shadow-2xl" 
          style={{ fontSize: 'clamp(3rem, 18vw, 12rem)' }}
        >
          OMNI
        </h1>
        
        <p className="mt-8 text-white/60 text-center text-sm md:text-base lg:text-lg max-w-2xl font-medium tracking-wide">
          Create a polished public identity page with authentication, media,
          content, and a shareable URL.
        </p>
|
        <div className="mt-10">
          <LiquidButton 
            className="text-white/90 font-semibold border border-white/10 rounded-full px-8 backdrop-blur-md" 
            size="xl"
            onClick={() => navigate('/login')}
          >
            Let's Go
          </LiquidButton>
        </div>
      </main>
    </div>
  );
}
