import { FlightPlansClient } from "./FlightPlansClient";

export const metadata = {
  title: "Flight Plans | José Flys",
  description: "View and manage your saved flight plans with multiple legs",
};

export default function FlightPlansPage() {
  return <FlightPlansClient />;
}
