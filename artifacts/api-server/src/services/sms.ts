interface SmsResult {
  success: boolean;
  message: string;
}

export async function sendSms(mobile: string, otp: string): Promise<SmsResult> {
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    console.warn("[SMS] FAST2SMS_API_KEY not set — OTP not sent via SMS. Dev OTP:", otp);
    return { success: false, message: "SMS API key not configured" };
  }

  try {
    const text = `Your ClinicFlow OTP is: ${otp}. Valid for 5 minutes. Do not share.`;
    const payload = new URLSearchParams({
      route: "q",
      numbers: mobile,
      message: text,
      language: "english",
      flash: "0",
    });

    const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    });

    const json = (await res.json()) as any;

    if (json.return === true) {
      console.info("[SMS] OTP sent successfully to", mobile);
      return { success: true, message: "OTP sent via SMS" };
    }

    console.error("[SMS] Fast2SMS error:", json);
    return { success: false, message: json.message?.[0] ?? "SMS delivery failed" };
  } catch (err) {
    console.error("[SMS] Request failed:", err);
    return { success: false, message: "SMS service unavailable" };
  }
}

export async function sendWhatsApp(mobile: string, otp: string): Promise<SmsResult> {
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    console.warn("[WhatsApp] FAST2SMS_API_KEY not set — OTP not sent via WhatsApp. Dev OTP:", otp);
    return { success: false, message: "WhatsApp API key not configured" };
  }

  try {
    const text = `Your ClinicFlow OTP is: *${otp}*. Valid for 5 minutes. Do not share this code.`;
    const payload = new URLSearchParams({
      route: "q",
      numbers: mobile,
      message: text,
      language: "english",
      flash: "0",
    });

    const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    });

    const json = (await res.json()) as any;

    if (json.return === true) {
      console.info("[WhatsApp] OTP sent successfully to", mobile);
      return { success: true, message: "OTP sent via WhatsApp" };
    }

    console.error("[WhatsApp] Fast2SMS error:", json);
    return { success: false, message: json.message?.[0] ?? "WhatsApp delivery failed" };
  } catch (err) {
    console.error("[WhatsApp] Request failed:", err);
    return { success: false, message: "WhatsApp service unavailable" };
  }
}
