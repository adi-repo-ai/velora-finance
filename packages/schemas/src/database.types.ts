// Mirrors supabase/migrations. Regenerate with `pnpm db:types` once a local Supabase is running.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Enums = {
  account_type: 'checking' | 'savings' | 'credit' | 'loan' | 'investment' | 'cash' | 'wallet';
  cadence: 'weekly' | 'monthly' | 'yearly';
  category_kind: 'income' | 'expense' | 'transfer';
  country: 'US' | 'IN';
  currency: 'USD' | 'INR';
  txn_source: 'manual' | 'import' | 'sync';
};

type Table<Row, Required extends keyof Row, Rel = []> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: Rel;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        { id: string; display_name: string; home_country: Enums['country']; base_currency: Enums['currency']; timezone: string; created_at: string },
        'id'
      >;
      accounts: Table<
        {
          id: string; user_id: string; name: string; type: Enums['account_type']; currency: Enums['currency'];
          institution: string | null; mask: string | null; opening_balance: number; is_archived: boolean; created_at: string;
        },
        'name' | 'type' | 'currency'
      >;
      categories: Table<
        { id: string; user_id: string | null; name: string; kind: Enums['category_kind']; icon: string; color: string; created_at: string },
        'name'
      >;
      transactions: Table<
        {
          id: string; user_id: string; account_id: string; posted_on: string; amount: number; description: string;
          merchant: string | null; category_id: string | null; source: Enums['txn_source']; external_id: string | null;
          notes: string | null; created_at: string;
        },
        'account_id' | 'posted_on' | 'amount',
        [
          { foreignKeyName: 'transactions_category_id_fkey'; columns: ['category_id']; isOneToOne: false; referencedRelation: 'categories'; referencedColumns: ['id'] },
          { foreignKeyName: 'transactions_account_id_user_id_fkey'; columns: ['account_id', 'user_id']; isOneToOne: false; referencedRelation: 'accounts'; referencedColumns: ['id', 'user_id'] },
        ]
      >;
      budget_lines: Table<{ id: string; user_id: string; month: string; category_id: string; amount: number }, 'month' | 'category_id' | 'amount'>;
      goals: Table<
        {
          id: string; user_id: string; name: string; emoji: string; currency: Enums['currency']; target_amount: number;
          saved_amount: number; target_date: string | null; created_at: string;
        },
        'name' | 'currency' | 'target_amount'
      >;
      recurring_items: Table<
        {
          id: string; user_id: string; name: string; amount: number; currency: Enums['currency']; cadence: Enums['cadence'];
          next_due_on: string; remind_days_before: number; autopay: boolean; created_at: string;
          kind: 'bill' | 'subscription'; website: string | null;
        },
        'name' | 'amount' | 'currency' | 'next_due_on'
      >;
      push_tokens: Table<{ token: string; user_id: string; platform: 'ios' | 'android'; updated_at: string }, 'token' | 'platform'>;
    };
    Views: {
      account_balances: {
        Row: {
          id: string; user_id: string; name: string; type: Enums['account_type']; currency: Enums['currency'];
          institution: string | null; mask: string | null; is_archived: boolean; balance: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      month_summary: {
        Args: { p_month: string };
        Returns: { category_id: string | null; name: string; icon: string; color: string; kind: Enums['category_kind']; total: number }[];
      };
      budget_progress: {
        Args: { p_month: string };
        Returns: { category_id: string; name: string; icon: string; color: string; budgeted: number; spent: number }[];
      };
      net_worth_history: { Args: { p_months?: number }; Returns: { month: string; net_worth: number }[] };
      contribute_to_goal: { Args: { p_goal: string; p_amount: number }; Returns: Database['public']['Tables']['goals']['Row'] };
      mark_bill_paid: { Args: { p_item: string }; Returns: Database['public']['Tables']['recurring_items']['Row'] };
      delete_my_account: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: Enums;
    CompositeTypes: Record<never, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type DbEnums<T extends keyof Enums> = Enums[T];
