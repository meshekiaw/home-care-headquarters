import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Shield,
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Search,
  AlertCircle,
  Users,
  FileCheck,
  XCircle,
  Calendar,
  RefreshCw,
  TrendingUp,
  GraduationCap
} from "lucide-react";
import { useComplianceDashboard } from "@/hooks/useCompliance";
import { format } from "date-fns";

export default function Compliance() {
  const {
    credentials,
    stats,
    loading,
    expiringDaysFilter,
    setExpiringDaysFilter,
    getCredentialStatus,
    getDaysUntilExpiry,
    getExpiredCredentials,
    getExpiringCredentials,
    requiredTrainings,
    refetch,
  } = useComplianceDashboard();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const compliancePercentage = stats.totalCaregivers > 0 
    ? Math.round((stats.compliantCaregivers / stats.totalCaregivers) * 100)
    : 0;

  const filteredCredentials = credentials.filter((cred) => {
    const matchesSearch = 
      cred.credential_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cred.caregiver.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cred.caregiver.last_name.toLowerCase().includes(searchQuery.toLowerCase());

    const status = getCredentialStatus(cred.expiry_date);
    const matchesStatus = statusFilter === "all" || status === statusFilter;

    const matchesType = typeFilter === "all" || cred.credential_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const uniqueTypes = [...new Set(credentials.map(c => c.credential_type))];

  const getStatusBadge = (expiryDate: string | null) => {
    const status = getCredentialStatus(expiryDate);
    const days = getDaysUntilExpiry(expiryDate);
    
    switch (status) {
      case 'expired':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Expired {days !== null && `${Math.abs(days)} days ago`}
          </Badge>
        );
      case 'expiring':
        return (
          <Badge variant="outline" className="flex items-center gap-1 border-warning text-warning">
            <AlertTriangle className="w-3 h-3" />
            Expires in {days} days
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-700">
            <CheckCircle2 className="w-3 h-3" />
            Valid
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-7 h-7 text-primary" />
              Compliance Dashboard
            </h2>
            <p className="text-muted-foreground">
              Monitor credentials, certifications, and training compliance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={expiringDaysFilter.toString()} onValueChange={(v) => setExpiringDaysFilter(Number(v))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Next 7 days</SelectItem>
                <SelectItem value="14">Next 14 days</SelectItem>
                <SelectItem value="30">Next 30 days</SelectItem>
                <SelectItem value="60">Next 60 days</SelectItem>
                <SelectItem value="90">Next 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={refetch}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overall Compliance</p>
                  <p className="text-3xl font-bold">{compliancePercentage}%</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  compliancePercentage >= 90 ? 'bg-green-100' : 
                  compliancePercentage >= 70 ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <TrendingUp className={`w-6 h-6 ${
                    compliancePercentage >= 90 ? 'text-green-600' : 
                    compliancePercentage >= 70 ? 'text-yellow-600' : 'text-red-600'
                  }`} />
                </div>
              </div>
              <Progress 
                value={compliancePercentage} 
                className="mt-3"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {stats.compliantCaregivers} of {stats.totalCaregivers} caregivers compliant
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-destructive">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Expired</p>
                  <p className="text-3xl font-bold text-destructive">{stats.expiredCredentials}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-destructive" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Credentials needing immediate attention
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Expiring Soon</p>
                  <p className="text-3xl font-bold text-warning">{stats.expiringCredentials}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-warning" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Within next {expiringDaysFilter} days
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valid</p>
                  <p className="text-3xl font-bold text-green-600">{stats.validCredentials}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Active and up to date
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Urgent Alerts */}
        {(stats.expiredCredentials > 0 || stats.expiringCredentials > 0) && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <h4 className="font-semibold text-destructive">Attention Required</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats.expiredCredentials > 0 && (
                      <span className="text-destructive font-medium">
                        {stats.expiredCredentials} expired credential{stats.expiredCredentials > 1 ? 's' : ''} need immediate renewal.
                      </span>
                    )}
                    {stats.expiredCredentials > 0 && stats.expiringCredentials > 0 && ' '}
                    {stats.expiringCredentials > 0 && (
                      <span className="text-warning font-medium">
                        {stats.expiringCredentials} credential{stats.expiringCredentials > 1 ? 's' : ''} expiring within {expiringDaysFilter} days.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="credentials" className="space-y-4">
          <TabsList>
            <TabsTrigger value="credentials" className="flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              Credentials
            </TabsTrigger>
            <TabsTrigger value="expiring" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Expiring Soon
              {stats.expiringCredentials > 0 && (
                <Badge variant="secondary" className="ml-1">{stats.expiringCredentials}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="expired" className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Expired
              {stats.expiredCredentials > 0 && (
                <Badge variant="destructive" className="ml-1">{stats.expiredCredentials}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Required Training
            </TabsTrigger>
          </TabsList>

          {/* All Credentials Tab */}
          <TabsContent value="credentials" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search credentials or caregivers..." 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="valid">Valid</SelectItem>
                  <SelectItem value="expiring">Expiring</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredCredentials.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <FileCheck className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Credentials Found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' 
                      ? 'Try adjusting your filters'
                      : 'Add credentials to caregivers to track compliance'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {filteredCredentials.map((cred) => (
                      <div key={cred.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-sm font-semibold text-primary">
                                {cred.caregiver.first_name.charAt(0)}{cred.caregiver.last_name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{cred.credential_name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-sm text-muted-foreground">
                                  {cred.caregiver.first_name} {cred.caregiver.last_name}
                                </span>
                                <span className="text-muted-foreground">•</span>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {cred.credential_type}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 sm:ml-auto">
                            {cred.expiry_date && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Calendar className="w-3.5 h-3.5" />
                                {format(new Date(cred.expiry_date), 'MMM d, yyyy')}
                              </div>
                            )}
                            {getStatusBadge(cred.expiry_date)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Expiring Tab */}
          <TabsContent value="expiring" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-warning" />
                  Credentials Expiring Within {expiringDaysFilter} Days
                </CardTitle>
                <CardDescription>
                  Take action before these credentials expire
                </CardDescription>
              </CardHeader>
              <CardContent>
                {getExpiringCredentials().length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                    <h3 className="font-semibold mb-2">All Clear!</h3>
                    <p className="text-sm text-muted-foreground">
                      No credentials expiring in the next {expiringDaysFilter} days
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getExpiringCredentials().map((cred) => {
                      const days = getDaysUntilExpiry(cred.expiry_date);
                      return (
                        <div 
                          key={cred.id} 
                          className="flex items-center justify-between p-4 rounded-lg border border-warning/30 bg-warning/5"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                              <AlertTriangle className="w-5 h-5 text-warning" />
                            </div>
                            <div>
                              <p className="font-medium">{cred.credential_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {cred.caregiver.first_name} {cred.caregiver.last_name}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-warning">{days} days left</p>
                            <p className="text-xs text-muted-foreground">
                              Expires {cred.expiry_date && format(new Date(cred.expiry_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expired Tab */}
          <TabsContent value="expired" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-destructive" />
                  Expired Credentials
                </CardTitle>
                <CardDescription>
                  These credentials need immediate renewal
                </CardDescription>
              </CardHeader>
              <CardContent>
                {getExpiredCredentials().length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                    <h3 className="font-semibold mb-2">All Clear!</h3>
                    <p className="text-sm text-muted-foreground">
                      No expired credentials
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getExpiredCredentials().map((cred) => {
                      const days = getDaysUntilExpiry(cred.expiry_date);
                      return (
                        <div 
                          key={cred.id} 
                          className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                              <XCircle className="w-5 h-5 text-destructive" />
                            </div>
                            <div>
                              <p className="font-medium">{cred.credential_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {cred.caregiver.first_name} {cred.caregiver.last_name}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-destructive">
                              Expired {days !== null && Math.abs(days)} days ago
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Was due {cred.expiry_date && format(new Date(cred.expiry_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Required Training Tab */}
          <TabsContent value="training" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  Required Trainings
                </CardTitle>
                <CardDescription>
                  Mandatory trainings for all active caregivers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {requiredTrainings.map((training) => (
                    <div 
                      key={training.name}
                      className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <GraduationCap className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{training.name}</p>
                          <p className="text-sm text-muted-foreground">{training.description}</p>
                          {training.requiredForAll && (
                            <Badge variant="secondary" className="mt-2 text-xs">
                              Required for all
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
                  <p className="text-sm text-muted-foreground">
                    <strong>Tip:</strong> Add training certifications to caregivers through their profile under the Credentials tab. 
                    Mark the credential type as "training" to track training compliance.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
