"use server";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function verifyEmail(email: string, otp: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, otp_code, is_verified")
    .eq("email", email)
    .single();

  if (error || !data) {
    return { success: false, error: "User not found" };
  }

  if (data.otp_code !== otp) {
    return { success: false, error: "Invalid OTP" };
  }

  // Mark as verified
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      is_verified: true,
      otp_code: null
    })
    .eq("id", data.id);

  if (updateError) {
    return { success: false, error: "Failed to verify email" };
  }

  return { success: true };
}