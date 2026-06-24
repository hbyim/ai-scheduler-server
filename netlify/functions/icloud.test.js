const test = require('node:test');
const assert = require('node:assert/strict');

const { handler } = require('./icloud');

const TOKEN = 'test-proxy-token';
const CALENDAR_URL = 'https://caldav.icloud.com/calendars/user/home/';
const RESOURCE_URL = `${CALENDAR_URL}existing-event.ics`;
const UID = 'existing-event';

const principalXml = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:">
  <d:response>
    <d:current-user-principal><d:href>/principal/</d:href></d:current-user-principal>
  </d:response>
</d:multistatus>`;

const homeXml = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:response>
    <c:calendar-home-set><d:href>/calendars/user/</d:href></c:calendar-home-set>
  </d:response>
</d:multistatus>`;

const calendarsXml = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:response>
    <d:href>/calendars/user/home/</d:href>
    <d:displayname>캘린더</d:displayname>
    <d:resourcetype><d:collection/><c:calendar/></d:resourcetype>
  </d:response>
</d:multistatus>`;

const existingIcs = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Apple Inc.//iCloud Calendar//EN',
  'BEGIN:VEVENT',
  `UID:${UID}`,
  'DTSTAMP:20260624T000000Z',
  'SEQUENCE:2',
  'SUMMARY:기존 일정',
  'DTSTART;TZID=Asia/Seoul:20260625T090000',
  'DTEND;TZID=Asia/Seoul:20260625T100000',
  'BEGIN:VALARM',
  'TRIGGER:-PT10M',
  'ACTION:DISPLAY',
  'DESCRIPTION:Reminder',
  'END:VALARM',
  'END:VEVENT',
  'END:VCALENDAR',
  '',
].join('\r\n');

function xmlResponse(body) {
  return new Response(body, {
    status: 207,
    headers: { 'Content-Type': 'application/xml' },
  });
}

function textResponse(body, status = 200, headers = {}) {
  return new Response(status === 204 ? null : body, { status, headers });
}

function discoveryQueue() {
  return [
    xmlResponse(principalXml),
    xmlResponse(homeXml),
    xmlResponse(calendarsXml),
  ];
}

function installFetchMock(responses) {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    const response = responses.shift();
    if (!response) throw new Error(`Unexpected fetch: ${options.method || 'GET'} ${url}`);
    return response;
  };
  return calls;
}

function netlifyEvent(path, method, body) {
  return {
    path,
    httpMethod: method,
    headers: {
      origin: 'https://hbyim.github.io',
      'x-icloud-token': TOKEN,
    },
    body: body === undefined ? null : JSON.stringify(body),
  };
}

test('listed iCloud resources can be updated and deleted directly', async t => {
  const originalFetch = global.fetch;
  const originalEnv = {
    email: process.env.ICLOUD_EMAIL,
    password: process.env.ICLOUD_APP_PASSWORD,
    token: process.env.ICLOUD_PROXY_TOKEN,
    caldavUrl: process.env.ICLOUD_CALDAV_URL,
    calendarName: process.env.ICLOUD_CALENDAR_NAME,
  };

  process.env.ICLOUD_EMAIL = 'user@example.com';
  process.env.ICLOUD_APP_PASSWORD = 'app-password';
  process.env.ICLOUD_PROXY_TOKEN = TOKEN;
  process.env.ICLOUD_CALDAV_URL = 'https://caldav.icloud.com/';
  delete process.env.ICLOUD_CALENDAR_NAME;

  t.after(() => {
    global.fetch = originalFetch;
    const restore = (name, value) => {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    };
    restore('ICLOUD_EMAIL', originalEnv.email);
    restore('ICLOUD_APP_PASSWORD', originalEnv.password);
    restore('ICLOUD_PROXY_TOKEN', originalEnv.token);
    restore('ICLOUD_CALDAV_URL', originalEnv.caldavUrl);
    restore('ICLOUD_CALENDAR_NAME', originalEnv.calendarName);
  });

  const listReport = `<?xml version="1.0"?>
  <d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
    <d:response>
      <d:href>/calendars/user/home/existing-event.ics</d:href>
      <d:getetag>&quot;etag-list&quot;</d:getetag>
      <c:calendar-data><![CDATA[${existingIcs}]]></c:calendar-data>
    </d:response>
  </d:multistatus>`;
  installFetchMock([...discoveryQueue(), xmlResponse(listReport)]);
  const listResult = await handler(netlifyEvent('/.netlify/functions/icloud/events', 'GET'));
  assert.equal(listResult.statusCode, 200);
  const listedEvent = JSON.parse(listResult.body)[0];
  assert.equal(listedEvent.icloudId, UID);
  assert.equal(
    Buffer.from(listedEvent.icloudResource, 'base64url').toString('utf8'),
    RESOURCE_URL,
  );
  assert.equal(listedEvent.icloudEtag, '"etag-list"');

  const updateCalls = installFetchMock([
    ...discoveryQueue(),
    textResponse(existingIcs, 200, { ETag: '"etag-current"' }),
    textResponse('', 204, { ETag: '"etag-updated"' }),
  ]);
  const updateResult = await handler(netlifyEvent(
    `/.netlify/functions/icloud/events/${UID}`,
    'PUT',
    {
      ...listedEvent,
      title: '수정된 일정',
      date: '2026-06-26',
      time: '11:00',
      endTime: '12:00',
    },
  ));
  assert.equal(updateResult.statusCode, 200);
  assert.equal(updateCalls.length, 5);
  assert.equal(updateCalls[3].url, RESOURCE_URL);
  assert.equal(updateCalls[3].options.method, 'GET');
  assert.equal(updateCalls[4].url, RESOURCE_URL);
  assert.equal(updateCalls[4].options.method, 'PUT');
  assert.equal(updateCalls[4].options.headers['If-Match'], '"etag-current"');
  assert.match(updateCalls[4].options.body, /SUMMARY:수정된 일정/);
  assert.match(updateCalls[4].options.body, /SEQUENCE:3/);
  assert.match(updateCalls[4].options.body, /BEGIN:VALARM/);
  assert.doesNotMatch(updateCalls[4].options.body, /SUMMARY:기존 일정/);
  assert.equal(JSON.parse(updateResult.body).icloudEtag, '"etag-updated"');

  const deleteCalls = installFetchMock([
    ...discoveryQueue(),
    textResponse(existingIcs, 200, { ETag: '"etag-delete"' }),
    textResponse('', 204),
  ]);
  const deleteResult = await handler(netlifyEvent(
    `/.netlify/functions/icloud/events/${UID}`,
    'DELETE',
    {
      icloudResource: listedEvent.icloudResource,
      icloudEtag: listedEvent.icloudEtag,
    },
  ));
  assert.equal(deleteResult.statusCode, 200);
  assert.equal(deleteCalls.length, 5);
  assert.equal(deleteCalls[3].url, RESOURCE_URL);
  assert.equal(deleteCalls[3].options.method, 'GET');
  assert.equal(deleteCalls[4].url, RESOURCE_URL);
  assert.equal(deleteCalls[4].options.method, 'DELETE');
  assert.equal(deleteCalls[4].options.headers['If-Match'], '"etag-delete"');
});
