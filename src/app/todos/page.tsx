"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./page.module.css";

type Todo = {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  priority: string;
  type: string;
  assigneeId: string | null;
  deal: { id: string; name: string; phase: string } | null;
  customerCompany: { id: string; name: string } | null;
  assignee: { id: string; name: string } | null;
};

type Employee = { id: string; name: string };
type Company = { id: string; name: string };

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "未着手",
  IN_PROGRESS: "進行中",
  COMPLETED: "完了",
};

const PRIORITY_LABEL: Record<string, string> = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
};

const PHASE_LABEL: Record<string, string> = {
  MEETING: "打合せ",
  SAMPLE_PROVIDED: "サンプル提供",
  INITIAL_EVAL: "初期評価",
  FULL_EVAL: "実機評価",
  WON: "採用",
  LOST: "不採用",
};

const PHASES = [
  { key: "", label: "すべて" },
  { key: "MEETING", label: "打合せ" },
  { key: "SAMPLE_PROVIDED", label: "サンプル提供" },
  { key: "INITIAL_EVAL", label: "初期評価" },
  { key: "FULL_EVAL", label: "実機評価" },
  { key: "WON", label: "採用" },
  { key: "LOST", label: "不採用" },
];

type SortKey = "createdAt" | "dueDate" | "priority" | "updatedAt";
const PAGE_SIZE = 20;

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Filters
  const [q, setQ] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [dealPhaseFilter, setDealPhaseFilter] = useState("");

  // Sort
  const [sortBy, setSortBy] = useState<SortKey>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetch("/api/employees").then((r) => r.ok ? r.json() : []).then(setEmployees).catch(() => {});
    fetch("/api/companies").then((r) => r.ok ? r.json() : []).then(setCompanies).catch(() => {});
  }, []);

  const fetchTodos = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQ) params.set("q", searchQ);
    if (dueDateFrom) params.set("dueDateFrom", dueDateFrom);
    if (dueDateTo) params.set("dueDateTo", dueDateTo);
    if (statusFilter) params.set("status", statusFilter);
    if (priorityFilter) params.set("priority", priorityFilter);
    if (assigneeFilter) params.set("assigneeId", assigneeFilter);
    if (companyFilter) params.set("companyId", companyFilter);
    if (dealPhaseFilter) params.set("dealPhase", dealPhaseFilter);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);

    fetch(`/api/todos?${params}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((data: { items: Todo[]; total: number }) => {
        setTodos(data.items);
        setTotal(data.total);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [searchQ, dueDateFrom, dueDateTo, statusFilter, priorityFilter, assigneeFilter, companyFilter, dealPhaseFilter, page, sortBy, sortOrder]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  useEffect(() => {
    const t = setTimeout(() => { setSearchQ(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const resetPage = () => setPage(1);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder(key === "dueDate" ? "asc" : "desc");
    }
    setPage(1);
  };

  const sortIndicator = (key: SortKey) => {
    if (sortBy !== key) return "";
    return sortOrder === "asc" ? " ▲" : " ▼";
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const today = new Date().toISOString().slice(0, 10);

  const statusClass = (s: string) => {
    if (s === "NOT_STARTED") return styles.statusNotStarted;
    if (s === "IN_PROGRESS") return styles.statusInProgress;
    if (s === "COMPLETED") return styles.statusCompleted;
    return "";
  };

  const priorityClass = (p: string) => {
    if (p === "HIGH") return styles.priorityHigh;
    if (p === "MEDIUM") return styles.priorityMedium;
    if (p === "LOW") return styles.priorityLow;
    return "";
  };

  if (error) return <p className={styles.error}>エラー: {error}</p>;

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>TODO一覧</h1>
        <span className={styles.totalCount}>{total}件</span>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>キーワード</label>
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="件名・説明" />
        </div>
        <div className={styles.filterGroup}>
          <label>期限From</label>
          <input type="date" value={dueDateFrom} onChange={(e) => { setDueDateFrom(e.target.value); resetPage(); }} />
        </div>
        <div className={styles.filterGroup}>
          <label>期限To</label>
          <input type="date" value={dueDateTo} onChange={(e) => { setDueDateTo(e.target.value); resetPage(); }} />
        </div>
        <div className={styles.filterGroup}>
          <label>ステータス</label>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}>
            <option value="">すべて</option>
            <option value="NOT_STARTED">未着手</option>
            <option value="IN_PROGRESS">進行中</option>
            <option value="COMPLETED">完了</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>優先度</label>
          <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); resetPage(); }}>
            <option value="">すべて</option>
            <option value="HIGH">高</option>
            <option value="MEDIUM">中</option>
            <option value="LOW">低</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>担当</label>
          <select value={assigneeFilter} onChange={(e) => { setAssigneeFilter(e.target.value); resetPage(); }}>
            <option value="">すべて</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>顧客企業</label>
          <select value={companyFilter} onChange={(e) => { setCompanyFilter(e.target.value); resetPage(); }}>
            <option value="">すべて</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>案件フェーズ</label>
          <select value={dealPhaseFilter} onChange={(e) => { setDealPhaseFilter(e.target.value); resetPage(); }}>
            {PHASES.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className={styles.loading}>読み込み中...</p>
      ) : todos.length === 0 ? (
        <p className={styles.empty}>該当するTODOはありません</p>
      ) : (
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>件名</th>
                <th className={styles.sortable} onClick={() => handleSort("dueDate")}>
                  期限{sortIndicator("dueDate")}
                </th>
                <th>ステータス</th>
                <th className={styles.sortable} onClick={() => handleSort("priority")}>
                  優先度{sortIndicator("priority")}
                </th>
                <th>種別</th>
                <th>担当</th>
                <th>案件</th>
                <th>案件フェーズ</th>
                <th>顧客企業</th>
                <th className={styles.sortable} onClick={() => handleSort("updatedAt")}>
                  更新日{sortIndicator("updatedAt")}
                </th>
              </tr>
            </thead>
            <tbody>
              {todos.map((t) => {
                const isOverdue = t.dueDate && t.dueDate.slice(0, 10) < today && t.status !== "COMPLETED";
                return (
                  <tr key={t.id} className={t.status === "COMPLETED" ? styles.completedRow : ""}>
                    <td>
                      <Link href={`/todos/${t.id}`} className={styles.todoLink}>
                        {t.title}
                      </Link>
                    </td>
                    <td className={isOverdue ? styles.overdue : ""}>
                      {t.dueDate ? t.dueDate.slice(0, 10) : "—"}
                      {isOverdue && " 期限超過"}
                    </td>
                    <td>
                      <span className={statusClass(t.status)}>
                        {STATUS_LABEL[t.status] ?? t.status}
                      </span>
                    </td>
                    <td>
                      <span className={priorityClass(t.priority)}>
                        {PRIORITY_LABEL[t.priority] ?? t.priority}
                      </span>
                    </td>
                    <td>{t.type === "NEXT_ACTION" ? "ネクストアクション" : "TODO"}</td>
                    <td>{t.assignee?.name ?? "—"}</td>
                    <td>
                      {t.deal ? (
                        <Link href={`/deals/${t.deal.id}`} className={styles.todoLink}>
                          {t.deal.name}
                        </Link>
                      ) : "—"}
                    </td>
                    <td>{t.deal ? (PHASE_LABEL[t.deal.phase] ?? t.deal.phase) : "—"}</td>
                    <td>{t.customerCompany?.name ?? "—"}</td>
                    <td>{t.dueDate ? t.dueDate.slice(0, 10) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.paging}>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>前へ</button>
          <span className={styles.pageInfo}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>次へ</button>
        </div>
      )}
    </div>
  );
}
