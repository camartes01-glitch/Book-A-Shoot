import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Headset,
  HelpCircle,
  LogOut,
  Mail,
  MessageCircle,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Send,
  ShieldCheck,
  X,
} from "lucide-react-native";
import { ScreenContainer } from "@/src/components/ScreenContainer";
import { useAppStore } from "@/src/state/AppProvider";
import { colors, spacing } from "@/src/constants/theme";
import { submitUserFeedback } from "@/src/services/feedbackApi";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_LIST: FAQItem[] = [
  {
    id: "faq_1",
    question: "How does booking a shoot work on Camartes?",
    answer:
      "Select your celebration category (Wedding, Baby Shoot, Pooja, Birthday, etc.), choose your event dates and coverage services (Photography, Videography, Drone, Albums), and submit your request. Camartes dispatches your request to up to 6 verified top photography firms meeting your criteria.",
  },
  {
    id: "faq_2",
    question: "When can I chat with the photography firms?",
    answer:
      "Direct chat is unlocked as soon as a photography firm reviews and accepts your shoot request. You will see an 'Accepted' badge on the firm, allowing you to discuss timelines, preferences, and deliverables directly in Messages.",
  },
  {
    id: "faq_3",
    question: "How do I confirm and lock in my photographer?",
    answer:
      "Once a candidate firm accepts, you can review their quote and portfolio. Tap 'Confirm Photographer' on their card, then complete the payment via Razorpay. Once verified, your booking switches to Upcoming and the photographer is reserved exclusively for your date.",
  },
  {
    id: "faq_4",
    question: "Can I customize services and add-ons for multi-day events?",
    answer:
      "Yes! You can tailor each event day individually (e.g. Haldi with Candid Photography, Wedding with Drone & Cinematic Video, Reception with Traditional Photo). Add-ons such as teaser reels and luxury photo albums can be chosen per day.",
  },
  {
    id: "faq_5",
    question: "How are payments handled on Camartes?",
    answer:
      "All transactions are securely processed through Razorpay with end-to-end encryption. You can pay using UPI (GPay, PhonePe, Paytm), credit/debit cards, or net banking. Receipts and payment statuses update immediately in your booking summary.",
  },
  {
    id: "faq_6",
    question: "What is the cancellation or modification policy?",
    answer:
      "You can modify or cancel draft and pending requests anytime from the booking details screen at no charge. For confirmed bookings with assigned teams, cancellations follow the standard Camartes booking terms.",
  },
  {
    id: "faq_7",
    question: "When and how will I receive my photos and videos?",
    answer:
      "Your expected delivery date is listed directly on your booking details summary card. Once post-processing is complete, your photographer uploads the edited high-resolution galleries and videos directly to Camartes for you to download and share.",
  },
];

