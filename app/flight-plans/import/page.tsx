import { ImportFlightPlanClient } from "./ImportFlightPlanClient";

export const metadata = {
  title: "Import Flight Plan | José Flies",
  description: "Import a shared flight plan",
};

interface ImportPageProps {
  searchParams: Promise<{
    plan?: string;
  }>;
}

export default async function ImportPage({ searchParams }: ImportPageProps) {
  const params = await searchParams;
  const plan = params.plan || "";

  return <ImportFlightPlanClient serializedPlan={plan} />;
}
