import { createClient } from "@supabase/supabase-js";
import { OTPSecurity, RateLimiter, GENERIC_ERRORS } from "@/lib/otp-security";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate and sanitize email input
    let email: string;
    try {
      email = OTPSecurity.validateEmail(body?.email);
    } catch (error) {
      return NextResponse.json(
        { error: GENERIC_ERRORS.INVALID_CREDENTIALS },
        { status: 400 }
      );
    }

    // Check rate limiting
    const rateLimitResult = RateLimiter.checkRateLimit(email);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: GENERIC_ERRORS.TOO_MANY_REQUESTS,
          resetTime: rateLimitResult.resetTime?.toISOString()
        },
        { status: 429 }
      );
    }

    // Check if user exists (without revealing existence)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .single();

    if (profileError || !profile) {
      // Return generic success message to prevent user enumeration
      // In production, you might still want to log this for monitoring
      return NextResponse.json({ 
        message: GENERIC_ERRORS.OTP_SENT 
      });
    }

    // Generate secure OTP
    const otp = OTPSecurity.generateOTP();
    const { hash, salt } = OTPSecurity.hashOTP(otp);
    const expiryTime = OTPSecurity.createExpiryTime();

    // Store hashed OTP with expiry
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ 
        otp_hash: hash,
        otp_salt: salt,
        otp_expires_at: expiryTime.toISOString(),
        otp_attempts: 0
      })
      .eq("id", profile.id);

    if (updateError) {
      console.error('OTP storage error:', updateError);
      return NextResponse.json(
        { error: GENERIC_ERRORS.SERVER_ERROR },
        { status: 500 }
      );
    }

    // TODO: In production, send OTP via email service (SendGrid, Resend, etc.)
    // For development, you might log to a secure development log
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] OTP generated for ${email.replace(/(.{2}).*(@.*)/, '$1***$2')}: ${otp}`);
    }

    return NextResponse.json({ 
      message: GENERIC_ERRORS.OTP_SENT,
      remainingAttempts: rateLimitResult.remainingAttempts
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: GENERIC_ERRORS.SERVER_ERROR },
      { status: 500 }
    );
  }
}