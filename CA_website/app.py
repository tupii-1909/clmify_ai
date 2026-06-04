import os
import hashlib
from flask import Flask, request, jsonify
from flask_cors import CORS
import pymysql
import pymysql.cursors

app = Flask(__name__)
# Enable CORS for frontend integration
CORS(app)

# Database configuration (defaults to localhost, user: root, no password, DB: calmify_db)
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_USER = os.environ.get('DB_USER', 'root')
DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
DB_NAME = os.environ.get('DB_NAME', 'calmify_db')

def get_db_connection(include_db=True):
    """Establish connection to MySQL."""
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME if include_db else None,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True
    )

def init_db():
    """Initializes the database and tables if they don't exist, and performs migrations."""
    connection = None
    try:
        # First connect without database to create it
        connection = get_db_connection(include_db=False)
        with connection.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
        connection.close()

        # Connect with database to create tables
        connection = get_db_connection(include_db=True)
        with connection.cursor() as cursor:
            # 1. Create users table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    full_name VARCHAR(100) NOT NULL,
                    age INT,
                    profession VARCHAR(100),
                    contact_number VARCHAR(20),
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # 2. Create mood_logs table (if not exists)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS mood_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_email VARCHAR(100) NOT NULL,
                    log_date DATE NOT NULL,
                    mood VARCHAR(15) NOT NULL DEFAULT 'neutral',
                    sleep_duration VARCHAR(15) DEFAULT '0h 0m',
                    hrv INT DEFAULT 0,
                    symptoms TEXT,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY user_date_unique (user_email, log_date)
                );
            """)

            # 3. Migration check: Check if user_email column exists in mood_logs
            cursor.execute("SHOW COLUMNS FROM mood_logs LIKE 'user_email'")
            if not cursor.fetchone():
                print("Migrating mood_logs table: adding user_email column...")
                # Add column
                cursor.execute("ALTER TABLE mood_logs ADD COLUMN user_email VARCHAR(100) NOT NULL DEFAULT 'evelyn@serenity.com'")
                
                # Drop original log_date index (if it is a UNIQUE index)
                try:
                    cursor.execute("SHOW INDEX FROM mood_logs WHERE Column_name = 'log_date' AND Non_unique = 0")
                    idx = cursor.fetchone()
                    if idx:
                        idx_name = idx['Key_name']
                        cursor.execute(f"ALTER TABLE mood_logs DROP INDEX {idx_name}")
                except Exception as ex:
                    print(f"Migration notice: Couldn't drop old unique index on log_date: {ex}")
                
                # Add new composite unique key
                try:
                    cursor.execute("ALTER TABLE mood_logs ADD UNIQUE KEY user_date_unique (user_email, log_date)")
                except Exception as ex:
                    print(f"Migration notice: Couldn't add user_date_unique key: {ex}")
            
            # Migration check: Check if stress_index column exists in mood_logs
            cursor.execute("SHOW COLUMNS FROM mood_logs LIKE 'stress_index'")
            if not cursor.fetchone():
                print("Migrating mood_logs table: adding stress_index column...")
                cursor.execute("ALTER TABLE mood_logs ADD COLUMN stress_index FLOAT DEFAULT 0.0")
            
            # 4. Create emergency_contacts table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS emergency_contacts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_email VARCHAR(100) NOT NULL,
                    contact_name VARCHAR(100) NOT NULL,
                    contact_number VARCHAR(20) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
                
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Warning: Database initialization failed: {e}")
        print("Please ensure your MySQL service is running and credentials in app.py are correct.")
    finally:
        if connection:
            connection.close()

# Initialize DB on start
init_db()

def hash_password(password):
    """SHA-256 hash helper."""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

@app.route('/api/status', methods=['GET'])
def status():
    """Check API and DB connection status."""
    try:
        conn = get_db_connection()
        conn.close()
        return jsonify({"status": "online", "database": "connected"}), 200
    except Exception as e:
        return jsonify({"status": "online", "database": f"disconnected ({str(e)})"}), 200

# --- USER ENDPOINTS ---

@app.route('/api/users/register', methods=['POST'])
def register():
    """Register a new user profile."""
    data = request.json
    if not data or 'email' not in data or 'password' not in data or 'full_name' not in data:
        return jsonify({"error": "Missing required fields"}), 400
    
    email = data['email'].strip().lower()
    password = data['password']
    full_name = data['full_name'].strip()
    age = data.get('age')
    profession = data.get('profession', '').strip()
    contact_number = data.get('contact_number', '').strip()
    
    if not email or not password or not full_name:
        return jsonify({"error": "Fields email, password, and full name cannot be empty"}), 400

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Check if user already exists
            cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cursor.fetchone():
                return jsonify({"error": "Email address already registered"}), 400
            
            # Hash password
            password_hash = hash_password(password)
            
            # Insert user
            query = """
                INSERT INTO users (email, full_name, age, profession, contact_number, password_hash)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            cursor.execute(query, (email, full_name, age, profession, contact_number, password_hash))
            
            # Return user details
            cursor.execute("SELECT id, email, full_name, age, profession, contact_number FROM users WHERE email = %s", (email,))
            user = cursor.fetchone()
            return jsonify({"success": True, "user": user}), 201
            
    except Exception as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/users/login', methods=['POST'])
def login():
    """Authenticate an existing user."""
    data = request.json
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({"error": "Missing email or password"}), 400
    
    email = data['email'].strip().lower()
    password = data['password']
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            user = cursor.fetchone()
            if not user or user['password_hash'] != hash_password(password):
                return jsonify({"error": "Invalid email address or password"}), 401
            
            # Remove password hash from response
            del user['password_hash']
            return jsonify({"success": True, "user": user}), 200
            
    except Exception as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()

