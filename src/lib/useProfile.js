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
  watchlist: [], 
};

const buildProfile = ({ user, row }) => {
  const metadata = user?.user_metadata || {};
  return {
    id: user?.id,
    email: row?.email || user?.email || "",
    firstName: row?.first_name || metadata.first_name || "",
    lastName: row?.last_name || metadata.last_name || "",
    avatarUrl: row?.avatar_url || metadata.avatar_url || "",
    phoneNumber: row?.phone_number || metadata.phone_number || "",
    dateOfBirth: row?.date_of_birth || metadata.date_of_birth || "",
    gender: row?.gender || metadata.gender || "",
    address: row?.address || metadata.address || "",
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
        const { data: rowData, error: rowError } = await supabase
          .from("profiles")
          .select("*") 
          .eq("id", user.id)
          .maybeSingle();

        if (isMounted) {
          setProfile(buildProfile({ user, row: rowError ? null : rowData }));
          setLoading(false);
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