export const DEVICE_LOCATION_MESSAGES = Object.freeze({
  unsupported: "Device location is not available in this browser. Search for a US city instead.",
  "permission-denied": "Location permission was denied. You can still search for a US city.",
  unavailable: "Your device could not determine its location. Search for a US city instead.",
  timeout: "Device location took too long. Try again or search for a US city.",
  unknown: "Device location could not be used. Search for a US city instead.",
});

export class DeviceLocationError extends Error {
  constructor(code) {
    super(DEVICE_LOCATION_MESSAGES[code] ?? DEVICE_LOCATION_MESSAGES.unknown);
    this.name = "DeviceLocationError";
    this.code = Object.hasOwn(DEVICE_LOCATION_MESSAGES, code) ? code : "unknown";
  }
}

export function mapGeolocationError(error) {
  if (error?.code === 1) return new DeviceLocationError("permission-denied");
  if (error?.code === 2) return new DeviceLocationError("unavailable");
  if (error?.code === 3) return new DeviceLocationError("timeout");
  return new DeviceLocationError("unknown");
}

export function requestDeviceLocation({
  geolocation = globalThis.navigator?.geolocation,
  timeoutMs = 8_000,
} = {}) {
  if (!geolocation || typeof geolocation.getCurrentPosition !== "function") {
    return Promise.reject(new DeviceLocationError("unsupported"));
  }

  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      (position) => {
        const latitude = position?.coords?.latitude;
        const longitude = position?.coords?.longitude;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          reject(new DeviceLocationError("unavailable"));
          return;
        }
        resolve(Object.freeze({
          id: null,
          name: "Current location",
          label: "Current location",
          admin1: null,
          countryCode: null,
          latitude,
          longitude,
          timezone: null,
        }));
      },
      (error) => reject(mapGeolocationError(error)),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: timeoutMs },
    );
  });
}
