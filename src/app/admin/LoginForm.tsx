"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (response.ok) {
      router.refresh();
      return;
    }

    setError("Contrasena incorrecta.");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "1.5rem",
        background:
          "radial-gradient(circle at top, oklch(0.98 0.02 95), transparent 45%), var(--bg-alt)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="card rise"
        style={{
          width: "min(100%, 380px)",
          padding: "2rem",
          display: "grid",
          gap: "1rem",
        }}
      >
        <div style={{ display: "grid", gap: "0.35rem" }}>
          <span className="kicker">Acceso protegido</span>
          <h1 style={{ fontSize: "2rem" }}>Panel admin</h1>
          <p style={{ margin: 0, color: "var(--ink-soft)" }}>
            Ingresa la contrasena para revisar y moderar observaciones ciudadanas.
          </p>
        </div>

        <label className="field">
          <span>Contrasena</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Contrasena"
            autoComplete="current-password"
            required
          />
        </label>

        {error ? (
          <p className="alert alert--error" style={{ margin: 0 }}>
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? "Verificando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
