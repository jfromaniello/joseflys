import { Metadata } from "next";
import { CreateFlightPlanClient } from "./CreateFlightPlanClient";

export const metadata: Metadata = {
  title: "Create Flight Plan | JoseFlys",
  description: "Create a new flight plan with route, aircraft, and cruise performance settings",
};

export default function CreateFlightPlanPage() {
  return <CreateFlightPlanClient />;
}
