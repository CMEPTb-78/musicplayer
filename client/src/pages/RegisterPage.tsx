import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { fetchArtists, type ArtistOption } from "@/api";
import { useAuth } from "@/auth/AuthContext";

export default function RegisterPage() {
  const { token, register } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchArtists();
        if (!cancelled) setArtists(list);
      } catch {
        if (!cancelled) setError("Не удалось загрузить список артистов");
      } finally {
        if (!cancelled) setLoadingArtists(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (token) return <Navigate to="/" replace />;

  function toggleArtist(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (step === 1) {
      setStep(2);
      return;
    }
    if (selected.size === 0) {
      setError("Выберите хотя бы одного артиста");
      return;
    }
    setLoading(true);
    try {
      await register({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        artistIds: [...selected],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className={`glass auth-panel${step === 2 ? " auth-panel--wide" : ""}`}>
        <div className="auth-step-badge">Шаг {step} из 2</div>
        <h1 className="auth-title">Регистрация</h1>
        <p className="auth-subtitle">
          {step === 1
            ? "Учётная запись"
            : "Любимые артисты — после регистрации автоматически соберём плейлист из самых популярных их треков"}
        </p>
        {error ? <div className="auth-error" role="alert">{error}</div> : null}

        <form className="auth-form" onSubmit={onSubmit}>
          {step === 1 ? (
            <>
              <div className="auth-field">
                <label className="auth-label" htmlFor="displayName">
                  Имя
                </label>
                <input
                  id="displayName"
                  className="auth-input"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
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
                  Пароль (мин. 6 символов)
                </label>
                <input
                  id="password"
                  className="auth-input"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
            </>
          ) : (
            <>
              {loadingArtists ? (
                <p className="auth-muted-loading">Загрузка артистов…</p>
              ) : (
                <div className="auth-artist-grid">
                  {artists.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className={`auth-artist-pill${selected.has(a.id) ? " selected" : ""}`}
                      onClick={() => toggleArtist(a.id)}
                    >
                      <span className="auth-artist-name">{a.name}</span>
                      <span className="auth-artist-count">{a.trackCount}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="auth-actions auth-actions-register">
            {step === 2 ? (
              <button type="button" className="auth-btn-secondary" onClick={() => setStep(1)}>
                Назад
              </button>
            ) : null}
            <button
              type="submit"
              className="auth-btn-primary"
              disabled={loading || (step === 2 && loadingArtists)}
            >
              {loading ? "Создаём аккаунт…" : step === 1 ? "Далее" : "Завершить регистрацию"}
            </button>
            <Link to="/login" className="auth-link auth-link-inline">
              Уже есть аккаунт
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
