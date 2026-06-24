const { randomUUID, timingSafeEqual } = require('node:crypto');

const TIMEZONE = 'Asia/Seoul';
const DEFAULT_CALDAV_URL = 'https://caldav.icloud.com/';
const ALLOWED_ORIGINS = new Set([
  'https://hbyim.github.io',
  'https://yimschedulers.netlify.app',
]);

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin)
      ? origin
      : 'https://hbyim.github.io',
    'Access-Control-Allow-Headers': 'Content-Type, X-iCloud-Token',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    Vary: 'Origin',
  };
}

function jsonResponse(statusCode, data, origin) {
  return {
    statusCode,
    headers: corsHeaders(origin),
    body: JSON.stringify(data),
  };
}

function secureEqual(left, right) {
  const a = Buffer.from(left || '');
  const b = Buffer.from(right || '');
  return a.length === b.length && timingSafeEqual(a, b);
}

function authorize(event, origin) {
  const expected = process.env.ICLOUD_PROXY_TOKEN || '';
  if (!expected) {
    return jsonResponse(503, {
      error: 'Netlify 환경변수 ICLOUD_PROXY_TOKEN이 설정되지 않았습니다.',
    }, origin);
  }

  const supplied = event.headers?.['x-icloud-token']
    || event.headers?.['X-iCloud-Token']
    || '';
  if (!secureEqual(supplied, expected)) {
    return jsonResponse(401, { error: 'iCloud 연동 토큰이 올바르지 않습니다.' }, origin);
  }
  return null;
}

function basicAuthHeader() {
  const email = process.env.ICLOUD_EMAIL || '';
  const password = process.env.ICLOUD_APP_PASSWORD || '';
  return `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`;
}

function isConfigured() {
  return Boolean(process.env.ICLOUD_EMAIL && process.env.ICLOUD_APP_PASSWORD);
}

async function davRequest(url, method, body = '', extraHeaders = {}) {
  let currentUrl = new URL(url);
  const headers = {
    Authorization: basicAuthHeader(),
    ...extraHeaders,
  };

  for (let redirectCount = 0; redirectCount < 5; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      method,
      headers,
      body: body || undefined,
      redirect: 'manual',
    });

    if ([301, 302, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error(`CalDAV redirect ${response.status} without location`);
      currentUrl = new URL(location, currentUrl);
      continue;
    }

    const text = await response.text();
    if (!response.ok && response.status !== 207) {
      throw new Error(`iCloud CalDAV ${response.status}: ${text.slice(0, 300)}`);
    }
    return { response, text, url: currentUrl };
  }

  throw new Error('iCloud CalDAV redirect가 너무 많습니다.');
}

