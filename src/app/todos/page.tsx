"use client";

import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";

type Todo = {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  priority: string;
  type: string;
  assigneeId: string | null;
  deal: { id: string; name: string } | null;
  customerCompany: { id: string; name: string } | null;
  assignee: { id: string; name: string } | null;
};

type Employee = {
  id: string;
  name: string;
};

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

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Filters
  const [keyword, setKeyword] = useState("");
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/todos").then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      }),
      fetch("/api/employees").then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      }),
    ])
      .then(([todosData, employeesData]) => {
        setTodos(todosData);
        setEmployees(employeesData);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return todos.filter((t) => {
      if (keyword && !t.title.includes(keyword)) return false;
      if (dueDateFrom && t.dueDate && t.dueDate.slice(0, 10) < dueDateFrom)
        return false;
      if (dueDateTo && t.dueDate && t.dueDate.slice(0, 10) > dueDateTo)
        return false;
      if (dueDateFrom && !t.dueDate) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (assigneeFilter && t.assigneeId !== assigneeFilter) return false;
      return true;
    });
  }, [todos, keyword, dueDateFrom, dueDateTo, statusFilter, priorityFilter, assigneeFilter]);

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

  if (loading) return <p className={styles.loading}>読み込み中...</p>;
  if (error) return <p className={styles.error}>エラー: {error}</p>;

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>TODO一覧</h1>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>キーワード</label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="件名で検索"
          />
        </div>
        <div className={styles.filterGroup}>
          <label>期限From</label>
          <input
            type="date"
            value={dueDateFrom}
            onChange={(e) => setDueDateFrom(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label>期限To</label>
          <input
            type="date"
            value={dueDateTo}
            onChange={(e) => setDueDateTo(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label>ステータス</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">すべて</option>
            <option value="NOT_STARTED">未着手</option>
            <option value="IN_PROGRESS">進行中</option>
            <option value="COMPLETED">完了</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>優先度</label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">すべて</option>
            <option value="HIGH">高</option>
            <option value="MEDIUM">中</option>
            <option value="LOW">低</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>担当</label>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
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

      {filtered.length === 0 ? (
        <p className={styles.empty}>該当するTODOはありません</p>
      ) : (
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>件名</th>
                <th>期限</th>
                <th>ステータス</th>
                <th>優先度</th>
                <th>種別</th>
                <th>担当</th>
                <th>案件</th>
                <th>顧客企業</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const isOverdue =
                  t.dueDate &&
                  t.dueDate.slice(0, 10) < today &&
                  t.status !== "COMPLETED";
                return (
                  <tr key={t.id}>
                    <td>{t.title}</td>
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
                    <td>{t.deal?.name ?? "—"}</td>
                    <td>{t.customerCompany?.name ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
