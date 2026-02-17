"use client";

import { useState, useEffect, FormEvent, use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

type Company = { id: string; name: string };
type Employee = { id: string; name: string };
type PhaseChange = {
  id: string;
  fromPhase: string;
  toPhase: string;
  changedAt: string;
};

type Activity = {
  id: string;
  activityDate: string;
  activityType: string | null;
  method: string;
  result: string | null;
  memo: string | null;
  createdAt: string;
};

type Todo = {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  priority: string;
  type: string;
  assigneeId: string | null;
};

type DealDetail = {
  id: string;
  name: string;
  phase: string;
  probability: number | null;
  expectedQuantity: string | null;
  expectedUnitPrice: string | null;
  expectedAmount: string | null;
  industry: string | null;
  usage: string | null;
  importance: string | null;
  stagnationReason: string | null;
  createdAt: string;
  updatedAt: string;
  customerCompany: { id: string; name: string } | null;
  employee: { id: string; name: string } | null;
  activityHistories: Activity[];
  todos: Todo[];
  lastActivityDate: string | null;
  openTodoCount: number;
  overdueTodoCount: number;
};

const PHASE_LABEL: Record<string, string> = {
  MEETING: "打合せ",
  SAMPLE_PROVIDED: "サンプル提供",
  INITIAL_EVAL: "初期評価",
  FULL_EVAL: "実機評価",
  WON: "採用",
  LOST: "不採用",
};

const PRIORITY_LABEL: Record<string, string> = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
};

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "未着手",
  IN_PROGRESS: "進行中",
  COMPLETED: "完了",
};

