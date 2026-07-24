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
      business_hours: {
        Row: {
          closes_at: string
          created_at: string
          id: string
          is_active: boolean
          opens_at: string
          updated_at: string
          weekday: number
        }
        Insert: {
          closes_at: string
          created_at?: string
          id?: string
          is_active?: boolean
          opens_at: string
          updated_at?: string
          weekday: number
        }
        Update: {
          closes_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          opens_at?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          emoji: string | null
          id: string
          is_active: boolean
          is_public: boolean
          name: string
          slug: string
          sort_order: number
          tagline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name: string
          slug: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name?: string
          slug?: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      extras: {
        Row: {
          category_id: string
          code: string
          created_at: string
          currency: string
          deleted_at: string | null
          duration_delta_minutes: number
          id: string
          is_active: boolean
          is_public: boolean
          name: string
          price_amount: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          code: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          duration_delta_minutes?: number
          id?: string
          is_active?: boolean
          is_public?: boolean
          name: string
          price_amount?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          code?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          duration_delta_minutes?: number
          id?: string
          is_active?: boolean
          is_public?: boolean
          name?: string
          price_amount?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extras_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      personalization_fields: {
        Row: {
          category_id: string
          created_at: string
          deleted_at: string | null
          field_type: string
          id: string
          is_active: boolean
          is_public: boolean
          is_required: boolean
          label: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          deleted_at?: string | null
          field_type?: string
          id?: string
          is_active?: boolean
          is_public?: boolean
          is_required?: boolean
          label: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          deleted_at?: string | null
          field_type?: string
          id?: string
          is_active?: boolean
          is_public?: boolean
          is_required?: boolean
          label?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personalization_fields_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      personalization_options: {
        Row: {
          created_at: string
          field_id: string
          id: string
          is_active: boolean
          label: string
          slug: string
          sort_order: number
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          field_id: string
          id?: string
          is_active?: boolean
          label: string
          slug: string
          sort_order?: number
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          field_id?: string
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "personalization_options_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "personalization_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      service_personalization_option_modifiers: {
        Row: {
          created_at: string
          duration_delta_minutes: number
          field_id: string
          option_id: string
          price_fixed_amount: number
          price_percentage: number
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_delta_minutes?: number
          field_id: string
          option_id: string
          price_fixed_amount?: number
          price_percentage?: number
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_delta_minutes?: number
          field_id?: string
          option_id?: string
          price_fixed_amount?: number
          price_percentage?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_personalization_option_modifiers_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "personalization_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_personalization_option_modifiers_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "personalization_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_personalization_option_modifiers_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spom_rule_fk"
            columns: ["service_id", "field_id"]
            isOneToOne: false
            referencedRelation: "service_personalization_rules"
            referencedColumns: ["service_id", "field_id"]
          },
        ]
      }
      service_personalization_rules: {
        Row: {
          created_at: string
          decision: string
          field_id: string
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decision: string
          field_id: string
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decision?: string
          field_id?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_personalization_rules_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "personalization_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_personalization_rules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category_id: string
          created_at: string
          currency: string
          deleted_at: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          is_public: boolean
          name: string
          price_amount: number
          slug: string
          sort_order: number
          tag: string | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean
          is_public?: boolean
          name: string
          price_amount: number
          slug: string
          sort_order?: number
          tag?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_public?: boolean
          name?: string
          price_amount?: number
          slug?: string
          sort_order?: number
          tag?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          created_at: string
          deleted_at: string | null
          display_name: string
          id: string
          is_active: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_specialties: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          is_active: boolean
          priority: number
          service_id: string | null
          staff_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: number
          service_id?: string | null
          staff_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: number
          service_id?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_specialties_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_specialties_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_specialties_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      catalog_category_visible: {
        Args: { _category_id: string }
        Returns: boolean
      }
      catalog_extra_visible: { Args: { _extra_id: string }; Returns: boolean }
      catalog_field_visible: { Args: { _field_id: string }; Returns: boolean }
      catalog_service_visible: {
        Args: { _service_id: string }
        Returns: boolean
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
