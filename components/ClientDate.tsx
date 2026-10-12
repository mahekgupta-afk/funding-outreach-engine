"use client";

import { useEffect, useState } from "react";

/**
 * Renders a locale-formatted date, but only after mount. Formatting on the
 * server and reusing that string on the client would mismatch whenever the
 * server's locale/timezone differs from the browser's, causing a hydration
 * error — so the server render is a stable placeholder (the raw ISO string)
 * and the real format is swapped in client-side once mounted.
 */
export default function ClientDate({ iso }: { iso: string }) {
  const [label, setLabel] = useState(iso);

  useEffect(() => {
    setLabel(new Date(iso).toLocaleString());
  }, [iso]);

  return <>{label}</>;
}
