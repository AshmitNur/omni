import { useParams, Link } from 'react-router-dom';
import { ExternalLink, Globe, MapPin, Mail, ArrowLeft } from 'lucide-react';
import { GitHubIcon, LinkedInIcon } from '../components/Icons';
import { GlowCard } from '../components/ui/spotlight-card';
import { useAuth } from '../context/AuthContext';

export default function PublicProfile() {
  const { user } = useAuth();
  const { username } = useParams();
  
  // Try to find a user-scoped profile first, then fall back to the generic one
  const storageKey = user ? `omni-profile-${user.uid}` : 'omni-profile';
  const savedProfile = localStorage.getItem(storageKey) || localStorage.getItem('omni-profile');
  
  const profile = savedProfile ? JSON.parse(savedProfile) : {
    displayName: user?.displayName || 'Avery Stone',
    username: user?.email?.split('@')[0] || 'janedoe',
    headline: 'Product-minded developer',
    bio: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100',
    banner: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=600&q=80',
    links: [
      { id: 1, platform: 'LinkedIn', url: 'https://linkedin.com' },
      { id: 2, platform: 'GitHub', url: 'https://github.com' }
    ]
  };

  const displayAvatar = profile.avatar || profile.avatarUrl;
  const displayBanner = profile.banner || profile.headerUrl;
  const displayLinks = profile.links || [];

  const getPlatformIcon = (platform: string) => {
    switch(platform.toLowerCase()) {
      case 'github': return <GitHubIcon className="w-5 h-5 text-[var(--color-platinum)]" />;
      case 'linkedin': return <LinkedInIcon className="w-5 h-5 text-[#0A66C2]" />;
      default: return <Globe className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-obsidian)] pb-10 md:pb-20">
      {/* Header Image */}
      <div className="w-full h-[200px] sm:h-[240px] md:h-[320px] relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(7,8,10,0.4)] to-[var(--color-obsidian)] z-10" />
        <img 
          src={displayBanner} 
          alt="Header" 
          className="w-full h-full object-cover"
        />
        
        {/* Back Link - Only show if user is likely previewing from editor */}
        <div className="absolute top-6 left-6 z-30">
          <Link to="/" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white/80 text-xs hover:bg-black/40 transition-all">
            <ArrowLeft className="w-3 h-3" /> <span className="xs:inline">Back</span>
          </Link>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-4 md:px-8 -mt-16 sm:-mt-24 md:-mt-32 relative z-20 space-y-4 md:space-y-6">
        {/* Profile Card */}
        <GlowCard customSize glowColor="blue" className="!flex !flex-col !p-5 md:!p-8 !pt-0">
          <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-center md:items-start text-center md:text-left">
            
            {/* Avatar */}
            <div className="-mt-10 sm:-mt-12 md:-mt-16 shrink-0 relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-[4px] border-[var(--color-obsidian)] relative z-10 bg-[var(--color-obsidian-mid)]">
                <img src={displayAvatar} alt={profile.displayName} className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-0 bg-[var(--color-accent)] rounded-full blur-xl opacity-20 z-0 translate-y-2" />
            </div>

            {/* Profile Info */}
            <div className="flex-1 pt-2 md:pt-4">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white tracking-tight">
                {profile.displayName}
              </h1>
              <p className="text-base sm:text-lg text-[var(--color-chrome-light)] font-body mt-1 md:mt-2">
                {profile.headline}
              </p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 mt-4 md:mt-6">
                <span className="flex items-center text-xs sm:text-sm text-[var(--color-chrome)]">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Remote
                </span>
                <span className="flex items-center text-xs sm:text-sm text-[var(--color-chrome)]">
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  @{username || profile.username || 'user'}
                </span>
              </div>
            </div>
          </div>
        </GlowCard>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* Main Content: About Me */}
          <div className="md:col-span-2 space-y-4 md:space-y-6">
            <GlowCard customSize glowColor="purple" className="!flex !flex-col !p-5 md:!p-8">
              <h2 className="text-lg md:text-xl font-display font-bold text-[var(--color-silver)] mb-3 md:mb-4">About</h2>
              <div className="text-sm md:text-base text-white/70 leading-relaxed whitespace-pre-wrap">
                {profile.bio || "No bio provided yet."}
              </div>
            </GlowCard>
          </div>

          {/* Sidebar: Social Links */}
          <div className="space-y-4 md:space-y-6">
            <GlowCard customSize glowColor="green" className="!flex !flex-col !p-5 md:!p-6">
              <h2 className="text-[10px] md:text-sm font-label text-[var(--color-chrome)] mb-3 md:mb-4 uppercase tracking-wider">Connect</h2>
              <div className="flex flex-col space-y-2 md:space-y-3">
                {displayLinks.map((link: any) => (
                  <a 
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-2.5 sm:p-3 rounded-lg border border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] hover:bg-[var(--glass-bg-hover)] transition-all group"
                  >
                    <div className="text-[var(--color-chrome)] group-hover:text-[var(--color-platinum)] transition-colors">
                      {getPlatformIcon(link.platform)}
                    </div>
                    <span className="ml-3 font-medium text-xs sm:text-sm text-[var(--color-platinum)]">{link.platform}</span>
                    <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 ml-auto text-[var(--color-chrome-dark)] group-hover:text-[var(--color-chrome)] transition-colors" />
                  </a>
                ))}
                {displayLinks.length === 0 && (
                  <p className="text-[10px] text-white/20 italic">No links added yet.</p>
                )}
              </div>
            </GlowCard>
          </div>
        </div>
      </div>
      
      {/* Footer Branding */}
      <div className="text-center mt-10 md:mt-16 pb-6">
        <p className="text-[10px] text-[var(--color-chrome-dark)] font-medium tracking-wide">
          Powered by <span className="text-[var(--color-chrome)]">OMNI</span>
        </p>
      </div>
    </div>
  );
}
