import os, uuid, json, re
from datetime import date as date_type, datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import requests as req
from caldav import DAVClient
from icalendar import Calendar, Event

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from google_auth_oauthlib.flow import Flow

app = Flask(__name__, static_folder='static')
CORS(app)

TABLE = 'events'
GCAL_SCOPES = ['https://www.googleapis.com/auth/calendar']
GCAL_API    = 'https://www.googleapis.com/calendar/v3'
TIMEZONE    = 'Asia/Seoul'
LOCAL_TZ    = ZoneInfo(TIMEZONE)

# ─── Supabase helpers ──────────────────────────────────────────────────────────
def get_config():
    url = os.environ.get('SUPABASE_URL', '').rstrip('/')
    key = os.environ.get('SUPABASE_KEY', '')
    return url, key

def sb_headers(key):
    return {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
    }

def sb_url(url, suffix=''):
    return f'{url}/rest/v1/{TABLE}{suffix}'

def check_config():
    url, key = get_config()
    if not url or not key:
        return False, None, None, 'SUPABASE_URL 또는 SUPABASE_KEY 환경변수가 설정되지 않았습니다.'
    return True, url, key, 'ok'

def to_db(e):
    return {
        'id':       e.get('id'),
        'title':    e.get('title'),
        'date':     e.get('date'),
        'time':     e.get('time'),
        'end_time': e.get('endTime'),
        'location': e.get('location'),
        'note':     e.get('note'),
        'priority': e.get('priority', 'mid'),
    }

def to_front(e):
    return {
        'id':       e.get('id'),
        'title':    e.get('title'),
        'date':     e.get('date'),
        'time':     e.get('time'),
        'endTime':  e.get('end_time'),
        'location': e.get('location'),
        'note':     e.get('note'),
        'priority': e.get('priority', 'mid'),
    }

# ─── Supabase settings (key-value store) ───────────────────────────────────────
def sb_setting_get(key_name):
    url, key = get_config()
    if not url: return None
    r = req.get(
        f'{url}/rest/v1/settings?key=eq.{key_name}&select=value',
        headers=sb_headers(key), timeout=5
    )
    if not r.ok or not r.json(): return None
    try: return r.json()[0]['value']
    except: return None

def sb_setting_set(key_name, value):
    url, key = get_config()
    if not url: return
    req.post(
        f'{url}/rest/v1/settings',
        headers={**sb_headers(key), 'Prefer': 'resolution=merge-duplicates'},
        json={'key': key_name, 'value': value}, timeout=5
    )

def sb_setting_del(key_name):
    url, key = get_config()
    if not url: return
    req.delete(f'{url}/rest/v1/settings?key=eq.{key_name}',
               headers=sb_headers(key), timeout=5)

# ─── Google OAuth helpers ──────────────────────────────────────────────────────
def make_oauth_flow():
    client_config = {
        "web": {
            "client_id":     os.environ.get('GOOGLE_CLIENT_ID', ''),
            "client_secret": os.environ.get('GOOGLE_CLIENT_SECRET', ''),
            "auth_uri":      "https://accounts.google.com/o/oauth2/auth",
            "token_uri":     "https://oauth2.googleapis.com/token",
            "redirect_uris": [os.environ.get('GOOGLE_REDIRECT_URI', '')],
        }
    }
    return Flow.from_client_config(
        client_config, scopes=GCAL_SCOPES,
        redirect_uri=os.environ.get('GOOGLE_REDIRECT_URI', '')
    )

def get_gcal_creds():
    raw = sb_setting_get('google_tokens')
    if not raw: return None
    try: tokens = json.loads(raw)
    except: return None
    return Credentials(
        token=tokens.get('access_token'),
        refresh_token=tokens.get('refresh_token'),
        token_uri='https://oauth2.googleapis.com/token',
        client_id=os.environ.get('GOOGLE_CLIENT_ID'),
        client_secret=os.environ.get('GOOGLE_CLIENT_SECRET'),
        scopes=GCAL_SCOPES
    )

def save_gcal_creds(creds):
    sb_setting_set('google_tokens', json.dumps({
        'access_token':  creds.token,
        'refresh_token': creds.refresh_token,
    }))

