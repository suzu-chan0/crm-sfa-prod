"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./RowActionMenu.module.css";

export type RowAction = {
  label: string;
  danger?: boolean;
  onClick: () => void;
};

type Props = {
  actions: RowAction[];
};

export function RowActionMenu({ actions }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    // Position menu below the button, aligned to the right
    const menuWidth = 130;
    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    let top = rect.bottom + 4;
    // If near bottom of viewport, open upward
    if (top + 100 > window.innerHeight) {
      top = rect.top - 4; // will be adjusted with transform
    }
    setPos({ top, left });
    setOpen(true);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on scroll
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener("scroll", handler, true);
    return () => window.removeEventListener("scroll", handler, true);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={styles.btn}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        …
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          className={styles.menu}
          style={{ top: pos.top, left: pos.left }}
        >
          {actions.map((a, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.menuItem} ${a.danger ? styles.menuItemDanger : ""}`}
              onClick={() => {
                setOpen(false);
                a.onClick();
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
