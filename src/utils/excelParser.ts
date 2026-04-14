import * as XLSX from "xlsx";
import type { ClientCSVRow } from "./csvParser";

const COLUMN_MAP: Record<string, keyof ClientCSVRow> = {
  "last_name": "last_name",
  "last name": "last_name",
  "lastname": "last_name",
  "first_name": "first_name",
  "first name": "first_name",
  "firstname": "first_name",
  "email": "email",
  "e-mail": "email",
  "phone": "phone",
  "phone number": "phone",
  "phone_number": "phone",
  "status": "status",
  "date_of_birth": "date_of_birth",
  "date of birth": "date_of_birth",
  "dob": "date_of_birth",
  "address": "address",
  "city": "city",
  "state": "state",
  "zip_code": "zip_code",
  "zip code": "zip_code",
  "zip": "zip_code",
  "zipcode": "zip_code",
  "emergency_contact_name": "emergency_contact_name",
  "emergency contact name": "emergency_contact_name",
  "emergency_contact_phone": "emergency_contact_phone",
  "emergency contact phone": "emergency_contact_phone",
  "notes": "notes",
  "618 dute date": "authorization_due_date",
  "618 due date": "authorization_due_date",
  "authorization_due_date": "authorization_due_date",
  "authorization expiration date": "authorization_expiration_date",
  "authorization_expiration_date": "authorization_expiration_date",
  "client_class": "client_class",
  "client class": "client_class",
  "class": "client_class",
  "client_hours": "client_hours",
  "client hours": "client_hours",
  "hours": "client_hours",
};

export function parseExcelFile(file: File): Promise<ClientCSVRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

        if (jsonRows.length === 0) {
          resolve([]);
          return;
        }

        const headers = Object.keys(jsonRows[0]);
        const mappedRows: ClientCSVRow[] = jsonRows.map((row) => {
          const mapped: Record<string, string> = {};
          const extraParts: string[] = [];

          headers.forEach((header) => {
            const normalized = header.trim().toLowerCase();
            const mappedKey = COLUMN_MAP[normalized];
            const rawValue = row[header];
            const value = String(rawValue ?? "").trim();

            if (mappedKey) {
              if (mappedKey === "status") {
                if (value === "✓" || value === "✔" || value === "TRUE" || value === "true") {
                  mapped[mappedKey] = "active";
                } else if (!value) {
                  mapped[mappedKey] = "inactive";
                } else {
                  mapped[mappedKey] = value;
                }
              } else if ((mappedKey === "date_of_birth" || mappedKey === "authorization_due_date" || mappedKey === "authorization_expiration_date") && rawValue instanceof Date) {
                const d = rawValue as Date;
                mapped[mappedKey] = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              } else {
                mapped[mappedKey] = value;
              }
            } else if (value) {
              extraParts.push(`${header}: ${value}`);
            }
          });

          if (extraParts.length > 0) {
            const existing = mapped.notes || "";
            mapped.notes = [existing, ...extraParts].filter(Boolean).join(" | ");
          }

          return mapped as unknown as ClientCSVRow;
        });

        resolve(mappedRows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}
