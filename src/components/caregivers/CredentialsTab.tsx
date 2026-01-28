import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Award, Calendar, Building, Trash2, Edit, AlertTriangle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

interface CredentialsTabProps {
  credentials: Tables<"caregiver_credentials">[];
  onAdd: (credential: Omit<TablesInsert<"caregiver_credentials">, "user_id" | "caregiver_id">) => Promise<any>;
  onUpdate: (id: string, updates: TablesUpdate<"caregiver_credentials">) => Promise<any>;
  onDelete: (id: string) => Promise<boolean>;
}

const CREDENTIAL_TYPES = [
  { value: "license", label: "License" },
  { value: "certification", label: "Certification" },
  { value: "background_check", label: "Background Check" },
  { value: "training", label: "Training" },
];

export default function CredentialsTab({ credentials, onAdd, onUpdate, onDelete }: CredentialsTabProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Tables<"caregiver_credentials"> | null>(null);
  const [formData, setFormData] = useState({
    credential_type: "certification",
    credential_name: "",
    issuing_organization: "",
    credential_number: "",
    issue_date: "",
    expiry_date: "",
    status: "active",
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      credential_type: "certification",
      credential_name: "",
      issuing_organization: "",
      credential_number: "",
      issue_date: "",
      expiry_date: "",
      status: "active",
      notes: "",
    });
  };

  const handleAdd = async () => {
    await onAdd({
      ...formData,
      issue_date: formData.issue_date || null,
      expiry_date: formData.expiry_date || null,
    });
    resetForm();
    setAddDialogOpen(false);
  };

  const handleEdit = (credential: Tables<"caregiver_credentials">) => {
    setEditingCredential(credential);
    setFormData({
      credential_type: credential.credential_type,
      credential_name: credential.credential_name,
      issuing_organization: credential.issuing_organization || "",
      credential_number: credential.credential_number || "",
      issue_date: credential.issue_date || "",
      expiry_date: credential.expiry_date || "",
      status: credential.status,
      notes: credential.notes || "",
    });
  };

  const handleUpdate = async () => {
    if (!editingCredential) return;
    await onUpdate(editingCredential.id, {
      ...formData,
      issue_date: formData.issue_date || null,
      expiry_date: formData.expiry_date || null,
    });
    setEditingCredential(null);
    resetForm();
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { status: "no-expiry", label: "No Expiry", variant: "secondary" as const };
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return { status: "expired", label: "Expired", variant: "destructive" as const };
    if (days <= 30) return { status: "expiring-soon", label: `${days}d left`, variant: "outline" as const };
    return { status: "valid", label: "Valid", variant: "default" as const };
  };

  const CredentialForm = () => (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={formData.credential_type}
            onValueChange={(v) => setFormData((f) => ({ ...f, credential_type: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CREDENTIAL_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input
            value={formData.credential_name}
            onChange={(e) => setFormData((f) => ({ ...f, credential_name: e.target.value }))}
            placeholder="e.g., RN License, CPR Certification"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Issuing Organization</Label>
          <Input
            value={formData.issuing_organization}
            onChange={(e) => setFormData((f) => ({ ...f, issuing_organization: e.target.value }))}
            placeholder="e.g., State Board of Nursing"
          />
        </div>
        <div className="space-y-2">
          <Label>Credential Number</Label>
          <Input
            value={formData.credential_number}
            onChange={(e) => setFormData((f) => ({ ...f, credential_number: e.target.value }))}
            placeholder="License/Certificate #"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Issue Date</Label>
          <Input
            type="date"
            value={formData.issue_date}
            onChange={(e) => setFormData((f) => ({ ...f, issue_date: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Expiry Date</Label>
          <Input
            type="date"
            value={formData.expiry_date}
            onChange={(e) => setFormData((f) => ({ ...f, expiry_date: e.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={formData.status}
          onValueChange={(v) => setFormData((f) => ({ ...f, status: v }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Track licenses, certifications, and training records
        </p>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Credential
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Credential</DialogTitle>
            </DialogHeader>
            <CredentialForm />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={!formData.credential_name}>
                Add Credential
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingCredential} onOpenChange={(open) => !open && setEditingCredential(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Credential</DialogTitle>
          </DialogHeader>
          <CredentialForm />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditingCredential(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!formData.credential_name}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {credentials.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Award className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No credentials yet</h3>
            <p className="text-sm text-muted-foreground">
              Add licenses, certifications, and training records
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {credentials.map((credential) => {
            const expiryInfo = getExpiryStatus(credential.expiry_date);
            return (
              <Card key={credential.id} className="hover:shadow-soft transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Award className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium">{credential.credential_name}</h4>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {credential.credential_type.replace("_", " ")}
                          </Badge>
                          {expiryInfo.status === "expired" && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Expired
                            </Badge>
                          )}
                          {expiryInfo.status === "expiring-soon" && (
                            <Badge variant="outline" className="text-xs border-warning text-warning">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {expiryInfo.label}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                          {credential.issuing_organization && (
                            <span className="flex items-center gap-1">
                              <Building className="w-3.5 h-3.5" />
                              {credential.issuing_organization}
                            </span>
                          )}
                          {credential.expiry_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              Expires {format(new Date(credential.expiry_date), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(credential)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Credential</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{credential.credential_name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(credential.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
