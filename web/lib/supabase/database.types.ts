/**
 * Dihasilkan oleh `pnpm db:types`, DITAMBAH TANGAN untuk objek migrasi Fase 1–2: kolom
 * `profiles.satusehat_consent` dan fungsi accept_/decline_caregiver_invite, caregiver_patient_names,
 * psychologist_clients, patient_caregivers, my_access_log, log_access_batch, psychologist_mfa_ok.
 * Fase 4 (migrasi 20261014000500): book_consultation, psychologist_booked_slots, psychologist_schedule.
 * Gelombang 1 (migrasi 20261014000600): profiles.share_region_stats, tabel admin_actions, fungsi
 * psychologist_available_slots, delete_my_account, admin_pending_psychologists, admin_review_psychologist.
 * Temuan #13 (migrasi 20261016000000): profiles.requested_str_number, admin_pending_psychologist_applications.
 *
 * Migrasi 20261014000100–000300 sudah diterapkan ke proyek cloud (14 Okt 2026). Nama argumen, tipe hasil,
 * dan kolom tiap fungsi di atas sudah dicocokkan dengan `pg_get_function_arguments/result` di cloud.
 * Jalankan `pnpm db:types` (butuh SUPABASE_ACCESS_TOKEN) untuk menggantikan berkas ini sepenuhnya.
 */
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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          activities: Json
          date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activities?: Json
          date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activities?: Json
          date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_actions: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          detail: Json
          id: number
          target_id: string | null
          target_name: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      ai_conversations: {
        Row: {
          created_at: string
          crisis_detected: boolean
          id: string
          messages: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crisis_detected?: boolean
          id?: string
          messages?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          crisis_detected?: boolean
          id?: string
          messages?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_clients: {
        Row: {
          created_at: string
          facility_id: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          owner_id: string
          revoked_at: string | null
          scopes: string[]
        }
        Insert: {
          created_at?: string
          facility_id?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          owner_id: string
          revoked_at?: string | null
          scopes?: string[]
        }
        Update: {
          created_at?: string
          facility_id?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          owner_id?: string
          revoked_at?: string | null
          scopes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "api_clients_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_clients_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          answers: Json
          category: string | null
          completed_at: string
          created_at: string
          id: string
          satusehat_observation_id: string | null
          sent_to_satusehat: boolean
          total_score: number
          type: string
          user_id: string
        }
        Insert: {
          answers?: Json
          category?: string | null
          completed_at?: string
          created_at?: string
          id?: string
          satusehat_observation_id?: string | null
          sent_to_satusehat?: boolean
          total_score?: number
          type: string
          user_id: string
        }
        Update: {
          answers?: Json
          category?: string | null
          completed_at?: string
          created_at?: string
          id?: string
          satusehat_observation_id?: string | null
          sent_to_satusehat?: boolean
          total_score?: number
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      care_links: {
        Row: {
          consented_at: string
          id: string
          patient_id: string
          permissions: Json
          psychologist_id: string
          revoked_at: string | null
          status: string
        }
        Insert: {
          consented_at?: string
          id?: string
          patient_id: string
          permissions?: Json
          psychologist_id: string
          revoked_at?: string | null
          status?: string
        }
        Update: {
          consented_at?: string
          id?: string
          patient_id?: string
          permissions?: Json
          psychologist_id?: string
          revoked_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_links_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_links_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "psychologists"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_relationships: {
        Row: {
          caregiver_id: string | null
          caregiver_phone: string | null
          created_at: string
          id: string
          invite_code: string
          patient_id: string
          permissions: Json
          status: string
          updated_at: string
        }
        Insert: {
          caregiver_id?: string | null
          caregiver_phone?: string | null
          created_at?: string
          id?: string
          invite_code: string
          patient_id: string
          permissions?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          caregiver_id?: string | null
          caregiver_phone?: string | null
          created_at?: string
          id?: string
          invite_code?: string
          patient_id?: string
          permissions?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_relationships_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caregiver_relationships_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_messages: {
        Row: {
          consultation_id: string
          id: string
          is_read: boolean
          message_text: string
          sender_id: string
          sent_at: string
        }
        Insert: {
          consultation_id: string
          id?: string
          is_read?: boolean
          message_text: string
          sender_id: string
          sent_at?: string
        }
        Update: {
          consultation_id?: string
          id?: string
          is_read?: boolean
          message_text?: string
          sender_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_messages_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          agora_channel_name: string | null
          agora_token: string | null
          booking_fee: number
          created_at: string
          duration_minutes: number
          ended_at: string | null
          id: string
          notes_for_patient: string | null
          psychologist_id: string
          scheduled_at: string
          session_summary: string | null
          status: string
          updated_at: string
          user_id: string
          video_call_started_at: string | null
        }
        Insert: {
          agora_channel_name?: string | null
          agora_token?: string | null
          booking_fee?: number
          created_at?: string
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          notes_for_patient?: string | null
          psychologist_id: string
          scheduled_at: string
          session_summary?: string | null
          status?: string
          updated_at?: string
          user_id: string
          video_call_started_at?: string | null
        }
        Update: {
          agora_channel_name?: string | null
          agora_token?: string | null
          booking_fee?: number
          created_at?: string
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          notes_for_patient?: string | null
          psychologist_id?: string
          scheduled_at?: string
          session_summary?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_call_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "psychologists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crisis_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          id: string
          severity: string
          source: string
          source_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          severity: string
          source: string
          source_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          severity?: string
          source?: string
          source_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crisis_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crisis_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_access_logs: {
        Row: {
          action: string
          actor_id: string
          actor_role: string
          created_at: string
          id: number
          resource: string
          subject_id: string
        }
        Insert: {
          action?: string
          actor_id: string
          actor_role: string
          created_at?: string
          id?: never
          resource: string
          subject_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          actor_role?: string
          created_at?: string
          id?: never
          resource?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_access_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_access_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          contact_name: string
          contact_phone: string
          created_at: string
          id: string
          is_primary: boolean
          relationship: string
          user_id: string
        }
        Insert: {
          contact_name: string
          contact_phone: string
          created_at?: string
          id?: string
          is_primary?: boolean
          relationship: string
          user_id: string
        }
        Update: {
          contact_name?: string
          contact_phone?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          relationship?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_sessions: {
        Row: {
          completed_at: string
          exercise_type: string
          id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          exercise_type: string
          id?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          exercise_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          address: string | null
          city: string
          has_mental_health_service: boolean
          id: string
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
          province: string
          type: string
        }
        Insert: {
          address?: string | null
          city: string
          has_mental_health_service?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string | null
          province: string
          type: string
        }
        Update: {
          address?: string | null
          city?: string
          has_mental_health_service?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          province?: string
          type?: string
        }
        Relationships: []
      }
      facility_admins: {
        Row: {
          facility_id: string
          profile_id: string
        }
        Insert: {
          facility_id: string
          profile_id: string
        }
        Update: {
          facility_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_admins_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_admins_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_entries: {
        Row: {
          created_at: string
          energy_level: number | null
          id: string
          mood_type: string
          note: string
          triggers: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          energy_level?: number | null
          id?: string
          mood_type: string
          note?: string
          triggers?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          energy_level?: number | null
          id?: string
          mood_type?: string
          note?: string
          triggers?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mood_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      night_reflections: {
        Row: {
          answers: Json
          created_at: string
          date: string
          id: string
          mood_after: number | null
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          date: string
          id?: string
          mood_after?: number | null
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          date?: string
          id?: string
          mood_after?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "night_reflections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_log: {
        Row: {
          action_taken: string | null
          body: string
          id: string
          read_at: string | null
          sent_at: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          body: string
          id?: string
          read_at?: string | null
          sent_at?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_taken?: string | null
          body?: string
          id?: string
          read_at?: string | null
          sent_at?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          domicile_province: string | null
          email: string
          font_size_preference: string
          gender: string | null
          id: string
          is_demo: boolean
          language_preference: string
          name: string
          nik_encrypted: string | null
          notifications_enabled: boolean
          reminder_time: string | null
          requested_role: string | null
          requested_str_number: string | null
          role: string
          satusehat_consent: boolean
          share_region_stats: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          domicile_province?: string | null
          email: string
          font_size_preference?: string
          gender?: string | null
          id: string
          is_demo?: boolean
          language_preference?: string
          name?: string
          nik_encrypted?: string | null
          notifications_enabled?: boolean
          reminder_time?: string | null
          requested_role?: string | null
          requested_str_number?: string | null
          role?: string
          satusehat_consent?: boolean
          share_region_stats?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          domicile_province?: string | null
          email?: string
          font_size_preference?: string
          gender?: string | null
          id?: string
          is_demo?: boolean
          language_preference?: string
          name?: string
          nik_encrypted?: string | null
          notifications_enabled?: boolean
          reminder_time?: string | null
          requested_role?: string | null
          requested_str_number?: string | null
          role?: string
          satusehat_consent?: boolean
          share_region_stats?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      psychologist_schedules: {
        Row: {
          day_of_week: number
          end_time: string
          id: string
          max_slots_per_slot: number
          psychologist_id: string
          start_time: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          id?: string
          max_slots_per_slot?: number
          psychologist_id: string
          start_time: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          id?: string
          max_slots_per_slot?: number
          psychologist_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "psychologist_schedules_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "psychologists"
            referencedColumns: ["id"]
          },
        ]
      }
      psychologists: {
        Row: {
          bio: string | null
          consultation_fee: number
          created_at: string
          full_name: string
          himpsi_verified: boolean
          id: string
          is_active: boolean
          is_available_now: boolean
          languages: string[]
          license_number: string | null
          photo_url: string | null
          profile_id: string | null
          rating_average: number
          specializations: string[]
          str_number: string | null
          title: string
          total_reviews: number
          updated_at: string
        }
        Insert: {
          bio?: string | null
          consultation_fee?: number
          created_at?: string
          full_name: string
          himpsi_verified?: boolean
          id?: string
          is_active?: boolean
          is_available_now?: boolean
          languages?: string[]
          license_number?: string | null
          photo_url?: string | null
          profile_id?: string | null
          rating_average?: number
          specializations?: string[]
          str_number?: string | null
          title?: string
          total_reviews?: number
          updated_at?: string
        }
        Update: {
          bio?: string | null
          consultation_fee?: number
          created_at?: string
          full_name?: string
          himpsi_verified?: boolean
          id?: string
          is_active?: boolean
          is_available_now?: boolean
          languages?: string[]
          license_number?: string | null
          photo_url?: string | null
          profile_id?: string | null
          rating_average?: number
          specializations?: string[]
          str_number?: string | null
          title?: string
          total_reviews?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "psychologists_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reflection_questions: {
        Row: {
          category: string
          display_order: number
          id: string
          is_active: boolean
          question_text: string
        }
        Insert: {
          category?: string
          display_order?: number
          id?: string
          is_active?: boolean
          question_text: string
        }
        Update: {
          category?: string
          display_order?: number
          id?: string
          is_active?: boolean
          question_text?: string
        }
        Relationships: []
      }
      satusehat_sync_log: {
        Row: {
          attempt_count: number
          created_at: string
          error_message: string | null
          id: string
          local_record_id: string
          resource_type: string
          retry_after: string | null
          satusehat_id: string | null
          sync_status: string
          synced_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          id?: string
          local_record_id: string
          resource_type: string
          retry_after?: string | null
          satusehat_id?: string | null
          sync_status?: string
          synced_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          id?: string
          local_record_id?: string
          resource_type?: string
          retry_after?: string | null
          satusehat_id?: string | null
          sync_status?: string
          synced_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "satusehat_sync_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sleep_entries: {
        Row: {
          bedtime: string
          created_at: string
          id: string
          notes: string
          quality: number
          user_id: string
          wake_time: string
        }
        Insert: {
          bedtime: string
          created_at?: string
          id?: string
          notes?: string
          quality: number
          user_id: string
          wake_time: string
        }
        Update: {
          bedtime?: string
          created_at?: string
          id?: string
          notes?: string
          quality?: number
          user_id?: string
          wake_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "sleep_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      thought_records: {
        Row: {
          after_emotions: Json
          automatic_thought: string | null
          balanced_thought: string | null
          belief_score: number | null
          counter_evidence: string[]
          created_at: string
          emotions: Json
          id: string
          situation: string | null
          supporting_evidence: string[]
          user_id: string
        }
        Insert: {
          after_emotions?: Json
          automatic_thought?: string | null
          balanced_thought?: string | null
          belief_score?: number | null
          counter_evidence?: string[]
          created_at?: string
          emotions?: Json
          id?: string
          situation?: string | null
          supporting_evidence?: string[]
          user_id: string
        }
        Update: {
          after_emotions?: Json
          automatic_thought?: string | null
          balanced_thought?: string | null
          belief_score?: number | null
          counter_evidence?: string[]
          created_at?: string
          emotions?: Json
          id?: string
          situation?: string | null
          supporting_evidence?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thought_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_journals: {
        Row: {
          created_at: string
          duration_seconds: number
          id: string
          mood_emoji: string | null
          note: string | null
          recorded_at: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          id?: string
          mood_emoji?: string | null
          note?: string | null
          recorded_at?: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          id?: string
          mood_emoji?: string | null
          note?: string | null
          recorded_at?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_journals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_pending_psychologist_applications: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          name: string
          str_number: string | null
        }[]
      }
      admin_pending_psychologists: {
        Args: never
        Returns: { created_at: string; email: string; id: string; name: string }[]
      }
      admin_review_psychologist: {
        Args: {
          p_days?: number[]
          p_decision: string
          p_end?: string
          p_fee?: number
          p_full_name?: string
          p_profile: string
          p_specializations?: string[]
          p_start?: string
          p_str_number?: string
          p_title?: string
          p_verified?: boolean
        }
        Returns: undefined
      }
      app_role: { Args: never; Returns: string }
      attach_updated_at_trigger: { Args: { tbl: string }; Returns: undefined }
      book_consultation: {
        Args: { p_psychologist: string; p_scheduled_at: string }
        Returns: {
          booking_fee: number
          duration_minutes: number
          id: string
          scheduled_at: string
          status: string
        }[]
      }
      delete_my_account: { Args: never; Returns: undefined }
      can_view: {
        Args: { p_resource: string; p_subject: string }
        Returns: boolean
      }
      classify_assessment: {
        Args: { p_score: number; p_type: string }
        Returns: string
      }
      facility_aggregate: {
        Args: { p_facility: string; p_from: string; p_to: string }
        Returns: {
          active_users: number
          avg_gad7: number
          avg_phq9: number
          avg_pss10: number
          city: string
          crisis_alert_count: number
          mild_count: number
          minimal_count: number
          moderate_count: number
          province: string
          severe_count: number
          suppressed: boolean
          week_start: string
        }[]
      }
      get_latest_mood: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          energy_level: number | null
          id: string
          mood_type: string
          note: string
          triggers: string[]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "mood_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      log_access: {
        Args: { p_action?: string; p_resource: string; p_subject: string }
        Returns: undefined
      }
      accept_caregiver_invite: { Args: { p_code: string }; Returns: Json }
      decline_caregiver_invite: { Args: { p_code: string }; Returns: boolean }
      caregiver_patient_names: {
        Args: never
        Returns: { patient_id: string; name: string }[]
      }
      log_access_batch: {
        Args: { p_action?: string; p_resource: string; p_subjects: string[] }
        Returns: undefined
      }
      my_access_log: {
        Args: { p_limit?: number }
        Returns: {
          action: string
          actor_id: string
          actor_name: string
          actor_role: string
          created_at: string
          id: number
          resource: string
        }[]
      }
      patient_caregivers: {
        Args: never
        Returns: {
          caregiver_id: string | null
          caregiver_name: string | null
          caregiver_phone: string | null
          created_at: string
          id: string
          invite_code: string | null
          permissions: Json
          status: string
        }[]
      }
      client_companion_activity: {
        Args: { p_client: string; p_days?: number }
        Returns: {
          active_days: number
          conversations: number
          crisis_conversations: number
          last_activity: string | null
          messages: number
        }[]
      }
      psychologist_clients: {
        Args: never
        Returns: { linked_at: string; name: string; patient_id: string; permissions: Json }[]
      }
      psychologist_available_slots: {
        Args: { p_from: string; p_psychologist: string; p_to: string }
        Returns: { slot_at: string }[]
      }
      psychologist_booked_slots: {
        Args: { p_from: string; p_psychologist: string; p_to: string }
        Returns: { duration_minutes: number; scheduled_at: string }[]
      }
      psychologist_mfa_ok: { Args: never; Returns: boolean }
      psychologist_schedule: {
        Args: { p_from: string; p_to: string }
        Returns: {
          client_id: string | null
          client_name: string | null
          duration_minutes: number
          id: string
          scheduled_at: string
          status: string
        }[]
      }
      unread_notification_count: {
        Args: { p_user_id: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
