"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import styles from "./page.module.css";

type Company = {
  id: string;
  name: string;
  address: string | null;
  industry: string | null;
  usage: string | null;
  createdAt: string;
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Filters
  const [q, setQ] = useState("");
  const [searchQ, setSearchQ] = useState("");

  // Create form
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formIndustry, setFormIndustry] = useState("");
  const [formUsage, setFormUsage] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [createErr, setCreateErr] = useState("");

  // Inline edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: "", address: "", industry: "", usage: "" });
  const [editErr, setEditErr] = useState("");

  const fetchCompanies = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQ) params.set("q", searchQ);
    fetch(`/api/companies?${params}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((data: Company[]) => setCompanies(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [searchQ]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateErr("");
    setCreateMsg("");
    if (!formName.trim()) {
      setCreateErr("企業名は必須です");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          address: formAddress || null,
          industry: formIndustry || null,
          usage: formUsage || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || `${res.status}`);
      }
      setFormName("");
      setFormAddress("");
      setFormIndustry("");
      setFormUsage("");
      setCreateMsg("追加しました");
      fetchCompanies();
    } catch (err: unknown) {
      setCreateErr(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (c: Company) => {
    setEditId(c.id);
    setEditData({
      name: c.name,
      address: c.address || "",
      industry: c.industry || "",
      usage: c.usage || "",
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
      setEditErr("企業名は必須です");
      return;
    }
    try {
      const res = await fetch(`/api/companies/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editData.name,
          address: editData.address || null,
          industry: editData.industry || null,
          usage: editData.usage || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || `${res.status}`);
      }
      setEditId(null);
      fetchCompanies();
    } catch (err: unknown) {
      setEditErr(err instanceof Error ? err.message : "エラー");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    try {
      const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || `${res.status}`);
      }
      fetchCompanies();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  if (error) return <p className={styles.error}>エラー: {error}</p>;

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>顧客企業一覧</h1>
        <span className={styles.totalCount}>{companies.length}件</span>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>検索</label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="企業名・住所"
          />
        </div>
      </div>

      {loading ? (
        <p className={styles.loading}>読み込み中...</p>
      ) : companies.length === 0 ? (
        <p className={styles.empty}>該当する企業はありません</p>
      ) : (
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>企業名</th>
                <th>住所</th>
                <th>業界</th>
                <th>用途</th>
                <th>登録日</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) =>
                editId === c.id ? (
                  <tr key={c.id} className={styles.editRow}>
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
                        value={editData.address}
                        onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.editInput}
                        value={editData.industry}
                        onChange={(e) => setEditData({ ...editData, industry: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.editInput}
                        value={editData.usage}
                        onChange={(e) => setEditData({ ...editData, usage: e.target.value })}
                      />
                    </td>
                    <td>{c.createdAt.slice(0, 10)}</td>
                    <td>
                      <div className={styles.editActions}>
                        <button className={styles.saveBtn} onClick={saveEdit}>保存</button>
                        <button className={styles.cancelBtn} onClick={cancelEdit}>取消</button>
                      </div>
                      {editErr && <span className={styles.errorMsg}>{editErr}</span>}
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.address || "—"}</td>
                    <td>{c.industry || "—"}</td>
                    <td>{c.usage || "—"}</td>
                    <td>{c.createdAt.slice(0, 10)}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button className={styles.editBtn} onClick={() => startEdit(c)}>編集</button>
                        <button className={styles.deleteBtn} onClick={() => handleDelete(c.id, c.name)}>削除</button>
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
        <div className={styles.formTitle}>新規企業追加</div>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>企業名 *</label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label>住所</label>
            <input type="text" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label>業界</label>
            <input type="text" value={formIndustry} onChange={(e) => setFormIndustry(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label>用途</label>
            <input type="text" value={formUsage} onChange={(e) => setFormUsage(e.target.value)} />
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
