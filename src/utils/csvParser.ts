export interface CaregiverCSVRow {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  status?: string;
  hourly_rate?: string;
  specializations?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  service_radius_miles?: string;
}

export interface ParsedCaregiver {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  hourly_rate: number | null;
  specializations: string[] | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  service_radius_miles: number | null;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ParseResult {
  caregivers: ParsedCaregiver[];
  errors: ValidationError[];
  totalRows: number;
}

export function parseCSV(content: string): CaregiverCSVRow[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });
    
    return row as unknown as CaregiverCSVRow;
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

export function validateAndTransform(rows: CaregiverCSVRow[]): ParseResult {
  const caregivers: ParsedCaregiver[] = [];
  const errors: ValidationError[] = [];
  
  rows.forEach((row, index) => {
    const rowNum = index + 2; // +2 for header row and 0-indexing
    
    // Required field validation
    if (!row.first_name?.trim()) {
      errors.push({ row: rowNum, field: 'first_name', message: 'First name is required' });
    }
    if (!row.last_name?.trim()) {
      errors.push({ row: rowNum, field: 'last_name', message: 'Last name is required' });
    }
    
    // Email validation
    if (row.email?.trim() && !isValidEmail(row.email.trim())) {
      errors.push({ row: rowNum, field: 'email', message: 'Invalid email format' });
    }
    
    // Status validation
    const validStatuses = ['active', 'inactive', 'on-leave'];
    const status = row.status?.trim().toLowerCase() || 'active';
    if (!validStatuses.includes(status)) {
      errors.push({ row: rowNum, field: 'status', message: `Status must be one of: ${validStatuses.join(', ')}` });
    }
    
    // Hourly rate validation
    let hourlyRate: number | null = null;
    if (row.hourly_rate?.trim()) {
      const parsed = parseFloat(row.hourly_rate.trim());
      if (isNaN(parsed) || parsed < 0) {
        errors.push({ row: rowNum, field: 'hourly_rate', message: 'Hourly rate must be a positive number' });
      } else {
        hourlyRate = parsed;
      }
    }
    
    // Service radius validation
    let serviceRadius: number | null = null;
    if (row.service_radius_miles?.trim()) {
      const parsed = parseInt(row.service_radius_miles.trim());
      if (isNaN(parsed) || parsed < 0) {
        errors.push({ row: rowNum, field: 'service_radius_miles', message: 'Service radius must be a positive number' });
      } else {
        serviceRadius = parsed;
      }
    }
    
    // Parse specializations (comma or semicolon separated within quotes)
    let specializations: string[] | null = null;
    if (row.specializations?.trim()) {
      specializations = row.specializations
        .split(/[;|]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }
    
    // Only add if no critical errors for this row
    const rowErrors = errors.filter(e => e.row === rowNum);
    const hasCriticalError = rowErrors.some(e => e.field === 'first_name' || e.field === 'last_name');
    
    if (!hasCriticalError) {
      caregivers.push({
        first_name: row.first_name?.trim() || '',
        last_name: row.last_name?.trim() || '',
        email: row.email?.trim() || null,
        phone: row.phone?.trim() || null,
        status: validStatuses.includes(status) ? status : 'active',
        hourly_rate: hourlyRate,
        specializations,
        address: row.address?.trim() || null,
        city: row.city?.trim() || null,
        state: row.state?.trim() || null,
        zip_code: row.zip_code?.trim() || null,
        service_radius_miles: serviceRadius,
      });
    }
  });
  
  return {
    caregivers,
    errors,
    totalRows: rows.length,
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function generateSampleCSV(): string {
  return `first_name,last_name,email,phone,status,hourly_rate,specializations,address,city,state,zip_code,service_radius_miles
John,Doe,john.doe@email.com,(555) 123-4567,active,25.00,Elder Care|Dementia Care,123 Main St,Springfield,IL,62701,15
Jane,Smith,jane.smith@email.com,(555) 987-6543,active,28.50,Pediatric Care|Physical Therapy,456 Oak Ave,Chicago,IL,60601,20`;
}
