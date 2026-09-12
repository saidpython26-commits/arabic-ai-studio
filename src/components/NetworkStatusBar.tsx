import React from 'react';
import { Language } from '../types';

interface NetworkStatusBarProps {
  language: Language;
}

// Silent mode: No intrusive top banners interrupting the user experience
export const NetworkStatusBar: React.FC<NetworkStatusBarProps> = () => {
  return null;
};
