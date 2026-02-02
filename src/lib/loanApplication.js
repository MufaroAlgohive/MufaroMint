import { supabase } from "./supabase";

export async function initLoanStep(step, options = {}) {
  if (!supabase) return null;
  
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return null;

    const { data: existingLoan } = await supabase
      .from("loan_application")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingLoan) {
      return existingLoan;
    }

    const { data: newLoan, error } = await supabase
      .from("loan_application")
      .insert({
        user_id: userId,
        step_number: step,
        status: "draft"
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating loan application:", error);
      return null;
    }

    return newLoan;
  } catch (err) {
    console.error("Error in initLoanStep:", err);
    return null;
  }
}

export async function updateLoan(loanId, updates) {
  if (!supabase || !loanId) return null;

  try {
    const { data, error } = await supabase
      .from("loan_application")
      .update(updates)
      .eq("id", loanId)
      .select()
      .single();

    if (error) {
      console.error("Error updating loan:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Error in updateLoan:", err);
    return null;
  }
}

export async function getLoanApplication(loanId) {
  if (!supabase || !loanId) return null;

  try {
    const { data, error } = await supabase
      .from("loan_application")
      .select("*")
      .eq("id", loanId)
      .single();

    if (error) {
      console.error("Error fetching loan:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Error in getLoanApplication:", err);
    return null;
  }
}
