import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  Edit3,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
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
    <main>
      {!isLoggedIn ? (
        <CompanyProfileAuth
          authForm={authForm}
          authMode={authMode}
          busy={busy}
          message={message}
          setAuthForm={setAuthForm}
          setAuthMode={setAuthMode}
          submitAuth={submitAuth}
        />
      ) : (
        <CompanyDashboard
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
        <div className="toast alert-dark">
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

function CompanyProfileAuth({ authForm, authMode, busy, message, setAuthForm, setAuthMode, submitAuth }) {
  const isLogin = authMode === "login";

  return (
    <div className="profile-page">
      <nav className="topbar container">
        <a className="navbar-brand" href="#home">
          <span className="brand-logo"><Building2 size={22} /></span>
          Haka Academic
        </a>
        <div className="nav-links">
          <a href="#services">Layanan</a>
          <a href="#platform">Platform</a>
          <a href="#contact">Kontak</a>
        </div>
      </nav>

      <section className="hero-section" id="home">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="badge-soft"><Sparkles size={16} /> Company Profile</span>
            <h1>Solusi digital untuk manajemen data akademik.</h1>
            <p>
              Haka Academic membantu kampus, lembaga kursus, dan tim administrasi mengelola
              data mahasiswa melalui aplikasi web yang terhubung ke Supabase dan FastAPI.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#platform">
                Lihat Platform <ArrowRight size={18} />
              </a>
              <a className="btn btn-outline" href="#contact">
                Hubungi Kami
              </a>
            </div>
          </div>

          <form className="auth-panel card" onSubmit={submitAuth}>
            <div className="card-header">
              <span className="small-label">{isLogin ? "Member Area" : "Create Access"}</span>
              <h2>{isLogin ? "Masuk Dashboard" : "Daftar Akun"}</h2>
            </div>

            <div className="tab-switch" role="tablist" aria-label="Mode autentikasi">
              <button type="button" className={isLogin ? "active" : ""} onClick={() => setAuthMode("login")}>
                <ShieldCheck size={16} /> Login
              </button>
              <button type="button" className={!isLogin ? "active" : ""} onClick={() => setAuthMode("register")}>
                <UserPlus size={16} /> Register
              </button>
            </div>

            {!isLogin && (
              <label className="form-group">
                Nama
                <input value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} required />
              </label>
            )}
            <label className="form-group">
              Email
              <input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} required />
            </label>
            <label className="form-group">
              Password
              <input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} required />
            </label>

            <button className="btn btn-primary full" disabled={busy}>
              {busy ? <Loader2 className="spin" size={18} /> : isLogin ? <ShieldCheck size={18} /> : <UserPlus size={18} />}
              {busy ? "Memproses..." : isLogin ? "Login" : "Register"}
            </button>

            {message && <p className="form-note">{message}</p>}
          </form>
        </div>
      </section>

      <section className="container section-grid" id="services">
        <InfoCard icon={<GraduationCap size={24} />} title="Academic Data" text="Pusat data mahasiswa untuk kebutuhan administrasi harian." />
        <InfoCard icon={<ShieldCheck size={24} />} title="Secure Access" text="Akses dashboard memakai Supabase Auth dan bearer token." />
        <InfoCard icon={<BarChart3 size={24} />} title="Operational View" text="Ringkasan data, pencarian cepat, dan aksi CRUD dalam satu layar." />
      </section>

      <section className="profile-band" id="platform">
        <div className="container band-grid">
          <div>
            <span className="small-label">Platform</span>
            <h2>Backend FastAPI, frontend React, dan database Supabase.</h2>
          </div>
          <p>
            Tampilan ini dibuat seperti company profile modern, tetapi form login tetap langsung
            memakai endpoint backend lokal agar aplikasi tetap fungsional.
          </p>
        </div>
      </section>

      <footer className="container footer" id="contact">
        <span><Mail size={16} /> admin@haka-academic.local</span>
        <span>© 2026 Haka Academic</span>
      </footer>
    </div>
  );
}

