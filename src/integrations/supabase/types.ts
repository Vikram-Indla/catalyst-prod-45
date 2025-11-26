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
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_json: Json | null
          before_json: Json | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      anchor_sprints: {
        Row: {
          code: string
          created_at: string | null
          end_date: string
          id: string
          name: string
          program_increment_id: string | null
          start_date: string
        }
        Insert: {
          code: string
          created_at?: string | null
          end_date: string
          id?: string
          name: string
          program_increment_id?: string | null
          start_date: string
        }
        Update: {
          code?: string
          created_at?: string | null
          end_date?: string
          id?: string
          name?: string
          program_increment_id?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "anchor_sprints_program_increment_id_fkey"
            columns: ["program_increment_id"]
            isOneToOne: false
            referencedRelation: "program_increments"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      board_configs: {
        Row: {
          board_type: Database["public"]["Enums"]["board_type"]
          columns_json: Json
          created_at: string | null
          id: string
          scope_id: string | null
          scope_type: Database["public"]["Enums"]["board_scope_type"]
          swimlane_rule: Json | null
          updated_at: string | null
        }
        Insert: {
          board_type: Database["public"]["Enums"]["board_type"]
          columns_json: Json
          created_at?: string | null
          id?: string
          scope_id?: string | null
          scope_type: Database["public"]["Enums"]["board_scope_type"]
          swimlane_rule?: Json | null
          updated_at?: string | null
        }
        Update: {
          board_type?: Database["public"]["Enums"]["board_type"]
          columns_json?: Json
          created_at?: string | null
          id?: string
          scope_id?: string | null
          scope_type?: Database["public"]["Enums"]["board_scope_type"]
          swimlane_rule?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      capacity_allocations: {
        Row: {
          actual_capacity_points: number | null
          capacity_points: number | null
          created_at: string | null
          id: string
          iteration_id: string
          load_factor: number | null
          locked_baseline: boolean | null
          team_id: string
          updated_at: string | null
          velocity_baseline: number | null
        }
        Insert: {
          actual_capacity_points?: number | null
          capacity_points?: number | null
          created_at?: string | null
          id?: string
          iteration_id: string
          load_factor?: number | null
          locked_baseline?: boolean | null
          team_id: string
          updated_at?: string | null
          velocity_baseline?: number | null
        }
        Update: {
          actual_capacity_points?: number | null
          capacity_points?: number | null
          created_at?: string | null
          id?: string
          iteration_id?: string
          load_factor?: number | null
          locked_baseline?: boolean | null
          team_id?: string
          updated_at?: string | null
          velocity_baseline?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "capacity_allocations_iteration_id_fkey"
            columns: ["iteration_id"]
            isOneToOne: false
            referencedRelation: "iterations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capacity_allocations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_field_defs: {
        Row: {
          created_at: string | null
          entity_type: string
          field_type: Database["public"]["Enums"]["field_type"]
          id: string
          name: string
          options_json: Json | null
          required: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_type: string
          field_type: Database["public"]["Enums"]["field_type"]
          id?: string
          name: string
          options_json?: Json | null
          required?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_type?: string
          field_type?: Database["public"]["Enums"]["field_type"]
          id?: string
          name?: string
          options_json?: Json | null
          required?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      custom_field_values: {
        Row: {
          created_at: string | null
          custom_field_def_id: string
          entity_id: string
          entity_type: string
          id: string
          updated_at: string | null
          value_json: Json | null
        }
        Insert: {
          created_at?: string | null
          custom_field_def_id: string
          entity_id: string
          entity_type: string
          id?: string
          updated_at?: string | null
          value_json?: Json | null
        }
        Update: {
          created_at?: string | null
          custom_field_def_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
          updated_at?: string | null
          value_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_custom_field_def_id_fkey"
            columns: ["custom_field_def_id"]
            isOneToOne: false
            referencedRelation: "custom_field_defs"
            referencedColumns: ["id"]
          },
        ]
      }
      dependencies: {
        Row: {
          blocked_days: number | null
          created_at: string | null
          criticality_score: number | null
          due_iteration_id: string | null
          from_feature_id: string
          id: string
          resolution_plan: string | null
          risk_level: Database["public"]["Enums"]["risk_level"] | null
          status: Database["public"]["Enums"]["dependency_status"] | null
          to_feature_id: string
          type: Database["public"]["Enums"]["dependency_type"] | null
          updated_at: string | null
        }
        Insert: {
          blocked_days?: number | null
          created_at?: string | null
          criticality_score?: number | null
          due_iteration_id?: string | null
          from_feature_id: string
          id?: string
          resolution_plan?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          status?: Database["public"]["Enums"]["dependency_status"] | null
          to_feature_id: string
          type?: Database["public"]["Enums"]["dependency_type"] | null
          updated_at?: string | null
        }
        Update: {
          blocked_days?: number | null
          created_at?: string | null
          criticality_score?: number | null
          due_iteration_id?: string | null
          from_feature_id?: string
          id?: string
          resolution_plan?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          status?: Database["public"]["Enums"]["dependency_status"] | null
          to_feature_id?: string
          type?: Database["public"]["Enums"]["dependency_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dependencies_due_iteration_id_fkey"
            columns: ["due_iteration_id"]
            isOneToOne: false
            referencedRelation: "iterations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependencies_from_feature_id_fkey"
            columns: ["from_feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependencies_to_feature_id_fkey"
            columns: ["to_feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
        ]
      }
      epics: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          estimate: number | null
          health: Database["public"]["Enums"]["health_status"] | null
          id: string
          name: string
          owner_id: string | null
          primary_program_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["epic_status"] | null
          theme_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          estimate?: number | null
          health?: Database["public"]["Enums"]["health_status"] | null
          id?: string
          name: string
          owner_id?: string | null
          primary_program_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["epic_status"] | null
          theme_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          estimate?: number | null
          health?: Database["public"]["Enums"]["health_status"] | null
          id?: string
          name?: string
          owner_id?: string | null
          primary_program_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["epic_status"] | null
          theme_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epics_primary_program_id_fkey"
            columns: ["primary_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epics_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "strategic_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_pi_objective_links: {
        Row: {
          contribution_pct: number | null
          created_at: string | null
          feature_id: string
          id: string
          pi_objective_id: string
        }
        Insert: {
          contribution_pct?: number | null
          created_at?: string | null
          feature_id: string
          id?: string
          pi_objective_id: string
        }
        Update: {
          contribution_pct?: number | null
          created_at?: string | null
          feature_id?: string
          id?: string
          pi_objective_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_pi_objective_links_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_pi_objective_links_pi_objective_id_fkey"
            columns: ["pi_objective_id"]
            isOneToOne: false
            referencedRelation: "pi_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      features: {
        Row: {
          acceptance_criteria: string | null
          actual_end_date: string | null
          actual_start_date: string | null
          blocked: boolean | null
          blocked_reason: string | null
          business_value: number | null
          created_at: string | null
          description: string | null
          epic_id: string
          estimate_points: number | null
          health: Database["public"]["Enums"]["health_status"] | null
          id: string
          iteration_id: string | null
          job_size: number | null
          name: string
          notes: string | null
          owner_id: string | null
          pi_id: string | null
          planned_end_date: string | null
          planned_start_date: string | null
          program_id: string
          progress_pct: number | null
          risk_reduction: number | null
          status: Database["public"]["Enums"]["feature_status"] | null
          team_id: string | null
          time_criticality: number | null
          updated_at: string | null
          wsjf_score: number | null
        }
        Insert: {
          acceptance_criteria?: string | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          blocked?: boolean | null
          blocked_reason?: string | null
          business_value?: number | null
          created_at?: string | null
          description?: string | null
          epic_id: string
          estimate_points?: number | null
          health?: Database["public"]["Enums"]["health_status"] | null
          id?: string
          iteration_id?: string | null
          job_size?: number | null
          name: string
          notes?: string | null
          owner_id?: string | null
          pi_id?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          program_id: string
          progress_pct?: number | null
          risk_reduction?: number | null
          status?: Database["public"]["Enums"]["feature_status"] | null
          team_id?: string | null
          time_criticality?: number | null
          updated_at?: string | null
          wsjf_score?: number | null
        }
        Update: {
          acceptance_criteria?: string | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          blocked?: boolean | null
          blocked_reason?: string | null
          business_value?: number | null
          created_at?: string | null
          description?: string | null
          epic_id?: string
          estimate_points?: number | null
          health?: Database["public"]["Enums"]["health_status"] | null
          id?: string
          iteration_id?: string | null
          job_size?: number | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          pi_id?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          program_id?: string
          progress_pct?: number | null
          risk_reduction?: number | null
          status?: Database["public"]["Enums"]["feature_status"] | null
          team_id?: string | null
          time_criticality?: number | null
          updated_at?: string | null
          wsjf_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "features_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "features_iteration_id_fkey"
            columns: ["iteration_id"]
            isOneToOne: false
            referencedRelation: "iterations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "features_pi_id_fkey"
            columns: ["pi_id"]
            isOneToOne: false
            referencedRelation: "program_increments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "features_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "features_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          description: string | null
          id: string
          level: string
          owner_user_id: string | null
          snapshot_id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          level: string
          owner_user_id?: string | null
          snapshot_id: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          level?: string
          owner_user_id?: string | null
          snapshot_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "strategy_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      hierarchy_configs: {
        Row: {
          created_at: string | null
          display_name: string
          enabled: boolean | null
          id: string
          level_key: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          enabled?: boolean | null
          id?: string
          level_key: string
          sort_order: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          enabled?: boolean | null
          id?: string
          level_key?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      initiatives: {
        Row: {
          benefit_score: number | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          owner_id: string | null
          status: Database["public"]["Enums"]["initiative_status"] | null
          target_pi_ids: Json | null
          theme_id: string
          updated_at: string | null
          wsjf_score: number | null
        }
        Insert: {
          benefit_score?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          owner_id?: string | null
          status?: Database["public"]["Enums"]["initiative_status"] | null
          target_pi_ids?: Json | null
          theme_id: string
          updated_at?: string | null
          wsjf_score?: number | null
        }
        Update: {
          benefit_score?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          status?: Database["public"]["Enums"]["initiative_status"] | null
          target_pi_ids?: Json | null
          theme_id?: string
          updated_at?: string | null
          wsjf_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "initiatives_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "strategic_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connectors: {
        Row: {
          auth_config_json: Json | null
          auth_method: Database["public"]["Enums"]["auth_method"] | null
          created_at: string | null
          enabled: boolean | null
          endpoint: string | null
          id: string
          last_test_message: string | null
          last_test_status: Database["public"]["Enums"]["test_status"] | null
          name: string
          type: Database["public"]["Enums"]["integration_type"]
          updated_at: string | null
        }
        Insert: {
          auth_config_json?: Json | null
          auth_method?: Database["public"]["Enums"]["auth_method"] | null
          created_at?: string | null
          enabled?: boolean | null
          endpoint?: string | null
          id?: string
          last_test_message?: string | null
          last_test_status?: Database["public"]["Enums"]["test_status"] | null
          name: string
          type: Database["public"]["Enums"]["integration_type"]
          updated_at?: string | null
        }
        Update: {
          auth_config_json?: Json | null
          auth_method?: Database["public"]["Enums"]["auth_method"] | null
          created_at?: string | null
          enabled?: boolean | null
          endpoint?: string | null
          id?: string
          last_test_message?: string | null
          last_test_status?: Database["public"]["Enums"]["test_status"] | null
          name?: string
          type?: Database["public"]["Enums"]["integration_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      iterations: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          name: string
          pi_id: string
          start_date: string | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          name: string
          pi_id: string
          start_date?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          name?: string
          pi_id?: string
          start_date?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "iterations_pi_id_fkey"
            columns: ["pi_id"]
            isOneToOne: false
            referencedRelation: "program_increments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iterations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      key_result_checkins: {
        Row: {
          checked_in_at: string
          created_at: string | null
          created_by_user_id: string | null
          id: string
          key_result_id: string | null
          note_richtext: string | null
          value: number
        }
        Insert: {
          checked_in_at?: string
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          key_result_id?: string | null
          note_richtext?: string | null
          value: number
        }
        Update: {
          checked_in_at?: string
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          key_result_id?: string | null
          note_richtext?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "key_result_checkins_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_result_checkins_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "key_results_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      key_results: {
        Row: {
          created_at: string | null
          current_value: number | null
          id: string
          name: string
          objective_id: string
          target_value: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_value?: number | null
          id?: string
          name: string
          objective_id: string
          target_value?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_value?: number | null
          id?: string
          name?: string
          objective_id?: string
          target_value?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "key_results_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      key_results_v2: {
        Row: {
          baseline_value: number | null
          created_at: string | null
          current_value: number | null
          due_date: string | null
          goal_value: number
          id: string
          metric_type: string
          objective_id: string | null
          owner_user_id: string | null
          summary: string
          updated_at: string | null
        }
        Insert: {
          baseline_value?: number | null
          created_at?: string | null
          current_value?: number | null
          due_date?: string | null
          goal_value: number
          id?: string
          metric_type: string
          objective_id?: string | null
          owner_user_id?: string | null
          summary: string
          updated_at?: string | null
        }
        Update: {
          baseline_value?: number | null
          created_at?: string | null
          current_value?: number | null
          due_date?: string | null
          goal_value?: number
          id?: string
          metric_type?: string
          objective_id?: string | null
          owner_user_id?: string | null
          summary?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "key_results_v2_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_results_v2_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          due_date: string
          id: string
          milestone_type: string | null
          start_date: string | null
          state: string | null
          title: string
          updated_at: string | null
          work_item_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          milestone_type?: string | null
          start_date?: string | null
          state?: string | null
          title: string
          updated_at?: string | null
          work_item_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          milestone_type?: string | null
          start_date?: string | null
          state?: string | null
          title?: string
          updated_at?: string | null
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestones_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      objective_dependencies: {
        Row: {
          created_at: string | null
          id: string
          label: string
          objective_id: string | null
          state: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          objective_id?: string | null
          state?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          objective_id?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objective_dependencies_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_epic_links: {
        Row: {
          created_at: string | null
          epic_id: string | null
          id: string
          objective_id: string | null
        }
        Insert: {
          created_at?: string | null
          epic_id?: string | null
          id?: string
          objective_id?: string | null
        }
        Update: {
          created_at?: string | null
          epic_id?: string | null
          id?: string
          objective_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objective_epic_links_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_epic_links_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_impediments: {
        Row: {
          created_at: string | null
          id: string
          label: string
          objective_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          objective_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          objective_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objective_impediments_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_initiative_links: {
        Row: {
          created_at: string | null
          id: string
          initiative_id: string
          objective_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          initiative_id: string
          objective_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          initiative_id?: string
          objective_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_initiative_links_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_initiative_links_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_levels: {
        Row: {
          created_at: string | null
          id: string
          name: string
          scope_id: string | null
          scope_type: Database["public"]["Enums"]["objective_scope_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          scope_id?: string | null
          scope_type: Database["public"]["Enums"]["objective_scope_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          scope_id?: string | null
          scope_type?: Database["public"]["Enums"]["objective_scope_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      objective_risks: {
        Row: {
          created_at: string | null
          id: string
          label: string
          objective_id: string | null
          roam_state: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          objective_id?: string | null
          roam_state?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          objective_id?: string | null
          roam_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objective_risks_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_theme_links: {
        Row: {
          created_at: string | null
          id: string
          objective_id: string
          theme_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          objective_id: string
          theme_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          objective_id?: string
          theme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_theme_links_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_theme_links_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "strategic_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_work_items: {
        Row: {
          created_at: string | null
          id: string
          objective_id: string
          work_item_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          objective_id: string
          work_item_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          objective_id?: string
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_work_items_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_work_items_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
        ]
      }
      objectives: {
        Row: {
          anchor_sprint_id: string | null
          blocked: boolean | null
          confidence: Database["public"]["Enums"]["confidence_level"] | null
          confidence_score: number | null
          created_at: string | null
          end_date: string | null
          goal_id: string | null
          id: string
          level: string | null
          name: string
          objective_level_id: string
          owner_id: string | null
          parent_goal_id: string | null
          parent_objective_id: string | null
          program_increment_ids: Json | null
          progress_pct: number | null
          snapshot_id: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          anchor_sprint_id?: string | null
          blocked?: boolean | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          confidence_score?: number | null
          created_at?: string | null
          end_date?: string | null
          goal_id?: string | null
          id?: string
          level?: string | null
          name: string
          objective_level_id: string
          owner_id?: string | null
          parent_goal_id?: string | null
          parent_objective_id?: string | null
          program_increment_ids?: Json | null
          progress_pct?: number | null
          snapshot_id?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          anchor_sprint_id?: string | null
          blocked?: boolean | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          confidence_score?: number | null
          created_at?: string | null
          end_date?: string | null
          goal_id?: string | null
          id?: string
          level?: string | null
          name?: string
          objective_level_id?: string
          owner_id?: string | null
          parent_goal_id?: string | null
          parent_objective_id?: string | null
          program_increment_ids?: Json | null
          progress_pct?: number | null
          snapshot_id?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objectives_anchor_sprint_id_fkey"
            columns: ["anchor_sprint_id"]
            isOneToOne: false
            referencedRelation: "anchor_sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_objective_level_id_fkey"
            columns: ["objective_level_id"]
            isOneToOne: false
            referencedRelation: "objective_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_parent_goal_id_fkey"
            columns: ["parent_goal_id"]
            isOneToOne: false
            referencedRelation: "strategic_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_parent_objective_id_fkey"
            columns: ["parent_objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "strategy_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_grants: {
        Row: {
          action: Database["public"]["Enums"]["permission_action"]
          allowed: boolean | null
          created_at: string | null
          entity_type: string
          id: string
          role_id: string
          scope_id: string | null
          scope_type: Database["public"]["Enums"]["permission_scope"]
          updated_at: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["permission_action"]
          allowed?: boolean | null
          created_at?: string | null
          entity_type: string
          id?: string
          role_id: string
          scope_id?: string | null
          scope_type: Database["public"]["Enums"]["permission_scope"]
          updated_at?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["permission_action"]
          allowed?: boolean | null
          created_at?: string | null
          entity_type?: string
          id?: string
          role_id?: string
          scope_id?: string | null
          scope_type?: Database["public"]["Enums"]["permission_scope"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permission_grants_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "permission_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pi_objectives: {
        Row: {
          actual_bv: number | null
          committed: boolean
          created_at: string | null
          description: string | null
          id: string
          name: string
          pi_id: string
          planned_bv: number | null
          program_id: string
          stretch: boolean
          updated_at: string | null
        }
        Insert: {
          actual_bv?: number | null
          committed?: boolean
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          pi_id: string
          planned_bv?: number | null
          program_id: string
          stretch?: boolean
          updated_at?: string | null
        }
        Update: {
          actual_bv?: number | null
          committed?: boolean
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          pi_id?: string
          planned_bv?: number | null
          program_id?: string
          stretch?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pi_objectives_pi_id_fkey"
            columns: ["pi_id"]
            isOneToOne: false
            referencedRelation: "program_increments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pi_objectives_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_members: {
        Row: {
          created_at: string | null
          id: string
          portfolio_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          portfolio_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          portfolio_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_members_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string | null
          status: Database["public"]["Enums"]["portfolio_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id?: string | null
          status?: Database["public"]["Enums"]["portfolio_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          status?: Database["public"]["Enums"]["portfolio_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      predictability_metrics: {
        Row: {
          actual_bv: number | null
          commitment_reliability: number | null
          completed_features: number | null
          created_at: string | null
          id: string
          pi_id: string
          planned_bv: number | null
          planned_features: number | null
          predictability_score: number | null
          program_id: string
          updated_at: string | null
        }
        Insert: {
          actual_bv?: number | null
          commitment_reliability?: number | null
          completed_features?: number | null
          created_at?: string | null
          id?: string
          pi_id: string
          planned_bv?: number | null
          planned_features?: number | null
          predictability_score?: number | null
          program_id: string
          updated_at?: string | null
        }
        Update: {
          actual_bv?: number | null
          commitment_reliability?: number | null
          completed_features?: number | null
          created_at?: string | null
          id?: string
          pi_id?: string
          planned_bv?: number | null
          planned_features?: number | null
          predictability_score?: number | null
          program_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "predictability_metrics_pi_id_fkey"
            columns: ["pi_id"]
            isOneToOne: false
            referencedRelation: "program_increments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictability_metrics_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      program_increments: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          name: string
          portfolio_id: string
          start_date: string
          state: Database["public"]["Enums"]["pi_state"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          name: string
          portfolio_id: string
          start_date: string
          state?: Database["public"]["Enums"]["pi_state"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          name?: string
          portfolio_id?: string
          start_date?: string
          state?: Database["public"]["Enums"]["pi_state"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_increments_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      program_members: {
        Row: {
          created_at: string | null
          id: string
          program_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          program_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          program_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_members_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string | null
          id: string
          name: string
          portfolio_id: string
          rte_id: string | null
          status: Database["public"]["Enums"]["program_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          portfolio_id: string
          rte_id?: string | null
          status?: Database["public"]["Enums"]["program_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          portfolio_id?: string
          rte_id?: string | null
          status?: Database["public"]["Enums"]["program_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      release_feature_links: {
        Row: {
          created_at: string | null
          feature_id: string
          id: string
          release_id: string
        }
        Insert: {
          created_at?: string | null
          feature_id: string
          id?: string
          release_id: string
        }
        Update: {
          created_at?: string | null
          feature_id?: string
          id?: string
          release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_feature_links_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_feature_links_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      release_story_links: {
        Row: {
          created_at: string | null
          id: string
          release_id: string
          story_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          release_id: string
          story_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          release_id?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_story_links_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_story_links_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      release_vehicles: {
        Row: {
          created_at: string | null
          id: string
          name: string
          portfolio_id: string | null
          program_id: string | null
          type: Database["public"]["Enums"]["release_vehicle_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          portfolio_id?: string | null
          program_id?: string | null
          type: Database["public"]["Enums"]["release_vehicle_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          portfolio_id?: string | null
          program_id?: string | null
          type?: Database["public"]["Enums"]["release_vehicle_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "release_vehicles_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_vehicles_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      releases: {
        Row: {
          created_at: string | null
          id: string
          name: string
          notes: string | null
          readiness_pct: number | null
          release_vehicle_id: string
          status: Database["public"]["Enums"]["release_status"] | null
          target_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          readiness_pct?: number | null
          release_vehicle_id: string
          status?: Database["public"]["Enums"]["release_status"] | null
          target_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          readiness_pct?: number | null
          release_vehicle_id?: string
          status?: Database["public"]["Enums"]["release_status"] | null
          target_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "releases_release_vehicle_id_fkey"
            columns: ["release_vehicle_id"]
            isOneToOne: false
            referencedRelation: "release_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_definitions: {
        Row: {
          category: string
          config_json: Json | null
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          name: string
          report_type: string
          updated_at: string | null
        }
        Insert: {
          category: string
          config_json?: Json | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          report_type: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          config_json?: Json | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          report_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      risks: {
        Row: {
          created_at: string | null
          description: string | null
          due_iteration_id: string | null
          id: string
          impact: number | null
          name: string
          owner_id: string | null
          pi_id: string
          probability: number | null
          program_id: string
          roam_status: Database["public"]["Enums"]["roam_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          due_iteration_id?: string | null
          id?: string
          impact?: number | null
          name: string
          owner_id?: string | null
          pi_id: string
          probability?: number | null
          program_id: string
          roam_status: Database["public"]["Enums"]["roam_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          due_iteration_id?: string | null
          id?: string
          impact?: number | null
          name?: string
          owner_id?: string | null
          pi_id?: string
          probability?: number | null
          program_id?: string
          roam_status?: Database["public"]["Enums"]["roam_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risks_due_iteration_id_fkey"
            columns: ["due_iteration_id"]
            isOneToOne: false
            referencedRelation: "iterations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_pi_id_fkey"
            columns: ["pi_id"]
            isOneToOne: false
            referencedRelation: "program_increments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_items: {
        Row: {
          created_at: string | null
          end_date: string
          has_milestone_flag: boolean
          has_star_marker: boolean
          id: string
          program_increment_id: string
          start_date: string
          updated_at: string | null
          work_item_id: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          has_milestone_flag?: boolean
          has_star_marker?: boolean
          id?: string
          program_increment_id: string
          start_date: string
          updated_at?: string | null
          work_item_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          has_milestone_flag?: boolean
          has_star_marker?: boolean
          id?: string
          program_increment_id?: string
          start_date?: string
          updated_at?: string | null
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_items_program_increment_id_fkey"
            columns: ["program_increment_id"]
            isOneToOne: false
            referencedRelation: "program_increments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_items_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_service_allocations: {
        Row: {
          allocated_points: number | null
          created_at: string | null
          id: string
          iteration_id: string
          shared_service_id: string
          team_id: string
          updated_at: string | null
        }
        Insert: {
          allocated_points?: number | null
          created_at?: string | null
          id?: string
          iteration_id: string
          shared_service_id: string
          team_id: string
          updated_at?: string | null
        }
        Update: {
          allocated_points?: number | null
          created_at?: string | null
          id?: string
          iteration_id?: string
          shared_service_id?: string
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_service_allocations_iteration_id_fkey"
            columns: ["iteration_id"]
            isOneToOne: false
            referencedRelation: "iterations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_service_allocations_shared_service_id_fkey"
            columns: ["shared_service_id"]
            isOneToOne: false
            referencedRelation: "shared_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_service_allocations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_services: {
        Row: {
          allocation_type: string | null
          capacity_points: number | null
          created_at: string | null
          id: string
          name: string
          portfolio_id: string | null
          updated_at: string | null
        }
        Insert: {
          allocation_type?: string | null
          capacity_points?: number | null
          created_at?: string | null
          id?: string
          name: string
          portfolio_id?: string | null
          updated_at?: string | null
        }
        Update: {
          allocation_type?: string | null
          capacity_points?: number | null
          created_at?: string | null
          id?: string
          name?: string
          portfolio_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_services_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          acceptance_criteria: string | null
          assignee_id: string | null
          created_at: string | null
          description: string | null
          estimate_points: number | null
          feature_id: string
          id: string
          name: string
          sprint_id: string | null
          status: Database["public"]["Enums"]["story_status"] | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          acceptance_criteria?: string | null
          assignee_id?: string | null
          created_at?: string | null
          description?: string | null
          estimate_points?: number | null
          feature_id: string
          id?: string
          name: string
          sprint_id?: string | null
          status?: Database["public"]["Enums"]["story_status"] | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          acceptance_criteria?: string | null
          assignee_id?: string | null
          created_at?: string | null
          description?: string | null
          estimate_points?: number | null
          feature_id?: string
          id?: string
          name?: string
          sprint_id?: string | null
          status?: Database["public"]["Enums"]["story_status"] | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "iterations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_goals: {
        Row: {
          created_at: string | null
          description: string | null
          health_status: string | null
          id: string
          snapshot_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          health_status?: string | null
          id?: string
          snapshot_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          health_status?: string | null
          id?: string
          snapshot_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategic_goals_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "strategy_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_themes: {
        Row: {
          color_tag: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          owner_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["theme_status"] | null
          updated_at: string | null
        }
        Insert: {
          color_tag?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          owner_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["theme_status"] | null
          updated_at?: string | null
        }
        Update: {
          color_tag?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["theme_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      strategy_snapshots: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          mission: string | null
          name: string
          start_date: string | null
          updated_at: string | null
          values: Json | null
          vision: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          mission?: string | null
          name: string
          start_date?: string | null
          updated_at?: string | null
          values?: Json | null
          vision?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          mission?: string | null
          name?: string
          start_date?: string | null
          updated_at?: string | null
          values?: Json | null
          vision?: string | null
        }
        Relationships: []
      }
      subtasks: {
        Row: {
          assignee_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          original_estimate_hours: number | null
          status: Database["public"]["Enums"]["subtask_status"] | null
          story_id: string
          updated_at: string | null
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          original_estimate_hours?: number | null
          status?: Database["public"]["Enums"]["subtask_status"] | null
          story_id: string
          updated_at?: string | null
        }
        Update: {
          assignee_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          original_estimate_hours?: number | null
          status?: Database["public"]["Enums"]["subtask_status"] | null
          story_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
          program_id: string
          status: Database["public"]["Enums"]["team_status"] | null
          updated_at: string | null
          velocity_baseline: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          program_id: string
          status?: Database["public"]["Enums"]["team_status"] | null
          updated_at?: string | null
          velocity_baseline?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          program_id?: string
          status?: Database["public"]["Enums"]["team_status"] | null
          updated_at?: string | null
          velocity_baseline?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_history: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          id: string
          notes: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      value_stream_metrics: {
        Row: {
          created_at: string | null
          cycle_time_days: number | null
          flow_efficiency: number | null
          id: string
          lead_time_days: number | null
          metric_date: string
          portfolio_id: string
          throughput: number | null
          wip_count: number | null
        }
        Insert: {
          created_at?: string | null
          cycle_time_days?: number | null
          flow_efficiency?: number | null
          id?: string
          lead_time_days?: number | null
          metric_date: string
          portfolio_id: string
          throughput?: number | null
          wip_count?: number | null
        }
        Update: {
          created_at?: string | null
          cycle_time_days?: number | null
          flow_efficiency?: number | null
          id?: string
          lead_time_days?: number | null
          metric_date?: string
          portfolio_id?: string
          throughput?: number | null
          wip_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "value_stream_metrics_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bulk_assign_roles: {
        Args: {
          _notes?: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_ids: string[]
        }
        Returns: undefined
      }
      bulk_remove_roles: {
        Args: {
          _notes?: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_ids: string[]
        }
        Returns: undefined
      }
      check_permission: {
        Args: {
          _action: Database["public"]["Enums"]["permission_action"]
          _entity_type: string
          _scope_id?: string
          _scope_type?: Database["public"]["Enums"]["permission_scope"]
          _user_id: string
        }
        Returns: boolean
      }
      create_notification: {
        Args: {
          p_entity_id?: string
          p_entity_type?: string
          p_message: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: undefined
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      user_in_portfolio: {
        Args: { _portfolio_id: string; _user_id: string }
        Returns: boolean
      }
      user_in_program: {
        Args: { _program_id: string; _user_id: string }
        Returns: boolean
      }
      user_in_team: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "program_manager" | "team_lead" | "user"
      auth_method: "token" | "oauth"
      board_scope_type: "portfolio" | "program" | "team"
      board_type: "portfolio_kanban" | "program_board" | "sprint_board"
      br_status:
        | "proposed"
        | "analyzing"
        | "approved"
        | "in_progress"
        | "done"
        | "cancelled"
      confidence_level: "high" | "med" | "low"
      dependency_status: "open" | "in_progress" | "done"
      dependency_type: "sequential" | "concurrent"
      epic_status:
        | "proposed"
        | "analyzing"
        | "approved"
        | "in_progress"
        | "done"
        | "cancelled"
      feature_status:
        | "funnel"
        | "analyzing"
        | "backlog"
        | "implementing"
        | "done"
      field_type:
        | "text"
        | "number"
        | "date"
        | "select"
        | "multi_select"
        | "boolean"
      health_status: "green" | "yellow" | "red"
      initiative_status: "proposed" | "active" | "done" | "cancelled"
      integration_type:
        | "slack"
        | "github"
        | "gitlab"
        | "jira"
        | "teams"
        | "webhook"
      objective_scope_type: "company" | "portfolio" | "program"
      permission_action:
        | "view"
        | "create"
        | "edit"
        | "delete"
        | "link"
        | "move"
        | "configure"
      permission_scope: "global" | "portfolio" | "program" | "team"
      pi_state: "planned" | "active" | "closed"
      portfolio_status: "active" | "archived"
      program_status: "active" | "archived"
      release_status: "planned" | "ready" | "shipped"
      release_vehicle_type: "program" | "team" | "portfolio"
      risk_level: "low" | "med" | "high"
      roam_status: "resolved" | "owned" | "accepted" | "mitigated"
      story_status: "todo" | "in_progress" | "done"
      subtask_status: "todo" | "in_progress" | "done"
      team_status: "active" | "archived"
      test_status: "never_tested" | "success" | "fail"
      theme_status: "proposed" | "active" | "done" | "cancelled"
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
      app_role: ["admin", "program_manager", "team_lead", "user"],
      auth_method: ["token", "oauth"],
      board_scope_type: ["portfolio", "program", "team"],
      board_type: ["portfolio_kanban", "program_board", "sprint_board"],
      br_status: [
        "proposed",
        "analyzing",
        "approved",
        "in_progress",
        "done",
        "cancelled",
      ],
      confidence_level: ["high", "med", "low"],
      dependency_status: ["open", "in_progress", "done"],
      dependency_type: ["sequential", "concurrent"],
      epic_status: [
        "proposed",
        "analyzing",
        "approved",
        "in_progress",
        "done",
        "cancelled",
      ],
      feature_status: [
        "funnel",
        "analyzing",
        "backlog",
        "implementing",
        "done",
      ],
      field_type: [
        "text",
        "number",
        "date",
        "select",
        "multi_select",
        "boolean",
      ],
      health_status: ["green", "yellow", "red"],
      initiative_status: ["proposed", "active", "done", "cancelled"],
      integration_type: [
        "slack",
        "github",
        "gitlab",
        "jira",
        "teams",
        "webhook",
      ],
      objective_scope_type: ["company", "portfolio", "program"],
      permission_action: [
        "view",
        "create",
        "edit",
        "delete",
        "link",
        "move",
        "configure",
      ],
      permission_scope: ["global", "portfolio", "program", "team"],
      pi_state: ["planned", "active", "closed"],
      portfolio_status: ["active", "archived"],
      program_status: ["active", "archived"],
      release_status: ["planned", "ready", "shipped"],
      release_vehicle_type: ["program", "team", "portfolio"],
      risk_level: ["low", "med", "high"],
      roam_status: ["resolved", "owned", "accepted", "mitigated"],
      story_status: ["todo", "in_progress", "done"],
      subtask_status: ["todo", "in_progress", "done"],
      team_status: ["active", "archived"],
      test_status: ["never_tested", "success", "fail"],
      theme_status: ["proposed", "active", "done", "cancelled"],
    },
  },
} as const
