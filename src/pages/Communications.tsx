import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Search, Send, Phone, Video, MoreVertical } from "lucide-react";

export default function Communications() {
  const conversations = [
    { name: "Maria Santos", message: "Visit completed for Mrs. Thompson", time: "2 min ago", unread: true },
    { name: "David Wilson", message: "Need to reschedule tomorrow's appointment", time: "15 min ago", unread: true },
    { name: "Sarah Johnson", message: "Client care plan updated", time: "1 hour ago", unread: false },
    { name: "Robert Chen (Client)", message: "Thank you for the great care!", time: "2 hours ago", unread: false },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Communications</h2>
          <p className="text-muted-foreground">Message clients, caregivers, and team members</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 h-[calc(100vh-220px)] min-h-[500px]">
          {/* Conversation List */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search conversations..." className="pl-10" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {conversations.map((conv, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 hover:bg-secondary/50 cursor-pointer transition-colors ${idx === 0 ? 'bg-secondary/50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-medium text-sm">
                          {conv.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium truncate">{conv.name}</h4>
                          <span className="text-xs text-muted-foreground">{conv.time}</span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{conv.message}</p>
                      </div>
                      {conv.unread && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 flex flex-col">
            <CardHeader className="border-b border-border py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-medium">MS</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">Maria Santos</h3>
                    <p className="text-xs text-muted-foreground">Caregiver • Online</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex justify-start">
                  <div className="max-w-[70%] bg-secondary rounded-2xl rounded-tl-sm px-4 py-2">
                    <p className="text-sm">Visit completed for Mrs. Thompson. She's doing well today!</p>
                    <span className="text-xs text-muted-foreground">2:30 PM</span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[70%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2">
                    <p className="text-sm">Great work! Did you update her care notes?</p>
                    <span className="text-xs text-primary-foreground/70">2:32 PM</span>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[70%] bg-secondary rounded-2xl rounded-tl-sm px-4 py-2">
                    <p className="text-sm">Yes, all documentation is complete. I'll send the summary shortly.</p>
                    <span className="text-xs text-muted-foreground">2:33 PM</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Input placeholder="Type a message..." className="flex-1" />
                <Button size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
