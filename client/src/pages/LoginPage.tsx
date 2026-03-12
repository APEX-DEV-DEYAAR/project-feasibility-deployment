import { useState } from "react";
import { login } from "../api/auth.api";
import type { AuthUser } from "../types";
import DeyaarLogo from "../components/DeyaarLogo";

interface LoginPageProps {
  onLogin: (user: AuthUser) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await login(username.trim(), password);
      onLogin(result.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <div style={styles.logoWrap}>
          <DeyaarLogo />
        </div>
        <h2 style={styles.title}>Sign In</h2>
        <p style={styles.subtitle}>Project Feasibility System</p>

        {error && <div style={styles.error}>{error}</div>}

        <label style={styles.label}>
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            autoFocus
            autoComplete="username"
          />
        </label>

        <label style={styles.label}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            autoComplete="current-password"
          />
        </label>

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  },
  card: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "12px",
    padding: "40px",
    width: "100%",
    maxWidth: "400px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
  },
  logoWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "8px",
  },
  title: {
    color: "#f1f5f9",
    fontSize: "24px",
    fontWeight: 700,
    textAlign: "center" as const,
    margin: 0,
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: "14px",
    textAlign: "center" as const,
    margin: "0 0 8px",
  },
  error: {
    background: "#451a22",
    color: "#fca5a5",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    border: "1px solid #7f1d1d",
  },
  label: {
    color: "#cbd5e1",
    fontSize: "13px",
    fontWeight: 500,
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
  input: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#f1f5f9",
    fontSize: "14px",
    outline: "none",
  },
  button: {
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "8px",
  },
};
