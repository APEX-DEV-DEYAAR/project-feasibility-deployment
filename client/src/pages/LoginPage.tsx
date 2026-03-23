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
      {/* Decorative top bar */}
      <div style={styles.topBar} />

      <div style={styles.cardWrapper}>
        <form onSubmit={handleSubmit} style={styles.card}>
          <div style={styles.logoWrap}>
            <DeyaarLogo size="lg" variant="brown" />
          </div>
          <h2 style={styles.title}>Project Feasibility</h2>
          <p style={styles.subtitle}>Sign in to continue</p>

          {error && <div style={styles.error}>{error}</div>}

          <label style={styles.label}>
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              autoComplete="username"
              placeholder="Enter username"
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
              placeholder="Enter password"
            />
          </label>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={styles.footer}>Deyaar Development PJSC</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "linear-gradient(145deg, #FAF6ED 0%, #EDE4D3 50%, #E8DCC8 100%)",
    fontFamily: "'Acta Pro', Georgia, serif",
    position: "relative",
  },
  topBar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "4px",
    background: "linear-gradient(90deg, #D26935, #3D2914, #D26935)",
  },
  cardWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    maxWidth: "440px",
    margin: "0 16px",
  },
  card: {
    background: "#FFFFFF",
    border: "1px solid #EDE4D3",
    borderRadius: "16px",
    padding: "36px 28px 28px",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    boxShadow: "0 8px 32px rgba(61, 41, 20, 0.08), 0 2px 8px rgba(61, 41, 20, 0.04)",
  },
  logoWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "4px",
  },
  title: {
    color: "#3D2914",
    fontSize: "22px",
    fontWeight: 700,
    textAlign: "center" as const,
    margin: 0,
    fontFamily: "'Acta Pro', Georgia, serif",
    letterSpacing: "0.5px",
  },
  subtitle: {
    color: "#6B6B6B",
    fontSize: "14px",
    textAlign: "center" as const,
    margin: "0 0 4px",
    fontFamily: "system-ui, sans-serif",
  },
  error: {
    background: "#FFF5F5",
    color: "#A64B2A",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    border: "1px solid #E8C4B8",
    fontFamily: "system-ui, sans-serif",
  },
  label: {
    color: "#3D2914",
    fontSize: "13px",
    fontWeight: 500,
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
    fontFamily: "system-ui, sans-serif",
  },
  input: {
    background: "#FAF6ED",
    border: "1px solid #EDE4D3",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#3D2914",
    fontSize: "14px",
    outline: "none",
    fontFamily: "system-ui, sans-serif",
    transition: "border-color 0.15s ease",
  },
  button: {
    background: "linear-gradient(135deg, #D26935, #B85628)",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "6px",
    fontFamily: "'Acta Pro', Georgia, serif",
    letterSpacing: "0.5px",
    transition: "opacity 0.15s ease",
  },
  footer: {
    color: "#B0B0B0",
    fontSize: "12px",
    marginTop: "16px",
    fontFamily: "system-ui, sans-serif",
    letterSpacing: "0.5px",
  },
};
