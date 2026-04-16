import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Phone, 
  Mail,
  MapPin,
  Users,
  Filter,
  Download,
  Upload,
  X,
  Trash2,
  Printer,
  MessageSquare,
  ChevronDown,
  UserPlus,
  ArrowUpDown
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { downloadCSV, formatClientForExport } from "@/utils/csvExport";
import BulkImportDialog from "@/components/clients/BulkImportDialog";
import type { ParsedClient } from "@/utils/csvParser";
import { Badge } from "@/components/ui/badge";
import {
  addMonthsToDate,
  compareDateOnly,
  formatDateOnly,
  formatDateOnlyYearMonth,
  getDateOnlyYearMonth,
} from "@/utils/dateOnly";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  status: string;
  created_at: string;
  authorization_due_date: string | null;
  authorization_expiration_date: string | null;
  client_class: string | null;
  client_hours: number | null;
}

type SortOption = 'name' | 'city' | 'status' | 'created_at' | 'authorization_due_date' | 'authorization_expiration_date';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dueDateMonth, setDueDateMonth] = useState("all");
  const [expirationDateMonth, setExpirationDateMonth] = useState("all");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading clients",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkImport(parsedClients: ParsedClient[]): Promise<{ success: number; failed: number }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to import clients", variant: "destructive" });
      return { success: 0, failed: parsedClients.length };
    }

    let success = 0;
    let failed = 0;

    for (const client of parsedClients) {
      const { error } = await supabase.from('clients').insert({
        ...client,
        user_id: user.id,
      });

      if (error) {
        console.error("Failed to import client:", client, error);
        failed++;
      } else {
        success++;
      }
    }

    if (success > 0) {
      fetchClients();
      toast({ title: "Import complete", description: `Successfully imported ${success} clients` });
    }

    return { success, failed };
  }

  const filteredClients = clients.filter(client => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = (
      client.first_name.toLowerCase().includes(searchLower) ||
      client.last_name.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.phone?.includes(searchQuery)
    );
    if (!matchesSearch) return false;
    if (statusFilter !== "all" && client.status !== statusFilter) return false;
    if (dueDateMonth !== "all") {
      if (!client.authorization_due_date) return false;
      if (getDateOnlyYearMonth(client.authorization_due_date) !== dueDateMonth) return false;
    }
    if (expirationDateMonth !== "all") {
      if (!client.authorization_expiration_date) return false;
      if (getDateOnlyYearMonth(client.authorization_expiration_date) !== expirationDateMonth) return false;
    }
    return true;
  });

  const sortedClients = [...filteredClients].sort((a, b) => {
    switch (sortBy) {
      case 'city':
        if (!a.city && !b.city) return 0;
        if (!a.city) return 1;
        if (!b.city) return -1;
        return a.city.localeCompare(b.city);
      case 'status': {
        const order: Record<string, number> = { active: 0, pending: 1, inactive: 2 };
        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
      }
      case 'created_at':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'authorization_due_date':
      case 'authorization_expiration_date': {
        const dateA = a[sortBy];
        const dateB = b[sortBy];
        return compareDateOnly(dateA, dateB);
      }
      case 'name':
      default:
        return a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name);
    }
  });

  // Clear selection when search changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchQuery]);

  const formatYearMonth = (dateStr: string) => {
    return getDateOnlyYearMonth(dateStr) ?? "";
  };

  const formatYearMonthLabel = (ym: string) => {
    return formatDateOnlyYearMonth(ym) ?? ym;
  };

  const dueDateMonths = [...new Set(
    clients.filter(c => c.authorization_due_date).map(c => formatYearMonth(c.authorization_due_date!))
  )].sort();

  const expirationDateMonths = [...new Set(
    clients.filter(c => c.authorization_expiration_date).map(c => formatYearMonth(c.authorization_expiration_date!))
  )].sort();

  const activeFilterCount = [statusFilter !== "all", dueDateMonth !== "all", expirationDateMonth !== "all"].filter(Boolean).length;

  const allSelected = sortedClients.length > 0 && sortedClients.every(c => selectedIds.has(c.id));
  const someSelected = sortedClients.some(c => selectedIds.has(c.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedClients.map(c => c.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success';
      case 'inactive': return 'bg-muted text-muted-foreground';
      case 'pending': return 'bg-warning/10 text-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Clients</h2>
            <p className="text-muted-foreground">Manage your client profiles and care plans</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setImportDialogOpen(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                const exportData = clients.map(formatClientForExport);
                downloadCSV(exportData, `clients-${new Date().toISOString().split('T')[0]}`);
                toast({ title: "Export complete", description: `Exported ${clients.length} clients` });
              }}
              disabled={clients.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Link to="/clients/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add New Client
              </Button>
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search clients by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[200px]">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="city">City</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="created_at">Date Added</SelectItem>
              <SelectItem value="authorization_due_date">Current 618 Date</SelectItem>
              <SelectItem value="authorization_expiration_date">Auth Expiration Date</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="sm:w-auto relative" onClick={() => setFilterOpen(!filterOpen)}>
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="default" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Filter Bar */}
        {filterOpen && (
          <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/50 border rounded-lg">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Current 618 Date Month</label>
              <Select value={dueDateMonth} onValueChange={setDueDateMonth}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {dueDateMonths.map(ym => (
                    <SelectItem key={ym} value={ym}>{formatYearMonthLabel(ym)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Auth Expiration Month</label>
              <Select value={expirationDateMonth} onValueChange={setExpirationDateMonth}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {expirationDateMonths.map(ym => (
                    <SelectItem key={ym} value={ym}>{formatYearMonthLabel(ym)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("all"); setDueDateMonth("all"); setExpirationDateMonth("all"); }}>
                <X className="w-4 h-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            
            {/* Change Status */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Change Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {["active", "inactive", "pending"].map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={async () => {
                      try {
                        const { error } = await supabase
                          .from('clients')
                          .update({ status })
                          .in('id', [...selectedIds]);
                        if (error) throw error;
                        toast({ title: "Status updated", description: `${selectedIds.size} clients set to ${status}` });
                        setSelectedIds(new Set());
                        fetchClients();
                      } catch (error: any) {
                        toast({ title: "Error", description: error.message, variant: "destructive" });
                      }
                    }}
                  >
                    <span className="capitalize">{status}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export Selected */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const selected = clients.filter(c => selectedIds.has(c.id));
                const exportData = selected.map(formatClientForExport);
                downloadCSV(exportData, `clients-selected-${new Date().toISOString().split('T')[0]}`);
                toast({ title: "Export complete", description: `Exported ${selected.length} clients` });
              }}
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>

            {/* Print Selected */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const selected = clients.filter(c => selectedIds.has(c.id));
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(`
                    <html><head><title>Selected Clients</title>
                    <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style>
                    </head><body><h1>Selected Clients (${selected.length})</h1>
                    <table><tr><th>Name</th><th>Phone</th><th>Email</th><th>City</th><th>Status</th></tr>
                    ${selected.map(c => `<tr><td>${c.first_name} ${c.last_name}</td><td>${c.phone || '-'}</td><td>${c.email || '-'}</td><td>${c.city || '-'}</td><td>${c.status}</td></tr>`).join('')}
                    </table></body></html>`);
                  printWindow.document.close();
                  printWindow.print();
                }
              }}
            >
              <Printer className="w-4 h-4 mr-1" />
              Print
            </Button>

            {/* Send Message */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/communications')}
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              Message
            </Button>

            {/* Delete Selected */}
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>

            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              <X className="w-4 h-4 mr-1" />
              Deselect All
            </Button>
          </div>
        )}

        {/* Clients Table/List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : sortedClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? "No clients found" : "No clients yet"}
                </h3>
                <p className="text-muted-foreground mb-4 max-w-sm">
                  {searchQuery 
                    ? "Try adjusting your search terms" 
                    : "Get started by adding your first client to the system"}
                </p>
                {!searchQuery && (
                  <Link to="/clients/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Client
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleAll}
                          aria-label="Select all"
                          {...(someSelected && !allSelected ? { "data-state": "indeterminate" as any } : {})}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      {sortBy === 'authorization_due_date' && <TableHead>Current 618 Date</TableHead>}
                      {sortBy === 'authorization_expiration_date' && <TableHead>Auth Expiration</TableHead>}
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedClients.map((client) => (
                      <TableRow key={client.id} className="hover:bg-muted/50" data-state={selectedIds.has(client.id) ? "selected" : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(client.id)}
                            onCheckedChange={() => toggleOne(client.id)}
                            aria-label={`Select ${client.first_name} ${client.last_name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Link 
                            to={`/clients/${client.id}`}
                            className="flex items-center gap-3 hover:text-primary transition-colors"
                          >
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-primary font-medium">
                                {client.first_name.charAt(0)}{client.last_name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{client.first_name} {client.last_name}</p>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {client.phone && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="w-3.5 h-3.5" />
                                {client.phone}
                              </div>
                            )}
                            {client.email && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="w-3.5 h-3.5" />
                                {client.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {client.city && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="w-3.5 h-3.5" />
                              {client.city}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${getStatusColor(client.status)}`}>
                            {client.status}
                          </span>
                        </TableCell>
                        {sortBy === 'authorization_due_date' && (
                          <TableCell className="text-sm text-muted-foreground">
                            {client.authorization_due_date
                              ? formatDateOnly(client.authorization_due_date, { month: 'short', day: 'numeric', year: 'numeric' })
                              : '—'}
                          </TableCell>
                        )}
                        {sortBy === 'authorization_expiration_date' && (
                          <TableCell className="text-sm text-muted-foreground">
                            {client.authorization_expiration_date
                              ? formatDateOnly(client.authorization_expiration_date, { month: 'short', day: 'numeric', year: 'numeric' })
                              : '—'}
                          </TableCell>
                        )}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/clients/${client.id}`}>View Profile</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/clients/${client.id}/edit`}>Edit Client</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                Delete Client
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BulkImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleBulkImport}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} client{selectedIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All selected clients and their associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                try {
                  const { error } = await supabase
                    .from('clients')
                    .delete()
                    .in('id', [...selectedIds]);
                  if (error) throw error;
                  toast({ title: "Deleted", description: `${selectedIds.size} clients removed` });
                  setSelectedIds(new Set());
                  fetchClients();
                } catch (error: any) {
                  toast({ title: "Error", description: error.message, variant: "destructive" });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
