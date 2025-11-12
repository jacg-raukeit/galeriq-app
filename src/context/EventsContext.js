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

// --- INICIO DEL CAMBIO ---
// Esta bandera vivirá fuera del componente.
// Evitará llamadas duplicadas incluso si el Provider se remonta.
let globalHasInitialFetchStarted = false;// --- FIN DEL CAMBIO ---

export function EventsProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [events, setEvents] = useState([]);

  const isFetchingRef = useRef(false);
  const refreshTimerRef = useRef(null);

  const refreshEvents = useCallback(
    async (opts = { force: false }) => {
      if (!user?.token) {
        setEvents([]);
        return [];
      }
      // --- INICIO DEL CAMBIO ---
      // Usamos el candado global
      if (globalHasInitialFetchStarted && !opts.force) {
        console.log(
          "[EventsContext] refreshEvents: Initial fetch already started, skip"
        );
        return events;
      }
      // Ponemos el cerrojo. NO se quitará hasta el logout.
 globalHasInitialFetchStarted = true;
isFetchingRef.current = true;
 // --- FIN CAMBIO ---

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
        // --- INICIO DEL CAMBIO ---
        // Si falla, liberamos el candado para permitir un reintento
        globalHasInitialFetchStarted = false;
 isFetchingRef.current = false;
        // --- FIN DEL CAMBIO ---
        throw err;
      } finally {
        // --- INICIO DEL CAMBIO ---
        // Liberamos el candado global
        isFetchingRef.current = false;
        // --- FIN DEL CAMBIO ---
      }
    },
    [user?.token]
  );

  useEffect(() => {
    // Limpia los eventos si el token del usuario desaparece (logout)
    if (!user?.token) {
      console.log("[EventsContext] User token cleared, setting empty events.");
      setEvents([]);
      isFetchingRef.current = false; // Resetea el flag por si acaso
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
 // --- CAMBIO ---
 // Aquí es donde SÍ reiniciamos el cerrojo
 globalHasInitialFetchStarted = false;
// --- FIN CAMBIO ---
 }
 }, [user?.token]);

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