def gcal_req(method, path, creds, **kwargs):
    """Authenticated Google Calendar API request (auto-refreshes token)."""
    if creds.expired and creds.refresh_token:
        creds.refresh(GoogleRequest())
        save_gcal_creds(creds)
    headers = {
        'Authorization':  f'Bearer {creds.token}',
        'Content-Type': 'application/json',
    }
    return getattr(req, method)(f'{GCAL_API}{path}', headers=headers, timeout=15, **kwargs)

# ─── Google Calendar event converters ──────────────────────────────────────────
def gcal_to_app(ev):
    start = ev.get('start', {})
    end   = ev.get('end', {})
    if 'dateTime' in start:
        dt_str = re.sub(r'[+-]\d{2}:\d{2}$', '', start['dateTime'])
        dt   = datetime.fromisoformat(dt_str)
        date = dt.strftime('%Y-%m-%d')
        time = dt.strftime('%H:%M')
    else:
        date = start.get('date', '')
        time = None
    if 'dateTime' in end:
        et_str = re.sub(r'[+-]\d{2}:\d{2}$', '', end['dateTime'])
        et       = datetime.fromisoformat(et_str)
        end_time = et.strftime('%H:%M')
    else:
        end_time = None
    return {
        'id':       'gcal_' + ev['id'],
        'gcalId':   ev['id'],
        'title':    ev.get('summary', '(제목 없음)'),
        'date':     date,
        'time':     time,
        'endTime':  end_time,
        'location': ev.get('location') or None,
        'note':     ev.get('description') or None,
        'priority': 'mid',
        'source':   'gcal',
    }

def app_to_gcal(data):
    date     = data.get('date', '')
    time     = data.get('time')
    end_time = data.get('endTime')
    if time:
        start = {'dateTime': f'{date}T{time}:00', 'timeZone': TIMEZONE}
        if end_time:
            end = {'dateTime': f'{date}T{end_time}:00', 'timeZone': TIMEZONE}
        else:
            dt  = datetime.strptime(f'{date}T{time}', '%Y-%m-%dT%H:%M')
            end = {'dateTime': (dt + timedelta(hours=1)).strftime('%Y-%m-%dT%H:%M:00'),
                   'timeZone': TIMEZONE}
    else:
        dt    = datetime.strptime(date, '%Y-%m-%d')
        start = {'date': date}
        end   = {'date': (dt + timedelta(days=1)).strftime('%Y-%m-%d')}
    return {
        'summary':     data.get('title', ''),
        'location':    data.get('location') or '',
        'description': data.get('note') or '',
        'start': start,
        'end':   end,
    }

# ─── iCloud Calendar (CalDAV) helpers ─────────────────────────────────────────
def icloud_is_configured():
    return bool(os.environ.get('ICLOUD_EMAIL') and
                os.environ.get('ICLOUD_APP_PASSWORD'))

def get_icloud_calendar():
    if not icloud_is_configured():
        raise RuntimeError('iCloud 환경변수가 설정되지 않았습니다')
    client = DAVClient(
        url=os.environ.get('ICLOUD_CALDAV_URL', 'https://caldav.icloud.com/'),
        username=os.environ['ICLOUD_EMAIL'],
        password=os.environ['ICLOUD_APP_PASSWORD'],
    )
    calendars = client.principal().calendars()
    if not calendars:
        raise RuntimeError('iCloud 캘린더를 찾을 수 없습니다')
    target = os.environ.get('ICLOUD_CALENDAR_NAME', '').strip()
    if target:
        for calendar in calendars:
            if calendar.get_display_name() == target:
                return calendar
        raise RuntimeError(f'iCloud 캘린더 "{target}"을 찾을 수 없습니다')
    return calendars[0]

def _ical_value(component, key, default=''):
    value = component.get(key)
    return str(value) if value is not None else default

def _to_local_datetime(value):
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=LOCAL_TZ)
        return value.astimezone(LOCAL_TZ)
    return value

