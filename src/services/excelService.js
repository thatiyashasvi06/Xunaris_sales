import * as XLSX from 'xlsx';
import { LEAD_STATUSES, LEAD_PRIORITIES, PAYROLL_TYPES } from '../data/businessVerticals';
import { validateLeadData, normalizeDomain, getNextBusinessDay } from './leadValidationService';

export const excelService = {
  // Validate email format
  isValidEmail: (email) => {
    return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
  },

  // Parse and validate Leads from Excel or CSV file using shared backend validation
  parseLeadsFile: async (file, options = {}) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (!rawRows || rawRows.length === 0) {
            return resolve({
              validRows: [],
              errors: [{ row: 0, reason: 'File is empty or contains no readable rows.' }]
            });
          }

          const validRows = [];
          const errors = [];

          rawRows.forEach((row, index) => {
            const rowNumber = index + 2; // account for header row

            // Map raw row fields with case-insensitive / flexible column naming
            const mappedData = {
              businessVertical: row['Business Vertical'] || row['businessVertical'] || row['Vertical'] || '',
              service: row['Service'] || row['service'] || '',
              companyName: row['Company Name'] || row['companyName'] || row['Company'] || '',
              companyWebsite: row['Company Website'] || row['companyWebsite'] || row['Website'] || '',
              industry: row['Industry'] || row['industry'] || 'IT Services',
              city: row['City'] || row['city'] || '',
              country: row['Country'] || row['country'] || 'India',
              contactName: row['Contact Name'] || row['contactName'] || row['Contact'] || '',
              jobTitle: row['Job Title'] || row['jobTitle'] || '',
              workEmail: (row['Work Email'] || row['workEmail'] || row['Email'] || '').trim(),
              phone: (row['Phone'] || row['phone'] || '').trim(),
              leadSource: row['Lead Source'] || row['leadSource'] || 'Manual',
              campaignName: row['Campaign Name'] || row['campaignName'] || row['Campaign'] || '',
              requirementSummary: row['Requirement Summary'] || row['requirementSummary'] || row['Requirement'] || '',
              priority: row['Priority'] || row['priority'] || 'Medium',
              status: 'New', // Imports may only create New per specification
              ownerEmail: row['Owner Email'] || row['ownerEmail'] || '',
              nextFollowup: row['Next Follow-up Date'] || row['Next Follow-up'] || row['nextFollowup'] || '',
              notes: row['Notes'] || row['notes'] || ''
            };

            // Execute shared backend validation
            const validation = validateLeadData(mappedData, {
              isCsvImport: true,
              ...options
            });

            if (!validation.isValid) {
              const reasons = Object.values(validation.errors);
              errors.push({
                row: rowNumber,
                data: row,
                reasons
              });
            } else {
              validRows.push({
                ...validation.normalized,
                id: `lead-import-${Date.now()}-${index}`,
                aiScore: validation.normalized.priority === 'High' ? 88 : 75,
                aiSummary: `Imported verified lead for ${validation.normalized.companyName}.`,
                createdAt: new Date().toISOString().split('T')[0]
              });
            }
          });

          resolve({ validRows, errors });
        } catch (err) {
          reject(new Error('Failed to parse file: ' + err.message));
        }
      };

      reader.onerror = () => reject(new Error('Error reading uploaded file.'));
      reader.readAsArrayBuffer(file);
    });
  },

  // Download Sample Leads Excel / CSV Template matching exact Section 6 specification schema
  downloadLeadsTemplate: () => {
    const templateData = [
      {
        'Business Vertical': 'Xunaris',
        'Service': 'SAP Services',
        'Company Name': 'Starlight Systems Inc',
        'Company Website': 'https://starlight.example.com',
        'Industry': 'IT Services',
        'City': 'Bengaluru',
        'Country': 'India',
        'Contact Name': 'Alex Turner',
        'Job Title': 'Chief Technology Officer',
        'Work Email': 'aturner@starlight.example.com',
        'Phone': '+91 98765 43210',
        'Lead Source': 'LinkedIn',
        'Campaign Name': '',
        'Requirement Summary': 'Needs migration from legacy SAP ECC to SAP S/4HANA Cloud.',
        'Priority': 'High',
        'Lead Status': 'New',
        'Owner Email': 'sales@xunaris.com',
        'Next Follow-up Date': '2026-10-25',
        'Notes': 'Enterprise prospect with approved Q4 modernizing budget.'
      },
      {
        'Business Vertical': 'HYRA Connect',
        'Service': 'IT Staffing',
        'Company Name': 'Apex FinTech Global',
        'Company Website': 'https://apexfintech.example.com',
        'Industry': 'Finance',
        'City': 'Hyderabad',
        'Country': 'India',
        'Contact Name': 'Sneha Rao',
        'Job Title': 'Head of Engineering',
        'Work Email': '',
        'Phone': '+91 91234 56789',
        'Lead Source': 'Campaign',
        'Campaign Name': 'HYRA Launch Outreach',
        'Requirement Summary': 'Looking for 3 senior Fullstack React & Node contract developers.',
        'Priority': 'Medium',
        'Lead Status': 'New',
        'Owner Email': 'sales@xunaris.com',
        'Next Follow-up Date': '',
        'Notes': 'Needs candidate dossiers by next week.'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads Template');
    XLSX.writeFile(workbook, 'Xunaris_HYRA_Leads_Template.xlsx');
  },

  // Export current leads to Excel
  exportLeadsToExcel: (leads) => {
    const exportData = leads.map(l => ({
      'Company Name': l.companyName,
      'Vertical': l.businessVertical,
      'Service': l.service,
      'Contact Name': l.contactName,
      'Job Title': l.jobTitle,
      'Work Email': l.workEmail,
      'Phone': l.phone,
      'Status': l.status,
      'Priority': l.priority,
      'Lead Score (AI)': l.aiScore || 75,
      'Lead Source': l.leadSource,
      'City': l.city,
      'Country': l.country,
      'Next Follow-up': l.nextFollowup,
      'Owner': l.ownerEmail,
      'Notes': l.notes
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Xunaris Leads');
    XLSX.writeFile(workbook, `Xunaris_Leads_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  // Export arbitrary dataset as Excel / CSV
  exportCustomData: (data, filename = 'Xunaris_Export', sheetName = 'Data') => {
    if (!data || data.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  // Download Sample Jobs Excel Template for Recruiters
  downloadJobsTemplate: () => {
    const sampleJobs = [
      {
        'Job Title': 'Senior Python Backend Architect',
        'Department': 'Software Engineering',
        'Location': 'Remote (Global)',
        'Employment Type': 'Full-time',
        'Payroll Type': 'Xunaris Payroll',
        'Experience Level': '5+ years',
        'Salary Range': '$120,000 - $145,000 USD',
        'Description': 'Design high-throughput microservices using FastAPI, Redis, and PostgreSQL.',
        'Requirements': 'Python, FastAPI, Docker, PostgreSQL, Event-driven architecture, CI/CD.'
      },
      {
        'Job Title': 'Staff SRE & Kubernetes Engineer',
        'Department': 'Cloud & Infrastructure',
        'Location': 'Hybrid - Austin, TX',
        'Employment Type': 'Contract',
        'Payroll Type': 'Partner Payroll',
        'Experience Level': '6+ years',
        'Salary Range': '$90 - $110 / hr',
        'Description': 'Manage production EKS clusters, monitor latency, and implement disaster recovery.',
        'Requirements': 'Kubernetes, Terraform, Prometheus, AWS, Linux internals, On-call incident response.'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleJobs);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Jobs Template');
    XLSX.writeFile(workbook, 'HYRA_Connect_Jobs_Template.xlsx');
  },

  // Parse bulk jobs from file
  parseJobsFile: async (file, partner, recruiter) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (!rawRows || rawRows.length === 0) {
            return resolve({ validJobs: [], errors: [{ row: 0, reason: 'File is empty' }] });
          }

          const validJobs = [];
          const errors = [];

          rawRows.forEach((row, index) => {
            const rowNum = index + 2;
            const rowErrors = [];

            const title = row['Job Title'] || row['title'] || '';
            const department = row['Department'] || row['department'] || 'Engineering';
            const location = row['Location'] || row['location'] || 'Remote';
            const employmentType = row['Employment Type'] || row['employmentType'] || 'Full-time';
            const payrollType = row['Payroll Type'] || row['payrollType'] || 'Xunaris Payroll';
            const experienceLevel = row['Experience Level'] || row['experienceLevel'] || '3+ years';
            const salaryRange = row['Salary Range'] || row['salaryRange'] || 'Competitive';
            const description = row['Description'] || row['description'] || '';
            const requirements = row['Requirements'] || row['requirements'] || '';

            if (!title.trim()) rowErrors.push('Job Title is required');
            if (!description.trim()) rowErrors.push('Description is required');
            if (!PAYROLL_TYPES.includes(payrollType)) {
              rowErrors.push(`Payroll Type must be either 'Xunaris Payroll' or 'Partner Payroll'`);
            }

            if (rowErrors.length > 0) {
              errors.push({ row: rowNum, reasons: rowErrors });
            } else {
              validJobs.push({
                id: `job-import-${Date.now()}-${index}`,
                partnerId: partner?.id || 'ptn_custom',
                partnerName: partner?.companyName || 'Recruiting Partner',
                recruiterEmail: recruiter?.email || 'recruiter@hyra.example.com',
                title: title.trim(),
                department: department.trim(),
                location: location.trim(),
                employmentType,
                payrollType,
                experienceLevel,
                salaryRange,
                description: description.trim(),
                requirements: requirements.trim(),
                status: 'Pending Approval', // Bulk jobs always enter pending approval workflow
                adminFeedback: 'Bulk uploaded. Pending Admin review.',
                applicantsCount: 0,
                createdAt: new Date().toISOString().split('T')[0]
              });
            }
          });

          resolve({ validJobs, errors });
        } catch (err) {
          reject(new Error('Failed to parse jobs file: ' + err.message));
        }
      };

      reader.onerror = () => reject(new Error('Error reading uploaded file.'));
      reader.readAsArrayBuffer(file);
    });
  }
};
