import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { Endpoint } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url, description } = body ?? {};

  if (!url || typeof url !== "string") {
    return NextResponse.json(
      { error: "`url` is required and must be a string." },
      { status: 400 }
    );
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json(
      { error: "`url` must be a valid URL." },
      { status: 400 }
    );
  }

  if (description !== undefined && description !== null && typeof description !== "string") {
    return NextResponse.json(
      { error: "`description` must be a string or null." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("endpoints")
    .insert({ url, description: description ?? null })
    .select()
    .single<Endpoint>();

  if (error) {
    return NextResponse.json(
      { error: `Failed to create endpoint: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}

export async function GET() {
  const { data, error } = await supabase
    .from("endpoints")
    .select()
    .order("created_at", { ascending: false })
    .returns<Endpoint[]>();

  if (error) {
    return NextResponse.json(
      { error: `Failed to list endpoints: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
