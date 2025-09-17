"use server";

import { createClient } from "@supabase/supabase-js";
import { randomInt } from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const { email } = await request.json();

  // Generate 6-digit OTP
  const otp = randomInt(100000, 999999).toString();

  // Update user's OTP in profiles table
  const { error } = await supabase
    .from("profiles")
    .update({ otp_code: otp })
    .eq("email", email);

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  // In a real app, you would send the OTP via email here
  console.log(`OTP for ${email}: ${otp}`);

  return Response.json({ success: true });
}