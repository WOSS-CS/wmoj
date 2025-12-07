import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from("problems")
      .select("id, updated_at")
      .eq("id", id)
      .maybeSingle();
    if (error)
      return NextResponse.json(
        { error: "Failed to load problem meta" },
        { status: 500 }
      );
    if (!data)
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });

    return NextResponse.json({ id: data.id, updated_at: data.updated_at });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
