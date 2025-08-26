// Constants for DOM elements and API endpoints
const DOM = {
    generateReportBtn: 'generateReport',
    exportReportBtn: 'exportReport',
    exportPdfBtn: 'exportPdf',
    reportDate: 'reportDate',
    reportSemester: 'reportSemester',
    reportTotal: 'report-total',
    reportPresent: 'report-present',
    reportAbsent: 'report-absent',
    reportRate: 'report-rate',
    reportData: 'report-data',
    reportTable: 'report-table'
};

const API_ENDPOINTS = {
    sessionsByDate: (date) => `/api/attendance/sessions/by-date/${date}`,
    sessionAttendance: (sessionId) => `/api/attendance/sessions/${sessionId}`,
    sessionSummary: (sessionId) => `/api/attendance/summary/${sessionId}`
};

// Initialize reports functionality
function initReports() {
    try {
        // Get DOM elements
        const generateReportBtn = document.getElementById(DOM.generateReportBtn);
        const exportReportBtn = document.getElementById(DOM.exportReportBtn);
        const exportPdfBtn = document.getElementById(DOM.exportPdfBtn);
        
        if (!generateReportBtn || !exportReportBtn || !exportPdfBtn) {
            throw new Error('Required DOM elements not found');
        }
        
        // Add event listeners
        generateReportBtn.addEventListener('click', generateAttendanceReport);
        exportReportBtn.addEventListener('click', exportReportToCSV);
        exportPdfBtn.addEventListener('click', exportReportToPDF);
        
        // Set default date to today
        const dateInput = document.getElementById(DOM.reportDate);
        if (dateInput) {
            dateInput.valueAsDate = new Date();
        }
        
        console.log('Reports system initialized successfully');
    } catch (error) {
        console.error('Failed to initialize reports system:', error);
        alert('Failed to initialize reports system. Please refresh the page.');
    }
}

// Validate input parameters
function validateInputs(date, semester) {
    if (!date) {
        throw new Error('Please select a date.');
    }
    
    if (semester !== 'all' && (isNaN(parseInt(semester)) || parseInt(semester) < 1 || parseInt(semester) > 8)) {
        throw new Error('Invalid semester selected.');
    }
    
    return true;
}

