import { useState } from 'react';
import { CloudSun } from 'lucide-react';
import type { WeatherData } from '../../lib/desktop-types';

const WX_CODES: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Freezing fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  80: 'Rain showers', 81: 'Moderate showers', 82: 'Violent showers', 95: 'Thunderstorm'
};

export function WeatherApp() {
  const [city, setCity] = useState('New York');
  const [wx, setWx] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const fetchWx = async () => {
    setLoading(true); setErr('');
    try {
      const geo = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`);
      const gd = (await geo.json()) as Array<{ lat: string; lon: string }>;
      if (!gd[0]) throw new Error('City not found');
      const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${gd[0].lat}&longitude=${gd[0].lon}&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit`);
      const wxd = (await wxRes.json()) as { current: { temperature_2m: number; weather_code: number; wind_speed_10m: number } };
      setWx({ temp: Math.round(wxd.current.temperature_2m), desc: WX_CODES[wxd.current.weather_code] ?? 'Unknown', wind: Math.round(wxd.current.wind_speed_10m) });
    } catch (e) { setErr(e instanceof Error ? e.message : 'Fetch failed'); }
    setLoading(false);
  };

  return (
    <div className="weather-app">
      <div className="weather-search">
        <input value={city} onChange={(e) => setCity(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void fetchWx()} placeholder="City..." />
        <button type="button" onClick={() => void fetchWx()} disabled={loading}><CloudSun size={15} /> {loading ? '...' : 'Fetch'}</button>
      </div>
      {err && <div className="vfs-error">{err}</div>}
      {wx && <div className="weather-display"><div className="weather-temp">{wx.temp}°F</div><div className="weather-desc">{wx.desc}</div><div>Wind: {wx.wind} mph</div></div>}
      {!wx && !err && <p className="media-status">Powered by Open-Meteo — no API key needed.</p>}
    </div>
  );
}
