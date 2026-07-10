import { NextResponse } from "next/server";
import { openApiSpec } from "@/lib/openapi-spec";

// Raw spec, useful for importing into Postman/Insomnia directly — the
// interactive browser UI at /api-docs fetches this same endpoint.
export async function GET() {
  return NextResponse.json(openApiSpec);
}
