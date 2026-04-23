import { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Image as ImageIcon, Link as LinkIcon, LogOut, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlowCard } from '../components/ui/spotlight-card';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export default function EditorDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentPath = location.pathname.split('/').pop() || 'profile';

  const [profile, setProfile] = useState(() => {
    const storageKey = user ? `omni-profile-${user.uid}` : 'omni-profile-guest';
    const saved = localStorage.getItem(storageKey);
    const defaultData = {
      displayName: user?.displayName || 'Avery Stone',
      username: user?.email?.split('@')[0] || 'ashmitnur',
      headline: 'Product-minded developer',
      bio: '',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100',
      banner: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=600&q=80',
      links: [
        { id: 1, platform: 'LinkedIn', url: 'https://linkedin.com/in/ashmitnur' },
        { id: 2, platform: 'GitHub', url: 'https://github.com/ashmitnur' }
      ]
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaultData, ...parsed };
      } catch (e) {
        return defaultData;
      }
    }
    return defaultData;
  });

  const handleSave = () => {
    const storageKey = user ? `omni-profile-${user.uid}` : 'omni-profile-guest';
    localStorage.setItem(storageKey, JSON.stringify(profile));
    alert('Changes saved successfully!');
  };

  const navItems = [
    { id: 'profile', label: 'Profile', icon: User, path: '/editor/profile' },
    { id: 'media', label: 'Media', icon: ImageIcon, path: '/editor/media' },
    { id: 'links', label: 'Links', icon: LinkIcon, path: '/editor/links' },
  ];

  return (
    <div className="flex flex-col min-h-screen relative z-10">
      {/* Top Navigation */}
      <nav className="h-[60px] fixed top-0 w-full z-50 flex items-center justify-between px-6 bg-[#0D0F12]/40 backdrop-blur-md border-b border-white/5">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-gray-200 to-gray-500 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(0,0,0,0.5)]" />
          <span className="font-display font-black text-xl tracking-[0.15em] text-white">OMNI</span>
        </Link>
        <div className="flex items-center space-x-3">
          <button 
            className="hidden sm:flex items-center text-xs font-medium px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/5 text-white/80 transition-colors" 
            onClick={() => {
              const storageKey = user ? `omni-profile-${user.uid}` : 'omni-profile-guest';
              localStorage.setItem(storageKey, JSON.stringify(profile));
              navigate('/profile/demo');
            }}
          >
            Preview <ArrowRight className="w-3 h-3 ml-1" />
          </button>
          <button 
            className="flex items-center text-xs font-medium px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/5 text-white/80 transition-colors" 
            onClick={async () => {
              await signOut(auth);
              navigate('/login');
            }}
          >
            <LogOut className="w-3 h-3 mr-1" /> <span className="hidden xs:inline">Log out</span>
          </button>
        </div>
      </nav>

      <div className="flex flex-1 pt-[60px] md:pt-[80px] max-w-[1400px] w-full mx-auto px-2 md:px-6 gap-6 pb-[90px] md:pb-8 h-[calc(100vh-60px)] md:h-screen overflow-hidden relative">
        
        {/* Sidebar */}
        <GlowCard customSize glowColor="purple" className="w-[260px] hidden md:block h-full shrink-0 !p-0">
          <div className="flex flex-col h-full w-full p-4">
            
          {/* Profile Selector */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 mb-6">
            <div className="w-10 h-10 rounded-full bg-gradient-to-b from-gray-700 to-gray-900 overflow-hidden border border-white/20 shrink-0">
              <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold text-white truncate">{profile.displayName}</span>
              <span className="text-xs text-white/50 truncate">@{profile.username}</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-1 flex-1">
            {navItems.map((item) => {
              const isActive = currentPath === item.id || (currentPath === 'editor' && item.id === 'profile');
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={clsx(
                    "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all",
                    isActive 
                      ? "text-white bg-blue-500/10 border border-blue-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" 
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon className={clsx("w-4 h-4 mr-3", isActive ? "text-blue-400" : "text-white/40")} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Footer Link */}
          <button 
            className="flex items-center justify-between px-4 py-3 text-sm text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors mt-auto"
            onClick={() => {
              const storageKey = user ? `omni-profile-${user.uid}` : 'omni-profile-guest';
              localStorage.setItem(storageKey, JSON.stringify(profile));
              navigate('/profile/demo');
            }}
          >
            Public preview <ArrowRight className="w-4 h-4" />
          </button>
          </div>
        </GlowCard>

        {/* Main Content */}
        <GlowCard customSize glowColor="blue" className="flex-1 h-full !p-0 overflow-hidden relative">
          <div className="flex flex-col h-full w-full relative overflow-y-auto no-scrollbar">
            <Routes>
              <Route path="/" element={<ProfileEditor profile={profile} setProfile={setProfile} />} />
              <Route path="/profile" element={<ProfileEditor profile={profile} setProfile={setProfile} />} />
              <Route path="/media" element={<MediaEditor profile={profile} setProfile={setProfile} />} />
              <Route path="/links" element={<LinksEditor profile={profile} setProfile={setProfile} />} />
            </Routes>
          </div>
        </GlowCard>

        {/* Right Panel - Live Preview & Save */}
        <GlowCard customSize glowColor="green" className="w-[340px] hidden lg:block h-full shrink-0 !p-0">
          <div className="flex flex-col h-full w-full p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-xs text-white/60 font-medium">All changes saved</span>
          </div>

          {/* Mini Profile Card */}
          <div className="w-full bg-[#1a1a1a] rounded-xl border border-white/10 overflow-hidden flex flex-col items-center pb-6 shadow-xl mb-auto">
            {/* Banner */}
            <div className="w-full h-24 bg-gradient-to-r from-purple-900 to-blue-900 relative">
              <img src={profile.banner} alt="Banner" className="w-full h-full object-cover opacity-80 mix-blend-overlay" />
            </div>
            
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full border-4 border-[#1a1a1a] bg-gray-800 -mt-8 relative z-10 overflow-hidden">
              <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
            </div>

            {/* Info */}
            <div className="text-center mt-3 px-4">
              <h3 className="text-white font-semibold text-sm">{profile.displayName || 'Display name'}</h3>
              <p className="text-white/60 text-xs mt-1 leading-snug">{profile.headline || 'Professional headline'}</p>
              <p className="text-white/40 text-[10px] mt-2 font-mono">@{profile.username || 'username'}</p>
            </div>
          </div>

          {/* Save Button */}
          <button 
            onClick={handleSave}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-[0_0_20px_rgba(59,130,246,0.3)] mt-6"
          >
            <CheckCircle2 className="w-4 h-4" /> Save changes
          </button>
          </div>
        </GlowCard>

      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-[80px] bg-[#0D0F12]/90 backdrop-blur-2xl border-t border-white/10 z-50 px-4 flex items-center justify-between pb-safe">
        <div className="flex flex-1 justify-around">
          {navItems.map((item) => {
            const isActive = currentPath === item.id || (currentPath === 'editor' && item.id === 'profile');
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={clsx(
                  "flex flex-col items-center gap-1 p-2 rounded-xl transition-all relative",
                  isActive ? "text-blue-400" : "text-white/40 hover:text-white/60"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-medium uppercase tracking-wider">{item.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="mobile-nav-indicator"
                    className="absolute -top-[1px] w-8 h-[2px] bg-blue-500 rounded-full"
                  />
                )}
              </Link>
            );
          })}
        </div>
        
        <div className="w-px h-8 bg-white/10 mx-2" />
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              const storageKey = user ? `omni-profile-${user.uid}` : 'omni-profile-guest';
              localStorage.setItem(storageKey, JSON.stringify(profile));
              navigate('/profile/demo');
            }}
            className="p-3 bg-white/5 border border-white/10 rounded-xl text-white/80 active:scale-95 transition-transform"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <button 
            onClick={handleSave}
            className="p-3 bg-blue-500 rounded-xl text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] active:scale-95 transition-transform"
          >
            <CheckCircle2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileEditor({ profile, setProfile }: { profile: any, setProfile: any }) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev: any) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in-up">
      <header>
        <span className="text-[10px] md:text-xs font-semibold tracking-wider text-white/40 uppercase mb-1 md:mb-2 block">Identity</span>
        <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">Profile details</h1>
      </header>

      <div className="space-y-4 md:space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-2">
            <label className="text-[10px] md:text-xs font-medium text-white/50 uppercase tracking-wider block">Display Name</label>
            <input 
              type="text" 
              name="displayName"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-white/20" 
              placeholder="Avery Stone" 
              value={profile.displayName} 
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] md:text-xs font-medium text-white/50 uppercase tracking-wider block">Username</label>
            <input 
              type="text" 
              name="username"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-white/20" 
              placeholder="username" 
              value={profile.username} 
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] md:text-xs font-medium text-white/50 uppercase tracking-wider block">Headline</label>
          <input 
            type="text" 
            name="headline"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-white/20" 
            placeholder="Product-minded developer" 
            value={profile.headline} 
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] md:text-xs font-medium text-white/50 uppercase tracking-wider block">About Me</label>
          <textarea 
            name="bio"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-white/20 min-h-[120px] md:min-h-[160px] resize-y" 
            placeholder="Write a concise public bio."
            value={profile.bio}
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  );
}

