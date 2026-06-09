import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Building2,
  CheckCircle2,
  Database,
  Edit3,
  GraduationCap,
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
      setMessage("Berhasil masuk ke Wyzzi Campus Suite.");
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
      setMessage(isEditing ? "Profil mahasiswa diperbarui." : "Mahasiswa baru ditambahkan.");
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
      setMessage(`Mahasiswa ID ${id} dihapus.`);
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
    <main className={isLoggedIn ? "company-app" : "login-page"}>
      {!isLoggedIn ? (
        <LoginExperience
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

function LoginExperience({ authForm, authMode, busy, message, setAuthForm, setAuthMode, submitAuth }) {
  const isLogin = authMode === "login";

  return (
    <section className="login-card">
      <div className="login-showcase">
        <div className="company-lockup">
          <span className="logo-mark"><Building2 size={24} /></span>
          <div>
            <strong>Wyzzi Campus Suite</strong>
            <small>Academic Operations Platform</small>
          </div>
        </div>

        <div className="showcase-copy">
          <p className="label">Company Mockup</p>
          <h1>Student operations, attendance-ready data, and Supabase-backed records.</h1>
          <p>
            Aplikasi ini menjadi portal internal untuk mengelola data mahasiswa dengan
            autentikasi JWT dan backend FastAPI sebagai API gateway.
          </p>
        </div>

        <div className="showcase-strip">
          <span><ShieldCheck size={16} /> JWT Session</span>
          <span><Database size={16} /> Supabase REST</span>
          <span><Users size={16} /> Student CRM</span>
        </div>
      </div>

      <form className="login-panel" onSubmit={submitAuth}>
        <div className="segmented">
          <button type="button" className={isLogin ? "active" : ""} onClick={() => setAuthMode("login")}>
            <ShieldCheck size={16} />
            Login
          </button>
          <button type="button" className={!isLogin ? "active" : ""} onClick={() => setAuthMode("register")}>
            <UserPlus size={16} />
            Register
          </button>
        </div>

        <div className="panel-heading">
          <p className="label">Secure Access</p>
          <h2>{isLogin ? "Masuk ke Console" : "Daftarkan Operator"}</h2>
        </div>

        {!isLogin && (
          <label>
            Nama Operator
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

        <button className="primary-action" disabled={busy}>
          {busy ? <Loader2 className="spin" size={18} /> : isLogin ? <ShieldCheck size={18} /> : <UserPlus size={18} />}
          {busy ? "Memproses..." : isLogin ? "Buka Dashboard" : "Buat Akun"}
        </button>

        {message && <p className="auth-message">{message}</p>}
      </form>
    </section>
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
    <>
      <header className="company-topbar">
        <div className="company-lockup compact">
          <span className="logo-mark"><Building2 size={22} /></span>
          <div>
            <strong>Wyzzi Campus Suite</strong>
            <small>Internal Console</small>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="icon-action" aria-label="Refresh data" onClick={() => loadMahasiswa()} disabled={busy}>
            {busy ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
          </button>
          <button className="outline-action" onClick={logout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      <section className="company-layout">
        <aside className="workspace-panel">
          <div className="workspace-card">
            <p className="label">Workspace</p>
            <h2>Academic Ops</h2>
            <p>{user?.email || "JWT authenticated session"}</p>
          </div>
          <nav className="workspace-nav">
            <a className="active" href="#directory"><Users size={18} /> Directory</a>
            <a href="#entry"><Plus size={18} /> Quick Entry</a>
          </nav>
        </aside>

        <section className="main-board">
          <div className="board-hero">
            <div>
              <p className="label">Operations Center</p>
              <h1>Student Directory</h1>
              <p>Kelola data mahasiswa dengan gaya dashboard company internal.</p>
            </div>
            <div className="hero-badge">
              <GraduationCap size={22} />
              <span>Supabase Connected</span>
            </div>
          </div>

          <section className="metrics">
            <MetricCard title="Total Records" value={rows.length} />
            <MetricCard title="Active Majors" value={totalJurusan} />
            <MetricCard title="Filtered View" value={filteredRows.length} />
          </section>

          <section className="ops-grid">
            <section className="module directory-module" id="directory">
              <div className="module-head">
                <div>
                  <p className="label">Database Table</p>
                  <h2>Mahasiswa</h2>
                </div>
                <div className="search-field">
                  <Search size={18} />
                  <input placeholder="Cari mahasiswa..." value={query} onChange={(event) => setQuery(event.target.value)} />
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
                        <td><span className="record-id">#{row.id}</span></td>
                        <td className="student-name">{row.nama}</td>
                        <td>{row.nim}</td>
                        <td><span className="department-chip">{row.jurusan || "-"}</span></td>
                        <td>
                          <div className="table-actions">
                            <button className="icon-action" aria-label={`Edit ${row.nama}`} onClick={() => startEdit(row)}>
                              <Edit3 size={17} />
                            </button>
                            <button className="icon-action delete" aria-label={`Hapus ${row.nama}`} onClick={() => deleteMahasiswa(row.id)}>
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredRows.length && (
                      <tr>
                        <td colSpan="5" className="empty-state">{busy ? "Memuat data..." : "Belum ada data yang cocok."}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <form className="module entry-module" id="entry" onSubmit={submitMahasiswa}>
              <div className="module-head">
                <div>
                  <p className="label">{isEditing ? `Record #${editingId}` : "Quick Entry"}</p>
                  <h2>{isEditing ? "Update Record" : "New Student"}</h2>
                </div>
                {isEditing && (
                  <button type="button" className="icon-action" aria-label="Batal edit" onClick={cancelEdit}>
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

              <button className="primary-action" disabled={busy}>
                {busy ? <Loader2 className="spin" size={18} /> : isEditing ? <Edit3 size={18} /> : <Plus size={18} />}
                {isEditing ? "Update Student" : "Create Student"}
              </button>
            </form>
          </section>
        </section>
      </section>
    </>
  );
}

function MetricCard({ title, value }) {
  return (
    <div className="metric-card">
      <span>{title}</span>
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
