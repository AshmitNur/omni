import React from 'react';
import { Type, Image as ImageIcon, Send, LayoutTemplate } from 'lucide-react';

export type ComponentType = 'hero' | 'text' | 'gallery' | 'contact';

export interface VibeComponentData {
  id: string;
  type: ComponentType;
  props: any;
}

export const COMPONENT_REGISTRY = {
  hero: {
    name: 'Hero Section',
    icon: LayoutTemplate,
    defaultProps: {
      title: 'Welcome to my Website',
      subtitle: 'Build stunning websites without code.',
      alignment: 'center',
      backgroundImage: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80',
      buttonText: 'Get Started',
    }
  },
  text: {
    name: 'Text Block',
    icon: Type,
    defaultProps: {
      content: 'This is a text block. You can edit this text in the properties panel to say whatever you want.',
      fontSize: 'base',
      alignment: 'left',
    }
  },
  gallery: {
    name: 'Image Gallery',
    icon: ImageIcon,
    defaultProps: {
      images: [
        'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80'
      ],
      columns: 3,
    }
  },
  contact: {
    name: 'Contact Form',
    icon: Send,
    defaultProps: {
      title: 'Contact Us',
      buttonText: 'Send Message',
      emailRecipient: 'test@example.com'
    }
  }
};
