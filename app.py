from flask import Flask

app = Flask(__name__)

@app.route("/")
def home():
    return "Hello, Render!"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

import firebase_admin
from firebase_admin import credentials, auth

cred = credentials.Certificate("/workspaces/SaasStudyGroup/studygroupcollab-firebase-adminsdk-fbsvc-425d537b10.json")
firebase_admin.initialize_app(cred)

@app.route("/verify-token", methods=["POST"])
def verify_token():
    token = request.json.get("token")
    try:
        decoded_token = auth.verify_id_token(token)
        return jsonify({"uid": decoded_token["uid"]}), 200
    except:
        return jsonify({"error": "Invalid token"}), 401
