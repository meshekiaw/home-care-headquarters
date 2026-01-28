import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileCheck, 
  Upload, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  FileText,
  Download,
  Filter
} from "lucide-react";

export default function Compliance() {
  const documents = [
    { name: "Maria Santos - RN License", type: "License", expires: "Dec 15, 2024", status: "valid" },
    { name: "David Wilson - CPR Certification", type: "Certification", expires: "Feb 28, 2024", status: "expiring" },
    { name: "Sarah Johnson - Background Check", type: "Background", expires: "Aug 10, 2024", status: "valid" },
    { name: "Agency Insurance Policy", type: "Insurance", expires: "Jan 1, 2025", status: "valid" },
  ];

  const alerts = [
    { message: "2 certifications expiring in 30 days", type: "warning" },
    { message: "All background checks up to date", type: "success" },
    { message: "3 documents pending review", type: "info" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Compliance & Documents</h2>
            <p className="text-muted-foreground">Manage certifications, licenses, and compliance documents</p>
          </div>
          <Button>
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>

        {/* Alerts */}
        <div className="grid gap-4 md:grid-cols-3">
          {alerts.map((alert, idx) => (
            <Card key={idx} className={`border-l-4 ${
              alert.type === 'warning' ? 'border-l-warning' :
              alert.type === 'success' ? 'border-l-success' :
              'border-l-primary'
            }`}>
              <CardContent className="p-4 flex items-center gap-3">
                {alert.type === 'warning' && <AlertTriangle className="w-5 h-5 text-warning" />}
                {alert.type === 'success' && <CheckCircle2 className="w-5 h-5 text-success" />}
                {alert.type === 'info' && <Clock className="w-5 h-5 text-primary" />}
                <span className="text-sm font-medium">{alert.message}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search documents..." className="pl-10" />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map((doc, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{doc.name}</h4>
                      <p className="text-sm text-muted-foreground">{doc.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm">Expires: {doc.expires}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        doc.status === 'valid' ? 'bg-success/10 text-success' :
                        doc.status === 'expiring' ? 'bg-warning/10 text-warning' :
                        'bg-destructive/10 text-destructive'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
