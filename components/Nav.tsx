"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "News" },
  { href: "/email", label: "Email" },
  { href: "/thesis", label: "Thesis" },
  { href: "/rejected", label: "System Rejected" },
  { href: "/runs", label: "Runs" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="nav">
      <div className="navInner">
        <span className="navBrand">Funding Outreach Engine</span>
        <button
          className="navToggle"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle navigation menu"
          aria-expanded={open}
        >
          {open ? "✕" : "☰"}
        </button>
        <div className={`navLinks ${open ? "navLinksOpen" : ""}`}>
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`navLink ${pathname === link.href ? "navLinkActive" : ""}`}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
