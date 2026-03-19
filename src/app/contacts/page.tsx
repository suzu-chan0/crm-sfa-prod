"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { RowActionMenu } from "@/app/components/RowActionMenu";

type Company = { id: string; name: string };

type Contact = {
  id: string;
  name: string;
  department: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
  customerCompany: Company | null;
};

const PAGE_SIZE = 20;

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Filters
  const [companyId, setCompanyId] = useState("");
  const [q, setQ] = useState("");
  const [searchQ, setSearchQ] = useState("");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    customerCompanyId: "",
    department: "",
    position: "",
    phone: "",
    email: "",
  });
  const [formMsg, setFormMsg] = useState("");
  const [formErr, setFormErr] = useState("");

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    name: "",
    department: "",
    position: "",
    phone: "",
    email: "",
  });
  const [editErr, setEditErr] = useState("");


  useEffect(() => {
    fetch("/api/companies")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Company[]) => setCompanies(data))
      .catch(() => {});
  }, []);

  const fetchContacts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (companyId) params.set("companyId", companyId);
    if (searchQ) params.set("q", searchQ);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));

    fetch(`/api/contacts?${params}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((data: { items: Contact[]; total: number }) => {
        setContacts(data.items);
        setTotal(data.total);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [companyId, searchQ, page]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Debounce keyword
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQ(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);


  const submitContact = async (e: FormEvent) => {
    e.preventDefault();
    setFormMsg("");
    setFormErr("");

    if (!form.name.trim()) {
      setFormErr("氏名は必須です");
      return;
    }
    if (!form.customerCompanyId) {
      setFormErr("顧客企業を選択してください");
      return;
    }

    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const d = await res.json();
      setFormErr(d.error ?? "登録失敗");
      return;
    }
    setFormMsg("登録しました");
    setForm({ ...form, name: "", department: "", position: "", phone: "", email: "" });
    fetchContacts();
  };

  const deleteContact = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "削除失敗");
      return;
    }
    fetchContacts();
  };

  const startEdit = (c: Contact) => {
    setEditingId(c.id);
    setEditData({
      name: c.name,
      department: c.department ?? "",
      position: c.position ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
    });
    setEditErr("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditErr("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editData.name.trim()) {
      setEditErr("氏名は必須です");
      return;
    }
    const res = await fetch(`/api/contacts/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editData),
    });
    if (!res.ok) {
      const d = await res.json();
      setEditErr(d.error ?? "更新失敗");
      return;
    }
    setEditingId(null);
    fetchContacts();
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (error) return <p className={styles.error}>エラー: {error}</p>;

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>顧客担当者一覧</h1>
        <div className={styles.headerRight}>
          <span className={styles.totalCount}>{total}件</span>
          <button
            type="button"
            className="primary"
            onClick={() => { setShowCreate(!showCreate); setFormErr(""); setFormMsg(""); }}
          >
            {showCreate ? "閉じる" : "+追加"}
          </button>
        </div>
      </div>

      {/* Create form (expandable) */}
      {showCreate && (
        <form onSubmit={submitContact} className={styles.form}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>氏名 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="山田太郎"
              />
            </div>
            <div className={styles.formGroup}>
              <label>顧客企業 *</label>
              <select
                value={form.customerCompanyId}
                onChange={(e) => setForm({ ...form, customerCompanyId: e.target.value })}
              >
                <option value="">選択...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>部署</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="営業部"
              />
            </div>
            <div className={styles.formGroup}>
              <label>役職</label>
              <input
                type="text"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="課長"
              />
            </div>
            <div className={styles.formGroup}>
              <label>電話</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="03-1234-5678"
              />
            </div>
            <div className={styles.formGroup}>
              <label>メール</label>
              <input
                type="text"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="yamada@example.com"
              />
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className="primary">登録</button>
            <button type="button" onClick={() => setShowCreate(false)}>キャンセル</button>
            {formMsg && <span className={styles.successMsg}>{formMsg}</span>}
            {formErr && <span className={styles.errorMsg}>{formErr}</span>}
          </div>
        </form>
      )}

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>検索</label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="氏名・部署・メール"
          />
        </div>
        <div className={styles.filterGroup}>
          <label>顧客企業</label>
          <select value={companyId} onChange={(e) => { setCompanyId(e.target.value); setPage(1); }}>
            <option value="">すべて</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className={styles.loading}>読み込み中...</p>
      ) : contacts.length === 0 ? (
        <p className={styles.empty}>該当する担当者はいません</p>
      ) : (
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>氏名</th>
                <th>顧客企業</th>
                <th>部署</th>
                <th>役職</th>
                <th>電話</th>
                <th>メール</th>
                <th style={{ width: 48 }}></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) =>
                editingId === c.id ? (
                  <tr key={c.id} className={styles.editRow}>
                    <td>
                      <input type="text" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className={styles.editInput} />
                    </td>
                    <td className={styles.secondaryCell}>{c.customerCompany?.name ?? "—"}</td>
                    <td>
                      <input type="text" value={editData.department} onChange={(e) => setEditData({ ...editData, department: e.target.value })} className={styles.editInput} />
                    </td>
                    <td>
                      <input type="text" value={editData.position} onChange={(e) => setEditData({ ...editData, position: e.target.value })} className={styles.editInput} />
                    </td>
                    <td>
                      <input type="text" value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} className={styles.editInput} />
                    </td>
                    <td>
                      <input type="text" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className={styles.editInput} />
                    </td>
                    <td>
                      <div className={styles.editActions}>
                        <button type="button" className={styles.saveBtn} onClick={saveEdit}>保存</button>
                        <button type="button" className={styles.cancelBtn} onClick={cancelEdit}>取消</button>
                      </div>
                      {editErr && <span className={styles.editErrMsg}>{editErr}</span>}
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id}>
                    <td className={styles.primaryCell}>
                      {c.customerCompany
                        ? <Link href={`/deals?companyId=${c.customerCompany.id}`} className={styles.nameLink}>{c.name}</Link>
                        : c.name}
                    </td>
                    <td className={styles.secondaryCell}>{c.customerCompany?.name ?? "—"}</td>
                    <td className={styles.secondaryCell}>{c.department ?? "—"}</td>
                    <td className={styles.secondaryCell}>{c.position ?? "—"}</td>
                    <td className={styles.secondaryCell}>{c.phone ?? "—"}</td>
                    <td className={styles.secondaryCell}>{c.email ?? "—"}</td>
                    <td>
                      <RowActionMenu
                        actions={[
                          { label: "編集", onClick: () => startEdit(c) },
                          { label: "削除", danger: true, onClick: () => deleteContact(c.id, c.name) },
                        ]}
                      />
                    </td>
                  </tr>
                )
              )}
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
