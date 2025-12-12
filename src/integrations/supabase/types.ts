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
      active_package: {
        Row: {
          id: string
          is_custom: boolean | null
          package_code: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          is_custom?: boolean | null
          package_code?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          is_custom?: boolean | null
          package_code?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "active_package_package_code_fkey"
            columns: ["package_code"]
            isOneToOne: false
            referencedRelation: "module_packages"
            referencedColumns: ["code"]
          },
        ]
      }
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
      announcement_dismissals: {
        Row: {
          announcement_id: string
          dismissed_at: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          dismissed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          dismissed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_dismissals_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          created_at: string
          created_by: string
          end_date: string
          id: string
          is_active: boolean
          is_dismissible: boolean
          message: string
          start_date: string
          target_audience: string
          target_roles: string[] | null
          target_team_ids: string[] | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_date: string
          id?: string
          is_active?: boolean
          is_dismissible?: boolean
          message: string
          start_date: string
          target_audience?: string
          target_roles?: string[] | null
          target_team_ids?: string[] | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          is_active?: boolean
          is_dismissible?: boolean
          message?: string
          start_date?: string
          target_audience?: string
          target_roles?: string[] | null
          target_team_ids?: string[] | null
          title?: string
          type?: string
        }
        Relationships: []
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
      business_lines: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          key: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          key: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          key?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      business_request_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          business_request_id: string
          created_at: string
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          business_request_id: string
          created_at?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          business_request_id?: string
          created_at?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_request_audit_logs_business_request_id_fkey"
            columns: ["business_request_id"]
            isOneToOne: false
            referencedRelation: "business_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      business_request_discussions: {
        Row: {
          business_request_id: string
          created_at: string
          id: string
          message: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_request_id: string
          created_at?: string
          id?: string
          message: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_request_id?: string
          created_at?: string
          id?: string
          message?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_request_discussions_business_request_id_fkey"
            columns: ["business_request_id"]
            isOneToOne: false
            referencedRelation: "business_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      business_request_links: {
        Row: {
          added_by_name: string | null
          business_request_id: string
          created_at: string
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          kind: string | null
          link_type: string
          linked_item_id: string | null
          linked_item_source: string | null
          linked_item_type: string | null
          mime_type: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          added_by_name?: string | null
          business_request_id: string
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          kind?: string | null
          link_type?: string
          linked_item_id?: string | null
          linked_item_source?: string | null
          linked_item_type?: string | null
          mime_type?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          added_by_name?: string | null
          business_request_id?: string
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          kind?: string | null
          link_type?: string
          linked_item_id?: string | null
          linked_item_source?: string | null
          linked_item_type?: string | null
          mime_type?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_request_links_business_request_id_fkey"
            columns: ["business_request_id"]
            isOneToOne: false
            referencedRelation: "business_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      business_requests: {
        Row: {
          acceptance_criteria: string | null
          approval_date: string | null
          approval_decision: string | null
          approval_inputs: string | null
          approval_remarks: string | null
          approved_budget_ceiling: number | null
          approved_budget_sar: number | null
          approver_name: string | null
          assignee: string | null
          budget_owner_name: string | null
          budget_type: string[] | null
          budget_year: string | null
          business_justification: string | null
          business_owner: string | null
          business_score: number | null
          business_value: number | null
          capacity_risks: string | null
          capacity_status: string | null
          complexity: string | null
          complexity_score: number | null
          contract_end_date: string | null
          contract_start_date: string | null
          contract_type: string | null
          created_at: string
          created_by: string | null
          current_year_budget_sar: number | null
          deleted_at: string | null
          delivery_model: string | null
          delivery_platform: string | null
          delivery_track: string | null
          department: string | null
          dependencies: string | null
          description: string | null
          end_date: string | null
          environment_dependency: string | null
          estimated_cost: number | null
          estimated_cost_sar: number | null
          estimated_effort: string | null
          estimation_dependencies: string | null
          estimation_notes: string | null
          estimation_risk_rating: string | null
          executive_urgency: number | null
          expected_resume_date: string | null
          force_ranked_at: string | null
          force_ranked_by: string | null
          functional_spec_link: string | null
          funding_assumptions: string | null
          funding_status: string | null
          health: string | null
          id: string
          impl_start_date: string | null
          impl_target_end_date: string | null
          implementation_outcome: string | null
          implementation_owner: string | null
          integration_required: boolean | null
          integration_systems: string[] | null
          internal_effort_cost_sar: number | null
          internal_effort_pct: number | null
          is_force_ranked: boolean | null
          jira_epic_link: string | null
          key_risks_remarks: string | null
          on_hold_comment: string | null
          on_hold_reason: string | null
          outcome_summary: string | null
          planned_external_spend_sar: number | null
          planned_quarter: string | null
          platform: string | null
          po_numbers: string[] | null
          portfolio_comments: string | null
          portfolio_decision: string | null
          primary_vendor_name: string | null
          process_step: string | null
          project_manager_user_id: string | null
          proposed_solution: string | null
          qa_remarks: string | null
          rank: number | null
          rank_override_justification: string | null
          readiness_checklist: Json | null
          request_key: string | null
          requestor: string | null
          resolution_category: string | null
          risk_rating: string | null
          start_date: string | null
          support_owner: string | null
          support_remarks: string | null
          technical_validator: string | null
          title: string
          track: string | null
          updated_at: string
          urgency: string | null
          vendor_effort_pct: number | null
        }
        Insert: {
          acceptance_criteria?: string | null
          approval_date?: string | null
          approval_decision?: string | null
          approval_inputs?: string | null
          approval_remarks?: string | null
          approved_budget_ceiling?: number | null
          approved_budget_sar?: number | null
          approver_name?: string | null
          assignee?: string | null
          budget_owner_name?: string | null
          budget_type?: string[] | null
          budget_year?: string | null
          business_justification?: string | null
          business_owner?: string | null
          business_score?: number | null
          business_value?: number | null
          capacity_risks?: string | null
          capacity_status?: string | null
          complexity?: string | null
          complexity_score?: number | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          contract_type?: string | null
          created_at?: string
          created_by?: string | null
          current_year_budget_sar?: number | null
          deleted_at?: string | null
          delivery_model?: string | null
          delivery_platform?: string | null
          delivery_track?: string | null
          department?: string | null
          dependencies?: string | null
          description?: string | null
          end_date?: string | null
          environment_dependency?: string | null
          estimated_cost?: number | null
          estimated_cost_sar?: number | null
          estimated_effort?: string | null
          estimation_dependencies?: string | null
          estimation_notes?: string | null
          estimation_risk_rating?: string | null
          executive_urgency?: number | null
          expected_resume_date?: string | null
          force_ranked_at?: string | null
          force_ranked_by?: string | null
          functional_spec_link?: string | null
          funding_assumptions?: string | null
          funding_status?: string | null
          health?: string | null
          id?: string
          impl_start_date?: string | null
          impl_target_end_date?: string | null
          implementation_outcome?: string | null
          implementation_owner?: string | null
          integration_required?: boolean | null
          integration_systems?: string[] | null
          internal_effort_cost_sar?: number | null
          internal_effort_pct?: number | null
          is_force_ranked?: boolean | null
          jira_epic_link?: string | null
          key_risks_remarks?: string | null
          on_hold_comment?: string | null
          on_hold_reason?: string | null
          outcome_summary?: string | null
          planned_external_spend_sar?: number | null
          planned_quarter?: string | null
          platform?: string | null
          po_numbers?: string[] | null
          portfolio_comments?: string | null
          portfolio_decision?: string | null
          primary_vendor_name?: string | null
          process_step?: string | null
          project_manager_user_id?: string | null
          proposed_solution?: string | null
          qa_remarks?: string | null
          rank?: number | null
          rank_override_justification?: string | null
          readiness_checklist?: Json | null
          request_key?: string | null
          requestor?: string | null
          resolution_category?: string | null
          risk_rating?: string | null
          start_date?: string | null
          support_owner?: string | null
          support_remarks?: string | null
          technical_validator?: string | null
          title: string
          track?: string | null
          updated_at?: string
          urgency?: string | null
          vendor_effort_pct?: number | null
        }
        Update: {
          acceptance_criteria?: string | null
          approval_date?: string | null
          approval_decision?: string | null
          approval_inputs?: string | null
          approval_remarks?: string | null
          approved_budget_ceiling?: number | null
          approved_budget_sar?: number | null
          approver_name?: string | null
          assignee?: string | null
          budget_owner_name?: string | null
          budget_type?: string[] | null
          budget_year?: string | null
          business_justification?: string | null
          business_owner?: string | null
          business_score?: number | null
          business_value?: number | null
          capacity_risks?: string | null
          capacity_status?: string | null
          complexity?: string | null
          complexity_score?: number | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          contract_type?: string | null
          created_at?: string
          created_by?: string | null
          current_year_budget_sar?: number | null
          deleted_at?: string | null
          delivery_model?: string | null
          delivery_platform?: string | null
          delivery_track?: string | null
          department?: string | null
          dependencies?: string | null
          description?: string | null
          end_date?: string | null
          environment_dependency?: string | null
          estimated_cost?: number | null
          estimated_cost_sar?: number | null
          estimated_effort?: string | null
          estimation_dependencies?: string | null
          estimation_notes?: string | null
          estimation_risk_rating?: string | null
          executive_urgency?: number | null
          expected_resume_date?: string | null
          force_ranked_at?: string | null
          force_ranked_by?: string | null
          functional_spec_link?: string | null
          funding_assumptions?: string | null
          funding_status?: string | null
          health?: string | null
          id?: string
          impl_start_date?: string | null
          impl_target_end_date?: string | null
          implementation_outcome?: string | null
          implementation_owner?: string | null
          integration_required?: boolean | null
          integration_systems?: string[] | null
          internal_effort_cost_sar?: number | null
          internal_effort_pct?: number | null
          is_force_ranked?: boolean | null
          jira_epic_link?: string | null
          key_risks_remarks?: string | null
          on_hold_comment?: string | null
          on_hold_reason?: string | null
          outcome_summary?: string | null
          planned_external_spend_sar?: number | null
          planned_quarter?: string | null
          platform?: string | null
          po_numbers?: string[] | null
          portfolio_comments?: string | null
          portfolio_decision?: string | null
          primary_vendor_name?: string | null
          process_step?: string | null
          project_manager_user_id?: string | null
          proposed_solution?: string | null
          qa_remarks?: string | null
          rank?: number | null
          rank_override_justification?: string | null
          readiness_checklist?: Json | null
          request_key?: string | null
          requestor?: string | null
          resolution_category?: string | null
          risk_rating?: string | null
          start_date?: string | null
          support_owner?: string | null
          support_remarks?: string | null
          technical_validator?: string | null
          title?: string
          track?: string | null
          updated_at?: string
          urgency?: string | null
          vendor_effort_pct?: number | null
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
      capacity_plans: {
        Row: {
          available_capacity: number
          created_at: string | null
          id: string
          pi_id: string
          program_id: string | null
          team_id: string | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          available_capacity?: number
          created_at?: string | null
          id?: string
          pi_id: string
          program_id?: string | null
          team_id?: string | null
          unit?: string
          updated_at?: string | null
        }
        Update: {
          available_capacity?: number
          created_at?: string | null
          id?: string
          pi_id?: string
          program_id?: string | null
          team_id?: string | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capacity_plans_pi_id_fkey"
            columns: ["pi_id"]
            isOneToOne: false
            referencedRelation: "program_increments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capacity_plans_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capacity_plans_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          created_at: string | null
          credential_id: string | null
          credential_url: string | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          issue_date: string | null
          issuing_organization: string | null
          name: string
          skill_id: string | null
          team_member_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credential_id?: string | null
          credential_url?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          issue_date?: string | null
          issuing_organization?: string | null
          name: string
          skill_id?: string | null
          team_member_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credential_id?: string | null
          credential_url?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          issue_date?: string | null
          issuing_organization?: string | null
          name?: string
          skill_id?: string | null
          team_member_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certifications_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certifications_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_mentions: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          mentioned_user_id: string
          notification_sent: boolean | null
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          mentioned_user_id: string
          notification_sent?: boolean | null
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          mentioned_user_id?: string
          notification_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
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
          default_value: Json | null
          description: string | null
          display_order: number | null
          entity_type: string
          field_type: Database["public"]["Enums"]["field_type"]
          id: string
          is_active: boolean | null
          name: string
          options_json: Json | null
          placeholder: string | null
          required: boolean | null
          updated_at: string | null
          validation_rules: Json | null
        }
        Insert: {
          created_at?: string | null
          default_value?: Json | null
          description?: string | null
          display_order?: number | null
          entity_type: string
          field_type: Database["public"]["Enums"]["field_type"]
          id?: string
          is_active?: boolean | null
          name: string
          options_json?: Json | null
          placeholder?: string | null
          required?: boolean | null
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Update: {
          created_at?: string | null
          default_value?: Json | null
          description?: string | null
          display_order?: number | null
          entity_type?: string
          field_type?: Database["public"]["Enums"]["field_type"]
          id?: string
          is_active?: boolean | null
          name?: string
          options_json?: Json | null
          placeholder?: string | null
          required?: boolean | null
          updated_at?: string | null
          validation_rules?: Json | null
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
      demand_field_configs: {
        Row: {
          business_line_id: string | null
          created_at: string
          field_key: string
          id: string
          is_active: boolean
          is_required: boolean
          is_system: boolean
          label: string
          position: number
          rules_json: Json | null
          section_key: string
          tab_key: string
          updated_at: string
        }
        Insert: {
          business_line_id?: string | null
          created_at?: string
          field_key: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          is_system?: boolean
          label: string
          position?: number
          rules_json?: Json | null
          section_key: string
          tab_key: string
          updated_at?: string
        }
        Update: {
          business_line_id?: string | null
          created_at?: string
          field_key?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          is_system?: boolean
          label?: string
          position?: number
          rules_json?: Json | null
          section_key?: string
          tab_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_field_configs_business_line_id_fkey"
            columns: ["business_line_id"]
            isOneToOne: false
            referencedRelation: "business_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_section_configs: {
        Row: {
          business_line_id: string | null
          collapsed_by_default: boolean
          created_at: string
          id: string
          is_required: boolean
          is_visible: boolean
          name: string
          position: number
          section_key: string
          tab_key: string
          updated_at: string
        }
        Insert: {
          business_line_id?: string | null
          collapsed_by_default?: boolean
          created_at?: string
          id?: string
          is_required?: boolean
          is_visible?: boolean
          name: string
          position?: number
          section_key: string
          tab_key: string
          updated_at?: string
        }
        Update: {
          business_line_id?: string | null
          collapsed_by_default?: boolean
          created_at?: string
          id?: string
          is_required?: boolean
          is_visible?: boolean
          name?: string
          position?: number
          section_key?: string
          tab_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_section_configs_business_line_id_fkey"
            columns: ["business_line_id"]
            isOneToOne: false
            referencedRelation: "business_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_tab_configs: {
        Row: {
          business_line_id: string | null
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          is_required: boolean
          position: number
          tab_key: string
          updated_at: string
        }
        Insert: {
          business_line_id?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          position?: number
          tab_key: string
          updated_at?: string
        }
        Update: {
          business_line_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          position?: number
          tab_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_tab_configs_business_line_id_fkey"
            columns: ["business_line_id"]
            isOneToOne: false
            referencedRelation: "business_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      dependencies: {
        Row: {
          blocked_days: number | null
          blocked_reason_requestor: string | null
          blocked_reason_respondent: string | null
          blocked_requestor: boolean | null
          blocked_respondent: boolean | null
          committed_by_date: string | null
          committed_by_sprint_id: string | null
          created_at: string | null
          criticality_score: number | null
          delivered_at: string | null
          dependency_level: string | null
          depends_on_program_id: string | null
          depends_on_team_id: string | null
          description: string | null
          due_iteration_id: string | null
          external_entity_id: string | null
          from_feature_id: string
          id: string
          needed_by_date: string | null
          needed_by_sprint_id: string | null
          no_work_required: boolean | null
          notify_on_commit: boolean | null
          notify_on_delivery: boolean | null
          owner_id: string | null
          pi_id: string | null
          rank_order: number | null
          rejection_reason: string | null
          related_stories_count: number | null
          requesting_program_id: string | null
          requesting_team_id: string | null
          resolution_plan: string | null
          risk_level: Database["public"]["Enums"]["risk_level"] | null
          status: Database["public"]["Enums"]["dependency_status"] | null
          subscribed_users: string[] | null
          to_feature_id: string
          type: Database["public"]["Enums"]["dependency_type"] | null
          updated_at: string | null
        }
        Insert: {
          blocked_days?: number | null
          blocked_reason_requestor?: string | null
          blocked_reason_respondent?: string | null
          blocked_requestor?: boolean | null
          blocked_respondent?: boolean | null
          committed_by_date?: string | null
          committed_by_sprint_id?: string | null
          created_at?: string | null
          criticality_score?: number | null
          delivered_at?: string | null
          dependency_level?: string | null
          depends_on_program_id?: string | null
          depends_on_team_id?: string | null
          description?: string | null
          due_iteration_id?: string | null
          external_entity_id?: string | null
          from_feature_id: string
          id?: string
          needed_by_date?: string | null
          needed_by_sprint_id?: string | null
          no_work_required?: boolean | null
          notify_on_commit?: boolean | null
          notify_on_delivery?: boolean | null
          owner_id?: string | null
          pi_id?: string | null
          rank_order?: number | null
          rejection_reason?: string | null
          related_stories_count?: number | null
          requesting_program_id?: string | null
          requesting_team_id?: string | null
          resolution_plan?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          status?: Database["public"]["Enums"]["dependency_status"] | null
          subscribed_users?: string[] | null
          to_feature_id: string
          type?: Database["public"]["Enums"]["dependency_type"] | null
          updated_at?: string | null
        }
        Update: {
          blocked_days?: number | null
          blocked_reason_requestor?: string | null
          blocked_reason_respondent?: string | null
          blocked_requestor?: boolean | null
          blocked_respondent?: boolean | null
          committed_by_date?: string | null
          committed_by_sprint_id?: string | null
          created_at?: string | null
          criticality_score?: number | null
          delivered_at?: string | null
          dependency_level?: string | null
          depends_on_program_id?: string | null
          depends_on_team_id?: string | null
          description?: string | null
          due_iteration_id?: string | null
          external_entity_id?: string | null
          from_feature_id?: string
          id?: string
          needed_by_date?: string | null
          needed_by_sprint_id?: string | null
          no_work_required?: boolean | null
          notify_on_commit?: boolean | null
          notify_on_delivery?: boolean | null
          owner_id?: string | null
          pi_id?: string | null
          rank_order?: number | null
          rejection_reason?: string | null
          related_stories_count?: number | null
          requesting_program_id?: string | null
          requesting_team_id?: string | null
          resolution_plan?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          status?: Database["public"]["Enums"]["dependency_status"] | null
          subscribed_users?: string[] | null
          to_feature_id?: string
          type?: Database["public"]["Enums"]["dependency_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dependencies_committed_by_sprint_id_fkey"
            columns: ["committed_by_sprint_id"]
            isOneToOne: false
            referencedRelation: "iterations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependencies_depends_on_program_id_fkey"
            columns: ["depends_on_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependencies_depends_on_team_id_fkey"
            columns: ["depends_on_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependencies_due_iteration_id_fkey"
            columns: ["due_iteration_id"]
            isOneToOne: false
            referencedRelation: "iterations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependencies_external_entity_id_fkey"
            columns: ["external_entity_id"]
            isOneToOne: false
            referencedRelation: "external_entities"
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
            foreignKeyName: "dependencies_needed_by_sprint_id_fkey"
            columns: ["needed_by_sprint_id"]
            isOneToOne: false
            referencedRelation: "iterations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependencies_pi_id_fkey"
            columns: ["pi_id"]
            isOneToOne: false
            referencedRelation: "program_increments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependencies_requesting_program_id_fkey"
            columns: ["requesting_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependencies_requesting_team_id_fkey"
            columns: ["requesting_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
      dependency_audit_log: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string | null
          dependency_id: string
          field_changed: string | null
          id: string
          new_value: string | null
          notes: string | null
          old_value: string | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string | null
          dependency_id: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string | null
          dependency_id?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dependency_audit_log_dependency_id_fkey"
            columns: ["dependency_id"]
            isOneToOne: false
            referencedRelation: "dependencies"
            referencedColumns: ["id"]
          },
        ]
      }
      dependency_negotiations: {
        Row: {
          counter_proposal: boolean | null
          created_at: string | null
          dependency_id: string
          id: string
          notes: string | null
          proposed_by: string | null
          proposed_date: string | null
          proposed_sprint_id: string | null
          status: string | null
        }
        Insert: {
          counter_proposal?: boolean | null
          created_at?: string | null
          dependency_id: string
          id?: string
          notes?: string | null
          proposed_by?: string | null
          proposed_date?: string | null
          proposed_sprint_id?: string | null
          status?: string | null
        }
        Update: {
          counter_proposal?: boolean | null
          created_at?: string | null
          dependency_id?: string
          id?: string
          notes?: string | null
          proposed_by?: string | null
          proposed_date?: string | null
          proposed_sprint_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dependency_negotiations_dependency_id_fkey"
            columns: ["dependency_id"]
            isOneToOne: false
            referencedRelation: "dependencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependency_negotiations_proposed_sprint_id_fkey"
            columns: ["proposed_sprint_id"]
            isOneToOne: false
            referencedRelation: "iterations"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_mentions: {
        Row: {
          created_at: string
          discussion_id: string
          id: string
          mentioned_team_id: string | null
          mentioned_user_id: string | null
          notification_sent: boolean
        }
        Insert: {
          created_at?: string
          discussion_id: string
          id?: string
          mentioned_team_id?: string | null
          mentioned_user_id?: string | null
          notification_sent?: boolean
        }
        Update: {
          created_at?: string
          discussion_id?: string
          id?: string
          mentioned_team_id?: string | null
          mentioned_user_id?: string | null
          notification_sent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "discussion_mentions_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_mentions_mentioned_team_id_fkey"
            columns: ["mentioned_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          message: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          message: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          message?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      drawer_tab_configs: {
        Row: {
          business_line_id: string | null
          created_at: string
          display_name: string
          id: string
          is_required: boolean
          is_visible: boolean
          position: number
          tab_key: string
          updated_at: string
        }
        Insert: {
          business_line_id?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_required?: boolean
          is_visible?: boolean
          position?: number
          tab_key: string
          updated_at?: string
        }
        Update: {
          business_line_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_required?: boolean
          is_visible?: boolean
          position?: number
          tab_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drawer_tab_configs_business_line_id_fkey"
            columns: ["business_line_id"]
            isOneToOne: false
            referencedRelation: "business_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      epic_acceptance_criteria: {
        Row: {
          created_at: string
          description: string
          epic_id: string
          id: string
          is_met: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          epic_id: string
          id?: string
          is_met?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          epic_id?: string
          id?: string
          is_met?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "epic_acceptance_criteria_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
        ]
      }
      epic_benefits: {
        Row: {
          created_at: string
          description: string | null
          epic_id: string
          id: string
          metric: string | null
          target_value: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          epic_id: string
          id?: string
          metric?: string | null
          target_value?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          epic_id?: string
          id?: string
          metric?: string | null
          target_value?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "epic_benefits_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
        ]
      }
      epic_custom_columns: {
        Row: {
          color: string
          column_id: string
          created_at: string | null
          id: string
          label: string
          position: number
          updated_at: string | null
          user_id: string
          wip_limit: number | null
        }
        Insert: {
          color?: string
          column_id: string
          created_at?: string | null
          id?: string
          label: string
          position: number
          updated_at?: string | null
          user_id: string
          wip_limit?: number | null
        }
        Update: {
          color?: string
          column_id?: string
          created_at?: string | null
          id?: string
          label?: string
          position?: number
          updated_at?: string | null
          user_id?: string
          wip_limit?: number | null
        }
        Relationships: []
      }
      epic_design_items: {
        Row: {
          created_at: string
          description: string | null
          epic_id: string
          id: string
          title: string
          type: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          epic_id: string
          id?: string
          title: string
          type: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          epic_id?: string
          id?: string
          title?: string
          type?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "epic_design_items_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
        ]
      }
      epic_intake_responses: {
        Row: {
          created_at: string | null
          epic_id: string | null
          field_id: string | null
          id: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          epic_id?: string | null
          field_id?: string | null
          id?: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          epic_id?: string | null
          field_id?: string | null
          id?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epic_intake_responses_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
        ]
      }
      epic_label_assignments: {
        Row: {
          created_at: string | null
          epic_id: string
          id: string
          label_id: string
        }
        Insert: {
          created_at?: string | null
          epic_id: string
          id?: string
          label_id: string
        }
        Update: {
          created_at?: string | null
          epic_id?: string
          id?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "epic_label_assignments_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epic_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "epic_labels"
            referencedColumns: ["id"]
          },
        ]
      }
      epic_labels: {
        Row: {
          color: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      epic_links: {
        Row: {
          added_by_name: string | null
          created_at: string
          epic_id: string
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          kind: string | null
          link_type: string
          linked_item_id: string | null
          linked_item_type: string | null
          mime_type: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          added_by_name?: string | null
          created_at?: string
          epic_id: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          kind?: string | null
          link_type?: string
          linked_item_id?: string | null
          linked_item_type?: string | null
          mime_type?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          added_by_name?: string | null
          created_at?: string
          epic_id?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          kind?: string | null
          link_type?: string
          linked_item_id?: string | null
          linked_item_type?: string | null
          mime_type?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "epic_links_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
        ]
      }
      epic_pi_forecasts: {
        Row: {
          created_at: string
          epic_id: string
          estimate: number
          id: string
          pi_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          epic_id: string
          estimate?: number
          id?: string
          pi_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          epic_id?: string
          estimate?: number
          id?: string
          pi_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "epic_pi_forecasts_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epic_pi_forecasts_pi_id_fkey"
            columns: ["pi_id"]
            isOneToOne: false
            referencedRelation: "program_increments"
            referencedColumns: ["id"]
          },
        ]
      }
      epic_process_history: {
        Row: {
          created_at: string | null
          cycle_time_hours: number | null
          entered_at: string
          epic_id: string
          exited_at: string | null
          id: string
          lead_time_hours: number | null
          process_step_id: string | null
        }
        Insert: {
          created_at?: string | null
          cycle_time_hours?: number | null
          entered_at?: string
          epic_id: string
          exited_at?: string | null
          id?: string
          lead_time_hours?: number | null
          process_step_id?: string | null
        }
        Update: {
          created_at?: string | null
          cycle_time_hours?: number | null
          entered_at?: string
          epic_id?: string
          exited_at?: string | null
          id?: string
          lead_time_hours?: number | null
          process_step_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epic_process_history_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epic_process_history_process_step_id_fkey"
            columns: ["process_step_id"]
            isOneToOne: false
            referencedRelation: "process_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      epic_program_increments: {
        Row: {
          created_at: string | null
          epic_id: string
          id: string
          pi_id: string
          pi_rank: number | null
        }
        Insert: {
          created_at?: string | null
          epic_id: string
          id?: string
          pi_id: string
          pi_rank?: number | null
        }
        Update: {
          created_at?: string | null
          epic_id?: string
          id?: string
          pi_id?: string
          pi_rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "epic_program_increments_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epic_program_increments_pi_id_fkey"
            columns: ["pi_id"]
            isOneToOne: false
            referencedRelation: "program_increments"
            referencedColumns: ["id"]
          },
        ]
      }
      epic_programs: {
        Row: {
          created_at: string | null
          epic_id: string
          id: string
          program_id: string
        }
        Insert: {
          created_at?: string | null
          epic_id: string
          id?: string
          program_id: string
        }
        Update: {
          created_at?: string | null
          epic_id?: string
          id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "epic_programs_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epic_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      epic_report_templates: {
        Row: {
          columns_json: Json | null
          created_at: string | null
          filters_json: Json | null
          id: string
          is_scheduled: boolean | null
          name: string
          report_type: string
          schedule_cron: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          columns_json?: Json | null
          created_at?: string | null
          filters_json?: Json | null
          id?: string
          is_scheduled?: boolean | null
          name: string
          report_type: string
          schedule_cron?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          columns_json?: Json | null
          created_at?: string | null
          filters_json?: Json | null
          id?: string
          is_scheduled?: boolean | null
          name?: string
          report_type?: string
          schedule_cron?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      epic_roi_scores: {
        Row: {
          cost_score: number | null
          created_at: string | null
          development_risks_score: number | null
          epic_id: string | null
          id: string
          profit_potential_score: number | null
          time_to_market_score: number | null
          updated_at: string | null
          value_score: number | null
        }
        Insert: {
          cost_score?: number | null
          created_at?: string | null
          development_risks_score?: number | null
          epic_id?: string | null
          id?: string
          profit_potential_score?: number | null
          time_to_market_score?: number | null
          updated_at?: string | null
          value_score?: number | null
        }
        Update: {
          cost_score?: number | null
          created_at?: string | null
          development_risks_score?: number | null
          epic_id?: string | null
          id?: string
          profit_potential_score?: number | null
          time_to_market_score?: number | null
          updated_at?: string | null
          value_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "epic_roi_scores_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: true
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
        ]
      }
      epic_scorecard_responses: {
        Row: {
          created_at: string | null
          epic_id: string | null
          id: string
          question_id: string | null
          score: number | null
          selected_answer_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          epic_id?: string | null
          id?: string
          question_id?: string | null
          score?: number | null
          selected_answer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          epic_id?: string | null
          id?: string
          question_id?: string | null
          score?: number | null
          selected_answer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epic_scorecard_responses_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epic_scorecard_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "scorecard_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epic_scorecard_responses_selected_answer_id_fkey"
            columns: ["selected_answer_id"]
            isOneToOne: false
            referencedRelation: "scorecard_answers"
            referencedColumns: ["id"]
          },
        ]
      }
      epic_spend: {
        Row: {
          accepted_spend: number | null
          budget: number | null
          business_impact: string | null
          created_at: string | null
          discount_rate: number | null
          efficiency_dividend: number | null
          epic_id: string | null
          estimated_spend: number | null
          failure_impact: string | null
          failure_probability: string | null
          forecasted_spend: number | null
          funding_stage: string | null
          id: string
          initial_investment: number | null
          it_risk: string | null
          return_on_investment: number | null
          revenue_assurance: number | null
          risk_appetite: string | null
          updated_at: string | null
          work_code: string | null
        }
        Insert: {
          accepted_spend?: number | null
          budget?: number | null
          business_impact?: string | null
          created_at?: string | null
          discount_rate?: number | null
          efficiency_dividend?: number | null
          epic_id?: string | null
          estimated_spend?: number | null
          failure_impact?: string | null
          failure_probability?: string | null
          forecasted_spend?: number | null
          funding_stage?: string | null
          id?: string
          initial_investment?: number | null
          it_risk?: string | null
          return_on_investment?: number | null
          revenue_assurance?: number | null
          risk_appetite?: string | null
          updated_at?: string | null
          work_code?: string | null
        }
        Update: {
          accepted_spend?: number | null
          budget?: number | null
          business_impact?: string | null
          created_at?: string | null
          discount_rate?: number | null
          efficiency_dividend?: number | null
          epic_id?: string | null
          estimated_spend?: number | null
          failure_impact?: string | null
          failure_probability?: string | null
          forecasted_spend?: number | null
          funding_stage?: string | null
          id?: string
          initial_investment?: number | null
          it_risk?: string | null
          return_on_investment?: number | null
          revenue_assurance?: number | null
          risk_appetite?: string | null
          updated_at?: string | null
          work_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epic_spend_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: true
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
        ]
      }
      epic_value_metrics: {
        Row: {
          business_value: number
          cost_savings: number | null
          created_at: string
          customer_satisfaction_impact: number | null
          epic_id: string
          estimated_revenue: number | null
          id: string
          market_share_impact: number | null
          risk_reduction: number
          time_criticality: number
          updated_at: string
        }
        Insert: {
          business_value?: number
          cost_savings?: number | null
          created_at?: string
          customer_satisfaction_impact?: number | null
          epic_id: string
          estimated_revenue?: number | null
          id?: string
          market_share_impact?: number | null
          risk_reduction?: number
          time_criticality?: number
          updated_at?: string
        }
        Update: {
          business_value?: number
          cost_savings?: number | null
          created_at?: string
          customer_satisfaction_impact?: number | null
          epic_id?: string
          estimated_revenue?: number | null
          id?: string
          market_share_impact?: number | null
          risk_reduction?: number
          time_criticality?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "epic_value_metrics_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: true
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
        ]
      }
      epic_wsjf: {
        Row: {
          business_value: number | null
          created_at: string | null
          epic_id: string | null
          global_rank: number | null
          id: string
          job_size: number | null
          pi_id: string | null
          rroe_value: number | null
          time_value: number | null
          updated_at: string | null
          wsjf_score: number | null
        }
        Insert: {
          business_value?: number | null
          created_at?: string | null
          epic_id?: string | null
          global_rank?: number | null
          id?: string
          job_size?: number | null
          pi_id?: string | null
          rroe_value?: number | null
          time_value?: number | null
          updated_at?: string | null
          wsjf_score?: number | null
        }
        Update: {
          business_value?: number | null
          created_at?: string | null
          epic_id?: string | null
          global_rank?: number | null
          id?: string
          job_size?: number | null
          pi_id?: string | null
          rroe_value?: number | null
          time_value?: number | null
          updated_at?: string | null
          wsjf_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "epic_wsjf_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epic_wsjf_pi_id_fkey"
            columns: ["pi_id"]
            isOneToOne: false
            referencedRelation: "program_increments"
            referencedColumns: ["id"]
          },
        ]
      }
      epics: {
        Row: {
          ability_to_execute: string | null
          approvers: string | null
          capitalized: boolean | null
          created_at: string | null
          customers: string[] | null
          date_lock_history: Json | null
          date_locked: boolean | null
          deleted_at: string | null
          description: string | null
          effort_swag: number | null
          end_date: string | null
          epic_key: string | null
          epic_type: string | null
          estimate: number | null
          estimate_confidence: number | null
          estimate_method: string | null
          estimation_system: string | null
          future_state: string | null
          global_rank: number | null
          health: Database["public"]["Enums"]["health_status"] | null
          id: string
          initiation_date: string | null
          investment_type: string | null
          last_estimate_calculation: string | null
          mvp: boolean | null
          name: string
          owner_id: string | null
          owner_name: string | null
          parked_at: string | null
          points_estimate: number | null
          portfolio_ask_date: string | null
          portfolio_id: string | null
          portfolio_rank: number | null
          primary_program_id: string | null
          process_flow_entered_at: string | null
          process_step_entered_at: string | null
          process_step_id: string | null
          program_rank: number | null
          quadrant: string | null
          report_color: string | null
          start_date: string | null
          state: Database["public"]["Enums"]["epic_state"] | null
          status: Database["public"]["Enums"]["epic_status"] | null
          strategic_driver: string | null
          strategic_value_score: number | null
          success_criteria: string | null
          tags: string[] | null
          target_completion_date: string | null
          theme_id: string | null
          updated_at: string | null
        }
        Insert: {
          ability_to_execute?: string | null
          approvers?: string | null
          capitalized?: boolean | null
          created_at?: string | null
          customers?: string[] | null
          date_lock_history?: Json | null
          date_locked?: boolean | null
          deleted_at?: string | null
          description?: string | null
          effort_swag?: number | null
          end_date?: string | null
          epic_key?: string | null
          epic_type?: string | null
          estimate?: number | null
          estimate_confidence?: number | null
          estimate_method?: string | null
          estimation_system?: string | null
          future_state?: string | null
          global_rank?: number | null
          health?: Database["public"]["Enums"]["health_status"] | null
          id?: string
          initiation_date?: string | null
          investment_type?: string | null
          last_estimate_calculation?: string | null
          mvp?: boolean | null
          name: string
          owner_id?: string | null
          owner_name?: string | null
          parked_at?: string | null
          points_estimate?: number | null
          portfolio_ask_date?: string | null
          portfolio_id?: string | null
          portfolio_rank?: number | null
          primary_program_id?: string | null
          process_flow_entered_at?: string | null
          process_step_entered_at?: string | null
          process_step_id?: string | null
          program_rank?: number | null
          quadrant?: string | null
          report_color?: string | null
          start_date?: string | null
          state?: Database["public"]["Enums"]["epic_state"] | null
          status?: Database["public"]["Enums"]["epic_status"] | null
          strategic_driver?: string | null
          strategic_value_score?: number | null
          success_criteria?: string | null
          tags?: string[] | null
          target_completion_date?: string | null
          theme_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ability_to_execute?: string | null
          approvers?: string | null
          capitalized?: boolean | null
          created_at?: string | null
          customers?: string[] | null
          date_lock_history?: Json | null
          date_locked?: boolean | null
          deleted_at?: string | null
          description?: string | null
          effort_swag?: number | null
          end_date?: string | null
          epic_key?: string | null
          epic_type?: string | null
          estimate?: number | null
          estimate_confidence?: number | null
          estimate_method?: string | null
          estimation_system?: string | null
          future_state?: string | null
          global_rank?: number | null
          health?: Database["public"]["Enums"]["health_status"] | null
          id?: string
          initiation_date?: string | null
          investment_type?: string | null
          last_estimate_calculation?: string | null
          mvp?: boolean | null
          name?: string
          owner_id?: string | null
          owner_name?: string | null
          parked_at?: string | null
          points_estimate?: number | null
          portfolio_ask_date?: string | null
          portfolio_id?: string | null
          portfolio_rank?: number | null
          primary_program_id?: string | null
          process_flow_entered_at?: string | null
          process_step_entered_at?: string | null
          process_step_id?: string | null
          program_rank?: number | null
          quadrant?: string | null
          report_color?: string | null
          start_date?: string | null
          state?: Database["public"]["Enums"]["epic_state"] | null
          status?: Database["public"]["Enums"]["epic_status"] | null
          strategic_driver?: string | null
          strategic_value_score?: number | null
          success_criteria?: string | null
          tags?: string[] | null
          target_completion_date?: string | null
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
          {
            foreignKeyName: "fk_epics_portfolio"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_epics_process_step"
            columns: ["process_step_id"]
            isOneToOne: false
            referencedRelation: "process_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      estimation_conversions: {
        Row: {
          created_at: string | null
          id: string
          member_weeks: number
          sort_order: number
          tshirt_size: string
          updated_at: string | null
          work_item_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          member_weeks: number
          sort_order: number
          tshirt_size: string
          updated_at?: string | null
          work_item_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          member_weeks?: number
          sort_order?: number
          tshirt_size?: string
          updated_at?: string | null
          work_item_type?: string
        }
        Relationships: []
      }
      external_entities: {
        Row: {
          contact_info: Json | null
          created_at: string | null
          description: string | null
          entity_type: string | null
          id: string
          is_active: boolean | null
          name: string
          proxy_owner_id: string | null
          updated_at: string | null
        }
        Insert: {
          contact_info?: Json | null
          created_at?: string | null
          description?: string | null
          entity_type?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          proxy_owner_id?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_info?: Json | null
          created_at?: string | null
          description?: string | null
          entity_type?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          proxy_owner_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean
          flag_key: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean
          flag_key: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean
          flag_key?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
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
      feature_scheduling_history: {
        Row: {
          changed_at: string
          created_at: string | null
          end_sprint_id: string | null
          feature_id: string
          id: string
          start_sprint_id: string | null
          user_id: string | null
        }
        Insert: {
          changed_at?: string
          created_at?: string | null
          end_sprint_id?: string | null
          feature_id: string
          id?: string
          start_sprint_id?: string | null
          user_id?: string | null
        }
        Update: {
          changed_at?: string
          created_at?: string | null
          end_sprint_id?: string | null
          feature_id?: string
          id?: string
          start_sprint_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_scheduling_history_end_sprint_id_fkey"
            columns: ["end_sprint_id"]
            isOneToOne: false
            referencedRelation: "iterations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_scheduling_history_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_scheduling_history_start_sprint_id_fkey"
            columns: ["start_sprint_id"]
            isOneToOne: false
            referencedRelation: "iterations"
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
          budget: number | null
          business_value: number | null
          capitalized: boolean | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          display_id: string | null
          epic_id: string
          estimate_points: number | null
          estimation_method: string | null
          expected_cost_savings: number | null
          expected_revenue_growth: number | null
          global_rank: number | null
          health: Database["public"]["Enums"]["health_status"] | null
          id: string
          is_orphan_on_board: boolean | null
          iteration_id: string | null
          job_size: number | null
          name: string
          notes: string | null
          original_minutes: number | null
          orphan_board_teams: string[] | null
          owner_id: string | null
          parked_at: string | null
          pi_id: string | null
          planned_end_date: string | null
          planned_start_date: string | null
          program_epic_inherited: boolean | null
          program_id: string
          progress_pct: number | null
          rank_within_epic: number | null
          remaining_minutes: number | null
          risk_reduction: number | null
          spent_minutes: number | null
          status: Database["public"]["Enums"]["feature_status"] | null
          team_id: string | null
          team_target_completion_sprint_id: string | null
          time_criticality: number | null
          updated_at: string | null
          work_code: string | null
          wsjf_score: number | null
        }
        Insert: {
          acceptance_criteria?: string | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          blocked?: boolean | null
          blocked_reason?: string | null
          budget?: number | null
          business_value?: number | null
          capitalized?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          display_id?: string | null
          epic_id: string
          estimate_points?: number | null
          estimation_method?: string | null
          expected_cost_savings?: number | null
          expected_revenue_growth?: number | null
          global_rank?: number | null
          health?: Database["public"]["Enums"]["health_status"] | null
          id?: string
          is_orphan_on_board?: boolean | null
          iteration_id?: string | null
          job_size?: number | null
          name: string
          notes?: string | null
          original_minutes?: number | null
          orphan_board_teams?: string[] | null
          owner_id?: string | null
          parked_at?: string | null
          pi_id?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          program_epic_inherited?: boolean | null
          program_id: string
          progress_pct?: number | null
          rank_within_epic?: number | null
          remaining_minutes?: number | null
          risk_reduction?: number | null
          spent_minutes?: number | null
          status?: Database["public"]["Enums"]["feature_status"] | null
          team_id?: string | null
          team_target_completion_sprint_id?: string | null
          time_criticality?: number | null
          updated_at?: string | null
          work_code?: string | null
          wsjf_score?: number | null
        }
        Update: {
          acceptance_criteria?: string | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          blocked?: boolean | null
          blocked_reason?: string | null
          budget?: number | null
          business_value?: number | null
          capitalized?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          display_id?: string | null
          epic_id?: string
          estimate_points?: number | null
          estimation_method?: string | null
          expected_cost_savings?: number | null
          expected_revenue_growth?: number | null
          global_rank?: number | null
          health?: Database["public"]["Enums"]["health_status"] | null
          id?: string
          is_orphan_on_board?: boolean | null
          iteration_id?: string | null
          job_size?: number | null
          name?: string
          notes?: string | null
          original_minutes?: number | null
          orphan_board_teams?: string[] | null
          owner_id?: string | null
          parked_at?: string | null
          pi_id?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          program_epic_inherited?: boolean | null
          program_id?: string
          progress_pct?: number | null
          rank_within_epic?: number | null
          remaining_minutes?: number | null
          risk_reduction?: number | null
          spent_minutes?: number | null
          status?: Database["public"]["Enums"]["feature_status"] | null
          team_id?: string | null
          team_target_completion_sprint_id?: string | null
          time_criticality?: number | null
          updated_at?: string | null
          work_code?: string | null
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
          {
            foreignKeyName: "features_team_target_completion_sprint_id_fkey"
            columns: ["team_target_completion_sprint_id"]
            isOneToOne: false
            referencedRelation: "iterations"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_entries: {
        Row: {
          created_at: string | null
          estimate: number
          id: string
          in_scope: boolean | null
          pi_id: string
          program_id: string | null
          team_id: string | null
          unit: string
          updated_at: string | null
          updated_by: string | null
          work_item_id: string
          work_item_type: string
        }
        Insert: {
          created_at?: string | null
          estimate?: number
          id?: string
          in_scope?: boolean | null
          pi_id: string
          program_id?: string | null
          team_id?: string | null
          unit?: string
          updated_at?: string | null
          updated_by?: string | null
          work_item_id: string
          work_item_type: string
        }
        Update: {
          created_at?: string | null
          estimate?: number
          id?: string
          in_scope?: boolean | null
          pi_id?: string
          program_id?: string | null
          team_id?: string | null
          unit?: string
          updated_at?: string | null
          updated_by?: string | null
          work_item_id?: string
          work_item_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecast_entries_pi_id_fkey"
            columns: ["pi_id"]
            isOneToOne: false
            referencedRelation: "program_increments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_entries_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_entries_team_id_fkey"
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
      idea_group_members: {
        Row: {
          created_at: string | null
          created_by: string | null
          group_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          group_id: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          group_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "idea_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_groups: {
        Row: {
          admin_user_ids: string[] | null
          allow_voting: boolean
          approve_external_users: boolean
          category: string
          contributor_user_ids: string[] | null
          created_at: string
          external_link: string | null
          form_id: string | null
          id: string
          is_enabled: boolean
          is_public: boolean
          make_states_public: boolean
          max_votes_per_idea: number | null
          name: string
          product_id: string | null
          total_user_tokens: number
          updated_at: string
          voting_type: string
        }
        Insert: {
          admin_user_ids?: string[] | null
          allow_voting?: boolean
          approve_external_users?: boolean
          category?: string
          contributor_user_ids?: string[] | null
          created_at?: string
          external_link?: string | null
          form_id?: string | null
          id?: string
          is_enabled?: boolean
          is_public?: boolean
          make_states_public?: boolean
          max_votes_per_idea?: number | null
          name: string
          product_id?: string | null
          total_user_tokens?: number
          updated_at?: string
          voting_type?: string
        }
        Update: {
          admin_user_ids?: string[] | null
          allow_voting?: boolean
          approve_external_users?: boolean
          category?: string
          contributor_user_ids?: string[] | null
          created_at?: string
          external_link?: string | null
          form_id?: string | null
          id?: string
          is_enabled?: boolean
          is_public?: boolean
          make_states_public?: boolean
          max_votes_per_idea?: number | null
          name?: string
          product_id?: string | null
          total_user_tokens?: number
          updated_at?: string
          voting_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_groups_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "ideation_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          against_votes: number
          attachment_count: number
          comment_count: number
          created_at: string
          created_by_id: string | null
          custom_fields: Json | null
          customer_id: string | null
          description: string
          for_votes: number
          id: string
          idea_group_id: string
          is_public: boolean
          owner_id: string | null
          product_id: string | null
          status: string
          t_shirt_size: string | null
          title: string
          token_votes: number
          updated_at: string
          vote_score: number
          work_item_id: string | null
          work_item_type: string | null
        }
        Insert: {
          against_votes?: number
          attachment_count?: number
          comment_count?: number
          created_at?: string
          created_by_id?: string | null
          custom_fields?: Json | null
          customer_id?: string | null
          description: string
          for_votes?: number
          id?: string
          idea_group_id: string
          is_public?: boolean
          owner_id?: string | null
          product_id?: string | null
          status?: string
          t_shirt_size?: string | null
          title: string
          token_votes?: number
          updated_at?: string
          vote_score?: number
          work_item_id?: string | null
          work_item_type?: string | null
        }
        Update: {
          against_votes?: number
          attachment_count?: number
          comment_count?: number
          created_at?: string
          created_by_id?: string | null
          custom_fields?: Json | null
          customer_id?: string | null
          description?: string
          for_votes?: number
          id?: string
          idea_group_id?: string
          is_public?: boolean
          owner_id?: string | null
          product_id?: string | null
          status?: string
          t_shirt_size?: string | null
          title?: string
          token_votes?: number
          updated_at?: string
          vote_score?: number
          work_item_id?: string | null
          work_item_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ideas_idea_group_id_fkey"
            columns: ["idea_group_id"]
            isOneToOne: false
            referencedRelation: "idea_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      ideation_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          idea_id: string
          is_external: boolean
          uploaded_by_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          idea_id: string
          is_external?: boolean
          uploaded_by_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          idea_id?: string
          is_external?: boolean
          uploaded_by_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideation_attachments_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      ideation_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          idea_id: string
          is_external: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          idea_id: string
          is_external?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          idea_id?: string
          is_external?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideation_comments_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      ideation_external_users: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          is_approved: boolean
          is_enabled: boolean
          last_login_at: string | null
          last_name: string
          password_hash: string
          registered_group_ids: string[] | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          is_approved?: boolean
          is_enabled?: boolean
          last_login_at?: string | null
          last_name: string
          password_hash: string
          registered_group_ids?: string[] | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_approved?: boolean
          is_enabled?: boolean
          last_login_at?: string | null
          last_name?: string
          password_hash?: string
          registered_group_ids?: string[] | null
        }
        Relationships: []
      }
      ideation_form_fields: {
        Row: {
          created_at: string
          field_type: string
          form_id: string
          help_text: string | null
          id: string
          is_active: boolean
          is_external: boolean
          is_required: boolean
          label: string
          options: Json | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_type: string
          form_id: string
          help_text?: string | null
          id?: string
          is_active?: boolean
          is_external?: boolean
          is_required?: boolean
          label: string
          options?: Json | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_type?: string
          form_id?: string
          help_text?: string | null
          id?: string
          is_active?: boolean
          is_external?: boolean
          is_required?: boolean
          label?: string
          options?: Json | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideation_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "ideation_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      ideation_forms: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ideation_subscriptions: {
        Row: {
          created_at: string
          id: string
          idea_id: string
          is_external: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idea_id: string
          is_external?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idea_id?: string
          is_external?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideation_subscriptions_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      ideation_votes: {
        Row: {
          created_at: string
          id: string
          idea_id: string
          token_count: number
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          idea_id: string
          token_count?: number
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string
          id?: string
          idea_id?: string
          token_count?: number
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideation_votes_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      import_history: {
        Row: {
          created_at: string | null
          failed_records: number
          file_name: string
          file_type: string
          id: string
          imported_by: string
          imported_records: number
          total_records: number
        }
        Insert: {
          created_at?: string | null
          failed_records?: number
          file_name: string
          file_type: string
          id?: string
          imported_by: string
          imported_records?: number
          total_records?: number
        }
        Update: {
          created_at?: string | null
          failed_records?: number
          file_name?: string
          file_type?: string
          id?: string
          imported_by?: string
          imported_records?: number
          total_records?: number
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
      intake_fields: {
        Row: {
          created_at: string | null
          field_name: string
          field_type: string | null
          id: string
          intake_set_id: string | null
          max_length: number | null
          options: string[] | null
          position: number
        }
        Insert: {
          created_at?: string | null
          field_name: string
          field_type?: string | null
          id?: string
          intake_set_id?: string | null
          max_length?: number | null
          options?: string[] | null
          position: number
        }
        Update: {
          created_at?: string | null
          field_name?: string
          field_type?: string | null
          id?: string
          intake_set_id?: string | null
          max_length?: number | null
          options?: string[] | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "intake_fields_intake_set_id_fkey"
            columns: ["intake_set_id"]
            isOneToOne: false
            referencedRelation: "intake_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_sets: {
        Row: {
          created_at: string | null
          id: string
          name: string
          portfolio_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          portfolio_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          portfolio_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_sets_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
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
          goal: string | null
          id: string
          name: string
          pi_id: string
          short_name: string | null
          start_date: string | null
          sync_date: string | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          goal?: string | null
          id?: string
          name: string
          pi_id: string
          short_name?: string | null
          start_date?: string | null
          sync_date?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          goal?: string | null
          id?: string
          name?: string
          pi_id?: string
          short_name?: string | null
          start_date?: string | null
          sync_date?: string | null
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
      jira_auth_credentials: {
        Row: {
          auth_data: Json
          connection_id: string
          created_at: string | null
          id: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          auth_data: Json
          connection_id: string
          created_at?: string | null
          id?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_data?: Json
          connection_id?: string
          created_at?: string | null
          id?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jira_auth_credentials_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "jira_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_board_mappings: {
        Row: {
          catalyst_team_id: string | null
          connection_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          jira_board_id: string
          jira_board_name: string
          jira_project_key: string
          sync_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          catalyst_team_id?: string | null
          connection_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          jira_board_id: string
          jira_board_name: string
          jira_project_key: string
          sync_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          catalyst_team_id?: string | null
          connection_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          jira_board_id?: string
          jira_board_name?: string
          jira_project_key?: string
          sync_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jira_board_mappings_catalyst_team_id_fkey"
            columns: ["catalyst_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_board_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "jira_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_connections: {
        Row: {
          auth_method: string
          created_at: string | null
          created_by: string | null
          id: string
          instance_type: string
          is_active: boolean | null
          jira_url: string
          last_sync_at: string | null
          last_test_message: string | null
          last_test_status: string | null
          name: string
          sync_settings: Json | null
          updated_at: string | null
        }
        Insert: {
          auth_method: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          instance_type: string
          is_active?: boolean | null
          jira_url: string
          last_sync_at?: string | null
          last_test_message?: string | null
          last_test_status?: string | null
          name: string
          sync_settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          auth_method?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          instance_type?: string
          is_active?: boolean | null
          jira_url?: string
          last_sync_at?: string | null
          last_test_message?: string | null
          last_test_status?: string | null
          name?: string
          sync_settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      jira_field_mappings: {
        Row: {
          catalyst_entity: string
          catalyst_field: string
          connection_id: string
          created_at: string | null
          id: string
          is_enabled: boolean | null
          jira_field: string
          jira_field_type: string | null
          sync_direction: string | null
          transformation_rules: Json | null
          updated_at: string | null
        }
        Insert: {
          catalyst_entity: string
          catalyst_field: string
          connection_id: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          jira_field: string
          jira_field_type?: string | null
          sync_direction?: string | null
          transformation_rules?: Json | null
          updated_at?: string | null
        }
        Update: {
          catalyst_entity?: string
          catalyst_field?: string
          connection_id?: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          jira_field?: string
          jira_field_type?: string | null
          sync_direction?: string | null
          transformation_rules?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jira_field_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "jira_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_project_mappings: {
        Row: {
          catalyst_program_id: string | null
          connection_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          jira_project_id: string
          jira_project_key: string
          jira_project_name: string
          sync_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          catalyst_program_id?: string | null
          connection_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          jira_project_id: string
          jira_project_key: string
          jira_project_name: string
          sync_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          catalyst_program_id?: string | null
          connection_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          jira_project_id?: string
          jira_project_key?: string
          jira_project_name?: string
          sync_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jira_project_mappings_catalyst_program_id_fkey"
            columns: ["catalyst_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_project_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "jira_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_sync_logs: {
        Row: {
          completed_at: string | null
          connection_id: string
          created_at: string | null
          entity_type: string | null
          error_details: Json | null
          id: string
          items_created: number | null
          items_failed: number | null
          items_processed: number | null
          items_updated: number | null
          started_at: string | null
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          connection_id: string
          created_at?: string | null
          entity_type?: string | null
          error_details?: Json | null
          id?: string
          items_created?: number | null
          items_failed?: number | null
          items_processed?: number | null
          items_updated?: number | null
          started_at?: string | null
          status: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          connection_id?: string
          created_at?: string | null
          entity_type?: string | null
          error_details?: Json | null
          id?: string
          items_created?: number | null
          items_failed?: number | null
          items_processed?: number | null
          items_updated?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "jira_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "jira_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_work_item_links: {
        Row: {
          catalyst_entity_id: string
          catalyst_entity_type: string
          conflict_details: Json | null
          connection_id: string
          created_at: string | null
          id: string
          jira_issue_id: string
          jira_issue_key: string
          jira_issue_type: string
          last_synced_at: string | null
          sync_status: string | null
          updated_at: string | null
        }
        Insert: {
          catalyst_entity_id: string
          catalyst_entity_type: string
          conflict_details?: Json | null
          connection_id: string
          created_at?: string | null
          id?: string
          jira_issue_id: string
          jira_issue_key: string
          jira_issue_type: string
          last_synced_at?: string | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Update: {
          catalyst_entity_id?: string
          catalyst_entity_type?: string
          conflict_details?: Json | null
          connection_id?: string
          created_at?: string | null
          id?: string
          jira_issue_id?: string
          jira_issue_key?: string
          jira_issue_type?: string
          last_synced_at?: string | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jira_work_item_links_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "jira_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_board_users: {
        Row: {
          board_id: string | null
          created_at: string | null
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          board_id?: string | null
          created_at?: string | null
          id?: string
          role: string
          user_id?: string | null
        }
        Update: {
          board_id?: string | null
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_board_users_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "kanban_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_boards: {
        Row: {
          allow_overloading: boolean | null
          allow_state_mapping: boolean | null
          card_types: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          portfolio_id: string | null
          program_id: string | null
          settings: Json | null
          team_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          allow_overloading?: boolean | null
          allow_state_mapping?: boolean | null
          card_types?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          portfolio_id?: string | null
          program_id?: string | null
          settings?: Json | null
          team_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          allow_overloading?: boolean | null
          allow_state_mapping?: boolean | null
          card_types?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          portfolio_id?: string | null
          program_id?: string | null
          settings?: Json | null
          team_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_boards_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_boards_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_boards_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_card_history: {
        Row: {
          card_id: string | null
          from_column_id: string | null
          id: string
          moved_at: string | null
          moved_by: string | null
          to_column_id: string | null
          wip_override_reason: string | null
        }
        Insert: {
          card_id?: string | null
          from_column_id?: string | null
          id?: string
          moved_at?: string | null
          moved_by?: string | null
          to_column_id?: string | null
          wip_override_reason?: string | null
        }
        Update: {
          card_id?: string | null
          from_column_id?: string | null
          id?: string
          moved_at?: string | null
          moved_by?: string | null
          to_column_id?: string | null
          wip_override_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_card_history_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_card_history_from_column_id_fkey"
            columns: ["from_column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_card_history_to_column_id_fkey"
            columns: ["to_column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_cards: {
        Row: {
          added_at: string | null
          board_id: string | null
          card_type: string | null
          color: string | null
          column_id: string | null
          id: string
          is_blocked: boolean | null
          sort_order: number | null
          swim_lane_id: string | null
          work_item_id: string
          work_item_type: string
        }
        Insert: {
          added_at?: string | null
          board_id?: string | null
          card_type?: string | null
          color?: string | null
          column_id?: string | null
          id?: string
          is_blocked?: boolean | null
          sort_order?: number | null
          swim_lane_id?: string | null
          work_item_id: string
          work_item_type: string
        }
        Update: {
          added_at?: string | null
          board_id?: string | null
          card_type?: string | null
          color?: string | null
          column_id?: string | null
          id?: string
          is_blocked?: boolean | null
          sort_order?: number | null
          swim_lane_id?: string | null
          work_item_id?: string
          work_item_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "kanban_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_cards_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_cards_swim_lane_id_fkey"
            columns: ["swim_lane_id"]
            isOneToOne: false
            referencedRelation: "kanban_swim_lanes"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_columns: {
        Row: {
          board_id: string | null
          column_type: string
          created_at: string | null
          exit_criteria: string | null
          id: string
          name: string
          parent_column_id: string | null
          sort_order: number | null
          state_mappings: Json | null
          wip_limit: number | null
        }
        Insert: {
          board_id?: string | null
          column_type: string
          created_at?: string | null
          exit_criteria?: string | null
          id?: string
          name: string
          parent_column_id?: string | null
          sort_order?: number | null
          state_mappings?: Json | null
          wip_limit?: number | null
        }
        Update: {
          board_id?: string | null
          column_type?: string
          created_at?: string | null
          exit_criteria?: string | null
          id?: string
          name?: string
          parent_column_id?: string | null
          sort_order?: number | null
          state_mappings?: Json | null
          wip_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "kanban_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_columns_parent_column_id_fkey"
            columns: ["parent_column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_swim_lanes: {
        Row: {
          board_id: string | null
          created_at: string | null
          id: string
          is_collapsed: boolean | null
          name: string
          sort_order: number | null
          wip_limit: number | null
        }
        Insert: {
          board_id?: string | null
          created_at?: string | null
          id?: string
          is_collapsed?: boolean | null
          name: string
          sort_order?: number | null
          wip_limit?: number | null
        }
        Update: {
          board_id?: string | null
          created_at?: string | null
          id?: string
          is_collapsed?: boolean | null
          name?: string
          sort_order?: number | null
          wip_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_swim_lanes_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "kanban_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string
          resource_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id: string
          resource_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string
          resource_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      kb_doc_spaces: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_doc_spaces_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "kb_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_document_attachments: {
        Row: {
          document_id: string
          file_path: string
          file_size: number
          filename: string
          id: string
          mime_type: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          document_id: string
          file_path: string
          file_size: number
          filename: string
          id?: string
          mime_type: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          document_id?: string
          file_path?: string
          file_size?: number
          filename?: string
          id?: string
          mime_type?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_document_attachments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "kb_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_document_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          document_id: string
          id: string
          parent_comment_id: string | null
          resolved: boolean | null
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          document_id: string
          id?: string
          parent_comment_id?: string | null
          resolved?: boolean | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          document_id?: string
          id?: string
          parent_comment_id?: string | null
          resolved?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "kb_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_document_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "kb_document_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_document_favorites: {
        Row: {
          created_at: string
          document_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_document_favorites_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "kb_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_document_jira_issues: {
        Row: {
          cached_at: string
          document_id: string
          id: string
          work_item_assignee: string | null
          work_item_id: string
          work_item_status: string
          work_item_title: string
          work_item_type: string
        }
        Insert: {
          cached_at?: string
          document_id: string
          id?: string
          work_item_assignee?: string | null
          work_item_id: string
          work_item_status: string
          work_item_title: string
          work_item_type: string
        }
        Update: {
          cached_at?: string
          document_id?: string
          id?: string
          work_item_assignee?: string | null
          work_item_id?: string
          work_item_status?: string
          work_item_title?: string
          work_item_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_document_jira_issues_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "kb_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_document_labels: {
        Row: {
          created_at: string
          document_id: string
          id: string
          label: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          label: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_document_labels_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "kb_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_document_page_properties: {
        Row: {
          created_at: string
          document_id: string
          id: string
          property_key: string
          property_type: string | null
          property_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          property_key: string
          property_type?: string | null
          property_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          property_key?: string
          property_type?: string | null
          property_value?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_document_page_properties_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "kb_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_document_restrictions: {
        Row: {
          created_at: string
          created_by: string
          document_id: string
          entity_id: string
          entity_type: string
          id: string
          restriction_type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          document_id: string
          entity_id: string
          entity_type: string
          id?: string
          restriction_type: string
        }
        Update: {
          created_at?: string
          created_by?: string
          document_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
          restriction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_document_restrictions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "kb_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_document_versions: {
        Row: {
          change_summary: string | null
          content: Json
          content_text: string | null
          created_at: string
          created_by: string
          document_id: string
          id: string
          title: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          content: Json
          content_text?: string | null
          created_at?: string
          created_by: string
          document_id: string
          id?: string
          title: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          content?: Json
          content_text?: string | null
          created_at?: string
          created_by?: string
          document_id?: string
          id?: string
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "kb_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "kb_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_document_watchers: {
        Row: {
          created_at: string
          document_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_document_watchers_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "kb_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_documents: {
        Row: {
          content: Json
          content_text: string | null
          created_at: string
          created_by: string
          id: string
          linked_work_item_id: string | null
          linked_work_item_type: string | null
          parent_id: string | null
          published_at: string | null
          search_vector: unknown
          space_id: string | null
          title: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          content?: Json
          content_text?: string | null
          created_at?: string
          created_by: string
          id?: string
          linked_work_item_id?: string | null
          linked_work_item_type?: string | null
          parent_id?: string | null
          published_at?: string | null
          search_vector?: unknown
          space_id?: string | null
          title: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          content?: Json
          content_text?: string | null
          created_at?: string
          created_by?: string
          id?: string
          linked_work_item_id?: string | null
          linked_work_item_type?: string | null
          parent_id?: string | null
          published_at?: string | null
          search_vector?: unknown
          space_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_documents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "kb_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_documents_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "kb_doc_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
          direction: string | null
          due_date: string | null
          end_date: string | null
          goal_value: number
          health: string | null
          id: string
          is_manual_override_allowed: boolean | null
          last_checkin_at: string | null
          last_update_date: string | null
          locked: boolean | null
          metric_type: string
          objective_id: string | null
          override_reason: string | null
          override_value: number | null
          owner_id: string | null
          owner_user_id: string | null
          progress: number | null
          score: number | null
          score_config: Json | null
          start_date: string | null
          status: string | null
          summary: string
          target_value: number | null
          update_frequency: string | null
          updated_at: string | null
        }
        Insert: {
          baseline_value?: number | null
          created_at?: string | null
          current_value?: number | null
          direction?: string | null
          due_date?: string | null
          end_date?: string | null
          goal_value: number
          health?: string | null
          id?: string
          is_manual_override_allowed?: boolean | null
          last_checkin_at?: string | null
          last_update_date?: string | null
          locked?: boolean | null
          metric_type: string
          objective_id?: string | null
          override_reason?: string | null
          override_value?: number | null
          owner_id?: string | null
          owner_user_id?: string | null
          progress?: number | null
          score?: number | null
          score_config?: Json | null
          start_date?: string | null
          status?: string | null
          summary: string
          target_value?: number | null
          update_frequency?: string | null
          updated_at?: string | null
        }
        Update: {
          baseline_value?: number | null
          created_at?: string | null
          current_value?: number | null
          direction?: string | null
          due_date?: string | null
          end_date?: string | null
          goal_value?: number
          health?: string | null
          id?: string
          is_manual_override_allowed?: boolean | null
          last_checkin_at?: string | null
          last_update_date?: string | null
          locked?: boolean | null
          metric_type?: string
          objective_id?: string | null
          override_reason?: string | null
          override_value?: number | null
          owner_id?: string | null
          owner_user_id?: string | null
          progress?: number | null
          score?: number | null
          score_config?: Json | null
          start_date?: string | null
          status?: string | null
          summary?: string
          target_value?: number | null
          update_frequency?: string | null
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
      kr_work_contributions: {
        Row: {
          calculated_progress: number | null
          contribution_percent: number
          created_at: string | null
          created_by: string | null
          id: string
          key_result_id: string
          notes: string | null
          updated_at: string | null
          work_item_id: string
          work_item_type: string
        }
        Insert: {
          calculated_progress?: number | null
          contribution_percent: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          key_result_id: string
          notes?: string | null
          updated_at?: string | null
          work_item_id: string
          work_item_type: string
        }
        Update: {
          calculated_progress?: number | null
          contribution_percent?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          key_result_id?: string
          notes?: string | null
          updated_at?: string | null
          work_item_id?: string
          work_item_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "kr_work_contributions_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "key_results_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          portfolio_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          portfolio_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          portfolio_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestone_categories_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          business_request_id: string | null
          category: string | null
          category_id: string | null
          completed_date: string | null
          created_at: string | null
          description: string | null
          due_date: string
          epic_id: string | null
          id: string
          milestone_type: string | null
          start_date: string | null
          state: string | null
          title: string
          updated_at: string | null
          work_item_id: string | null
        }
        Insert: {
          business_request_id?: string | null
          category?: string | null
          category_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          description?: string | null
          due_date: string
          epic_id?: string | null
          id?: string
          milestone_type?: string | null
          start_date?: string | null
          state?: string | null
          title: string
          updated_at?: string | null
          work_item_id?: string | null
        }
        Update: {
          business_request_id?: string | null
          category?: string | null
          category_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string
          epic_id?: string | null
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
            foreignKeyName: "milestones_business_request_id_fkey"
            columns: ["business_request_id"]
            isOneToOne: false
            referencedRelation: "business_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "milestone_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
        ]
      }
      module_packages: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_default_enabled: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_default_enabled?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_default_enabled?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
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
      objective_capability_links: {
        Row: {
          capability_id: string
          created_at: string | null
          created_by: string | null
          id: string
          objective_id: string
        }
        Insert: {
          capability_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          objective_id: string
        }
        Update: {
          capability_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          objective_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_capability_links_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_contributors: {
        Row: {
          created_at: string | null
          id: string
          objective_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          objective_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          objective_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_contributors_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
        ]
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
      objective_feature_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          feature_id: string
          id: string
          objective_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          feature_id: string
          id?: string
          objective_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          feature_id?: string
          id?: string
          objective_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_feature_links_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_feature_links_objective_id_fkey"
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
      objective_linked_items: {
        Row: {
          added_by_name: string | null
          created_at: string | null
          created_by: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          kind: string | null
          link_type: string | null
          linked_item_id: string | null
          linked_item_type: string | null
          mime_type: string | null
          objective_id: string
          title: string
          url: string
        }
        Insert: {
          added_by_name?: string | null
          created_at?: string | null
          created_by?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          kind?: string | null
          link_type?: string | null
          linked_item_id?: string | null
          linked_item_type?: string | null
          mime_type?: string | null
          objective_id: string
          title: string
          url: string
        }
        Update: {
          added_by_name?: string | null
          created_at?: string | null
          created_by?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          kind?: string | null
          link_type?: string | null
          linked_item_id?: string | null
          linked_item_type?: string | null
          mime_type?: string | null
          objective_id?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_linked_items_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_program_increments: {
        Row: {
          created_at: string | null
          id: string
          objective_id: string
          program_increment_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          objective_id: string
          program_increment_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          objective_id?: string
          program_increment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_program_increments_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_program_increments_program_increment_id_fkey"
            columns: ["program_increment_id"]
            isOneToOne: false
            referencedRelation: "program_increments"
            referencedColumns: ["id"]
          },
        ]
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
      objective_work_item_alignments: {
        Row: {
          alignment_type: Database["public"]["Enums"]["alignment_type"] | null
          created_at: string | null
          created_by_user_id: string | null
          id: string
          objective_id: string
          work_item_id: string
          work_item_type: Database["public"]["Enums"]["work_item_type_enum"]
        }
        Insert: {
          alignment_type?: Database["public"]["Enums"]["alignment_type"] | null
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          objective_id: string
          work_item_id: string
          work_item_type: Database["public"]["Enums"]["work_item_type_enum"]
        }
        Update: {
          alignment_type?: Database["public"]["Enums"]["alignment_type"] | null
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          objective_id?: string
          work_item_id?: string
          work_item_type?: Database["public"]["Enums"]["work_item_type_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "objective_work_item_alignments_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
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
          category: Database["public"]["Enums"]["objective_category"] | null
          confidence: Database["public"]["Enums"]["confidence_level"] | null
          confidence_note: string | null
          confidence_score: number | null
          confidence_updated_at: string | null
          contributors: string[] | null
          created_at: string | null
          created_by: string | null
          delivered_value: number | null
          description: string | null
          due_date: string | null
          end_date: string | null
          goal_id: string | null
          health: Database["public"]["Enums"]["objective_health"] | null
          id: string
          is_blocked: boolean | null
          is_v2: boolean | null
          key_result_progress: number | null
          level: string | null
          name: string
          notes: string | null
          objective_level_id: string | null
          objective_type: string | null
          overall_progress: number | null
          owner_id: string | null
          parent_goal_id: string | null
          parent_key_result_id: string | null
          parent_objective_id: string | null
          planned_value: number | null
          portfolio_id: string | null
          program_id: string | null
          program_increment_ids: Json | null
          progress_pct: number | null
          score: number | null
          snapshot_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["objective_status"] | null
          summary: string | null
          tags: string[] | null
          target_anchor_sprint_id: string | null
          team_id: string | null
          theme_id: string | null
          tier: string | null
          type: Database["public"]["Enums"]["objective_type"] | null
          updated_at: string | null
          updated_by: string | null
          visibility: string | null
          work_progress: number | null
        }
        Insert: {
          anchor_sprint_id?: string | null
          blocked?: boolean | null
          category?: Database["public"]["Enums"]["objective_category"] | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          confidence_note?: string | null
          confidence_score?: number | null
          confidence_updated_at?: string | null
          contributors?: string[] | null
          created_at?: string | null
          created_by?: string | null
          delivered_value?: number | null
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          goal_id?: string | null
          health?: Database["public"]["Enums"]["objective_health"] | null
          id?: string
          is_blocked?: boolean | null
          is_v2?: boolean | null
          key_result_progress?: number | null
          level?: string | null
          name: string
          notes?: string | null
          objective_level_id?: string | null
          objective_type?: string | null
          overall_progress?: number | null
          owner_id?: string | null
          parent_goal_id?: string | null
          parent_key_result_id?: string | null
          parent_objective_id?: string | null
          planned_value?: number | null
          portfolio_id?: string | null
          program_id?: string | null
          program_increment_ids?: Json | null
          progress_pct?: number | null
          score?: number | null
          snapshot_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["objective_status"] | null
          summary?: string | null
          tags?: string[] | null
          target_anchor_sprint_id?: string | null
          team_id?: string | null
          theme_id?: string | null
          tier?: string | null
          type?: Database["public"]["Enums"]["objective_type"] | null
          updated_at?: string | null
          updated_by?: string | null
          visibility?: string | null
          work_progress?: number | null
        }
        Update: {
          anchor_sprint_id?: string | null
          blocked?: boolean | null
          category?: Database["public"]["Enums"]["objective_category"] | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          confidence_note?: string | null
          confidence_score?: number | null
          confidence_updated_at?: string | null
          contributors?: string[] | null
          created_at?: string | null
          created_by?: string | null
          delivered_value?: number | null
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          goal_id?: string | null
          health?: Database["public"]["Enums"]["objective_health"] | null
          id?: string
          is_blocked?: boolean | null
          is_v2?: boolean | null
          key_result_progress?: number | null
          level?: string | null
          name?: string
          notes?: string | null
          objective_level_id?: string | null
          objective_type?: string | null
          overall_progress?: number | null
          owner_id?: string | null
          parent_goal_id?: string | null
          parent_key_result_id?: string | null
          parent_objective_id?: string | null
          planned_value?: number | null
          portfolio_id?: string | null
          program_id?: string | null
          program_increment_ids?: Json | null
          progress_pct?: number | null
          score?: number | null
          snapshot_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["objective_status"] | null
          summary?: string | null
          tags?: string[] | null
          target_anchor_sprint_id?: string | null
          team_id?: string | null
          theme_id?: string | null
          tier?: string | null
          type?: Database["public"]["Enums"]["objective_type"] | null
          updated_at?: string | null
          updated_by?: string | null
          visibility?: string | null
          work_progress?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_objectives_parent_key_result"
            columns: ["parent_key_result_id"]
            isOneToOne: false
            referencedRelation: "key_results_v2"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "objectives_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "strategy_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "strategic_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      option_sets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      option_values: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          label: string
          label_ar: string | null
          option_set_id: string
          sort_order: number
          updated_at: string
          value_key: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          label: string
          label_ar?: string | null
          option_set_id: string
          sort_order?: number
          updated_at?: string
          value_key: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          label?: string
          label_ar?: string | null
          option_set_id?: string
          sort_order?: number
          updated_at?: string
          value_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "option_values_option_set_id_fkey"
            columns: ["option_set_id"]
            isOneToOne: false
            referencedRelation: "option_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      org_modules: {
        Row: {
          created_at: string | null
          enabled_at: string | null
          enabled_by: string | null
          id: string
          is_enabled: boolean | null
          module_code: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean | null
          module_code: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean | null
          module_code?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_modules_module_code_fkey"
            columns: ["module_code"]
            isOneToOne: true
            referencedRelation: "modules"
            referencedColumns: ["code"]
          },
        ]
      }
      package_modules: {
        Row: {
          created_at: string | null
          id: string
          module_code: string
          package_code: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          module_code: string
          package_code: string
        }
        Update: {
          created_at?: string | null
          id?: string
          module_code?: string
          package_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_modules_module_code_fkey"
            columns: ["module_code"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "package_modules_package_code_fkey"
            columns: ["package_code"]
            isOneToOne: false
            referencedRelation: "module_packages"
            referencedColumns: ["code"]
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
      portfolio_estimation_settings: {
        Row: {
          created_at: string | null
          display_weeks_in: string | null
          estimation_system: string
          id: string
          member_weeks_per_point: number | null
          portfolio_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_weeks_in?: string | null
          estimation_system?: string
          id?: string
          member_weeks_per_point?: number | null
          portfolio_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_weeks_in?: string | null
          estimation_system?: string
          id?: string
          member_weeks_per_point?: number | null
          portfolio_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_estimation_settings_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: true
            referencedRelation: "portfolios"
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
      process_flows: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          program_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          program_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          program_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_flows_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      process_steps: {
        Row: {
          created_at: string | null
          exit_criteria: string | null
          id: string
          name: string
          process_flow_id: string
          sort_order: number
          updated_at: string | null
          wip_limit: number | null
          wip_limit_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          exit_criteria?: string | null
          id?: string
          name: string
          process_flow_id: string
          sort_order: number
          updated_at?: string | null
          wip_limit?: number | null
          wip_limit_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          exit_criteria?: string | null
          id?: string
          name?: string
          process_flow_id?: string
          sort_order?: number
          updated_at?: string | null
          wip_limit?: number | null
          wip_limit_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "process_steps_process_flow_id_fkey"
            columns: ["process_flow_id"]
            isOneToOne: false
            referencedRelation: "process_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      product_role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_group: string
          permission_level: string
          role_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_group: string
          permission_level: string
          role_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_group?: string
          permission_level?: string
          role_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "product_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_roles: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          scope: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          scope?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          scope?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_status_configs: {
        Row: {
          category: string
          color: string | null
          created_at: string
          id: string
          is_default: boolean
          name: string
          position: number
          status_key: string
          updated_at: string
        }
        Insert: {
          category: string
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          position?: number
          status_key: string
          updated_at?: string
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          position?: number
          status_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_view_configs: {
        Row: {
          business_line_id: string | null
          column_key: string
          created_at: string
          display_name: string
          id: string
          is_default_sort: boolean
          is_visible: boolean
          position: number
          sort_direction: string | null
          updated_at: string
          view_type: string
        }
        Insert: {
          business_line_id?: string | null
          column_key: string
          created_at?: string
          display_name: string
          id?: string
          is_default_sort?: boolean
          is_visible?: boolean
          position?: number
          sort_direction?: string | null
          updated_at?: string
          view_type: string
        }
        Update: {
          business_line_id?: string | null
          column_key?: string
          created_at?: string
          display_name?: string
          id?: string
          is_default_sort?: boolean
          is_visible?: boolean
          position?: number
          sort_direction?: string | null
          updated_at?: string
          view_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_view_configs_business_line_id_fkey"
            columns: ["business_line_id"]
            isOneToOne: false
            referencedRelation: "business_lines"
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
          last_login: string | null
          must_change_password: boolean
          role: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          last_login?: string | null
          must_change_password?: boolean
          role?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_login?: string | null
          must_change_password?: boolean
          role?: string | null
          status?: string
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
      program_spend_per_point: {
        Row: {
          created_at: string | null
          id: string
          program_id: string | null
          spend_per_point: number
          sprint_end_date: string
          sprint_start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          program_id?: string | null
          spend_per_point: number
          sprint_end_date: string
          sprint_start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          program_id?: string | null
          spend_per_point?: number
          sprint_end_date?: string
          sprint_start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_spend_per_point_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_team_rankings: {
        Row: {
          created_at: string | null
          id: string
          program_id: string
          rank_order: number
          team_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          program_id: string
          rank_order: number
          team_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          program_id?: string
          rank_order?: number
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_team_rankings_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_team_rankings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
      recent_activity: {
        Row: {
          access_count: number
          id: string
          last_accessed_at: string
          page_key: string
          pi_label: string | null
          room_id: string
          room_name: string
          room_path: string
          room_subtitle: string | null
          room_type: Database["public"]["Enums"]["room_type"]
          timebox_id: string | null
          timebox_type: string | null
          user_id: string
        }
        Insert: {
          access_count?: number
          id?: string
          last_accessed_at?: string
          page_key?: string
          pi_label?: string | null
          room_id: string
          room_name: string
          room_path: string
          room_subtitle?: string | null
          room_type: Database["public"]["Enums"]["room_type"]
          timebox_id?: string | null
          timebox_type?: string | null
          user_id: string
        }
        Update: {
          access_count?: number
          id?: string
          last_accessed_at?: string
          page_key?: string
          pi_label?: string | null
          room_id?: string
          room_name?: string
          room_path?: string
          room_subtitle?: string | null
          room_type?: Database["public"]["Enums"]["room_type"]
          timebox_id?: string | null
          timebox_type?: string | null
          user_id?: string
        }
        Relationships: []
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
          business_request_id: string | null
          consequence: string | null
          contingency: string | null
          created_at: string
          created_by: string | null
          critical_path: string | null
          deleted_at: string | null
          description: string
          id: string
          impact: string | null
          mitigation: string | null
          notify: string | null
          occurrence: string | null
          owner_id: string | null
          program_id: string | null
          program_increment_id: string | null
          related_item_id: string | null
          relationship: string
          resolution_method: string
          resolution_status: string | null
          risk_number: number
          status: string
          tags: string | null
          target_resolution_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          business_request_id?: string | null
          consequence?: string | null
          contingency?: string | null
          created_at?: string
          created_by?: string | null
          critical_path?: string | null
          deleted_at?: string | null
          description: string
          id?: string
          impact?: string | null
          mitigation?: string | null
          notify?: string | null
          occurrence?: string | null
          owner_id?: string | null
          program_id?: string | null
          program_increment_id?: string | null
          related_item_id?: string | null
          relationship: string
          resolution_method?: string
          resolution_status?: string | null
          risk_number?: number
          status?: string
          tags?: string | null
          target_resolution_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          business_request_id?: string | null
          consequence?: string | null
          contingency?: string | null
          created_at?: string
          created_by?: string | null
          critical_path?: string | null
          deleted_at?: string | null
          description?: string
          id?: string
          impact?: string | null
          mitigation?: string | null
          notify?: string | null
          occurrence?: string | null
          owner_id?: string | null
          program_id?: string | null
          program_increment_id?: string | null
          related_item_id?: string | null
          relationship?: string
          resolution_method?: string
          resolution_status?: string | null
          risk_number?: number
          status?: string
          tags?: string | null
          target_resolution_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_program"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_program_increment"
            columns: ["program_increment_id"]
            isOneToOne: false
            referencedRelation: "program_increments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_business_request_id_fkey"
            columns: ["business_request_id"]
            isOneToOne: false
            referencedRelation: "business_requests"
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
      saved_filters: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          is_starred: boolean | null
          name: string
          query: string | null
          status: string | null
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          is_starred?: boolean | null
          name: string
          query?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          is_starred?: boolean | null
          name?: string
          query?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_emails: {
        Row: {
          created_at: string
          created_by: string
          frequency: string
          id: string
          is_active: boolean
          last_sent: string | null
          message: string
          name: string
          notify_emails: string[] | null
          notify_roles: string[] | null
          recipient_filter: Json | null
          send_day: number
          send_time: string
        }
        Insert: {
          created_at?: string
          created_by: string
          frequency: string
          id?: string
          is_active?: boolean
          last_sent?: string | null
          message: string
          name: string
          notify_emails?: string[] | null
          notify_roles?: string[] | null
          recipient_filter?: Json | null
          send_day: number
          send_time: string
        }
        Update: {
          created_at?: string
          created_by?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent?: string | null
          message?: string
          name?: string
          notify_emails?: string[] | null
          notify_roles?: string[] | null
          recipient_filter?: Json | null
          send_day?: number
          send_time?: string
        }
        Relationships: []
      }
      scorecard_answers: {
        Row: {
          answer_text: string
          created_at: string | null
          id: string
          percentage: number
          position: number
          question_id: string | null
        }
        Insert: {
          answer_text: string
          created_at?: string | null
          id?: string
          percentage: number
          position: number
          question_id?: string | null
        }
        Update: {
          answer_text?: string
          created_at?: string | null
          id?: string
          percentage?: number
          position?: number
          question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "scorecard_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecard_questions: {
        Row: {
          created_at: string | null
          id: string
          max_points: number
          position: number
          question: string
          scorecard_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_points?: number
          position: number
          question: string
          scorecard_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_points?: number
          position?: number
          question?: string
          scorecard_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_questions_scorecard_id_fkey"
            columns: ["scorecard_id"]
            isOneToOne: false
            referencedRelation: "scorecards"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecards: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          portfolio_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          portfolio_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          portfolio_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorecards_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
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
      shared_test_steps: {
        Row: {
          created_at: string | null
          created_by: string
          description: string
          expected_result: string | null
          id: string
          title: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description: string
          expected_result?: string | null
          id?: string
          title: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string
          expected_result?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      skill_requirements: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          priority: string | null
          required_count: number | null
          required_proficiency: Database["public"]["Enums"]["skill_proficiency_level"]
          skill_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          priority?: string | null
          required_count?: number | null
          required_proficiency?: Database["public"]["Enums"]["skill_proficiency_level"]
          skill_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          priority?: string | null
          required_count?: number | null
          required_proficiency?: Database["public"]["Enums"]["skill_proficiency_level"]
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_requirements_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: Database["public"]["Enums"]["skill_category"]
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          updated_at: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["skill_category"]
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["skill_category"]
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      snapshot_configurations: {
        Row: {
          created_at: string
          id: string
          members: string[] | null
          notify_on_activation: boolean | null
          notify_on_changes: boolean | null
          org_structures: string[] | null
          products: string[] | null
          quarters: string[]
          snapshot_id: string
          themes: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          members?: string[] | null
          notify_on_activation?: boolean | null
          notify_on_changes?: boolean | null
          org_structures?: string[] | null
          products?: string[] | null
          quarters?: string[]
          snapshot_id: string
          themes?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          members?: string[] | null
          notify_on_activation?: boolean | null
          notify_on_changes?: boolean | null
          org_structures?: string[] | null
          products?: string[] | null
          quarters?: string[]
          snapshot_id?: string
          themes?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "snapshot_configurations_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: true
            referencedRelation: "strategy_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      snapshot_strategy_links: {
        Row: {
          created_at: string | null
          epic_ids: string[] | null
          goal_ids: string[] | null
          id: string
          mission_ids: string[] | null
          snapshot_id: string
          theme_ids: string[] | null
          updated_at: string | null
          value_ids: string[] | null
          vision_ids: string[] | null
        }
        Insert: {
          created_at?: string | null
          epic_ids?: string[] | null
          goal_ids?: string[] | null
          id?: string
          mission_ids?: string[] | null
          snapshot_id: string
          theme_ids?: string[] | null
          updated_at?: string | null
          value_ids?: string[] | null
          vision_ids?: string[] | null
        }
        Update: {
          created_at?: string | null
          epic_ids?: string[] | null
          goal_ids?: string[] | null
          id?: string
          mission_ids?: string[] | null
          snapshot_id?: string
          theme_ids?: string[] | null
          updated_at?: string | null
          value_ids?: string[] | null
          vision_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "snapshot_strategy_links_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: true
            referencedRelation: "strategy_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      starred_items: {
        Row: {
          created_at: string
          id: string
          pi_label: string | null
          room_id: string
          room_name: string
          room_path: string
          room_subtitle: string | null
          room_type: Database["public"]["Enums"]["room_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pi_label?: string | null
          room_id: string
          room_name: string
          room_path: string
          room_subtitle?: string | null
          room_type: Database["public"]["Enums"]["room_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pi_label?: string | null
          room_id?: string
          room_name?: string
          room_path?: string
          room_subtitle?: string | null
          room_type?: Database["public"]["Enums"]["room_type"]
          user_id?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          acceptance_criteria: string | null
          accepted_at: string | null
          assignee_id: string | null
          blocked: boolean | null
          blocked_reason: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          estimate_points: number | null
          feature_id: string
          health: string | null
          id: string
          name: string
          original_minutes: number | null
          owner_id: string | null
          parked_at: string | null
          points_loe: number | null
          priority: string | null
          progress_pct: number | null
          rank_order: number | null
          remaining_minutes: number | null
          spent_minutes: number | null
          sprint_id: string | null
          state: string | null
          status: Database["public"]["Enums"]["story_status"] | null
          story_key: string | null
          story_points: number | null
          tags: string[] | null
          team_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          acceptance_criteria?: string | null
          accepted_at?: string | null
          assignee_id?: string | null
          blocked?: boolean | null
          blocked_reason?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          estimate_points?: number | null
          feature_id: string
          health?: string | null
          id?: string
          name: string
          original_minutes?: number | null
          owner_id?: string | null
          parked_at?: string | null
          points_loe?: number | null
          priority?: string | null
          progress_pct?: number | null
          rank_order?: number | null
          remaining_minutes?: number | null
          spent_minutes?: number | null
          sprint_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["story_status"] | null
          story_key?: string | null
          story_points?: number | null
          tags?: string[] | null
          team_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          acceptance_criteria?: string | null
          accepted_at?: string | null
          assignee_id?: string | null
          blocked?: boolean | null
          blocked_reason?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          estimate_points?: number | null
          feature_id?: string
          health?: string | null
          id?: string
          name?: string
          original_minutes?: number | null
          owner_id?: string | null
          parked_at?: string | null
          points_loe?: number | null
          priority?: string | null
          progress_pct?: number | null
          rank_order?: number | null
          remaining_minutes?: number | null
          spent_minutes?: number | null
          sprint_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["story_status"] | null
          story_key?: string | null
          story_points?: number | null
          tags?: string[] | null
          team_id?: string | null
          title?: string
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
      story_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          story_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          story_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          story_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_comments_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          external_title: string | null
          external_url: string | null
          from_story_id: string
          id: string
          link_type: string
          to_story_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          external_title?: string | null
          external_url?: string | null
          from_story_id: string
          id?: string
          link_type: string
          to_story_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          external_title?: string | null
          external_url?: string | null
          from_story_id?: string
          id?: string
          link_type?: string
          to_story_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_links_from_story_id_fkey"
            columns: ["from_story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_links_to_story_id_fkey"
            columns: ["to_story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_goal_key_results: {
        Row: {
          baseline_value: number | null
          created_at: string | null
          current_value: number | null
          id: string
          measurement_type: string
          name: string
          score: number | null
          strategic_goal_id: string
          target_value: number
        }
        Insert: {
          baseline_value?: number | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          measurement_type: string
          name: string
          score?: number | null
          strategic_goal_id: string
          target_value: number
        }
        Update: {
          baseline_value?: number | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          measurement_type?: string
          name?: string
          score?: number | null
          strategic_goal_id?: string
          target_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "strategic_goal_key_results_strategic_goal_id_fkey"
            columns: ["strategic_goal_id"]
            isOneToOne: false
            referencedRelation: "strategic_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_goals: {
        Row: {
          complete_percent: number | null
          created_at: string | null
          description: string | null
          health_status: string | null
          id: string
          owner_id: string | null
          parent_goal_id: string | null
          score: number | null
          snapshot_id: string | null
          status: string | null
          tier: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          complete_percent?: number | null
          created_at?: string | null
          description?: string | null
          health_status?: string | null
          id?: string
          owner_id?: string | null
          parent_goal_id?: string | null
          score?: number | null
          snapshot_id?: string | null
          status?: string | null
          tier?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          complete_percent?: number | null
          created_at?: string | null
          description?: string | null
          health_status?: string | null
          id?: string
          owner_id?: string | null
          parent_goal_id?: string | null
          score?: number | null
          snapshot_id?: string | null
          status?: string | null
          tier?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategic_goals_parent_goal_id_fkey"
            columns: ["parent_goal_id"]
            isOneToOne: false
            referencedRelation: "strategic_goals"
            referencedColumns: ["id"]
          },
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
          snapshot_id: string
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
          snapshot_id: string
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
          snapshot_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["theme_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategic_themes_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "strategy_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_missions: {
        Row: {
          created_at: string | null
          enterprise_id: string | null
          id: string
          owner_id: string | null
          statement: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enterprise_id?: string | null
          id?: string
          owner_id?: string | null
          statement?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enterprise_id?: string | null
          id?: string
          owner_id?: string | null
          statement?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      strategy_snapshots: {
        Row: {
          active_since: string | null
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          enterprise_id: string | null
          id: string
          is_active: boolean | null
          mission: string | null
          name: string
          start_date: string | null
          status: string | null
          total_funding: number | null
          updated_at: string | null
          values: Json | null
          vision: string | null
        }
        Insert: {
          active_since?: string | null
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          enterprise_id?: string | null
          id?: string
          is_active?: boolean | null
          mission?: string | null
          name: string
          start_date?: string | null
          status?: string | null
          total_funding?: number | null
          updated_at?: string | null
          values?: Json | null
          vision?: string | null
        }
        Update: {
          active_since?: string | null
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          enterprise_id?: string | null
          id?: string
          is_active?: boolean | null
          mission?: string | null
          name?: string
          start_date?: string | null
          status?: string | null
          total_funding?: number | null
          updated_at?: string | null
          values?: Json | null
          vision?: string | null
        }
        Relationships: []
      }
      strategy_values: {
        Row: {
          created_at: string | null
          enterprise_id: string | null
          id: string
          owner_id: string | null
          statement: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enterprise_id?: string | null
          id?: string
          owner_id?: string | null
          statement?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enterprise_id?: string | null
          id?: string
          owner_id?: string | null
          statement?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      strategy_visions: {
        Row: {
          created_at: string | null
          enterprise_id: string | null
          id: string
          owner_id: string | null
          statement: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enterprise_id?: string | null
          id?: string
          owner_id?: string | null
          statement?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enterprise_id?: string | null
          id?: string
          owner_id?: string | null
          statement?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          is_active?: boolean
          user_id?: string
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
      team_member_skills: {
        Row: {
          created_at: string | null
          id: string
          is_primary_skill: boolean | null
          manager_verified: boolean | null
          notes: string | null
          proficiency_level: Database["public"]["Enums"]["skill_proficiency_level"]
          self_assessed: boolean | null
          skill_id: string
          team_member_id: string
          updated_at: string | null
          years_experience: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary_skill?: boolean | null
          manager_verified?: boolean | null
          notes?: string | null
          proficiency_level?: Database["public"]["Enums"]["skill_proficiency_level"]
          self_assessed?: boolean | null
          skill_id: string
          team_member_id: string
          updated_at?: string | null
          years_experience?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary_skill?: boolean | null
          manager_verified?: boolean | null
          notes?: string | null
          proficiency_level?: Database["public"]["Enums"]["skill_proficiency_level"]
          self_assessed?: boolean | null
          skill_id?: string
          team_member_id?: string
          updated_at?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_member_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_skills_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          allocation_percentage: number | null
          created_at: string | null
          id: string
          role: string | null
          team_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allocation_percentage?: number | null
          created_at?: string | null
          id?: string
          role?: string | null
          team_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allocation_percentage?: number | null
          created_at?: string | null
          id?: string
          role?: string | null
          team_id?: string
          updated_at?: string | null
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
      team_metrics: {
        Row: {
          actual_velocity: number | null
          created_at: string | null
          cycle_time_avg: number | null
          id: string
          iteration_id: string | null
          metric_date: string
          planned_velocity: number | null
          story_points_committed: number | null
          story_points_completed: number | null
          team_id: string
          throughput: number | null
          updated_at: string | null
          wip_count: number | null
        }
        Insert: {
          actual_velocity?: number | null
          created_at?: string | null
          cycle_time_avg?: number | null
          id?: string
          iteration_id?: string | null
          metric_date: string
          planned_velocity?: number | null
          story_points_committed?: number | null
          story_points_completed?: number | null
          team_id: string
          throughput?: number | null
          updated_at?: string | null
          wip_count?: number | null
        }
        Update: {
          actual_velocity?: number | null
          created_at?: string | null
          cycle_time_avg?: number | null
          id?: string
          iteration_id?: string | null
          metric_date?: string
          planned_velocity?: number | null
          story_points_committed?: number | null
          story_points_completed?: number | null
          team_id?: string
          throughput?: number | null
          updated_at?: string | null
          wip_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_metrics_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_point_systems: {
        Row: {
          created_at: string | null
          id: string
          point_system: string
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          point_system?: string
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          point_system?: string
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_point_systems_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_spend_per_sprint: {
        Row: {
          created_at: string | null
          id: string
          points_accepted: number
          spend_per_point: number | null
          sprint_id: string | null
          team_id: string | null
          team_spend: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          points_accepted?: number
          spend_per_point?: number | null
          sprint_id?: string | null
          team_id?: string | null
          team_spend: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          points_accepted?: number
          spend_per_point?: number | null
          sprint_id?: string | null
          team_id?: string | null
          team_spend?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_spend_per_sprint_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "iterations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_spend_per_sprint_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_subscriptions: {
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
            foreignKeyName: "team_subscriptions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          allow_task_deletion: boolean | null
          burn_hours: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          kanban_auto_populate_estimate: boolean | null
          kanban_throughput: number | null
          kanban_wip_limit: number | null
          name: string
          parent_portfolio_id: string | null
          parent_program_id: string | null
          parent_solution_id: string | null
          program_id: string | null
          region_id: string | null
          short_name: string | null
          sprint_prefix: string | null
          status: Database["public"]["Enums"]["team_status"] | null
          team_type: Database["public"]["Enums"]["team_type"] | null
          track_by: Database["public"]["Enums"]["track_by_type"] | null
          updated_at: string | null
          velocity_baseline: number | null
        }
        Insert: {
          allow_task_deletion?: boolean | null
          burn_hours?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          kanban_auto_populate_estimate?: boolean | null
          kanban_throughput?: number | null
          kanban_wip_limit?: number | null
          name: string
          parent_portfolio_id?: string | null
          parent_program_id?: string | null
          parent_solution_id?: string | null
          program_id?: string | null
          region_id?: string | null
          short_name?: string | null
          sprint_prefix?: string | null
          status?: Database["public"]["Enums"]["team_status"] | null
          team_type?: Database["public"]["Enums"]["team_type"] | null
          track_by?: Database["public"]["Enums"]["track_by_type"] | null
          updated_at?: string | null
          velocity_baseline?: number | null
        }
        Update: {
          allow_task_deletion?: boolean | null
          burn_hours?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          kanban_auto_populate_estimate?: boolean | null
          kanban_throughput?: number | null
          kanban_wip_limit?: number | null
          name?: string
          parent_portfolio_id?: string | null
          parent_program_id?: string | null
          parent_solution_id?: string | null
          program_id?: string | null
          region_id?: string | null
          short_name?: string | null
          sprint_prefix?: string | null
          status?: Database["public"]["Enums"]["team_status"] | null
          team_type?: Database["public"]["Enums"]["team_type"] | null
          track_by?: Database["public"]["Enums"]["track_by_type"] | null
          updated_at?: string | null
          velocity_baseline?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_parent_portfolio_id_fkey"
            columns: ["parent_portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_parent_program_id_fkey"
            columns: ["parent_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      test_activity_log: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          entity_id: string
          entity_title: string | null
          entity_type: string
          id: string
          program_id: string | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          entity_id: string
          entity_title?: string | null
          entity_type: string
          id?: string
          program_id?: string | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          entity_id?: string
          entity_title?: string | null
          entity_type?: string
          id?: string
          program_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_activity_log_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      test_case_bulk_operations: {
        Row: {
          case_ids: string[]
          error_messages: string[] | null
          executed_at: string | null
          executed_by: string | null
          failure_count: number | null
          id: string
          operation_data: Json | null
          operation_type: string
          status: string | null
          success_count: number | null
        }
        Insert: {
          case_ids: string[]
          error_messages?: string[] | null
          executed_at?: string | null
          executed_by?: string | null
          failure_count?: number | null
          id?: string
          operation_data?: Json | null
          operation_type: string
          status?: string | null
          success_count?: number | null
        }
        Update: {
          case_ids?: string[]
          error_messages?: string[] | null
          executed_at?: string | null
          executed_by?: string | null
          failure_count?: number | null
          id?: string
          operation_data?: Json | null
          operation_type?: string
          status?: string | null
          success_count?: number | null
        }
        Relationships: []
      }
      test_case_datasets: {
        Row: {
          case_id: string
          created_at: string | null
          dataset_name: string
          id: string
          is_active: boolean | null
          parameter_values: Json
        }
        Insert: {
          case_id: string
          created_at?: string | null
          dataset_name: string
          id?: string
          is_active?: boolean | null
          parameter_values: Json
        }
        Update: {
          case_id?: string
          created_at?: string | null
          dataset_name?: string
          id?: string
          is_active?: boolean | null
          parameter_values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "test_case_datasets_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      test_case_parameters: {
        Row: {
          case_id: string
          created_at: string | null
          description: string | null
          id: string
          parameter_name: string
          parameter_type: string | null
        }
        Insert: {
          case_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          parameter_name: string
          parameter_type?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          parameter_name?: string
          parameter_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_case_parameters_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      test_case_priorities: {
        Row: {
          color: string | null
          created_at: string | null
          display_order: number
          id: string
          is_archived: boolean | null
          is_default: boolean | null
          name: string
          program_id: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          display_order?: number
          id?: string
          is_archived?: boolean | null
          is_default?: boolean | null
          name: string
          program_id?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          display_order?: number
          id?: string
          is_archived?: boolean | null
          is_default?: boolean | null
          name?: string
          program_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_case_priorities_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      test_case_shared_steps: {
        Row: {
          created_at: string | null
          id: string
          shared_step_id: string
          step_order: number
          test_case_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          shared_step_id: string
          step_order?: number
          test_case_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          shared_step_id?: string
          step_order?: number
          test_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_case_shared_steps_shared_step_id_fkey"
            columns: ["shared_step_id"]
            isOneToOne: false
            referencedRelation: "shared_test_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_case_shared_steps_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      test_case_statuses: {
        Row: {
          created_at: string | null
          display_order: number
          eligible_for_cycle_set: boolean | null
          eligible_for_linked_step: boolean | null
          id: string
          is_default: boolean | null
          is_system: boolean | null
          name: string
          program_id: string | null
          updated_at: string | null
          viewable_by_owner_only: boolean | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          eligible_for_cycle_set?: boolean | null
          eligible_for_linked_step?: boolean | null
          id?: string
          is_default?: boolean | null
          is_system?: boolean | null
          name: string
          program_id?: string | null
          updated_at?: string | null
          viewable_by_owner_only?: boolean | null
        }
        Update: {
          created_at?: string | null
          display_order?: number
          eligible_for_cycle_set?: boolean | null
          eligible_for_linked_step?: boolean | null
          id?: string
          is_default?: boolean | null
          is_system?: boolean | null
          name?: string
          program_id?: string | null
          updated_at?: string | null
          viewable_by_owner_only?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "test_case_statuses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      test_case_steps: {
        Row: {
          attachment_urls: string[] | null
          bdd_keyword: string | null
          case_id: string
          case_version: number | null
          created_at: string | null
          description: string
          expected_result: string | null
          id: string
          is_bdd: boolean | null
          step_number: number
          step_type: string | null
          test_data: string | null
          updated_at: string | null
        }
        Insert: {
          attachment_urls?: string[] | null
          bdd_keyword?: string | null
          case_id: string
          case_version?: number | null
          created_at?: string | null
          description: string
          expected_result?: string | null
          id?: string
          is_bdd?: boolean | null
          step_number: number
          step_type?: string | null
          test_data?: string | null
          updated_at?: string | null
        }
        Update: {
          attachment_urls?: string[] | null
          bdd_keyword?: string | null
          case_id?: string
          case_version?: number | null
          created_at?: string | null
          description?: string
          expected_result?: string | null
          id?: string
          is_bdd?: boolean | null
          step_number?: number
          step_type?: string | null
          test_data?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_case_steps_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      test_case_version_changes: {
        Row: {
          case_id: string
          change_type: string | null
          changed_at: string | null
          changed_by: string | null
          field_name: string
          from_version: number | null
          id: string
          new_value: string | null
          old_value: string | null
          to_version: number
        }
        Insert: {
          case_id: string
          change_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          field_name: string
          from_version?: number | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          to_version: number
        }
        Update: {
          case_id?: string
          change_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          field_name?: string
          from_version?: number | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          to_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_case_version_changes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      test_case_versions: {
        Row: {
          case_id: string
          change_summary: string | null
          component: string | null
          created_at: string | null
          created_by: string | null
          folder_id: string | null
          id: string
          labels: string[] | null
          objective: string | null
          owner_id: string | null
          preconditions: string | null
          priority: string | null
          release: string | null
          snapshot_data: Json | null
          status: string | null
          title: string
          version: number
        }
        Insert: {
          case_id: string
          change_summary?: string | null
          component?: string | null
          created_at?: string | null
          created_by?: string | null
          folder_id?: string | null
          id?: string
          labels?: string[] | null
          objective?: string | null
          owner_id?: string | null
          preconditions?: string | null
          priority?: string | null
          release?: string | null
          snapshot_data?: Json | null
          status?: string | null
          title: string
          version: number
        }
        Update: {
          case_id?: string
          change_summary?: string | null
          component?: string | null
          created_at?: string | null
          created_by?: string | null
          folder_id?: string | null
          id?: string
          labels?: string[] | null
          objective?: string | null
          owner_id?: string | null
          preconditions?: string | null
          priority?: string | null
          release?: string | null
          snapshot_data?: Json | null
          status?: string | null
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_case_versions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_case_versions_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "test_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      test_case_work_item_links: {
        Row: {
          case_id: string
          id: string
          linked_at: string | null
          linked_by: string | null
          work_item_id: string
          work_item_type: string | null
        }
        Insert: {
          case_id: string
          id?: string
          linked_at?: string | null
          linked_by?: string | null
          work_item_id: string
          work_item_type?: string | null
        }
        Update: {
          case_id?: string
          id?: string
          linked_at?: string | null
          linked_by?: string | null
          work_item_id?: string
          work_item_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_case_work_item_links_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      test_case_work_items: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          link_type: string | null
          test_case_id: string
          work_item_id: string
          work_item_type: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          link_type?: string | null
          test_case_id: string
          work_item_id: string
          work_item_type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          link_type?: string | null
          test_case_id?: string
          work_item_id?: string
          work_item_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_case_work_items_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      test_cases: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          automation_key: string | null
          automation_owner_id: string | null
          automation_status: string | null
          case_type: string | null
          component: string | null
          created_at: string | null
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          estimated_effort: number | null
          expected_result: string | null
          folder_id: string | null
          id: string
          is_archived: boolean | null
          labels: string[] | null
          linked_work_item_id: string | null
          linked_work_item_type: string | null
          objective: string | null
          owner_id: string | null
          preconditions: string | null
          priority: Database["public"]["Enums"]["test_priority"]
          program_id: string | null
          release: string | null
          status: Database["public"]["Enums"]["test_case_status"]
          test_type: Database["public"]["Enums"]["test_type"]
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          automation_key?: string | null
          automation_owner_id?: string | null
          automation_status?: string | null
          case_type?: string | null
          component?: string | null
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          estimated_effort?: number | null
          expected_result?: string | null
          folder_id?: string | null
          id?: string
          is_archived?: boolean | null
          labels?: string[] | null
          linked_work_item_id?: string | null
          linked_work_item_type?: string | null
          objective?: string | null
          owner_id?: string | null
          preconditions?: string | null
          priority?: Database["public"]["Enums"]["test_priority"]
          program_id?: string | null
          release?: string | null
          status?: Database["public"]["Enums"]["test_case_status"]
          test_type?: Database["public"]["Enums"]["test_type"]
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          automation_key?: string | null
          automation_owner_id?: string | null
          automation_status?: string | null
          case_type?: string | null
          component?: string | null
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          estimated_effort?: number | null
          expected_result?: string | null
          folder_id?: string | null
          id?: string
          is_archived?: boolean | null
          labels?: string[] | null
          linked_work_item_id?: string | null
          linked_work_item_type?: string | null
          objective?: string | null
          owner_id?: string | null
          preconditions?: string | null
          priority?: Database["public"]["Enums"]["test_priority"]
          program_id?: string | null
          release?: string | null
          status?: Database["public"]["Enums"]["test_case_status"]
          test_type?: Database["public"]["Enums"]["test_type"]
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_cases_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "test_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_cases_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      test_cycle_case_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          case_id: string
          cycle_id: string
          estimated_effort: number | null
          id: string
          milestone: string | null
          sort_order: number | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          case_id: string
          cycle_id: string
          estimated_effort?: number | null
          id?: string
          milestone?: string | null
          sort_order?: number | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          case_id?: string
          cycle_id?: string
          estimated_effort?: number | null
          id?: string
          milestone?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_cycle_case_assignments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_cycle_case_assignments_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "test_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      test_cycle_dependencies: {
        Row: {
          created_at: string | null
          cycle_id: string
          dependency_type: string | null
          id: string
          predecessor_case_id: string
          successor_case_id: string
        }
        Insert: {
          created_at?: string | null
          cycle_id: string
          dependency_type?: string | null
          id?: string
          predecessor_case_id: string
          successor_case_id: string
        }
        Update: {
          created_at?: string | null
          cycle_id?: string
          dependency_type?: string | null
          id?: string
          predecessor_case_id?: string
          successor_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_cycle_dependencies_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "test_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_cycle_dependencies_predecessor_case_id_fkey"
            columns: ["predecessor_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_cycle_dependencies_successor_case_id_fkey"
            columns: ["successor_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      test_cycle_executions: {
        Row: {
          assigned_to: string | null
          case_id: string
          case_version: number | null
          comments: string | null
          created_at: string | null
          cycle_id: string
          effort_actual: number | null
          effort_estimated: number | null
          effort_minutes: number | null
          evidence_count: number | null
          executed_at: string | null
          executed_by: string | null
          id: string
          manual_status: string | null
          overall_status_override: boolean | null
          status: string | null
          timer_accumulated_seconds: number | null
          timer_paused_at: string | null
          timer_start_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          case_id: string
          case_version?: number | null
          comments?: string | null
          created_at?: string | null
          cycle_id: string
          effort_actual?: number | null
          effort_estimated?: number | null
          effort_minutes?: number | null
          evidence_count?: number | null
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          manual_status?: string | null
          overall_status_override?: boolean | null
          status?: string | null
          timer_accumulated_seconds?: number | null
          timer_paused_at?: string | null
          timer_start_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          case_id?: string
          case_version?: number | null
          comments?: string | null
          created_at?: string | null
          cycle_id?: string
          effort_actual?: number | null
          effort_estimated?: number | null
          effort_minutes?: number | null
          evidence_count?: number | null
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          manual_status?: string | null
          overall_status_override?: boolean | null
          status?: string | null
          timer_accumulated_seconds?: number | null
          timer_paused_at?: string | null
          timer_start_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_cycle_executions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_cycle_executions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "test_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      test_cycle_templates: {
        Row: {
          config: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_global: boolean | null
          name: string
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_global?: boolean | null
          name: string
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_global?: boolean | null
          name?: string
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      test_cycles: {
        Row: {
          archive_reason: string | null
          archived: boolean | null
          archived_at: string | null
          archived_by: string | null
          auto_close_on_completion: boolean | null
          build_version: string | null
          created_at: string | null
          created_by: string | null
          custom_fields: Json | null
          email_notifications: boolean | null
          end_date: string | null
          environment: string | null
          folder_id: string | null
          id: string
          is_adhoc: boolean | null
          key: string
          name: string
          objective: string | null
          owner_id: string | null
          program_id: string | null
          scope_locked: boolean | null
          scope_locked_at: string | null
          scope_locked_by: string | null
          source_set_id: string | null
          start_date: string | null
          status: string | null
          sync_with_set: boolean | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived?: boolean | null
          archived_at?: string | null
          archived_by?: string | null
          auto_close_on_completion?: boolean | null
          build_version?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          email_notifications?: boolean | null
          end_date?: string | null
          environment?: string | null
          folder_id?: string | null
          id?: string
          is_adhoc?: boolean | null
          key: string
          name: string
          objective?: string | null
          owner_id?: string | null
          program_id?: string | null
          scope_locked?: boolean | null
          scope_locked_at?: string | null
          scope_locked_by?: string | null
          source_set_id?: string | null
          start_date?: string | null
          status?: string | null
          sync_with_set?: boolean | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived?: boolean | null
          archived_at?: string | null
          archived_by?: string | null
          auto_close_on_completion?: boolean | null
          build_version?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          email_notifications?: boolean | null
          end_date?: string | null
          environment?: string | null
          folder_id?: string | null
          id?: string
          is_adhoc?: boolean | null
          key?: string
          name?: string
          objective?: string | null
          owner_id?: string | null
          program_id?: string | null
          scope_locked?: boolean | null
          scope_locked_at?: string | null
          scope_locked_by?: string | null
          source_set_id?: string | null
          start_date?: string | null
          status?: string | null
          sync_with_set?: boolean | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_cycles_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "test_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_cycles_source_set_id_fkey"
            columns: ["source_set_id"]
            isOneToOne: false
            referencedRelation: "test_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      test_dashboard_gadgets: {
        Row: {
          config: Json
          created_at: string | null
          dashboard_id: string | null
          gadget_type: string
          id: string
          position: Json
        }
        Insert: {
          config?: Json
          created_at?: string | null
          dashboard_id?: string | null
          gadget_type: string
          id?: string
          position?: Json
        }
        Update: {
          config?: Json
          created_at?: string | null
          dashboard_id?: string | null
          gadget_type?: string
          id?: string
          position?: Json
        }
        Relationships: [
          {
            foreignKeyName: "test_dashboard_gadgets_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "test_dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      test_dashboard_shares: {
        Row: {
          can_edit: boolean | null
          created_at: string | null
          dashboard_id: string | null
          expires_at: string | null
          id: string
          shared_with_user_id: string | null
        }
        Insert: {
          can_edit?: boolean | null
          created_at?: string | null
          dashboard_id?: string | null
          expires_at?: string | null
          id?: string
          shared_with_user_id?: string | null
        }
        Update: {
          can_edit?: boolean | null
          created_at?: string | null
          dashboard_id?: string | null
          expires_at?: string | null
          id?: string
          shared_with_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_dashboard_shares_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "test_dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      test_dashboard_templates: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean | null
          layout: Json
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          layout?: Json
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          layout?: Json
          name?: string
        }
        Relationships: []
      }
      test_dashboards: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          layout: Json
          name: string
          program_id: string | null
          template_id: string | null
          updated_at: string | null
          user_id: string | null
          visibility: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          layout?: Json
          name: string
          program_id?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          visibility?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          layout?: Json
          name?: string
          program_id?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      test_data_parameters: {
        Row: {
          created_at: string | null
          id: string
          parameter_name: string
          parameter_type: string
          test_case_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          parameter_name: string
          parameter_type?: string
          test_case_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          parameter_name?: string
          parameter_type?: string
          test_case_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_data_parameters_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      test_data_rows: {
        Row: {
          created_at: string | null
          id: string
          row_data: Json
          test_case_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          row_data: Json
          test_case_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          row_data?: Json
          test_case_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_data_rows_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      test_datasets: {
        Row: {
          created_at: string | null
          created_by: string | null
          cycle_id: string | null
          id: string
          name: string
          parameters: Json
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          cycle_id?: string | null
          id?: string
          name: string
          parameters?: Json
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          cycle_id?: string | null
          id?: string
          name?: string
          parameters?: Json
        }
        Relationships: [
          {
            foreignKeyName: "test_datasets_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "test_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      test_evidence: {
        Row: {
          created_at: string | null
          execution_step_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          mime_type: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          execution_step_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          mime_type: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          execution_step_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          mime_type?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_evidence_execution_step_id_fkey"
            columns: ["execution_step_id"]
            isOneToOne: false
            referencedRelation: "test_execution_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      test_execution_defects: {
        Row: {
          defect_work_item_id: string
          execution_id: string
          id: string
          linked_at: string | null
          linked_by: string | null
        }
        Insert: {
          defect_work_item_id: string
          execution_id: string
          id?: string
          linked_at?: string | null
          linked_by?: string | null
        }
        Update: {
          defect_work_item_id?: string
          execution_id?: string
          id?: string
          linked_at?: string | null
          linked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_execution_defects_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "test_cycle_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_execution_evidence: {
        Row: {
          execution_id: string
          file_name: string
          file_size_bytes: number | null
          file_type: string | null
          file_url: string
          id: string
          step_order: number | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          execution_id: string
          file_name: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          step_order?: number | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          execution_id?: string
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          step_order?: number | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_execution_evidence_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "test_cycle_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_execution_runs: {
        Row: {
          copied_from_run_id: string | null
          created_at: string | null
          created_by: string | null
          cycle_id: string | null
          id: string
          run_name: string | null
          run_number: number
        }
        Insert: {
          copied_from_run_id?: string | null
          created_at?: string | null
          created_by?: string | null
          cycle_id?: string | null
          id?: string
          run_name?: string | null
          run_number: number
        }
        Update: {
          copied_from_run_id?: string | null
          created_at?: string | null
          created_by?: string | null
          cycle_id?: string | null
          id?: string
          run_name?: string | null
          run_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_execution_runs_copied_from_run_id_fkey"
            columns: ["copied_from_run_id"]
            isOneToOne: false
            referencedRelation: "test_execution_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_execution_runs_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "test_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      test_execution_step_results: {
        Row: {
          actual_result: string | null
          comments: string | null
          executed_at: string | null
          execution_id: string
          expected_result: string | null
          id: string
          status: string
          step_description: string
          step_order: number
        }
        Insert: {
          actual_result?: string | null
          comments?: string | null
          executed_at?: string | null
          execution_id: string
          expected_result?: string | null
          id?: string
          status?: string
          step_description: string
          step_order: number
        }
        Update: {
          actual_result?: string | null
          comments?: string | null
          executed_at?: string | null
          execution_id?: string
          expected_result?: string | null
          id?: string
          status?: string
          step_description?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_execution_step_results_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "test_cycle_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_execution_steps: {
        Row: {
          actual_result: string | null
          created_at: string | null
          id: string
          screenshot_url: string | null
          status: Database["public"]["Enums"]["test_step_status"]
          test_execution_id: string
          test_step_id: string
          updated_at: string | null
        }
        Insert: {
          actual_result?: string | null
          created_at?: string | null
          id?: string
          screenshot_url?: string | null
          status: Database["public"]["Enums"]["test_step_status"]
          test_execution_id: string
          test_step_id: string
          updated_at?: string | null
        }
        Update: {
          actual_result?: string | null
          created_at?: string | null
          id?: string
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["test_step_status"]
          test_execution_id?: string
          test_step_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_execution_steps_test_execution_id_fkey"
            columns: ["test_execution_id"]
            isOneToOne: false
            referencedRelation: "test_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_execution_steps_test_step_id_fkey"
            columns: ["test_step_id"]
            isOneToOne: false
            referencedRelation: "test_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      test_executions: {
        Row: {
          actual_result: string | null
          created_at: string | null
          defect_id: string | null
          executed_by: string
          execution_date: string
          execution_time_seconds: number | null
          id: string
          program_id: string | null
          status: Database["public"]["Enums"]["test_execution_status"]
          test_case_id: string
          test_cycle_id: string
          updated_at: string | null
        }
        Insert: {
          actual_result?: string | null
          created_at?: string | null
          defect_id?: string | null
          executed_by: string
          execution_date?: string
          execution_time_seconds?: number | null
          id?: string
          program_id?: string | null
          status?: Database["public"]["Enums"]["test_execution_status"]
          test_case_id: string
          test_cycle_id: string
          updated_at?: string | null
        }
        Update: {
          actual_result?: string | null
          created_at?: string | null
          defect_id?: string | null
          executed_by?: string
          execution_date?: string
          execution_time_seconds?: number | null
          id?: string
          program_id?: string | null
          status?: Database["public"]["Enums"]["test_execution_status"]
          test_case_id?: string
          test_cycle_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_executions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_executions_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      test_field_configurations: {
        Row: {
          created_at: string | null
          display_order: number
          entity_type: string
          field_label: string
          field_name: string
          id: string
          is_enabled: boolean | null
          is_required: boolean | null
          program_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          entity_type: string
          field_label: string
          field_name: string
          id?: string
          is_enabled?: boolean | null
          is_required?: boolean | null
          program_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number
          entity_type?: string
          field_label?: string
          field_name?: string
          id?: string
          is_enabled?: boolean | null
          is_required?: boolean | null
          program_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_field_configurations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      test_folders: {
        Row: {
          created_at: string | null
          created_by: string
          entity_type: string | null
          id: string
          is_system: boolean | null
          name: string
          parent_folder_id: string | null
          program_id: string | null
          sort_order: number | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          entity_type?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          parent_folder_id?: string | null
          program_id?: string | null
          sort_order?: number | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          entity_type?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          parent_folder_id?: string | null
          program_id?: string | null
          sort_order?: number | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "test_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_folders_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_folders_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      test_notification_preferences: {
        Row: {
          created_at: string | null
          daily_test_summary: boolean | null
          email_notifications_enabled: boolean | null
          id: string
          notify_automation_owner_assigned: boolean | null
          notify_case_assigned_cycle: boolean | null
          notify_on_cycle_complete: boolean | null
          notify_on_test_failure: boolean | null
          notify_run_step_assigned: boolean | null
          notify_same_comment_edited: boolean | null
          notify_step_updated_as_owner: boolean | null
          notify_tagged_in_comment: boolean | null
          updated_at: string | null
          user_id: string
          weekly_test_report: boolean | null
        }
        Insert: {
          created_at?: string | null
          daily_test_summary?: boolean | null
          email_notifications_enabled?: boolean | null
          id?: string
          notify_automation_owner_assigned?: boolean | null
          notify_case_assigned_cycle?: boolean | null
          notify_on_cycle_complete?: boolean | null
          notify_on_test_failure?: boolean | null
          notify_run_step_assigned?: boolean | null
          notify_same_comment_edited?: boolean | null
          notify_step_updated_as_owner?: boolean | null
          notify_tagged_in_comment?: boolean | null
          updated_at?: string | null
          user_id: string
          weekly_test_report?: boolean | null
        }
        Update: {
          created_at?: string | null
          daily_test_summary?: boolean | null
          email_notifications_enabled?: boolean | null
          id?: string
          notify_automation_owner_assigned?: boolean | null
          notify_case_assigned_cycle?: boolean | null
          notify_on_cycle_complete?: boolean | null
          notify_on_test_failure?: boolean | null
          notify_run_step_assigned?: boolean | null
          notify_same_comment_edited?: boolean | null
          notify_step_updated_as_owner?: boolean | null
          notify_tagged_in_comment?: boolean | null
          updated_at?: string | null
          user_id?: string
          weekly_test_report?: boolean | null
        }
        Relationships: []
      }
      test_report_schedules: {
        Row: {
          config: Json
          created_at: string | null
          created_by: string | null
          format: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          program_id: string
          recipients: string[] | null
          report_type: string
          schedule_cron: string
          updated_at: string | null
        }
        Insert: {
          config: Json
          created_at?: string | null
          created_by?: string | null
          format?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          program_id: string
          recipients?: string[] | null
          report_type: string
          schedule_cron: string
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          created_by?: string | null
          format?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          program_id?: string
          recipients?: string[] | null
          report_type?: string
          schedule_cron?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      test_reports: {
        Row: {
          config: Json
          created_at: string | null
          file_url: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          program_id: string
          report_type: string
          share_expires_at: string | null
          share_token: string | null
        }
        Insert: {
          config: Json
          created_at?: string | null
          file_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          program_id: string
          report_type: string
          share_expires_at?: string | null
          share_token?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          file_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          program_id?: string
          report_type?: string
          share_expires_at?: string | null
          share_token?: string | null
        }
        Relationships: []
      }
      test_run_statuses: {
        Row: {
          created_at: string | null
          display_order: number
          execution_completed: boolean | null
          highlight_color: string | null
          id: string
          is_system: boolean | null
          name: string
          program_id: string | null
          status_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          execution_completed?: boolean | null
          highlight_color?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          program_id?: string | null
          status_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number
          execution_completed?: boolean | null
          highlight_color?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          program_id?: string | null
          status_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_run_statuses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      test_set_cases: {
        Row: {
          added_at: string | null
          added_by: string | null
          case_id: string
          case_version: number | null
          id: string
          set_id: string
          sort_order: number | null
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          case_id: string
          case_version?: number | null
          id?: string
          set_id: string
          sort_order?: number | null
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          case_id?: string
          case_version?: number | null
          id?: string
          set_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_set_cases_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_set_cases_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "test_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      test_sets: {
        Row: {
          created_at: string | null
          created_by: string | null
          folder_id: string | null
          id: string
          key: string
          name: string
          objective: string | null
          owner_id: string | null
          parent_version_id: string | null
          program_id: string
          status: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          folder_id?: string | null
          id?: string
          key: string
          name: string
          objective?: string | null
          owner_id?: string | null
          parent_version_id?: string | null
          program_id: string
          status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          folder_id?: string | null
          id?: string
          key?: string
          name?: string
          objective?: string | null
          owner_id?: string | null
          parent_version_id?: string | null
          program_id?: string
          status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_sets_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "test_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_sets_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "test_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      test_steps: {
        Row: {
          action: string
          created_at: string | null
          expected_result: string | null
          id: string
          is_shared: boolean | null
          library_step_id: string | null
          step_order: number
          test_case_id: string
          updated_at: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          expected_result?: string | null
          id?: string
          is_shared?: boolean | null
          library_step_id?: string | null
          step_order: number
          test_case_id: string
          updated_at?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          expected_result?: string | null
          id?: string
          is_shared?: boolean | null
          library_step_id?: string | null
          step_order?: number
          test_case_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_steps_library_step_id_fkey"
            columns: ["library_step_id"]
            isOneToOne: false
            referencedRelation: "shared_test_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_steps_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_epic_links: {
        Row: {
          created_at: string
          epic_id: string
          id: string
          theme_id: string
        }
        Insert: {
          created_at?: string
          epic_id: string
          id?: string
          theme_id: string
        }
        Update: {
          created_at?: string
          epic_id?: string
          id?: string
          theme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "theme_epic_links_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theme_epic_links_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "strategic_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_links: {
        Row: {
          added_by_name: string | null
          created_at: string
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          kind: string | null
          link_type: string | null
          linked_item_id: string | null
          linked_item_type: string | null
          mime_type: string | null
          theme_id: string
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          added_by_name?: string | null
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          kind?: string | null
          link_type?: string | null
          linked_item_id?: string | null
          linked_item_type?: string | null
          mime_type?: string | null
          theme_id: string
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          added_by_name?: string | null
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          kind?: string | null
          link_type?: string | null
          linked_item_id?: string | null
          linked_item_type?: string | null
          mime_type?: string | null
          theme_id?: string
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      user_app_preferences: {
        Row: {
          auto_save_enabled: boolean | null
          auto_save_interval: number | null
          date_format: string | null
          default_folder_view: string | null
          default_project_id: string | null
          focus_indicators: string | null
          grid_cell_size: string | null
          grid_default_columns: Json | null
          grid_highlight_failed: boolean | null
          grid_show_defects: boolean | null
          grid_show_evidence: boolean | null
          high_contrast: boolean | null
          id: string
          keyboard_navigation: string | null
          keyboard_shortcuts_enabled: boolean | null
          language: string | null
          screen_reader_optimized: boolean | null
          table_default_sort: string | null
          table_rows_per_page: number | null
          table_show_row_numbers: boolean | null
          table_sticky_headers: boolean | null
          table_zebra_striping: boolean | null
          time_format: string | null
          time_zone: string | null
          updated_at: string | null
          user_id: string | null
          warn_unsaved: boolean | null
        }
        Insert: {
          auto_save_enabled?: boolean | null
          auto_save_interval?: number | null
          date_format?: string | null
          default_folder_view?: string | null
          default_project_id?: string | null
          focus_indicators?: string | null
          grid_cell_size?: string | null
          grid_default_columns?: Json | null
          grid_highlight_failed?: boolean | null
          grid_show_defects?: boolean | null
          grid_show_evidence?: boolean | null
          high_contrast?: boolean | null
          id?: string
          keyboard_navigation?: string | null
          keyboard_shortcuts_enabled?: boolean | null
          language?: string | null
          screen_reader_optimized?: boolean | null
          table_default_sort?: string | null
          table_rows_per_page?: number | null
          table_show_row_numbers?: boolean | null
          table_sticky_headers?: boolean | null
          table_zebra_striping?: boolean | null
          time_format?: string | null
          time_zone?: string | null
          updated_at?: string | null
          user_id?: string | null
          warn_unsaved?: boolean | null
        }
        Update: {
          auto_save_enabled?: boolean | null
          auto_save_interval?: number | null
          date_format?: string | null
          default_folder_view?: string | null
          default_project_id?: string | null
          focus_indicators?: string | null
          grid_cell_size?: string | null
          grid_default_columns?: Json | null
          grid_highlight_failed?: boolean | null
          grid_show_defects?: boolean | null
          grid_show_evidence?: boolean | null
          high_contrast?: boolean | null
          id?: string
          keyboard_navigation?: string | null
          keyboard_shortcuts_enabled?: boolean | null
          language?: string | null
          screen_reader_optimized?: boolean | null
          table_default_sort?: string | null
          table_rows_per_page?: number | null
          table_show_row_numbers?: boolean | null
          table_sticky_headers?: boolean | null
          table_zebra_striping?: boolean | null
          time_format?: string | null
          time_zone?: string | null
          updated_at?: string | null
          user_id?: string | null
          warn_unsaved?: boolean | null
        }
        Relationships: []
      }
      user_email_preferences: {
        Row: {
          digest_day: string | null
          digest_mode: string | null
          digest_time: string | null
          dnd_auto_reply: string | null
          dnd_enabled: boolean | null
          dnd_end_date: string | null
          dnd_start_date: string | null
          email_template: string | null
          id: string
          include_links: boolean | null
          include_logo: boolean | null
          include_summary: boolean | null
          limit_action: string | null
          max_emails_per_day: number | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          signature: string | null
          unsubscribed_all: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          digest_day?: string | null
          digest_mode?: string | null
          digest_time?: string | null
          dnd_auto_reply?: string | null
          dnd_enabled?: boolean | null
          dnd_end_date?: string | null
          dnd_start_date?: string | null
          email_template?: string | null
          id?: string
          include_links?: boolean | null
          include_logo?: boolean | null
          include_summary?: boolean | null
          limit_action?: string | null
          max_emails_per_day?: number | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          signature?: string | null
          unsubscribed_all?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          digest_day?: string | null
          digest_mode?: string | null
          digest_time?: string | null
          dnd_auto_reply?: string | null
          dnd_enabled?: boolean | null
          dnd_end_date?: string | null
          dnd_start_date?: string | null
          email_template?: string | null
          id?: string
          include_links?: boolean | null
          include_logo?: boolean | null
          include_summary?: boolean | null
          limit_action?: string | null
          max_emails_per_day?: number | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          signature?: string | null
          unsubscribed_all?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_epic_backlog_preferences: {
        Row: {
          created_at: string | null
          id: string
          labels_display: string | null
          last_kanban_subview: string | null
          last_view: string | null
          selected_columns_main: Json | null
          selected_columns_small: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          labels_display?: string | null
          last_kanban_subview?: string | null
          last_view?: string | null
          selected_columns_main?: Json | null
          selected_columns_small?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          labels_display?: string | null
          last_kanban_subview?: string | null
          last_view?: string | null
          selected_columns_main?: Json | null
          selected_columns_small?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_forecast_preferences: {
        Row: {
          created_at: string | null
          filters: Json
          id: string
          updated_at: string | null
          user_id: string
          visible_columns: Json
        }
        Insert: {
          created_at?: string | null
          filters?: Json
          id?: string
          updated_at?: string | null
          user_id: string
          visible_columns?: Json
        }
        Update: {
          created_at?: string | null
          filters?: Json
          id?: string
          updated_at?: string | null
          user_id?: string
          visible_columns?: Json
        }
        Relationships: []
      }
      user_industry_preferences: {
        Row: {
          column_order: string[] | null
          column_visibility: Json | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          column_order?: string[] | null
          column_visibility?: Json | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          column_order?: string[] | null
          column_visibility?: Json | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          email_frequency: string
          email_notifications_enabled: boolean
          id: string
          in_app_notifications_enabled: boolean
          mention_notifications_enabled: boolean
          notify_comments: boolean
          notify_dependencies: boolean
          notify_mentions: boolean
          notify_objectives: boolean
          notify_subscriptions: boolean
          notify_work_item_assigned: boolean
          notify_work_item_state_change: boolean
          subscription_notifications_enabled: boolean
          updated_at: string
          user_id: string
          workflow_notifications_enabled: boolean
        }
        Insert: {
          created_at?: string
          email_frequency?: string
          email_notifications_enabled?: boolean
          id?: string
          in_app_notifications_enabled?: boolean
          mention_notifications_enabled?: boolean
          notify_comments?: boolean
          notify_dependencies?: boolean
          notify_mentions?: boolean
          notify_objectives?: boolean
          notify_subscriptions?: boolean
          notify_work_item_assigned?: boolean
          notify_work_item_state_change?: boolean
          subscription_notifications_enabled?: boolean
          updated_at?: string
          user_id: string
          workflow_notifications_enabled?: boolean
        }
        Update: {
          created_at?: string
          email_frequency?: string
          email_notifications_enabled?: boolean
          id?: string
          in_app_notifications_enabled?: boolean
          mention_notifications_enabled?: boolean
          notify_comments?: boolean
          notify_dependencies?: boolean
          notify_mentions?: boolean
          notify_objectives?: boolean
          notify_subscriptions?: boolean
          notify_work_item_assigned?: boolean
          notify_work_item_state_change?: boolean
          subscription_notifications_enabled?: boolean
          updated_at?: string
          user_id?: string
          workflow_notifications_enabled?: boolean
        }
        Relationships: []
      }
      user_notification_settings: {
        Row: {
          assignment_notifications: Json | null
          automation_notifications: Json | null
          cycle_notifications: Json | null
          defect_notifications: Json | null
          email_notifications_enabled: boolean | null
          id: string
          mention_notifications: Json | null
          report_notifications: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assignment_notifications?: Json | null
          automation_notifications?: Json | null
          cycle_notifications?: Json | null
          defect_notifications?: Json | null
          email_notifications_enabled?: boolean | null
          id?: string
          mention_notifications?: Json | null
          report_notifications?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assignment_notifications?: Json | null
          automation_notifications?: Json | null
          cycle_notifications?: Json | null
          defect_notifications?: Json | null
          email_notifications_enabled?: boolean | null
          id?: string
          mention_notifications?: Json | null
          report_notifications?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          read_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_permission_overrides: {
        Row: {
          created_at: string | null
          id: string
          module: string | null
          override_value: string
          permission_group: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          module?: string | null
          override_value: string
          permission_group: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          module?: string | null
          override_value?: string
          permission_group?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_product_roles: {
        Row: {
          business_lines: string[] | null
          created_at: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          business_lines?: string[] | null
          created_at?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          business_lines?: string[] | null
          created_at?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_product_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "product_roles"
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
      user_theme_preferences: {
        Row: {
          accent_color: string | null
          animation_speed: string | null
          animations_enabled: boolean | null
          density: string | null
          font_size: string | null
          id: string
          reduce_motion: boolean | null
          sidebar_auto_collapse: boolean | null
          sidebar_default: string | null
          sidebar_width: string | null
          theme_mode: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          accent_color?: string | null
          animation_speed?: string | null
          animations_enabled?: boolean | null
          density?: string | null
          font_size?: string | null
          id?: string
          reduce_motion?: boolean | null
          sidebar_auto_collapse?: boolean | null
          sidebar_default?: string | null
          sidebar_width?: string | null
          theme_mode?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          accent_color?: string | null
          animation_speed?: string | null
          animations_enabled?: boolean | null
          density?: string | null
          font_size?: string | null
          id?: string
          reduce_motion?: boolean | null
          sidebar_auto_collapse?: boolean | null
          sidebar_default?: string | null
          sidebar_width?: string | null
          theme_mode?: string | null
          updated_at?: string | null
          user_id?: string | null
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
      work_item_assignments: {
        Row: {
          created_at: string | null
          id: string
          program_id: string | null
          team_id: string | null
          work_item_id: string
          work_item_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          program_id?: string | null
          team_id?: string | null
          work_item_id: string
          work_item_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          program_id?: string | null
          team_id?: string | null
          work_item_id?: string
          work_item_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_item_assignments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      work_item_forecast_ranks: {
        Row: {
          created_at: string | null
          id: string
          pi_id: string
          rank: number
          updated_at: string | null
          work_item_id: string
          work_item_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pi_id: string
          rank?: number
          updated_at?: string | null
          work_item_id: string
          work_item_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pi_id?: string
          rank?: number
          updated_at?: string | null
          work_item_id?: string
          work_item_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_item_forecast_ranks_pi_id_fkey"
            columns: ["pi_id"]
            isOneToOne: false
            referencedRelation: "program_increments"
            referencedColumns: ["id"]
          },
        ]
      }
      work_item_key_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_key: string
          old_key: string
          reason: string | null
          work_item_id: string
          work_item_type: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_key: string
          old_key: string
          reason?: string | null
          work_item_id: string
          work_item_type: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_key?: string
          old_key?: string
          reason?: string | null
          work_item_id?: string
          work_item_type?: string
        }
        Relationships: []
      }
      work_item_label_assignments: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          label_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          label_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_item_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "work_item_labels"
            referencedColumns: ["id"]
          },
        ]
      }
      work_item_labels: {
        Row: {
          color: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      work_item_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          from_work_item_id: string
          from_work_item_type: string
          id: string
          link_type: string | null
          pi_id: string | null
          program_id: string | null
          to_work_item_id: string
          to_work_item_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          from_work_item_id: string
          from_work_item_type: string
          id?: string
          link_type?: string | null
          pi_id?: string | null
          program_id?: string | null
          to_work_item_id: string
          to_work_item_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          from_work_item_id?: string
          from_work_item_type?: string
          id?: string
          link_type?: string | null
          pi_id?: string | null
          program_id?: string | null
          to_work_item_id?: string
          to_work_item_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_item_links_pi_id_fkey"
            columns: ["pi_id"]
            isOneToOne: false
            referencedRelation: "program_increments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_links_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      work_item_presence: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          status: string
          user_email: string | null
          user_id: string
          user_name: string | null
          work_item_id: string
          work_item_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          status?: string
          user_email?: string | null
          user_id: string
          user_name?: string | null
          work_item_id: string
          work_item_type: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          status?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
          work_item_id?: string
          work_item_type?: string
        }
        Relationships: []
      }
      work_item_rankings: {
        Row: {
          context_id: string | null
          context_type: string
          created_at: string | null
          id: string
          pi_id: string | null
          rank: number
          updated_at: string | null
          work_item_id: string
          work_item_type: string
        }
        Insert: {
          context_id?: string | null
          context_type: string
          created_at?: string | null
          id?: string
          pi_id?: string | null
          rank: number
          updated_at?: string | null
          work_item_id: string
          work_item_type: string
        }
        Update: {
          context_id?: string | null
          context_type?: string
          created_at?: string | null
          id?: string
          pi_id?: string | null
          rank?: number
          updated_at?: string | null
          work_item_id?: string
          work_item_type?: string
        }
        Relationships: []
      }
      work_item_time_logs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logged_by: string | null
          minutes_logged: number
          work_date: string
          work_item_id: string
          work_item_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logged_by?: string | null
          minutes_logged?: number
          work_date?: string
          work_item_id: string
          work_item_type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logged_by?: string | null
          minutes_logged?: number
          work_date?: string
          work_item_id?: string
          work_item_type?: string
        }
        Relationships: []
      }
      work_item_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          link_type: string
          release_id: string
          work_item_id: string
          work_item_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          link_type: string
          release_id: string
          work_item_id: string
          work_item_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          link_type?: string
          release_id?: string
          work_item_id?: string
          work_item_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_item_versions_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      work_item_watchers: {
        Row: {
          created_at: string
          id: string
          user_id: string
          work_item_id: string
          work_item_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          work_item_id: string
          work_item_type: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          work_item_id?: string
          work_item_type?: string
        }
        Relationships: []
      }
      workflow_rules: {
        Row: {
          architecture_review_required: boolean
          created_at: string
          created_by: string | null
          entity_type: string
          id: string
          is_active: boolean
          name: string
          notify_emails: string[] | null
          notify_roles: string[] | null
          program_increment_id: string | null
          state_value: string | null
          trigger_event: string
          updated_at: string
        }
        Insert: {
          architecture_review_required?: boolean
          created_at?: string
          created_by?: string | null
          entity_type: string
          id?: string
          is_active?: boolean
          name: string
          notify_emails?: string[] | null
          notify_roles?: string[] | null
          program_increment_id?: string | null
          state_value?: string | null
          trigger_event: string
          updated_at?: string
        }
        Update: {
          architecture_review_required?: boolean
          created_at?: string
          created_by?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean
          name?: string
          notify_emails?: string[] | null
          notify_roles?: string[] | null
          program_increment_id?: string | null
          state_value?: string | null
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_rules_program_increment_id_fkey"
            columns: ["program_increment_id"]
            isOneToOne: false
            referencedRelation: "program_increments"
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
      calculate_objective_score: {
        Args: { objective_uuid: string }
        Returns: number
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
      clean_stale_presence: { Args: never; Returns: undefined }
      create_adhoc_cycle: { Args: never; Returns: string }
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
      extract_kb_tiptap_text: { Args: { content: Json }; Returns: string }
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
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      track_room_access: {
        Args: {
          p_page_key?: string
          p_pi_label?: string
          p_room_id: string
          p_room_name: string
          p_room_path: string
          p_room_subtitle: string
          p_room_type: Database["public"]["Enums"]["room_type"]
          p_timebox_id?: string
          p_timebox_type?: string
          p_user_id: string
        }
        Returns: undefined
      }
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
      alignment_type: "direct" | "inherited"
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
      dependency_status:
        | "open"
        | "in_progress"
        | "done"
        | "pending_commit"
        | "negotiation"
        | "committed"
        | "delivered"
        | "no_work_done"
        | "rejected"
      dependency_type: "sequential" | "concurrent" | "program" | "external"
      epic_state: "not_started" | "in_progress" | "accepted"
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
      metric_type: "count" | "currency" | "percentage" | "decimal_score" | "nps"
      objective_category: "critical_path" | "stretch_goal"
      objective_health: "good" | "fair" | "poor" | "at_risk"
      objective_scope_type: "company" | "portfolio" | "program"
      objective_status:
        | "pending"
        | "in_progress"
        | "on_track"
        | "at_risk"
        | "off_track"
        | "paused"
        | "completed"
        | "canceled"
        | "missed"
      objective_tier: "portfolio" | "program" | "team"
      objective_type:
        | "feature_finisher"
        | "non_code"
        | "incremental_delivery"
        | "event"
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
      room_type:
        | "portfolio"
        | "program"
        | "team"
        | "strategy"
        | "epic"
        | "feature"
        | "objective"
        | "roadmap"
        | "product"
      skill_category:
        | "technical"
        | "cloud_infrastructure"
        | "data_analytics"
        | "security"
        | "leadership"
        | "soft_skills"
        | "domain_knowledge"
        | "methodology"
      skill_proficiency_level:
        | "awareness"
        | "beginner"
        | "intermediate"
        | "advanced"
        | "expert"
      story_status: "todo" | "in_progress" | "done"
      subtask_status: "todo" | "in_progress" | "done"
      team_status: "active" | "archived"
      team_type:
        | "AGILE"
        | "KANBAN"
        | "COP"
        | "PROGRAM"
        | "PORTFOLIO"
        | "SOLUTION"
        | "PROCESS_FLOW"
      test_case_status:
        | "draft"
        | "approved"
        | "deprecated"
        | "under_review"
        | "published"
      test_cycle_status: "planned" | "in_progress" | "completed" | "cancelled"
      test_execution_status:
        | "not_run"
        | "passed"
        | "failed"
        | "blocked"
        | "skipped"
      test_priority: "critical" | "high" | "medium" | "low"
      test_status: "never_tested" | "success" | "fail"
      test_step_status: "passed" | "failed" | "blocked" | "skipped"
      test_type: "manual" | "automated" | "bdd"
      theme_status: "proposed" | "active" | "done" | "cancelled"
      track_by_type: "POINTS" | "HOURS"
      work_item_type_enum: "epic" | "feature" | "story" | "task" | "defect"
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
      alignment_type: ["direct", "inherited"],
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
      dependency_status: [
        "open",
        "in_progress",
        "done",
        "pending_commit",
        "negotiation",
        "committed",
        "delivered",
        "no_work_done",
        "rejected",
      ],
      dependency_type: ["sequential", "concurrent", "program", "external"],
      epic_state: ["not_started", "in_progress", "accepted"],
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
      metric_type: ["count", "currency", "percentage", "decimal_score", "nps"],
      objective_category: ["critical_path", "stretch_goal"],
      objective_health: ["good", "fair", "poor", "at_risk"],
      objective_scope_type: ["company", "portfolio", "program"],
      objective_status: [
        "pending",
        "in_progress",
        "on_track",
        "at_risk",
        "off_track",
        "paused",
        "completed",
        "canceled",
        "missed",
      ],
      objective_tier: ["portfolio", "program", "team"],
      objective_type: [
        "feature_finisher",
        "non_code",
        "incremental_delivery",
        "event",
      ],
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
      room_type: [
        "portfolio",
        "program",
        "team",
        "strategy",
        "epic",
        "feature",
        "objective",
        "roadmap",
        "product",
      ],
      skill_category: [
        "technical",
        "cloud_infrastructure",
        "data_analytics",
        "security",
        "leadership",
        "soft_skills",
        "domain_knowledge",
        "methodology",
      ],
      skill_proficiency_level: [
        "awareness",
        "beginner",
        "intermediate",
        "advanced",
        "expert",
      ],
      story_status: ["todo", "in_progress", "done"],
      subtask_status: ["todo", "in_progress", "done"],
      team_status: ["active", "archived"],
      team_type: [
        "AGILE",
        "KANBAN",
        "COP",
        "PROGRAM",
        "PORTFOLIO",
        "SOLUTION",
        "PROCESS_FLOW",
      ],
      test_case_status: [
        "draft",
        "approved",
        "deprecated",
        "under_review",
        "published",
      ],
      test_cycle_status: ["planned", "in_progress", "completed", "cancelled"],
      test_execution_status: [
        "not_run",
        "passed",
        "failed",
        "blocked",
        "skipped",
      ],
      test_priority: ["critical", "high", "medium", "low"],
      test_status: ["never_tested", "success", "fail"],
      test_step_status: ["passed", "failed", "blocked", "skipped"],
      test_type: ["manual", "automated", "bdd"],
      theme_status: ["proposed", "active", "done", "cancelled"],
      track_by_type: ["POINTS", "HOURS"],
      work_item_type_enum: ["epic", "feature", "story", "task", "defect"],
    },
  },
} as const
