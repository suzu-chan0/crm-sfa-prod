"use client";

import { useState, useEffect, useCallback, useMemo, FormEvent } from "react";
import Link from "next/link";
import styles from "./page.module.css";

type Deal = {
  id: string;
  name: string;
  phase: string;
  probability: number | null;
  importance: string | null;
  expectedAmount: string | null;
  createdAt: string;
  updatedAt: string;
  customerCompany: { id: string; name: string } | null;
  employee: { id: string; name: string } | null;
  lastActivityDate: string | null;
  overdueTodoCount: number;
};

type Employee = { id: string; name: string };
type Company = { id: string; name: string };

type Summary = {
  totalCount: number;
  totalExpectedAmount: number;
  phaseCounts: Record<string, number>;
  phaseAmounts: Record<string, number>;
};

const KANBAN_PHASES = [
  "MEETING", "SAMPLE_PROVIDED", "INITIAL_EVAL", "FULL_EVAL", "WON", "LOST",
];

const PHASE_LABEL: Record<string, string> = {
  MEETING: "打合せ",
  SAMPLE_PROVIDED: "サンプル提供",
  INITIAL_EVAL: "初期評価",
  FULL_EVAL: "実機評価",
  WON: "採用",
  LOST: "不採用",
};

const IMPORTANCE_OPTIONS = [
  { key: "", label: "すべて" },
  { key: "HIGH", label: "高" },
  { key: "MEDIUM", label: "中" },
  { key: "LOW", label: "低" },
];

const INITIAL_CREATE_FORM = {
  name: "",
  customerCompanyId: "",
  employeeId: "",
  phase: "MEETING",
  probability: "",
  importance: "",
  expectedQuantity: "",
  expectedUnitPrice: "",
};

