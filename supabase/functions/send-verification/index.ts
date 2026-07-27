import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SINKOS_AUTH_BASE = Deno.env.get("SINKOS_AUTH_BASE")!;

// basic per-instance rate limit — swap for a Supabase table if you need it
// durable across cold starts / multiple instances
const recentSends = new Map<string, number>();
const RATE_LIMIT_MS = 60_000;

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
    const { email, password } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return Response.json({ error: "Valid email required" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const last = recentSends.get(email);
    if (last && Date.now() - last < RATE_LIMIT_MS) {
      return Response.json(
        { error: "Please wait before requesting another email" },
        { status: 429 },
      );
    }

    // ctx.supabaseAdmin bypasses RLS — needed for generateLink
    let actionLink: string;

    try {
      const { data, error } = await ctx.supabaseAdmin.auth.admin.generateLink({
        type: "signup",
        email,
        password,
        options: {
          redirectTo: `${SINKOS_AUTH_BASE}/auth-callback.html`,
        },
      });
      if (error) throw error;
      actionLink = data.properties.action_link;
    } catch (err: any) {
      const code = err?.code ?? err?.error_code;
      if (code === "email_exists") {
        try {
          const retry = await ctx.supabaseAdmin.auth.admin.generateLink({
            type: "magiclink",
            email,
            options: { redirectTo: `${SINKOS_AUTH_BASE}/verify.html` },
          });
          if (retry.error) throw retry.error;
          actionLink = retry.data.properties.action_link;
        } catch (retryErr) {
          console.error(retryErr);
          return Response.json({ error: "Failed to send verification email" }, { status: 500 });
        }
      } else {
        console.error(err);
        return Response.json({ error: "Failed to send verification email" }, { status: 500 });
      }
    }

    try {
      await sendEmail(email, actionLink);
    } catch (err) {
      console.error(err);
      return Response.json({ error: "Failed to send verification email" }, { status: 500 });
    }

    recentSends.set(email, Date.now());

    return Response.json({ success: true });
  }),
};

async function sendEmail(to: string, actionLink: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "SinkOS <noreply@sinkos.net>",
      to,
      subject: "Verify your SinkOS account",
      html: buildEmailHtml(actionLink),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend failed: ${body}`);
  }
}

function buildEmailHtml(actionLink: string) {
  return `
  <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0a0a0a; color: #e5e5e5;">
    <h1 style="font-size: 20px; margin-bottom: 16px;">Welcome to SinkOS</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #a3a3a3;">
      Click below to verify your email and finish setting up your account.
    </p>
    <a href="${actionLink}"
       style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #22c55e; color: #000; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
      Verify Email
    </a>
    <p style="font-size: 12px; color: #737373; margin-top: 24px;">
      If you didn't request this, you can ignore this email.
    </p>
  </div>`;
}