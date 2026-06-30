import { useEffect, useRef, useState, type CSSProperties } from 'react';

const QUOTES = [
  'every day above ground is a good day, babe',
  'your vibe is your superpower. use it to haunt people.',
  'be the chaos you wish to see in the world',
  'mochi says today is going to be purrfect. trust mochi.',
  'living dead never looked this good, honestly.',
  'slay first. worry about consequences later. maybe.',
  'the graveyard is just a really quiet neighbourhood.',
  'cursed or blessed? lilly says: both. always both.',
  "you're doing amazing sweetie, even if you're a mess",
  'skulls are just nature saying you have good bones.',
  "today's energy: chaotic good with a side of horror",
  "if you're not a little bit dead inside, are you even living?",
  'mochi approves of your life choices. mostly.',
  'keep going, the plot gets better in the second act',
  'your aesthetic is valid. especially the dark one.',
  'rise and slay, the underworld can wait',
  "it's giving main character energy. dark main character. perfect.",
  "today's forecast: haunted with a chance of slaying."
];

const WEATHER_CODES: Record<number, string> = {
  0: 'clear sky',
  1: 'mainly clear',
  2: 'partly cloudy',
  3: 'overcast',
  45: 'foggy',
  48: 'icy fog',
  51: 'light drizzle',
  53: 'drizzle',
  55: 'heavy drizzle',
  61: 'light rain',
  63: 'rain',
  65: 'heavy rain',
  71: 'light snow',
  73: 'snow',
  75: 'heavy snow',
  80: 'showers',
  81: 'showers',
  82: 'heavy showers',
  95: 'thunderstorm',
  99: 'hail storm'
};

type WeatherData = {
  tempC: number;
  tempF: number;
  desc: string;
  loc: string;
};

export default function LillyClock() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [secBar, setSecBar] = useState('.'.repeat(20));
  const [quote, setQuote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [imgError, setImgError] = useState(false);
  const quoteIdxRef = useRef(Math.floor(Math.random() * QUOTES.length));

  useEffect(() => {
    function tick() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setTime(`${h}:${m}:${s}`);

      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      setDate(`${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`);

      const filled = Math.round((now.getSeconds() * 20) / 59);
      setSecBar('#'.repeat(filled) + '.'.repeat(20 - filled));

      if (now.getSeconds() === 0) {
        quoteIdxRef.current = (quoteIdxRef.current + 1) % QUOTES.length;
        setQuote(QUOTES[quoteIdxRef.current]);
      }
    }

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    async function fetchWeather() {
      try {
        const geoRes = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=Cranbourne&count=1&country=AU');
        const geoData = (await geoRes.json()) as { results?: Array<{ latitude: number; longitude: number }> };
        const loc = geoData.results?.[0];
        if (!loc) {
          setWeather(null);
          return;
        }

        const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true`);
        const wData = (await wRes.json()) as { current_weather?: { temperature: number; weathercode: number } };
        const current = wData.current_weather;
        if (!current) {
          setWeather(null);
          return;
        }

        const tempC = Math.round(current.temperature);
        const tempF = Math.round((tempC * 9) / 5 + 32);
        const desc = WEATHER_CODES[current.weathercode] ?? 'mysterious';
        setWeather({ tempC, tempF, desc, loc: 'Cranbourne VIC' });
      } catch {
        setWeather(null);
      }
    }

    void fetchWeather();
    const id = window.setInterval(() => void fetchWeather(), 10 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div style={styles.card}>
      <div style={styles.scanlines} aria-hidden="true" />

      <div style={styles.faceWrap}>
        {imgError ? (
          <div style={styles.fallback}>XO</div>
        ) : (
          <img
            src="/assets/lillyclockface.png"
            alt="Lilly XO"
            style={styles.faceImg}
            onError={() => setImgError(true)}
          />
        )}
      </div>

      <div style={styles.timeDisplay}>{time || '--:--:--'}</div>
      <div style={styles.dateDisplay}>{date || 'loading...'}</div>

      <div style={styles.weatherRow}>
        <span style={styles.wTemp}>{weather ? `${weather.tempC} C` : '-- C'}</span>
        <span style={styles.wSep}>/</span>
        <span style={styles.wTemp}>{weather ? `${weather.tempF} F` : '-- F'}</span>
        <span style={styles.wDivider}>/</span>
        <span style={styles.wDesc}>{weather ? weather.desc : 'fetching...'}</span>
        <span style={styles.wDivider}>/</span>
        <span style={styles.wLoc}>{weather ? weather.loc : 'Cranbourne'}</span>
      </div>

      <div style={styles.quoteBox}>
        <div style={styles.quoteText}>{quote}</div>
        <div style={styles.quoteAuthor}>- lilly xo</div>
      </div>

      <div style={styles.statusBar}>
        <span>SCHADELKOPH_OS</span>
        <span style={styles.secBar}>{secBar}</span>
        <span>LILLY_ONLINE</span>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    background: '#080810',
    border: '1.5px solid #7700cc',
    borderRadius: 18,
    padding: '18px 20px 14px',
    maxWidth: 400,
    width: '100%',
    fontFamily: "'Share Tech Mono', 'Courier New', monospace",
    color: '#e0c0ff',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
    margin: '0 auto'
  },
  scanlines: {
    position: 'absolute',
    inset: 0,
    background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(119,0,204,0.04) 3px, rgba(119,0,204,0.04) 4px)',
    pointerEvents: 'none',
    zIndex: 0
  },
  faceWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
    zIndex: 1
  },
  faceImg: {
    width: 110,
    height: 110,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #aa00ff'
  },
  fallback: {
    width: 110,
    height: 110,
    borderRadius: '50%',
    background: '#1a0030',
    border: '2px solid #aa00ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 40
  },
  timeDisplay: {
    textAlign: 'center',
    fontSize: 52,
    color: '#ff69b4',
    letterSpacing: 4,
    lineHeight: 1,
    marginBottom: 4,
    fontFamily: "'Share Tech Mono', 'Courier New', monospace",
    position: 'relative',
    zIndex: 1
  },
  dateDisplay: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9944cc',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 12,
    position: 'relative',
    zIndex: 1
  },
  weatherRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    padding: '7px 12px',
    background: 'rgba(119,0,204,0.12)',
    borderRadius: 8,
    border: '0.5px solid rgba(119,0,204,0.35)',
    fontSize: 12,
    flexWrap: 'wrap',
    position: 'relative',
    zIndex: 1
  },
  wTemp: { color: '#ff69b4', fontSize: 14 },
  wSep: { color: '#440066' },
  wDesc: { color: '#7733aa', fontSize: 11 },
  wLoc: { color: '#550088', fontSize: 11 },
  wDivider: { color: '#330044' },
  quoteBox: {
    background: 'rgba(255,105,180,0.07)',
    border: '0.5px solid rgba(255,105,180,0.25)',
    borderRadius: 8,
    padding: '9px 14px',
    textAlign: 'center',
    fontSize: 12,
    color: '#ffaadd',
    lineHeight: 1.6,
    minHeight: 40,
    position: 'relative',
    zIndex: 1
  },
  quoteText: { marginBottom: 2 },
  quoteAuthor: {
    fontSize: 10,
    color: '#660099',
    marginTop: 3,
    letterSpacing: 1
  },
  statusBar: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
    fontSize: 9,
    color: '#55206f',
    letterSpacing: 1,
    position: 'relative',
    zIndex: 1,
    overflow: 'hidden'
  },
  secBar: {
    fontSize: 9,
    color: '#8842b7',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    maxWidth: 120
  }
};
