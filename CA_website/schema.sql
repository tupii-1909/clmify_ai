-- Calmify AI Database Schema Setup

CREATE DATABASE IF NOT EXISTS calmify_db;
USE calmify_db;

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

CREATE TABLE IF NOT EXISTS mood_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(100) NOT NULL,
    log_date DATE NOT NULL,
    mood VARCHAR(15) NOT NULL DEFAULT 'neutral', -- 'neutral', 'relax', 'mild', 'extreme'
    sleep_duration VARCHAR(15) DEFAULT '0h 0m',
    hrv INT DEFAULT 0,
    symptoms TEXT,
    notes TEXT,
    stress_index FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY user_date_unique (user_email, log_date)
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(100) NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

