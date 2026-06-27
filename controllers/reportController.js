const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Machine = require('../models/Machine');
const SensorData = require('../models/SensorData');
const Alert = require('../models/Alert');
const DailyProduction = require('../models/DailyProduction');

// Helper: Aggregate report metrics for machines in a time range
const getReportMetrics = async (startDate, endDate, machineId) => {
  let sensorQuery = { timestamp: { $gte: startDate, $lte: endDate } };
  let alertQuery = { timestamp: { $gte: startDate, $lte: endDate } };
  let prodQuery = {};

  if (machineId) {
    sensorQuery.machineId = machineId;
    alertQuery.machineId = machineId;
  }

  // Get active machines
  const machines = machineId ? await Machine.find({ machineId }) : await Machine.find({});
  
  // Aggregate sensor telemetry
  const telemetryStats = await SensorData.aggregate([
    { $match: sensorQuery },
    {
      $group: {
        _id: '$machineId',
        avgTemp: { $avg: '$temperature' },
        avgVibration: { $avg: '$vibration' },
        avgRpm: { $avg: '$rpm' },
        avgPower: { $avg: '$powerConsumption' },
        maxTemp: { $max: '$temperature' },
        maxVibration: { $max: '$vibration' },
        totalProduction: { $max: '$productionCount' } // Assuming productionCount is cumulative
      }
    }
  ]);

  // Aggregate alerts
  const alertStats = await Alert.aggregate([
    { $match: alertQuery },
    {
      $group: {
        _id: '$machineId',
        redAlerts: { $sum: { $cond: [{ $eq: ['$severity', 'Red'] }, 1, 0] } },
        yellowAlerts: { $sum: { $cond: [{ $eq: ['$severity', 'Yellow'] }, 1, 0] } },
        totalAlerts: { $sum: 1 }
      }
    }
  ]);

  // Map into single structure
  const reportData = machines.map(m => {
    const tStat = telemetryStats.find(t => t._id === m.machineId) || {
      avgTemp: 45,
      avgVibration: 2.1,
      avgRpm: 1200,
      avgPower: 12.5,
      maxTemp: 45,
      maxVibration: 2.1,
      totalProduction: 0
    };

    const aStat = alertStats.find(a => a._id === m.machineId) || {
      redAlerts: 0,
      yellowAlerts: 0,
      totalAlerts: 0
    };

    return {
      machineId: m.machineId,
      name: m.name,
      department: m.department,
      status: m.status,
      avgTemp: parseFloat(tStat.avgTemp.toFixed(1)),
      avgVibration: parseFloat(tStat.avgVibration.toFixed(2)),
      avgRpm: Math.round(tStat.avgRpm),
      avgPower: parseFloat(tStat.avgPower.toFixed(2)),
      maxTemp: parseFloat(tStat.maxTemp.toFixed(1)),
      maxVibration: parseFloat(tStat.maxVibration.toFixed(2)),
      totalProduction: tStat.totalProduction || 0,
      redAlerts: aStat.redAlerts,
      yellowAlerts: aStat.yellowAlerts,
      totalAlerts: aStat.totalAlerts
    };
  });

  return reportData;
};

// Helper: Get Date boundaries from filter (today, weekly, monthly, yearly)
const getDateRange = (filter) => {
  const now = new Date();
  let startDate = new Date();

  switch (filter) {
    case 'weekly':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'yearly':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case 'today':
    default:
      startDate.setHours(0, 0, 0, 0);
      break;
  }

  return { startDate, endDate: now };
};

