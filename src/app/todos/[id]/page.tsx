"use client";

import { useState, useEffect, FormEvent, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

type Employee = { id: string; name: string };

type TodoDetail = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: string;
  priority: string;
  type: string;
  startDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deal: { id: string; name: string; phase: string } | null;
  customerCompany: { id: string; name: string } | null;
  assignee: { id: string; name: string } | null;
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

const PHASE_LABEL: Record<string, string> = {
  MEETING: "打合せ",
  SAMPLE_PROVIDED: "サンプル提供",
  INITIAL_EVAL: "初期評価",
  FULL_EVAL: "実機評価",
  WON: "採用",
  LOST: "不採用",
};

export default function TodoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [todo, setTodo] = useState<TodoDetail | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "MEDIUM",
    type: "TODO",
    assigneeId: "",
  });
  const [editMsg, setEditMsg] = useState("");
  const [editErr, setEditErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchTodo = () =>
    fetch(`/api/todos/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((data: TodoDetail) => {
        setTodo(data);
        setEditForm({
          title: data.title,
          description: data.description ?? "",
          dueDate: data.dueDate ? data.dueDate.slice(0, 10) : "",
          priority: data.priority,
          type: data.type,
          assigneeId: data.assignee?.id ?? "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    fetchTodo();
    fetch("/api/employees").then((r) => r.ok ? r.json() : []).then(setEmployees).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault();
    setEditMsg("");
    setEditErr("");
    setSaving(true);
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description || null,
          dueDate: editForm.dueDate || null,
          priority: editForm.priority,
          type: editForm.type,
          assigneeId: editForm.assigneeId || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setEditErr(d.error ?? "更新失敗");
        return;
      }
      setEditMsg("保存しました");
      fetchTodo();
    } catch {
      setEditErr("通信エラー");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    if (!todo) return;
    setToggling(true);
    const newStatus = todo.status === "COMPLETED" ? "NOT_STARTED" : "COMPLETED";
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "更新失敗");
        return;
      }
      fetchTodo();
    } catch {
      alert("通信エラー");
    } finally {
      setToggling(false);
    }
  };

  const deleteTodo = async () => {
    if (!confirm("このTODOを削除しますか？")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "削除失敗");
        return;
      }
      router.push("/todos");
    } catch {
      alert("通信エラー");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <p className={styles.loading}>読み込み中...</p>;
  if (error) return <p className={styles.error}>エラー: {error}</p>;
  if (!todo) return <p className={styles.error}>TODOが見つかりません</p>;

  const isOverdue =
    todo.dueDate &&
    todo.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10) &&
    todo.status !== "COMPLETED";

  return (
    <div>
      <Link href="/todos" className={styles.backLink}>← TODO一覧に戻る</Link>

      <div className={styles.titleRow}>
        <h1 className={styles.title}>{todo.title}</h1>
        <span className={
          todo.status === "COMPLETED" ? styles.statusCompleted :
          todo.status === "IN_PROGRESS" ? styles.statusInProgress :
          styles.statusNotStarted
        }>
          {STATUS_LABEL[todo.status] ?? todo.status}
        </span>
      </div>

      {/* Overview */}
      <div className={styles.grid}>
        <div>
          <div className={styles.fieldLabel}>案件</div>
          <div className={styles.fieldValue}>
            {todo.deal ? (
              <Link href={`/deals/${todo.deal.id}`} className={styles.link}>
                {todo.deal.name}
              </Link>
            ) : "—"}
          </div>
        </div>
        <div>
          <div className={styles.fieldLabel}>案件フェーズ</div>
          <div className={styles.fieldValue}>
            {todo.deal ? (PHASE_LABEL[todo.deal.phase] ?? todo.deal.phase) : "—"}
          </div>
        </div>
        <div>
          <div className={styles.fieldLabel}>顧客企業</div>
          <div className={styles.fieldValue}>{todo.customerCompany?.name ?? "—"}</div>
        </div>
        <div>
          <div className={styles.fieldLabel}>担当</div>
          <div className={styles.fieldValue}>{todo.assignee?.name ?? "—"}</div>
        </div>
        <div>
          <div className={styles.fieldLabel}>期限</div>
          <div className={`${styles.fieldValue} ${isOverdue ? styles.overdue : ""}`}>
            {todo.dueDate ? todo.dueDate.slice(0, 10) : "—"}
            {isOverdue && " 期限超過"}
          </div>
        </div>
        <div>
          <div className={styles.fieldLabel}>優先度</div>
          <div className={styles.fieldValue}>{PRIORITY_LABEL[todo.priority] ?? todo.priority}</div>
        </div>
        <div>
          <div className={styles.fieldLabel}>種別</div>
          <div className={styles.fieldValue}>{todo.type === "NEXT_ACTION" ? "ネクストアクション" : "TODO"}</div>
        </div>
        <div>
          <div className={styles.fieldLabel}>完了日</div>
          <div className={styles.fieldValue}>{todo.completedAt ? todo.completedAt.slice(0, 10) : "—"}</div>
        </div>
      </div>

      {todo.description && (
        <div className={styles.descriptionBox}>
          <div className={styles.fieldLabel}>説明</div>
          <p className={styles.descriptionText}>{todo.description}</p>
        </div>
      )}

      {/* Toggle + Delete */}
      <div className={styles.actionRow}>
        <button
          type="button"
          className={todo.status === "COMPLETED" ? styles.reopenBtn : styles.completeBtn}
          onClick={toggleStatus}
          disabled={toggling}
        >
          {toggling ? "処理中..." : todo.status === "COMPLETED" ? "未完了に戻す" : "完了にする"}
        </button>
        <button
          type="button"
          className={styles.deleteBtn}
          onClick={deleteTodo}
          disabled={deleting}
        >
          {deleting ? "削除中..." : "削除"}
        </button>
      </div>

      {/* Edit form */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>編集</h2>
        <form onSubmit={submitEdit} className={styles.editForm}>
          <div className={styles.editGrid}>
            <div className={styles.formGroup}>
              <label>件名 *</label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>期限</label>
              <input
                type="date"
                value={editForm.dueDate}
                onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>優先度</label>
              <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}>
                <option value="HIGH">高</option>
                <option value="MEDIUM">中</option>
                <option value="LOW">低</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>種別</label>
              <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
                <option value="TODO">TODO</option>
                <option value="NEXT_ACTION">ネクストアクション</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>担当者</label>
              <select value={editForm.assigneeId} onChange={(e) => setEditForm({ ...editForm, assigneeId: e.target.value })}>
                <option value="">未設定</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroupWide}>
              <label>説明</label>
              <textarea
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="詳細な説明"
              />
            </div>
          </div>
          <div className={styles.editActions}>
            <button type="submit" className="primary" disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </button>
            {editMsg && <span className={styles.successMsg}>{editMsg}</span>}
            {editErr && <span className={styles.errorMsg}>{editErr}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
