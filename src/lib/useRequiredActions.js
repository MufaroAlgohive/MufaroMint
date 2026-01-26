import { useEffect, useState } from "react";
import { supabase } from "./supabase";

const defaultActions = {
  kycVerified: false,
  bankLinked: false,
  loading: true,
};

export const useRequiredActions = () => {
  const [actions, setActions] = useState(defaultActions);

  useEffect(() => {
    let isMounted = true;

    const loadActions = async () => {
      try {
        if (!supabase) {
          if (isMounted) setActions({ ...defaultActions, loading: false });
          return;
        }

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          if (isMounted) setActions({ ...defaultActions, loading: false });
          return;
        }

        const userId = userData.user.id;

        let { data, error } = await supabase
          .from("required_actions")
          .select("kyc_verified, bank_linked")
          .eq("user_id", userId)
          .maybeSingle();

        if (error || !data) {
          const { data: newData, error: insertError } = await supabase
            .from("required_actions")
            .insert({ user_id: userId })
            .select("kyc_verified, bank_linked")
            .single();

          if (!insertError && newData) {
            data = newData;
          }
        }

        if (isMounted) {
          setActions({
            kycVerified: data?.kyc_verified || false,
            bankLinked: data?.bank_linked || false,
            loading: false,
          });
        }
      } catch (error) {
        console.error("Failed to load required actions", error);
        if (isMounted) setActions({ ...defaultActions, loading: false });
      }
    };

    loadActions();

    return () => {
      isMounted = false;
    };
  }, []);

  return actions;
};
