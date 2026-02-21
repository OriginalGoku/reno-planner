import { notFound } from "next/navigation";

type SlugPageProps = {
  params: Promise<{ slug: string[] }>;
};

export default async function SlugPage({ params }: SlugPageProps) {
  await params;
  notFound();
}
