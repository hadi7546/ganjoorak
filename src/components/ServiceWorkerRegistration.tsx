"use client";

import { useEffect } from "react";

const ServiceWorkerRegistration = () => {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Service worker registration is best-effort for offline shell support.
    });
  }, []);

  return null;
};

export default ServiceWorkerRegistration;
