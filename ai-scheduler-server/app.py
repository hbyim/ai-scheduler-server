import os, uuid
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import requests as req

app = Flask(__name__, static_folder='static')
CORS(app)

SUPABASE_URL = os.environ.get('SUPABASE_URL', '').rstrip('/')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')
TABLE = 'events'

def sb_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
    }

def sb_url(suffix=''):
    return f'{SUPABASE_URL}/rest/v1/{TABLE}{suffix}'

def check_config():
    if not SUPABASE_URL or not SUPABASE_KEY:
        return False, 'SUPABASE_URL 또는 SUPABASE_KEY 환경변수가 설정되지 않았습니다. Render.com > Environment 탭에서 추가해주세요.'
    return True, 'ok'

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

# 설정 상태 확인용 엔드포인트
@app.route('/api/health')
def health():
    ok, msg = check_config()
    if not ok:
        return jsonify({'status': 'error', 'message': msg}), 503
    try:
        r = req.get(sb_url(), headers=sb_headers(), params={'limit': '1'}, timeout=5)
        if r.ok:
            return jsonify({'status': 'ok', 'supabase': 'connected'})
        return jsonify({'status': 'error', 'message': f'Supabase 응답 오류: {r.status_code} {r.text}'}), 503
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Supabase 연결 실패: {str(e)}'}), 503

@app.route('/api/events', methods=['GET'])
def get_events():
    ok, msg = check_config()
    if not ok:
        return jsonify({'error': msg}), 503
    try:
        r = req.get(sb_url(), headers=sb_headers(), params={'order': 'date.asc,time.asc'}, timeout=10)
        if not r.ok:
            return jsonify({'error': f'Supabase 오류: {r.status_code} - {r.text}'}), 500
        return jsonify([to_front(e) for e in r.json()])
    except Exception as e:
        return jsonify({'error': f'연결 실패: {str(e)}'}), 500

@app.route('/api/events', methods=['POST'])
def create_event():
    ok, msg = check_config()
    if not ok:
        return jsonify({'error': msg}), 503
    try:
        data = request.get_json()
        if not data.get('id'):
            data['id'] = str(uuid.uuid4())[:8]
        r = req.post(sb_url(), headers=sb_headers(), json=to_db(data), timeout=10)
        if not r.ok:
            return jsonify({'error': f'Supabase 오류: {r.status_code} - {r.text}'}), 500
        rows = r.json()
        return jsonify(to_front(rows[0] if rows else data)), 201
    except Exception as e:
        return jsonify({'error': f'연결 실패: {str(e)}'}), 500

@app.route('/api/events/<event_id>', methods=['PUT'])
def update_event(event_id):
    ok, msg = check_config()
    if not ok:
        return jsonify({'error': msg}), 503
    try:
        data = request.get_json()
        data['id'] = event_id
        r = req.patch(sb_url(f'?id=eq.{event_id}'), headers=sb_headers(), json=to_db(data), timeout=10)
        if not r.ok:
            return jsonify({'error': f'Supabase 오류: {r.status_code} - {r.text}'}), 500
        rows = r.json()
        return jsonify(to_front(rows[0] if rows else data))
    except Exception as e:
        return jsonify({'error': f'연결 실패: {str(e)}'}), 500

@app.route('/api/events/<event_id>', methods=['DELETE'])
def delete_event(event_id):
    ok, msg = check_config()
    if not ok:
        return jsonify({'error': msg}), 503
    try:
        r = req.delete(sb_url(f'?id=eq.{event_id}'), headers=sb_headers(), timeout=10)
        if not r.ok:
            return jsonify({'error': f'Supabase 오류: {r.status_code} - {r.text}'}), 500
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'error': f'연결 실패: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
