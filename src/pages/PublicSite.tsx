import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  getPublicSitePath,
  getSiteContentBySlug,
  normalizePageSlug,
  slugify,
  type VibeSiteData,
} from '../lib/content';
import { RenderComponent } from '../components/builder/Renderer';
import type { VibeComponentData } from '../components/builder/registry';
import { motion } from 'framer-motion';

export default function PublicSite() {
  const params = useParams<{ username: string; '*': string }>();
  const location = useLocation();
  const username = params.username;
  const routePath = params['*'];
  const [siteData, setSiteData] = useState<VibeSiteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSite = async () => {
      if (!username) return;
      setIsLoading(true);
      setError(null);
      try {
        const content = await getSiteContentBySlug(slugify(username, 'site'));
        if (content && content.data) {
          setSiteData(content.data);
        } else {
          setError('Site not found');
        }
      } catch (err) {
        setError('Error loading site');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSite();
  }, [username]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0F12]">
        <div className="text-white/40 animate-pulse text-sm tracking-widest uppercase">Loading Site...</div>
      </div>
    );
  }

  if (error || !siteData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0D0F12] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
          <span className="text-xl opacity-50">404</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">404 - Not Found</h1>
        <p className="text-white/40 max-w-md">The site you are looking for does not exist or has been removed.</p>
        <Link to="/" className="mt-8 px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-colors">
          Return Home
        </Link>
      </div>
    );
  }

  const pages = Array.isArray(siteData.pages) ? siteData.pages : [];
  const targetSlug = normalizePageSlug(routePath || 'home');
  const matchedPage = pages.find((p) => normalizePageSlug(p.slug) === targetSlug);
  const homePage = pages.find((p) => normalizePageSlug(p.slug) === 'home') || pages[0];
  const activePage = targetSlug === 'home' ? matchedPage || homePage : matchedPage;
  const routeBase = location.pathname.startsWith('/u/')
    ? 'u'
    : location.pathname.startsWith('/profile/')
      ? 'profile'
      : 'site';

  if (!activePage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0F12] text-white/40">
        Page not found on this site.
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative z-20">
      {pages.length > 1 && (
        <nav className="fixed top-0 left-0 w-full z-50 flex items-center justify-center px-6 py-4 pointer-events-none">
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-full px-2 py-1.5 flex gap-1 pointer-events-auto shadow-2xl">
            {pages.map((page) => {
              const isActive = normalizePageSlug(activePage.slug) === normalizePageSlug(page.slug);
              const path = getPublicSitePath(username || siteData.username || 'site', page.slug, routeBase);
              return (
                <Link
                  key={page.id}
                  to={path}
                  className={`text-xs font-medium px-4 py-2 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {page.title}
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      <main className="flex-1 w-full min-h-screen bg-transparent">
        <motion.div
          key={activePage.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full min-h-full pb-20"
        >
          {pages.length > 1 && <div className="h-24 w-full" />}

          {(activePage.components || []).map((comp: VibeComponentData) => (
            <RenderComponent key={comp.id} data={comp} isEditor={false} />
          ))}
          {(!activePage.components || activePage.components.length === 0) && (
            <div className="h-[400px] flex items-center justify-center text-white/20">
              This page is empty.
            </div>
          )}
        </motion.div>
      </main>

      <div className="py-6 text-center shrink-0">
        <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] text-white/40 hover:text-white/60 transition-colors uppercase tracking-widest font-medium">
          Powered by <span className="text-white font-bold">VIBE</span>
        </a>
      </div>
    </div>
  );
}
