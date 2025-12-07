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
      .from("contests")
      .select("id, updated_at")
      .eq("id", id)
      .maybeSingle();
    if (error)
      return NextResponse.json(
        { error: "Failed to load contest meta" },
        { status: 500 }
      );
    if (!data)
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });

    // Return the contest's updated_at timestamp and a server time for comparison
    return NextResponse.json({ id: data.id, updated_at: data.updated_at });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
