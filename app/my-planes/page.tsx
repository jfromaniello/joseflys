import { Metadata } from "next";
import { ClientWrapper } from "./ClientWrapper";

export const metadata: Metadata = {
  title: "My Planes | JoseFlys",
  description: "Manage your saved aircraft",
};

export default function MyPlanesPage() {
  return <ClientWrapper />;
}