function CompanyDashboard({
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
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <a className="navbar-brand" href="#dashboard">
          <span className="brand-logo"><BookOpen size={22} /></span>
          Haka Admin
        </a>

        <nav className="side-nav">
          <a className="active" href="#dashboard"><LayoutDashboard size={18} /> Dashboard</a>
          <a href="#data"><Users size={18} /> Mahasiswa</a>
        </nav>

        <div className="profile-mini">
          <span>Akun aktif</span>
          <strong>{user?.name || user?.email || "Authenticated"}</strong>
          <small>{user?.email || "JWT session"}</small>
        </div>
      </aside>

      <section className="admin-main" id="dashboard">
        <header className="admin-header">
          <div>
            <span className="small-label">Management Console</span>
            <h1>Dashboard Mahasiswa</h1>
          </div>
          <div className="header-actions">
            <button className="btn btn-light square" aria-label="Refresh data" onClick={() => loadMahasiswa()} disabled={busy}>
              {busy ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
            </button>
            <button className="btn btn-outline" onClick={logout}>
              <LogOut size={18} /> Logout
            </button>
          </div>
        </header>

        <section className="stats-row">
          <StatCard label="Total Mahasiswa" value={rows.length} />
          <StatCard label="Jurusan Terdata" value={totalJurusan} />
          <StatCard label="Hasil Filter" value={filteredRows.length} />
        </section>

        <section className="admin-grid">
          <form className="card editor-card" onSubmit={submitMahasiswa}>
            <div className="card-title">
              <div>
                <span className="small-label">{isEditing ? `ID ${editingId}` : "Form Data"}</span>
                <h2>{isEditing ? "Edit Mahasiswa" : "Tambah Mahasiswa"}</h2>
              </div>
              {isEditing && (
                <button type="button" className="btn btn-light square" aria-label="Batal edit" onClick={cancelEdit}>
                  <X size={18} />
                </button>
              )}
            </div>

            <label className="form-group">
              Nama
              <input value={form.nama} onChange={(event) => setForm({ ...form, nama: event.target.value })} required />
            </label>
            <label className="form-group">
              NIM
              <input value={form.nim} onChange={(event) => setForm({ ...form, nim: event.target.value })} required />
            </label>
            <label className="form-group">
              Jurusan
              <input value={form.jurusan} onChange={(event) => setForm({ ...form, jurusan: event.target.value })} required />
            </label>
            <button className="btn btn-primary full" disabled={busy}>
              {busy ? <Loader2 className="spin" size={18} /> : isEditing ? <Edit3 size={18} /> : <Plus size={18} />}
              {isEditing ? "Simpan Perubahan" : "Tambah Data"}
            </button>
          </form>

          <section className="card table-card" id="data">
            <div className="card-title">
              <div>
                <span className="small-label">Supabase Table</span>
                <h2>Data Mahasiswa</h2>
              </div>
              <div className="search-field">
                <Search size={18} />
                <input placeholder="Cari nama, nim, jurusan..." value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
            </div>

            <div className="table-responsive">
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
                      <td><span className="badge-id">#{row.id}</span></td>
                      <td className="fw-bold">{row.nama}</td>
                      <td>{row.nim}</td>
                      <td><span className="badge-major">{row.jurusan || "-"}</span></td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-light square" aria-label={`Edit ${row.nama}`} onClick={() => startEdit(row)}>
                            <Edit3 size={17} />
                          </button>
                          <button className="btn btn-danger square" aria-label={`Hapus ${row.nama}`} onClick={() => deleteMahasiswa(row.id)}>
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredRows.length && (
                    <tr>
                      <td colSpan="5" className="empty-row">{busy ? "Memuat data..." : "Tidak ada data yang cocok."}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </section>
    </div>
  );
}

function InfoCard({ icon, title, text }) {
  return (
    <article className="info-card">
      <div className="info-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{text}</p>
    </article>
  );
}

function StatCard({ label, value }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function cleanAuthError(message) {
  if (message.includes("email_not_confirmed")) return "Email belum dikonfirmasi. Konfirmasi email atau matikan Confirm email di Supabase.";
  if (message.includes("invalid_credentials")) return "Email atau password salah.";
  if (message.includes("over_email_send_rate_limit")) return "Limit email Supabase habis. Tunggu sekitar 1 jam atau matikan Confirm email.";
  return message;
}

createRoot(document.getElementById("root")).render(<App />);
