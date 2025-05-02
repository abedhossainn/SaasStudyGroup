import os
import json
import pyotp
import time
import logging
from datetime import datetime, timedelta
from firebase_admin import credentials, initialize_app, auth
from flask import Flask, request, jsonify
from flask_cors import CORS
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
# Enable CORS globally (default allows all origins, methods, headers)
CORS(app)

@app.before_request
def log_request_info():
    logger.info(f"Handling {request.method} request for {request.path}")
    if request.method == 'OPTIONS':
        logger.info("Handling preflight OPTIONS request")

# Initialize Firebase
firebase_credentials = json.loads(os.getenv("FIREBASE_CREDENTIALS"))
cred = credentials.Certificate(firebase_credentials)
initialize_app(cred)

# Initialize SendGrid
sg = SendGridAPIClient(os.getenv('SENDGRID_API_KEY'))

# Store OTPs temporarily (in production, use a proper database)
otp_storage = {}

# Home route
@app.route("/")
def home():
    return "Hello, Render!"

# Direct email/password login
@app.route("/api/auth/login", methods=["POST"])
def login():
    try:
        email = request.json.get("email")
        password = request.json.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        try:
            # Try to sign in the user
            user = auth.get_user_by_email(email)
            # Create custom token for the user
            custom_token = auth.create_custom_token(user.uid)
            return jsonify({
                "success": True,
                "token": custom_token.decode(),
                "uid": user.uid
            }), 200
        except auth.UserNotFoundError:
            return jsonify({"error": "User not found"}), 404
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Generate and send OTP
@app.route("/api/auth/request-otp", methods=["POST", "OPTIONS"])
def request_otp():
    try:
        email = request.json.get("email")
        if not email:
            return jsonify({"error": "Email is required"}), 400

        # Generate OTP
        totp = pyotp.TOTP(pyotp.random_base32())
        otp = totp.now()
        
        # Store OTP with expiration (5 minutes)
        otp_storage[email] = {
            "otp": otp,
            "expires": datetime.now() + timedelta(minutes=5)
        }

        # Send email using SendGrid
        message = Mail(
            from_email=os.getenv('SENDER_EMAIL'),
            to_emails=email,
            subject='Your OTP for Study Group App',
            html_content=f'<strong>Your OTP is: {otp}</strong><br>This code will expire in 5 minutes.'
        )
        
        sg.send(message)

        return jsonify({
            "success": True,
            "message": "OTP sent successfully"
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Verify OTP
@app.route("/api/auth/verify-otp", methods=["POST", "OPTIONS"])
def verify_otp():
    try:
        email = request.json.get("email")
        otp = request.json.get("otp")
        password = request.json.get("password")

        if not email or not otp:
            return jsonify({"error": "Email and OTP are required"}), 400

        stored_otp = otp_storage.get(email)
        
        if not stored_otp:
            return jsonify({"error": "OTP not found or expired"}), 400

        if datetime.now() > stored_otp["expires"]:
            del otp_storage[email]
            return jsonify({"error": "OTP expired"}), 400

        if stored_otp["otp"] != otp:
            return jsonify({"error": "Invalid OTP"}), 400

        # Clear the OTP
        del otp_storage[email]

        try:
            # Try to get the user
            user = auth.get_user_by_email(email)
            # If user exists, create custom token
            custom_token = auth.create_custom_token(user.uid)
            return jsonify({
                "success": True,
                "token": custom_token.decode(),
                "userExists": True,
                "uid": user.uid
            }), 200
        except auth.UserNotFoundError:
            # If user doesn't exist, create a new user with password
            if not password:
                return jsonify({"error": "Password is required for new users"}), 400
                
            user = auth.create_user(
                email=email,
                password=password
            )
            # Create custom token for the new user
            custom_token = auth.create_custom_token(user.uid)
            return jsonify({
                "success": True,
                "token": custom_token.decode(),
                "userExists": False,
                "uid": user.uid
            }), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Verify token route
@app.route("/verify-token", methods=["POST"])
def verify_token():
    token = request.json.get("token")
    try:
        decoded_token = auth.verify_id_token(token)
        return jsonify({"uid": decoded_token["uid"]}), 200
    except:
        return jsonify({"error": "Invalid token"}), 401

# Run the app
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)