const express = require('express');
const router = express.Router();
const db = require('../db/dbConnect');
const queries = require('../db/queries');

// Register a new student with face data
router.post('/register', (req, res) => {
  const { usn, name, faceData } = req.body;
  
  if (!usn || !name || !faceData) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.query(queries.getStudentByUSN, [usn], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (results.length > 0) {
      return res.status(409).json({ error: 'Student with this USN already exists' });
    }
    
    db.query(queries.insertStudent, [usn, name, JSON.stringify(faceData)], (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to register student' });
      }
      
      res.status(201).json({ message: 'Student registered successfully' });
    });
  });
});

// Get all students (without face data)
router.get('/', (req, res) => {
  db.query(queries.getAllStudents, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch students' });
    }
    
    res.status(200).json(results);
  });
});

// Get student by USN (with face data for recognition)
router.get('/:usn', (req, res) => {
  const usn = req.params.usn;
  
  db.query(queries.getStudentByUSN, [usn], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch student' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const student = results[0];
    // Parse face data from JSON string to object
    student.FaceData = JSON.parse(student.FaceData);
    
    res.status(200).json(student);
  });
});

module.exports = router;