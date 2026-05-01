import React from 'react';
import type { VibeComponentData } from './registry';

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
            <SelectField label="Alignment" value={props.alignment} options={['left', 'center', 'right']} onChange={(v) => handlePropChange('alignment', v)} />
          </>
        );
      case 'gallery':
        return (
          <>
            <SelectField label="Columns" value={props.columns.toString()} options={['2', '3', '4']} onChange={(v) => handlePropChange('columns', parseInt(v))} />
            <div className="space-y-3 mt-4">
              <label className="text-xs font-medium text-white/60 uppercase">Images</label>
              {props.images.map((img: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <input 
                    type="url" 
                    value={img} 
                    onChange={(e) => {
                      const newImages = [...props.images];
                      newImages[idx] = e.target.value;
                      handlePropChange('images', newImages);
                    }}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white"
                  />
                  <button 
                    className="text-red-400 p-2 hover:bg-red-500/10 rounded"
                    onClick={() => {
                      const newImages = props.images.filter((_: any, i: number) => i !== idx);
                      handlePropChange('images', newImages);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button 
                className="w-full py-2 bg-white/5 border border-white/10 border-dashed rounded text-xs text-white/80 hover:bg-white/10"
                onClick={() => {
                  handlePropChange('images', [...props.images, 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=400&q=80']);
                }}
              >
                + Add Image
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
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-1.5 mb-4">
      <label className="text-[10px] font-medium text-white/60 uppercase">{label}</label>
      <div className="flex flex-col gap-2">
        {value && <img src={value} alt="Preview" className="w-full h-24 object-cover rounded-lg border border-white/10" />}
        <label className="w-full bg-white/5 hover:bg-white/10 border border-white/10 border-dashed rounded-lg p-2 text-center text-xs text-white/80 cursor-pointer transition-colors">
          Upload Image
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
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
