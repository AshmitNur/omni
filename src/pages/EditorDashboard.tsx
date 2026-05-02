import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, ArrowRight, CheckCircle2, Layout, Plus, Trash2, GripVertical, Settings } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { COMPONENT_REGISTRY, type ComponentType, type VibeComponentData } from '../components/builder/registry';
import { RenderComponent } from '../components/builder/Renderer';
import { PropertiesPanel } from '../components/builder/PropertiesPanel';
import {
  ensureSiteContent,
  getLocalSiteData,
  getPreferredUsername,
  getPublicSitePath,
  normalizePageSlug,
  normalizeSiteData,
  setLocalSiteData,
  upsertSiteContent,
  type VibeSiteData,
} from '../lib/content';

// Sortable wrapper for canvas components
function SortableCanvasItem({ component, isSelected, onClick, onRemove }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: component.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={clsx(
        "relative group mb-4 animate-fade-in-up",
        isDragging && "opacity-50"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <div className={clsx(
        "absolute -inset-2 rounded-xl border-2 pointer-events-none transition-colors z-20",
        isSelected ? "border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]" : "border-transparent group-hover:border-white/20"
      )} />
      
      {/* Controls */}
      <div className={clsx(
        "absolute -right-4 -top-4 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl flex items-center p-1 z-30 transition-opacity",
        isSelected || "opacity-0 group-hover:opacity-100"
      )}>
        <button
          className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <button
          className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className={clsx("rounded-xl overflow-hidden relative", isSelected && "ring-1 ring-white/10")}>
        <RenderComponent data={component} isEditor={true} />
      </div>
    </div>
  );
}

export default function EditorDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  // Left Sidebar Tabs
  const [activeTab, setActiveTab] = useState<'pages' | 'add'>('pages');

  // Site Data State
  const [siteData, setSiteData] = useState<any>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const defaultData: VibeSiteData = {
    siteName: 'My Vibe Site',
    pages: [
      {
        id: 'home',
        title: 'Home',
        slug: 'home',
        components: [
          { id: 'comp_1', type: 'hero', props: COMPONENT_REGISTRY.hero.defaultProps }
        ] as VibeComponentData[]
      }
    ]
  };

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        // Guest mode fallback
        const saved = getLocalSiteData('guest');
        setSiteData(saved ? { ...defaultData, ...saved } : defaultData);
        setIsDataLoading(false);
        return;
      }

      try {
        const preferredUsername = getPreferredUsername(user);
        const content = await ensureSiteContent(user.itemId, preferredUsername, defaultData);
        if (content && content.data) {
          setSiteData(normalizeSiteData({ ...defaultData, ...content.data }, preferredUsername));
          // also update local cache
          setLocalSiteData(user.itemId, content.data);
        } else {
          // If no content in API, check local storage or use default
          const local = getLocalSiteData(user.itemId);
          setSiteData(local ? normalizeSiteData({ ...defaultData, ...local }, preferredUsername) : normalizeSiteData(defaultData, preferredUsername));
        }
      } catch (err) {
        console.error("Failed to load site data from API, using local cache", err);
        const local = getLocalSiteData(user.itemId);
        setSiteData(local ? normalizeSiteData({ ...defaultData, ...local }, getPreferredUsername(user)) : normalizeSiteData(defaultData, getPreferredUsername(user)));
      } finally {
        setIsDataLoading(false);
      }
    };
    loadData();
  }, [user]);

  const [activePageId, setActivePageId] = useState<string>('');
  
  // Keep activePageId in sync when siteData initially loads
  useEffect(() => {
    if (siteData && !activePageId && siteData.pages?.length > 0) {
      setActivePageId(siteData.pages[0].id);
    }
  }, [siteData, activePageId]);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [saveError, setSaveError] = useState<string>('');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const getErrorMessage = (error: unknown) => {
    return error instanceof Error ? error.message : 'Blocks sync failed';
  };

  // Auto-save logic
  useEffect(() => {
    if (!siteData) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSaveStatus('unsaved');
    setSaveError('');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      if (user) {
        // Save to Local Cache immediately
        setLocalSiteData(user.itemId, siteData);
        try {
          // Push to Selise API
          await upsertSiteContent(user.itemId, getPreferredUsername(user), siteData);
          setSaveStatus('saved');
        } catch (err) {
          console.error("Failed to save to Selise API", err);
          setSaveError(getErrorMessage(err));
          setSaveStatus('error');
        }
      } else {
        // Guest mode
        setLocalSiteData('guest', siteData);
        setSaveStatus('saved');
      }
    }, 1500);

    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [siteData, user]);

  const activePage = siteData?.pages?.find((p: any) => p.id === activePageId) || null;
  const activeComponent = activePage?.components?.find((c: any) => c.id === selectedComponentId) || null;
  const publicUsername = getPreferredUsername(user);
  const liveSitePath = getPublicSitePath(publicUsername, activePage?.slug || 'home');

  const handleSave = async () => {
    if (!siteData) return false;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus('saving');
    setSaveError('');
    let persistedToBlocks = false;
    
    if (user) {
      setLocalSiteData(user.itemId, siteData);
      try {
        await upsertSiteContent(user.itemId, publicUsername, siteData);
        persistedToBlocks = true;
      } catch (err) {
        console.error("Manual save to Selise API failed", err);
        setSaveError(getErrorMessage(err));
        setSaveStatus('error');
        return false;
      }
    } else {
      setLocalSiteData('guest', siteData);
    }
    
    setSaveStatus('saved');
    return persistedToBlocks || !user;
  };

  const handleOpenLiveSite = async () => {
    const saved = await handleSave();
    if (saved) navigate(liveSitePath);
  };

  // Page Management
  const addPage = () => {
    const newId = `page_${Date.now()}`;
    const newPage = {
      id: newId,
      title: 'New Page',
      slug: `new-page-${Date.now()}`,
      components: []
    };
    setSiteData((prev: any) => ({ ...prev, pages: [...prev.pages, newPage] }));
    setActivePageId(newId);
    setSelectedComponentId(null);
  };

  const updateActivePage = (updates: any) => {
    setSiteData((prev: any) => ({
      ...prev,
      pages: prev.pages.map((p: any) => p.id === activePageId ? { ...p, ...updates } : p)
    }));
  };

  // Component Management
  const addComponent = (type: ComponentType) => {
    if (!activePage) return;
    const newComponent: VibeComponentData = {
      id: `comp_${Date.now()}`,
      type,
      props: { ...COMPONENT_REGISTRY[type].defaultProps }
    };
    
    updateActivePage({
      components: [...activePage.components, newComponent]
    });
    setSelectedComponentId(newComponent.id);
  };

  const updateComponent = (id: string, updates: Partial<VibeComponentData>) => {
    if (!activePage) return;
    updateActivePage({
      components: activePage.components.map((c: any) => c.id === id ? { ...c, ...updates } : c)
    });
  };

  const removeComponent = (id: string) => {
    if (!activePage) return;
    updateActivePage({
      components: activePage.components.filter((c: any) => c.id !== id)
    });
    if (selectedComponentId === id) setSelectedComponentId(null);
  };

  // DnD sorting for Canvas
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !activePage) return;

    const oldIndex = activePage.components.findIndex((c: any) => c.id === active.id);
    const newIndex = activePage.components.findIndex((c: any) => c.id === over.id);

    updateActivePage({
      components: arrayMove(activePage.components, oldIndex, newIndex)
    });
  };

  if (isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative z-10 text-white/40 animate-pulse">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen relative z-10">
      {/* Top Navigation */}
      <nav className="h-[60px] fixed top-0 w-full z-50 flex items-center justify-between px-6 bg-[#0D0F12]/80 backdrop-blur-md border-b border-white/5">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-blue-400 to-purple-500 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(0,0,0,0.5)]" />
          <span className="font-display font-black text-xl tracking-[0.15em] text-white">VIBE</span>
        </Link>
        <div className="flex items-center space-x-3">
          <span className="text-xs text-white/40 mr-4 hidden sm:inline-block">
            {saveStatus === 'saved' && 'All changes saved'}
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'unsaved' && 'Unsaved changes'}
            {saveStatus === 'error' && (
              <span title={saveError || undefined}>Local draft saved, Blocks sync failed</span>
            )}
          </span>
          <button 
            className="hidden sm:flex items-center text-xs font-medium px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/5 text-white/80 transition-colors" 
            onClick={handleOpenLiveSite}
          >
            Live Preview <ArrowRight className="w-3 h-3 ml-1" />
          </button>
          <button 
            className="flex items-center text-xs font-medium px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/5 text-white/80 transition-colors" 
            onClick={() => {
              signOut();
              navigate('/login');
            }}
          >
            <LogOut className="w-3 h-3 mr-1" /> <span className="hidden xs:inline">Log out</span>
          </button>
        </div>
      </nav>

      <div className="flex flex-1 pt-[60px] h-screen overflow-hidden relative">
        
        {/* Left Sidebar (Pages & Components) */}
        <div className="w-[260px] hidden md:flex flex-col h-full shrink-0 bg-black/40 backdrop-blur-xl border-r border-white/5 z-20 shadow-2xl">
          {/* Tabs */}
          <div className="flex p-2 border-b border-white/5">
            <button 
              className={clsx("flex-1 py-2 text-xs font-medium rounded-lg transition-colors", activeTab === 'pages' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80")}
              onClick={() => setActiveTab('pages')}
            >
              Pages
            </button>
            <button 
              className={clsx("flex-1 py-2 text-xs font-medium rounded-lg transition-colors", activeTab === 'add' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80")}
              onClick={() => setActiveTab('add')}
            >
              Add Component
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'pages' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Site Pages</h3>
                  <button onClick={addPage} className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {siteData?.pages?.map((page: any) => (
                  <button
                    key={page.id}
                    onClick={() => { setActivePageId(page.id); setSelectedComponentId(null); }}
                    className={clsx(
                      "w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                      activePageId === page.id 
                        ? "text-white bg-blue-500/10 border border-blue-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" 
                        : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                    )}
                  >
                    <Layout className={clsx("w-4 h-4 mr-3", activePageId === page.id ? "text-blue-400" : "text-white/40")} />
                    {page.title}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'add' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Vibe Components</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(COMPONENT_REGISTRY) as ComponentType[]).map((type) => {
                    const comp = COMPONENT_REGISTRY[type];
                    const Icon = comp.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => addComponent(type)}
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/50 hover:bg-white/10 transition-all group"
                      >
                        <Icon className="w-6 h-6 mb-2 text-white/40 group-hover:text-blue-400 transition-colors" />
                        <span className="text-[10px] text-center font-medium text-white/60 group-hover:text-white">{comp.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 h-full overflow-y-auto relative" onClick={() => setSelectedComponentId(null)}>
          <div className="max-w-5xl mx-auto py-12 px-4 md:px-12 min-h-full flex flex-col">
            {activePage ? (
              <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl shadow-2xl p-4 md:p-8 min-h-[800px]">
                {!activePage.components || activePage.components.length === 0 ? (
                  <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                      <Layout className="w-8 h-8 text-white/20" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Empty Page</h3>
                    <p className="text-white/40 max-w-sm mb-6">This page has no components yet. Select "Add Component" from the sidebar to start building.</p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveTab('add'); }}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-colors"
                    >
                      Browse Components
                    </button>
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={activePage.components?.map((c: any) => c.id) || []} strategy={verticalListSortingStrategy}>
                      <div className="space-y-4">
                        {activePage.components?.map((comp: any) => (
                          <SortableCanvasItem
                            key={comp.id}
                            component={comp}
                            isSelected={selectedComponentId === comp.id}
                            onClick={() => setSelectedComponentId(comp.id)}
                            onRemove={() => removeComponent(comp.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-white/40">Select a page to start editing</div>
            )}
          </div>
        </div>

        {/* Right Properties Panel */}
        <div className="w-[300px] hidden lg:flex flex-col h-full shrink-0 bg-black/40 backdrop-blur-xl border-l border-white/5 z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Properties</h2>
            {selectedComponentId && (
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 uppercase tracking-wider font-bold">Editing</span>
            )}
          </div>
          
          {selectedComponentId ? (
            <PropertiesPanel 
              component={activeComponent} 
              updateComponent={updateComponent} 
            />
          ) : activePage ? (
            <div className="p-4 space-y-4">
              <div className="mb-6 pb-4 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Settings className="w-4 h-4"/> Page Settings</h3>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-white/60 uppercase">Page Title</label>
                <input 
                  type="text" 
                  value={activePage.title}
                  onChange={(e) => updateActivePage({ title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div className="space-y-1.5 mt-4">
                <label className="text-[10px] font-medium text-white/60 uppercase">Page Slug / URL</label>
                <input 
                  type="text" 
                  value={activePage.slug}
                  onChange={(e) => updateActivePage({ slug: normalizePageSlug(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500/50 font-mono"
                />
                <p className="text-[10px] text-white/30 mt-1">{window.location.origin}{getPublicSitePath(publicUsername, activePage.slug)}</p>
              </div>
            </div>
          ) : (
             <div className="flex-1 flex items-center justify-center text-white/40 text-sm p-6 text-center">
               Select a page to edit settings.
             </div>
          )}

          <div className="p-4 border-t border-white/5 mt-auto">
            <button 
              onClick={handleSave}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Site
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
