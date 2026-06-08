import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  CheckCircle2,
  Edit3,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import "./styles.css";

const API_URL = "http://127.0.0.1:8000";
const emptyForm = { nama: "", nim: "", jurusan: "" };

function App() {
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [token, setToken] = useState(() => localStorage.getItem("access_token") || "");
  const [user, setUser] = useState(null);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const isLoggedIn = Boolean(token);
  const isEditing = editingId !== null;

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.id, row.nama, row.nim, row.jurusan]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [query, rows]);

  const totalJurusan = useMemo(() => {
    return new Set(rows.map((row) => row.jurusan).filter(Boolean)).size;
  }, [rows]);

  useEffect(() => {
    if (!token) return;
    loadProfile(token);
    loadMahasiswa(token);
  }, [token]);

  async function api(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      const detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data);
      throw new Error(detail || `HTTP ${response.status}`);
    }

    return data;
  }

  async function loadProfile(nextToken = token) {
    try {
      const response = await fetch(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${nextToken}` },
      });
      const data = await response.json();
      if (response.ok) setUser(data.data);
    } catch {
      setUser(null);
    }
  }

  async function loadMahasiswa(nextToken = token) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/mahasiswa`, {
        headers: { Authorization: `Bearer ${nextToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Gagal mengambil data");
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage(cleanAuthError(error.message));
    } finally {
      setBusy(false);
    }
  }

  async function submitAuth(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const path = authMode === "login" ? "/login" : "/register";
      const payload =
        authMode === "login"
          ? { email: authForm.email, password: authForm.password }
          : authForm;

      const data = await api(path, { method: "POST", body: JSON.stringify(payload) });

      if (!data.access_token) {
        throw new Error("Akun dibuat, tapi token belum tersedia. Coba login setelah email dikonfirmasi.");
      }

      localStorage.setItem("access_token", data.access_token);
      setToken(data.access_token);
      setMessage("Berhasil masuk.");
    } catch (error) {
      setMessage(cleanAuthError(error.message));
    } finally {
      setBusy(false);
    }
  }

  async function submitMahasiswa(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const method = isEditing ? "PUT" : "POST";
      const path = isEditing ? `/mahasiswa/${editingId}` : "/mahasiswa";
      await api(path, { method, body: JSON.stringify(form) });

      setForm(emptyForm);
      setEditingId(null);
      setMessage(isEditing ? "Data berhasil diubah." : "Data berhasil ditambahkan.");
      await loadMahasiswa();
    } catch (error) {
      setMessage(cleanAuthError(error.message));
    } finally {
      setBusy(false);
    }
  }

  async function deleteMahasiswa(id) {
    setBusy(true);
    setMessage("");

    try {
      await api(`/mahasiswa/${id}`, { method: "DELETE" });
      setMessage(`Data ID ${id} berhasil dihapus.`);
      await loadMahasiswa();
    } catch (error) {
      setMessage(cleanAuthError(error.message));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(row) {
    setEditingId(row.id);
    setForm({ nama: row.nama || "", nim: row.nim || "", jurusan: row.jurusan || "" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function logout() {
    localStorage.removeItem("access_token");
    setToken("");
    setUser(null);
    setRows([]);
    setMessage("");
  }

  return (
    <main className={isLoggedIn ? "app-shell" : "auth-shell"}>
      {!isLoggedIn ? (
        <AuthView
          authForm={authForm}
          authMode={authMode}
          busy={busy}
          message={message}
          setAuthForm={setAuthForm}
          setAuthMode={setAuthMode}
          submitAuth={submitAuth}
        />
      ) : (
        <DashboardView
          busy={busy}
          cancelEdit={cancelEdit}
          deleteMahasiswa={deleteMahasiswa}
          editingId={editingId}
          filteredRows={filteredRows}
          form={form}
          isEditing={isEditing}
          loadMahasiswa={loadMahasiswa}
          logout={logout}
          query={query}
          rows={rows}
          setForm={setForm}
          setQuery={setQuery}
          startEdit={startEdit}
          submitMahasiswa={submitMahasiswa}
          totalJurusan={totalJurusan}
          user={user}
        />
      )}

      {message && (
        <div className="toast">
          <CheckCircle2 size={18} />
          <span>{message}</span>
          <button aria-label="Tutup pesan" onClick={() => setMessage("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </main>
  );
}

function AuthView({ authForm, authMode, busy, message, setAuthForm, setAuthMode, submitAuth }) {
  const isLogin = authMode === "login";

  return (
    <section className="auth-layout">
      <div className="auth-visual">
        <div className="brand-mark">
          <BookOpen size={24} />
          <span>REST API Supabase</span>
        </div>
        <div className="auth-heading">
          <p className="eyebrow light">FastAPI Bridge</p>
          <h1>Kelola data mahasiswa dari GUI React yang terhubung ke backend JWT.</h1>
          <p>
            Frontend berjalan terpisah dari backend. Login mengambil token, lalu setiap operasi
            data melewati REST API FastAPI.
          </p>
        </div>
      </div>

      <form className="auth-card" onSubmit={submitAuth}>
        <div className="mode-switch">
          <button type="button" className={isLogin ? "active" : ""} onClick={() => setAuthMode("login")}>
            <ShieldCheck size={16} />
            Login
          </button>
          <button type="button" className={!isLogin ? "active" : ""} onClick={() => setAuthMode("register")}>
            <UserPlus size={16} />
            Register
          </button>
        </div>

        <div className="form-title">
          <h2>{isLogin ? "Masuk Dashboard" : "Buat Akun Baru"}</h2>
          <p>{isLogin ? "Gunakan akun Supabase Auth yang sudah aktif." : "Akun baru akan dibuat melalui endpoint backend."}</p>
        </div>

        {!isLogin && (
          <label>
            Nama
            <input value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} required />
          </label>
        )}
        <label>
          Email
          <input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} required />
        </label>
        <label>
          Password
          <input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} required />
        </label>

        <button className="primary" disabled={busy}>
          {busy ? <Loader2 className="spin" size={18} /> : isLogin ? <ShieldCheck size={18} /> : <UserPlus size={18} />}
          {busy ? "Memproses..." : isLogin ? "Login" : "Register"}
        </button>

        {message && <p className="inline-note">{message}</p>}
      </form>
    </section>
  );
}

function DashboardView({
  busy,
  cancelEdit,
  deleteMahasiswa,
  editingId,
  filteredRows,
  form,
  isEditing,
  loadMahasiswa,
  logout,
  query,
  rows,
  setForm,
  setQuery,
  startEdit,
  submitMahasiswa,
  totalJurusan,
  user,
}) {
  return (
    <>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><BookOpen size={22} /></div>
          <div>
            <strong>Mahasiswa</strong>
            <span>REST Client</span>
          </div>
        </div>

        <nav className="nav-list">
          <a className="active" href="#data"><Users size={18} /> Data</a>
        </nav>

        <div className="account-box">
          <span>Akun aktif</span>
          <strong>{user?.name || user?.email || "Authenticated"}</strong>
          <small>{user?.email || "JWT session"}</small>
        </div>
      </aside>

      <section className="content">
        <header className="content-head">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>Data Mahasiswa</h1>
          </div>
          <div className="head-actions">
            <button className="icon-button" aria-label="Refresh data" onClick={() => loadMahasiswa()} disabled={busy}>
              {busy ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
            </button>
            <button className="secondary" onClick={logout}>
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </header>

        <section className="summary-row" aria-label="Ringkasan data">
          <SummaryItem label="Total Mahasiswa" value={rows.length} />
          <SummaryItem label="Jurusan Terdata" value={totalJurusan} />
          <SummaryItem label="Hasil Filter" value={filteredRows.length} />
        </section>

        <section className="work-grid">
          <form className="surface editor" id="form" onSubmit={submitMahasiswa}>
            <div className="section-title">
              <div>
                <p className="eyebrow">{isEditing ? `ID ${editingId}` : "Form"}</p>
                <h2>{isEditing ? "Edit Mahasiswa" : "Tambah Mahasiswa"}</h2>
              </div>
              {isEditing && (
                <button type="button" className="icon-button" aria-label="Batal edit" onClick={cancelEdit}>
                  <X size={18} />
                </button>
              )}
            </div>

            <label>
              Nama
              <input value={form.nama} onChange={(event) => setForm({ ...form, nama: event.target.value })} required />
            </label>
            <label>
              NIM
              <input value={form.nim} onChange={(event) => setForm({ ...form, nim: event.target.value })} required />
            </label>
            <label>
              Jurusan
              <input value={form.jurusan} onChange={(event) => setForm({ ...form, jurusan: event.target.value })} required />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? <Loader2 className="spin" size={18} /> : isEditing ? <Edit3 size={18} /> : <Plus size={18} />}
              {isEditing ? "Simpan" : "Tambah"}
            </button>
          </form>

          <section className="surface data-surface" id="data">
            <div className="section-title">
              <div>
                <p className="eyebrow">Supabase Table</p>
                <h2>Mahasiswa</h2>
              </div>
              <div className="search-box">
                <Search size={18} />
                <input placeholder="Cari nama, nim, jurusan..." value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nama</th>
                    <th>NIM</th>
                    <th>Jurusan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td><span className="id-pill">#{row.id}</span></td>
                      <td className="strong-cell">{row.nama}</td>
                      <td>{row.nim}</td>
                      <td><span className="major-badge">{row.jurusan || "-"}</span></td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-button" aria-label={`Edit ${row.nama}`} onClick={() => startEdit(row)}>
                            <Edit3 size={17} />
                          </button>
                          <button className="icon-button danger" aria-label={`Hapus ${row.nama}`} onClick={() => deleteMahasiswa(row.id)}>
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredRows.length && (
                    <tr>
                      <td colSpan="5" className="empty">{busy ? "Memuat data..." : "Tidak ada data yang cocok."}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </section>
    </>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function cleanAuthError(message) {
  if (message.includes("email_not_confirmed")) return "Email belum dikonfirmasi. Konfirmasi email atau matikan Confirm email di Supabase.";
  if (message.includes("invalid_credentials")) return "Email atau password salah.";
  if (message.includes("over_email_send_rate_limit")) return "Limit email Supabase habis. Tunggu sekitar 1 jam atau matikan Confirm email.";
  return message;
}

createRoot(document.getElementById("root")).render(<App />);