export default function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [phaseHistory, setPhaseHistory] = useState<PhaseChange[]>([]);

  // Activity form
  const [actForm, setActForm] = useState({
    activityDate: new Date().toISOString().slice(0, 10),
    activityType: "",
    method: "PHONE",
    result: "",
    memo: "",
  });
  const [actMsg, setActMsg] = useState("");
  const [actErr, setActErr] = useState("");

  // Activity inline edit
  const [editActId, setEditActId] = useState<string | null>(null);
  const [editActData, setEditActData] = useState({
    activityDate: "",
    activityType: "",
    method: "PHONE",
    result: "",
    memo: "",
  });

  // Todo form
  const [todoForm, setTodoForm] = useState({
    title: "",
    dueDate: "",
    priority: "MEDIUM",
    type: "TODO",
  });
  const [todoMsg, setTodoMsg] = useState("");
  const [todoErr, setTodoErr] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  // Edit form
  const [editForm, setEditForm] = useState({
    phase: "",
    probability: "",
    importance: "",
    stagnationReason: "",
    customerCompanyId: "",
    employeeId: "",
    expectedQuantity: "",
    expectedUnitPrice: "",
  });
  const [editMsg, setEditMsg] = useState("");
  const [editErr, setEditErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const calcExpectedAmount = useMemo(() => {
    const q = parseFloat(editForm.expectedQuantity);
    const p = parseFloat(editForm.expectedUnitPrice);
    if (!isNaN(q) && !isNaN(p) && q >= 0 && p >= 0) return (q * p).toLocaleString();
    return "—";
  }, [editForm.expectedQuantity, editForm.expectedUnitPrice]);

  const fetchDeal = () =>
    fetch(`/api/deals/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((data: DealDetail) => {
        setDeal(data);
        setEditForm({
          phase: data.phase,
          probability: data.probability != null ? String(data.probability) : "",
          importance: data.importance ?? "",
          stagnationReason: data.stagnationReason ?? "",
          customerCompanyId: data.customerCompany?.id ?? "",
          employeeId: data.employee?.id ?? "",
          expectedQuantity: data.expectedQuantity ?? "",
          expectedUnitPrice: data.expectedUnitPrice ?? "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  const fetchPhaseHistory = () =>
    fetch(`/api/deals/${id}/phase-history`)
      .then((r) => r.ok ? r.json() : [])
      .then(setPhaseHistory)
      .catch(() => {});

  useEffect(() => {
    fetchDeal();
    fetchPhaseHistory();
    fetch("/api/companies").then((r) => r.ok ? r.json() : []).then(setCompanies).catch(() => {});
    fetch("/api/employees").then((r) => r.ok ? r.json() : []).then(setEmployees).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault();
    setEditMsg("");
    setEditErr("");
    setSaving(true);
    try {
      const res = await fetch(`/api/deals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: editForm.phase,
          probability: editForm.probability === "" ? null : Number(editForm.probability),
          importance: editForm.importance || null,
          stagnationReason: editForm.stagnationReason || null,
          customerCompanyId: editForm.customerCompanyId || undefined,
          employeeId: editForm.employeeId || undefined,
          expectedQuantity: editForm.expectedQuantity === "" ? null : editForm.expectedQuantity,
          expectedUnitPrice: editForm.expectedUnitPrice === "" ? null : editForm.expectedUnitPrice,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setEditErr(d.error ?? "更新失敗");
        return;
      }
      setEditMsg("保存しました");
      fetchDeal();
      fetchPhaseHistory();
    } catch {
      setEditErr("通信エラー");
    } finally {
      setSaving(false);
    }
  };

  const deleteDeal = async () => {
    if (!confirm(`「${deal?.name}」を削除しますか？この操作は元に戻せません。`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/deals/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "削除失敗");
        return;
      }
      router.push("/deals");
    } catch {
      alert("通信エラー");
    } finally {
      setDeleting(false);
    }
  };

  const submitActivity = async (e: FormEvent) => {
    e.preventDefault();
    setActMsg("");
    setActErr("");
    if (!deal) return;
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activityDate: actForm.activityDate,
        activityType: actForm.activityType,
        method: actForm.method,
        result: actForm.result,
        memo: actForm.memo || undefined,
        dealId: deal.id,
        customerCompanyId: deal.customerCompany?.id,
        employeeId: deal.employee?.id,
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      setActErr(d.error ?? "登録失敗");
      return;
    }
    setActMsg("登録しました");
    setActForm({ ...actForm, activityType: "", result: "", memo: "" });
    fetchDeal();
  };

  const startEditAct = (a: Activity) => {
    setEditActId(a.id);
    setEditActData({
      activityDate: a.activityDate.slice(0, 10),
      activityType: a.activityType ?? "",
      method: a.method,
      result: a.result ?? "",
      memo: a.memo ?? "",
    });
  };

  const saveEditAct = async () => {
    if (!editActId) return;
    const res = await fetch(`/api/activities/${editActId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editActData),
    });
    if (!res.ok) {
      const d = await res.json();
      setActErr(d.error ?? "更新失敗");
      return;
    }
    setEditActId(null);
    fetchDeal();
  };

  const deleteActivity = async (actId: string) => {
    if (!confirm("この活動履歴を削除しますか？")) return;
    const res = await fetch(`/api/activities/${actId}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "削除失敗");
      return;
    }
    fetchDeal();
  };

  const toggleTodo = async (todoId: string, currentStatus: string) => {
    setToggling(todoId);
    setTodoErr("");
    const newStatus = currentStatus === "COMPLETED" ? "NOT_STARTED" : "COMPLETED";
    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const d = await res.json();
        setTodoErr(d.error ?? "更新失敗");
        return;
      }
      fetchDeal();
    } catch {
      setTodoErr("通信エラー");
    } finally {
      setToggling(null);
    }
  };

  const submitTodo = async (e: FormEvent) => {
    e.preventDefault();
    setTodoMsg("");
    setTodoErr("");
    if (!deal) return;
    if (!todoForm.title.trim()) {
      setTodoErr("件名は必須です");
      return;
    }
    if (!todoForm.dueDate) {
      setTodoErr("期限は必須です");
      return;
    }
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...todoForm,
        status: "NOT_STARTED",
        dealId: deal.id,
        customerCompanyId: deal.customerCompany?.id,
        assigneeId: deal.employee?.id,
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      setTodoErr(d.error ?? "登録失敗");
      return;
    }
    setTodoMsg("追加しました");
    setTodoForm({ ...todoForm, title: "", dueDate: "" });
    fetchDeal();
  };

  if (loading) return <p className={styles.loading}>読み込み中...</p>;
  if (error) return <p className={styles.error}>エラー: {error}</p>;
  if (!deal) return <p className={styles.error}>案件が見つかりません</p>;

  return (
    <div>
      <Link href="/deals" className={styles.backLink}>
        ← 案件ボードに戻る
      </Link>
      <h1 className={styles.title}>
        {deal.name}
        <span className={styles.phaseBadge}>
          {PHASE_LABEL[deal.phase] ?? deal.phase}
        </span>
      </h1>

      {/* Summary cards */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>見込金額</div>
          <div className={styles.summaryValue}>
            {deal.expectedAmount ? Number(deal.expectedAmount).toLocaleString() + "円" : "—"}
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>最終活動日</div>
          <div className={styles.summaryValue}>
            {deal.lastActivityDate ? deal.lastActivityDate.slice(0, 10) : "—"}
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>未完了TODO</div>
          <div className={styles.summaryValue}>{deal.openTodoCount}件</div>
        </div>
        <div className={`${styles.summaryCard} ${deal.overdueTodoCount > 0 ? styles.summaryAlert : ""}`}>
          <div className={styles.summaryLabel}>期限超過TODO</div>
          <div className={styles.summaryValue}>{deal.overdueTodoCount}件</div>
        </div>
      </div>

      {/* 2/3 : 1/3 layout */}
      <div className={styles.twoColumn}>
        {/* LEFT COLUMN: Deal info + Activity */}
        <div className={styles.leftCol}>
          {/* Overview */}
          <div className={styles.grid}>
            <div>
              <div className={styles.fieldLabel}>顧客企業</div>
              <div className={styles.fieldValue}>{deal.customerCompany?.name ?? "—"}</div>
            </div>
            <div>
              <div className={styles.fieldLabel}>担当</div>
              <div className={styles.fieldValue}>{deal.employee?.name ?? "—"}</div>
            </div>
            <div>
              <div className={styles.fieldLabel}>成約確度</div>
              <div className={styles.fieldValue}>{deal.probability != null ? `${deal.probability}%` : "—"}</div>
            </div>
            <div>
              <div className={styles.fieldLabel}>重要度</div>
              <div className={styles.fieldValue}>{deal.importance ? PRIORITY_LABEL[deal.importance] ?? deal.importance : "—"}</div>
            </div>
            <div>
              <div className={styles.fieldLabel}>見込数量</div>
              <div className={styles.fieldValue}>{deal.expectedQuantity ?? "—"}</div>
            </div>
            <div>
              <div className={styles.fieldLabel}>想定単価</div>
              <div className={styles.fieldValue}>{deal.expectedUnitPrice ?? "—"}</div>
            </div>
            <div>
              <div className={styles.fieldLabel}>業界</div>
              <div className={styles.fieldValue}>{deal.industry ?? "—"}</div>
            </div>
            <div>
              <div className={styles.fieldLabel}>用途</div>
              <div className={styles.fieldValue}>{deal.usage ?? "—"}</div>
            </div>
            <div>
              <div className={styles.fieldLabel}>停滞理由</div>
              <div className={styles.fieldValue}>{deal.stagnationReason ?? "—"}</div>
            </div>
            <div>
              <div className={styles.fieldLabel}>更新日</div>
              <div className={styles.fieldValue}>{deal.updatedAt.slice(0, 10)}</div>
            </div>
          </div>

          {/* Edit form */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>案件情報の編集</h2>
            </div>
            <form onSubmit={submitEdit} className={styles.editForm}>
              <div className={styles.editGrid}>
                <div className={styles.formGroup}>
                  <label>フェーズ</label>
                  <select value={editForm.phase} onChange={(e) => setEditForm({ ...editForm, phase: e.target.value })}>
                    <option value="MEETING">打合せ</option>
                    <option value="SAMPLE_PROVIDED">サンプル提供</option>
                    <option value="INITIAL_EVAL">初期評価</option>
                    <option value="FULL_EVAL">実機評価</option>
                    <option value="WON">採用</option>
                    <option value="LOST">不採用</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>成約確度 (%)</label>
                  <input type="number" min="0" max="100" value={editForm.probability} onChange={(e) => setEditForm({ ...editForm, probability: e.target.value })} placeholder="0〜100" />
                </div>
                <div className={styles.formGroup}>
                  <label>重要度</label>
                  <select value={editForm.importance} onChange={(e) => setEditForm({ ...editForm, importance: e.target.value })}>
                    <option value="">未設定</option>
                    <option value="HIGH">高</option>
                    <option value="MEDIUM">中</option>
                    <option value="LOW">低</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>停滞理由</label>
                  <input type="text" value={editForm.stagnationReason} onChange={(e) => setEditForm({ ...editForm, stagnationReason: e.target.value })} placeholder="停滞している場合に記入" />
                </div>
                <div className={styles.formGroup}>
                  <label>顧客企業</label>
                  <select value={editForm.customerCompanyId} onChange={(e) => setEditForm({ ...editForm, customerCompanyId: e.target.value })}>
                    <option value="">未設定</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>担当者</label>
                  <select value={editForm.employeeId} onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value })}>
                    <option value="">未設定</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>見込数量</label>
                  <input type="number" min="0" step="any" value={editForm.expectedQuantity} onChange={(e) => setEditForm({ ...editForm, expectedQuantity: e.target.value })} placeholder="0" />
                </div>
                <div className={styles.formGroup}>
                  <label>想定単価</label>
                  <input type="number" min="0" step="any" value={editForm.expectedUnitPrice} onChange={(e) => setEditForm({ ...editForm, expectedUnitPrice: e.target.value })} placeholder="0" />
                </div>
                <div className={styles.formGroup}>
                  <label>見込金額（自動計算）</label>
                  <div className={styles.calcValue}>{calcExpectedAmount}</div>
                </div>
              </div>
              <div className={styles.editActions}>
                <button type="submit" className="primary" disabled={saving}>
                  {saving ? "保存中..." : "保存"}
                </button>
                <button type="button" className={styles.deleteBtn} onClick={deleteDeal} disabled={deleting}>
                  {deleting ? "削除中..." : "この案件を削除"}
                </button>
                {editMsg && <span className={styles.successMsg}>{editMsg}</span>}
                {editErr && <span className={styles.errorMsg}>{editErr}</span>}
              </div>
            </form>
          </div>

          {/* Phase change history */}
          {phaseHistory.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>フェーズ変更履歴（{phaseHistory.length}件）</h2>
              </div>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>日時</th>
                      <th>変更前</th>
                      <th>変更後</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phaseHistory.map((ph) => (
                      <tr key={ph.id}>
                        <td>{ph.changedAt.slice(0, 10)}</td>
                        <td>{PHASE_LABEL[ph.fromPhase] ?? ph.fromPhase}</td>
                        <td>{PHASE_LABEL[ph.toPhase] ?? ph.toPhase}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Activity history */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>活動履歴（{deal.activityHistories.length}件）</h2>
            </div>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>日付</th>
                    <th>種別</th>
                    <th>手段</th>
                    <th>結果</th>
                    <th>メモ</th>
                    <th style={{ width: 100 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {deal.activityHistories.map((a) =>
                    editActId === a.id ? (
                      <tr key={a.id} className={styles.actEditRow}>
                        <td><input type="date" value={editActData.activityDate} onChange={(e) => setEditActData({ ...editActData, activityDate: e.target.value })} className={styles.actEditInput} /></td>
                        <td><input type="text" value={editActData.activityType} onChange={(e) => setEditActData({ ...editActData, activityType: e.target.value })} className={styles.actEditInput} /></td>
                        <td>
                          <select value={editActData.method} onChange={(e) => setEditActData({ ...editActData, method: e.target.value })} className={styles.actEditInput}>
                            <option value="PHONE">電話</option>
                            <option value="EMAIL">メール</option>
                            <option value="VISIT">対面</option>
                            <option value="ONLINE">オンライン</option>
                            <option value="OTHER">その他</option>
                          </select>
                        </td>
                        <td><input type="text" value={editActData.result} onChange={(e) => setEditActData({ ...editActData, result: e.target.value })} className={styles.actEditInput} /></td>
                        <td><input type="text" value={editActData.memo} onChange={(e) => setEditActData({ ...editActData, memo: e.target.value })} className={styles.actEditInput} /></td>
                        <td>
                          <div className={styles.actEditActions}>
                            <button type="button" className={styles.actSaveBtn} onClick={saveEditAct}>保存</button>
                            <button type="button" className={styles.actCancelBtn} onClick={() => setEditActId(null)}>取消</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={a.id}>
                        <td>{a.activityDate.slice(0, 10)}</td>
                        <td>{a.activityType ?? "—"}</td>
                        <td>{a.method}</td>
                        <td>{a.result ?? "—"}</td>
                        <td>{a.memo ?? "—"}</td>
                        <td>
                          <div className={styles.actRowActions}>
                            <button type="button" className={styles.actEditBtn} onClick={() => startEditAct(a)}>編集</button>
                            <button type="button" className={styles.actDeleteBtn} onClick={() => deleteActivity(a.id)}>削除</button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                  {deal.activityHistories.length === 0 && (
                    <tr><td colSpan={6} className={styles.emptyMsg}>データなし</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <form onSubmit={submitActivity} className={styles.form} style={{ marginTop: 8 }}>
              <div className={styles.formGroup}>
                <label>日付</label>
                <input type="date" value={actForm.activityDate} onChange={(e) => setActForm({ ...actForm, activityDate: e.target.value })} />
              </div>
              <div className={styles.formGroup}>
                <label>種別</label>
                <input type="text" value={actForm.activityType} onChange={(e) => setActForm({ ...actForm, activityType: e.target.value })} placeholder="例: 訪問" />
              </div>
              <div className={styles.formGroup}>
                <label>手段</label>
                <select value={actForm.method} onChange={(e) => setActForm({ ...actForm, method: e.target.value })}>
                  <option value="PHONE">電話</option>
                  <option value="EMAIL">メール</option>
                  <option value="VISIT">対面</option>
                  <option value="ONLINE">オンライン</option>
                  <option value="OTHER">その他</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>結果</label>
                <input type="text" value={actForm.result} onChange={(e) => setActForm({ ...actForm, result: e.target.value })} placeholder="例: ニーズ確認" />
              </div>
              <div className={styles.formGroup}>
                <label>メモ</label>
                <input type="text" value={actForm.memo} onChange={(e) => setActForm({ ...actForm, memo: e.target.value })} placeholder="補足メモ" />
              </div>
              <button type="submit" className="primary">活動を追加</button>
              {actMsg && <span className={styles.successMsg}>{actMsg}</span>}
              {actErr && <span className={styles.errorMsg}>{actErr}</span>}
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: TODO */}
        <div className={styles.rightCol}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>TODO（{deal.todos.length}件）</h2>
            </div>

            <div className={styles.tableWrap}>
              <div className={styles.todoList}>
                {deal.todos.map((t) => (
                  <div key={t.id} className={t.status === "COMPLETED" ? styles.todoItemCompleted : styles.todoItem}>
                    <button
                      type="button"
                      className={t.status === "COMPLETED" ? styles.toggleDone : styles.toggleOpen}
                      disabled={toggling === t.id}
                      onClick={() => toggleTodo(t.id, t.status)}
                      title={t.status === "COMPLETED" ? "未完了に戻す" : "完了にする"}
                    >
                      {t.status === "COMPLETED" ? "✓" : "○"}
                    </button>
                    <div className={styles.todoItemInfo}>
                      <div className={styles.todoItemTitle}>{t.title}</div>
                      <div className={styles.todoItemMeta}>
                        {t.dueDate ? t.dueDate.slice(0, 10) : "期限なし"}
                        {" / "}{PRIORITY_LABEL[t.priority] ?? t.priority}
                        {" / "}{STATUS_LABEL[t.status] ?? t.status}
                        {t.type === "NEXT_ACTION" && " / NA"}
                      </div>
                    </div>
                    <Link href={`/todos/${t.id}`} className={styles.todoItemLink}>詳細</Link>
                  </div>
                ))}
                {deal.todos.length === 0 && (
                  <div className={styles.emptyMsg}>TODOなし</div>
                )}
              </div>
            </div>
            {todoErr && <p className={styles.errorMsg}>{todoErr}</p>}

            {/* TODO Add form */}
            <form onSubmit={submitTodo} className={styles.todoForm} style={{ marginTop: 8 }}>
              <div className={styles.todoFormGrid}>
                <div className={styles.todoFormGroup}>
                  <label>件名 *</label>
                  <input type="text" value={todoForm.title} onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })} placeholder="TODO件名" />
                </div>
                <div className={styles.todoFormGroup}>
                  <label>期限 *</label>
                  <input type="date" value={todoForm.dueDate} onChange={(e) => setTodoForm({ ...todoForm, dueDate: e.target.value })} />
                </div>
                <div className={styles.todoFormRow}>
                  <div className={styles.todoFormGroup}>
                    <label>優先度</label>
                    <select value={todoForm.priority} onChange={(e) => setTodoForm({ ...todoForm, priority: e.target.value })}>
                      <option value="HIGH">高</option>
                      <option value="MEDIUM">中</option>
                      <option value="LOW">低</option>
                    </select>
                  </div>
                  <div className={styles.todoFormGroup}>
                    <label>種別</label>
                    <select value={todoForm.type} onChange={(e) => setTodoForm({ ...todoForm, type: e.target.value })}>
                      <option value="TODO">TODO</option>
                      <option value="NEXT_ACTION">NA</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className={styles.todoFormActions}>
                <button type="submit" className="primary">TODO追加</button>
                {todoMsg && <span className={styles.successMsg}>{todoMsg}</span>}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