function MediaEditor({ profile, setProfile }: { profile: any, setProfile: any }) {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prev: any) => ({ ...prev, [type]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in-up">
      <header>
        <span className="text-[10px] md:text-xs font-semibold tracking-wider text-white/40 uppercase mb-1 md:mb-2 block">Assets</span>
        <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">Media</h1>
      </header>

      <div className="space-y-6 md:space-y-8 max-w-2xl">
        <div className="space-y-4">
          <label className="text-[10px] md:text-xs font-medium text-white/50 uppercase tracking-wider block">Profile Picture</label>
          <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
              {profile.avatar ? (
                <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-white/30" />
              )}
            </div>
            <div className="w-full flex-1">
              <label className="relative group rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-all p-4 md:p-6 text-center cursor-pointer block">
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'avatar')}
                />
                <p className="text-xs md:text-sm font-medium text-white/80">Tap to upload image</p>
              </label>
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-white/5" />

        <div className="space-y-4">
          <label className="text-[10px] md:text-xs font-medium text-white/50 uppercase tracking-wider block">Header Image</label>
          <label className="relative rounded-xl border border-dashed border-white/20 bg-white/5 overflow-hidden h-24 md:h-32 group block cursor-pointer">
            <input 
              type="file" 
              className="hidden" 
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'banner')}
            />
            {profile.banner && (
              <img src={profile.banner} alt="Banner" className="w-full h-full object-cover opacity-50" />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center hover:bg-white/5 transition-all">
              <ImageIcon className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-2 text-white/40" />
              <p className="text-xs md:text-sm font-medium text-white/80">Upload cover photo</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

function LinksEditor({ profile, setProfile }: { profile: any, setProfile: any }) {
  const updateLink = (id: number, field: string, value: string) => {
    const newLinks = (profile.links || []).map((l: any) => 
      l.id === id ? { ...l, [field]: value } : l
    );
    setProfile((prev: any) => ({ ...prev, links: newLinks }));
  };

  const addLink = () => {
    const currentLinks = profile.links || [];
    const newId = currentLinks.length > 0 ? Math.max(...currentLinks.map((l: any) => l.id)) + 1 : 1;
    const newLinks = [...currentLinks, { id: newId, platform: 'Website', url: 'https://' }];
    setProfile((prev: any) => ({ ...prev, links: newLinks }));
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in-up">
      <header>
        <span className="text-[10px] md:text-xs font-semibold tracking-wider text-white/40 uppercase mb-1 md:mb-2 block">Connect</span>
        <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">Social Links</h1>
      </header>

      <div className="space-y-4 md:space-y-6 max-w-2xl">
        <div className="space-y-3 md:space-y-4">
          {(profile.links || []).map((link: any) => (
            <div key={link.id} className="flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-white/5 md:bg-transparent md:border-none md:p-0 md:flex-row md:items-center md:space-x-4 animate-fade-in">
              <input 
                type="text" 
                className="w-full md:w-1/3 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500/50 outline-none" 
                value={link.platform} 
                onChange={(e) => updateLink(link.id, 'platform', e.target.value)}
                placeholder="Platform"
              />
              <input 
                type="url" 
                className="w-full flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500/50 outline-none" 
                value={link.url} 
                onChange={(e) => updateLink(link.id, 'url', e.target.value)}
                placeholder="URL"
              />
              <button 
                onClick={() => {
                  const newLinks = (profile.links || []).filter((l: any) => l.id !== link.id);
                  setProfile((prev: any) => ({ ...prev, links: newLinks }));
                }}
                className="text-xs text-red-400/60 hover:text-red-400 p-1 self-end md:self-auto transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button 
          onClick={addLink}
          className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center gap-2 p-2"
        >
          <span className="text-lg">+</span> Add another link
        </button>
      </div>
    </div>
  );
}
