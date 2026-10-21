export const SCALE = [
  { value: 0, label: 'Not assessed', short: '–', desc: "You haven't rated yourself in this area yet, or it doesn't apply to your role." },
  { value: 1, label: 'Just starting', short: '1', desc: "You're new to this. You understand the basics and need close guidance to apply them." },
  { value: 2, label: 'Getting there', short: '2', desc: 'You can handle routine work here with some support, and you know when to ask for help.' },
  { value: 3, label: 'Solid & dependable', short: '3', desc: 'You work here confidently and independently on typical projects. Others can rely on you.' },
  { value: 4, label: 'Very strong', short: '4', desc: 'You handle complex or unusual situations here and support others to improve.' },
  { value: 5, label: 'Expert', short: '5', desc: "You're a go-to person across the business. You set the standard and could explain it to a Regulator." }
];

export const scaleLabel = (v) => (v == null ? '—' : (SCALE.find((s) => s.value === v) || SCALE[0]).label);

export const ROLES = { staff: 'Staff', senior: 'Senior', bid_team: 'Bid team' };

export const canSearch = (profile) => !!profile && (profile.role === 'senior' || profile.role === 'bid_team');

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