function decodeXml(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function extractTag(xml, tagName) {
  const pattern = new RegExp(
    `<(?:[\\w-]+:)?${tagName}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${tagName}>`,
    'i',
  );
  return pattern.exec(xml)?.[1] || '';
}

function responseBlocks(xml) {
  return [...xml.matchAll(
    /<(?:[\w-]+:)?response\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?response>/gi,
  )].map(match => match[1]);
}

function resolveDavUrl(href, baseUrl) {
  return new URL(decodeXml(href), baseUrl).toString();
}

async function discoverCalendar() {
  const baseUrl = process.env.ICLOUD_CALDAV_URL || DEFAULT_CALDAV_URL;
  const principalRequest = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop><d:current-user-principal /></d:prop>
</d:propfind>`;
  const principalResult = await davRequest(baseUrl, 'PROPFIND', principalRequest, {
    Depth: '0',
    'Content-Type': 'application/xml; charset=utf-8',
  });
  const principalBlock = extractTag(principalResult.text, 'current-user-principal');
  const principalHref = extractTag(principalBlock, 'href');
  if (!principalHref) throw new Error('iCloud CalDAV principal을 찾을 수 없습니다.');
  const principalUrl = resolveDavUrl(principalHref, principalResult.url);

  const homeRequest = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><c:calendar-home-set /></d:prop>
</d:propfind>`;
  const homeResult = await davRequest(principalUrl, 'PROPFIND', homeRequest, {
    Depth: '0',
    'Content-Type': 'application/xml; charset=utf-8',
  });
  const homeBlock = extractTag(homeResult.text, 'calendar-home-set');
  const homeHref = extractTag(homeBlock, 'href');
  if (!homeHref) throw new Error('iCloud 캘린더 홈을 찾을 수 없습니다.');
  const homeUrl = resolveDavUrl(homeHref, homeResult.url);

  const calendarsRequest = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:displayname />
    <d:resourcetype />
    <c:supported-calendar-component-set />
  </d:prop>
</d:propfind>`;
  const calendarsResult = await davRequest(homeUrl, 'PROPFIND', calendarsRequest, {
    Depth: '1',
    'Content-Type': 'application/xml; charset=utf-8',
  });

  const calendars = responseBlocks(calendarsResult.text)
    .filter(block => /<(?:[\w-]+:)?calendar(?:\s|\/|>)/i.test(extractTag(block, 'resourcetype')))
    .map(block => ({
      name: decodeXml(extractTag(block, 'displayname')).trim() || 'Calendar',
      url: resolveDavUrl(extractTag(block, 'href'), calendarsResult.url),
    }))
    .filter(calendar => calendar.url);

  if (!calendars.length) throw new Error('iCloud 캘린더를 찾을 수 없습니다.');

  const requestedName = (process.env.ICLOUD_CALENDAR_NAME || '').trim();
  if (!requestedName) return calendars[0];

  const selected = calendars.find(calendar => calendar.name === requestedName);
  if (!selected) {
    throw new Error(`iCloud 캘린더 "${requestedName}"을 찾을 수 없습니다.`);
  }
  return selected;
}

function unfoldIcs(ics) {
  return ics.replace(/\r?\n[ \t]/g, '');
}

function readIcsProperty(block, name) {
  const pattern = new RegExp(`^${name}(?:;([^:]*))?:(.*)$`, 'mi');
  const match = pattern.exec(block);
  return match ? { params: match[1] || '', value: match[2] || '' } : null;
}

function unescapeIcs(value = '') {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function datePartsInSeoul(date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return Object.fromEntries(
    formatter.formatToParts(date)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value]),
  );
}

function parseIcsDate(property) {
  if (!property) return { date: '', time: null, allDay: true };
  const raw = property.value.trim();
  const allDay = /VALUE=DATE/i.test(property.params) || /^\d{8}$/.test(raw);
  if (allDay) {
    return {
      date: `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`,
      time: null,
      allDay: true,
    };
  }

  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?Z?$/.exec(raw);
  if (!match) return { date: '', time: null, allDay: false };

  if (raw.endsWith('Z')) {
    const parts = datePartsInSeoul(new Date(Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6] || 0),
    )));
    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      time: `${parts.hour}:${parts.minute}`,
      allDay: false,
    };
  }

  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    time: `${match[4]}:${match[5]}`,
    allDay: false,
  };
}

function parseEvents(ics) {
  const unfolded = unfoldIcs(decodeXml(ics));
  return [...unfolded.matchAll(/BEGIN:VEVENT\r?\n([\s\S]*?)END:VEVENT/gi)]
    .map(match => {
      const block = match[1];
      const uid = unescapeIcs(readIcsProperty(block, 'UID')?.value || '');
      const start = parseIcsDate(readIcsProperty(block, 'DTSTART'));
      const end = parseIcsDate(readIcsProperty(block, 'DTEND'));
      if (!uid || !start.date) return null;

      return {
        id: `icloud_${uid}`,
        icloudId: uid,
        title: unescapeIcs(readIcsProperty(block, 'SUMMARY')?.value || '(제목 없음)'),
        date: start.date,
        time: start.time,
        endTime: start.allDay ? null : end.time,
        location: unescapeIcs(readIcsProperty(block, 'LOCATION')?.value || '') || null,
        note: unescapeIcs(readIcsProperty(block, 'DESCRIPTION')?.value || '') || null,
        priority: 'mid',
        source: 'icloud',
      };
    })
    .filter(Boolean);
}

function compactUtc(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function compactLocal(date, time = '') {
  return `${date.replace(/-/g, '')}${time ? `T${time.replace(':', '')}00` : ''}`;
}

function escapeIcs(value = '') {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function addDays(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function buildIcs(data, uid) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AI Scheduler//iCloud Calendar//KO',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${escapeIcs(uid)}`,
    `DTSTAMP:${compactUtc(new Date())}`,
    `SUMMARY:${escapeIcs(data.title || '')}`,
  ];

  if (data.location) lines.push(`LOCATION:${escapeIcs(data.location)}`);
  if (data.note) lines.push(`DESCRIPTION:${escapeIcs(data.note)}`);

  if (data.time) {
    const startMinutes = Number(data.time.slice(0, 2)) * 60 + Number(data.time.slice(3, 5));
    const endTime = data.endTime || `${String((Number(data.time.slice(0, 2)) + 1) % 24).padStart(2, '0')}:${data.time.slice(3, 5)}`;
    const endMinutes = Number(endTime.slice(0, 2)) * 60 + Number(endTime.slice(3, 5));
    const endDate = endMinutes <= startMinutes ? addDays(data.date, 1) : data.date;
    lines.push(`DTSTART;TZID=${TIMEZONE}:${compactLocal(data.date, data.time)}`);
    lines.push(`DTEND;TZID=${TIMEZONE}:${compactLocal(endDate, endTime)}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${compactLocal(data.date)}`);
    lines.push(`DTEND;VALUE=DATE:${compactLocal(addDays(data.date, 1))}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR', '');
  return lines.join('\r\n');
}

function eventResponseBlocks(xml) {
  return responseBlocks(xml)
    .map(block => ({
      href: extractTag(block, 'href'),
      etag: decodeXml(extractTag(block, 'getetag')).replace(/^"|"$/g, ''),
      calendarData: extractTag(block, 'calendar-data'),
    }))
    .filter(item => item.href && item.calendarData);
}

async function listEvents(calendar) {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 30);
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + 90);

  const reportBody = `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><d:getetag /><c:calendar-data /></d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${compactUtc(start)}" end="${compactUtc(end)}" />
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;
  const result = await davRequest(calendar.url, 'REPORT', reportBody, {
    Depth: '1',
    'Content-Type': 'application/xml; charset=utf-8',
  });
  return eventResponseBlocks(result.text).flatMap(item => parseEvents(item.calendarData));
}

async function findEventResource(calendar, uid) {
  const reportBody = `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><d:getetag /><c:calendar-data /></d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:prop-filter name="UID">
          <c:text-match collation="i;octet">${escapeXml(uid)}</c:text-match>
        </c:prop-filter>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;
  const result = await davRequest(calendar.url, 'REPORT', reportBody, {
    Depth: '1',
    'Content-Type': 'application/xml; charset=utf-8',
  });
  const item = eventResponseBlocks(result.text)[0];
  if (!item) throw new Error('iCloud 일정을 찾을 수 없습니다.');
  return {
    url: resolveDavUrl(item.href, result.url),
    etag: item.etag,
  };
}

function normalizeRoute(path = '') {
  return path
    .replace(/^\/\.netlify\/functions\/icloud/, '')
    .replace(/^\/api\/icloud/, '')
    .replace(/\/+$/, '') || '/';
}

exports.handler = async function handler(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  }

  const authError = authorize(event, origin);
  if (authError) return authError;

  const route = normalizeRoute(event.path);
  const method = event.httpMethod || 'GET';

  if (!isConfigured()) {
    return jsonResponse(200, {
      configured: false,
      connected: false,
      error: 'ICLOUD_EMAIL 또는 ICLOUD_APP_PASSWORD가 설정되지 않았습니다.',
    }, origin);
  }

  try {
    if (route === '/status' && method === 'GET') {
      const calendar = await discoverCalendar();
      return jsonResponse(200, {
        configured: true,
        connected: true,
        calendar: calendar.name,
      }, origin);
    }

    if (route === '/events' && method === 'GET') {
      const calendar = await discoverCalendar();
      return jsonResponse(200, await listEvents(calendar), origin);
    }

    const data = event.body ? JSON.parse(event.body) : {};
    if (route === '/events' && method === 'POST') {
      const calendar = await discoverCalendar();
      const uid = randomUUID();
      const calendarBase = calendar.url.endsWith('/') ? calendar.url : `${calendar.url}/`;
      const resourceUrl = new URL(`${encodeURIComponent(uid)}.ics`, calendarBase).toString();
      await davRequest(resourceUrl, 'PUT', buildIcs(data, uid), {
        'Content-Type': 'text/calendar; charset=utf-8',
        'If-None-Match': '*',
      });
      return jsonResponse(201, {
        ...data,
        id: `icloud_${uid}`,
        icloudId: uid,
        source: 'icloud',
      }, origin);
    }

    const eventMatch = /^\/events\/(.+)$/.exec(route);
    if (eventMatch && method === 'PUT') {
      const uid = decodeURIComponent(eventMatch[1]);
      const calendar = await discoverCalendar();
      const resource = await findEventResource(calendar, uid);
      await davRequest(resource.url, 'PUT', buildIcs(data, uid), {
        'Content-Type': 'text/calendar; charset=utf-8',
        ...(resource.etag ? { 'If-Match': `"${resource.etag}"` } : {}),
      });
      return jsonResponse(200, {
        ...data,
        id: `icloud_${uid}`,
        icloudId: uid,
        source: 'icloud',
      }, origin);
    }

    if (eventMatch && method === 'DELETE') {
      const uid = decodeURIComponent(eventMatch[1]);
      const calendar = await discoverCalendar();
      const resource = await findEventResource(calendar, uid);
      await davRequest(resource.url, 'DELETE', '', {
        ...(resource.etag ? { 'If-Match': `"${resource.etag}"` } : {}),
      });
      return jsonResponse(200, { ok: true }, origin);
    }

    return jsonResponse(404, { error: 'Not found' }, origin);
  } catch (error) {
    console.error('iCloud function error:', error);
    return jsonResponse(500, { error: error.message || 'iCloud 연동 오류' }, origin);
  }
};
