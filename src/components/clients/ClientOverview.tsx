import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  AlertCircle,
  FileText
} from "lucide-react";
import { formatDateOnly, isDateOnlyString } from "@/utils/dateOnly";

function addMonthsToDate(dateStr: string | null, months: number): string | null {
  if (!dateStr) return null;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  let year = Number(match[1]);
  let month = Number(match[2]) + months;
  const day = match[3];
  if (month > 12) {
    year += Math.floor((month - 1) / 12);
    month = ((month - 1) % 12) + 1;
  }
  return `${year}-${String(month).padStart(2, '0')}-${day}`;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  authorization_due_date: string | null;
  authorization_expiration_date: string | null;
  client_class: string | null;
  client_hours: number | null;
}

interface ClientOverviewProps {
  client: Client;
  formatDate: (date: string | null) => string;
}

export function ClientOverview({ client, formatDate }: ClientOverviewProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">{client.first_name} {client.last_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="font-medium">{formatDate(client.date_of_birth)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{client.status}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Client Since</p>
              <p className="font-medium">{formatDate(client.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Client Class</p>
              <p className="font-medium">{client.client_class || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Client Hours</p>
              <p className="font-medium">{client.client_hours != null ? client.client_hours : 'Not specified'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {client.phone ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <a href={`tel:${client.phone}`} className="font-medium hover:text-primary transition-colors">
                    {client.phone}
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No phone number</p>
            )}
            
            {client.email ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a href={`mailto:${client.email}`} className="font-medium hover:text-primary transition-colors">
                    {client.email}
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No email address</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Address</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {client.address || client.city || client.state ? (
            <div className="space-y-1">
              {client.address && <p className="font-medium">{client.address}</p>}
              {(client.city || client.state || client.zip_code) && (
                <p className="text-muted-foreground">
                  {[client.city, client.state, client.zip_code].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No address on file</p>
          )}
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <CardTitle className="text-lg">Emergency Contact</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {client.emergency_contact_name || client.emergency_contact_phone ? (
            <div className="space-y-2">
              {client.emergency_contact_name && (
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{client.emergency_contact_name}</p>
                </div>
              )}
              {client.emergency_contact_phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <a 
                    href={`tel:${client.emergency_contact_phone}`} 
                    className="font-medium hover:text-primary transition-colors"
                  >
                    {client.emergency_contact_phone}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No emergency contact on file</p>
          )}
        </CardContent>
      </Card>

      {/* Compliance Dates */}
      {(client.authorization_due_date || client.authorization_expiration_date) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Compliance Dates</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Current 618 Date</p>
              <p className="font-medium">{formatDate(client.authorization_due_date)}</p>
            </div>
            {client.client_class === 'VA' && client.authorization_due_date && (() => {
              const dueDate = computeDueDate6Months(client.authorization_due_date);
              const dueDateFormatted = dueDate ? (formatDateOnly(dueDate) ?? dueDate) : null;
              const now = new Date();
              const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
              const isPast = dueDate && dueDate <= nowStr;
              const isWithin30 = dueDate && !isPast && dueDate <= (() => {
                const d = new Date(now.getTime() + 30 * 86400000);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              })();
              return (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    618 Due Date (6 months)
                    {isPast && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                    {isWithin30 && <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">Due Soon</Badge>}
                  </p>
                  <p className={`font-medium ${isPast ? 'text-destructive' : isWithin30 ? 'text-yellow-600' : ''}`}>
                    {dueDateFormatted || 'Not available'}
                  </p>
                </div>
              );
            })()}
            <div>
              <p className="text-sm text-muted-foreground">Authorization Expiration Date</p>
              <p className="font-medium">{formatDate(client.authorization_expiration_date)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {client.notes && (
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Notes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
