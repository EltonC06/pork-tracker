export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      account_types: {
        Row: {
          id: string
          user_id: string
          name: string
          icon: string | null
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          icon?: string | null
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          icon?: string | null
          color?: string | null
          created_at?: string
        }
      }
      account_snapshots: {
        Row: {
          id: string
          user_id: string
          account_type_id: string
          balance: number
          snapshot_date: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_type_id: string
          balance: number
          snapshot_date: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_type_id?: string
          balance?: number
          snapshot_date?: string
          notes?: string | null
          created_at?: string
        }
      }
      stock_positions: {
        Row: {
          id: string
          user_id: string
          ticker: string
          quantity: number
          avg_price: number
          current_price: number | null
          last_updated: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ticker: string
          quantity: number
          avg_price: number
          current_price?: number | null
          last_updated?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ticker?: string
          quantity?: number
          avg_price?: number
          current_price?: number | null
          last_updated?: string | null
          created_at?: string
        }
      }
      stock_price_history: {
        Row: {
          id: string
          user_id: string
          ticker: string
          price: number
          recorded_date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ticker: string
          price: number
          recorded_date: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ticker?: string
          price?: number
          recorded_date?: string
          created_at?: string
        }
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
  }
}

// Convenience row types
export type AccountType = Database['public']['Tables']['account_types']['Row']
export type AccountSnapshot = Database['public']['Tables']['account_snapshots']['Row']
export type StockPosition = Database['public']['Tables']['stock_positions']['Row']
export type StockPriceHistory = Database['public']['Tables']['stock_price_history']['Row']

// Extended types with computed fields
export interface AccountTypeWithLatestBalance extends AccountType {
  latest_balance: number | null
  latest_date: string | null
}

export interface StockPositionWithPL extends StockPosition {
  total_invested: number
  current_value: number | null
  profit_loss: number | null
  profit_loss_percent: number | null
}
