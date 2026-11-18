import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request:NextRequest) {
  const code=request.nextUrl.searchParams.get("code");
  const origin=request.nextUrl.origin;
  if(!code) return NextResponse.redirect(new URL("/login?reset=invalid",origin));
  const supabase=await createSupabaseServerClient();
  const {error}=await supabase.auth.exchangeCodeForSession(code);
  if(error) return NextResponse.redirect(new URL("/login?reset=invalid",origin));
  return NextResponse.redirect(new URL("/reset-password",origin));
}
