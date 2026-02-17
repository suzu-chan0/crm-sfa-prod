"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./page.module.css";

type Deal = {
  id: string;
  name: string;
  phase: string;
  probability: number | null;
  importance: string | null;
  createdAt: string;
  updatedAt: string;
  customerCompany: { id: string; name: string } | null;
  employee: { id: string; name: string } | null;
  lastActivityDate: string | null;
  overdueTodoCount: number;
};

type Employee = { id: string; name: string };

const PHASES = [
  { key: "", label: "すべて" },
  { key: "MEETING", label: "打合せ" },
  { key: "SAMPLE_PROVIDED", label: "サンプル提供" },
  { key: "INITIAL_EVAL", label: "初期評価" },
  { key: "FULL_EVAL", label: "実機評価" },
  { key: "WON", label: "採用" },
  { key: "LOST", label: "不採用" },
];

const PHASE_LABEL: Record<string, string> = {
  MEETING: "打合せ",
  SAMPLE_PROVIDED: "サンプル提供",
  INITIAL_EVAL: "初期評価",
  FULL_EVAL: "実機評価",
  WON: "採用",
  LOST: "不採用",
};

const IMPORTANCE_LABEL: Record<string, string> = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
};

type SortKey = "updatedAt" | "name" | "probability";

const PAGE_SIZE = 20;

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Filters
  const [q, setQ] = useState("");
  const [phase, setPhase] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  // Sort
  const [sortBy, setSortBy] = useState<SortKey>("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Debounced search
  const [searchQ, setSearchQ] = useState("");

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Employee[]) => setEmployees(data))
      .catch(() => {});
  }, []);

  const fetchDeals = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQ) params.set("q", searchQ);
    if (phase) params.set("phase", phase);
    if (employeeId) params.set("employeeId", employeeId);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);

    fetch(`/api/deals?${params}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((data: { items: Deal[]; total: number }) => {
        setDeals(data.items);
        setTotal(data.total);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [searchQ, phase, employeeId, page, sortBy, sortOrder]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // Debounce keyword search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQ(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const handlePhaseChange = (v: string) => {
    setPhase(v);
    setPage(1);
  };
  const handleEmployeeChange = (v: string) => {
    setEmployeeId(v);
    setPage(1);
  };

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const sortIndicator = (key: SortKey) => {
    if (sortBy !== key) return "";
    return sortOrder === "asc" ? " ▲" : " ▼";
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (error) return <p className={styles.error}>エラー: {error}</p>;

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>案件一覧</h1>
        <span className={styles.totalCount}>{total}件</span>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>検索</label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="案件名・顧客名"
          />
        </div>
        <div className={styles.filterGroup}>
          <label>フェーズ</label>
          <select value={phase} onChange={(e) => handlePhaseChange(e.target.value)}>
            {PHASES.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>担当</label>
          <select
            value={employeeId}
            onChange={(e) => handleEmployeeChange(e.target.value)}
          >
            <option value="">すべて</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className={styles.loading}>読み込み中...</p>
      ) : deals.length === 0 ? (
        <p className={styles.empty}>該当する案件はありません</p>
      ) : (
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th
                  className={styles.sortable}
                  onClick={() => handleSort("name")}
                >
                  案件名{sortIndicator("name")}
                </th>
                <th>フェーズ</th>
                <th>顧客企業</th>
                <th>担当</th>
                <th>重要度</th>
                <th
                  className={styles.sortable}
                  onClick={() => handleSort("probability")}
                >
                  確度{sortIndicator("probability")}
                </th>
                <th
                  className={styles.sortable}
                  onClick={() => handleSort("updatedAt")}
                >
                  最終更新{sortIndicator("updatedAt")}
                </th>
                <th>最終活動</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id}>
                  <td>
                    <Link href={`/deals/${deal.id}`} className={styles.dealLink}>
                      {deal.name}
                    </Link>
                  </td>
                  <td>
                    <span className={styles.phaseBadge}>
                      {PHASE_LABEL[deal.phase] ?? deal.phase}
                    </span>
                  </td>
                  <td>{deal.customerCompany?.name ?? "—"}</td>
                  <td>{deal.employee?.name ?? "—"}</td>
                  <td>{IMPORTANCE_LABEL[deal.importance ?? ""] ?? "—"}</td>
                  <td>
                    {deal.probability != null ? `${deal.probability}%` : "—"}
                  </td>
                  <td>{deal.updatedAt.slice(0, 10)}</td>
                  <td>
                    {deal.lastActivityDate
                      ? deal.lastActivityDate.slice(0, 10)
                      : "—"}
                  </td>
                  <td>
                    {deal.overdueTodoCount > 0 && (
                      <span
                        className={styles.overdueBadge}
                        title={`期限超過TODO: ${deal.overdueTodoCount}件`}
                      >
                        !
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.paging}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            前へ
          </button>
          <span className={styles.pageInfo}>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
