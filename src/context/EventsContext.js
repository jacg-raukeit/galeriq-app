// src/context/EventsContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';

export const EventsContext = createContext();

export function EventsProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [events, setEvents] = useState([]);

  
  useEffect(() => {
    if (!user) return;
   fetch('http://192.168.1.106:8000/events/get-events', {
      headers: { Authorization: `Bearer ${user.token}` }
    })
      .then(res => res.json())
      .then(data => setEvents(data))
      .catch(err => console.error('Error al cargar eventos:', err));
  }, [user]);

  
  const addEvent = async ({ 
    event_name, event_date, event_address, event_type,
    event_coverUri, event_status, event_description,
    event_latitude, event_longitude
  }) => {
    const form = new FormData();
    form.append('event_name', event_name);
    form.append('event_date', event_date);
    form.append('event_address', event_address);
    form.append('event_type', event_type);
    form.append('event_owner_id', String(user.id));
    form.append('event_status', event_status);
    form.append('event_description', event_description);
    form.append('event_latitude', event_latitude);
    form.append('event_longitude', event_longitude);
    if (event_coverUri) {
      const filename = event_coverUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      form.append('event_cover', { uri: event_coverUri, name: filename, type });
    }

    const res = await fetch('http://192.168.1.106:8000/events/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user.token}` },
      body: form
    });
   if (!res.ok) {
  const errorText = await res.text();
  throw new Error(`Error al crear evento: ${errorText}`);
}

const nuevo = await res.json();
setEvents(prev => [nuevo, ...prev]);
  };

  
  const toggleArchive = (eventId) => {
    setEvents(prev =>
      prev.map(evt =>
        evt.event_id === eventId
          ? { ...evt, archived: !evt.archived }
          : evt
      )
    );
  };

  return (
    <EventsContext.Provider value={{ events, addEvent, toggleArchive }}>
      {children}
    </EventsContext.Provider>
  );
}
