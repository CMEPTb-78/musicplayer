import { FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

export default function LoginPage() {
  const { token, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="glass auth-panel">
        <h1 className="auth-title">Вход</h1>
        <p className="auth-subtitle">Доступ к вашим плейлистам и загрузкам</p>
        {error ? <div className="auth-error" role="alert">{error}</div> : null}
        <form className="auth-form" onSubmit={onSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="auth-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="password">
              Пароль
            </label>
            <input
              id="password"
              className="auth-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="auth-actions">
            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? "Вход…" : "Войти"}
            </button>
            <Link to="/register" className="auth-link auth-link-inline">
              Регистрация
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
