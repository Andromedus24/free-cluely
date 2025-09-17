"use server";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const { email, otp } = await request.json();

  // Get user by email
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, otp_code")
    .eq("email", email)
    .single();

  if (error || !profile) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  // Verify OTP
  if (profile.otp_code !== otp) {
    return Response.json({ error: "Invalid OTP" }, { status: 400 });
  }

  // Update profile to verified
  await supabase
    .from("profiles")
    .update({
      is_verified: true,
      otp_code: null
    })
    .eq("id", profile.id);

  return Response.json({ success: true });
}