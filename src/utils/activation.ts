const DEVICE_ID_STORAGE_KEY = "activation.device-id";

function generateDeviceId(): string {
  const cryptoObj =
    typeof crypto !== "undefined"
      ? (crypto as Crypto & { randomUUID?: () => string })
      : undefined;

  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing) {
      return existing;
    }
  } catch {
    // ignore
  }

  const deviceId = generateDeviceId();

  try {
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  } catch {
    // ignore
  }

  return deviceId;
}

export async function activateCode(
  code: string,
  deviceId: string
): Promise<{ ok: boolean; message?: string }> {
  if (!deviceId) {
    return {
      ok: false,
      message: "设备 ID 不能为空。",
    };
  }

  const value = code.trim();
  const pattern = /^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/;

  if (!pattern.test(value)) {
    return {
      ok: false,
      message: "激活码格式不正确，应为 XXXX-XXXX。",
    };
  }

  return {
    ok: true,
  };
}
