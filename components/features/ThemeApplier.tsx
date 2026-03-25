'use client';

import { useEffect } from 'react';

export function ThemeApplier() {
  useEffect(() => {
    const apply = () => {
      const root = document.documentElement;
      const saved = localStorage.getItem('theme');
      let dark: boolean;
      if (saved === 'dark') dark = true;
      else if (saved === 'light') dark = false;
      else dark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      if (dark) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    };

    apply();

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onOsChange = () => {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return;
      apply();
    };
    mq.addEventListener('change', onOsChange);

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'theme') apply();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      mq.removeEventListener('change', onOsChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return null;
}
