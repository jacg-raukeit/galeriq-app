import React, {
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
  useContext,
} from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Image,
  Modal, // Importado
  TextInput,
  Share,
  Alert,
  ActivityIndicator,
  Animated,
  Pressable,
  Easing,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as ImageManipulator from "expo-image-manipulator";

import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const API_URL = "http://143.198.138.35:8000";

const { width: SCREEN_W } = Dimensions.get("window");
const GUTTER = 12;
const COLS = 2;
const COL_W = (SCREEN_W - GUTTER * (COLS + 1)) / COLS;


// URLs de Albumes y Fotos
const CREATE_ALBUM_URL = `${API_URL}/albums/`;
const ALBUMS_BY_EVENT_URL = (eventId) => `${API_URL}/albums/${eventId}`;
const UPLOAD_URL = (albumId) => `${API_URL}/albums/${albumId}/photos`;
const PHOTOS_BY_ALBUM_URL = (albumId) => `${API_URL}/photos/album/${albumId}`;
const FAVORITE_URL = (photoId) => `${API_URL}/photos/${photoId}/favorite`;
const DELETE_PHOTO_URL = (photoId) => `${API_URL}/photos/${photoId}`;

const CREATE_REACTION_URL = `${API_URL}/photo-reactions/`;
const DELETE_REACTION_URL = (reactionId) =>
  `${API_URL}/photo-reactions/${reactionId}`;

const REACTION_TYPES = {
  like: {
    id: 1,
    icon: "heart",
    color: "#E11D48",
    label: "Me gusta",
    backendName: "Me gusta",
  },
  wow: {
    id: 4,
    icon: "sad",
    color: "#F59E0B",
    label: "Wow",
    backendName: "Wow",
  },
  angry: {
    id: 5,
    icon: "emoticon-angry",
    iconType: "MaterialCommunityIcons",
    color: "#EF4444",
    label: "Me enoja",
    backendName: "Enojado",
  },
};

const BACKEND_NAME_TO_TYPE = Object.entries(REACTION_TYPES).reduce(
  (acc, [key, value]) => {
    acc[value.backendName] = key;
    return acc;
  },
  {}
);

const pickAlbumId = (a, eventId) => {
  const primary =
    a.album_id ?? a.albumId ?? a.id_album ?? a.idAlbum ?? a.alb_id;
  if (primary != null) return String(primary);
  if (a.id != null && String(a.id) !== String(eventId)) return String(a.id);
  return null;
};

const mapAlbumFromApi = (a, eventId) => {
  const id = pickAlbumId(a, eventId);
  return id ? { id, name: a.name ?? a.album_name ?? "", photos: [] } : null;
};

const mapPhotoFromApi = (p) => {
  const uri =
    p.path ||
    p.url ||
    p.photo_url ||
    p.image_url ||
    p.s3_url ||
    p.file_url ||
    p.secure_url ||
    p.uri;

  const isHttp = typeof uri === "string" && /^https?:\/\//i.test(uri);
  if (!isHttp) return null;

  const w = p.w || p.width || 800;
  const h = p.h || p.height || 1200;

  return {
    id: String(p.photo_id ?? p.id ?? `${Date.now()}_${Math.random()}`),
    uri,
    w,
    h,
    title: p.title || p.name || "",
    fav: Boolean(p.is_favorite ?? p.favorite ?? p.fav ?? false),
  };
};

const ReactionButton = ({
  type,
  count,
  userReacted,
  onPress,
  disabled,
  size = "normal",
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const reactionConfig = REACTION_TYPES[type];
  const iconSize = size === "large" ? 24 : 18;

  const handlePress = () => {
    if (disabled) return;

    Animated.parallel([
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.3,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    onPress();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "12deg"],
  });

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.reactionButton,
        size === "large" && styles.reactionButtonLarge,
        userReacted && { backgroundColor: `${reactionConfig.color}15` },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }, { rotate: rotation }],
        }}
      >
        {reactionConfig.iconType === "MaterialCommunityIcons" ? (
          <MaterialCommunityIcons
            name={
              userReacted
                ? reactionConfig.icon
                : `${reactionConfig.icon}-outline`
            }
            size={iconSize}
            color={userReacted ? reactionConfig.color : "#64748B"}
          />
        ) : (
          <Ionicons
            name={
              userReacted
                ? reactionConfig.icon
                : `${reactionConfig.icon}-outline`
            }
            size={iconSize}
            color={userReacted ? reactionConfig.color : "#64748B"}
          />
        )}
      </Animated.View>
      {count > 0 && (
        <Text
          style={[
            styles.reactionCount,
            size === "large" && styles.reactionCountLarge,
            userReacted && { color: reactionConfig.color, fontWeight: "700" },
          ]}
        >
          {count}
        </Text>
      )}
    </Pressable>
  );
};

