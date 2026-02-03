import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "I am alive!" });
}

export async function POST() {
  return NextResponse.json({ message: "POST works too!" });
}