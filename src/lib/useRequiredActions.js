import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "./supabase";

const defaultActions = {
  kycVerified: false,
  kycNeedsResubmission: false,
  kycPending: false,
  bankLinked: false,
  bankInReview: false,
  loading: true,
};

export const useRequiredActions = () => {
  const [actions, setActions] = useState(defaultActions);
  const userIdRef = useRef(null);

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
      userIdRef.current = userId;

      let { data, error } = await supabase
        .from("required_actions")
        .select("kyc_verified, kyc_needs_resubmission, kyc_pending, bank_linked, bank_in_review")
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !data) {
        const { data: newData, error: insertError } = await supabase
          .from("required_actions")
          .insert({ user_id: userId })
          .select("kyc_verified, kyc_needs_resubmission, kyc_pending, bank_linked, bank_in_review")
          .single();

        if (!insertError && newData) {
          data = newData;
        }
      }

      setActions({
        kycVerified: data?.kyc_verified || false,
        kycNeedsResubmission: data?.kyc_needs_resubmission || false,
        kycPending: data?.kyc_pending || false,
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
    
    const handleFocus = () => {
      loadActions();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadActions();
      }
    };

    // Listen for custom KYC status change events
    const handleKycStatusChange = () => {
      loadActions();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('kycStatusChanged', handleKycStatusChange);

    let subscription = null;
    if (supabase) {
      subscription = supabase
        .channel('required_actions_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'required_actions',
          },
          (payload) => {
            if (payload.new && payload.new.user_id === userIdRef.current) {
              setActions({
                kycVerified: payload.new.kyc_verified || false,
                kycNeedsResubmission: payload.new.kyc_needs_resubmission || false,
                kycPending: payload.new.kyc_pending || false,
                bankLinked: payload.new.bank_linked || false,
                bankInReview: payload.new.bank_in_review || false,
                loading: false,
              });
            }
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('kycStatusChanged', handleKycStatusChange);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [loadActions]);

  return { ...actions, refetch };
};
