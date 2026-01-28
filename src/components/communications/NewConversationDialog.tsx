import { useState, useEffect } from "react";
import { Users, User, Megaphone, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

interface Participant {
  type: "caregiver" | "client";
  id: string;
  name: string;
}

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateConversation: (
    title: string,
    type: "direct" | "group" | "broadcast",
    participants: { participant_type: "admin" | "caregiver" | "client"; participant_id: string; participant_name: string }[]
  ) => Promise<any>;
}

export function NewConversationDialog({
  open,
  onOpenChange,
  onCreateConversation,
}: NewConversationDialogProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"direct" | "group" | "broadcast">("direct");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([]);
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      fetchParticipants();
    }
  }, [open]);

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [caregiversRes, clientsRes] = await Promise.all([
        supabase
          .from("caregivers")
          .select("id, first_name, last_name")
          .eq("user_id", user.id)
          .eq("status", "active"),
        supabase
          .from("clients")
          .select("id, first_name, last_name")
          .eq("user_id", user.id)
          .eq("status", "active"),
      ]);

      const caregivers: Participant[] = (caregiversRes.data || []).map((c) => ({
        type: "caregiver" as const,
        id: c.id,
        name: `${c.first_name} ${c.last_name}`,
      }));

      const clients: Participant[] = (clientsRes.data || []).map((c) => ({
        type: "client" as const,
        id: c.id,
        name: `${c.first_name} ${c.last_name}`,
      }));

      setAvailableParticipants([...caregivers, ...clients]);
    } catch (error) {
      console.error("Error fetching participants:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredParticipants = availableParticipants.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleParticipant = (participant: Participant) => {
    const isSelected = selectedParticipants.some(
      (p) => p.id === participant.id && p.type === participant.type
    );

    if (isSelected) {
      setSelectedParticipants((prev) =>
        prev.filter((p) => !(p.id === participant.id && p.type === participant.type))
      );
    } else {
      if (type === "direct" && selectedParticipants.length >= 1) {
        setSelectedParticipants([participant]);
      } else {
        setSelectedParticipants((prev) => [...prev, participant]);
      }
    }
  };

  const handleCreate = async () => {
    if (selectedParticipants.length === 0) return;

    setCreating(true);
    try {
      const participants = selectedParticipants.map((p) => ({
        participant_type: p.type as "caregiver" | "client",
        participant_id: p.id,
        participant_name: p.name,
      }));

      const convoTitle = title.trim() || selectedParticipants.map((p) => p.name).join(", ");
      await onCreateConversation(convoTitle, type, participants);

      // Reset form
      setTitle("");
      setType("direct");
      setSelectedParticipants([]);
      setSearchQuery("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating conversation:", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            Start a new conversation with caregivers or clients
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Conversation Type</Label>
            <RadioGroup
              value={type}
              onValueChange={(value) => {
                setType(value as "direct" | "group" | "broadcast");
                if (value === "direct" && selectedParticipants.length > 1) {
                  setSelectedParticipants([selectedParticipants[0]]);
                }
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="direct" id="direct" />
                <Label htmlFor="direct" className="flex items-center gap-1 cursor-pointer">
                  <User className="w-4 h-4" /> Direct
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="group" id="group" />
                <Label htmlFor="group" className="flex items-center gap-1 cursor-pointer">
                  <Users className="w-4 h-4" /> Group
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="broadcast" id="broadcast" />
                <Label htmlFor="broadcast" className="flex items-center gap-1 cursor-pointer">
                  <Megaphone className="w-4 h-4" /> Broadcast
                </Label>
              </div>
            </RadioGroup>
          </div>

          {type !== "direct" && (
            <div className="space-y-2">
              <Label htmlFor="title">Conversation Name (Optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter conversation name..."
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Select Participants</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search caregivers or clients..."
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[200px] border rounded-md">
              {loading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading...
                </div>
              ) : filteredParticipants.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  {availableParticipants.length === 0
                    ? "No caregivers or clients available"
                    : "No matches found"}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredParticipants.map((p) => {
                    const isSelected = selectedParticipants.some(
                      (sp) => sp.id === p.id && sp.type === p.type
                    );

                    return (
                      <div
                        key={`${p.type}-${p.id}`}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                        onClick={() => toggleParticipant(p)}
                      >
                        <Checkbox checked={isSelected} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {p.type}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {selectedParticipants.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Selected: {selectedParticipants.map((p) => p.name).join(", ")}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={selectedParticipants.length === 0 || creating}
          >
            {creating ? "Creating..." : "Create Conversation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