export default function ProfileScreen() {
  const { profile, updateProfile, logout } = useAppStore();
  const [name, setName] = useState(profile?.name ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [phoneInput, setPhoneInput] = useState(profile?.mobile ?? "");
  const [editingPhone, setEditingPhone] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);

  // Collapsible sections - by default collapsed for clean uncluttered UI
  const [showContactCare, setShowContactCare] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showFaqs, setShowFaqs] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // Send us feedback state
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackType, setFeedbackType] = useState<"Suggestion" | "App Experience" | "Photographer Review" | "Other">("Suggestion");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  const onSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const initials = name
        .trim()
        .split(" ")
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || "C";
      await updateProfile({ name: name.trim(), avatarInitials: initials });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setName(profile?.name ?? "");
    setEditing(false);
  };

  const onSavePhone = async () => {
    const digits = phoneInput.replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) {
      Alert.alert("Invalid Phone Number", "Please enter a valid 10-digit mobile number.");
      return;
    }
    setSavingPhone(true);
    try {
      await updateProfile({ mobile: digits });
      setEditingPhone(false);
    } catch {
      Alert.alert("Update Failed", "Could not save phone number. Please try again.");
    } finally {
      setSavingPhone(false);
    }
  };

  const performLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const onLogout = () => {
    if (Platform.OS === "web") {
      const confirmed = typeof window !== "undefined" && window.confirm("Log out? You can sign back in anytime.");
      if (confirmed) void performLogout();
      return;
    }
    Alert.alert("Log out?", "You can sign back in anytime.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          void performLogout();
        },
      },
    ]);
  };

  const handleCall = (phoneNumber: string) => {
    const url = `tel:${phoneNumber.replace(/\s+/g, "")}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) Linking.openURL(url);
    }).catch(() => undefined);
  };

  const handleEmail = (email: string) => {
    const url = `mailto:${email}?subject=${encodeURIComponent("Customer Inquiry - Book A Shoot")}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) Linking.openURL(url);
    }).catch(() => undefined);
  };

  const handleWhatsApp = (phoneNumber: string) => {
    const digits = phoneNumber.replace(/\D/g, "");
    const cleanNumber = digits.length === 12 && digits.startsWith("91") ? digits : `91${digits.slice(-10)}`;
    const text = encodeURIComponent("Hi Camartes Support, I need assistance with my shoot booking.");
    const url = `https://wa.me/${cleanNumber}?text=${text}`;
    Linking.openURL(url).catch(() => undefined);
  };

  const toggleFaq = (id: string) => {
    setExpandedFaq((prev) => (prev === id ? null : id));
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      setFeedbackError("Please write your feedback before sending.");
      return;
    }
    setSendingFeedback(true);
    setFeedbackError("");
    try {
      await submitUserFeedback({
        name: profile?.name || "Customer",
        email: profile?.email || "anonymous@bookashoot.online",
        phone: profile?.mobile,
        category: feedbackType,
        message: feedbackText.trim(),
      });
      setFeedbackSent(true);
    } catch (err: any) {
      setFeedbackError(err?.message || "Could not send feedback. Please try again.");
    } finally {
      setSendingFeedback(false);
    }
  };

  return (
    <ScreenContainer contentStyle={styles.container}>
      {/* Instagram-Style Clean Profile Header Card (No metrics) */}
      <View style={styles.profileCard}>
        <View style={styles.avatarRow}>
          {/* Circular Avatar with Ring */}
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile?.avatarInitials || "U"}</Text>
            </View>
          </View>

          {/* User Details & Edit Icon */}
          <View style={{ flex: 1, gap: 4 }}>
            {editing ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.editInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.muted}
                  autoFocus
                />
                <Pressable
                  style={styles.editSaveBtn}
                  onPress={onSave}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityLabel="Save name"
                >
                  <Check size={16} color={colors.white} />
                </Pressable>
                <Pressable
                  style={styles.editCancelBtn}
                  onPress={handleCancelEdit}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel edit"
                >
                  <X size={16} color={colors.muted} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.nameHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName} numberOfLines={1}>
                    {profile?.name || "Camartes Customer"}
                  </Text>
                  <View style={styles.verifiedRow}>
                    <ShieldCheck size={14} color={colors.primaryDark} />
                    <Text style={styles.verifiedText}>Verified Customer</Text>
                  </View>
                </View>

                {/* Only Edit Icon (No text button) */}
                <Pressable
                  style={({ pressed }) => [styles.editIconBtn, pressed && styles.editIconBtnPressed]}
                  onPress={() => setEditing(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Edit profile name"
                  hitSlop={8}
                >
                  <Pencil size={15} color={colors.primaryDark} />
                </Pressable>
              </View>
            )}

            {/* Contact details */}
            <View style={styles.contactDetailsRow}>
              {editingPhone ? (
                <View style={styles.phoneEditRow}>
                  <View style={styles.phonePrefixBox}>
                    <Text style={styles.phonePrefixText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInputStyle}
                    value={phoneInput}
                    onChangeText={(val) => setPhoneInput(val.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit mobile"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    maxLength={10}
                    autoFocus
                  />
                  <Pressable
                    style={[
                      styles.phoneSaveBtn,
                      phoneInput.length === 10 ? styles.phoneSaveBtnActive : styles.phoneSaveBtnDisabled,
                    ]}
                    onPress={() => void onSavePhone()}
                    disabled={savingPhone || phoneInput.length !== 10}
                    accessibilityRole="button"
                    accessibilityLabel="Save phone number"
                  >
                    {savingPhone ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Check size={14} color={phoneInput.length === 10 ? colors.white : colors.disabledText} />
                    )}
                  </Pressable>
                  <Pressable
                    style={styles.phoneCancelBtn}
                    onPress={() => setEditingPhone(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel editing phone"
                  >
                    <X size={14} color={colors.muted} />
                  </Pressable>
                </View>
              ) : (
                <>
                  {profile?.mobile ? (
                    <View style={styles.contactChip}>
                      <Phone size={12} color={colors.primaryDark} />
                      <Text style={styles.contactChipText}>+91 {profile.mobile}</Text>
                      <Pressable
                        style={styles.phoneEditPen}
                        onPress={() => {
                          setPhoneInput(profile.mobile);
                          setEditingPhone(true);
                        }}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel="Edit phone number"
                      >
                        <Pencil size={10} color={colors.primaryDark} />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      style={({ pressed }) => [styles.addPhoneBtn, pressed && styles.addPhoneBtnPressed]}
                      onPress={() => {
                        setPhoneInput("");
                        setEditingPhone(true);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Add your phone number"
                    >
                      <Plus size={12} color={colors.primaryDark} />
                      <Phone size={12} color={colors.primaryDark} />
                      <Text style={styles.addPhoneBtnText}>Add your phone number</Text>
                    </Pressable>
                  )}

                  {profile?.email ? (
                    <View style={styles.contactChip}>
                      <Mail size={12} color={colors.primaryDark} />
                      <Text style={styles.contactChipText} numberOfLines={1}>
                        {profile.email}
                      </Text>
                    </View>
                  ) : null}
                </>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Contact Customer Care - Elaborated on click */}
      <View style={styles.sectionCard}>
        <Pressable
          style={styles.sectionHeaderPressable}
          onPress={() => setShowContactCare((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel="Toggle Contact Customer Care"
          accessibilityState={{ expanded: showContactCare }}
        >
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionIconCircle}>
              <Headset size={20} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.sectionTitle}>Contact Customer Care</Text>
              <Text style={styles.sectionSubtitle}>Call, WhatsApp & Email assistance</Text>
            </View>
          </View>
          {showContactCare ? (
            <ChevronUp size={20} color={colors.primaryDark} />
          ) : (
            <ChevronDown size={20} color={colors.muted} />
          )}
        </Pressable>

        {showContactCare ? (
          <View style={styles.contactCardsGrid}>
            {/* Email Us Card */}
            <Pressable
              style={({ pressed }) => [styles.contactCard, pressed && styles.contactCardPressed]}
              onPress={() => handleEmail("info@bookashoot.online")}
              accessibilityRole="button"
              accessibilityLabel="Email support at info@bookashoot.online"
            >
              <View style={styles.contactIconCircle}>
                <Mail size={22} color={colors.primaryDark} />
              </View>
              <View style={styles.contactInfoCol}>
                <Text style={styles.contactCardTitle}>Email Us</Text>
                <Text style={styles.contactCardValue}>info@bookashoot.online</Text>
              </View>
            </Pressable>

            {/* Single Call Us Card (no repeat) */}
            <Pressable
              style={({ pressed }) => [styles.contactCard, pressed && styles.contactCardPressed]}
              onPress={() => handleCall("+91 96032 15551")}
              accessibilityRole="button"
              accessibilityLabel="Call support at +91 96032 15551"
            >
              <View style={styles.contactIconCircle}>
                <Phone size={22} color={colors.primaryDark} />
              </View>
              <View style={styles.contactInfoCol}>
                <Text style={styles.contactCardTitle}>Call Us</Text>
                <Text style={styles.contactCardValue}>+91 96032 15551</Text>
              </View>
            </Pressable>

            {/* WhatsApp Card */}
            <Pressable
              style={({ pressed }) => [styles.contactCard, pressed && styles.contactCardPressed]}
              onPress={() => handleWhatsApp("+91 96032 15551")}
              accessibilityRole="button"
              accessibilityLabel="WhatsApp support at +91 96032 15551"
            >
              <View style={styles.contactIconCircle}>
                <MessageCircle size={22} color={colors.primaryDark} />
              </View>
              <View style={styles.contactInfoCol}>
                <Text style={styles.contactCardTitle}>WhatsApp</Text>
                <Text style={styles.contactCardValue}>+91 96032 15551</Text>
              </View>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Send Us Feedback - Elaborated on click */}
      <View style={styles.sectionCard}>
        <Pressable
          style={styles.sectionHeaderPressable}
          onPress={() => setShowFeedback((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel="Toggle Send Us Feedback"
          accessibilityState={{ expanded: showFeedback }}
        >
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionIconCircle}>
              <MessageSquare size={20} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.sectionTitle}>Send Us Feedback</Text>
              <Text style={styles.sectionSubtitle}>Share thoughts, report issues or feature ideas</Text>
            </View>
          </View>
          {showFeedback ? (
            <ChevronUp size={20} color={colors.primaryDark} />
          ) : (
            <ChevronDown size={20} color={colors.muted} />
          )}
        </Pressable>

        {showFeedback ? (
          <View style={styles.feedbackFormContainer}>
            {feedbackSent ? (
              <View style={styles.feedbackSuccessBox}>
                <View style={styles.feedbackSuccessBadge}>
                  <Check size={22} color={colors.white} />
                </View>
                <Text style={styles.feedbackSuccessTitle}>Thank you for your feedback!</Text>
                <Text style={styles.feedbackSuccessText}>
                  Your message has been delivered to info@bookashoot.online. Our core product team reviews every suggestion.
                </Text>
                <Pressable
                  style={styles.feedbackResetBtn}
                  onPress={() => {
                    setFeedbackSent(false);
                    setFeedbackText("");
                    setFeedbackError("");
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Send another feedback note"
                >
                  <Text style={styles.feedbackResetBtnText}>Send another note</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.feedbackFormInner}>
                <Text style={styles.feedbackFieldLabel}>Feedback Category</Text>
                <View style={styles.feedbackPillsRow}>
                  {(["Suggestion", "App Experience", "Photographer Review", "Other"] as const).map((cat) => (
                    <Pressable
                      key={cat}
                      style={[
                        styles.feedbackPill,
                        feedbackType === cat && styles.feedbackPillActive,
                      ]}
                      onPress={() => setFeedbackType(cat)}
                      accessibilityRole="button"
                      accessibilityLabel={`Select category ${cat}`}
                    >
                      <Text
                        style={[
                          styles.feedbackPillText,
                          feedbackType === cat && styles.feedbackPillTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[styles.feedbackFieldLabel, { marginTop: 12 }]}>Your Message</Text>
                <TextInput
                  style={styles.feedbackTextInput}
                  value={feedbackText}
                  onChangeText={(val) => {
                    setFeedbackText(val);
                    if (feedbackError) setFeedbackError("");
                  }}
                  placeholder="Tell us what you loved or what we can improve..."
                  placeholderTextColor={colors.muted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                {feedbackError ? (
                  <Text style={styles.feedbackErrorText}>{feedbackError}</Text>
                ) : null}

                <View style={styles.feedbackMetaRow}>
                  <Text style={styles.feedbackMetaText} numberOfLines={1}>
                    Sending as <Text style={{ fontWeight: "600", color: colors.text }}>{profile?.name || "Customer"}</Text> ({profile?.email || "info@bookashoot.online"})
                  </Text>
                </View>

                <Pressable
                  style={[
                    styles.feedbackSubmitBtn,
                    (!feedbackText.trim() || sendingFeedback) && styles.feedbackSubmitBtnDisabled,
                  ]}
                  onPress={handleSubmitFeedback}
                  disabled={!feedbackText.trim() || sendingFeedback}
                  accessibilityRole="button"
                  accessibilityLabel="Submit feedback"
                >
                  {sendingFeedback ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <Send size={15} color={colors.white} />
                      <Text style={styles.feedbackSubmitBtnText}>Send Feedback</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        ) : null}
      </View>

      {/* Frequently Asked Questions (Accordion - Elaborated only on click) */}
      <View style={styles.sectionCard}>
        <Pressable
          style={styles.sectionHeaderPressable}
          onPress={() => setShowFaqs((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel="Toggle Frequently Asked Questions"
          accessibilityState={{ expanded: showFaqs }}
        >
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionIconCircle}>
              <HelpCircle size={20} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
              <Text style={styles.sectionSubtitle}>Booking flow, policies & deliverables</Text>
            </View>
          </View>
          {showFaqs ? (
            <ChevronUp size={20} color={colors.primaryDark} />
          ) : (
            <ChevronDown size={20} color={colors.muted} />
          )}
        </Pressable>

        {showFaqs ? (
          <View style={styles.faqList}>
            {FAQ_LIST.map((faq) => {
              const isExpanded = expandedFaq === faq.id;
              return (
                <View key={faq.id} style={[styles.faqCard, isExpanded && styles.faqCardExpanded]}>
                  <Pressable
                    style={styles.faqQuestionRow}
                    onPress={() => toggleFaq(faq.id)}
                    accessibilityRole="button"
                    accessibilityLabel={faq.question}
                    accessibilityState={{ expanded: isExpanded }}
                  >
                    <Text style={[styles.faqQuestionText, isExpanded && styles.faqQuestionTextActive]}>
                      {faq.question}
                    </Text>
                    {isExpanded ? (
                      <ChevronUp size={18} color={colors.primaryDark} />
                    ) : (
                      <ChevronDown size={18} color={colors.muted} />
                    )}
                  </Pressable>
                  {isExpanded ? (
                    <View style={styles.faqAnswerContainer}>
                      <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* Logout Action */}
      <View style={styles.logoutContainer}>
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
          onPress={onLogout}
          accessibilityRole="button"
          accessibilityLabel="Log out of account"
        >
          <LogOut size={17} color={colors.danger} />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
    gap: spacing.md,
  },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: colors.primary,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 32,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  nameHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileName: {
    fontSize: 19,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: -0.3,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  verifiedText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: "600",
  },
  editIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.peach,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  editIconBtnPressed: {
    backgroundColor: colors.peachBorder,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editInput: {
    flex: 1,
    height: 38,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14.5,
    color: colors.text,
    fontWeight: "600",
  },
  editSaveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  editCancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  contactDetailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  contactChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  contactChipText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "500",
  },
  addPhoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.peach,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  addPhoneBtnPressed: {
    backgroundColor: colors.peachBorder,
  },
  addPhoneBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  phoneEditPen: {
    marginLeft: 4,
    padding: 2,
  },
  phoneEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    width: "100%",
  },
  phonePrefixBox: {
    height: 36,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  phonePrefixText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  phoneInputStyle: {
    flex: 1,
    height: 36,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 13.5,
    fontWeight: "600",
    color: colors.text,
  },
  phoneSaveBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  phoneSaveBtnActive: {
    backgroundColor: colors.primary,
  },
  phoneSaveBtnDisabled: {
    backgroundColor: "#E5E7EB",
  },
  phoneCancelBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  sectionHeaderPressable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  sectionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  contactCardsGrid: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.cream,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  contactCardPressed: {
    backgroundColor: colors.cream,
    borderColor: colors.peachBorder,
  },
  contactIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  contactInfoCol: {
    flex: 1,
    gap: 2,
  },
  contactCardTitle: {
    fontSize: 14.5,
    fontWeight: "600",
    color: colors.text,
  },
  contactCardValue: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "500",
  },
  faqList: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 6,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.cream,
  },
  faqCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  faqCardExpanded: {
    borderColor: colors.peachBorder,
  },
  faqQuestionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 18,
  },
  faqQuestionTextActive: {
    color: colors.primaryDark,
  },
  faqAnswerContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.cream,
  },
  faqAnswerText: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
  },
  logoutContainer: {
    marginTop: 6,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.dangerBg,
    borderRadius: 14,
    paddingVertical: 12,
  },
  logoutBtnPressed: {
    opacity: 0.8,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.danger,
  },

  // ── Send Us Feedback Styles ───────────────────────────────────────────────
  feedbackFormContainer: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.cream,
  },
  feedbackFormInner: {
    gap: 8,
  },
  feedbackFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  feedbackPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  feedbackPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  feedbackPillActive: {
    backgroundColor: colors.peach,
    borderColor: colors.primary,
  },
  feedbackPillText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.muted,
  },
  feedbackPillTextActive: {
    color: colors.primaryDark,
    fontWeight: "600",
  },
  feedbackTextInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 13.5,
    color: colors.text,
    minHeight: 88,
  },
  feedbackErrorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 2,
  },
  feedbackMetaRow: {
    marginTop: 4,
  },
  feedbackMetaText: {
    fontSize: 11.5,
    color: colors.muted,
  },
  feedbackSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  feedbackSubmitBtnDisabled: {
    opacity: 0.5,
  },
  feedbackSubmitBtnText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: colors.white,
  },
  feedbackSuccessBox: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 8,
  },
  feedbackSuccessBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  feedbackSuccessTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  feedbackSuccessText: {
    fontSize: 12.5,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
  },
  feedbackResetBtn: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.peach,
    borderWidth: 1,
    borderColor: colors.peachBorder,
  },
  feedbackResetBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primaryDark,
  },
});
