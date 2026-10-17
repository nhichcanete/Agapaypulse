import { useEffect, useRef } from 'react';

export function usePolling(callback, ms = 5000) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const initialRun = window.setTimeout(() => savedCallback.current(), 0);
    const id = setInterval(() => savedCallback.current(), ms);
    return () => {
      window.clearTimeout(initialRun);
      clearInterval(id);
    };
  }, [ms]);
}