def ical_event_to_app(component):
    uid = _ical_value(component, 'uid')
    start = component.decoded('dtstart')
    end_prop = component.get('dtend')
    end = component.decoded('dtend') if end_prop is not None else None
    all_day = isinstance(start, date_type) and not isinstance(start, datetime)

    if all_day:
        event_date = start.strftime('%Y-%m-%d')
        event_time = None
        end_time = None
    else:
        local_start = _to_local_datetime(start)
        event_date = local_start.strftime('%Y-%m-%d')
        event_time = local_start.strftime('%H:%M')
        end_time = _to_local_datetime(end).strftime('%H:%M') if end else None

    return {
        'id':        'icloud_' + uid,
        'icloudId':  uid,
        'title':     _ical_value(component, 'summary', '(제목 없음)'),
        'date':      event_date,
        'time':      event_time,
        'endTime':   end_time,
        'location':  _ical_value(component, 'location') or None,
        'note':      _ical_value(component, 'description') or None,
        'priority':  'mid',
        'source':    'icloud',
    }

def caldav_object_to_app(caldav_event):
    calendar_data = Calendar.from_ical(caldav_event.data)
    return [ical_event_to_app(component)
            for component in calendar_data.walk('VEVENT')]

def app_to_ical(data, uid=None):
    calendar_data = Calendar()
    calendar_data.add('prodid', '-//AI Scheduler//iCloud Calendar//KO')
    calendar_data.add('version', '2.0')
    event = Event()
    event.add('uid', uid or str(uuid.uuid4()))
    event.add('summary', data.get('title', ''))
    if data.get('location'):
        event.add('location', data['location'])
    if data.get('note'):
        event.add('description', data['note'])

    event_date = datetime.strptime(data['date'], '%Y-%m-%d')
    event_time = data.get('time')
    end_time = data.get('endTime')
    if event_time:
        start = datetime.strptime(
            f"{data['date']}T{event_time}", '%Y-%m-%dT%H:%M'
        ).replace(tzinfo=LOCAL_TZ)
        if end_time:
            end = datetime.strptime(
                f"{data['date']}T{end_time}", '%Y-%m-%dT%H:%M'
            ).replace(tzinfo=LOCAL_TZ)
            if end <= start:
                end += timedelta(days=1)
        else:
            end = start + timedelta(hours=1)
        event.add('dtstart', start)
        event.add('dtend', end)
    else:
        start_date = event_date.date()
        event.add('dtstart', start_date)
        event.add('dtend', start_date + timedelta(days=1))

    event.add('dtstamp', datetime.now(timezone.utc))
    calendar_data.add_component(event)
    return calendar_data.to_ical()

def find_icloud_event(calendar, uid):
    try:
        return calendar.event_by_uid(uid)
    except Exception:
        for event in calendar.events():
            parsed = caldav_object_to_app(event)
            if any(item.get('icloudId') == uid for item in parsed):
                return event
        raise RuntimeError('iCloud 일정을 찾을 수 없습니다')

# ─── Static ────────────────────────────────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

# ─── Health ────────────────────────────────────────────────────────────────────
@app.route('/api/health')
def health():
    ok, url, key, msg = check_config()
    if not ok:
        return jsonify({'status': 'error', 'message': msg}), 503
    try:
        r = req.get(sb_url(url), headers=sb_headers(key), params={'limit': '1'}, timeout=5)
        if r.ok:
            return jsonify({'status': 'ok', 'supabase': 'connected'})
        return jsonify({'status': 'error', 'message': f'Supabase {r.status_code}: {r.text}'}), 503
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 503

# ─── Local events (Supabase) ───────────────────────────────────────────────────
@app.route('/api/events', methods=['GET'])
def get_events():
    ok, url, key, msg = check_config()
    if not ok: return jsonify({'error': msg}), 503
    try:
        r = req.get(sb_url(url), headers=sb_headers(key),
                    params={'order': 'date.asc,time.asc'}, timeout=10)
        if not r.ok: return jsonify({'error': f'Supabase {r.status_code}: {r.text}'}), 500
        return jsonify([to_front(e) for e in r.json()])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/events', methods=['POST'])
