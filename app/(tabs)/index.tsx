// app/(tabs)/index.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  Dimensions,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  Screen,
  Segmented,
  SectionTitle,
  ShirtCard,
  PlusPrimary,
  PlusSmall,
} from "../../components/ui";
import { useRouter } from "expo-router";
import { useSelectionStore } from "../../store/selectionStore";
import * as ImagePicker from "expo-image-picker";
import { toBase64Compressed } from "../../services/image";
import {
  addUserShirt,
  listUserShirts,
  type UserShirt,
} from "../../services/garments";
import { useAuthState } from "../../hooks/useAuth";

const WIDTH = Dimensions.get("window").width;
const CARD_W = WIDTH - 32;

const mockCatalog = [
  {
    id: "1",
    title: "Classic Casual Shirt",
    subtitle: "Urban Style",
    img: "https://images.unsplash.com/photo-1596755094514-f87e8e8b4a49?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "2",
    title: "Formal White Shirt",
    subtitle: "Executive",
    img: "https://images.unsplash.com/photo-1520975802020-04f4dd6b8333?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "3",
    title: "Patterned Shirt",
    subtitle: "Street",
    img: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1200&auto=format&fit=crop",
  },
];

export default function HomeScreen() {
  const [tab, setTab] = useState<"catalog" | "mine">("catalog");
  const { setGarment } = useSelectionStore();
  const router = useRouter();
  const { user } = useAuthState();
  const [mine, setMine] = useState<UserShirt[]>([]);
  const [loadingAdd, setLoadingAdd] = useState(false);

  // ========== Catalog actions ==========
  const onTry = (item: any) => {
    setGarment({ id: item.id, name: item.title, imageUrl: item.img });
    router.push("/(tabs)/try-on");
  };

  // ========== My Shirts actions ==========
  const loadMine = async () => {
    if (!user) return;
    const items = await listUserShirts(user.uid, 50);
    setMine(items);
  };

  useEffect(() => {
    loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const addShirt = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      return Alert.alert("Permission needed", "Please allow photo access.");
    }

    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (r.canceled || !r.assets?.[0]?.uri) return;
    if (!user) return Alert.alert("Please login first");

    try {
      setLoadingAdd(true);
      const b64 = await toBase64Compressed(r.assets[0].uri, 1080);
      await addUserShirt(user.uid, b64); // เพิ่มเข้า My Shirts (Cloudinary + Firestore)
      await loadMine(); // รีโหลดรายการให้เห็นทันที
      Alert.alert("Added!", "Your shirt was added to My Shirts.");
    } catch (e: any) {
      Alert.alert("Add failed", e?.message ?? "Unknown error");
    } finally {
      setLoadingAdd(false);
    }
  };

  const goTryOnWith = (it: UserShirt) => {
    setGarment({ imageUrl: it.imageUrl });
    router.push("/(tabs)/try-on");
  };

  // ========== UI ==========
  const renderCatalog = () => (
    <>
      <SectionTitle>Explore Collection</SectionTitle>
      <FlatList
        data={mockCatalog}
        keyExtractor={(it) => it.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        renderItem={({ item }) => (
          <View style={{ width: CARD_W }}>
            <ShirtCard
              img={item.img}
              title={item.title}
              subtitle={item.subtitle}
              onPress={() => onTry(item)}
            />
          </View>
        )}
      />
    </>
  );

  const renderMine = () => (
    <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Your Collection</Text>
        <PlusSmall
          title={loadingAdd ? "Adding..." : "Add Shirt"}
          onPress={addShirt}
          style={{ opacity: loadingAdd ? 0.6 : 1 }}
        />
      </View>

      {mine.length === 0 ? (
        <View style={{ alignItems: "center", marginTop: 24 }}>
          <Text style={{ color: "#6B7280", marginBottom: 12 }}>
            You haven't added any shirts yet.
          </Text>
          <PlusPrimary
            title={loadingAdd ? "Adding..." : "Add Your First Shirt"}
            onPress={addShirt}
            style={{ opacity: loadingAdd ? 0.6 : 1 }}
          />
        </View>
      ) : (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            paddingBottom: 16,
          }}
        >
          {mine.map((it) => (
            <TouchableOpacity
              key={it.id}
              onPress={() => goTryOnWith(it)}
              style={{
                width: "48%",
                backgroundColor: "#fff",
                borderRadius: 12,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              <Image
                source={{ uri: it.imageUrl }}
                style={{ width: "100%", height: 140 }}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Text style={{ color: "#6B7280" }}>Welcome back,</Text>
        <Text style={{ fontWeight: "800", fontSize: 18 }}>Alex!</Text>
      </View>

      <Segmented
        value={tab}
        onChange={setTab}
        counts={{ catalog: mockCatalog.length, mine: mine.length }}
      />

      {tab === "catalog" ? renderCatalog() : renderMine()}
    </Screen>
  );
}
