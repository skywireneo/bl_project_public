// src/http/utils/deviceInfo.js
import sha256 from "crypto-js/sha256";

export async function getDeviceInfo() {
  const language = navigator.language || (navigator.languages && navigator.languages[0]) || null;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  const timezoneOffset = new Date().getTimezoneOffset();

  const screenData = {
    width: window.screen?.width ?? null,
    height: window.screen?.height ?? null,
    availWidth: window.screen?.availWidth ?? null,
    availHeight: window.screen?.availHeight ?? null,
    colorDepth: window.screen?.colorDepth ?? null,
    pixelRatio: window.devicePixelRatio ?? 1
  };

  let platform = "unknown";
  let os = "unknown";
  let model = "unknown";
  let isMobile = false;
  let browser = "Unknown";
  let browserVersion = "Unknown";
  let architecture = "unknown";
  let platformVersion = "unknown";

  // 1. Попытка получить данные через современный Client Hints API
  if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
    try {
      // Добавили architecture и platformVersion для лучшей идентификации ПК
      const hints = await navigator.userAgentData.getHighEntropyValues([
        "platform", "platformVersion", "model", "uaFullVersion", "architecture"
      ]);

      platform = hints.platform || navigator.userAgentData.platform || "unknown";
      os = platform;
      model = hints.model || "unknown"; // На мобильных будет "iPhone" или "Samsung", на ПК останется "unknown"
      isMobile = !!navigator.userAgentData.mobile;
      architecture = hints.architecture || "unknown";
      platformVersion = hints.platformVersion || "unknown";

      // УМНАЯ ФИЛЬТРАЦИЯ БРЕНДОВ
      const brands = navigator.userAgentData.brands || [];
      // Убираем заглушки приватности ("Not A(Brand", "Not;A Brand" и т.д.)
      const validBrands = brands.filter(b => !/not.*brand/i.test(b.brand));

      // Ищем конкретный браузер (Yandex, Edge, Opera и т.д.)
      const specificBrand = validBrands.find(b =>
        ['Yandex', 'Edge', 'Opera', 'Firefox', 'Safari'].some(name => b.brand.includes(name))
      );

      // Если конкретного нет, берем движок (Chromium, Chrome)
      const engineBrand = validBrands.find(b =>
        ['Chromium', 'Chrome'].some(name => b.brand.includes(name))
      );

      const mainBrand = specificBrand || engineBrand || validBrands[0];

      if (mainBrand) {
        browser = mainBrand.brand;
        browserVersion = mainBrand.version;
      }
    } catch (e) {
      platform = navigator.userAgentData.platform || "unknown";
      isMobile = !!navigator.userAgentData.mobile;
    }
  }

  // 2. Классический фолбэк на User-Agent (ОЧЕНЬ важен для Яндекс.Браузера и Safari)
  const ua = navigator.userAgent;

  // Если API не дал четкого названия, или дал "Chromium", но в UA есть YaBrowser - переопределяем!
  if (browser === "Unknown" || browser === "Chromium" || browser === "Chrome") {
    if (ua.includes("YaBrowser")) {
      browser = "Yandex Browser";
      browserVersion = ua.match(/YaBrowser\/([0-9.]+)/)?.[1] || "Unknown";
    } else if (ua.includes("Edg")) {
      browser = "Edge";
      browserVersion = ua.match(/Edg\/([0-9.]+)/)?.[1] || "Unknown";
    } else if (ua.includes("OPR") || ua.includes("Opera")) {
      browser = "Opera";
      browserVersion = ua.match(/(?:OPR|Opera)\/([0-9.]+)/)?.[1] || "Unknown";
    } else if (ua.includes("Firefox")) {
      browser = "Firefox";
      browserVersion = ua.match(/Firefox\/([0-9.]+)/)?.[1] || "Unknown";
    } else if (ua.includes("Chrome") && !ua.includes("Edg")) {
      browser = "Chrome";
      browserVersion = ua.match(/Chrome\/([0-9.]+)/)?.[1] || "Unknown";
    } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
      browser = "Safari";
      browserVersion = ua.match(/Version\/([0-9.]+)/)?.[1] || "Unknown";
    }
  }

  // Уточнение ОС и модели через UA, если Client Hints не сработал
  if (os === "unknown" || model === "unknown") {
    if (/Windows NT/i.test(ua)) os = "Windows";
    else if (/Mac OS X/i.test(ua)) os = "MacOS";
    else if (/Android/i.test(ua)) os = "Android";
    else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
    else if (/Linux/i.test(ua)) os = "Linux";

    if (/iPhone/i.test(ua)) model = "iPhone";
    else if (/iPad/i.test(ua)) model = "iPad";
    else if (/Android/i.test(ua)) {
      const match = ua.match(/Android.*;\s([^\);]+)\)/i);
      model = match ? match[1].trim() : "Android device";
    } else if (os === "Windows" || os === "MacOS" || os === "Linux") {
      // Для ПК явно указываем, что это десктоп, чтобы не висело "unknown"
      model = `Desktop PC (${architecture !== 'unknown' ? architecture : 'x64'})`;
    }

    isMobile = /android|iphone|ipad|mobile/i.test(ua);
  }

  const hardware = {
    cores: navigator.hardwareConcurrency || "unknown",
    memory: navigator.deviceMemory || "unknown",
    touchPoints: navigator.maxTouchPoints || 0
  };

  const features = {
    localStorage: typeof window.localStorage !== "undefined",
    sessionStorage: typeof window.sessionStorage !== "undefined",
    serviceWorker: "serviceWorker" in navigator,
    cookiesEnabled: navigator.cookieEnabled ?? null
  };

  const fingerprintString = JSON.stringify({
    platform,
    os,
    browser,
    browserVersion,
    model,
    architecture,      // Новое поле для хэша
    platformVersion,   // Новое поле для хэша
    screen: screenData,
    hardware,
    language,
    timezone,
    timezoneOffset,
    isMobile,
    features
  });

  const fingerprint = sha256(fingerprintString).toString();

  return {
    platform,
    os,
    browser,
    browserVersion,
    model,
    architecture,      // Возвращаем на фронт (можно использовать в UI)
    platformVersion,   // Возвращаем на фронт
    screen: screenData,
    hardware,
    language,
    timezone,
    isMobile,
    features,
    fingerprint
  };
}