const ReactionsBar = ({
  photoId,
  reactions,
  userReaction,
  onReactionToggle,
  size = "normal",
  style,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleReactionPress = async (type) => {
    if (isProcessing) return;
    setIsProcessing(true);
    await onReactionToggle(photoId, type);
    setIsProcessing(false);
  };

  return (
    <View
      style={[
        styles.reactionsBar,
        size === "large" && styles.reactionsBarLarge,
        style,
      ]}
    >
      {Object.keys(REACTION_TYPES).map((type) => (
        <ReactionButton
          key={type}
          type={type}
          count={reactions[type] || 0}
          userReacted={userReaction?.type === type}
          onPress={() => handleReactionPress(type)}
          disabled={isProcessing}
          size={size}
        />
      ))}
    </View>
  );
};

const SkeletonPhoto = ({ height }) => {
  return (
    <View style={{ 
      width: "100%", 
      height, 
      borderRadius: 12, 
      overflow: "hidden", 
      backgroundColor: "#E5E7EB", 
      marginBottom: 12
    }}>
      <LinearGradient
        colors={["#E5E7EB", "#F3F4F6", "#E5E7EB"]}
        start={{ x: -1, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          flex: 1,
          transform: [{ translateX: -200 }],
        }}
      />
    </View>
  );
};

export default function AlbumsScreen({ navigation, route }) {
  const { t } = useTranslation("albums_photos");
  const { eventId, albumId: initialAlbumId } = route?.params || {};
  const { user } = useContext(AuthContext);
  const token = user?.token || user?.access_token || user?.accessToken || "";
  const userId = user?.user_id || user?.id;

  const [albums, setAlbums] = useState([]);
  const [activeAlbumId, setActiveAlbumId] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
const [selectedPhotos, setSelectedPhotos] = useState(new Set());
const scaleAnims = useRef({}).current;
const currentIndexRef = useRef(0);
const translateX = useRef(new Animated.Value(0)).current;




  const [pickerBusy, setPickerBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumCover, setNewAlbumCover] = useState(null);
  const [newAlbumBusy, setNewAlbumBusy] = useState(false);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPhoto, setViewerPhoto] = useState(null);
  const [sharingPhotoId, setSharingPhotoId] = useState(null);

  const [downloadingPhotoId, setDownloadingPhotoId] = useState(null);

  const [uploadSuccessCount, setUploadSuccessCount] = useState(0);
  const [showUploadSuccessModal, setShowUploadSuccessModal] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
  const [showDownloadSuccessModal, setShowDownloadSuccessModal] = useState(false);

  const [loadingAlbums, setLoadingAlbums] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [preparing, setPreparing] = useState(false);
  const preparedOnceRef = useRef(new Set());

  const [photoReactions, setPhotoReactions] = useState({});
  const [userReactions, setUserReactions] = useState({});

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  // --- NUEVO: useEffect para auto-cerrar modal de descarga ---
  useEffect(() => {
    let timer;
    if (showDownloadSuccessModal) {
      timer = setTimeout(() => {
        setShowDownloadSuccessModal(false);
      }, 1000); // 1 segundo
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showDownloadSuccessModal]);
  // --- FIN NUEVO ---

  // --- NUEVO: useEffect para auto-cerrar modal de eliminacion ---
  useEffect(() => {
    let timer;
    if (showDeleteSuccessModal) {
      timer = setTimeout(() => {
        setShowDeleteSuccessModal(false);
      }, 1000); // 1 segundo
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showDeleteSuccessModal]);
  // --- FIN NUEVO ---

  // ... (justo despues de los otros useEffect para los modales)

  // --- NUEVO: useEffect para auto-cerrar modal de subida ---
  useEffect(() => {
    let timer;
    if (showUploadSuccessModal) {
      timer = setTimeout(() => {
        setShowUploadSuccessModal(false);
      }, 1000); // 1 segundo
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showUploadSuccessModal]);
  // --- FIN NUEVO ---

  const toRoleNumber = (data) => {
    if (typeof data === "number") return data;
    if (typeof data === "string") {
      const n = parseInt(data, 10);
      return Number.isFinite(n) ? n : null;
    }
    if (data && typeof data === "object") {
      if (data.role_id != null) return parseInt(String(data.role_id), 10);
      if (data.role != null) return parseInt(String(data.role), 10);
    }
    return null;
  };

  const fetchRole = useCallback(
    async (eid) => {
      if (!eid) return null;
      try {
        const res = await fetch(
          `${API_URL}/user/role?event_id=${encodeURIComponent(eid)}`,
          {
            headers: { ...authHeaders },
          }
        );
        const raw = await res.text();
        if (!res.ok) throw new Error(raw || `HTTP ${res.status}`);
        let data;
        try {
          data = JSON.parse(raw);
        } catch {
          data = raw;
        }
        const r = toRoleNumber(data);
        if (r != null) return r;
        throw new Error("role parse error");
      } catch {
        try {
          const res2 = await fetch(`${API_URL}/user/role`, {
            method: "POST",
            headers: {
              ...authHeaders,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ event_id: String(eid) }).toString(),
          });
          const raw2 = await res2.text();
          if (!res2.ok) throw new Error(raw2 || `HTTP ${res2.status}`);
          let data2;
          try {
            data2 = JSON.parse(raw2);
          } catch {
            data2 = raw2;
          }
          return toRoleNumber(data2);
        } catch {
          return null;
        }
      }
    },
    [authHeaders]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!eventId) return;
      setRoleLoading(true);
      const r = await fetchRole(eventId);
      if (mounted) {
        setRole(r);
        setRoleLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [eventId, fetchRole]);

  const isOwner = role === 1;
  const isGuest = role === 2;

  const loadReactions = useCallback(
    async (photosInAlbum) => {
      if (!token || !userId || !photosInAlbum || photosInAlbum.length === 0) {
        setPhotoReactions({});
        setUserReactions({});
        return;
      }

      try {
        const newReactions = {};
        const newUserReactions = {};

        photosInAlbum.forEach((photo) => {
          const photoId = String(photo.id);

          if (photo.reactions_detail && Array.isArray(photo.reactions_detail)) {
            const photoReactionCounts = {};

            photo.reactions_detail.forEach((reaction) => {
              const type = BACKEND_NAME_TO_TYPE[reaction.name_reaction];
              if (type) {
                photoReactionCounts[type] = reaction.count || 0;
              }
            });

            newReactions[photoId] = photoReactionCounts;
          }

          if (photo.user_reaction && photo.user_reaction.reaction_name) {
            const userReactionType =
              BACKEND_NAME_TO_TYPE[photo.user_reaction.reaction_name];
            newUserReactions[photoId] = {
              type: userReactionType,
              photo_reaction_id:
                photo.user_reaction.photo_reaction_id || photo.user_reaction.id,
            };
          } else {
            newUserReactions[photoId] = null;
          }
        });

        setPhotoReactions(newReactions);
        setUserReactions(newUserReactions);
      } catch (error) {
        console.log("Error loading reactions:", error);
      }
    },
    [token, userId]
  );

  const handleReactionToggle = useCallback(
    async (photoId, reactionType) => {
      if (!token || !userId) return;

      const reactionConfig = REACTION_TYPES[reactionType];
      if (!reactionConfig) return;

      const reactionTypeId = reactionConfig.id;
      const currentUserReaction = userReactions[photoId] || null;

      const isRemoving = currentUserReaction?.type === reactionType;
      const isChanging = currentUserReaction && currentUserReaction?.type !== reactionType;
      const isAdding = !currentUserReaction;

      const oldPhotoReactions = photoReactions;
      const oldUserReactions = userReactions;

      const optimisticUserReactions = { ...userReactions };
      const optimisticPhotoReactions = {
        ...photoReactions,
        [photoId]: { ...(photoReactions[photoId] || {}) },
      };

      if (isRemoving) {
        // Quitar reaccion
        optimisticUserReactions[photoId] = null;
        optimisticPhotoReactions[photoId][reactionType] = Math.max(
          0,
          (optimisticPhotoReactions[photoId][reactionType] || 0) - 1
        );
      } else {
        optimisticUserReactions[photoId] = {
          type: reactionType,
          photo_reaction_id: 'temp'
        };
        optimisticPhotoReactions[photoId][reactionType] =
          (optimisticPhotoReactions[photoId][reactionType] || 0) + 1;

        if (isChanging) {
          const oldType = currentUserReaction.type;
          optimisticPhotoReactions[photoId][oldType] = Math.max(
            0,
            (optimisticPhotoReactions[photoId][oldType] || 0) - 1
          );
        }
      }

      setUserReactions(optimisticUserReactions);
      setPhotoReactions(optimisticPhotoReactions);

      try {
        if (isChanging && currentUserReaction.photo_reaction_id) {
          await fetch(DELETE_REACTION_URL(currentUserReaction.photo_reaction_id), {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              ...authHeaders,
            },
          });
        }

        if (isRemoving) {
          if (!currentUserReaction.photo_reaction_id) {
            throw new Error("No photo_reaction_id found");
          }

          const response = await fetch(DELETE_REACTION_URL(currentUserReaction.photo_reaction_id), {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              ...authHeaders,
            },
          });

          if (!response.ok) throw new Error("Failed to delete reaction");
        } else {
          const response = await fetch(CREATE_REACTION_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...authHeaders,
            },
            body: JSON.stringify({
              reaction_type_id: reactionTypeId,
              photo_id: parseInt(photoId)
            }),
          });

          if (!response.ok) throw new Error("Failed to create reaction");

          const data = await response.json();
          const newPhotoReactionId = data.photo_reaction_id || data.id;

          setUserReactions((prev) => ({
            ...prev,
            [photoId]: {
              type: reactionType,
              photo_reaction_id: newPhotoReactionId
            }
          }));
        }
      } catch (error) {
        setUserReactions(oldUserReactions);
        setPhotoReactions(oldPhotoReactions);
        console.log("Error toggling reaction:", error);
      }
    },
    [token, authHeaders, userReactions, photoReactions, userId]
  );

  const normalizeToJpeg = useCallback(async (asset) => {
    const result = await ImageManipulator.manipulateAsync(asset.uri, [], {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    const base =
      asset.fileName ||
      asset.uri?.split("/").pop() ||
      `image_${Date.now()}.jpg`;
    const name = base.toLowerCase().endsWith(".jpg")
      ? base
      : `${base.replace(/\.[^/.]+$/, "")}.jpg`;
    return { uri: result.uri, name, type: "image/jpeg" };
  }, []);

  const photosErrorShownRef = useRef(false);
  const showPhotosAlertOnce = useCallback(() => {
    if (photosErrorShownRef.current) return;
    photosErrorShownRef.current = true;
    Alert.alert(
      t("alerts.error_title"),
      t("alerts.photos_load_failed"),
      [
        {
          text: "OK",
          onPress: () => {
            photosErrorShownRef.current = false;
          },
        },
      ],
      { cancelable: true }
    );
  }, [t]);

  const fetchPhotos = useCallback(
    async (albumId, currentAlbums) => {
      if (!albumId || !token) return;
      setLoadingPhotos(true);
      try {
        const r = await fetch(PHOTOS_BY_ALBUM_URL(albumId), {
          headers: authHeaders,
        });

        if (r.status === 204 || r.status === 404) {
          setAlbums((prev) => {
            const base = currentAlbums?.length ? currentAlbums : prev;
            const idStr = String(albumId);
            const existing = base.find((a) => a.id === idStr);
            const name = existing?.name ?? "";
            if (!existing) {
              return [...base, { id: idStr, name, photos: [] }];
            }
            return base.map((a) =>
              a.id === idStr ? { ...a, name, photos: [] } : a
            );
          });
          return;
        }

        if (!r.ok) throw new Error(`photos_load_failed:${r.status}`);

        const txt = await r.text();
        let rawList = [];
        if (txt && txt.trim()) {
          try {
            const parsed = JSON.parse(txt);
            rawList = Array.isArray(parsed)
              ? parsed
              : Array.isArray(parsed.photos)
              ? parsed.photos
              : Array.isArray(parsed.items)
              ? parsed.items
              : Array.isArray(parsed.results)
              ? parsed.results
              : [];
          } catch {
            rawList = [];
          }
        }

        const mapped = rawList
          .map((p) => {
            const photoMapped = mapPhotoFromApi(p);
            if (photoMapped) {
              photoMapped.reactions_detail = p.reactions_detail;
              photoMapped.user_reaction = p.user_reaction;
            }
            return photoMapped;
          })
          .filter(Boolean);

        setAlbums((prev) => {
          const base = currentAlbums?.length ? currentAlbums : prev;
          if (!base.some((a) => a.id === String(albumId))) {
            return [...base, { id: String(albumId), name: "", photos: mapped }];
          }
          return base.map((a) =>
            a.id === String(albumId) ? { ...a, photos: mapped } : a
          );
        });

        await loadReactions(mapped);
      } catch (e) {
        console.log("photos error:", e?.message);
        showPhotosAlertOnce();
      } finally {
        setLoadingPhotos(false);
      }
    },
    [token, authHeaders, showPhotosAlertOnce, loadReactions]
  );

  const fetchAlbums = useCallback(async () => {
    if (!eventId || !token) return [];
    setLoadingAlbums(true);
    try {
      const r = await fetch(ALBUMS_BY_EVENT_URL(eventId), {
        headers: authHeaders,
      });
      if (!r.ok) throw new Error("albums_load_failed");
      const data = await r.json();
      const tabs = (data || [])
        .map((a) => mapAlbumFromApi(a, eventId))
        .filter(Boolean);
      setAlbums(tabs);

      const toSelect =
        initialAlbumId && tabs.some((a) => a.id === String(initialAlbumId))
          ? String(initialAlbumId)
          : tabs[0]?.id || null;

      setActiveAlbumId(toSelect);
      if (toSelect) {
        await fetchPhotos(toSelect, tabs);
      }
      return tabs;
    } catch (e) {
      Alert.alert(t("alerts.error_title"), t("alerts.albums_load_failed"));
      return [];
    } finally {
      setLoadingAlbums(false);
    }
  }, [eventId, authHeaders, initialAlbumId, fetchPhotos, t, token]);

  useEffect(() => {
    fetchAlbums();
  }, [eventId, token]);

  const activeAlbum = useMemo(
    () => albums.find((a) => a.id === activeAlbumId),
    [albums, activeAlbumId]
  );

  const prepareAlbum = useCallback(
    async (albumId) => {
      if (!albumId) return;
      if (preparedOnceRef.current.has(albumId)) return;

      preparedOnceRef.current.add(albumId);

      try {
        setPreparing(true);

        await Promise.allSettled([
          fetch(`${API_URL}/albums/get_one/${albumId}`, {
            headers: authHeaders,
          }),
          (async () => {
            await fetchPhotos(albumId);
          })(),
        ]);

        // await new Promise((r) => setTimeout(r, 5000));
      } catch (e) {
        console.error("Error durante la preparacion del album:", e);
        preparedOnceRef.current.delete(albumId);
      } finally {
        setPreparing(false);
      }
    },
    [authHeaders, fetchPhotos]
  );

  useEffect(() => {
    if (!activeAlbumId) return;
    if (loadingPhotos) return;

    const a = albums.find((x) => x.id === activeAlbumId);
    const photosLen = a?.photos?.length ?? 0;

    if (photosLen === 0 && !preparedOnceRef.current.has(activeAlbumId)) {
      prepareAlbum(activeAlbumId);
    }
  }, [activeAlbumId, albums, loadingPhotos, prepareAlbum]);

  const columns = useMemo(() => {
    const heights = Array(COLS).fill(0);
    const cols = Array(COLS)
      .fill(0)
      .map(() => []);
    (activeAlbum?.photos ?? []).forEach((p) => {
      const ratio = p.h && p.w ? p.h / p.w : 1.4;
      const calcH = COL_W * ratio;
      const target = heights.indexOf(Math.min(...heights));
      cols[target].push({ ...p, _h: calcH });
      heights[target] += calcH + GUTTER;
    });
    return cols;
  }, [activeAlbum]);

  const uploadOnePhoto = useCallback(
    async (asset, albumId) => {
      try {
        const file = await normalizeToJpeg(asset);

        const uploadOpts = {
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: "file",
          parameters: {},
          headers: { ...authHeaders },
        };

        let res = await FileSystem.uploadAsync(
          UPLOAD_URL(albumId),
          file.uri,
          uploadOpts
        );

        if (res.status < 200 || res.status >= 300) {
          await new Promise((r) => setTimeout(r, 300));
          const retryOpts = { ...uploadOpts };
          res = await FileSystem.uploadAsync(
            UPLOAD_URL(albumId),
            file.uri,
            retryOpts
          );
        }

        if (res.status < 200 || res.status >= 300) {
          const msg = res.body || `HTTP ${res.status}`;
          throw new Error(msg);
        }

        return true;
      } catch (e) {
        console.log(`Error final de subida: ${e?.message || e}`);
        return false;
      }
    },
    [authHeaders, normalizeToJpeg]
  );

  const ensureActiveAlbumReady = useCallback(async () => {
    if (!activeAlbumId) return false;
    if (albums.some((a) => a.id === String(activeAlbumId))) return true;
    const tabs = await fetchAlbums();
    return tabs.some((a) => a.id === String(activeAlbumId));
  }, [activeAlbumId, albums, fetchAlbums]);

  const pickImages = useCallback(async () => {
    if (preparing) {
      Alert.alert(
        t("alerts.wait_title"),
        t("alerts.wait_desc") || "Cargando album... espera un momento."
      );
      return;
    }

    const ready = await ensureActiveAlbumReady();
    if (!ready) {
      Alert.alert(t("alerts.wait_title"), t("alerts.wait_desc"));
      return;
    }

    if (String(activeAlbumId) === String(eventId)) {
      Alert.alert(
        t("alerts.error_title"),
        t("alerts.invalid_album_id") || "El album seleccionado no es valido."
      );
      return;
    }

    try {
      setPickerBusy(true);
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("alerts.perm_title"), t("alerts.perm_photos"));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        quality: 0.9,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (result.canceled) return;

      const assets = result.assets || [];
      if (!assets.length) return;

      let okCount = 0;
      for (const asset of assets) {
        const ok = await uploadOnePhoto(asset, activeAlbumId);
        if (ok) okCount += 1;
      }

      if (okCount > 0) {
        await fetchPhotos(activeAlbumId);

        setUploadSuccessCount(okCount);
        setShowUploadSuccessModal(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPickerBusy(false);
    }
  }, [
    preparing,
    activeAlbumId,
    ensureActiveAlbumReady,
    uploadOnePhoto,
    fetchPhotos,
    t,
  ]);

  const selectNewAlbumCover = useCallback(async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("alerts.perm_title"), t("alerts.perm_cover"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: false,
        quality: 0.9,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (result.canceled) return;
      setNewAlbumCover(result.assets?.[0] || null);
    } catch (e) {
      console.log(e);
      Alert.alert(t("alerts.error_title"), t("alerts.cover_pick_failed"));
    }
  }, [t]);

  const createAlbum = useCallback(async () => {
    const name = (newAlbumName || "").trim();
    if (!name) return;
    if (!eventId) {
      Alert.alert(t("alerts.missing_info_title"), t("alerts.missing_event_id"));
      return;
    }

    setNewAlbumBusy(true);
    try {
      const form = new FormData();
      form.append("name", name);
      form.append("event_id", String(eventId));
      if (newAlbumCover) {
        const file = await normalizeToJpeg(newAlbumCover);
        form.append("cover_url", file);
      }

      const res = await fetch(CREATE_ALBUM_URL, {
        method: "POST",
        headers: { ...authHeaders },
        body: form,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "create_failed");
      }
      const created = await res.json().catch(() => ({}));
      const newId = String(created?.album_id ?? created?.id ?? "");

      const tabs = await fetchAlbums();
      if (newId) {
        setActiveAlbumId(newId);
        await fetchPhotos(newId, tabs);
      }

      setNewAlbumName("");
      setNewAlbumCover(null);
      setShowCreate(false);
    } catch (e) {
      console.error(e);
      Alert.alert(t("alerts.error_title"), t("alerts.create_failed"));
    } finally {
      setNewAlbumBusy(false);
    }
  }, [
    newAlbumName,
    eventId,
    newAlbumCover,
    authHeaders,
    normalizeToJpeg,
    fetchAlbums,
    fetchPhotos,
    t,
  ]);

  const apiToggleFavorite = useCallback(
    async (photoId, nextFav) => {
      let res = await fetch(FAVORITE_URL(photoId), {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ is_favorite: nextFav }),
      });

      if (!res.ok) {
        res = await fetch(`${FAVORITE_URL(photoId)}?is_favorite=${nextFav}`, {
          method: "PATCH",
          headers: { ...authHeaders },
        });
      }
      if (!res.ok) {
        const errTxt = await res.text().catch(() => "");
        throw new Error(errTxt || `Fav error ${res.status}`);
      }
      return res.json().catch(() => ({}));
    },
    [authHeaders]
  );

  const patchPhotoFavInState = useCallback(
    (photoId, value) => {
      setAlbums((prev) =>
        prev.map((a) =>
          a.id !== activeAlbumId
            ? a
            : {
                ...a,
                photos: a.photos.map((p) =>
                  p.id === photoId ? { ...p, fav: value } : p
                ),
              }
        )
      );
      setViewerPhoto((prev) =>
        prev && prev.id === photoId ? { ...prev, fav: value } : prev
      );
    },
    [activeAlbumId]
  );

  const toggleFav = useCallback(
    async (photoId) => {
      const album = albums.find((a) => a.id === activeAlbumId);
      if (!album) return;

      const photo = album.photos.find((p) => p.id === photoId);
      if (!photo) return;

      const nextFav = !photo.fav;
      patchPhotoFavInState(photoId, nextFav);

      try {
        await apiToggleFavorite(photoId, nextFav);
      } catch (e) {
        patchPhotoFavInState(photoId, !nextFav);
        console.error("Fav error:", e?.message);
        Alert.alert(t("alerts.error_title"), t("alerts.fav_failed"));
      }
    },
    [albums, activeAlbumId, patchPhotoFavInState, apiToggleFavorite, t]
  );

  const shareAlbum = useCallback(async () => {
    try {
      const a = activeAlbum;
      if (!a) return;
      await Share.share({
        message: ` Album "${a.name}" con ${
          a.photos?.length || 0
        } fotos. (enlace de ejemplo)`, // Sin acentos
      });
    } catch {}
  }, [activeAlbum]);

  const sharePhoto = useCallback(
    async (photo) => {
      if (sharingPhotoId) return;

      try {
        setSharingPhotoId(photo.id);

        const filename = `temp_${Date.now()}.jpg`;
        const localUri = `${FileSystem.cacheDirectory}${filename}`;

        const downloadResult = await FileSystem.downloadAsync(
          photo.uri,
          localUri
        );

        if (!downloadResult.uri) {
          throw new Error("No se pudo descargar la imagen"); // Sin acentos
        }

        const message = `Foto de album "${activeAlbum?.name || "Mi album"}"`; // Sin acentos

        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: "image/jpeg",
          dialogTitle: message,
          UTI: "public.jpeg",
        });
      } catch (error) {
        console.log("Error sharing photo:", error);
        Alert.alert(
          t("alerts.error_title"),
          t("alerts.share_failed") || "No se pudo compartir la foto" // Sin acentos
        );
      } finally {
        setSharingPhotoId(null);
      }
    },
    [activeAlbum?.name, t, sharingPhotoId]
  );

  const ensureWritePermission = useCallback(async () => {
    let perm = await MediaLibrary.getPermissionsAsync();
    if (!perm.granted) {
      perm = await MediaLibrary.requestPermissionsAsync(false);
    }
    return perm.granted;
  }, []);

  const downloadPhoto = useCallback(
    async (photo) => {
      if (downloadingPhotoId) return; 
      
      setDownloadingPhotoId(photo.id);
      try {
        const ok = await ensureWritePermission();
        if (!ok) {
          Alert.alert(t("alerts.perm_title"), t("alerts.download_perm"));
          return;
        }

        let ext = "jpg";
        try {
          const u = new URL(photo.uri);
          const match = (u.pathname || "").match(/\.(\w+)(?:$|\?)/i);
          if (match?.[1]) {
            ext = match[1].toLowerCase();
            if (ext === "jpeg" || ext === "heic") ext = "jpg";
          }
        } catch {}

        const fileUri = FileSystem.documentDirectory + `${photo.id}.${ext}`;
        const downloadResult = await FileSystem.downloadAsync(
          photo.uri,
          fileUri
        );

        if (!downloadResult.uri) {
          throw new Error("Download failed");
        }

        await MediaLibrary.createAssetAsync(downloadResult.uri);

        setShowDownloadSuccessModal(true);

      } catch (e) {
        console.error("Download error:", e);
        Alert.alert(t("alerts.error_title"), t("alerts.download_failed"));
      } finally {
        setDownloadingPhotoId(null); 
      }
    },
    [ensureWritePermission, t, downloadingPhotoId]
  );

  const executeDelete = useCallback(async () => {
    if (!photoToDelete) return;
    const photo = photoToDelete; 

    setShowDeleteConfirmModal(false); 

    try {
      const response = await fetch(DELETE_PHOTO_URL(photo.id), {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!response.ok) {
        throw new Error("delete_failed");
      }

      setAlbums((prev) =>
        prev.map((album) =>
          album.id === activeAlbumId
            ? {
                ...album,
                photos: album.photos.filter((p) => p.id !== photo.id),
              }
            : album
        )
      );

      setViewerOpen(false);
      setViewerPhoto(null);

      setShowDeleteSuccessModal(true);

    } catch (error) {
      console.log("delete error:", error);
      Alert.alert(
        t("alerts.error_title") || "Error",
        t("alerts.delete_failed") || "No se pudo eliminar la foto" // Sin acentos
      );
    } finally {
      setPhotoToDelete(null); 
    }
  }, [photoToDelete, activeAlbumId, authHeaders, t]);

  const deletePhoto = useCallback(
    async (photo) => {
      setPhotoToDelete(photo);
      setShowDeleteConfirmModal(true);
    },
    [] 
  );

const openViewer = (p) => {
    setViewerPhoto(p);
    setViewerOpen(true);
  };





  const toggleSelect = useCallback((id) => {
  triggerBounce(id);

  setSelectedPhotos((prev) => {
    const newSet = new Set(prev);
    if (newSet.has(id)) {
      newSet.delete(id);
      if (newSet.size === 0) {
        setSelectMode(false);
      }
    } else {
      newSet.add(id);
    }
    return newSet;
  });
}, []);


const triggerBounce = (id) => {
  if (!scaleAnims[id]) {
    scaleAnims[id] = new Animated.Value(1);
  }

  Animated.sequence([
    Animated.spring(scaleAnims[id], {
      toValue: 0.85,
      friction: 4,
      tension: 90,
      useNativeDriver: true,
    }),
    Animated.spring(scaleAnims[id], {
      toValue: 1,
      friction: 5,
      tension: 90,
      useNativeDriver: true,
    })
  ]).start();
};


// Añade estas funciones después de la función toggleSelect

const handleShareMultiple = useCallback(async () => {
  if (selectedPhotos.size === 0) return;
  
  try {
    const selectedPhotoIds = Array.from(selectedPhotos);
    const selectedPhotosData = activeAlbum?.photos?.filter(p => 
      selectedPhotoIds.includes(p.id)
    ) || [];

    if (selectedPhotosData.length === 0) return;

    // Si es solo una foto, compartir normalmente
    if (selectedPhotosData.length === 1) {
      await sharePhoto(selectedPhotosData[0]);
      setSelectMode(false);
      setSelectedPhotos(new Set());
      return;
    }

    // Para múltiples fotos, compartir una por una
    let sharedCount = 0;
    
    for (const photo of selectedPhotosData) {
      try {
        await new Promise(resolve => setTimeout(resolve, 500)); // Pequeña pausa
        await sharePhoto(photo);
        sharedCount++;
      } catch (error) {
        console.error(`Error sharing photo ${photo.id}:`, error);
      }
    }

    Alert.alert(
      "Compartido",
      `Se compartieron ${sharedCount} de ${selectedPhotosData.length} fotos`
    );

    setSelectMode(false);
    setSelectedPhotos(new Set());
    
  } catch (error) {
    console.log("Error sharing multiple photos:", error);
    Alert.alert(
      t("alerts.error_title"),
      "Error al compartir las fotos"
    );
  }
}, [selectedPhotos, activeAlbum, sharePhoto]);

const handleDownloadMultiple = useCallback(async () => {
  if (selectedPhotos.size === 0) return;

  try {
    const ok = await ensureWritePermission();
    if (!ok) {
      Alert.alert(t("alerts.perm_title"), t("alerts.download_perm"));
      return;
    }

    const selectedPhotoIds = Array.from(selectedPhotos);
    const selectedPhotosData = activeAlbum?.photos?.filter(p => 
      selectedPhotoIds.includes(p.id)
    ) || [];

    let successCount = 0;

    for (const photo of selectedPhotosData) {
      try {
        let ext = "jpg";
        try {
          const u = new URL(photo.uri);
          const match = (u.pathname || "").match(/\.(\w+)(?:$|\?)/i);
          if (match?.[1]) {
            ext = match[1].toLowerCase();
            if (ext === "jpeg" || ext === "heic") ext = "jpg";
          }
        } catch {}

        const fileUri = FileSystem.documentDirectory + `${photo.id}.${ext}`;
        const downloadResult = await FileSystem.downloadAsync(
          photo.uri,
          fileUri
        );

        if (downloadResult.uri) {
          await MediaLibrary.createAssetAsync(downloadResult.uri);
          successCount++;
        }
      } catch (e) {
        console.error(`Error downloading photo ${photo.id}:`, e);
      }
    }

    if (successCount > 0) {
      Alert.alert(
        t("alerts.success_title") || "Éxito",
        `Se descargaron ${successCount} de ${selectedPhotosData.length} fotos`
      );
    }

    // Salir del modo selección
    setSelectMode(false);
    setSelectedPhotos(new Set());

  } catch (error) {
    console.error("Error in multiple download:", error);
    Alert.alert(
      t("alerts.error_title"),
      t("alerts.download_failed") || "Error al descargar las fotos"
    );
  }
}, [selectedPhotos, activeAlbum, ensureWritePermission, t]);

const handleDeleteMultiple = useCallback(async () => {
  if (selectedPhotos.size === 0) return;

  Alert.alert(
    t("alerts.confirm_delete_title") || "Confirmar eliminación",
    `¿Estás seguro de que quieres eliminar ${selectedPhotos.size} fotos?`,
    [
      {
        text: t("actions.cancel") || "Cancelar",
        style: "cancel"
      },
      {
        text: t("actions.delete") || "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            const selectedPhotoIds = Array.from(selectedPhotos);
            let successCount = 0;

            for (const photoId of selectedPhotoIds) {
              try {
                const response = await fetch(DELETE_PHOTO_URL(photoId), {
                  method: "DELETE",
                  headers: authHeaders,
                });

                if (response.ok) {
                  successCount++;
                }
              } catch (error) {
                console.error(`Error deleting photo ${photoId}:`, error);
              }
            }

            // Actualizar el estado local
            setAlbums(prev =>
              prev.map(album =>
                album.id === activeAlbumId
                  ? {
                      ...album,
                      photos: album.photos.filter(p => !selectedPhotos.has(p.id)),
                    }
                  : album
              )
            );

            if (successCount > 0) {
              Alert.alert(
                t("alerts.success_title") || "Éxito",
                `Se eliminaron ${successCount} de ${selectedPhotoIds.length} fotos`
              );
            }

            // Salir del modo selección
            setSelectMode(false);
            setSelectedPhotos(new Set());

          } catch (error) {
            console.error("Error in multiple delete:", error);
            Alert.alert(
              t("alerts.error_title"),
              t("alerts.delete_failed") || "Error al eliminar las fotos"
            );
          }
        }
      }
    ]
  );
}, [selectedPhotos, activeAlbumId, authHeaders, t]);





  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()}>
          <Ionicons name="arrow-back" size={24} color="#6F4C8C" />
        </TouchableOpacity>
        <Text style={styles.title}>{t("brand")}</Text>
      </View>

      <Text style={styles.titleSection}>{t("section.photos")}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        contentInsetAdjustmentBehavior="never"
        style={{ flexGrow: 0 }}
      >
        {loadingAlbums ? (
          <View
            style={{
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 12,
            }}
          >
            <ActivityIndicator />
          </View>
        ) : (
          albums.map((a) => {
            const active = a.id === activeAlbumId;
            return (
              <TouchableOpacity
                key={a.id}
                onPress={async () => {
                  setActiveAlbumId(a.id);
                  await fetchPhotos(a.id);
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {a.name}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity
          style={[
            styles.chipOutline,
            (newAlbumBusy || loadingAlbums) && { opacity: 0.6 },
          ]}
          onPress={() => !newAlbumBusy && setShowCreate(true)}
          disabled={newAlbumBusy || loadingAlbums}
        >
          <Ionicons name="add" size={18} color="#6F4C8C" />
          <Text style={styles.chipOutlineText}>{t("tabs.new_album")}</Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 0 }}
      >
        {loadingPhotos && (
  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
    {[0, 1].map(col => (
      <View key={col} style={{ width: COL_W }}>
        {[0,0,0,0].map((_, index) => (
          <SkeletonPhoto key={index} height={COL_W * (1.2 + Math.random())} />
        ))}
      </View>
    ))}
  </View>
)}


        {!loadingPhotos && !loadingAlbums && !preparing && (activeAlbum?.photos?.length ?? 0) === 0 && (
         <View style={{ paddingVertical: 24, alignItems: "center" }}>
           <Text style={{ color: "#6B7280", fontWeight: "600" }}>
             {t("empty.no_photos_yet")}
           </Text>
           <Text style={{ color: "#9CA3AF", marginTop: 4 }}>
             {t("empty.tap_add")}
           </Text>
         </View>
        )}

        <View style={styles.masonryRow}>
          {columns.map((col, i) => (
            <View key={`col-${i}`} style={{ width: COL_W }}>
              {col.map((p) => {
                const reactions = photoReactions[p.id] || {};
                const userReaction = userReactions[p.id] || null;

                return (
                  <View key={p.id} style={{ marginBottom: GUTTER }}>
                  <Animated.View
  style={{
    transform: [{ scale: scaleAnims[p.id] || 1 }],
    marginBottom: GUTTER,
  }}
>
  <TouchableOpacity
    activeOpacity={0.9}
    onPress={() => {
      if (selectMode) {
        toggleSelect(p.id);
      } else {
        openViewer(p);
      }
    }}
    onLongPress={() => {
      setSelectMode(true);
      toggleSelect(p.id);
    }}
    style={[styles.card]}
  >
    {/* Imagen */}
    <Image
      source={{ uri: p.uri }}
      style={{
        width: "100%",
        height: p._h,
        borderRadius: 12,
      }}
    />

    {/* CHECKBOX FLOTANTE */}
    {selectMode && (
      <View style={styles.checkboxWrapper}>
        <View
          style={[
            styles.checkboxCircle,
            selectedPhotos.has(p.id) && styles.checkboxCircleSelected
          ]}
        >
          {selectedPhotos.has(p.id) && (
            <Ionicons name="checkmark" size={16} color="white" />
          )}
        </View>
      </View>
    )}
  </TouchableOpacity>
</Animated.View>

                    {p.title ? (
                      <Text style={styles.caption} numberOfLines={1}>
                        {p.title}
                      </Text>
                    ) : null}

                    <ReactionsBar
                      photoId={p.id}
                      reactions={reactions}
                      userReaction={userReaction}
                      onReactionToggle={handleReactionToggle}
                      style={styles.reactionsBarInGrid}
                    />

                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.action}
                        onPress={() => sharePhoto(p)}
                        disabled={sharingPhotoId !== null}
                      >
                        {sharingPhotoId === p.id ? (
                          <ActivityIndicator size="small" color="#6F4C8C" />
                        ) : (
                          <Ionicons
                            name="share-social-outline"
                            size={16}
                            color="#6F4C8C"
                          />
                        )}
                      </TouchableOpacity>
                      {!isGuest && (
                        <TouchableOpacity
                          style={styles.action}
                          onPress={() => downloadPhoto(p)}
                          disabled={downloadingPhotoId !== null}
                        >
                          {downloadingPhotoId === p.id ? (
                            <ActivityIndicator size="small" color="#6F4C8C" />
                          ) : (
                            <Ionicons
                              name="download-outline"
                              size={16}
                              color="#6F4C8C"
                            />
                          )}
                        </TouchableOpacity>
                      )}

                      {!isGuest && (
                        <TouchableOpacity
                          onPress={() => deletePhoto(p)}
                          style={styles.action}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color="#6F4C8C"
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {(isOwner || isGuest) && (
          <TouchableOpacity
            style={[styles.addButton, preparing && { opacity: 0.6 }]}
            onPress={pickImages}
            disabled={pickerBusy || preparing}
          >
            {pickerBusy ? (
              <ActivityIndicator />
            ) : (
              <>
                <Ionicons name="add-circle" size={22} color="#fff" />
                <Text style={styles.addText}>{t("actions.add_photos")}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal Crear Album (Existente) */}
      <Modal
        visible={showCreate}
        animationType="fade"
        transparent
        onRequestClose={() => setShowCreate(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("modal.create_title")}</Text>

            <TextInput
              value={newAlbumName}
              onChangeText={setNewAlbumName}
              placeholder={t("modal.album_name_ph")}
              style={styles.input}
              editable={!newAlbumBusy}
            />

            <TouchableOpacity
              style={styles.coverPicker}
              onPress={selectNewAlbumCover}
              disabled={newAlbumBusy}
            >
              <Ionicons name="image-outline" size={18} color="#6F4C8C" />
              <Text style={styles.coverPickerText}>
                {newAlbumCover
                  ? t("actions.change_cover")
                  : t("actions.pick_cover")}
              </Text>
            </TouchableOpacity>

            {newAlbumCover && (
              <View style={styles.coverPreviewRow}>
                <Image
                  source={{ uri: newAlbumCover.uri }}
                  style={styles.coverPreview}
                />
                <TouchableOpacity
                  onPress={() => setNewAlbumCover(null)}
                  disabled={newAlbumBusy}
                  style={styles.removeCoverBtn}
                >
                  <Ionicons name="trash-outline" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "#E5E7EB" }]}
                onPress={() => !newAlbumBusy && setShowCreate(false)}
                disabled={newAlbumBusy}
              >
                <Text style={[styles.btnText, { color: "#111827" }]}>
                  {t("actions.cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btn,
                  {
                    backgroundColor: "#6F4C8C",
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 8,
                  },
                ]}
                onPress={createAlbum}
                disabled={!newAlbumName.trim() || newAlbumBusy}
              >
                {newAlbumBusy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                )}
                <Text style={styles.btnText}>
                  {newAlbumBusy ? t("actions.creating") : t("actions.create")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Visor de Foto (Existente) */}
      <Modal
  visible={viewerOpen}
  transparent
  animationType="fade"
>
  <View style={styles.viewerBg}>
    
    <BlurView
      intensity={80}
      tint="dark"
      style={StyleSheet.absoluteFill}
    />

    <TouchableOpacity
      style={styles.viewerClose}
      onPress={() => setViewerOpen(false)}
    >
      <Ionicons name="close" size={26} color="#fff" />
    </TouchableOpacity>



          {viewerPhoto && (
            <>
              <Image
                source={{ uri: viewerPhoto.uri }}
                style={styles.viewerImage}
                resizeMode="contain"
              />

              <ReactionsBar
                photoId={viewerPhoto.id}
                reactions={photoReactions[viewerPhoto.id] || {}}
                userReaction={userReactions[viewerPhoto.id] || null}
                onReactionToggle={handleReactionToggle}
                size="large"
                style={styles.reactionsBarFullscreen}
              />

              <View style={styles.viewerActions}>
                <TouchableOpacity
                  onPress={() => sharePhoto(viewerPhoto)}
                  style={styles.viewerActionBtn}
                  disabled={sharingPhotoId !== null}
                >
                  {sharingPhotoId === viewerPhoto?.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons
                      name="share-social-outline"
                      size={22}
                      color="#fff"
                    />
                  )}
                  <Text style={styles.viewerActionTxt}>
                    {sharingPhotoId === viewerPhoto?.id
                      ? t("actions.sharing") || "Compartiendo..."
                      : t("actions.share")}
                  </Text>
                </TouchableOpacity>
                {!isGuest && (
                  <TouchableOpacity
                    onPress={() => downloadPhoto(viewerPhoto)}
                    style={styles.viewerActionBtn}
                    disabled={downloadingPhotoId !== null}
                  >
                    {downloadingPhotoId === viewerPhoto?.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="download-outline" size={22} color="#fff" />
                    )}
                    <Text style={styles.viewerActionTxt}>
                      {downloadingPhotoId === viewerPhoto?.id
                        ? t("actions.downloading") || "Descargando..."
                        : t("actions.download")}
                    </Text>
                  </TouchableOpacity>
                )}

                {!isGuest && (
                  <TouchableOpacity
                    onPress={() => deletePhoto(viewerPhoto)}
                    style={styles.viewerActionBtn}
                  >
                    <Ionicons name="trash-outline" size={22} color="#fff" />
                    <Text style={styles.viewerActionTxt}>
                      {t("actions.delete")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Overlay "Preparando" (Existente) */}
      {/* {preparing && (
        <View style={styles.preparingOverlay}>
          <View style={styles.preparingCard}>
            <ActivityIndicator size="large" color="#6F4C8C" />
            <Text style={styles.preparingTitle}>
              {t("preparing.title") || "Cargando album..."}
            </Text>
            <Text style={styles.preparingDesc}>
              {t("preparing.desc") ||
                "Estamos preparando este album para subir tus fotos."}
            </Text>
          </View>
        </View>
      )} */}

      {/* --- INICIO MODALES MODIFICADOS --- */}

      {/* Modal de Subida Exitosa (Sin boton OK) */}
      {/* Modal de Subida Exitosa (MODIFICADO: Sin boton, se auto-cierra) */}
      <Modal
        visible={showUploadSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUploadSuccessModal(false)}
      >
        <View style={styles.modalGeneralBackdrop}>
          <View style={styles.modalGeneralCard}>
            <Ionicons
              name="checkmark-circle-outline"
              size={50}
              color="#10B981"
              style={styles.modalGeneralIcon}
            />
            <Text style={styles.modalGeneralTitle}>{t("alerts.upload_done_title")}</Text>
            <Text style={[styles.modalGeneralText, { marginBottom: 0 }]}>
              {uploadSuccessCount === 1
                ? t("alerts.upload_some_one")
                : t("alerts.upload_some_other", { count: uploadSuccessCount })}
            </Text>
            {/* Boton eliminado */}
          </View>
        </View>
      </Modal>

      {/* Modal de Descarga Exitosa (MODIFICADO: Sin boton, se auto-cierra) */}
      <Modal
        visible={showDownloadSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDownloadSuccessModal(false)}
      >
        <View style={styles.modalGeneralBackdrop}>
          <View style={styles.modalGeneralCard}>
            <Ionicons
              name="checkmark-circle-outline"
              size={50}
              color="#10B981"
              style={styles.modalGeneralIcon}
            />
            <Text style={styles.modalGeneralTitle}>{t("alerts.download_ok_title")}</Text>
            <Text style={[styles.modalGeneralText, { marginBottom: 0 }]}> 
              {t("alerts.download_ok_desc")}
            </Text>
            {/* Boton eliminado */}
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmar Eliminacion (Sin cambios) */}
      <Modal
        visible={showDeleteConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirmModal(false)}
      >
        <View style={styles.modalGeneralBackdrop}>
          <View style={styles.modalGeneralCard}>
            <Ionicons
              name="alert-circle-outline"
              size={50}
              color="#F59E0B"
              style={styles.modalGeneralIcon}
            />
            <Text style={styles.modalGeneralTitle}>{t("alerts.confirm_delete_title")}</Text>
            <Text style={styles.modalGeneralText}>{t("alerts.confirm_delete_message")}</Text>
            <View style={styles.modalGeneralActions}>
              <TouchableOpacity
                style={[styles.modalGeneralButton, styles.modalGeneralButtonOutline]}
                onPress={() => setShowDeleteConfirmModal(false)}
              >
                <Text style={styles.modalGeneralButtonTextOutline}>{t("actions.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalGeneralButton, styles.modalGeneralButtonDestructive]}
                onPress={executeDelete}
              >
                <Text style={styles.modalGeneralButtonTextSolid}>{t("actions.delete")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Modal de Eliminacion Exitosa (MODIFICADO: Sin boton, se auto-cierra) */}
      <Modal
        visible={showDeleteSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteSuccessModal(false)}
      >
        <View style={styles.modalGeneralBackdrop}>
          <View style={styles.modalGeneralCard}>
            <Ionicons
              name="checkmark-circle-outline"
              size={50}
              color="#10B981"
              style={styles.modalGeneralIcon}
            />
            <Text style={styles.modalGeneralTitle}>{t("alerts.success_title")}</Text>
            <Text style={[styles.modalGeneralText, { marginBottom: 0 }]}> 
              {t("alerts.photo_deleted")}
            </Text>
            {/* Boton eliminado */}
          </View>
        </View>
      </Modal>

      {/* --- FIN MODALES MODIFICADOS --- */}
                {selectMode && (
  <View style={styles.multiBar}>
    <Text style={styles.multiCount}>
      {selectedPhotos.size} seleccionadas
    </Text>

    {/* <TouchableOpacity
      style={styles.multiBtn}
      onPress={handleShareMultiple}
    >
      <Ionicons name="share-social-outline" size={22} color="#fff" />
    </TouchableOpacity> */}

    <TouchableOpacity
      style={styles.multiBtn}
      onPress={handleDownloadMultiple}
    >
      <Ionicons name="download-outline" size={22} color="#fff" />
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.multiBtn}
      onPress={handleDeleteMultiple}
    >
      <Ionicons name="trash-outline" size={22} color="#fff" />
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.multiBtn, { backgroundColor: "#EF4444" }]}
      onPress={() => {
        setSelectMode(false);
        setSelectedPhotos(new Set());
      }}
    >
      <Ionicons name="close" size={22} color="#fff" />
    </TouchableOpacity>
  </View>
)}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5EEF7", marginTop: 20 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#6F4C8C",
    marginRight: 148,
  },

  tabs: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
    paddingTop: 0,
    height: 55,
    flexGrow: 0,
    marginBottom: 15,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#EADAF3",
  },
  chipActive: { backgroundColor: "#C7A7E0" },
  chipText: { color: "#6F4C8C", fontWeight: "600" },
  chipTextActive: { color: "#3E2757" },
  chipOutline: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#C7A7E0",
    marginLeft: 4,
    gap: 4,
    backgroundColor: "#FFF",
  },
  chipOutlineText: { color: "#6F4C8C", fontWeight: "600" },
  titleSection: {
    fontSize: 25,
    fontWeight: "700",
    color: "black",
    marginLeft: 16,
    marginTop: 10,
    marginBottom: 8,
  },

  masonryRow: { flexDirection: "row", justifyContent: "space-between" },
  card: { borderRadius: 12, overflow: "hidden", backgroundColor: "#ddd" },
  caption: { marginTop: 6, marginLeft: 4, color: "#4B5563", fontWeight: "600" },

  reactionsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 6,
  },
  reactionsBarInGrid: {
    marginTop: 4,
    marginBottom: 2,
  },
  reactionsBarFullscreen: {
  position: "absolute",
  bottom: 120,
  alignSelf: "center",
  backgroundColor: "rgba(0,0,0,0.7)",
  borderRadius: 25,
  paddingVertical: 10,
  paddingHorizontal: 14,
  justifyContent: "center",
  width: "60%", // ← Ancho fijo
},
  reactionsBarLarge: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  reactionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    gap: 4,
    minWidth: 44,
    justifyContent: "center",
  },
  reactionButtonLarge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 56,
    gap: 6,
  },
  reactionCount: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  reactionCountLarge: {
    fontSize: 14,
    fontWeight: "700",
  },

  actionsRow: { flexDirection: "row", gap: 14, paddingLeft: 4, marginTop: 6 },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 20, // Para que el ActivityIndicator no haga saltar el layout
    justifyContent: "center",
  },

  addButton: {
    marginTop: 16,
    marginBottom: 32,
    marginHorizontal: 6,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#C7A7E0",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  addText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#3E2757" },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  coverPicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F8F5FB",
    borderWidth: 1,
    borderColor: "#E5D9F2",
  },
  coverPickerText: { color: "#6F4C8C", fontWeight: "600" },

  coverPreviewRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  coverPreview: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: "#EEE",
  },
  removeCoverBtn: {
    backgroundColor: "#EF4444",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },

  viewerBg: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerClose: { position: "absolute", top: 40, right: 20, padding: 8 },
  viewerImage: { width: SCREEN_W, height: "70%" },
  viewerActions: {
    position: "absolute",
    bottom: 40,
    flexDirection: "row",
    gap: 24,
  },
  viewerActionBtn: { alignItems: "center", minWidth: 60 }, // minWidth para los loaders
  viewerActionTxt: { color: "#fff", marginTop: 6, fontWeight: "600" },

  btn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },

  preparingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  preparingCard: {
    width: "78%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },
  preparingTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "700",
    color: "#3E2757",
  },
  preparingDesc: {
    marginTop: 6,
    fontSize: 13,
    color: "#4B5563",
    textAlign: "center",
  },
  
  // --- INICIO NUEVOS ESTILOS PARA MODALES ---
  modalGeneralBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalGeneralCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "white",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalGeneralIcon: {
    marginBottom: 10,
  },
  modalGeneralTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  modalGeneralText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 20,
    textAlign: "center",
  },
  modalGeneralActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 10,
  },
  modalGeneralButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalGeneralButtonSolid: {
    backgroundColor: "#6F4C8C"
  },
  modalGeneralButtonTextSolid: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  modalGeneralButtonOutline: {
    borderWidth: 1,
    borderColor: "#D1D5DB", // Gris claro
  },
  modalGeneralButtonTextOutline: {
    color: "#374151", // Texto oscuro
    fontWeight: "600",
  },
  modalGeneralButtonDestructive: {
    backgroundColor: "#DC2626", // Rojo para eliminar
  },
 cardSelected: {
  borderWidth: 3,
  borderColor: "#6F4C8C",
  opacity: 0.8,
  transform: [{ scale: 0.95 }],
},
multiBar: {
  position: "absolute",
  bottom: 47,
  left: 0,
  right: 0,
  backgroundColor: "#C7A7E0",
  paddingHorizontal: 16,
  paddingVertical: 12,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
},
multiBtn: {
  padding: 10,
  backgroundColor: "#3E2757",
  borderRadius: 10,
},
multiCount: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 16,
},

checkboxWrapper: {
  position: "absolute",
  top: 8,
  right: 8,
  zIndex: 20,
  backgroundColor: "rgba(0,0,0,0.15)",
  borderRadius: 20,
  padding: 2,
},

checkboxCircle: {
  width: 22,
  height: 22,
  borderRadius: 50,
  borderWidth: 2,
  borderColor: "#fff",
  backgroundColor: "rgba(255,255,255,0.3)",
  alignItems: "center",
  justifyContent: "center",
},

checkboxCircleSelected: {
  backgroundColor: "#6F4C8C",
  borderColor: "#6F4C8C",
},


  // --- FIN NUEVOS ESTILOS ---
});