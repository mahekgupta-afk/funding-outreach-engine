"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE_SELECTOR = "a, button, input, textarea, select, [role='button']";

/**
 * Custom glow-beam cursor. Runs entirely outside React's render cycle (direct
 * DOM manipulation on a raf loop) since recreating React state on every
 * mousemove would be far too expensive. Hover detection uses event
 * delegation on `document` rather than binding to each interactive element
 * once at mount, since most interactive elements here (draft cards, news
 * filters, buttons) are mounted/unmounted dynamically as data loads or tabs
 * switch.
 */
export default function CursorEffect() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const head = headRef.current;
    const trail = trailRef.current;
    if (!container || !head || !trail) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return; // leave the native cursor alone
    }

    document.body.classList.add("cursorFxActive");

    // The orb has nowhere real to render until the first mousemove fires, so
    // it starts hidden rather than sitting at a stale (0,0) default — then
    // snaps straight to the real cursor position (no easing lag, no stray
    // particle burst from the origin) the instant that first event arrives.
    let hasPosition = false;
    head!.style.opacity = "0";

    let lastX = 0;
    let lastY = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId = 0;

    function onMouseMove(e: MouseEvent) {
      targetX = e.clientX;
      targetY = e.clientY;

      if (!hasPosition) {
        hasPosition = true;
        currentX = targetX;
        currentY = targetY;
        lastX = targetX;
        lastY = targetY;
        head!.style.opacity = "1";
        head!.style.transform = `translate(${currentX - 10}px, ${currentY - 10}px)`;
        return;
      }

      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 2) {
        trail!.style.opacity = "1";
        trail!.style.width = `${Math.min(dist * 5, 400)}px`;
        trail!.style.transform =
          `translate(${e.clientX}px, ${e.clientY}px) rotate(${angle}deg) scaleY(${Math.min(dist / 20, 3)})`;
        createParticles(e.clientX, e.clientY, angle, dist);
      } else {
        trail!.style.opacity = "0";
      }

      lastX = e.clientX;
      lastY = e.clientY;
    }

    function animate() {
      currentX += (targetX - currentX) * 0.2;
      currentY += (targetY - currentY) * 0.2;
      head!.style.transform = `translate(${currentX - 10}px, ${currentY - 10}px)`;
      rafId = requestAnimationFrame(animate);
    }

    function createParticles(x: number, y: number, angle: number, dist: number) {
      const particleCount = Math.min(Math.ceil(dist / 3), 12); // capped for perf
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement("div");
        particle.className = "cursorParticle";

        const size = Math.random() * 4 + 2;
        const color =
          Math.random() > 0.5
            ? `rgba(67, 56, 202, ${0.7 + Math.random() * 0.3})`
            : `rgba(129, 140, 248, ${0.7 + Math.random() * 0.3})`;

        const spread = (angle + (Math.random() - 0.5) * 60) * (Math.PI / 180);
        const tx = Math.cos(spread) * (50 + Math.random() * 100);
        const ty = Math.sin(spread) * (50 + Math.random() * 100);

        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.background = color;
        particle.style.boxShadow = `0 0 ${size * 3}px ${color}`;
        particle.style.setProperty("--tx", `${tx}px`);
        particle.style.setProperty("--ty", `${ty}px`);

        container!.appendChild(particle);
        setTimeout(() => particle.remove(), 1200);
      }
    }

    function setHover(active: boolean) {
      if (active) {
        head!.style.background =
          "radial-gradient(circle, rgba(129, 140, 248, 0.95) 0%, rgba(67, 56, 202, 0.5) 50%, transparent 70%)";
        head!.style.filter = "blur(12px)";
        head!.style.boxShadow = "0 0 40px rgba(129, 140, 248, 0.8), 0 0 80px rgba(67, 56, 202, 0.4)";
      } else {
        head!.style.background =
          "radial-gradient(circle, rgba(67, 56, 202, 0.9) 0%, rgba(129, 140, 248, 0.4) 50%, transparent 70%)";
        head!.style.filter = "blur(8px)";
        head!.style.boxShadow = "0 0 30px rgba(67, 56, 202, 0.6), 0 0 60px rgba(129, 140, 248, 0.3)";
      }
    }

    function onOver(e: MouseEvent) {
      if ((e.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) setHover(true);
    }
    function onOut(e: MouseEvent) {
      if ((e.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) setHover(false);
    }

    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    rafId = requestAnimationFrame(animate);

    return () => {
      document.body.classList.remove("cursorFxActive");
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={containerRef} id="cursor-beam">
      <div ref={headRef} className="cursorBeamHead" />
      <div ref={trailRef} className="cursorBeamTrail" />
    </div>
  );
}
