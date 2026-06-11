/**
 * presence-location — derive a coarse, human-readable location string for a
 * remote user from the Geolocation API + a reverse-geocode lookup.
 *
 * Output shape: "City, Country · GMT+4" (any missing part is omitted).
 * Pure formatters are unit-tested; captureRemoteLocation does the I/O.
 */

/** GMT offset label from Date.getTimezoneOffset() (minutes BEHIND UTC, positive = behind). */
export function formatGmtOffset(offsetMinutes: number): string {
  const totalMin = -offsetMinutes; // minutes AHEAD of UTC
  const sign = totalMin >= 0 ? '+' : '-';
  const abs = Math.abs(totalMin);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `GMT${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
}

/** Join city/country/gmt into a display string, omitting blanks. Null if all blank. */
export function formatPresenceLocation(parts: {
  city?: string | null;
  country?: string | null;
  gmt?: string | null;
}): string | null {
  const place = [parts.city, parts.country].filter(Boolean).join(', ');
  const segs = [place, parts.gmt].filter((s) => s && s.length > 0);
  return segs.length ? segs.join(' · ') : null;
}

interface ReverseGeocode {
  city?: string | null;
  locality?: string | null;
  principalSubdivision?: string | null;
  countryName?: string | null;
}

/**
 * Ask the browser for the user's position and reverse-geocode it to a coarse
 * "City, Country · GMT±N" string. Resolves to null if permission is denied,
 * geolocation is unavailable, or the lookup fails — never throws.
 */
export async function captureRemoteLocation(): Promise<string | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  const gmt = formatGmtOffset(new Date().getTimezoneOffset());

  const coords = await new Promise<GeolocationCoordinates | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  });
  // No coords (denied/unavailable) → still surface the timezone as a weak signal.
  if (!coords) return formatPresenceLocation({ gmt });

  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`;
    const res = await fetch(url);
    if (!res.ok) return formatPresenceLocation({ gmt });
    const data = (await res.json()) as ReverseGeocode;
    const city = data.city || data.locality || data.principalSubdivision || null;
    return formatPresenceLocation({ city, country: data.countryName, gmt });
  } catch {
    return formatPresenceLocation({ gmt });
  }
}
