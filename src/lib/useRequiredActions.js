import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";

const defaultActions = {
  kycVerified: false,
  bankLinked: false,
  bankInReview: false,
  loading: true,
};

export const useRequiredActions = () => {
  const [actions, setActions] = useState(defaultActions);

  const loadActions = useCallback(async () => {
    try {
      if (!supabase) {
        setActions({ ...defaultActions, loading: false });
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        setActions({ ...defaultActions, loading: false });
        return;
      }

      const userId = userData.user.id;

      let { data, error } = await supabase
        .from("required_actions")
        .select("kyc_verified, bank_linked, bank_in_review")
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !data) {
        const { data: newData, error: insertError } = await supabase
          .from("required_actions")
          .insert({ user_id: userId })
          .select("kyc_verified, bank_linked, bank_in_review")
          .single();

        if (!insertError && newData) {
          data = newData;
        }
      }

      setActions({
        kycVerified: data?.kyc_verified || false,
        bankLinked: data?.bank_linked || false,
        bankInReview: data?.bank_in_review || false,
        loading: false,
      });
    } catch (error) {
      console.error("Failed to load required actions", error);
      setActions({ ...defaultActions, loading: false });
    }
  }, []);

  const refetch = useCallback(() => {
    setActions((prev) => ({ ...prev, loading: true }));
    loadActions();
  }, [loadActions]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  return { ...actions, refetch };
};
