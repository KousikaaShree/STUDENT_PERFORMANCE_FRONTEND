import React, { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import axios from "axios";
import "./App.css";

const api = axios.create({
  baseURL: "https://student-performance-backend-f07w.onrender.com/api",
});

// Automatically attach auth token to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [authMode, setAuthMode] = useState("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [studentForm, setStudentForm] = useState({
    name: "",
    rollNo: "",
    className: "",
  });
  const [scoreForm, setScoreForm] = useState({ subject: "", marks: "" });
  const [students, setStudents] = useState([]);
  const [performanceMap, setPerformanceMap] = useState({});
  const [currentStudent, setCurrentStudent] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleInput = (setter) => (e) =>
    setter((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // ---------- AUTH ----------
  async function login() {
    try {
      const res = await api.post("/login", loginForm);
      localStorage.setItem("token", res.data.token);
      setToken(res.data.token);
      await loadStudents();
    } catch (err) {
      alert("Invalid credentials");
    }
  }

  async function register() {
    try {
      await api.post("/register", registerForm);
      alert("Registered! Please login.");
      setAuthMode("login");
    } catch (err) {
      alert("Unable to register");
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setStudents([]);
    setPerformanceMap({});
  }

  // ---------- DATA LOAD ----------
  async function loadStudents() {
    try {
      setLoading(true);
      const res = await api.get("/students");
      setStudents(res.data);
      await loadPerformanceSummary(res.data);
    } catch (err) {
      console.error("Error loading students", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadPerformanceSummary(list) {
    if (!Array.isArray(list) || list.length === 0) {
      setPerformanceMap({});
      return;
    }

    try {
      const entries = await Promise.all(
        list.map(async (student) => {
          try {
            const res = await api.get(`/performance/${student._id}`);
            return [student._id, res.data];
          } catch {
            return [student._id, []];
          }
        })
      );
      setPerformanceMap(Object.fromEntries(entries));
    } catch (err) {
      console.error("Error loading performance", err);
    }
  }

  async function refreshStudentPerformance(studentId) {
    try {
      const res = await api.get(`/performance/${studentId}`);
      setPerformanceMap((prev) => ({ ...prev, [studentId]: res.data }));
    } catch (err) {
      console.error("Error loading student performance", err);
    }
  }

  // ---------- MUTATIONS ----------
  async function addStudent() {
    if (!studentForm.name || !studentForm.rollNo || !studentForm.className) {
      alert("Please fill name, roll no, and class.");
      return;
    }
    await api.post("/students", studentForm);
    setStudentForm({ name: "", rollNo: "", className: "" });
    await loadStudents();
  }

  async function deleteStudent(id) {
    await api.delete(`/students/${id}`);
    await loadStudents();
  }

  async function addPerformance(studentId) {
    if (!scoreForm.subject || !scoreForm.marks) {
      alert("Please add subject and marks.");
      return;
    }

    await api.post("/performance", {
      studentId,
      subject: scoreForm.subject,
      marks: scoreForm.marks,
    });

    setScoreForm({ subject: "", marks: "" });
    await refreshStudentPerformance(studentId);
  }

  // ---------- INITIAL LOAD ----------
  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) {
      loadStudents();
    }
  }, []);

  // ---------- RENDER HELPERS ----------
  if (!token) {
    return (
      <div className="auth-layout">
        <div className="auth-card">
          <div className="brand">
            <div className="pill">Student Performance Tracker</div>
            <p>Stay on top of every student's progress with clean dashboards.</p>
          </div>
          <div className="tabs">
            <button
              className={authMode === "login" ? "tab active" : "tab"}
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
            <button
              className={authMode === "register" ? "tab active" : "tab"}
              onClick={() => setAuthMode("register")}
            >
              Register
            </button>
          </div>

          {authMode === "login" ? (
            <div className="form-grid">
              <label>Email</label>
              <input
                name="email"
                placeholder="you@example.com"
                value={loginForm.email}
                onChange={handleInput(setLoginForm)}
              />
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={loginForm.password}
                onChange={handleInput(setLoginForm)}
              />
              <button className="primary" onClick={login}>
                Continue
              </button>
            </div>
          ) : (
            <div className="form-grid">
              <label>Name</label>
              <input
                name="name"
                placeholder="Alex Doe"
                value={registerForm.name}
                onChange={handleInput(setRegisterForm)}
              />
              <label>Email</label>
              <input
                name="email"
                placeholder="you@example.com"
                value={registerForm.email}
                onChange={handleInput(setRegisterForm)}
              />
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="Create a password"
                value={registerForm.password}
                onChange={handleInput(setRegisterForm)}
              />
              <button className="primary" onClick={register}>
                Create Account
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="page">
        <HeaderBar onLogout={logout} />
        <div className="content">
          <Routes>
            <Route
              path="/"
              element={
                <PerformancePage
                  students={students}
                  performanceMap={performanceMap}
                  loading={loading}
                  onView={setCurrentStudent}
                  onDelete={deleteStudent}
                />
              }
            />
            <Route
              path="/add"
              element={
                <AddStudentPage
                  studentForm={studentForm}
                  onChange={handleInput(setStudentForm)}
                  onSubmit={addStudent}
                />
              }
            />
            <Route
              path="/students/:id"
              element={
                <StudentDetail
                  students={students}
                  performanceMap={performanceMap}
                  scoreForm={scoreForm}
                  onScoreChange={handleInput(setScoreForm)}
                  onAddScore={addPerformance}
                  onRefresh={refreshStudentPerformance}
                  currentStudent={currentStudent}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

function HeaderBar({ onLogout }) {
  return (
    <header className="topbar">
      <div className="logo">
        <span role="img" aria-label="chart">
          📊
        </span>{" "}
        Student Tracker
      </div>
      <nav className="nav">
        <Link to="/" className="nav-link">
          Performance
        </Link>
        <Link to="/add" className="nav-link">
          Add Scores
        </Link>
      </nav>
      <button className="ghost" onClick={onLogout}>
        Logout
      </button>
    </header>
  );
}

function PerformancePage({ students, performanceMap, loading, onView, onDelete }) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Performance</h2>
          <p className="muted">
            Browse students and peek at their latest scores.
          </p>
        </div>
        <Link to="/add" className="primary ghost-link">
          + Add Scores
        </Link>
      </div>

      {loading ? (
        <div className="empty">Loading students...</div>
      ) : students.length === 0 ? (
        <div className="empty">
          No students yet. Add one from the{" "}
          <Link to="/add" className="inline-link">
            Add Scores
          </Link>{" "}
          tab.
        </div>
      ) : (
        <div className="grid">
          {students.map((student) => {
            const scores = performanceMap[student._id] || [];
            const latest = scores[0];
            return (
              <div className="card" key={student._id}>
                <div className="card__row">
                  <div>
                    <p className="eyebrow">{student.className}</p>
                    <h3>{student.name}</h3>
                    <p className="muted">Roll No: {student.rollNo}</p>
                  </div>
                  <div className="chip">{scores.length} scores</div>
                </div>

                {latest ? (
                  <div className="score-line">
                    <span className="pill soft">
                      {latest.subject}
                    </span>
                    <strong>{latest.marks}</strong>
                  </div>
                ) : (
                  <p className="muted small">No scores yet</p>
                )}

                <div className="card__actions">
                  <Link
                    to={`/students/${student._id}`}
                    className="secondary"
                    onClick={() => onView(student)}
                  >
                    View details
                  </Link>
                  <button className="ghost danger" onClick={() => onDelete(student._id)}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function AddStudentPage({ studentForm, onChange, onSubmit }) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">New entry</p>
          <h2>Add Scores</h2>
          <p className="muted">
            Create a student profile so their performance shows up instantly.
          </p>
        </div>
        <Link to="/" className="ghost-link">
          ← Back to Performance
        </Link>
      </div>

      <div className="form-card">
        <div className="form-grid two-col">
          <label>Name</label>
          <input
            name="name"
            placeholder="Student name"
            value={studentForm.name}
            onChange={onChange}
          />
          <label>Roll No</label>
          <input
            name="rollNo"
            placeholder="Eg: 21"
            value={studentForm.rollNo}
            onChange={onChange}
          />
          <label>Class</label>
          <input
            name="className"
            placeholder="Eg: 10-A"
            value={studentForm.className}
            onChange={onChange}
          />
        </div>
        <button className="primary full" onClick={onSubmit}>
          Save Student
        </button>
      </div>
    </section>
  );
}

function StudentDetail({
  students,
  performanceMap,
  scoreForm,
  onScoreChange,
  onAddScore,
  onRefresh,
  currentStudent,
}) {
  const { id } = useParams();
  const navigate = useNavigate();

  const student = useMemo(
    () => students.find((s) => s._id === id) || currentStudent,
    [students, id, currentStudent]
  );

  useEffect(() => {
    if (student?._id) {
      onRefresh(student._id);
    }
  }, [student?._id]);

  if (!student) {
    return (
      <section className="panel">
        <div className="empty">
          Student not found.{" "}
          <button className="inline-link" onClick={() => navigate("/")}>
            Go back
          </button>
        </div>
      </section>
    );
  }

  const scores = performanceMap[student._id] || [];

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Student</p>
          <h2>{student.name}</h2>
          <p className="muted">
            Roll No: {student.rollNo} · Class: {student.className}
          </p>
        </div>
        <button className="ghost-link" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      <div className="form-card">
        <h4>Add Score</h4>
        <div className="form-grid two-col">
          <label>Subject</label>
          <input
            name="subject"
            placeholder="Mathematics"
            value={scoreForm.subject}
            onChange={onScoreChange}
          />
          <label>Marks</label>
          <input
            name="marks"
            placeholder="85"
            value={scoreForm.marks}
            onChange={onScoreChange}
          />
        </div>
        <button
          className="primary full"
          onClick={() => onAddScore(student._id)}
        >
          Add Score
        </button>
      </div>

      <div className="table">
        <div className="table__head">
          <span>Subject</span>
          <span>Marks</span>
        </div>
        {scores.length === 0 ? (
          <div className="empty">No scores yet.</div>
        ) : (
          scores.map((score) => (
            <div className="table__row" key={score._id}>
              <span>{score.subject}</span>
              <strong>{score.marks}</strong>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
