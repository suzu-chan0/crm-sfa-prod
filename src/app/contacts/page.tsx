"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import styles from "./page.module.css";

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

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Filters
  const [companyId, setCompanyId] = useState("");
  const [q, setQ] = useState("");
  const [searchQ, setSearchQ] = useState("");

  // Form
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

    fetch(`/api/contacts?${params}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((data: Contact[]) => setContacts(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [companyId, searchQ]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Debounce keyword
  useEffect(() => {
    const t = setTimeout(() => setSearchQ(q), 300);
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

  if (error) return <p className={styles.error}>エラー: {error}</p>;

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>顧客担当者一覧</h1>
      </div>

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
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
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
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.customerCompany?.name ?? "—"}</td>
                  <td>{c.department ?? "—"}</td>
                  <td>{c.position ?? "—"}</td>
                  <td>{c.phone ?? "—"}</td>
                  <td>{c.email ?? "—"}</td>
                  <td>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => deleteContact(c.id, c.name)}
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={submitContact} className={styles.form}>
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
        <button type="submit" className="primary">登録</button>
        {formMsg && <span className={styles.successMsg}>{formMsg}</span>}
        {formErr && <span className={styles.errorMsg}>{formErr}</span>}
      </form>
    </div>
  );
}
