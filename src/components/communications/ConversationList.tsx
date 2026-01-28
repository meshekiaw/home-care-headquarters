import { format } from "date-fns";
import { Users, User, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Conversation } from "@/hooks/useMessages";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  const getConversationIcon = (type: string) => {
    switch (type) {
      case "group":
        return <Users className="w-4 h-4" />;
      case "broadcast":
        return <Megaphone className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getConversationTitle = (convo: Conversation) => {
    if (convo.title) return convo.title;
    if (convo.participants && convo.participants.length > 0) {
      return convo.participants.map((p) => p.participant_name).join(", ");
    }
    return "Untitled Conversation";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
        <Users className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-sm text-center">No conversations yet</p>
        <p className="text-xs text-center mt-1">Start a new conversation to begin messaging</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {conversations.map((convo) => {
          const title = getConversationTitle(convo);
          const isSelected = convo.id === selectedId;

          return (
            <button
              key={convo.id}
              onClick={() => onSelect(convo)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarFallback className={cn(
                  isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                )}>
                  {getInitials(title)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn(
                      "font-medium truncate",
                      isSelected ? "text-primary-foreground" : "text-foreground"
                    )}>
                      {title}
                    </span>
                    <span className={cn(
                      "flex-shrink-0",
                      isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {getConversationIcon(convo.type)}
                    </span>
                  </div>
                  {convo.unreadCount && convo.unreadCount > 0 && !isSelected && (
                    <Badge variant="default" className="flex-shrink-0">
                      {convo.unreadCount}
                    </Badge>
                  )}
                </div>

                {convo.lastMessage && (
                  <p className={cn(
                    "text-sm truncate mt-1",
                    isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {convo.lastMessage.content}
                  </p>
                )}

                <p className={cn(
                  "text-xs mt-1",
                  isSelected ? "text-primary-foreground/60" : "text-muted-foreground"
                )}>
                  {format(new Date(convo.updated_at), "MMM d, h:mm a")}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
