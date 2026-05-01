import React from 'react';
import type { VibeComponentData } from './registry';
import clsx from 'clsx';

export function RenderComponent({ data, isEditor }: { data: VibeComponentData, isEditor?: boolean }) {
  const { type, props } = data;

  switch (type) {
    case 'hero':
      return (
        <div 
          className={clsx(
            "relative w-full overflow-hidden flex flex-col justify-center",
            isEditor ? "min-h-[300px] rounded-xl" : "min-h-[500px]"
          )}
          style={{
            backgroundImage: `url(${props.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div className={clsx(
            "relative z-10 p-8 max-w-4xl mx-auto w-full",
            props.alignment === 'center' ? 'text-center' : props.alignment === 'right' ? 'text-right' : 'text-left'
          )}>
            <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">{props.title}</h1>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">{props.subtitle}</p>
            {props.buttonText && (
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold transition-colors">
                {props.buttonText}
              </button>
            )}
          </div>
        </div>
      );

    case 'text':
      return (
        <div className={clsx(
          "w-full p-6",
          props.alignment === 'center' ? 'text-center' : props.alignment === 'right' ? 'text-right' : 'text-left',
          props.fontSize === 'large' ? 'text-xl' : props.fontSize === 'small' ? 'text-sm' : 'text-base',
          "text-white/80"
        )}>
          {props.content.split('\n').map((line: string, i: number) => (
            <p key={i} className="mb-2 last:mb-0">{line}</p>
          ))}
        </div>
      );

    case 'gallery':
      return (
        <div className="w-full p-6">
          <div className={clsx(
            "grid gap-4",
            props.columns === 2 ? 'grid-cols-2' : props.columns === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'
          )}>
            {props.images.map((img: string, i: number) => (
              <div key={i} className="aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10">
                <img src={img} alt={`Gallery image ${i}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      );

    case 'contact':
      return (
        <div className="w-full p-6 max-w-md mx-auto">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">{props.title}</h2>
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="text-xs text-white/60 mb-1 block">Name</label>
                <input type="text" className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors" placeholder="Your name" />
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1 block">Email</label>
                <input type="email" className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors" placeholder="your@email.com" />
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1 block">Message</label>
                <textarea className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors min-h-[100px]" placeholder="How can we help?" />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold p-3 rounded-lg transition-colors">
                {props.buttonText}
              </button>
            </form>
          </div>
        </div>
      );

    default:
      return <div className="p-4 bg-red-500/20 text-red-400 rounded-lg">Unknown component type</div>;
  }
}
