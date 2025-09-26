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
      ad_packages: {
        Row: {
          audience: string[] | null
          channels: string[] | null
          complexity: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          duration: string | null
          features: Json | null
          format: string | null
          id: string
          is_active: boolean | null
          legacy_id: number | null
          media_outlet_id: string | null
          name: string
          outlets: string[] | null
          price: string | null
          price_range: string | null
          reach_estimate: string | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          audience?: string[] | null
          channels?: string[] | null
          complexity?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration?: string | null
          features?: Json | null
          format?: string | null
          id?: string
          is_active?: boolean | null
          legacy_id?: number | null
          media_outlet_id?: string | null
          name: string
          outlets?: string[] | null
          price?: string | null
          price_range?: string | null
          reach_estimate?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          audience?: string[] | null
          channels?: string[] | null
          complexity?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration?: string | null
          features?: Json | null
          format?: string | null
          id?: string
          is_active?: boolean | null
          legacy_id?: number | null
          media_outlet_id?: string | null
          name?: string
          outlets?: string[] | null
          price?: string | null
          price_range?: string | null
          reach_estimate?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_packages_media_outlet_id_fkey"
            columns: ["media_outlet_id"]
            isOneToOne: false
            referencedRelation: "media_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      advertising_inventory: {
        Row: {
          availability_schedule: string | null
          cancellation_policy: string | null
          created_at: string
          description: string | null
          file_requirements: Json | null
          id: string
          is_active: boolean | null
          lead_time: string | null
          max_commitment: string | null
          media_outlet_id: string
          min_commitment: string | null
          package_name: string
          package_type: string
          performance_metrics: Json | null
          placement_options: Json | null
          pricing_tiers: Json | null
          technical_requirements: Json | null
          updated_at: string
        }
        Insert: {
          availability_schedule?: string | null
          cancellation_policy?: string | null
          created_at?: string
          description?: string | null
          file_requirements?: Json | null
          id?: string
          is_active?: boolean | null
          lead_time?: string | null
          max_commitment?: string | null
          media_outlet_id: string
          min_commitment?: string | null
          package_name: string
          package_type: string
          performance_metrics?: Json | null
          placement_options?: Json | null
          pricing_tiers?: Json | null
          technical_requirements?: Json | null
          updated_at?: string
        }
        Update: {
          availability_schedule?: string | null
          cancellation_policy?: string | null
          created_at?: string
          description?: string | null
          file_requirements?: Json | null
          id?: string
          is_active?: boolean | null
          lead_time?: string | null
          max_commitment?: string | null
          media_outlet_id?: string
          min_commitment?: string | null
          package_name?: string
          package_type?: string
          performance_metrics?: Json | null
          placement_options?: Json | null
          pricing_tiers?: Json | null
          technical_requirements?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertising_inventory_media_outlet_id_fkey"
            columns: ["media_outlet_id"]
            isOneToOne: false
            referencedRelation: "media_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_conversations: {
        Row: {
          conversation_thread_id: string | null
          created_at: string
          id: string
          message_content: string
          message_type: string
          metadata: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_thread_id?: string | null
          created_at?: string
          id?: string
          message_content: string
          message_type: string
          metadata?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_thread_id?: string | null
          created_at?: string
          id?: string
          message_content?: string
          message_type?: string
          metadata?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_conversations_conversation_thread_id_fkey"
            columns: ["conversation_thread_id"]
            isOneToOne: false
            referencedRelation: "conversation_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_instructions: {
        Row: {
          created_at: string
          id: string
          instructions: string
          is_active: boolean
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          instructions: string
          is_active?: boolean
          updated_at?: string
          version: string
        }
        Update: {
          created_at?: string
          id?: string
          instructions?: string
          is_active?: boolean
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      brand_documents: {
        Row: {
          created_at: string
          description: string | null
          document_name: string
          document_type: string
          external_url: string | null
          file_size: number | null
          file_url: string | null
          id: string
          mime_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_name: string
          document_type: string
          external_url?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_name?: string
          document_type?: string
          external_url?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_threads: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_archived: boolean | null
          message_count: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean | null
          message_count?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean | null
          message_count?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_inquiries: {
        Row: {
          assigned_to: string | null
          budget_range: string | null
          business_name: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          conversation_context: Json | null
          created_at: string
          follow_up_date: string | null
          id: string
          interested_outlets: string[] | null
          interested_packages: number[] | null
          marketing_goals: string[] | null
          notes: string | null
          status: string | null
          timeline: string | null
          updated_at: string
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          assigned_to?: string | null
          budget_range?: string | null
          business_name: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          conversation_context?: Json | null
          created_at?: string
          follow_up_date?: string | null
          id?: string
          interested_outlets?: string[] | null
          interested_packages?: number[] | null
          marketing_goals?: string[] | null
          notes?: string | null
          status?: string | null
          timeline?: string | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          assigned_to?: string | null
          budget_range?: string | null
          business_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          conversation_context?: Json | null
          created_at?: string
          follow_up_date?: string | null
          id?: string
          interested_outlets?: string[] | null
          interested_packages?: number[] | null
          marketing_goals?: string[] | null
          notes?: string | null
          status?: string | null
          timeline?: string | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      media_outlets: {
        Row: {
          audience_size: string | null
          awards: Json | null
          business_model: string | null
          competitive_advantages: string | null
          contact_email: string | null
          contact_phone: string | null
          coverage_area: string | null
          created_at: string
          demographics: Json | null
          description: string | null
          editorial_focus: Json | null
          email_subscribers: number | null
          founding_year: number | null
          id: string
          is_active: boolean | null
          key_personnel: Json | null
          monthly_visitors: number | null
          name: string
          open_rate: number | null
          ownership_type: string | null
          primary_market: string | null
          publication_frequency: string | null
          secondary_markets: Json | null
          social_media: Json | null
          staff_count: number | null
          tagline: string | null
          technical_specs: Json | null
          type: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          audience_size?: string | null
          awards?: Json | null
          business_model?: string | null
          competitive_advantages?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          coverage_area?: string | null
          created_at?: string
          demographics?: Json | null
          description?: string | null
          editorial_focus?: Json | null
          email_subscribers?: number | null
          founding_year?: number | null
          id?: string
          is_active?: boolean | null
          key_personnel?: Json | null
          monthly_visitors?: number | null
          name: string
          open_rate?: number | null
          ownership_type?: string | null
          primary_market?: string | null
          publication_frequency?: string | null
          secondary_markets?: Json | null
          social_media?: Json | null
          staff_count?: number | null
          tagline?: string | null
          technical_specs?: Json | null
          type: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          audience_size?: string | null
          awards?: Json | null
          business_model?: string | null
          competitive_advantages?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          coverage_area?: string | null
          created_at?: string
          demographics?: Json | null
          description?: string | null
          editorial_focus?: Json | null
          email_subscribers?: number | null
          founding_year?: number | null
          id?: string
          is_active?: boolean | null
          key_personnel?: Json | null
          monthly_visitors?: number | null
          name?: string
          open_rate?: number | null
          ownership_type?: string | null
          primary_market?: string | null
          publication_frequency?: string | null
          secondary_markets?: Json | null
          social_media?: Json | null
          staff_count?: number | null
          tagline?: string | null
          technical_specs?: Json | null
          type?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          brand_voice: string | null
          company_name: string | null
          company_size: string | null
          company_website: string | null
          created_at: string
          first_name: string | null
          id: string
          industry: string | null
          is_admin: boolean | null
          last_name: string | null
          marketing_goals: string[] | null
          phone: string | null
          profile_completion_score: number | null
          role: string | null
          target_audience: string | null
          updated_at: string
          user_id: string
          website_analysis_date: string | null
          website_brand_themes: string[] | null
          website_content_summary: string | null
          website_key_services: string[] | null
        }
        Insert: {
          brand_voice?: string | null
          company_name?: string | null
          company_size?: string | null
          company_website?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          industry?: string | null
          is_admin?: boolean | null
          last_name?: string | null
          marketing_goals?: string[] | null
          phone?: string | null
          profile_completion_score?: number | null
          role?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id: string
          website_analysis_date?: string | null
          website_brand_themes?: string[] | null
          website_content_summary?: string | null
          website_key_services?: string[] | null
        }
        Update: {
          brand_voice?: string | null
          company_name?: string | null
          company_size?: string | null
          company_website?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          industry?: string | null
          is_admin?: boolean | null
          last_name?: string | null
          marketing_goals?: string[] | null
          phone?: string | null
          profile_completion_score?: number | null
          role?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id?: string
          website_analysis_date?: string | null
          website_brand_themes?: string[] | null
          website_content_summary?: string | null
          website_key_services?: string[] | null
        }
        Relationships: []
      }
      saved_outlets: {
        Row: {
          id: string
          outlet_id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          id?: string
          outlet_id: string
          saved_at?: string
          user_id: string
        }
        Update: {
          id?: string
          outlet_id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_packages: {
        Row: {
          id: string
          package_id: number
          saved_at: string
          user_id: string
        }
        Insert: {
          id?: string
          package_id: number
          saved_at?: string
          user_id: string
        }
        Update: {
          id?: string
          package_id?: number
          saved_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_type: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_type: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_type?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_package_usage_stats: {
        Args: { package_legacy_id: number }
        Returns: {
          saved_count: number
          users_with_saves: string[]
        }[]
      }
      restore_package: {
        Args: { package_uuid: string }
        Returns: Json
      }
      safe_delete_package: {
        Args: {
          cascade_saves?: boolean
          force_delete?: boolean
          package_uuid: string
        }
        Returns: Json
      }
      sanitize_input: {
        Args: { input_text: string }
        Returns: string
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
