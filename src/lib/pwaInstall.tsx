import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaInstallContextValue {
  canInstall: boolean;
  promptInstall: () => Promise<boolean>;
}

const PwaInstallContext = createContext<PwaInstallContextValue | undefined>(undefined);

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      deferredPromptRef.current = null;
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) return false;

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;

    deferredPromptRef.current = null;
    setCanInstall(false);

    return choice.outcome === 'accepted';
  };

  return (
    <PwaInstallContext.Provider value={{ canInstall, promptInstall }}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall() {
  const context = useContext(PwaInstallContext);
  if (context === undefined) {
    throw new Error('usePwaInstall must be used within a PwaInstallProvider');
  }
  return context;
}