// Fetch data from API with error handling
async function fetchData(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

// Generate attendance report based on selected filters
async function generateAttendanceReport() {
    try {
        const semester = document.getElementById(DOM.reportSemester).value;
        const date = document.getElementById(DOM.reportDate).value;
        
        validateInputs(date, semester);
        
        // Get sessions for the selected date
        const sessions = await fetchData(API_ENDPOINTS.sessionsByDate(date));
        
        if (!sessions || sessions.length === 0) {
            throw new Error('No attendance sessions found for the selected date.');
        }
        
        // Filter sessions by semester if specified
        const filteredSessions = semester !== 'all' 
            ? sessions.filter(session => parseInt(session.Semester) === parseInt(semester))
            : sessions;
            
        if (filteredSessions.length === 0) {
            throw new Error(`No attendance sessions found for Semester ${semester} on ${date}. Please ensure you have taken attendance for this semester and date.`);
        }
        
        // Use the first matching session
        const sessionId = filteredSessions[0].SessionID;
        
        // Fetch attendance data and summary in parallel
        const [attendanceData, summary] = await Promise.all([
            fetchData(API_ENDPOINTS.sessionAttendance(sessionId)),
            fetchData(API_ENDPOINTS.sessionSummary(sessionId))
        ]);
        
        // Update the report UI
        updateReportUI(attendanceData, summary, filteredSessions[0]);
    } catch (error) {
        console.error('Error generating report:', error);
        alert(error.message || 'Failed to generate report. Please try again.');
        clearReportData();
    }
}

// Update the report UI with the fetched data
function updateReportUI(attendanceData, summary, session) {
    try {
        // Update summary information
        const summaryElements = {
            total: document.getElementById(DOM.reportTotal),
            present: document.getElementById(DOM.reportPresent),
            absent: document.getElementById(DOM.reportAbsent),
            rate: document.getElementById(DOM.reportRate)
        };
        
        // Validate DOM elements
        Object.entries(summaryElements).forEach(([key, element]) => {
            if (!element) throw new Error(`Summary element '${key}' not found`);
        });
        
        // Calculate absent count if not provided in summary
        const presentCount = summary.present_count || 0;
        const totalCount = summary.total_students || 0;
        const absentCount = totalCount - presentCount;
        
        // Update summary values
        summaryElements.total.textContent = totalCount;
        summaryElements.present.textContent = presentCount;
        summaryElements.absent.textContent = absentCount;
        
        // Calculate and update attendance rate
        const attendanceRate = totalCount > 0 
            ? ((presentCount / totalCount) * 100).toFixed(1) 
            : '0.0';
        summaryElements.rate.textContent = `${attendanceRate}%`;
        
        // Update table data
        const tableBody = document.getElementById(DOM.reportData);
        if (!tableBody) throw new Error('Report table body not found');
        
        tableBody.innerHTML = '';
        
        // Sort attendance data: present students first, then absent
        const sortedAttendanceData = [...attendanceData].sort((a, b) => {
            if (a.AttendanceStatus === 'Present' && b.AttendanceStatus !== 'Present') return -1;
            if (a.AttendanceStatus !== 'Present' && b.AttendanceStatus === 'Present') return 1;
            return a.USN.localeCompare(b.USN);
        });
        
        sortedAttendanceData.forEach(student => {
            const row = document.createElement('tr');
            const cells = [
                { text: student.USN },
                { text: student.Name },
                { 
                    text: student.AttendanceStatus || 'Absent',
                    className: student.AttendanceStatus === 'Present' ? 'present' : 'absent'
                }
            ];
            
            cells.forEach(cell => {
                const td = document.createElement('td');
                td.textContent = cell.text;
                if (cell.className) td.className = cell.className;
                row.appendChild(td);
            });
            
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error updating report UI:', error);
        throw new Error('Failed to update report display');
    }
}

// Export the current report to CSV
function exportReportToCSV() {
    try {
        const table = document.getElementById(DOM.reportTable);
        if (!table || table.rows.length <= 1) {
            throw new Error('No data to export.');
        }
        
        // Get the date and semester from the report filter
        const date = document.getElementById(DOM.reportDate).value;
        const semester = document.getElementById(DOM.reportSemester).value;
        
        // Create CSV content
        const headers = ['USN', 'Name', 'Status'];
        let csv = headers.join(',') + '\n';
        
        // Skip header row (index 0)
        for (let i = 1; i < table.rows.length; i++) {
            const row = table.rows[i];
            const rowData = Array.from(row.cells).map(cell => `"${cell.textContent}"`);
            csv += rowData.join(',') + '\n';
        }
        
        // Create and trigger download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_report_${semester !== 'all' ? 'sem_' + semester + '_' : ''}${date}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting report:', error);
        alert(error.message || 'Failed to export report. Please try again.');
    }
}

// Export the current report to PDF
function exportReportToPDF() {
    try {
        const table = document.getElementById(DOM.reportTable);
        if (!table || table.rows.length <= 1) {
            throw new Error('No data to export.');
        }

        // Get report details
        const date = document.getElementById(DOM.reportDate).value;
        const semester = document.getElementById(DOM.reportSemester).value;
        const semesterText = semester !== 'all' ? `Semester ${semester}` : 'All Semesters';
        
        // Create PDF document in portrait mode
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // Calculate consistent widths and margins
        const pageWidth = doc.internal.pageSize.width;
        const margin = 15;
        const contentWidth = pageWidth - (2 * margin);
        
        // Add header with logo placeholder
        doc.setFillColor(41, 128, 185);
        doc.rect(0, 0, pageWidth, 35, 'F');
        
        // Add title with white color
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('Attendance Report', pageWidth / 2, 22, { align: 'center' });
        
        // Reset text color for rest of the content
        doc.setTextColor(0, 0, 0);
        
        // Add report details in a styled box with rounded corners
        doc.setDrawColor(41, 128, 185);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, 45, contentWidth, 30, 3, 3);
        
        // Add report details with better formatting
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const reportDate = new Date(date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        const generatedTime = new Date().toLocaleString();
        
        doc.text([
            `Date: ${reportDate}`,
            `Semester: ${semesterText}`,
            `Generated: ${generatedTime}`
        ], margin + 10, 55);
        
        // Add summary information in a styled box with rounded corners
        doc.roundedRect(margin, 85, contentWidth, 35, 3, 3);
        
        const total = document.getElementById(DOM.reportTotal).textContent;
        const present = document.getElementById(DOM.reportPresent).textContent;
        const absent = document.getElementById(DOM.reportAbsent).textContent;
        const rate = document.getElementById(DOM.reportRate).textContent;
        
        // Add summary with better formatting
        doc.setFont('helvetica', 'bold');
        doc.text('Summary', margin + 10, 95);
        doc.setFont('helvetica', 'normal');
        
        // Calculate positions for summary items
        const summaryItems = [
            `Total Students: ${total}`,
            `Present: ${present}`,
            `Absent: ${absent}`,
            `Attendance Rate: ${rate}`
        ];
        
        // Position summary items in two columns
        const col1X = margin + 10;
        const col2X = pageWidth / 2 + 5;
        summaryItems.forEach((item, index) => {
            const x = index < 2 ? col1X : col2X;
            const y = 105 + (index % 2) * 10;
            doc.text(item, x, y);
        });
        
        // Prepare table data
        const tableData = [];
        for (let i = 1; i < table.rows.length; i++) {
            const row = table.rows[i];
            tableData.push([
                row.cells[0].textContent, // USN
                row.cells[1].textContent, // Name
                row.cells[2].textContent  // Status
            ]);
        }
        
        // Calculate column widths based on content width
        const usnWidth = 40;
        const statusWidth = 40;
        const nameWidth = contentWidth - usnWidth - statusWidth - 10; // 10 for spacing
        
        // Add table with improved styling and optimized dimensions
        doc.autoTable({
            startY: 130,
            head: [['USN', 'Name', 'Status']],
            body: tableData,
            theme: 'grid',
            headStyles: { 
                fillColor: [41, 128, 185],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center',
                fontSize: 12,
                cellPadding: 6
            },
            styles: { 
                fontSize: 11,
                cellPadding: 5,
                lineColor: [41, 128, 185],
                lineWidth: 0.1,
                overflow: 'linebreak',
                cellWidth: 'wrap'
            },
            columnStyles: {
                0: { 
                    cellWidth: usnWidth,
                    halign: 'center'
                },
                1: { 
                    cellWidth: nameWidth,
                    halign: 'left'
                },
                2: { 
                    cellWidth: statusWidth,
                    halign: 'center'
                }
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            margin: { 
                top: 20,
                left: margin,
                right: margin
            },
            didDrawPage: function(data) {
                // Add footer with page numbers and copyright
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text(
                    [
                        `Page ${data.pageCount} of ${data.pageNumber}`,
                        'Face Recognition Attendance System',
                        `Generated on ${generatedTime}`
                    ],
                    pageWidth / 2,
                    doc.internal.pageSize.height - 10,
                    { align: 'center' }
                );
            }
        });
        
        // Save the PDF with a more descriptive filename
        const formattedDate = date.replace(/-/g, '');
        doc.save(`attendance_report_${semester !== 'all' ? 'sem_' + semester + '_' : ''}${formattedDate}.pdf`);
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        alert(error.message || 'Failed to export to PDF. Please try again.');
    }
}

// Clear report data
function clearReportData() {
    try {
        const elements = {
            total: document.getElementById(DOM.reportTotal),
            present: document.getElementById(DOM.reportPresent),
            absent: document.getElementById(DOM.reportAbsent),
            rate: document.getElementById(DOM.reportRate),
            data: document.getElementById(DOM.reportData)
        };
        
        // Clear all elements
        Object.entries(elements).forEach(([key, element]) => {
            if (element) {
                if (key === 'data') {
                    element.innerHTML = '';
                } else {
                    element.textContent = key === 'rate' ? '0%' : '0';
                }
            }
        });
    } catch (error) {
        console.error('Error clearing report data:', error);
    }
}

// Export functions for use in other scripts
window.reports = {
    initReports
};