def create_event():
    ok, url, key, msg = check_config()
    if not ok: return jsonify({'error': msg}), 503
    try:
        data = request.get_json()
        if not data.get('id'):
            data['id'] = str(uuid.uuid4())[:8]
        db_row = to_db(data)
        r = req.post(sb_url(url), headers=sb_headers(key), json=db_row, timeout=10)
        if not r.ok: return jsonify({'error': f'Supabase {r.status_code}: {r.text}'}), 500
        rows = r.json()
        return jsonify(to_front(rows[0] if rows else db_row)), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/events/<event_id>', methods=['PUT'])
def update_event(event_id):
    ok, url, key, msg = check_config()
    if not ok: return jsonify({'error': msg}), 503
    try:
        data = request.get_json()
        data['id'] = event_id
        db_row = to_db(data)
        r = req.patch(sb_url(url, f'?id=eq.{event_id}'),
                      headers=sb_headers(key), json=db_row, timeout=10)
        if not r.ok: return jsonify({'error': f'Supabase {r.status_code}: {r.text}'}), 500
        rows = r.json()
        return jsonify(to_front(rows[0] if rows else db_row))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/events/<event_id>', methods=['DELETE'])
def delete_event(event_id):
    ok, url, key, msg = check_config()
    if not ok: return jsonify({'error': msg}), 503
    try:
        r = req.delete(sb_url(url, f'?id=eq.{event_id}'),
                       headers=sb_headers(key), timeout=10)
        if not r.ok: return jsonify({'error': f'Supabase {r.status_code}: {r.text}'}), 500
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ─── ICS proxy (Outlook) ───────────────────────────────────────────────────────
@app.route('/api/fetch-ics')
def fetch_ics():
    url = request.args.get('url', '').strip()
    if not url.startswith('http'):
        return jsonify({'error': 'Invalid URL'}), 400
    try:
        r = req.get(url, timeout=15,
                    headers={'User-Agent': 'Mozilla/5.0 (compatible; AI-Scheduler/1.0)'})
        if not r.ok:
            return jsonify({'error': f'ICS fetch failed: {r.status_code}'}), 500
        return r.text, 200, {'Content-Type': 'text/calendar; charset=utf-8'}
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ─── Google OAuth ──────────────────────────────────────────────────────────────
@app.route('/api/auth/google')
def auth_google():
    if not os.environ.get('GOOGLE_CLIENT_ID'):
        return jsonify({'error': 'GOOGLE_CLIENT_ID가 설정되지 않았습니다'}), 503
    flow = make_oauth_flow()
    auth_url, _ = flow.authorization_url(
        access_type='offline', prompt='consent', include_granted_scopes='true'
    )
    return jsonify({'url': auth_url})

@app.route('/api/auth/callback')
def auth_callback():
    error = request.args.get('error')
    code  = request.args.get('code')
    if error or not code:
        msg = 'google_auth_error'
    else:
        try:
            flow = make_oauth_flow()
            flow.fetch_token(code=code)
            save_gcal_creds(flow.credentials)
            msg = 'google_auth_success'
        except Exception:
            msg = 'google_auth_error'
    return (
        f'<html><body><script>'
        f'window.opener&&window.opener.postMessage("{msg}","*");'
        f'window.close();'
        f'</script></body></html>'
    )

@app.route('/api/auth/status')
def auth_status():
    raw = sb_setting_get('google_tokens')
    try: tokens = json.loads(raw) if raw else {}
    except: tokens = {}
    return jsonify({'authenticated': bool(tokens.get('refresh_token'))})

@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    sb_setting_del('google_tokens')
    return jsonify({'ok': True})

# ─── Google Calendar CRUD ──────────────────────────────────────────────────────
@app.route('/api/gcal/events', methods=['GET'])
def gcal_list():
    creds = get_gcal_creds()
    if not creds: return jsonify({'error': 'Not authenticated'}), 401
    try:
        now      = datetime.now(timezone.utc)
        time_min = (now - timedelta(days=30)).strftime('%Y-%m-%dT%H:%M:%SZ')
        time_max = (now + timedelta(days=90)).strftime('%Y-%m-%dT%H:%M:%SZ')
        r = gcal_req('get', '/calendars/primary/events', creds, params={
            'timeMin': time_min, 'timeMax': time_max,
            'singleEvents': 'true', 'orderBy': 'startTime', 'maxResults': 250,
        })
        if not r.ok: return jsonify({'error': r.text}), r.status_code
        return jsonify([gcal_to_app(ev) for ev in r.json().get('items', [])])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/gcal/events', methods=['POST'])
