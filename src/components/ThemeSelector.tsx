import React from 'react';
import { ThemeDropdown } from './ThemeDropdown';

// Re-export ThemeDropdown as ThemeSelector for backwards compatibility
export const ThemeSelector: React.FC = () => {
  return <ThemeDropdown />;
};

export { ThemeDropdown };
