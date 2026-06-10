export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agency_credentials: {
        Row: {
          created_at: string
          credential_name: string
          credential_number: string | null
          credential_type: string
          document_url: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuing_organization: string | null
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credential_name: string
          credential_number?: string | null
          credential_type: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credential_name?: string
          credential_number?: string | null
          credential_type?: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          caregiver_id: string
          client_id: string
          created_at: string
          description: string | null
          end_time: string
          id: string
          notes: string | null
          start_time: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caregiver_id: string
          client_id: string
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          notes?: string | null
          start_time: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caregiver_id?: string
          client_id?: string
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_handoffs: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          picked_up_at: string | null
          picked_up_by_nurse_id: string | null
          reason: string | null
          released_at: string
          released_by_nurse_id: string
          status: string
          user_id: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          picked_up_at?: string | null
          picked_up_by_nurse_id?: string | null
          reason?: string | null
          released_at?: string
          released_by_nurse_id: string
          status?: string
          user_id: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          picked_up_at?: string | null
          picked_up_by_nurse_id?: string | null
          reason?: string | null
          released_at?: string
          released_by_nurse_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_handoffs_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "client_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_handoffs_picked_up_by_nurse_id_fkey"
            columns: ["picked_up_by_nurse_id"]
            isOneToOne: false
            referencedRelation: "nurses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_handoffs_released_by_nurse_id_fkey"
            columns: ["released_by_nurse_id"]
            isOneToOne: false
            referencedRelation: "nurses"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      call_off_events: {
        Row: {
          ai_response: Json | null
          caregiver_id: string | null
          caregiver_name: string | null
          client_id: string | null
          client_name: string | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          payer: string | null
          reason: string
          service_type: string | null
          shift_end: string | null
          shift_start: string
          updated_at: string
          urgency: string
        }
        Insert: {
          ai_response?: Json | null
          caregiver_id?: string | null
          caregiver_name?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          payer?: string | null
          reason: string
          service_type?: string | null
          shift_end?: string | null
          shift_start: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          ai_response?: Json | null
          caregiver_id?: string | null
          caregiver_name?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          payer?: string | null
          reason?: string
          service_type?: string | null
          shift_end?: string | null
          shift_start?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_off_events_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_off_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      care_plans: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          end_date: string | null
          frequency: string | null
          goals: string | null
          id: string
          start_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          frequency?: string | null
          goals?: string | null
          id?: string
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          frequency?: string | null
          goals?: string | null
          id?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_applications: {
        Row: {
          caregiver_id: string
          created_at: string
          form_data: Json
          id: string
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          caregiver_id: string
          created_at?: string
          form_data?: Json
          id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          caregiver_id?: string
          created_at?: string
          form_data?: Json
          id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_applications_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: true
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_availability: {
        Row: {
          caregiver_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean
          notes: string | null
          start_time: string
          user_id: string
        }
        Insert: {
          caregiver_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean
          notes?: string | null
          start_time: string
          user_id: string
        }
        Update: {
          caregiver_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          notes?: string | null
          start_time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_availability_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_credentials: {
        Row: {
          caregiver_id: string
          created_at: string
          credential_name: string
          credential_number: string | null
          credential_type: string
          document_url: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuing_organization: string | null
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caregiver_id: string
          created_at?: string
          credential_name: string
          credential_number?: string | null
          credential_type: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caregiver_id?: string
          created_at?: string
          credential_name?: string
          credential_number?: string | null
          credential_type?: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_credentials_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_skills: {
        Row: {
          caregiver_id: string
          created_at: string
          id: string
          is_certified: boolean | null
          notes: string | null
          proficiency_level: string
          skill_name: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          caregiver_id: string
          created_at?: string
          id?: string
          is_certified?: boolean | null
          notes?: string | null
          proficiency_level?: string
          skill_name: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          caregiver_id?: string
          created_at?: string
          id?: string
          is_certified?: boolean | null
          notes?: string | null
          proficiency_level?: string
          skill_name?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_skills_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
        ]
      }
      caregivers: {
        Row: {
          address: string | null
          auth_user_id: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          first_name: string
          hourly_rate: number | null
          id: string
          last_name: string
          phone: string | null
          service_radius_miles: number | null
          specializations: string[] | null
          ssn_encrypted: string | null
          state: string | null
          status: string
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          hourly_rate?: number | null
          id?: string
          last_name: string
          phone?: string | null
          service_radius_miles?: number | null
          specializations?: string[] | null
          ssn_encrypted?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          hourly_rate?: number | null
          id?: string
          last_name?: string
          phone?: string | null
          service_radius_miles?: number | null
          specializations?: string[] | null
          ssn_encrypted?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      client_assessments: {
        Row: {
          assessment_name: string
          assessment_type: string
          assigned_nurse_id: string | null
          client_id: string
          completed_date: string | null
          created_at: string
          due_date: string
          id: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_name: string
          assessment_type: string
          assigned_nurse_id?: string | null
          client_id: string
          completed_date?: string | null
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_name?: string
          assessment_type?: string
          assigned_nurse_id?: string | null
          client_id?: string
          completed_date?: string | null
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_assessments_assigned_nurse_id_fkey"
            columns: ["assigned_nurse_id"]
            isOneToOne: false
            referencedRelation: "nurses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_caregivers: {
        Row: {
          assigned_date: string
          caregiver_id: string
          client_id: string
          created_at: string
          id: string
          is_active: boolean | null
          notes: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          assigned_date?: string
          caregiver_id: string
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          assigned_date?: string
          caregiver_id?: string
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_caregivers_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_caregivers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          category: string | null
          client_id: string
          created_at: string
          expires_at: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          name: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          client_id: string
          created_at?: string
          expires_at?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          name: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          client_id?: string
          created_at?: string
          expires_at?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          name?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_nurses: {
        Row: {
          assigned_date: string
          client_id: string
          created_at: string
          id: string
          is_active: boolean | null
          notes: string | null
          nurse_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          assigned_date?: string
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          nurse_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          assigned_date?: string
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          nurse_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_nurses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_nurses_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "nurses"
            referencedColumns: ["id"]
          },
        ]
      }
      client_required_skills: {
        Row: {
          client_id: string
          created_at: string
          id: string
          minimum_proficiency: string | null
          notes: string | null
          priority: string
          requires_certification: boolean | null
          skill_name: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          minimum_proficiency?: string | null
          notes?: string | null
          priority?: string
          requires_certification?: boolean | null
          skill_name: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          minimum_proficiency?: string | null
          notes?: string | null
          priority?: string
          requires_certification?: boolean | null
          skill_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_required_skills_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          authorization_due_date: string | null
          authorization_expiration_date: string | null
          city: string | null
          client_class: string | null
          client_hours: number | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          state: string | null
          status: string
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          authorization_due_date?: string | null
          authorization_expiration_date?: string | null
          city?: string | null
          client_class?: string | null
          client_hours?: number | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          authorization_due_date?: string | null
          authorization_expiration_date?: string | null
          city?: string | null
          client_class?: string | null
          client_hours?: number | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          participant_id: string
          participant_name: string
          participant_type: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          participant_id: string
          participant_name: string
          participant_type: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          participant_id?: string
          participant_name?: string
          participant_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      evv_corrections: {
        Row: {
          ai_note: Json | null
          appointment_id: string | null
          created_at: string
          created_by: string
          exception_type: string
          id: string
        }
        Insert: {
          ai_note?: Json | null
          appointment_id?: string | null
          created_at?: string
          created_by?: string
          exception_type: string
          id?: string
        }
        Update: {
          ai_note?: Json | null
          appointment_id?: string | null
          created_at?: string
          created_by?: string
          exception_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evv_corrections_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      form_signatures: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          signature_data: string | null
          signed_at: string | null
          signer_email: string | null
          signer_id: string | null
          signer_name: string
          signer_type: string
          signing_method: string | null
          status: string
          submission_id: string
          token: string | null
          token_expires_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          signature_data?: string | null
          signed_at?: string | null
          signer_email?: string | null
          signer_id?: string | null
          signer_name: string
          signer_type: string
          signing_method?: string | null
          status?: string
          submission_id: string
          token?: string | null
          token_expires_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          signature_data?: string | null
          signed_at?: string | null
          signer_email?: string | null
          signer_id?: string | null
          signer_name?: string
          signer_type?: string
          signing_method?: string | null
          status?: string
          submission_id?: string
          token?: string | null
          token_expires_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_signatures_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          form_data: Json
          id: string
          status: string
          submitted_at: string | null
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          form_data?: Json
          id?: string
          status?: string
          submitted_at?: string | null
          template_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          form_data?: Json
          id?: string
          status?: string
          submitted_at?: string | null
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          fields: Json
          id: string
          is_active: boolean | null
          name: string
          template_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean | null
          name: string
          template_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          template_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_policies: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          content: string
          created_at: string
          id: string
          regulation_id: string
          status: string
          title: string
          updated_at: string
          user_id: string
          version: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          content: string
          created_at?: string
          id?: string
          regulation_id: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          version?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          content?: string
          created_at?: string
          id?: string
          regulation_id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_policies_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "state_regulations"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_assignments: {
        Row: {
          assigned_by: string | null
          attempts: number
          caregiver_id: string
          completed_at: string | null
          course_id: string
          created_at: string
          due_date: string | null
          id: string
          score: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          attempts?: number
          caregiver_id: string
          completed_at?: string | null
          course_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          score?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          attempts?: number
          caregiver_id?: string
          completed_at?: string | null
          course_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          score?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_assignments_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_courses: {
        Row: {
          category: string | null
          content_body: string | null
          content_type: string
          content_url: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean
          is_required: boolean
          passing_score: number | null
          required_for_role: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          content_body?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          passing_score?: number | null
          required_for_role?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          content_body?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          passing_score?: number | null
          required_for_role?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lms_policies: {
        Row: {
          category: string | null
          content: string
          created_at: string
          description: string | null
          effective_date: string
          id: string
          is_active: boolean
          requires_acknowledgment: boolean
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          description?: string | null
          effective_date?: string
          id?: string
          is_active?: boolean
          requires_acknowledgment?: boolean
          title: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          description?: string | null
          effective_date?: string
          id?: string
          is_active?: boolean
          requires_acknowledgment?: boolean
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      lms_policy_acknowledgments: {
        Row: {
          acknowledged_at: string
          caregiver_id: string
          created_at: string
          id: string
          ip_address: string | null
          notes: string | null
          policy_id: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          caregiver_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          notes?: string | null
          policy_id: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          caregiver_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          notes?: string | null
          policy_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_policy_acknowledgments_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_policy_acknowledgments_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "lms_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_quiz_questions: {
        Row: {
          correct_answer: string
          course_id: string
          created_at: string
          id: string
          options: Json
          points: number
          question_text: string
          question_type: string
          sort_order: number
          user_id: string
        }
        Insert: {
          correct_answer: string
          course_id: string
          created_at?: string
          id?: string
          options?: Json
          points?: number
          question_text: string
          question_type?: string
          sort_order?: number
          user_id: string
        }
        Update: {
          correct_answer?: string
          course_id?: string
          created_at?: string
          id?: string
          options?: Json
          points?: number
          question_text?: string
          question_type?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_quiz_questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_history: {
        Row: {
          client_id: string
          condition_name: string
          created_at: string
          diagnosis_date: string | null
          id: string
          is_current: boolean | null
          notes: string | null
          severity: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          condition_name: string
          created_at?: string
          diagnosis_date?: string | null
          id?: string
          is_current?: boolean | null
          notes?: string | null
          severity?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          condition_name?: string
          created_at?: string
          diagnosis_date?: string | null
          id?: string
          is_current?: boolean | null
          notes?: string | null
          severity?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          message_type: string
          sender_id: string
          sender_name: string
          sender_type: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          sender_id: string
          sender_name: string
          sender_type: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          sender_id?: string
          sender_name?: string
          sender_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_calendar_assignments: {
        Row: {
          attendant_care_hours: number
          caregiver_id: string
          client_id: string
          created_at: string
          id: string
          is_active: boolean
          is_archoices: boolean
          personal_care_hours: number
          standard_hours: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attendant_care_hours?: number
          caregiver_id: string
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_archoices?: boolean
          personal_care_hours?: number
          standard_hours?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attendant_care_hours?: number
          caregiver_id?: string
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_archoices?: boolean
          personal_care_hours?: number
          standard_hours?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_calendar_assignments_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_calendar_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_calendars: {
        Row: {
          assignment_id: string
          created_at: string
          generated_at: string
          id: string
          month: number
          schedule_data: Json
          total_hours: number
          user_id: string
          year: number
        }
        Insert: {
          assignment_id: string
          created_at?: string
          generated_at?: string
          id?: string
          month: number
          schedule_data?: Json
          total_hours?: number
          user_id: string
          year: number
        }
        Update: {
          assignment_id?: string
          created_at?: string
          generated_at?: string
          id?: string
          month?: number
          schedule_data?: Json
          total_hours?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_calendars_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "monthly_calendar_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          assessment_expiry_alerts: boolean
          created_at: string
          credential_expiry_alerts: boolean | null
          days_before_expiry: number
          email_enabled: boolean
          handoff_alerts: boolean
          id: string
          nurse_id: string | null
          sms_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_expiry_alerts?: boolean
          created_at?: string
          credential_expiry_alerts?: boolean | null
          days_before_expiry?: number
          email_enabled?: boolean
          handoff_alerts?: boolean
          id?: string
          nurse_id?: string | null
          sms_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_expiry_alerts?: boolean
          created_at?: string
          credential_expiry_alerts?: boolean | null
          days_before_expiry?: number
          email_enabled?: boolean
          handoff_alerts?: boolean
          id?: string
          nurse_id?: string | null
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "nurses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          email_sent: boolean | null
          email_sent_at: string | null
          error_message: string | null
          id: string
          message: string
          notification_type: string
          recipient_email: string | null
          recipient_nurse_id: string | null
          recipient_phone: string | null
          related_id: string | null
          sms_sent: boolean | null
          sms_sent_at: string | null
          subject: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          notification_type: string
          recipient_email?: string | null
          recipient_nurse_id?: string | null
          recipient_phone?: string | null
          related_id?: string | null
          sms_sent?: boolean | null
          sms_sent_at?: string | null
          subject: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          notification_type?: string
          recipient_email?: string | null
          recipient_nurse_id?: string | null
          recipient_phone?: string | null
          related_id?: string | null
          sms_sent?: boolean | null
          sms_sent_at?: string | null
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_nurse_id_fkey"
            columns: ["recipient_nurse_id"]
            isOneToOne: false
            referencedRelation: "nurses"
            referencedColumns: ["id"]
          },
        ]
      }
      nurse_credentials: {
        Row: {
          created_at: string
          credential_name: string
          credential_number: string | null
          credential_type: string
          document_url: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuing_organization: string | null
          notes: string | null
          nurse_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credential_name: string
          credential_number?: string | null
          credential_type: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization?: string | null
          notes?: string | null
          nurse_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credential_name?: string
          credential_number?: string | null
          credential_type?: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization?: string | null
          notes?: string | null
          nurse_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nurse_credentials_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "nurses"
            referencedColumns: ["id"]
          },
        ]
      }
      nurses: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          first_name: string
          hourly_rate: number | null
          id: string
          last_name: string
          license_expiry: string | null
          license_number: string | null
          license_state: string | null
          notes: string | null
          phone: string | null
          specializations: string[] | null
          state: string | null
          status: string
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          hourly_rate?: number | null
          id?: string
          last_name: string
          license_expiry?: string | null
          license_number?: string | null
          license_state?: string | null
          notes?: string | null
          phone?: string | null
          specializations?: string[] | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          hourly_rate?: number | null
          id?: string
          last_name?: string
          license_expiry?: string | null
          license_number?: string | null
          license_state?: string | null
          notes?: string | null
          phone?: string | null
          specializations?: string[] | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      orientation_modules: {
        Row: {
          audio_url: string | null
          content: string
          created_at: string
          id: string
          section_number: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          content: string
          created_at?: string
          id?: string
          section_number: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_url?: string | null
          content?: string
          created_at?: string
          id?: string
          section_number?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orientation_progress: {
        Row: {
          caregiver_id: string
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          current_section: number
          id: string
          quiz_scores: Json
          sections_completed: Json
          signature_data: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          caregiver_id: string
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          current_section?: number
          id?: string
          quiz_scores?: Json
          sections_completed?: Json
          signature_data?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          caregiver_id?: string
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          current_section?: number
          id?: string
          quiz_scores?: Json
          sections_completed?: Json
          signature_data?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orientation_progress_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
        ]
      }
      orientation_quizzes: {
        Row: {
          correct_answer: string
          created_at: string
          id: string
          options: Json
          points: number
          question_text: string
          section_number: number
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          id?: string
          options?: Json
          points?: number
          question_text: string
          section_number: number
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          id?: string
          options?: Json
          points?: number
          question_text?: string
          section_number?: number
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      state_regulations: {
        Row: {
          category: string | null
          created_at: string
          effective_date: string | null
          id: string
          is_predefined: boolean | null
          regulation_code: string | null
          regulation_description: string | null
          regulation_name: string
          source_url: string | null
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          effective_date?: string | null
          id?: string
          is_predefined?: boolean | null
          regulation_code?: string | null
          regulation_description?: string | null
          regulation_name: string
          source_url?: string | null
          state: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          effective_date?: string | null
          id?: string
          is_predefined?: boolean | null
          regulation_code?: string | null
          regulation_description?: string | null
          regulation_name?: string
          source_url?: string | null
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      orientation_quizzes_public: {
        Row: {
          created_at: string | null
          id: string | null
          options: Json | null
          points: number | null
          question_text: string | null
          section_number: number | null
          sort_order: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          options?: Json | null
          points?: number | null
          question_text?: string | null
          section_number?: number | null
          sort_order?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          options?: Json | null
          points?: number | null
          question_text?: string | null
          section_number?: number | null
          sort_order?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      decrypt_ssn: { Args: { encrypted_ssn: string }; Returns: string }
      encrypt_ssn: { Args: { plain_ssn: string }; Returns: string }
      encrypt_ssn_for_caregiver: {
        Args: { p_caregiver_id: string; p_ssn: string }
        Returns: undefined
      }
      get_caregiver_ssn_masked: {
        Args: { p_caregiver_id: string }
        Returns: string
      }
      get_masked_ssn: { Args: { encrypted_ssn: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "caregiver"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "caregiver"],
    },
  },
} as const
