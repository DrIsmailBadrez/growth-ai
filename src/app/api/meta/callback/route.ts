import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/meta/oauth";

const TOKEN_MAX_AGE_SECS = 60 * 60 * 24 * 60; // 60 days (matches long-lived token lifetime)

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const state = req.nextUrl.searchParams.get("state");

  if (error) {
    console.error(
      "OAuth denied:",
      error,
      req.nextUrl.searchParams.get("error_description")
    );
    return NextResponse.redirect(`${appUrl}?error=oauth_denied`);
  }

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  // Validate CSRF state via the cookie set by /api/meta/auth.
  // Reading from req.cookies works across serverless instances because
  // the cookie is sent by the browser on every request.
  const expectedState = req.cookies.get("oauth_state")?.value;
  if (!state || !expectedState || state !== expectedState) {
    console.error("OAuth CSRF validation failed");
    return NextResponse.redirect(`${appUrl}?error=csrf_invalid`);
  }

  try {
    const token = await exchangeCodeForToken(code);
    const response = NextResponse.redirect(`${appUrl}?connected=true`);
    response.cookies.set("meta_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TOKEN_MAX_AGE_SECS,
      path: "/",
    });
    response.cookies.delete("oauth_state");
    return response;
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(`${appUrl}?error=oauth_failed`);
  }
}
