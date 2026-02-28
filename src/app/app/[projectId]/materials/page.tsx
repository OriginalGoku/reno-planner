import { redirect } from "next/navigation";

type MaterialsPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function MaterialsPage({ params }: MaterialsPageProps) {
  const { projectId } = await params;
  redirect(`/app/${projectId}/materials/new`);
}
