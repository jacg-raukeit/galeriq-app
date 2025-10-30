// src/context/EventsContext.js (corregido)
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from "react";
import { AuthContext } from "./AuthContext";

export const EventsContext = createContext();

const API_BASE = "http://143.198.138.35:8000";

export function EventsProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [events, setEvents] = useState([]);

  const isFetchingRef = useRef(false);
  const refreshTimerRef = useRef(null);

  const refreshEvents = useCallback(async (opts = { force: false }) => {
    if (!user?.token) {
      setEvents([]);
      return [];
    }
    if (isFetchingRef.current && !opts.force) {
      console.log("[EventsContext] refreshEvents: already fetching, skip");
      return events; 
    }

    isFetchingRef.current = true;
    try {
      console.log("[EventsContext] fetching events...");
      const res = await fetch(`${API_BASE}/events/get-events`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      if (res.status === 401) {
        const text = await res.text().catch(() => "");
        const err = new Error(text || "Unauthorized");
        err.status = 401;
        throw err;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const err = new Error(body || "Error fetching events");
        err.status = res.status;
        throw err;
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setEvents(list);
      return list;
    } catch (err) {
      console.error("[EventsContext] Error al cargar eventos:", err);
      throw err;
    } finally {
      isFetchingRef.current = false;
    }
  }, [user?.token]);

  
  useEffect(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    if (!user?.token) {
      setEvents([]);
      return;
    }

    refreshTimerRef.current = setTimeout(() => {
      refreshEvents().catch((e) => {
        console.log("[EventsContext] refresh after token change finished:", e?.message);
      });
    }, 250);

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [user?.token, refreshEvents]); 

  const addEvent = async (payload) => {
    if (!user?.token) throw new Error("No auth token");
    const {
      event_name,
      event_date,
      event_address,
      event_type,
      event_coverUri,
      event_status,
      event_description,
      event_latitude,
      event_longitude,
      budget,
    } = payload;

    const form = new FormData();
    form.append("event_name", event_name);
    form.append("event_date", event_date);
    form.append("event_address", event_address);
    form.append("event_type", event_type);
    form.append("event_owner_id", String(user.id));
    form.append("event_status", event_status);
    form.append("event_description", event_description);
    form.append("event_latitude", event_latitude);
    form.append("event_longitude", event_longitude);
    if (budget != null && String(budget).trim() !== "") {
      const clean = String(budget).replace(/\./g, "").replace(",", ".");
      form.append("budget", clean);
    }
    if (event_coverUri) {
      const filename = event_coverUri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";
      form.append("event_cover", { uri: event_coverUri, name: filename, type });
    }

    const res = await fetch(`${API_BASE}/events/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user.token}` },
      body: form,
    });

    if (res.status === 401) {
      const t = await res.text().catch(() => "");
      const err = new Error(t || "Unauthorized");
      err.status = 401;
      throw err;
    }
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Error al crear evento: ${errorText}`);
    }

    const nuevo = await res.json();
    setEvents((prev) => [nuevo, ...prev]);
    return nuevo;
  };

  const toggleArchive = (eventId) => {
    setEvents((prev) =>
      prev.map((evt) =>
        evt.event_id === eventId ? { ...evt, archived: !evt.archived } : evt
      )
    );
  };

  return (
    <EventsContext.Provider
      value={{ events, addEvent, toggleArchive, refreshEvents }}
    >
      {children}
    </EventsContext.Provider>
  );
}
