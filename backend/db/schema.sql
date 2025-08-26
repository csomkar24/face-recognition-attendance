-- Create database
CREATE DATABASE face_attendance_system;
USE face_attendance_system;

-- Student Table
CREATE TABLE students (
    USN VARCHAR(20) PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    FaceData TEXT NOT NULL
);

-- Session Table
CREATE TABLE sessions (
    SessionID INT AUTO_INCREMENT PRIMARY KEY,
    SessionDate DATE NOT NULL,
    Semester VARCHAR(10) NOT NULL
);

-- Attendance Table
CREATE TABLE attendance (
    AttendanceID INT AUTO_INCREMENT PRIMARY KEY,
    SessionID INT,
    USN VARCHAR(20),
    AttendanceStatus ENUM('Present', 'Absent') NOT NULL,
    FOREIGN KEY (SessionID) REFERENCES sessions(SessionID),
    FOREIGN KEY (USN) REFERENCES students(USN)
);

select * from students;
select * from sessions;
select * from attendance;

DROP DATABASE face_attendance_system;