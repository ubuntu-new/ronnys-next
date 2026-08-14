import { NextResponse } from "next/server";
import { driverSignIn, driverSignOut, getDriverSession } from "@/lib/driver-auth";
import { isValidPin } from "@/lib/pin";
import { logAction } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ session: await getDriverSession() });
}

export async function POST(req: Request) {
  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  if (!isValidPin(body.pin ?? "")) {
    return NextResponse.json({ error: "Enter a 4–8 digit PIN" }, { status: 400 });
  }

  const result = await driverSignIn(body.pin!);
  if (!result) return NextResponse.json({ error: "PIN not recognised" }, { status: 401 });
  if ("error" in result) return NextResponse.json({ error: "This account is not a driver" }, { status: 403 });

  await logAction({
    action: "driver.signIn",
    entityType: "Employee",
    entityId: result.employee.id,
    employeeId: result.employee.id,
  });

  return NextResponse.json({ ok: true, name: result.employee.name });
}

export async function DELETE() {
  await driverSignOut();
  return NextResponse.json({ ok: true });
}