export default function DealsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);

  const [kanbanDeals, setKanbanDeals] = useState<Deal[]>([]);
  const [kanbanLoading, setKanbanLoading] = useState(false);

  // Filters
  const [q, setQ] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [importance, setImportance] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stagnant, setStagnant] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM);
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Employee[]) => setEmployees(data))
      .catch(() => {});
    fetch("/api/companies")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Company[]) => setCompanies(data))
      .catch(() => {});
    fetch("/api/deals/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Summary | null) => setSummary(data))
      .catch(() => {});
  }, []);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (searchQ) params.set("q", searchQ);
    if (employeeId) params.set("employeeId", employeeId);
    if (importance) params.set("importance", importance);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (stagnant) params.set("stagnant", "true");
    return params;
  }, [searchQ, employeeId, importance, dateFrom, dateTo, stagnant]);

  const fetchKanban = useCallback(() => {
    setKanbanLoading(true);
    const params = buildParams();
    params.set("page", "1");
    params.set("pageSize", "200");
    params.set("sortBy", "updatedAt");
    params.set("sortOrder", "desc");

    fetch(`/api/deals?${params}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((data: { items: Deal[] }) => {
        setKanbanDeals(data.items);
      })
      .catch((e) => setError(e.message))
      .finally(() => setKanbanLoading(false));
  }, [buildParams]);

  useEffect(() => {
    fetchKanban();
  }, [fetchKanban]);

  useEffect(() => {
    const t = setTimeout(() => setSearchQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const fmt = (n: number) => n.toLocaleString();

  const kanbanColumns = useMemo(() => {
    const grouped: Record<string, Deal[]> = {};
    for (const ph of KANBAN_PHASES) {
      grouped[ph] = [];
    }
    for (const d of kanbanDeals) {
      if (grouped[d.phase]) {
        grouped[d.phase].push(d);
      }
    }
    return grouped;
  }, [kanbanDeals]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateErr("");

    const missing: string[] = [];
    if (!createForm.name.trim()) missing.push("案件名");
    if (!createForm.customerCompanyId) missing.push("顧客企業");
    if (!createForm.phase) missing.push("フェーズ");
    if (missing.length > 0) {
      setCreateErr(`${missing.join("・")}は必須です`);
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          customerCompanyId: createForm.customerCompanyId,
          employeeId: createForm.employeeId || undefined,
          phase: createForm.phase,
          probability: createForm.probability === "" ? null : Number(createForm.probability),
          importance: createForm.importance || null,
          expectedQuantity: createForm.expectedQuantity || null,
          expectedUnitPrice: createForm.expectedUnitPrice || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || `${res.status}`);
      }
      setCreateForm(INITIAL_CREATE_FORM);
      setShowCreate(false);
      fetchKanban();
      // Refresh summary too
      fetch("/api/deals/summary")
        .then((r) => (r.ok ? r.json() : null))
        .then((data: Summary | null) => setSummary(data))
        .catch(() => {});
    } catch (err: unknown) {
      setCreateErr(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setCreating(false);
    }
  };

  const overdueTodoTotal = useMemo(
    () => kanbanDeals.reduce((sum, d) => sum + d.overdueTodoCount, 0),
    [kanbanDeals],
  );
  const stagnantTotal = useMemo(
    () => kanbanDeals.filter((d) => d.importance === "HIGH" || d.overdueTodoCount > 0).length,
    [kanbanDeals],
  );

  // Column subtotal amounts
  const columnAmounts = useMemo(() => {
    const amounts: Record<string, number> = {};
    for (const ph of KANBAN_PHASES) {
      amounts[ph] = (kanbanColumns[ph] || []).reduce(
        (sum, d) => sum + (d.expectedAmount ? Number(d.expectedAmount) : 0),
        0,
      );
    }
    return amounts;
  }, [kanbanColumns]);

  if (error) return <p className={styles.error}>エラー: {error}</p>;

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>案件一覧</h1>
        <div className={styles.headerRight}>
          <span className={styles.totalCount}>{kanbanDeals.length}件</span>
          <button
            type="button"
            className="primary"
            onClick={() => { setShowCreate(!showCreate); setCreateErr(""); }}
          >
            {showCreate ? "閉じる" : "案件追加"}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className={styles.summaryRow}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>全案件数</div>
            <div className={styles.summaryValue}>{summary.totalCount}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>見込総額</div>
            <div className={styles.summaryValue}>{fmt(summary.totalExpectedAmount)}円</div>
          </div>
          <div className={`${styles.summaryCard} ${overdueTodoTotal > 0 ? styles.summaryAlert : ""}`}>
            <div className={styles.summaryLabel}>期限超過TODO</div>
            <div className={styles.summaryValue}>{overdueTodoTotal}件</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>要注意案件</div>
            <div className={styles.summaryValue}>{stagnantTotal}件</div>
          </div>
        </div>
      )}

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
          <label>担当</label>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">すべて</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>重要度</label>
          <select value={importance} onChange={(e) => setImportance(e.target.value)}>
            {IMPORTANCE_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>更新日From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className={styles.filterGroup}>
          <label>更新日To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={stagnant}
              onChange={(e) => setStagnant(e.target.checked)}
            />
            停滞のみ
          </label>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <form className={styles.createForm} onSubmit={handleCreate}>
          <div className={styles.createGrid}>
            <div className={styles.createGroup}>
              <label>案件名 *</label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div className={styles.createGroup}>
              <label>顧客企業 *</label>
              <select
                value={createForm.customerCompanyId}
                onChange={(e) => setCreateForm({ ...createForm, customerCompanyId: e.target.value })}
              >
                <option value="">選択してください</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.createGroup}>
              <label>担当者</label>
              <select
                value={createForm.employeeId}
                onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
              >
                <option value="">未設定</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.createGroup}>
              <label>フェーズ *</label>
              <select
                value={createForm.phase}
                onChange={(e) => setCreateForm({ ...createForm, phase: e.target.value })}
              >
                {KANBAN_PHASES.map((ph) => (
                  <option key={ph} value={ph}>{PHASE_LABEL[ph]}</option>
                ))}
              </select>
            </div>
            <div className={styles.createGroup}>
              <label>確度 (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={createForm.probability}
                onChange={(e) => setCreateForm({ ...createForm, probability: e.target.value })}
                placeholder="0〜100"
              />
            </div>
            <div className={styles.createGroup}>
              <label>重要度</label>
              <select
                value={createForm.importance}
                onChange={(e) => setCreateForm({ ...createForm, importance: e.target.value })}
              >
                <option value="">未設定</option>
                <option value="HIGH">高</option>
                <option value="MEDIUM">中</option>
                <option value="LOW">低</option>
              </select>
            </div>
            <div className={styles.createGroup}>
              <label>見込数量</label>
              <input
                type="number"
                min="0"
                step="any"
                value={createForm.expectedQuantity}
                onChange={(e) => setCreateForm({ ...createForm, expectedQuantity: e.target.value })}
              />
            </div>
            <div className={styles.createGroup}>
              <label>想定単価</label>
              <input
                type="number"
                min="0"
                step="any"
                value={createForm.expectedUnitPrice}
                onChange={(e) => setCreateForm({ ...createForm, expectedUnitPrice: e.target.value })}
              />
            </div>
          </div>
          <div className={styles.createActions}>
            <button type="submit" className="primary" disabled={creating}>
              {creating ? "登録中..." : "登録"}
            </button>
            <button type="button" onClick={() => setShowCreate(false)}>キャンセル</button>
            {createErr && <span className={styles.createErr}>{createErr}</span>}
          </div>
        </form>
      )}

      {/* Kanban view */}
      {kanbanLoading ? (
        <p className={styles.loading}>読み込み中...</p>
      ) : (
        <div className={styles.kanbanBoard}>
          {KANBAN_PHASES.map((ph) => (
            <div key={ph} className={styles.kanbanColumn}>
              <div className={styles.kanbanColumnHeader}>
                <div>
                  <span className={styles.kanbanColumnTitle}>{PHASE_LABEL[ph]}</span>
                  <span className={styles.kanbanColumnCount}>{kanbanColumns[ph].length}</span>
                </div>
                {columnAmounts[ph] > 0 && (
                  <div className={styles.kanbanColumnAmount}>{fmt(columnAmounts[ph])}円</div>
                )}
              </div>
              <div className={styles.kanbanColumnBody}>
                {kanbanColumns[ph].map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    className={styles.kanbanCard}
                  >
                    <div className={styles.kanbanCardTitle}>
                      {deal.name}
                      {deal.overdueTodoCount > 0 && (
                        <span className={styles.overdueBadge} title={`期限超過TODO: ${deal.overdueTodoCount}件`}>!</span>
                      )}
                    </div>
                    <div className={styles.kanbanCardMeta}>
                      {deal.customerCompany?.name ?? "—"}{deal.employee ? ` / ${deal.employee.name}` : ""}
                    </div>
                    <div className={styles.kanbanCardBottom}>
                      <span className={styles.kanbanCardAmount}>
                        {deal.expectedAmount ? `${Number(deal.expectedAmount).toLocaleString()}円` : "—"}
                      </span>
                      {deal.probability != null && (
                        <span className={styles.kanbanCardProb}>{deal.probability}%</span>
                      )}
                    </div>
                  </Link>
                ))}
                {kanbanColumns[ph].length === 0 && (
                  <div className={styles.kanbanEmpty}>案件なし</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