// @desc    Get report stats summary
// @route   GET /api/reports/summary
// @access  Private (Admin & Supervisor)
exports.getReportSummary = async (req, res) => {
  const { filter, machineId } = req.query;
  const { startDate, endDate } = getDateRange(filter);

  try {
    const metrics = await getReportMetrics(startDate, endDate, machineId);
    res.json({ success: true, filter, timeRange: { start: startDate, end: endDate }, data: metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Export PDF Report
// @route   GET /api/reports/pdf
// @access  Private (Admin & Supervisor)
exports.exportPDF = async (req, res) => {
  const { filter, machineId } = req.query;
  const { startDate, endDate } = getDateRange(filter);

  try {
    const data = await getReportMetrics(startDate, endDate, machineId);

    const doc = new PDFDocument({ margin: 50 });
    let filename = `SIEMENS_smart_factory_report_${filter || 'today'}.pdf`;
    
    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    doc.pipe(res);

    // Header styling
    doc.rect(0, 0, doc.page.width, 100).fill('#030f26');
    doc.fillColor('#00e5ff').fontSize(24).text('SIEMENS', 50, 25, { bold: true });
    doc.fillColor('#ffffff').fontSize(14).text('Industry 4.0 Smart Factory Report', 50, 55);
    doc.fillColor('#94a3b8').fontSize(9).text(`Generated: ${new Date().toLocaleString()}`, 400, 30);
    doc.fillColor('#94a3b8').fontSize(9).text(`Filter: ${filter ? filter.toUpperCase() : 'TODAY'}`, 400, 45);
    
    doc.moveDown(5);
    doc.fillColor('#030f26').fontSize(16).text('Production Summary & Asset Analytics', 50, 120);
    doc.strokeColor('#00e5ff').lineWidth(2).moveTo(50, 142).lineTo(560, 142).stroke();

    let y = 160;
    // Table Headers
    doc.fillColor('#071836').fontSize(9).text('ID', 50, y, { bold: true });
    doc.text('Name', 100, y, { bold: true });
    doc.text('Department', 180, y, { bold: true });
    doc.text('Avg Temp', 270, y, { bold: true });
    doc.text('Avg Vib', 330, y, { bold: true });
    doc.text('Avg Power', 380, y, { bold: true });
    doc.text('Outputs', 440, y, { bold: true });
    doc.text('Alerts', 500, y, { bold: true });

    y += 15;
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, y).lineTo(560, y).stroke();
    y += 10;

    data.forEach(row => {
      // Check for overflow
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      doc.fillColor('#1e293b').fontSize(8.5);
      doc.text(row.machineId, 50, y);
      doc.text(row.name, 100, y);
      doc.text(row.department, 180, y);
      doc.text(`${row.avgTemp}°C`, 270, y);
      doc.text(`${row.avgVibration}g`, 330, y);
      doc.text(`${row.avgPower}kW`, 380, y);
      doc.text(row.totalProduction.toString(), 440, y);
      doc.fillColor(row.totalAlerts > 0 ? '#ef4444' : '#10b981').text(row.totalAlerts.toString(), 500, y);

      y += 20;
      doc.strokeColor('#f1f5f9').lineWidth(0.5).moveTo(50, y).lineTo(560, y).stroke();
      y += 8;
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Export Excel Report
// @route   GET /api/reports/excel
// @access  Private (Admin & Supervisor)
exports.exportExcel = async (req, res) => {
  const { filter, machineId } = req.query;
  const { startDate, endDate } = getDateRange(filter);

  try {
    const data = await getReportMetrics(startDate, endDate, machineId);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Factory Metrics');

    worksheet.columns = [
      { header: 'Machine ID', key: 'machineId', width: 15 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Department', key: 'department', width: 18 },
      { header: 'Current Status', key: 'status', width: 15 },
      { header: 'Avg Temperature (°C)', key: 'avgTemp', width: 22 },
      { header: 'Avg Vibration (G)', key: 'avgVibration', width: 20 },
      { header: 'Avg RPM', key: 'avgRpm', width: 15 },
      { header: 'Avg Power (kW)', key: 'avgPower', width: 18 },
      { header: 'Max Temp (°C)', key: 'maxTemp', width: 18 },
      { header: 'Max Vibration (G)', key: 'maxVibration', width: 20 },
      { header: 'Total Production', key: 'totalProduction', width: 18 },
      { header: 'Critical Red Alerts', key: 'redAlerts', width: 20 },
      { header: 'Yellow Alerts', key: 'yellowAlerts', width: 18 },
      { header: 'Total Alerts', key: 'totalAlerts', width: 15 }
    ];

    // Style Header Row
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '030F26' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Populate rows
    data.forEach(item => {
      worksheet.addRow(item);
    });

    // Style data cells
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } }
          };
        });
      }
    });

    let filename = `SIEMENS_factory_report_${filter || 'today'}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Export CSV Report
// @route   GET /api/reports/csv
// @access  Private (Admin & Supervisor)
exports.exportCSV = async (req, res) => {
  const { filter, machineId } = req.query;
  const { startDate, endDate } = getDateRange(filter);

  try {
    const data = await getReportMetrics(startDate, endDate, machineId);

    // CSV columns
    const headers = [
      'MachineID', 'Name', 'Department', 'Status', 'AvgTemp', 
      'AvgVibration', 'AvgRPM', 'AvgPower', 'MaxTemp', 
      'MaxVibration', 'TotalProduction', 'RedAlerts', 
      'YellowAlerts', 'TotalAlerts'
    ];

    const csvRows = [];
    csvRows.push(headers.join(','));

    data.forEach(item => {
      const values = [
        item.machineId,
        `"${item.name}"`,
        `"${item.department}"`,
        item.status,
        item.avgTemp,
        item.avgVibration,
        item.avgRpm,
        item.avgPower,
        item.maxTemp,
        item.maxVibration,
        item.totalProduction,
        item.redAlerts,
        item.yellowAlerts,
        item.totalAlerts
      ];
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    let filename = `SIEMENS_factory_report_${filter || 'today'}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
