import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RenderComponent } from '../components/builder/Renderer';
import type { VibeComponentData } from '../components/builder/registry';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Preview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [siteData, setSiteData] = useState<any>(null);
  const [activePageSlug, setActivePageSlug] = useState<string>('');

  useEffect(() => {
    const storageKey = user ? `vibe-site-${user.itemId}` : 'vibe-site-guest';
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSiteData(parsed);
        if (parsed.pages && parsed.pages.length > 0) {
          setActivePageSlug(parsed.pages[0].slug);
        }
      } catch (e) {
        console.error("Failed to parse site data", e);
      }
    }
  }, [user]);

  if (!siteData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/40 animate-pulse">Loading preview...</p>
      </div>
    );
  }

  const activePage = siteData.pages?.find((p: any) => p.slug === activePageSlug) || siteData.pages?.[0];

  return (
    <div className="min-h-screen flex flex-col relative z-20">
      {/* Preview Navigation Bar */}
      <nav className="h-[60px] w-full z-50 flex items-center justify-between px-6 bg-[#0D0F12]/80 backdrop-blur-md border-b border-white/5 shrink-0">
        <button 
          onClick={() => navigate('/editor')}
          className="flex items-center text-xs font-medium px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/5 text-white/80 transition-colors"
        >
          <ArrowLeft className="w-3 h-3 mr-1" /> Back to Editor
        </button>
        
        <div className="flex gap-2">
          {siteData.pages?.map((page: any) => (
            <button
              key={page.id}
              onClick={() => setActivePageSlug(page.slug)}
              className={`text-xs font-medium px-4 py-2 rounded-full transition-colors ${
                activePageSlug === page.slug 
                  ? 'bg-blue-600 text-white' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {page.title}
            </button>
          ))}
        </div>
        
        <div className="text-xs font-medium text-white/40 uppercase tracking-widest hidden sm:block">
          {siteData.siteName || 'Vibe Site'}
        </div>
      </nav>

      {/* Main Content Render */}
      <main className="flex-1 overflow-y-auto w-full">
        {activePage ? (
          <div className="w-full min-h-full">
            {activePage.components.map((comp: VibeComponentData) => (
              <RenderComponent key={comp.id} data={comp} isEditor={false} />
            ))}
            {activePage.components.length === 0 && (
              <div className="h-[400px] flex items-center justify-center text-white/20">
                This page is empty.
              </div>
            )}
          </div>
        ) : (
          <div className="h-[400px] flex items-center justify-center text-red-400/60">
            Page not found.
          </div>
        )}
      </main>
    </div>
  );
}
