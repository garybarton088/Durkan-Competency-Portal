import { createClient } from "@/lib/supabase/server";
import VerifyPanel from "./VerifyPanel";

export default async function VerifyPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: myProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  const { data: allPending } = await supabase
    .from("competency_assessments")
    .select("*, profiles!competency_assessments_staff_id_fkey(full_name, job_title, department, line_manager_id), competency_categories(name)")
    .eq("status", "self_assessed")
    .order("updated_at", { ascending: true });

  const isSenior = myProfile?.role === "senior";
  const pending = isSenior
    ? (allPending || []).filter((p) => p.staff_id !== user.id)
    : (allPending || []).filter((p) => p.profiles?.line_manager_id === user.id);

  const ownPendingCount = (allPending || []).filter((p) => p.staff_id === user.id).length;

  return <VerifyPanel initialPending={pending} isSenior={isSenior} ownPendingCount={ownPendingCount} />;
}
