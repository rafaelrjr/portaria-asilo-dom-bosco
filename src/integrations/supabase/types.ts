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
      institution_settings: {
        Row: {
          cnpj: string | null
          email: string | null
          endereco: string | null
          horario_visita_fim: string | null
          horario_visita_inicio: string | null
          id: string
          logo: string | null
          nome: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          cnpj?: string | null
          email?: string | null
          endereco?: string | null
          horario_visita_fim?: string | null
          horario_visita_inicio?: string | null
          id?: string
          logo?: string | null
          nome?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          cnpj?: string | null
          email?: string | null
          endereco?: string | null
          horario_visita_fim?: string | null
          horario_visita_inicio?: string | null
          id?: string
          logo?: string | null
          nome?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      persons: {
        Row: {
          cpf: string
          created_at: string | null
          dias_permitidos: string[] | null
          foto: string | null
          horario_especial: boolean | null
          horario_especial_fim: string | null
          horario_especial_inicio: string | null
          id: string
          idoso_vinculado: string | null
          nome: string
          observacoes: string | null
          parentesco: string | null
          rg: string | null
          telefone: string | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          cpf: string
          created_at?: string | null
          dias_permitidos?: string[] | null
          foto?: string | null
          horario_especial?: boolean | null
          horario_especial_fim?: string | null
          horario_especial_inicio?: string | null
          id?: string
          idoso_vinculado?: string | null
          nome: string
          observacoes?: string | null
          parentesco?: string | null
          rg?: string | null
          telefone?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          cpf?: string
          created_at?: string | null
          dias_permitidos?: string[] | null
          foto?: string | null
          horario_especial?: boolean | null
          horario_especial_fim?: string | null
          horario_especial_inicio?: string | null
          id?: string
          idoso_vinculado?: string | null
          nome?: string
          observacoes?: string | null
          parentesco?: string | null
          rg?: string | null
          telefone?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "persons_idoso_vinculado_fkey"
            columns: ["idoso_vinculado"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          email: string | null
          id: string
          nome: string
          user_id: string
          username: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome: string
          user_id: string
          username: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      resident_exits: {
        Row: {
          acompanhante: string | null
          created_at: string | null
          data_saida: string
          hora_retorno_prevista: string
          hora_retorno_real: string | null
          hora_saida: string
          id: string
          motivo_saida: string
          observacoes: string | null
          resident_id: string
        }
        Insert: {
          acompanhante?: string | null
          created_at?: string | null
          data_saida: string
          hora_retorno_prevista: string
          hora_retorno_real?: string | null
          hora_saida: string
          id?: string
          motivo_saida: string
          observacoes?: string | null
          resident_id: string
        }
        Update: {
          acompanhante?: string | null
          created_at?: string | null
          data_saida?: string
          hora_retorno_prevista?: string
          hora_retorno_real?: string | null
          hora_saida?: string
          id?: string
          motivo_saida?: string
          observacoes?: string | null
          resident_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resident_exits_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      residents: {
        Row: {
          ativo: boolean | null
          autorizado_saida_temporaria: boolean | null
          created_at: string | null
          dias_saida_permitidos: string[] | null
          foto: string | null
          horario_retorno_permitido: string | null
          horario_saida_permitido: string | null
          id: string
          nome: string
          observacoes: string | null
          quarto: string
        }
        Insert: {
          ativo?: boolean | null
          autorizado_saida_temporaria?: boolean | null
          created_at?: string | null
          dias_saida_permitidos?: string[] | null
          foto?: string | null
          horario_retorno_permitido?: string | null
          horario_saida_permitido?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          quarto: string
        }
        Update: {
          ativo?: boolean | null
          autorizado_saida_temporaria?: boolean | null
          created_at?: string | null
          dias_saida_permitidos?: string[] | null
          foto?: string | null
          horario_retorno_permitido?: string | null
          horario_saida_permitido?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          quarto?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_trips: {
        Row: {
          created_at: string | null
          data_saida: string
          destino: string | null
          hora_chegada: string | null
          hora_saida: string
          id: string
          km_chegada: number | null
          km_saida: number
          motorista: string
          observacoes: string | null
          placa: string
          vehicle_id: string | null
          veiculo: string
        }
        Insert: {
          created_at?: string | null
          data_saida: string
          destino?: string | null
          hora_chegada?: string | null
          hora_saida: string
          id?: string
          km_chegada?: number | null
          km_saida: number
          motorista: string
          observacoes?: string | null
          placa: string
          vehicle_id?: string | null
          veiculo: string
        }
        Update: {
          created_at?: string | null
          data_saida?: string
          destino?: string | null
          hora_chegada?: string | null
          hora_saida?: string
          id?: string
          km_chegada?: number | null
          km_saida?: number
          motorista?: string
          observacoes?: string | null
          placa?: string
          vehicle_id?: string | null
          veiculo?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          ano: string | null
          ativo: boolean | null
          cor: string | null
          created_at: string | null
          id: string
          km_atual: number | null
          km_inicial: number | null
          marca: string
          modelo: string
          placa: string
        }
        Insert: {
          ano?: string | null
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          id?: string
          km_atual?: number | null
          km_inicial?: number | null
          marca: string
          modelo: string
          placa: string
        }
        Update: {
          ano?: string | null
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          id?: string
          km_atual?: number | null
          km_inicial?: number | null
          marca?: string
          modelo?: string
          placa?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          created_at: string | null
          data_entrada: string
          descricao_acao_social: string | null
          etiqueta_devolvida: boolean | null
          etiqueta_emitida: boolean | null
          hora_entrada: string
          hora_saida: string | null
          id: string
          idoso_id: string | null
          observacoes: string | null
          pessoa_departamento: string | null
          pessoa_id: string
          proposito: string | null
        }
        Insert: {
          created_at?: string | null
          data_entrada: string
          descricao_acao_social?: string | null
          etiqueta_devolvida?: boolean | null
          etiqueta_emitida?: boolean | null
          hora_entrada: string
          hora_saida?: string | null
          id?: string
          idoso_id?: string | null
          observacoes?: string | null
          pessoa_departamento?: string | null
          pessoa_id: string
          proposito?: string | null
        }
        Update: {
          created_at?: string | null
          data_entrada?: string
          descricao_acao_social?: string | null
          etiqueta_devolvida?: boolean | null
          etiqueta_emitida?: boolean | null
          hora_entrada?: string
          hora_saida?: string | null
          id?: string
          idoso_id?: string | null
          observacoes?: string | null
          pessoa_departamento?: string | null
          pessoa_id?: string
          proposito?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_idoso_id_fkey"
            columns: ["idoso_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operador" | "visualizador"
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
      app_role: ["admin", "operador", "visualizador"],
    },
  },
} as const
