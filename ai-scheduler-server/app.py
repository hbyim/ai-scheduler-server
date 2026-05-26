from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json, os, uuid
from datetime import datetime

app = Flask(__name__, static_folder='static')
CORS(app)

DATA_FILE = os.path.join(os.path.dirname(__file__), 'events.json')

def load_events():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_events(events):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(events, f, ensure_ascii=False, indent=2)

# Serve the frontend
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

# GET all events
@app.route('/api/events', methods=['GET'])
def get_events():
    return jsonify(load_events())

# POST create event
@app.route('/api/events', methods=['POST'])
def create_event():
    event = request.get_json()
    if not event.get('id'):
        event['id'] = str(uuid.uuid4())[:8]
    event['updatedAt'] = datetime.utcnow().isoformat()
    events = load_events()
    events.append(event)
    save_events(events)
    return jsonify(event), 201

# PUT update event
@app.route('/api/events/<event_id>', methods=['PUT'])
def update_event(event_id):
    updated = request.get_json()
    updated['id'] = event_id
    updated['updatedAt'] = datetime.utcnow().isoformat()
    events = load_events()
    idx = next((i for i, e in enumerate(events) if e['id'] == event_id), None)
    if idx is None:
        return jsonify({'error': 'Not found'}), 404
    events[idx] = updated
    save_events(events)
    return jsonify(updated)

# DELETE event
@app.route('/api/events/<event_id>', methods=['DELETE'])
def delete_event(event_id):
    events = load_events()
    events = [e for e in events if e['id'] != event_id]
    save_events(events)
    return jsonify({'ok': True})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
