import { getDriverSession } from "@/lib/driver-auth";
import DriverApp from "./DriverApp";

export const dynamic = "force-dynamic";

export default async function DriverPage() {
  const session = await getDriverSession();
  return <DriverApp session={session} />;
}
