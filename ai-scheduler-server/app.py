import os, uuid
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import requests as req

app = Flask(__name__, static_folder='static')
CORS(app)

TABLE = 'events'

def get_config():
    # 환경변수를 매 요청 시 읽어 재배포 없이도 최신값 반영
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

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

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

@app.route('/api/events', methods=['GET'])
def get_events():
    ok, url, key, msg = check_config()
    if not ok:
        return jsonify({'error': msg}), 503
    try:
        r = req.get(sb_url(url), headers=sb_headers(key),
                    params={'order': 'date.asc,time.asc'}, timeout=10)
        if not r.ok:
            return jsonify({'error': f'Supabase {r.status_code}: {r.text}'}), 500
        return jsonify([to_front(e) for e in r.json()])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/events', methods=['POST'])
def create_event():
    ok, url, key, msg = check_config()
    if not ok:
        return jsonify({'error': msg}), 503
    try:
        data = request.get_json()
        if not data.get('id'):
            data['id'] = str(uuid.uuid4())[:8]
        db_row = to_db(data)
        r = req.post(sb_url(url), headers=sb_headers(key), json=db_row, timeout=10)
        if not r.ok:
            return jsonify({'error': f'Supabase {r.status_code}: {r.text}'}), 500
        rows = r.json()
        return jsonify(to_front(rows[0] if rows else db_row)), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/events/<event_id>', methods=['PUT'])
def update_event(event_id):
    ok, url, key, msg = check_config()
    if not ok:
        return jsonify({'error': msg}), 503
    try:
        data = request.get_json()
        data['id'] = event_id
        db_row = to_db(data)
        r = req.patch(sb_url(url, f'?id=eq.{event_id}'),
                      headers=sb_headers(key), json=db_row, timeout=10)
        if not r.ok:
            return jsonify({'error': f'Supabase {r.status_code}: {r.text}'}), 500
        rows = r.json()
        return jsonify(to_front(rows[0] if rows else db_row))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/events/<event_id>', methods=['DELETE'])
def delete_event(event_id):
    ok, url, key, msg = check_config()
    if not ok:
        return jsonify({'error': msg}), 503
    try:
        r = req.delete(sb_url(url, f'?id=eq.{event_id}'),
                       headers=sb_headers(key), timeout=10)
        if not r.ok:
            return jsonify({'error': f'Supabase {r.status_code}: {r.text}'}), 500
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
