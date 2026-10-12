"use client";

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

  return (
    <nav className="nav">
      <div className="navInner">
        <span className="navBrand">Funding Outreach Engine</span>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`navLink ${pathname === link.href ? "navLinkActive" : ""}`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
