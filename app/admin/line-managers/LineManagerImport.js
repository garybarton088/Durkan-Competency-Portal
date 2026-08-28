"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (field !== "" || row.length > 0) {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      }
      if (char === "\r" && text[i + 1] === "\n") i++;
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function csvCell(value) {
  const str = value || "";
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export default function LineManagerImport({ allStaff }) {
  const supabase = createClient();
  const [fileName, setFileName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  function downloadTemplate() {
    const nameById = Object.fromEntries(allStaff.map((s) => [s.id, s.full_name]));
    const header = "Full Name,Job Title,Current Manager\n";
    const lines = allStaff.map((s) =>
      [csvCell(s.full_name), csvCell(s.job_title), csvCell(nameById[s.line_manager_id] || "")].join(",")
    );
    const csv = header + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "line-managers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setProcessing(true);
    setResult(null);

    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      setResult({ error: "That file doesn't look like it has any data rows." });
      setProcessing(false);
      return;
    }

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const nameIdx = header.indexOf("full name");
    const managerIdx = header.indexOf("current manager");
    if (nameIdx === -1 || managerIdx === -1) {
      setResult({ error: "Couldn't find 'Full Name' and 'Current Manager' columns — use the downloaded template without renaming the headers." });
      setProcessing(false);
      return;
    }

    const byName = {};
    allStaff.forEach((s) => {
      if (s.full_name) byName[s.full_name.trim().toLowerCase()] = s;
    });

    let updated = 0;
    let unchanged = 0;
    const notFound = [];
    const managerNotFound = [];

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r[nameIdx]) continue;
      const personName = r[nameIdx].trim();
      const managerName = (r[managerIdx] || "").trim();
      const person = byName[personName.toLowerCase()];
      if (!person) {
        notFound.push(personName);
        continue;
      }
      if (!managerName) continue;
      const manager = byName[managerName.toLowerCase()];
      if (!manager) {
        managerNotFound.push(`${personName} → "${managerName}"`);
        continue;
      }
      if (person.line_manager_id === manager.id) {
        unchanged++;
        continue;
      }
      const { error } = await supabase.from("profiles").update({ line_manager_id: manager.id }).eq("id", person.id);
      if (error) {
        managerNotFound.push(`${personName} → save failed: ${error.message}`);
      } else {
        updated++;
      }
    }

    setResult({ updated, unchanged, notFound, managerNotFound });
    setProcessing(false);
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 2 }}>Line managers — bulk import</h2>
      <p style={{ fontSize: 13, color: "#5c6b78", marginTop: 0, marginBottom: 20 }}>
        Set everyone's line manager in one go using your org chart, instead of each person picking
        their own from a dropdown.
      </p>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>1. Download the current list</h3>
        <p style={{ fontSize: 12.5, color: "#5c6b78", marginBottom: 10 }}>
          Every current staff member, with a blank (or already-set) "Current Manager" column. Fill
          that column in using your org chart — type each manager's name exactly as it appears in
          the "Full Name" column for someone else in the list.
        </p>
        <button className="btn" onClick={downloadTemplate}>Download CSV</button>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>2. Upload it back</h3>
        <p style={{ fontSize: 12.5, color: "#5c6b78", marginBottom: 10 }}>
          Once you've filled in the Current Manager column and saved the file, upload it here.
          Names are matched exactly (not case-sensitive) — anything that doesn't match will be
          listed below so you can fix and re-upload just those rows.
        </p>
        <input type="file" accept=".csv" onChange={handleFile} disabled={processing} />
        {processing && <p style={{ fontSize: 12.5, color: "#5c6b78", marginTop: 10 }}>Processing {fileName}...</p>}

        {result?.error && (
          <div style={{ marginTop: 14, background: "#FDECEC", border: "1px solid var(--brick)", borderRadius: 4, padding: "10px 12px", fontSize: 12.5, color: "var(--brick)" }}>
            {result.error}
          </div>
        )}

        {result && !result.error && (
          <div style={{ marginTop: 14 }}>
            <div style={{ background: "#EAF2EF", borderRadius: 4, padding: "10px 12px", fontSize: 13, marginBottom: 10 }}>
              <strong>{result.updated}</strong> manager relationship{result.updated === 1 ? "" : "s"} updated.{" "}
              {result.unchanged > 0 && <>{result.unchanged} already correct. </>}
            </div>
            {result.notFound.length > 0 && (
              <div style={{ fontSize: 12.5, marginBottom: 8 }}>
                <strong style={{ color: "var(--brick)" }}>Names not found in the system ({result.notFound.length}):</strong>
                <div style={{ color: "#5c6b78" }}>{result.notFound.join(", ")}</div>
              </div>
            )}
            {result.managerNotFound.length > 0 && (
              <div style={{ fontSize: 12.5 }}>
                <strong style={{ color: "var(--brick)" }}>Managers not found ({result.managerNotFound.length}):</strong>
                <div style={{ color: "#5c6b78" }}>{result.managerNotFound.join(" · ")}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