def gcal_create():
    creds = get_gcal_creds()
    if not creds: return jsonify({'error': 'Not authenticated'}), 401
    try:
        r = gcal_req('post', '/calendars/primary/events', creds,
                     json=app_to_gcal(request.get_json()))
        if not r.ok: return jsonify({'error': r.text}), r.status_code
        return jsonify(gcal_to_app(r.json())), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/gcal/events/<gcal_id>', methods=['PUT'])
def gcal_update(gcal_id):
    creds = get_gcal_creds()
    if not creds: return jsonify({'error': 'Not authenticated'}), 401
    try:
        r = gcal_req('put', f'/calendars/primary/events/{gcal_id}', creds,
                     json=app_to_gcal(request.get_json()))
        if not r.ok: return jsonify({'error': r.text}), r.status_code
        return jsonify(gcal_to_app(r.json()))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/gcal/events/<gcal_id>', methods=['DELETE'])
def gcal_delete(gcal_id):
    creds = get_gcal_creds()
    if not creds: return jsonify({'error': 'Not authenticated'}), 401
    try:
        r = gcal_req('delete', f'/calendars/primary/events/{gcal_id}', creds)
        if r.status_code not in (200, 204):
            return jsonify({'error': r.text}), r.status_code
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ─── iCloud Calendar CRUD ─────────────────────────────────────────────────────
@app.route('/api/icloud/status')
def icloud_status():
    if not icloud_is_configured():
        return jsonify({'configured': False, 'connected': False})
    try:
        calendar = get_icloud_calendar()
        return jsonify({
            'configured': True,
            'connected': True,
            'calendar': calendar.get_display_name(),
        })
    except Exception as e:
        return jsonify({
            'configured': True,
            'connected': False,
            'error': str(e),
        })

@app.route('/api/icloud/events', methods=['GET'])
def icloud_list():
    if not icloud_is_configured():
        return jsonify({'error': 'iCloud not configured'}), 404
    try:
        now = datetime.now(LOCAL_TZ)
        calendar = get_icloud_calendar()
        caldav_events = calendar.search(
            start=now - timedelta(days=30),
            end=now + timedelta(days=90),
            event=True,
            expand=True,
        )
        events = []
        for caldav_event in caldav_events:
            events.extend(caldav_object_to_app(caldav_event))
        return jsonify(events)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/icloud/events', methods=['POST'])
def icloud_create():
    if not icloud_is_configured():
        return jsonify({'error': 'iCloud not configured'}), 404
    try:
        data = request.get_json()
        uid = str(uuid.uuid4())
        calendar = get_icloud_calendar()
        saved = calendar.save_event(app_to_ical(data, uid=uid))
        parsed = caldav_object_to_app(saved)
        return jsonify(parsed[0] if parsed else {**data, 'id': f'icloud_{uid}',
                                                'icloudId': uid, 'source': 'icloud'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/icloud/events/<icloud_id>', methods=['PUT'])
def icloud_update(icloud_id):
    if not icloud_is_configured():
        return jsonify({'error': 'iCloud not configured'}), 404
    try:
        data = request.get_json()
        calendar = get_icloud_calendar()
        event = find_icloud_event(calendar, icloud_id)
        event.data = app_to_ical(data, uid=icloud_id)
        event.save()
        parsed = caldav_object_to_app(event)
        return jsonify(parsed[0] if parsed else {**data, 'id': f'icloud_{icloud_id}',
                                                'icloudId': icloud_id, 'source': 'icloud'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/icloud/events/<icloud_id>', methods=['DELETE'])
def icloud_delete(icloud_id):
    if not icloud_is_configured():
        return jsonify({'error': 'iCloud not configured'}), 404
    try:
        calendar = get_icloud_calendar()
        find_icloud_event(calendar, icloud_id).delete()
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