# --- MOOD LOGS ENDPOINTS ---

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Retrieve all logs for the current user, or filter by month (format: YYYY-MM)."""
    user_email = request.headers.get('X-User-Email') or request.args.get('email') or 'evelyn@serenity.com'
    month = request.args.get('month') # E.g., '2024-10'
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if month:
                query = "SELECT * FROM mood_logs WHERE user_email = %s AND DATE_FORMAT(log_date, '%Y-%m') = %s"
                cursor.execute(query, (user_email, month))
            else:
                query = "SELECT * FROM mood_logs WHERE user_email = %s"
                cursor.execute(query, (user_email,))
            
            result = cursor.fetchall()
            # Convert date objects to string for JSON serialization
            for row in result:
                row['log_date'] = row['log_date'].strftime('%Y-%m-%d')
            return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/logs/<date_str>', methods=['GET'])
def get_log_by_date(date_str):
    """Retrieve log for a specific date (YYYY-MM-DD) and user."""
    user_email = request.headers.get('X-User-Email') or request.args.get('email') or 'evelyn@serenity.com'
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM mood_logs WHERE user_email = %s AND log_date = %s", (user_email, date_str))
            row = cursor.fetchone()
            if row:
                row['log_date'] = row['log_date'].strftime('%Y-%m-%d')
                return jsonify(row), 200
            else:
                return jsonify({"log_date": date_str, "mood": "neutral", "sleep_duration": "0h 0m", "hrv": 0, "symptoms": "", "notes": "", "stress_index": 0.0}), 200
    except Exception as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/logs', methods=['POST'])
def save_log():
    """Save or update a log for a specific date and user."""
    data = request.json
    if not data or 'log_date' not in data:
        return jsonify({"error": "Missing log_date in request body"}), 400
    
    user_email = data.get('user_email') or request.headers.get('X-User-Email') or 'evelyn@serenity.com'
    log_date = data['log_date']
    mood = data.get('mood', 'neutral')
    sleep_duration = data.get('sleep_duration', '0h 0m')
    hrv = data.get('hrv', 0)
    symptoms = data.get('symptoms', '')
    notes = data.get('notes', '')
    stress_index = data.get('stress_index', 0.0)

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Check if record already exists for this user and date
            cursor.execute("SELECT id FROM mood_logs WHERE user_email = %s AND log_date = %s", (user_email, log_date))
            exists = cursor.fetchone()

            if exists:
                # Update existing log
                query = """
                    UPDATE mood_logs 
                    SET mood = %s, sleep_duration = %s, hrv = %s, symptoms = %s, notes = %s, stress_index = %s 
                    WHERE user_email = %s AND log_date = %s
                """
                cursor.execute(query, (mood, sleep_duration, hrv, symptoms, notes, stress_index, user_email, log_date))
            else:
                # Insert new log
                query = """
                    INSERT INTO mood_logs (user_email, log_date, mood, sleep_duration, hrv, symptoms, notes, stress_index) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(query, (user_email, log_date, mood, sleep_duration, hrv, symptoms, notes, stress_index))
            
            return jsonify({"success": True, "message": "Log saved successfully"}), 200
    except Exception as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()

# --- EMERGENCY CONTACT ENDPOINTS ---

@app.route('/api/emergency-contacts', methods=['GET'])
def get_emergency_contacts():
    """Retrieve all emergency contacts for the current user."""
    user_email = request.headers.get('X-User-Email') or request.args.get('email') or 'evelyn@serenity.com'
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            query = "SELECT * FROM emergency_contacts WHERE user_email = %s ORDER BY id DESC"
            cursor.execute(query, (user_email,))
            result = cursor.fetchall()
            for row in result:
                if 'created_at' in row and row['created_at']:
                    row['created_at'] = row['created_at'].strftime('%Y-%m-%d %H:%M:%S')
            return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/emergency-contacts', methods=['POST'])
def add_emergency_contact():
    """Add a new emergency contact."""
    data = request.json
    if not data or 'contact_name' not in data or 'contact_number' not in data:
        return jsonify({"error": "Missing contact_name or contact_number"}), 400
    
    user_email = data.get('user_email') or request.headers.get('X-User-Email') or 'evelyn@serenity.com'
    contact_name = data['contact_name'].strip()
    contact_number = data['contact_number'].strip()

    if not contact_name or not contact_number:
        return jsonify({"error": "Name and phone number cannot be empty"}), 400

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            query = """
                INSERT INTO emergency_contacts (user_email, contact_name, contact_number)
                VALUES (%s, %s, %s)
            """
            cursor.execute(query, (user_email, contact_name, contact_number))
            
            new_id = cursor.lastrowid
            cursor.execute("SELECT * FROM emergency_contacts WHERE id = %s", (new_id,))
            contact = cursor.fetchone()
            if contact and 'created_at' in contact and contact['created_at']:
                contact['created_at'] = contact['created_at'].strftime('%Y-%m-%d %H:%M:%S')
            return jsonify({"success": True, "contact": contact}), 201
    except Exception as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/emergency-contacts/<int:contact_id>', methods=['DELETE'])
def delete_emergency_contact(contact_id):
    """Delete an emergency contact."""
    user_email = request.headers.get('X-User-Email') or request.args.get('email') or 'evelyn@serenity.com'
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM emergency_contacts WHERE id = %s AND user_email = %s", (contact_id, user_email))
            if not cursor.fetchone():
                return jsonify({"error": "Contact not found or access denied"}), 404
            
            cursor.execute("DELETE FROM emergency_contacts WHERE id = %s", (contact_id,))
            return jsonify({"success": True, "message": "Emergency contact deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    # Run the Flask app on localhost, port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
