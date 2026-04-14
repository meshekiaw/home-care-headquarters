export function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) {
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];

  // Add headers
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) {
        return '';
      }
      if (Array.isArray(value)) {
        return `"${value.join('; ')}"`;
      }
      if (typeof value === 'string') {
        // Escape quotes and wrap in quotes if contains comma or newline
        const escaped = value.replace(/"/g, '""');
        return `"${escaped}"`;
      }
      return String(value);
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatCaregiverForExport(caregiver: {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  specializations?: string[] | null;
  hourly_rate?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  created_at: string;
}) {
  return {
    first_name: caregiver.first_name,
    last_name: caregiver.last_name,
    email: caregiver.email || '',
    phone: caregiver.phone || '',
    status: caregiver.status,
    specializations: caregiver.specializations || [],
    hourly_rate: caregiver.hourly_rate || '',
    address: caregiver.address || '',
    city: caregiver.city || '',
    state: caregiver.state || '',
    zip_code: caregiver.zip_code || '',
    created_at: caregiver.created_at,
  };
}

export function formatClientForExport(client: {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  date_of_birth?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  client_class?: string | null;
  client_hours?: number | null;
  created_at: string;
}) {
  return {
    first_name: client.first_name,
    last_name: client.last_name,
    email: client.email || '',
    phone: client.phone || '',
    status: client.status,
    address: client.address || '',
    city: client.city || '',
    state: client.state || '',
    zip_code: client.zip_code || '',
    date_of_birth: client.date_of_birth || '',
    emergency_contact_name: client.emergency_contact_name || '',
  emergency_contact_phone: client.emergency_contact_phone || '',
    client_class: client.client_class || '',
    client_hours: client.client_hours || '',
    created_at: client.created_at,
  };
}

export function formatAppointmentForExport(appointment: {
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string | null;
  created_at: string;
}, clientName: string, caregiverName: string) {
  return {
    title: appointment.title,
    description: appointment.description || '',
    client: clientName,
    caregiver: caregiverName,
    start_time: appointment.start_time,
    end_time: appointment.end_time,
    status: appointment.status,
    notes: appointment.notes || '',
    created_at: appointment.created_at,
  };
}
