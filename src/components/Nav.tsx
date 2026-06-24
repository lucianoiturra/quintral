export default function Nav() {
  return (
    <nav style={{ display: "flex", gap: "1rem", padding: "1rem", background: "#1f3d2b", color: "#fff" }}>
      <strong style={{ flex: 1 }}>Quintral Insight</strong>
      <a href="#identificar" style={{ color: "#fff" }}>Identificar</a>
      <a href="#mapa" style={{ color: "#fff" }}>Mapa</a>
      <a href="#aportar" style={{ color: "#fff" }}>Aportar</a>
    </nav>
  );
}
