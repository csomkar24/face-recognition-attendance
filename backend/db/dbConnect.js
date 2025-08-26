const mysql = require('mysql2');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'face_attendance_system'
};

// Create connection
const connection = mysql.createConnection(dbConfig);

module.exports = connection;