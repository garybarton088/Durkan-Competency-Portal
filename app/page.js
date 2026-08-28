export default function Home() {
  return (
    <div style={{ maxWidth: 720 }}>
      <div className="mono" style={{ fontSize: 10.5, color: "var(--amber)", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>
        WELCOME
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 14 }}>The Durkan Competency Portal</h2>

      <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
        This is where every member of staff records their qualifications, project experience and
        competencies in one place. It exists for two reasons that matter a great deal to us.
      </p>

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <h3 style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 6 }}>1. Winning and staffing the right tenders</h3>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#3d3a30" }}>
          When the bid team puts a tender together, they need to show clients exactly who will be
          working on their project and why those people are the right fit — the right sector
          experience, the right client relationships, the right technical background. The more
          complete your profile is, the more likely you are to be put forward for work that
          genuinely matches your experience.
        </p>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 6 }}>2. Meeting our legal duties under the Building Safety Act</h3>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#3d3a30" }}>
          The Building Safety Act 2022 requires us to be able to demonstrate — not just assume —
          that the people working on higher-risk buildings are genuinely competent to do so. This
          portal is our evidence. Keeping it accurate and up to date protects the people living in
          the buildings we work on, protects Durkan, and protects you.
        </p>
      </div>

      <p style={{ fontSize: 13.5, color: "#7a7666", lineHeight: 1.6, marginBottom: 20 }}>
        It should only take a few minutes to fill in properly, and you can come back and update it
        any time your experience changes. A senior reviewer may adjust or verify your competency
        ratings, but everything else is entirely in your hands.
      </p>

      <a href="/staff" className="btn primary" style={{ textDecoration: "none", display: "inline-flex" }}>
        Go to my profile
      </a>
    </div>
  );
}
