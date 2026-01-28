import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Message } from "@/hooks/useMessages";

interface MessageThreadProps {
  messages: Message[];
  currentUserId?: string;
}

export function MessageThread({ messages, currentUserId }: MessageThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getSenderTypeColor = (type: string) => {
    switch (type) {
      case "admin":
        return "bg-primary text-primary-foreground";
      case "caregiver":
        return "bg-success text-success-foreground";
      case "client":
        return "bg-secondary text-secondary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">No messages yet</p>
        <p className="text-xs mt-1">Send a message to start the conversation</p>
      </div>
    );
  }

  // Group messages by date
  const groupedMessages: { [date: string]: Message[] } = {};
  messages.forEach((msg) => {
    const date = format(new Date(msg.created_at), "yyyy-MM-dd");
    if (!groupedMessages[date]) {
      groupedMessages[date] = [];
    }
    groupedMessages[date].push(msg);
  });

  return (
    <ScrollArea className="h-full px-4">
      <div className="space-y-6 py-4">
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            <div className="flex items-center justify-center mb-4">
              <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {format(new Date(date), "MMMM d, yyyy")}
              </span>
            </div>

            <div className="space-y-4">
              {msgs.map((msg) => {
                const isOwn = msg.sender_id === currentUserId;

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3",
                      isOwn ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className={getSenderTypeColor(msg.sender_type)}>
                        {getInitials(msg.sender_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className={cn(
                      "flex flex-col max-w-[70%]",
                      isOwn ? "items-end" : "items-start"
                    )}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">
                          {msg.sender_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(msg.created_at), "h:mm a")}
                        </span>
                      </div>

                      <div className={cn(
                        "rounded-2xl px-4 py-2",
                        isOwn
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-muted rounded-tl-none"
                      )}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  );
}
