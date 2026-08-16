import { useEffect } from "react";
import { getStatus } from "../lib/api";
import { useJarvisStore } from "../state/store";

const POLL_INTERVAL_MS = 15000;

export function useServiceStatus() {
  const setServiceStatus = useJarvisStore((s) => s.setServiceStatus);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const status = await getStatus();
        if (!cancelled) setServiceStatus(status);
      } catch {
        if (!cancelled) {
          setServiceStatus({
            ai: "offline",
            stt: "offline",
            tts: "offline",
            memory: "offline",
            search: "offline",
            network: "offline",
          });
        }
      }
    };
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [setServiceStatus]);
}
