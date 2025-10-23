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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      campaign_templates: {
        Row: {
          attachments: Json | null
          created_at: string | null
          email_1_html: string
          email_1_subject: string
          email_1_attachments: Json | null
          email_2_html: string
          email_2_subject: string
          email_2_attachments: Json | null
          email_3_html: string
          email_3_subject: string
          email_3_attachments: Json | null
          email_4_html: string
          email_4_subject: string
          email_4_attachments: Json | null
          email_5_html: string
          email_5_subject: string
          email_5_attachments: Json | null
          gartner_role: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          email_1_html: string
          email_1_subject: string
          email_1_attachments?: Json | null
          email_2_html: string
          email_2_subject: string
          email_2_attachments?: Json | null
          email_3_html: string
          email_3_subject: string
          email_3_attachments?: Json | null
          email_4_html: string
          email_4_subject: string
          email_4_attachments?: Json | null
          email_5_html: string
          email_5_subject: string
          email_5_attachments?: Json | null
          gartner_role: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          email_1_html?: string
          email_1_subject?: string
          email_1_attachments?: Json | null
          email_2_html?: string
          email_2_subject?: string
          email_2_attachments?: Json | null
          email_3_html?: string
          email_3_subject?: string
          email_3_attachments?: Json | null
          email_4_html?: string
          email_4_subject?: string
          email_4_attachments?: Json | null
          email_5_html?: string
          email_5_subject?: string
          email_5_attachments?: Json | null
          gartner_role?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          contact_id: string | null
          created_at: string | null
          email_1_date: string | null
          email_2_date: string | null
          email_3_date: string | null
          email_4_date: string | null
          email_5_date: string | null
          emails_sent: number | null
          id: string
          response_date: string | null
          response_text: string | null
          start_campaign: boolean | null
          status: string | null
          template_id: string | null
          updated_at: string | null
          has_replied: boolean | null
          last_reply_date: string | null
          email_incorrect: boolean | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          email_1_date?: string | null
          email_2_date?: string | null
          email_3_date?: string | null
          email_4_date?: string | null
          email_5_date?: string | null
          emails_sent?: number | null
          id?: string
          response_date?: string | null
          response_text?: string | null
          start_campaign?: boolean | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          has_replied?: boolean | null
          last_reply_date?: string | null
          email_incorrect?: boolean | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          email_1_date?: string | null
          email_2_date?: string | null
          email_3_date?: string | null
          email_4_date?: string | null
          email_5_date?: string | null
          emails_sent?: number | null
          id?: string
          response_date?: string | null
          response_text?: string | null
          start_campaign?: boolean | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          has_replied?: boolean | null
          last_reply_date?: string | null
          email_incorrect?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "campaign_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          contact_type: string
          contacted: boolean | null
          created_at: string | null
          email: string
          first_name: string
          gartner_role: string
          id: string
          interested: boolean | null
          last_contact_date: string | null
          last_name: string
          notes: string | null
          organization: string
          phone: string | null
          title: string
          updated_at: string | null
          webinar_role: string | null
          webinars_subscribed: boolean | null
          pa_name: string | null
          pa_email: string | null
          pa_phone: string | null
          linkedin_url: string | null
          tier: string | null
        }
        Insert: {
          contact_type: string
          contacted?: boolean | null
          created_at?: string | null
          email: string
          first_name: string
          gartner_role: string
          id?: string
          interested?: boolean | null
          last_contact_date?: string | null
          last_name: string
          notes?: string | null
          organization: string
          phone?: string | null
          title: string
          updated_at?: string | null
          webinar_role?: string | null
          webinars_subscribed?: boolean | null
          pa_name?: string | null
          pa_email?: string | null
          pa_phone?: string | null
          linkedin_url?: string | null
          tier?: string | null
        }
        Update: {
          contact_type?: string
          contacted?: boolean | null
          created_at?: string | null
          email?: string
          first_name?: string
          gartner_role?: string
          id?: string
          interested?: boolean | null
          last_contact_date?: string | null
          last_name?: string
          notes?: string | null
          organization?: string
          phone?: string | null
          title?: string
          updated_at?: string | null
          webinar_role?: string | null
          webinars_subscribed?: boolean | null
          pa_name?: string | null
          pa_email?: string | null
          pa_phone?: string | null
          linkedin_url?: string | null
          tier?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      webinar_distributions: {
        Row: {
          created_at: string | null
          email_html: string
          email_subject: string
          file_name: string
          file_url: string
          id: string
          month: string
          sent: boolean | null
          sent_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_html: string
          email_subject: string
          file_name: string
          file_url: string
          id?: string
          month: string
          sent?: boolean | null
          sent_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_html?: string
          email_subject?: string
          file_name?: string
          file_url?: string
          id?: string
          month?: string
          sent?: boolean | null
          sent_at?: string | null
        }
        Relationships: []
      }
      webinar_recommendations: {
        Row: {
          created_at: string | null
          distribution_id: string | null
          gartner_role: string
          id: string
          relevance_score: number | null
          webinar_description: string | null
          webinar_title: string
        }
        Insert: {
          created_at?: string | null
          distribution_id?: string | null
          gartner_role: string
          id?: string
          relevance_score?: number | null
          webinar_description?: string | null
          webinar_title: string
        }
        Update: {
          created_at?: string | null
          distribution_id?: string | null
          gartner_role?: string
          id?: string
          relevance_score?: number | null
          webinar_description?: string | null
          webinar_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "webinar_recommendations_distribution_id_fkey"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "webinar_distributions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
