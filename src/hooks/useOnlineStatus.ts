import { useEffect, useRef, useState } from 'react';
import { toast } from '@/store/uiStore';

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  const first = useRef(true);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      toast.success('Conexión recuperada', 'Ya estás online de nuevo.');
    };
    const handleOffline = () => {
      setOnline(false);
      toast.warning('Sin conexión', 'Podés seguir trabajando: los datos son locales.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    first.current = false;
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}
