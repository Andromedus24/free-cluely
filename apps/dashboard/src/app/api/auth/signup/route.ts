import { createClient } from "@supabase/supabase-js";
import { randomInt } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only!
);

export async function POST(request: NextRequest) {
  try {
    const { fullName, email, password } = await request.json();

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Create user in supabase.auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip default confirm email
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    const user = data.user;

    // 2. Generate 6-digit OTP
    const otp = randomInt(100000, 999999).toString();

    // 3. Save OTP in profiles
    await supabase.from("profiles").update({
      otp_code: otp,
      is_verified: false,
      full_name: fullName,
    }).eq("id", user.id);

    // 4. Send email (you'd plug in Resend, SendGrid, etc.)
    console.log("Send OTP to user:", otp);

    return NextResponse.json({
      message: "User created successfully. Please check your email for OTP.",
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}