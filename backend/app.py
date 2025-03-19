from flask import Flask

app = Flask(__name__)

@app.route("/")
def home():
    return "Hello, Render!"

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))  # Use Render's assigned port
    app.run(host="0.0.0.0", port=port)

import os
import json
from firebase_admin import credentials, initialize_app

firebase_credentials = json.loads(os.getenv("FIREBASE_CREDENTIALS"))
cred = credentials.Certificate(firebase_credentials)
initialize_app(cred)

@app.route("/verify-token", methods=["POST"])
def verify_token():
    token = request.json.get("token")
    try:
        decoded_token = auth.verify_id_token(token)
        return jsonify({"uid": decoded_token["uid"]}), 200
    except:
        return jsonify({"error": "Invalid token"}), 401
