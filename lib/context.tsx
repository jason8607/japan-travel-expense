"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile, Trip, TripMember } from "@/types";

interface AppContextType {
  user: User | null;
  profile: Profile | null;
  trips: Trip[];
  currentTrip: Trip | null;
  tripMembers: TripMember[];
  setCurrentTrip: (trip: Trip | null) => void;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  refreshTrip: () => Promise<void>;
  refreshTrips: () => Promise<Trip[]>;
}

const AppContext = createContext<AppContextType>({
  user: null,
  profile: null,
  trips: [],
  currentTrip: null,
  tripMembers: [],
  setCurrentTrip: () => {},
  loading: true,
  refreshProfile: async () => {},
  refreshTrip: async () => {},
  refreshTrips: async () => [],
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [tripMembers, setTripMembers] = useState<TripMember[]>([]);
  const [loading, setLoading] = useState(true);

  const hasSupabase =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const getSupabase = () => {
    if (!hasSupabase) return null;
    return createClient();
  };

  const refreshProfile = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    if (!u) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", u.id)
      .single();
    if (data) setProfile(data);
  };

  const refreshTrip = useCallback(async () => {
    if (!currentTrip) return;
    try {
      const res = await fetch(`/api/trip-members?trip_id=${currentTrip.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.members) setTripMembers(data.members);
      }
    } catch {
      // ignore
    }
  }, [currentTrip?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshTrips = useCallback(async () => {
    try {
      const res = await fetch("/api/trips");
      if (res.ok) {
        const data = await res.json();
        const fetchedTrips = data.trips || [];
        setTrips(fetchedTrips);
        return fetchedTrips;
      }
    } catch {
      // ignore
    }
    return [];
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const init = async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      setUser(u);

      if (u) {
        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", u.id)
          .single();
        setProfile(p);

        try {
          const res = await fetch("/api/trips");
          if (res.ok) {
            const data = await res.json();
            const fetchedTrips = data.trips || [];
            setTrips(fetchedTrips);

            if (fetchedTrips.length > 0) {
              const savedId = localStorage.getItem("current_trip_id");
              const saved = savedId
                ? fetchedTrips.find((t: Trip) => t.id === savedId)
                : null;
              setCurrentTrip(saved || fetchedTrips[0]);
            }
          }
        } catch {
          // ignore fetch error
        }
      }
      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: { user: User | null } | null) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
        setCurrentTrip(null);
        setTrips([]);
        setTripMembers([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentTrip) {
      refreshTrip();
      localStorage.setItem("current_trip_id", currentTrip.id);
    }
  }, [currentTrip?.id, refreshTrip]);

  return (
    <AppContext.Provider
      value={{
        user,
        profile,
        trips,
        currentTrip,
        tripMembers,
        setCurrentTrip,
        loading,
        refreshProfile,
        refreshTrip,
        refreshTrips,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
