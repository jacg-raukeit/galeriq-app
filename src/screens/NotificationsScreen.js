// src/screens/NotificationsScreen.js
import React, { useEffect, useState, useContext, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Image,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "react-i18next";

const API_BASE = "http://143.198.138.35:8000";

export default function NotificationsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { t } = useTranslation("notifications");

  const [unread, setUnread] = useState([]); 
  const [read, setRead] = useState([]);     

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [rsvpChecking, setRsvpChecking] = useState(false);
  const [resolvedGuestId, setResolvedGuestId] = useState(null);

  const [me, setMe] = useState({ full_name: null, email: null });

  const [rsvpDone, setRsvpDone] = useState(false);
  const [rsvpResult, setRsvpResult] = useState(null);

  const [inviteImgUrl, setInviteImgUrl] = useState(null);
  const [inviteImgLoading, setInviteImgLoading] = useState(false);

  const [rsvpByNotif, setRsvpByNotif] = useState({});
  const [eventIdForSelected, setEventIdForSelected] = useState(null);

  const [markingRead, setMarkingRead] = useState(false);

  const [activeTab, setActiveTab] = useState("unread"); 

  const mapItem = (n) => {
    const id = n?.notification_id ?? n?.id ?? String(Math.random());
    const title = n?.title ?? n?.titulo ?? t("labels.notification");
    const message = n?.message ?? n?.body ?? n?.content ?? "";
    const type = (n?.type ?? n?.tipo ?? "GENERAL")?.toString?.() ?? "GENERAL";
    const is_read = typeof n?.is_read === "boolean" ? n.is_read : n?.is_read;
    const created_at =
      n?.created_at ?? n?.createdAt ?? n?.date ?? n?.timestamp ?? null;
    const event_id =
      n?.event_id ??
      n?.eventId ??
      n?.data?.event_id ??
      n?.data?.eventId ??
      n?.payload?.event_id ??
      n?.payload?.eventId ??
      null;
    return { id, raw: n, title, message, type, is_read, created_at, event_id };
  };

  const sortByDateDesc = (arr) =>
    [...arr].sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

  const iconFor = (type) => {
    const t = (type || "").toUpperCase();
    if (t.includes("INVITE") || t.includes("INVIT"))
      return "mail-unread-outline";
    if (t.includes("EVENT")) return "calendar-outline";
    if (t.includes("STAGE")) return "time-outline";
    if (t.includes("ALBUM")) return "images-outline";
    return "notifications-outline";
  };

  const isInvite = (item) => {
    const t = (item?.type || "").toUpperCase();
    return t.includes("INVITE") || t.includes("INVIT");
  };

  const stripUrls = (text) =>
    String(text || "")
      .replace(/(https?:\/\/[^\s]+)/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

  const getEventName = (item) => {
    const r = item?.raw || {};
    const direct =
      r?.event_name ||
      r?.data?.event_name ||
      r?.payload?.event_name ||
      item?.event_name;
    if (direct) return String(direct);
    const m = String(item?.title || "").match(/evento:\s*(.+)$/i);
    return m?.[1]?.trim() || null;
  };

  const getInviterName = (item) => {
    const r = item?.raw || {};
    const cands = [
      r?.inviter_name, r?.sender_name, r?.from_name, r?.from_user_name,
      r?.created_by_name, r?.creator_name, r?.owner_name, r?.host_name,
      r?.data?.inviter_name, r?.data?.sender_name, r?.data?.from_name,
      r?.payload?.inviter_name, r?.payload?.sender_name, r?.payload?.from_name,
    ];
    return cands.find((x) => x && String(x).trim()) || null;
  };

  const fetchReadUnread = useCallback(async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${user.token}` };

      const [ru, rr] = await Promise.all([
        fetch(`${API_BASE}/notifications/unread`, { headers }),
        fetch(`${API_BASE}/notifications/read`,   { headers }),
      ]);

       if (!ru.ok) throw new Error(t("alerts.load_unread_fail"));
      if (!rr.ok) throw new Error(t("alerts.load_read_fail"));

      const [unreadList, readList] = await Promise.all([ru.json(), rr.json()]);

      const mappedUnread = sortByDateDesc((unreadList || []).map(mapItem).map(x => ({ ...x, is_read: false })));
      const mappedRead   = sortByDateDesc((readList   || []).map(mapItem).map(x => ({ ...x, is_read: true })) );

      setUnread(mappedUnread);
      setRead(mappedRead);
    } catch (e) {
      Alert.alert(t("alerts.error"), e?.message || t("alerts.load_all_fail"));
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  const fetchMe = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (r.ok) {
        const data = await r.json();
        setMe({ full_name: data?.full_name || null, email: data?.email || null });
      }
    } catch {}
  }, [user?.token]);

  useEffect(() => {
    fetchReadUnread();
    fetchMe();
  }, [fetchReadUnread, fetchMe]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReadUnread();
    setRefreshing(false);
  }, [fetchReadUnread]);

  const getAllItems = () => [...unread, ...read];
  const findById = (id) => getAllItems().find((x) => String(x.id) === String(id));

  const tryGetGuestIdDirect = (item) => {
    const r = item?.raw || {};
    const cands = [
      r?.guest_id, r?.guestId, r?.invitee_id, r?.inviteeId,
      r?.data?.guest_id, r?.data?.guestId, r?.data?.invitee_id, r?.data?.inviteeId,
      r?.payload?.guest_id, r?.payload?.guestId, r?.payload?.invitee_id, r?.payload?.inviteeId,
      item?.guest_id, item?.guestId,
    ];
    const found = cands.find(
      (v) => typeof v === "number" || (typeof v === "string" && v.trim() !== "")
    );
    return found ? Number(found) : null;
  };

  const parseTokenFromAny = (item) => {
    const r = item?.raw || {};
    const direct = r?.token || r?.invitation_token || r?.invite_token || item?.token;
    if (typeof direct === "string" && direct.trim()) return direct.trim();

    const link = r?.link || r?.url || item?.url || item?.message || "";
    try {
      const qMatch = String(link).match(/[?&]token=([^&#\s]+)/i);
      if (qMatch?.[1]) return qMatch[1];
    } catch {}
    const tMatch = String(link).match(/token=([A-Za-z0-9._-]+)/);
    if (tMatch?.[1]) return tMatch[1];

    return null;
  };

  const findGuestByEventAndEmail = async (eventId, email) => {
    if (!eventId || !email) return null;
    const r = await fetch(`${API_BASE}/guests/event/${eventId}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (!r.ok) return null;
    const guests = await r.json();
    const g = (guests || []).find(
      (x) => String(x?.email || "").toLowerCase().trim() === String(email).toLowerCase().trim()
    );
    return g?.guest_id ?? null;
  };

  const toNum = (v) => {
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
    return null;
  };

  const getEventIdFromItem = (item) => {
    const r = item?.raw || {};
    const cands = [
      item?.event_id, item?.eventId, r?.event_id, r?.eventId,
      r?.data?.event_id, r?.data?.eventId, r?.payload?.event_id, r?.payload?.eventId,
      r?.event?.event_id, r?.data?.event?.event_id, r?.payload?.event?.event_id,
    ];
    for (const c of cands) {
      const n = toNum(c);
      if (n) return n;
    }
    return null;
  };

  const fetchInvitationImage = useCallback(
    async (item) => {
      setInviteImgUrl(null);
      setInviteImgLoading(true);
      setEventIdForSelected(null);
      try {
        let eid = getEventIdFromItem(item);
        if (!eid) {
          const token = parseTokenFromAny(item);
          if (token) {
            const r = await fetch(`${API_BASE}/guests/invite/validate?token=${encodeURIComponent(token)}`);
            if (r.ok) {
              const data = await r.json();
              if (data?.event_id) eid = Number(data.event_id);
            }
          }
        }
        if (!eid) { setInviteImgLoading(false); return; }
        setEventIdForSelected(eid);
        const res = await fetch(`${API_BASE}/events/${eid}/invitation-photo/`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (!res.ok) { setInviteImgUrl(null); return; }
        const json = await res.json();
        const url = json?.url_invitation;
        setInviteImgUrl(url ? `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}` : null);
      } catch {
        setInviteImgUrl(null);
      } finally {
        setInviteImgLoading(false);
      }
    },
    [user?.token]
  );

  const fetchGuestRsvp = useCallback(
    async (eventId, guestId) => {
      try {
        const r = await fetch(`${API_BASE}/guests/event/${eventId}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (!r.ok) return null;
        const guests = await r.json();
        const g = (guests || []).find((x) => Number(x?.guest_id) === Number(guestId));
        return typeof g?.rsvp_status === "number" ? g.rsvp_status : null;
      } catch { return null; }
    },
    [user?.token]
  );

  useEffect(() => {
    const run = async () => {
      if (!detailOpen || !selected || !isInvite(selected)) return;
      if (!resolvedGuestId || !eventIdForSelected) return;
      const saved = rsvpByNotif[selected.id] ?? selected.__rsvp_status ?? null;
      if (saved === 1 || saved === 2) return;
      setRsvpChecking(true);
      const status = await fetchGuestRsvp(eventIdForSelected, resolvedGuestId);
      if (status === 1 || status === 2) {
        setRsvpDone(true);
        setRsvpResult(status === 1 ? "aceptado" : "declinado");
        setRsvpByNotif((prev) => ({ ...prev, [selected.id]: status }));
        setUnread((prev) => prev.map((n) => (n.id === selected.id ? { ...n, __rsvp_status: status } : n)));
        setRead((prev) => prev.map((n) => (n.id === selected.id ? { ...n, __rsvp_status: status } : n)));
      }
      setRsvpChecking(false);
    };
    run();
  }, [detailOpen, selected?.id, resolvedGuestId, eventIdForSelected, rsvpByNotif, selected?.__rsvp_status, fetchGuestRsvp]);

  const apiMarkAsRead = async (notificationId) => {
    const r = await fetch(`${API_BASE}/notifications/${notificationId}/mark-as-read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (!r.ok) {
      const msg = await r.text();
       throw new Error(msg || t("alerts.mark_read_fail"));
    }
    return r.json();
  };

  const moveToRead = (itemId) => {
    setUnread((prevUnread) => {
      const idx = prevUnread.findIndex((x) => String(x.id) === String(itemId));
      if (idx === -1) return prevUnread;
      const item = { ...prevUnread[idx], is_read: true };
      const newUnread = [...prevUnread];
      newUnread.splice(idx, 1);
      setRead((prevRead) => sortByDateDesc([item, ...prevRead]));
      return newUnread;
    });
  };

  const markOneAsRead = async (item, { silent = true } = {}) => {
    const alreadyRead = findById(item.id)?.is_read === true;
    if (alreadyRead) return;
    moveToRead(item.id);
    try {
      if (!silent) setMarkingRead(true);
      await apiMarkAsRead(item.id);
    } catch (e) {
      setRead((prevRead) => {
        const idx = prevRead.findIndex((x) => String(x.id) === String(item.id));
        if (idx === -1) return prevRead;
        const itemBack = { ...prevRead[idx], is_read: false };
        const newRead = [...prevRead];
        newRead.splice(idx, 1);
        setUnread((prevUnread) => sortByDateDesc([itemBack, ...prevUnread]));
        return newRead;
      });
      if (!silent) Alert.alert(t("alerts.error"), e?.message || t("alerts.mark_read_fail"));
    } finally {
      if (!silent) setMarkingRead(false);
    }
  };

  const openDetail = async (item) => {
    setSelected(item);
    setDetailOpen(true);
    setResolvedGuestId(null);
    setRsvpDone(false);
    setRsvpResult(null);
    setRsvpChecking(false);
    setInviteImgUrl(null);
    setEventIdForSelected(null);

    if (!findById(item.id)?.is_read) markOneAsRead(item, { silent: true });

    const saved = rsvpByNotif[item.id];
    if (saved === 1 || saved === 2) {
      setRsvpDone(true);
      setRsvpResult(saved === 1 ? "aceptado" : "declinado");
    } else if (typeof item.__rsvp_status === "number") {
      setRsvpDone(true);
      setRsvpResult(item.__rsvp_status === 1 ? "aceptado" : "declinado");
      setRsvpByNotif((prev) => ({ ...prev, [item.id]: item.__rsvp_status }));
    }

    if (isInvite(item)) fetchInvitationImage(item);

    if (isInvite(item)) {
      try {
        setResolving(true);
        const gid = await resolveGuestId(item);
        setResolvedGuestId(gid);
      } finally {
        setResolving(false);
      }
    }
  };

  const resolveGuestId = async (item) => {
    const direct = tryGetGuestIdDirect(item);
    if (direct) return direct;

    const token = parseTokenFromAny(item);
    if (token) {
      const r = await fetch(`${API_BASE}/guests/invite/validate?token=${encodeURIComponent(token)}`);
      if (r.ok) {
        const data = await r.json();
        if (data?.guest_id) return Number(data.guest_id);
      }
    }

    if (item?.event_id && me?.email) {
      const gId = await findGuestByEventAndEmail(item.event_id, me.email);
      if (gId) return Number(gId);
    }
    return null;
  };

  const deleteOne = async (item) => {
    try {
      setDeleting(true);
      const r = await fetch(`${API_BASE}/notifications/${item.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(txt || "No se pudo eliminar.");
      }
      setDetailOpen(false);
      setUnread((prev) => prev.filter((x) => x.id !== item.id));
      setRead((prev) => prev.filter((x) => x.id !== item.id));
      Alert.alert(t("alerts.ok"), t("alerts.deleted"));
    } catch (e) {
       Alert.alert(t("alerts.error"), e?.message || t("alerts.cannot_delete"));
    } finally {
      setDeleting(false);
    }
  };

  const handleRSVP = async (status) => {
    if (!selected) return;
    const guestId = resolvedGuestId;
    if (!guestId) {
      return Alert.alert(t("alerts.missing_info_title"), t("alerts.missing_guest_id"));
    }
    try {
      setRsvpLoading(true);
      const res = await fetch(`${API_BASE}/guests/${guestId}/rsvp`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ rsvp_status: String(status) }).toString(),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || t("alerts.rsvp_fail"));

      const resultTxt = status === 1 ? "aceptado" : "declinado";
      setRsvpDone(true);
      setRsvpResult(resultTxt);

      setRsvpByNotif((prev) => ({ ...prev, [selected.id]: status }));
      setRead((prev) => prev.map((n) => (n.id === selected.id ? { ...n, __rsvp_status: status } : n)));

      Alert.alert(t("alerts.ok"), t("alerts.rsvp_done", { result: resultTxt }));
      if (status === 1) { setDetailOpen(false); navigation.navigate("Events"); }
    } catch (e) {
      Alert.alert("Error", e?.message || "No se pudo actualizar el RSVP.");
    } finally {
      setRsvpLoading(false);
    }
  };

  const unreadCount = unread.length;
  const dataForTab = activeTab === "unread" ? unread : read;

  const renderItem = ({ item }) => {
    const isRead = item.is_read === true;
    return (
      <TouchableOpacity
        style={[styles.row, isRead && styles.rowRead]}
        onPress={() => openDetail(item)}
        activeOpacity={0.9}
      >
        <View style={styles.iconWrap}>
          <Ionicons name={iconFor(item.type)} size={20} color="#6B21A8" />
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[styles.title, isRead && styles.titleRead]} numberOfLines={1}>
              {item.title}
            </Text>
            {isRead && (
              <View style={styles.readPill}>
                <Ionicons name="checkmark-done" size={12} color="#065F46" />
                <Text style={styles.readPillText}>Leída</Text>
              </View>
            )}
          </View>

          {!!item.message && (
            <Text style={[styles.subtitle, isRead && styles.subtitleRead]} numberOfLines={2}>
              {stripUrls(item.message)}
            </Text>
          )}
          {!!item.created_at && (
            <Text style={styles.meta}>
              {new Date(item.created_at).toLocaleString("es-MX")}
            </Text>
          )}
        </View>

        {item.is_read === false && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  const inviteCleanMessage = (item) => {
    const nombre = me?.full_name || t("invite_message.guest_generic");
    const eventName = getEventName(item);
    const inviter = getInviterName(item);
    let text = `${t("invite_message.hello_name", { name: nombre })}, ${t("invite_message.lead")}`;
    if (eventName) text += ` "${eventName}"`;
    if (inviter) text += ` ${t("invite_message.by", { inviter })}`;
    return text + ".";
  };

  const selectedStatus = selected
    ? rsvpByNotif[selected.id] ?? selected?.__rsvp_status ?? null
    : null;
  const alreadyAnswered =
    isInvite(selected) && (rsvpDone || selectedStatus === 1 || selectedStatus === 2);
  const answeredText =
    selectedStatus === 1 ? t("statuses.accepted") : selectedStatus === 2 ? t("statuses.declined") : rsvpResult;

  const selectedIsRead =
    selected &&
    (findById(selected.id)?.is_read === true);

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t("title")}</Text>

        <View style={styles.unreadBadge}>
          <Ionicons name="mail-unread-outline" size={16} color="#6B21A8" />
          <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
        </View>
      </View>

      {/* No leídas / Leídas */}
      <View style={styles.segment}>
        <TouchableOpacity
          style={[styles.segBtn, activeTab === "unread" && styles.segBtnActive]}
          onPress={() => setActiveTab("unread")}
        >
          <Text style={[styles.segText, activeTab === "unread" && styles.segTextActive]}>
            {t("tabs.unread")} ({unread.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segBtn, activeTab === "read" && styles.segBtnActive]}
          onPress={() => setActiveTab("read")}
        >
          <Text style={[styles.segText, activeTab === "read" && styles.segTextActive]}>
            {t("tabs.read")} ({read.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={dataForTab}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={dataForTab.length ? styles.list : styles.listEmpty}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={{ color: "#6B7280" }}>
              {activeTab === "unread" ? t("tabs.empty_unread") : t("tabs.empty_read")}
            </Text>
          }
        />
      )}

      {/* Modal detalle */}
      <Modal
        visible={detailOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Ionicons name={iconFor(selected?.type)} size={20} color="#6B21A8" />
              <Text style={styles.cardTitle} numberOfLines={2}>
                {selected?.title}
              </Text>
              {selectedIsRead && (
                <View style={[styles.readPill, { marginLeft: 6 }]}>
                  <Ionicons name="checkmark-done" size={12} color="#065F46" />
                  <Text style={styles.readPillText}>{t("badges.read")}</Text>
                </View>
              )}
            </View>

            {selected && (
              <Text style={styles.cardText}>
                {isInvite(selected) ? inviteCleanMessage(selected) : stripUrls(selected?.message)}
              </Text>
            )}

            {!!selected?.created_at && (
              <Text style={styles.cardMeta}>{new Date(selected.created_at).toLocaleString("es-MX")}</Text>
            )}

            {isInvite(selected) && (
              <View style={{ marginTop: 12 }}>
                {inviteImgLoading ? (
                  <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 12 }}>
                    <ActivityIndicator />
                    <Text style={{ marginTop: 6, color: "#6B7280" }}>{t("labels.loading_invite")}</Text>
                  </View>
                ) : inviteImgUrl ? (
                  <Image
                    source={{ uri: inviteImgUrl }}
                    style={{ width: "100%", height: 420, borderRadius: 10, backgroundColor: "#F3F4F6" }}
                    resizeMode="cover"
                    onError={() => setInviteImgUrl(null)}
                  />
                ) : (
                  <Text style={{ color: "#9CA3AF" }}>{t("labels.no_invite")}</Text>
                )}
              </View>
            )}

            {isInvite(selected) && !alreadyAnswered && (
              <>
                {(resolving || rsvpChecking) ? (
                  <View style={{ marginTop: 12, alignItems: "center" }}>
                    <ActivityIndicator />
                    <Text style={{ marginTop: 6, color: "#6B7280" }}>{t("labels.searching_invite")}</Text>
                    <Text style={{ marginTop: 6, color: "#6B7280" }}>{t("labels.checking_rsvp")}</Text>
                  </View>
                ) : resolvedGuestId ? (
                  <View style={styles.rsvpRow}>
                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: "#10B981" }, rsvpLoading && { opacity: 0.6 }]}
                      onPress={() => handleRSVP(1)}
                      disabled={rsvpLoading}
                    >
                      {rsvpLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t("labels.accept_invite")}</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: "#6B7280" }, rsvpLoading && { opacity: 0.6 }]}
                      onPress={() => handleRSVP(2)}
                      disabled={rsvpLoading}
                    >
                     {rsvpLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t("labels.decline")}</Text>}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={{ marginTop: 12, color: "#B91C1C" }}>{t("alerts.missing_guest_id")}</Text>
                )}
              </>
            )}

            {isInvite(selected) && alreadyAnswered && (
              <Text style={{ marginTop: 12, fontWeight: "700", color: answeredText === t("statuses.accepted") ? "#065F46" : "#4B5563" }}>
                {t("invite_message.answered_prefix", { status: answeredText })}
              </Text>
            )}

            {!selectedIsRead && (
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "#E5F9F2", marginTop: 12 }]}
                onPress={async () => { if (!selected) return; await markOneAsRead(selected, { silent: false }); }}
                disabled={markingRead}
              >
                {markingRead ? <ActivityIndicator color="#065F46" /> : <Text style={[styles.btnText, { color: "#065F46" }]}>{t("labels.mark_read")}</Text>}
              </TouchableOpacity>
            )}

            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: "#efeff4" }]} onPress={() => setDetailOpen(false)}>
                <Text style={[styles.btnText, { color: "#111827" }]}>{t("labels.close")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "#DC2626" }, deleting && { opacity: 0.6 }]}
                onPress={() => deleteOne(selected)}
                disabled={deleting}
              >
                {deleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t("labels.delete")}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF" },

  header: {
    height: 50,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },

  unreadBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#F3E8FF",
    borderRadius: 999,
    gap: 6,
  },
  unreadBadgeText: { fontWeight: "800", color: "#6B21A8" },

  segment: {
    marginTop: 8,
    marginHorizontal: 12,
    padding: 4,
    backgroundColor: "#F5F3FF",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  segBtnActive: {
    backgroundColor: "#6B21A8",
  },
  segText: { fontWeight: "700", color: "#6B21A8" },
  segTextActive: { color: "#FFFFFF" },

  list: { padding: 12, paddingBottom: 24 },
  listEmpty: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  rowRead: { opacity: 0.65 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  title: { fontSize: 15, fontWeight: "700", color: "#111827" },
  titleRead: { color: "#374151" },
  subtitle: { fontSize: 13, color: "#4B5563", marginTop: 4 },
  subtitleRead: { color: "#6B7280" },
  meta: { fontSize: 11, color: "#9CA3AF", marginTop: 6 },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
    marginLeft: 8,
  },

  readPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#E5F9F2",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  readPillText: { fontSize: 10, fontWeight: "800", color: "#065F46" },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "88%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
  },
  cardTitle: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  cardText: { fontSize: 14, color: "#374151", marginTop: 4 },
  cardMeta: { fontSize: 12, color: "#6B7280", marginTop: 8 },

  rsvpRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 14 },

  btn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 10 },
});
