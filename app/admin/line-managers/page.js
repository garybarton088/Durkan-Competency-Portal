import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LineManagerImport from "./LineManagerImport";

export default async function LineManagersAdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: myProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (myProfile?.role !== "senior") {
    redirect("/staff");
  }

  const { data: allStaff } = await supabase
    .from("profiles")
    .select("id, full_name, job_title, line_manager_id")
    .order("full_name");

  return <LineManagerImport allStaff={allStaff || []} />;
}
