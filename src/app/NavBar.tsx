"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./layout.module.css";

const TABS = [
  { href: "/deals", label: "案件" },
  { href: "/companies", label: "企業" },
  { href: "/contacts", label: "担当者" },
  { href: "/employees", label: "社員" },
  { href: "/todos", label: "TODO" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={
            pathname.startsWith(tab.href) ? styles.navLinkActive : styles.navLink
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
