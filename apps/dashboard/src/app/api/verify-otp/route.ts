import { createClient } from "@supabase/supabase-js";
import { OTPSecurity, OTP_CONFIG, GENERIC_ERRORS } from "@/lib/otp-security";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate and sanitize input
    let email: string, otp: string;
    try {
      const validated = OTPSecurity.validateOTPVerification(body);
      email = validated.email;
      otp = validated.otp;
    } catch (error) {
      return NextResponse.json(
        { error: GENERIC_ERRORS.VERIFICATION_FAILED },
        { status: 400 }
      );
    }

    // Get user with OTP data
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, otp_hash, otp_salt, otp_expires_at, otp_attempts, is_verified")
      .eq("email", email)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: GENERIC_ERRORS.VERIFICATION_FAILED },
        { status: 400 }
      );
    }

    // Check if OTP data exists
    if (!profile.otp_hash || !profile.otp_salt || !profile.otp_expires_at) {
      return NextResponse.json(
        { error: GENERIC_ERRORS.VERIFICATION_FAILED },
        { status: 400 }
      );
    }

    // Check if OTP has expired
    const expiryTime = new Date(profile.otp_expires_at);
    if (OTPSecurity.isExpired(expiryTime)) {
      // Clear expired OTP
      await supabase
        .from("profiles")
        .update({
          otp_hash: null,
          otp_salt: null,
          otp_expires_at: null,
          otp_attempts: 0
        })
        .eq("id", profile.id);

      return NextResponse.json(
        { error: GENERIC_ERRORS.VERIFICATION_FAILED },
        { status: 400 }
      );
    }

    // Check attempt limits
    const attempts = profile.otp_attempts || 0;
    if (attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
      // Clear OTP after max attempts
      await supabase
        .from("profiles")
        .update({
          otp_hash: null,
          otp_salt: null,
          otp_expires_at: null,
          otp_attempts: 0
        })
        .eq("id", profile.id);

      return NextResponse.json(
        { error: GENERIC_ERRORS.VERIFICATION_FAILED },
        { status: 400 }
      );
    }

    // Verify OTP
    const isValidOTP = OTPSecurity.verifyOTP(otp, profile.otp_hash, profile.otp_salt);

    if (!isValidOTP) {
      // Increment attempt counter
      await supabase
        .from("profiles")
        .update({ otp_attempts: attempts + 1 })
        .eq("id", profile.id);

      const remainingAttempts = OTP_CONFIG.MAX_ATTEMPTS - (attempts + 1);
      return NextResponse.json(
        { 
          error: GENERIC_ERRORS.VERIFICATION_FAILED,
          remainingAttempts: Math.max(0, remainingAttempts)
        },
        { status: 400 }
      );
    }

    // OTP is valid - update profile to verified and clear OTP data
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        is_verified: true,
        otp_hash: null,
        otp_salt: null,
        otp_expires_at: null,
        otp_attempts: 0
      })
      .eq("id", profile.id);

    if (updateError) {
      console.error('Profile verification error:', updateError);
      return NextResponse.json(
        { error: GENERIC_ERRORS.SERVER_ERROR },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "Email verified successfully"
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: GENERIC_ERRORS.SERVER_ERROR },
      { status: 500 }
    );
  }
}