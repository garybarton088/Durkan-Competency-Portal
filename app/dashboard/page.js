import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const maxDuration = 30;

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = (new Date(dateStr) - new Date(new Date().toISOString().slice(0, 10))) / 86400000;
  return Math.round(diff);
}

function Metric({ label, value, accent }) {
  return (
    <div className="card" style={{ padding: "14px 16px" }}>
      <div className="lbl">{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: accent || "var(--ink)", fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: myProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!["senior", "bid_team"].includes(myProfile?.role)) {
    redirect("/staff");
  }

  const [{ data: profiles }, { data: categories }, { data: assessments }, { data: quals }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, job_title, business_division, cscs_card_type, cscs_expiry_date, profile_confirmed_at"),
    supabase.from("competency_categories").select("*").order("sort_order"),
    supabase.from("competency_assessments").select("staff_id, category_id, level, status"),
    supabase.from("qualifications").select("id, staff_id, name, expiry_date, profiles!qualifications_staff_id_fkey(full_name)").not("expiry_date", "is", null),
  ]);

  const allProfiles = profiles || [];
  const allAssessments = assessments || [];
  const allQuals = quals || [];

  const totalStaff = allProfiles.length;
  const confirmedCount = allProfiles.filter((p) => p.profile_confirmed_at).length;
  const confirmedPct = totalStaff ? Math.round((confirmedCount / totalStaff) * 100) : 0;
  const verificationBacklog = allAssessments.filter((a) => a.status === "self_assessed" && a.level > 0).length;

  const categoryStats = (categories || []).map((c) => {
    const catAssessments = allAssessments.filter((a) => a.category_id === c.id);
    const rated = catAssessments.filter((a) => a.level > 0);
    const verified = catAssessments.filter((a) => a.status === "verified");
    const avg = rated.length ? rated.reduce((sum, a) => sum + a.level, 0) / rated.length : 0;
    return { ...c, ratedCount: rated.length, verifiedCount: verified.length, avg };
  });

  const cscsAlerts = allProfiles
    .filter((p) => p.cscs_expiry_date)
    .map((p) => ({ name: p.full_name, label: `CSCS card (${p.cscs_card_type || "type not set"})`, days: daysUntil(p.cscs_expiry_date) }))
    .filter((a) => a.days !== null && a.days <= 60);

  const qualAlerts = allQuals
    .map((q) => ({ name: q.profiles?.full_name || "Unknown", label: q.name, days: daysUntil(q.expiry_date) }))
    .filter((a) => a.days !== null && a.days <= 60);

  const alerts = [...cscsAlerts, ...qualAlerts].sort((a, b) => a.days - b.days);

  return (
    <div>
      <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 2 }}>Coverage & compliance</h2>
      <p style={{ fontSize: 13, color: "#5c6b78", marginTop: 0, marginBottom: 20 }}>
        A company-wide view of profile completion, competency coverage, and upcoming expiries.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <Metric label="Total staff" value={totalStaff} />
        <Metric label="Profiles confirmed" value={`${confirmedPct}%`} accent={confirmedPct < 60 ? "var(--brick)" : undefined} />
        <Metric label="Awaiting verification" value={verificationBacklog} accent={verificationBacklog > 0 ? "var(--steel)" : undefined} />
        <Metric label="Expiring within 60 days" value={alerts.length} accent={alerts.length > 0 ? "var(--brick)" : undefined} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 12 }}>Competency coverage by area</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {categoryStats.map((c) => (
              <div key={c.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span className="mono" style={{ color: "#5c6b78" }}>{c.id} · {c.name}</span>
                  <span style={{ fontWeight: 600 }}>
                    {c.ratedCount}/{totalStaff} rated · {c.verifiedCount} verified
                  </span>
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} style={{ height: 7, flex: 1, borderRadius: 1, background: c.avg >= i ? "var(--steel)" : "#E1E5E8" }} />
                  ))}
                </div>
              </div>
            ))}
            {categoryStats.length === 0 && <div style={{ fontSize: 12.5, color: "#8a97a1" }}>No competency data yet.</div>}
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 12 }}>Expiring soon or overdue</h3>
          {alerts.length === 0 ? (
            <div style={{ fontSize: 13, color: "#5c6b78" }}>Nothing expiring in the next 60 days.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
              {alerts.map((a, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 9px", borderRadius: 3, border: "1px solid var(--line)", fontSize: 12.5 }}>
                  <span><strong style={{ fontWeight: 600 }}>{a.name}</strong> <span style={{ color: "#5c6b78" }}>· {a.label}</span></span>
                  <span style={{ color: a.days < 0 ? "var(--brick)" : "var(--steel)", fontWeight: 600, whiteSpace: "nowrap" }}>
                    {a.days < 0 ? "Expired" : `${a.days}d left`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginTop: 16 }}>
        <h3 style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 12 }}>Staff who haven't confirmed their profile</h3>
        {allProfiles.filter((p) => !p.profile_confirmed_at).length === 0 ? (
          <div style={{ fontSize: 13, color: "#5c6b78" }}>Everyone has confirmed their profile.</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {allProfiles.filter((p) => !p.profile_confirmed_at).map((p) => (
              <span key={p.id} style={{ fontSize: 12.5, padding: "4px 10px", background: "#EAF2EF", borderRadius: 12 }}>
                {p.full_name || "Unnamed"}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
