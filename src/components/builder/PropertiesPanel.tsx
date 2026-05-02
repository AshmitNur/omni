import React, { useState } from 'react';
import type { VibeComponentData } from './registry';
import { uploadMedia, fileToDataUrl } from '../../lib/media';

interface PropertiesPanelProps {
  component: VibeComponentData | null;
  updateComponent: (id: string, updates: Partial<VibeComponentData>) => void;
}

export function PropertiesPanel({ component, updateComponent }: PropertiesPanelProps) {
  if (!component) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/40 text-sm p-6 text-center">
        Select a component on the canvas to edit its properties.
      </div>
    );
  }

  const { id, type, props } = component;

  const handlePropChange = (key: string, value: any) => {
    updateComponent(id, { props: { ...props, [key]: value } });
  };

  const renderFields = () => {
    switch (type) {
      case 'hero':
        return (
          <>
            <InputField label="Title" value={props.title} onChange={(v) => handlePropChange('title', v)} />
            <InputField label="Subtitle" value={props.subtitle} onChange={(v) => handlePropChange('subtitle', v)} />
            <SelectField label="Alignment" value={props.alignment} options={['left', 'center', 'right']} onChange={(v) => handlePropChange('alignment', v)} />
            <InputField label="Button Text" value={props.buttonText} onChange={(v) => handlePropChange('buttonText', v)} />
            <ImageUploadField label="Background Image" value={props.backgroundImage} onChange={(v) => handlePropChange('backgroundImage', v)} />
          </>
        );
      case 'text':
        return (
          <>
            <TextAreaField label="Content" value={props.content} onChange={(v) => handlePropChange('content', v)} />
            <SelectField label="Font Size" value={props.fontSize} options={['small', 'base', 'large']} onChange={(v) => handlePropChange('fontSize', v)} />
            <SelectField label="Font Family" value={props.fontFamily} options={['sans', 'serif', 'mono', 'display']} onChange={(v) => handlePropChange('fontFamily', v)} />
            <SelectField label="Alignment" value={props.alignment} options={['left', 'center', 'right']} onChange={(v) => handlePropChange('alignment', v)} />
          </>
        );
      case 'gallery':
        return (
          <>
            <SelectField label="Columns" value={props.columns.toString()} options={['2', '3', '4']} onChange={(v) => handlePropChange('columns', parseInt(v))} />
            <div className="space-y-4 mt-4">
              <label className="text-xs font-medium text-white/60 uppercase">Images</label>
              {props.images.map((img: string, idx: number) => (
                <div key={idx} className="relative p-3 bg-white/5 border border-white/10 rounded-lg">
                  <button 
                    className="absolute top-2 right-2 text-red-400 p-1 hover:bg-red-500/10 rounded z-10"
                    onClick={() => {
                      const newImages = props.images.filter((_: any, i: number) => i !== idx);
                      handlePropChange('images', newImages);
                    }}
                  >
                    ×
                  </button>
                  <ImageUploadField 
                    label={`Image ${idx + 1}`} 
                    value={img} 
                    onChange={(v: string) => {
                      const newImages = [...props.images];
                      newImages[idx] = v;
                      handlePropChange('images', newImages);
                    }} 
                  />
                </div>
              ))}
              <button 
                className="w-full py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-medium transition-colors"
                onClick={() => {
                  handlePropChange('images', [...props.images, 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=400&q=80']);
                }}
              >
                + Add Image Slot
              </button>
            </div>
          </>
        );
      case 'contact':
        return (
          <>
            <InputField label="Title" value={props.title} onChange={(v) => handlePropChange('title', v)} />
            <InputField label="Button Text" value={props.buttonText} onChange={(v) => handlePropChange('buttonText', v)} />
            <InputField label="Recipient Email" value={props.emailRecipient} onChange={(v) => handlePropChange('emailRecipient', v)} type="email" />
          </>
        );
      case 'links':
        return (
          <>
            <div className="space-y-3 mt-4">
              <label className="text-xs font-medium text-white/60 uppercase">Links</label>
              {(props.links || []).map((link: any, idx: number) => (
                <div key={idx} className="flex flex-col gap-2 p-3 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/40 uppercase font-medium">Link {idx + 1}</span>
                    <button 
                      className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                      onClick={() => {
                        const newLinks = props.links.filter((_: any, i: number) => i !== idx);
                        handlePropChange('links', newLinks);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={link.platform} 
                    placeholder="Platform (e.g. Website)"
                    onChange={(e) => {
                      const newLinks = [...props.links];
                      newLinks[idx] = { ...newLinks[idx], platform: e.target.value };
                      handlePropChange('links', newLinks);
                    }}
                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                  />
                  <input 
                    type="url" 
                    value={link.url} 
                    placeholder="https://"
                    onChange={(e) => {
                      const newLinks = [...props.links];
                      newLinks[idx] = { ...newLinks[idx], url: e.target.value };
                      handlePropChange('links', newLinks);
                    }}
                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                  />
                </div>
              ))}
              <button 
                className="w-full py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-medium transition-colors mt-2"
                onClick={() => {
                  const newId = props.links && props.links.length > 0 ? Math.max(...props.links.map((l:any)=>l.id)) + 1 : 1;
                  handlePropChange('links', [...(props.links || []), { id: newId, platform: 'New Link', url: 'https://' }]);
                }}
              >
                + Add Another Link
              </button>
            </div>
          </>
        );
      default:
        return <div>No properties available</div>;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="mb-6 pb-4 border-b border-white/10">
        <h3 className="text-sm font-semibold text-white capitalize">{type} Properties</h3>
      </div>
      {renderFields()}
    </div>
  );
}

// Helper Fields
function InputField({ label, value, onChange, type = "text" }: any) {
  return (
    <div className="space-y-1.5 mb-4">
      <label className="text-[10px] font-medium text-white/60 uppercase">{label}</label>
      <input 
        type={type} 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange }: any) {
  return (
    <div className="space-y-1.5 mb-4">
      <label className="text-[10px] font-medium text-white/60 uppercase">{label}</label>
      <textarea 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500/50 min-h-[100px]"
      />
    </div>
  );
}

function SelectField({ label, value, options, onChange }: any) {
  return (
    <div className="space-y-1.5 mb-4">
      <label className="text-[10px] font-medium text-white/60 uppercase">{label}</label>
      <select 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none"
      >
        {options.map((opt: string) => (
          <option key={opt} value={opt} className="bg-gray-900">{opt}</option>
        ))}
      </select>
    </div>
  );
}

function ImageUploadField({ label, value, onChange }: any) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        setProgress(0);
        // Instant local preview
        const localPreview = await fileToDataUrl(file);
        onChange(localPreview);

        // Actual upload to Selise Media Block
        const result = await uploadMedia(file, 'vibe-uploads', (p) => setProgress(p));
        onChange(result.url);
      } catch (err) {
        console.error("Upload failed", err);
        alert("Failed to upload image. Using local preview only.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="space-y-1.5 mb-4">
      <label className="text-[10px] font-medium text-white/60 uppercase">{label}</label>
      <div className="flex flex-col gap-2 relative">
        {value && <img src={value} alt="Preview" className="w-full h-24 object-cover rounded-lg border border-white/10" />}
        {isUploading && (
          <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
            <div className="w-3/4 bg-white/20 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        <label className={`w-full bg-white/5 hover:bg-white/10 border border-white/10 border-dashed rounded-lg p-2 text-center text-xs transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed text-white/40' : 'cursor-pointer text-white/80'}`}>
          {isUploading ? 'Uploading...' : 'Upload Image'}
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={isUploading} />
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">or URL:</span>
          <input 
            type="url" 
            value={value || ''} 
            onChange={(e) => onChange(e.target.value)} 
            className="flex-1 bg-transparent border-b border-white/10 p-1 text-xs text-white focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </div>
    </div>
  );
}
