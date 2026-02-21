import { redirect } from "next/navigation";
import { loadDefaultProjectId } from "@/lib/reno-project-service";

export default async function AppPage() {
  const defaultProjectId = await loadDefaultProjectId();
  redirect(`/app/${defaultProjectId}`);
}
