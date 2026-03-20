import { useEffect, useState } from "react";
import { supabase } from "./supabase";

const emptyProfile = {
  id: null,
  email: "",
  firstName: "",
  lastName: "",
  avatarUrl: "",
  phoneNumber: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  idNumber: "",
  mintNumber: "",
  wallet_balance: 0, // ADDED wallet_balance
  watchlist: [],
};

const buildProfile = ({ user, row }) => {
  const metadata = user?.user_metadata || {};
  return {
    id: row?.id || user?.id || "",
    email: row?.email || user?.email || "",
    firstName: row?.first_name || metadata.first_name || "",
    lastName: row?.last_name || metadata.last_name || "",
    avatarUrl: row?.avatar_url || metadata.avatar_url || "",
    phoneNumber: row?.phone_number || metadata.phone_number || "",
    dateOfBirth: row?.date_of_birth || metadata.date_of_birth || "",
    gender: row?.gender || metadata.gender || "",
    address: row?.address || metadata.address || "",
    idNumber: row?.id_number || metadata.id_number || "",
    mintNumber: row?.mint_number || row?.wallet_mint_number || "",
    wallet_balance: row?.wallet_balance ?? row?.wallets_balance ?? 0, // USE WALLETS BALANCE FALLBACK
    watchlist: row?.watchlist || [],
  };
};

export const useProfile = () => {
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        if (!supabase) {
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        const user = userData.user;
        let rowData = null;
        let rowError = null;

        const { data: d1, error: e1 } = await supabase
          .from("profiles")
          .select(
            "id, first_name, last_name, email, avatar_url, phone_number, date_of_birth, gender, address, id_number, mint_number, wallet_balance, watchlist"
          )
          .eq("id", user.id)
          .maybeSingle();

        // Fetch from wallets table as well
        const { data: wData } = await supabase
          .from("wallets")
          .select("balance, mint_number")
          .eq("user_id", user.id)
          .maybeSingle();

        const rowToBuild = d1 || { id: user.id, email: user.email };
        if (wData) {
          rowToBuild.wallets_balance = wData.balance;
          rowToBuild.wallet_mint_number = wData.mint_number;
        }

        if (!e1) {
          rowData = rowToBuild;
        } else if (e1.message?.includes('mint_number')) {
          const { data: d2, error: e2 } = await supabase
            .from("profiles")
            .select(
              "id, first_name, last_name, email, avatar_url, phone_number, date_of_birth, gender, address, id_number, wallet_balance, watchlist"
            )
            .eq("id", user.id)
            .maybeSingle();
          rowData = e2 ? null : d2;
          rowError = e2;
        } else {
          rowError = e1;
        }

        if (isMounted) {
          const built = buildProfile({ user, row: rowError ? null : rowData });
          setProfile(built);
          setLoading(false);

          if (!built.mintNumber && user.id) {
            try {
              const { data: sess } = await supabase.auth.getSession();
              const token = sess?.session?.access_token;
              if (token) {
                const resp = await fetch('/api/user/ensure-mint-number', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (resp.ok) {
                  const result = await resp.json();
                  if (result.mint_number && isMounted) {
                    setProfile(prev => ({ ...prev, mintNumber: result.mint_number }));
                  }
                }
              }
            } catch (mintErr) {
              console.log('Mint number generation deferred');
            }
          }
        }
      } catch (error) {
        console.error("Failed to load profile", error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  return { profile, loading, setProfile };
};
