import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, User, Phone, MapPin, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const clientSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  date_of_birth: z.string().optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip_code: z.string().max(20).optional(),
  emergency_contact_name: z.string().max(200).optional(),
  emergency_contact_phone: z.string().max(20).optional(),
  notes: z.string().max(2000).optional(),
  authorization_due_date: z.string().optional(),
  authorization_expiration_date: z.string().optional(),
  client_class: z.string().optional(),
  client_hours: z.string().optional(),
  status: z.enum(["active", "inactive", "pending"]),
});

type ClientFormData = z.infer<typeof clientSchema>;

export default function ClientEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<ClientFormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: "",
    authorization_due_date: "",
    authorization_expiration_date: "",
    client_class: "",
    client_hours: "",
    status: "active",
  });

  useEffect(() => {
    const fetchClient = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        setFormData({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          phone: data.phone || "",
          date_of_birth: data.date_of_birth || "",
          address: data.address || "",
          city: data.city || "",
          state: data.state || "",
          zip_code: data.zip_code || "",
          emergency_contact_name: data.emergency_contact_name || "",
          emergency_contact_phone: data.emergency_contact_phone || "",
          notes: data.notes || "",
          authorization_due_date: data.authorization_due_date || "",
          authorization_expiration_date: data.authorization_expiration_date || "",
          client_class: data.client_class || "",
          client_hours: data.client_hours != null ? String(data.client_hours) : "",
          status: (data.status as "active" | "inactive" | "pending") || "active",
        });
      } catch (error: any) {
        toast({
          title: "Error loading client",
          description: error.message,
          variant: "destructive",
        });
        navigate("/clients");
      } finally {
        setFetching(false);
      }
    };
    fetchClient();
  }, [id]);

  const handleChange = (field: keyof ClientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const validated = clientSchema.parse(formData);

      const { error } = await supabase
        .from("clients")
        .update({
          first_name: validated.first_name,
          last_name: validated.last_name,
          email: validated.email || null,
          phone: validated.phone || null,
          date_of_birth: validated.date_of_birth || null,
          address: validated.address || null,
          city: validated.city || null,
          state: validated.state || null,
          zip_code: validated.zip_code || null,
          emergency_contact_name: validated.emergency_contact_name || null,
          emergency_contact_phone: validated.emergency_contact_phone || null,
          notes: validated.notes || null,
          authorization_due_date: validated.authorization_due_date || null,
          authorization_expiration_date: validated.authorization_expiration_date || null,
          client_class: validated.client_class || null,
          client_hours: validated.client_hours ? parseFloat(validated.client_hours) : null,
          status: validated.status,
        })
        .eq("id", id!)
        .select("id")
        .single();

      if (error) throw error;

      toast({
        title: "Client updated successfully!",
        description: `${validated.first_name} ${validated.last_name} has been updated.`,
      });

      navigate(`/clients/${id}`);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast({
          title: "Error updating client",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to={`/clients/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold">Edit Client</h2>
            <p className="text-muted-foreground">Update the client's information below</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Personal Information</CardTitle>
              </div>
              <CardDescription>Basic details about the client</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleChange("first_name", e.target.value)}
                  className={errors.first_name ? "border-destructive" : ""}
                />
                {errors.first_name && <p className="text-xs text-destructive">{errors.first_name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleChange("last_name", e.target.value)}
                  className={errors.last_name ? "border-destructive" : ""}
                />
                {errors.last_name && <p className="text-xs text-destructive">{errors.last_name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input id="date_of_birth" type="date" value={formData.date_of_birth} onChange={(e) => handleChange("date_of_birth", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleChange("status", value as ClientFormData["status"])}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
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
              <CardDescription>How to reach the client</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} className={errors.email ? "border-destructive" : ""} />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                <Input id="emergency_contact_name" value={formData.emergency_contact_name} onChange={(e) => handleChange("emergency_contact_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                <Input id="emergency_contact_phone" type="tel" value={formData.emergency_contact_phone} onChange={(e) => handleChange("emergency_contact_phone", e.target.value)} />
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
              <CardDescription>Client's residential address</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input id="address" value={formData.address} onChange={(e) => handleChange("address", e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={formData.city} onChange={(e) => handleChange("city", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" value={formData.state} onChange={(e) => handleChange("state", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">ZIP Code</Label>
                  <Input id="zip_code" value={formData.zip_code} onChange={(e) => handleChange("zip_code", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Dates */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Compliance Dates</CardTitle>
              </div>
              <CardDescription>Authorization and compliance tracking dates</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="authorization_due_date">618 Due Date</Label>
                <Input id="authorization_due_date" type="date" value={formData.authorization_due_date} onChange={(e) => handleChange("authorization_due_date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="authorization_expiration_date">Authorization Expiration Date</Label>
                <Input id="authorization_expiration_date" type="date" value={formData.authorization_expiration_date} onChange={(e) => handleChange("authorization_expiration_date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_class">Client Class</Label>
                <Select value={formData.client_class} onValueChange={(value) => handleChange("client_class", value)}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VA">VA</SelectItem>
                    <SelectItem value="Medicaid">Medicaid</SelectItem>
                    <SelectItem value="Private Pay">Private Pay</SelectItem>
                    <SelectItem value="ARChoices">ARChoices</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_hours">Client Hours</Label>
                <Input id="client_hours" type="number" step="0.5" min="0" value={formData.client_hours} onChange={(e) => handleChange("client_hours", e.target.value)} placeholder="e.g. 40" />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Additional Notes</CardTitle>
              </div>
              <CardDescription>Any additional information about the client</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea id="notes" value={formData.notes} onChange={(e) => handleChange("notes", e.target.value)} placeholder="Enter any relevant notes..." rows={4} />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Link to={`/clients/${id}`}>
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
