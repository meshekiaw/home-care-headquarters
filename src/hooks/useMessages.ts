import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  sender_type: "admin" | "caregiver" | "client";
  sender_id: string;
  sender_name: string;
  content: string;
  message_type: "text" | "image" | "file" | "voice";
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  type: "direct" | "group" | "broadcast";
  created_at: string;
  updated_at: string;
  participants?: ConversationParticipant[];
  lastMessage?: Message;
  unreadCount?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  participant_type: "admin" | "caregiver" | "client";
  participant_id: string;
  participant_name: string;
  joined_at: string;
  last_read_at: string | null;
}

export function useMessages(conversationId?: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: convos, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Fetch participants and last message for each conversation
      const conversationsWithDetails = await Promise.all(
        (convos || []).map(async (convo) => {
          const { data: participants } = await supabase
            .from("conversation_participants")
            .select("*")
            .eq("conversation_id", convo.id);

          const { data: lastMessages } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", convo.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const { count: unreadCount } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", convo.id)
            .eq("is_read", false);

          return {
            ...convo,
            participants: participants || [],
            lastMessage: lastMessages?.[0],
            unreadCount: unreadCount || 0,
          } as Conversation;
        })
      );

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a conversation
  const fetchMessages = async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data || []) as Message[]);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // Create a new conversation
  const createConversation = async (
    title: string,
    type: "direct" | "group" | "broadcast",
    participants: Omit<ConversationParticipant, "id" | "conversation_id" | "user_id" | "joined_at" | "last_read_at">[]
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: convo, error: convoError } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          title,
          type,
        })
        .select()
        .single();

      if (convoError) throw convoError;

      // Add participants
      const participantsData = participants.map((p) => ({
        conversation_id: convo.id,
        user_id: user.id,
        participant_type: p.participant_type,
        participant_id: p.participant_id,
        participant_name: p.participant_name,
      }));

      const { error: participantError } = await supabase
        .from("conversation_participants")
        .insert(participantsData);

      if (participantError) throw participantError;

      await fetchConversations();
      return convo;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Send a message
  const sendMessage = async (
    convId: string,
    content: string,
    senderType: "admin" | "caregiver" | "client" = "admin",
    senderId: string,
    senderName: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("messages").insert({
        conversation_id: convId,
        user_id: user.id,
        sender_type: senderType,
        sender_id: senderId,
        sender_name: senderName,
        content,
        message_type: "text",
      });

      if (error) throw error;

      // Update conversation's updated_at
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId);

      await fetchConversations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Mark messages as read
  const markAsRead = async (convId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", convId)
        .eq("is_read", false);

      await fetchConversations();
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  // Subscribe to real-time messages
  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId);
      markAsRead(conversationId);
    }
  }, [conversationId]);

  // Real-time subscription
  useEffect(() => {
    const channelConfig: {
      event: "INSERT";
      schema: "public";
      table: "messages";
      filter?: string;
    } = {
      event: "INSERT",
      schema: "public",
      table: "messages",
    };

    if (conversationId) {
      channelConfig.filter = `conversation_id=eq.${conversationId}`;
    }

    const channel = supabase
      .channel(`messages-realtime-${conversationId || "all"}`)
      .on(
        "postgres_changes",
        channelConfig,
        (payload) => {
          const newMessage = payload.new as Message;
          
          if (conversationId && newMessage.conversation_id === conversationId) {
            setMessages((prev) => [...prev, newMessage]);
          }
          
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return {
    conversations,
    messages,
    loading,
    createConversation,
    sendMessage,
    markAsRead,
    refreshConversations: fetchConversations,
  };
}
