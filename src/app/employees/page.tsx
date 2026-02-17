"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import styles from "./page.module.css";

type Employee = {
  id: string;
  name: string;
  department: string | null;
  position: string | null;
  phone: string | null;
  email: string;
  isActive: boolean;
  createdAt: string;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  // Create form
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formDept, setFormDept] = useState("");
  const [formPosition, setFormPosition] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [createErr, setCreateErr] = useState("");

  // Inline edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    name: "", email: "", department: "", position: "", phone: "",
  });
  const [editErr, setEditErr] = useState("");

  const fetchEmployees = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (showInactive) params.set("includeInactive", "true");
    fetch(`/api/employees?${params}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((data: Employee[]) => setEmployees(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [showInactive]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateErr("");
    setCreateMsg("");
    const missing: string[] = [];
    if (!formName.trim()) missing.push("氏名");
    if (!formEmail.trim()) missing.push("メール");
    if (missing.length > 0) {
      setCreateErr(`${missing.join("・")}は必須です`);
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          department: formDept || null,
          position: formPosition || null,
          phone: formPhone || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || `${res.status}`);
      }
      setFormName("");
      setFormEmail("");
      setFormDept("");
      setFormPosition("");
      setFormPhone("");
      setCreateMsg("追加しました");
      fetchEmployees();
    } catch (err: unknown) {
      setCreateErr(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (emp: Employee) => {
    setEditId(emp.id);
    setEditData({
      name: emp.name,
      email: emp.email,
      department: emp.department || "",
      position: emp.position || "",
      phone: emp.phone || "",
    });
    setEditErr("");
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditErr("");
  };

  const saveEdit = async () => {
    if (!editId) return;
    if (!editData.name.trim()) {
      setEditErr("氏名は必須です");
      return;
    }
    if (!editData.email.trim()) {
      setEditErr("メールは必須です");
      return;
    }
    try {
      const res = await fetch(`/api/employees/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editData.name,
          email: editData.email,
          department: editData.department || null,
          position: editData.position || null,
          phone: editData.phone || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || `${res.status}`);
      }
      setEditId(null);
      fetchEmployees();
    } catch (err: unknown) {
      setEditErr(err instanceof Error ? err.message : "エラー");
    }
  };

  const toggleActive = async (emp: Employee) => {
    const action = emp.isActive ? "無効化" : "有効化";
    if (!confirm(`「${emp.name}」を${action}しますか？`)) return;
    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !emp.isActive }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || `${res.status}`);
      }
      fetchEmployees();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  if (error) return <p className={styles.error}>エラー: {error}</p>;

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>社員一覧</h1>
        <span className={styles.totalCount}>{employees.length}件</span>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            無効社員も表示
          </label>
        </div>
      </div>

      {loading ? (
        <p className={styles.loading}>読み込み中...</p>
      ) : employees.length === 0 ? (
        <p className={styles.empty}>社員が登録されていません</p>
      ) : (
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>氏名</th>
                <th>メール</th>
                <th>所属</th>
                <th>役職</th>
                <th>電話</th>
                <th>状態</th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) =>
                editId === emp.id ? (
                  <tr key={emp.id} className={styles.editRow}>
                    <td>
                      <input
                        className={styles.editInput}
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.editInput}
                        value={editData.email}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.editInput}
                        value={editData.department}
                        onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.editInput}
                        value={editData.position}
                        onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.editInput}
                        value={editData.phone}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      />
                    </td>
                    <td>
                      <span className={emp.isActive ? styles.activeBadge : styles.inactiveBadge}>
                        {emp.isActive ? "有効" : "無効"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.editActions}>
                        <button className={styles.saveBtn} onClick={saveEdit}>保存</button>
                        <button className={styles.cancelBtn} onClick={cancelEdit}>取消</button>
                      </div>
                      {editErr && <span className={styles.errorMsg}>{editErr}</span>}
                    </td>
                  </tr>
                ) : (
                  <tr key={emp.id}>
                    <td>{emp.name}</td>
                    <td>{emp.email}</td>
                    <td>{emp.department || "—"}</td>
                    <td>{emp.position || "—"}</td>
                    <td>{emp.phone || "—"}</td>
                    <td>
                      <span className={emp.isActive ? styles.activeBadge : styles.inactiveBadge}>
                        {emp.isActive ? "有効" : "無効"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button className={styles.editBtn} onClick={() => startEdit(emp)}>編集</button>
                        <button
                          className={styles.toggleBtn}
                          style={{ color: emp.isActive ? "var(--color-error)" : "var(--color-success)" }}
                          onClick={() => toggleActive(emp)}
                        >
                          {emp.isActive ? "無効化" : "有効化"}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      <form className={styles.form} onSubmit={handleCreate}>
        <div className={styles.formTitle}>新規社員追加</div>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>氏名 *</label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label>メール *</label>
            <input type="text" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label>所属</label>
            <input type="text" value={formDept} onChange={(e) => setFormDept(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label>役職</label>
            <input type="text" value={formPosition} onChange={(e) => setFormPosition(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label>電話</label>
            <input type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
          </div>
        </div>
        <div className={styles.formActions}>
          <button type="submit" className="primary" disabled={creating}>
            {creating ? "追加中..." : "追加"}
          </button>
          {createMsg && <span className={styles.successMsg}>{createMsg}</span>}
          {createErr && <span className={styles.errorMsg}>{createErr}</span>}
        </div>
      </form>
    </div>
  );
}
