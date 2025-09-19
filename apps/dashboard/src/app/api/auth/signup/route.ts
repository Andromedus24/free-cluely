import { createClient } from "@supabase/supabase-js";
import { OTPSecurity, RateLimiter, GENERIC_ERRORS } from "@/lib/otp-security";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only!
);

// Input validation schema
const SignupSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(100, "Full name too long"),
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    let validatedData: z.infer<typeof SignupSchema>;
    try {
      validatedData = SignupSchema.parse(body);
    } catch (error) {
      return NextResponse.json(
        { error: GENERIC_ERRORS.INVALID_CREDENTIALS },
        { status: 400 }
      );
    }

    const { fullName, email, password } = validatedData;
    const normalizedEmail = email.toLowerCase().trim();

    // Check rate limiting for signup attempts
    const rateLimitResult = RateLimiter.checkRateLimit(normalizedEmail);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: GENERIC_ERRORS.TOO_MANY_REQUESTS,
          resetTime: rateLimitResult.resetTime?.toISOString()
        },
        { status: 429 }
      );
    }

    // 1. Create user in supabase.auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true, // skip default confirm email
    });

    if (error) {
      // Don't expose detailed Supabase errors to client
      if (error.message.includes('already registered')) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: GENERIC_ERRORS.SERVER_ERROR },
        { status: 400 }
      );
    }

    const user = data.user;

    // 2. Generate secure OTP
    const otp = OTPSecurity.generateOTP();
    const { hash, salt } = OTPSecurity.hashOTP(otp);
    const expiryTime = OTPSecurity.createExpiryTime();

    // 3. Save secure OTP data in profiles
    const { error: profileError } = await supabase.from("profiles").update({
      otp_hash: hash,
      otp_salt: salt,
      otp_expires_at: expiryTime.toISOString(),
      otp_attempts: 0,
      is_verified: false,
      full_name: fullName,
    }).eq("id", user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
      // Clean up the created user if profile update fails
      await supabase.auth.admin.deleteUser(user.id);
      return NextResponse.json(
        { error: GENERIC_ERRORS.SERVER_ERROR },
        { status: 500 }
      );
    }

    // 4. TODO: Send email via email service (SendGrid, Resend, etc.)
    // For development, you might log to a secure development log
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] OTP generated for ${normalizedEmail.replace(/(.{2}).*(@.*)/, '$1***$2')}: ${otp}`);
    }

    return NextResponse.json({
      message: "Account created successfully. Please check your email for verification code.",
      user: { id: user.id, email: user.email },
      remainingAttempts: rateLimitResult.remainingAttempts
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: GENERIC_ERRORS.SERVER_ERROR },
      { status: 500 }
    );
  }
}