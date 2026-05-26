import os, uuid
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import requests as req

app = Flask(__name__, static_folder='static')
CORS(app)

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
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

@app.route('/api/events', methods=['GET'])
def get_events():
    r = req.get(sb_url(), headers=sb_headers(), params={'order': 'date.asc,time.asc'})
    if not r.ok:
        return jsonify({'error': r.text}), 500
    return jsonify([to_front(e) for e in r.json()])

@app.route('/api/events', methods=['POST'])
def create_event():
    data = request.get_json()
    if not data.get('id'):
        data['id'] = str(uuid.uuid4())[:8]
    r = req.post(sb_url(), headers=sb_headers(), json=to_db(data))
    if not r.ok:
        return jsonify({'error': r.text}), 500
    rows = r.json()
    return jsonify(to_front(rows[0] if rows else data)), 201

@app.route('/api/events/<event_id>', methods=['PUT'])
def update_event(event_id):
    data = request.get_json()
    data['id'] = event_id
    r = req.patch(sb_url(f'?id=eq.{event_id}'), headers=sb_headers(), json=to_db(data))
    if not r.ok:
        return jsonify({'error': r.text}), 500
    rows = r.json()
    return jsonify(to_front(rows[0] if rows else data))

@app.route('/api/events/<event_id>', methods=['DELETE'])
def delete_event(event_id):
    r = req.delete(sb_url(f'?id=eq.{event_id}'), headers=sb_headers())
    if not r.ok:
        return jsonify({'error': r.text}), 500
    return jsonify({'ok': True})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
