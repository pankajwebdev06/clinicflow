interface SmsResult {
  success: boolean;
  message: string;
  error?: string;
}

async function callFast2Sms(mobile: string, otp: string): Promise<SmsResult> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    return { success: false, message: "API key not configured", error: "NO_KEY" };
  }

  const text = `Your ClinicFlow OTP is ${otp}. Valid for 10 minutes. Do not share.`;

  const url = new URL("https://www.fast2sms.com/dev/bulkV2");
  url.searchParams.set("authorization", apiKey);
  url.searchParams.set("route", "q");
  url.searchParams.set("numbers", mobile);
  url.searchParams.set("message", text);
  url.searchParams.set("language", "english");
  url.searchParams.set("flash", "0");

  const res = await fetch(url.toString(), { method: "GET" });
  const json = (await res.json()) as any;

  if (json.return === true) {
    return { success: true, message: "OTP sent" };
  }

  return {
    success: false,
    message: Array.isArray(json.message) ? json.message[0] : (json.message ?? "SMS failed"),
    error: String(json.status_code ?? "UNKNOWN"),
  };
}

export async function sendSms(mobile: string, otp: string): Promise<SmsResult> {
  try {
    const result = await callFast2Sms(mobile, otp);
    if (result.success) {
      console.info("[SMS] Sent to", mobile);
    } else {
      console.error("[SMS] Delivery failed:", result.message, "| error code:", result.error);
    }
    return result;
  } catch (err) {
    console.error("[SMS] Request error:", err);
    return { success: false, message: "SMS service unavailable", error: "NETWORK" };
  }
}

export async function sendWhatsApp(mobile: string, otp: string): Promise<SmsResult> {
  try {
    const result = await callFast2Sms(mobile, otp);
    if (result.success) {
      console.info("[WhatsApp→SMS] Sent to", mobile);
    } else {
      console.error("[WhatsApp→SMS] Delivery failed:", result.message, "| error code:", result.error);
    }
    return result;
  } catch (err) {
    console.error("[WhatsApp→SMS] Request error:", err);
    return { success: false, message: "WhatsApp SMS service unavailable", error: "NETWORK" };
  }
}
