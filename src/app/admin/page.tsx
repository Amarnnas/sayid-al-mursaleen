'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  getGeneralSettings, 
  saveGeneralSettings,
  getPrayerSettings,
  savePrayerSettings,
  getAnnouncements,
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getLectures,
  addLecture,
  updateLecture,
  deleteLecture,
  getYouTubeId,
  getYouTubeThumbnail,
  getAdmins,
  addAdmin,
  deleteAdmin,
  checkAdminEmail,
  updateAdminPassword,
  isFirebaseConfigured,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  generateSlug
} from '../../lib/firebase/db';
import { GeneralSettings, PrayerSettings, Announcement, Lecture, Admin, Category } from '../../lib/types';
import { auth } from '../../lib/firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Toast from '../../components/Toast';
import AccessibilityWidget from '../../components/AccessibilityWidget';
import ThemeToggle from '../../components/ThemeToggle';
import { 
  Settings, 
  Clock, 
  Megaphone, 
  BookOpen, 
  LogOut, 
  Plus, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Save, 
  Lock, 
  Globe,
  AlertCircle,
  CheckCircle2,
  Compass,
  Users,
  UserPlus,
  Loader2,
  ShieldCheck,
  Timer,
  Tags,
  Pencil,
  X,
  Key
} from 'lucide-react';
import Link from 'next/link';

// Custom inline SVG icon to avoid Lucide React version compatibility issues
const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    className={props.className}
    style={props.style}
  >
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.516 0-9.387.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.507 9.387.507 9.387.507s7.517 0 9.387-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

// Login timeout duration in milliseconds
const LOGIN_TIMEOUT_MS = 10_000;

// Helper to wrap a promise with a timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
    
    promise.then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export default function AdminDashboard() {
  // --- Auth State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecking, setAuthChecking] = useState(true); // true until onAuthStateChanged fires once
  const [isLoggingIn, setIsLoggingIn] = useState(false); // separate state for login button
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- Active Tab ---
  const [activeTab, setActiveTab] = useState<'general' | 'prayer' | 'announcements' | 'lectures' | 'admins' | 'categories'>('general');

  // --- Settings States ---
  const [general, setGeneral] = useState<GeneralSettings | null>(null);
  const [prayer, setPrayer] = useState<PrayerSettings | null>(null);
  
  // --- Lists States ---
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // --- Form Insertion States ---
  const [newAnn, setNewAnn] = useState({ title: '', content: '', imageUrl: '' });
  const [newLec, setNewLec] = useState({ 
    title: '', 
    sheikh: 'خطيب المسجد', 
    youtubeUrl: '', 
    description: '', 
    thumbnailUrl: '', 
    mp3Url: '',
    categoryIds: [] as string[]
  });
  const [newCategory, setNewCategory] = useState({ name: '', slug: '', sortOrder: 999 });
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'super_admin' | 'admin'>('admin');
  const [newAdminPassword, setNewAdminPassword] = useState('123456');

  // --- Editing states ---
  const [editingLectureId, setEditingLectureId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategorySlug, setEditingCategorySlug] = useState('');
  const [editingCategorySortOrder, setEditingCategorySortOrder] = useState(999);
  const [editingAdminEmail, setEditingAdminEmail] = useState<string | null>(null);
  const [editingAdminPassword, setEditingAdminPassword] = useState('');

  // --- Own Password Change Modal States ---
  const [isChangingPasswordModalOpen, setIsChangingPasswordModalOpen] = useState(false);
  const [myNewPassword, setMyNewPassword] = useState('');
  const [myConfirmPassword, setMyConfirmPassword] = useState('');
  const [myPasswordError, setMyPasswordError] = useState('');
  const [myPasswordSuccess, setMyPasswordSuccess] = useState('');
  const [isSavingMyPassword, setIsSavingMyPassword] = useState(false);


  // --- Notification Banner States ---
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // --- Fetching & Real-time Action States ---
  const [loading, setLoading] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [showActivationConfirm, setShowActivationConfirm] = useState(false);
  const [currentAdminEmail, setCurrentAdminEmail] = useState('');
  const [currentAdminRole, setCurrentAdminRole] = useState<'super_admin' | 'admin'>('admin');



  // Firebase Auth State Listener - runs once on mount
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      // Firebase not configured - show login form immediately, no mock auth
      setAuthChecking(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        // Verify user is in admins collection
        try {
          const adminRecord = await checkAdminEmail(user.email);
          if (adminRecord) {
            setIsLoggedIn(true);
            setCurrentAdminEmail(adminRecord.email);
            setCurrentAdminRole(adminRecord.role);
          } else {
            // User is authenticated but not an admin - sign out
            await signOut(auth);
            setIsLoggedIn(false);
            setLoginError('عذراً، هذا الحساب ليس مشرفاً مسجلاً في النظام.');
          }
        } catch (e) {
          console.error('Error checking admin status:', e);
          setIsLoggedIn(false);
        }
      } else {
        setIsLoggedIn(false);
        setCurrentAdminEmail('');
        setCurrentAdminRole('admin');
      }
      setAuthChecking(false);
    });

    // Timeout protection: if onAuthStateChanged doesn't fire within 10s
    const authTimeout = setTimeout(() => {
      setAuthChecking(false);
      console.warn('Firebase auth state check timed out after 10 seconds.');
    }, LOGIN_TIMEOUT_MS);

    return () => {
      unsubscribe();
      clearTimeout(authTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch DB data on logged in
  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchAllData = async () => {
      setLoading(true);
      
      // Fetch general settings (has internal mock fallback)
      try {
        const genData = await getGeneralSettings();
        setGeneral(genData);
      } catch (e) {
        console.error("Failed fetching general settings:", e);
        setErrorMsg("حدث خطأ أثناء تحميل الإعدادات العامة.");
      }

      // Fetch prayer settings (has internal mock fallback)
      try {
        const prayData = await getPrayerSettings();
        setPrayer(prayData);
      } catch (e) {
        console.error("Failed fetching prayer settings:", e);
        setErrorMsg("حدث خطأ أثناء تحميل مواقيت الصلاة.");
      }

      // Fetch announcements
      try {
        const annData = await getAnnouncements(false);
        setAnnouncements(annData || []);
      } catch (e) {
        console.error("Failed fetching announcements:", e);
      }

      // Fetch lectures
      try {
        const lecData = await getLectures();
        setLectures(lecData || []);
      } catch (e) {
        console.error("Failed fetching lectures:", e);
      }

      // Fetch admins
      try {
        const admData = await getAdmins();
        setAdmins(admData || []);
      } catch (e) {
        console.error("Failed fetching admins:", e);
      }

      // Fetch categories
      try {
        const catData = await getCategories();
        setCategories(catData || []);
      } catch (e) {
        console.error("Failed fetching categories:", e);
      }

      setLoading(false);
    };

    fetchAllData();
  }, [isLoggedIn]);

  // Alert dismiss timeout
  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg]);

  // Handle Sign In - Firebase Auth with local Firestore-based password verification
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setShowActivationConfirm(false);
    
    const email = username.trim();
    if (!email || !password) {
      setLoginError('يرجى ملء جميع الحقول.');
      return;
    }
    
    if (!isFirebaseConfigured()) {
      setLoginError('Firebase غير مهيأ. يرجى التأكد من إعداد ملف .env.local بجميع متغيرات Firebase المطلوبة.');
      return;
    }
    
    setIsLoggingIn(true);
    try {
      // Check if email exists in Firestore admins collection
      const adminRecord = await withTimeout(
        checkAdminEmail(email),
        LOGIN_TIMEOUT_MS,
        "فشلت عملية التحقق من حساب المشرف بسبب انتهاء مهلة الاتصال بالخادم."
      );
      
      if (!adminRecord) {
        setLoginError('عذراً، هذا البريد الإلكتروني غير مسجل كمشرف في النظام.');
        setIsLoggingIn(false);
        return;
      }
      
      // If a password is set in Firestore, verify it first
      if (adminRecord.password && adminRecord.password !== password) {
        setLoginError('كلمة المرور المدخلة غير صحيحة.');
        setIsLoggingIn(false);
        return;
      }
      
      const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('firebase/auth');
      
      // If passwords match (or if it is a legacy admin without a password yet),
      // we log them in in Firebase Auth using a fixed system-secret password.
      try {
        await withTimeout(
          signInWithEmailAndPassword(auth, email, "MosqueAdminSecretPass2026!"),
          LOGIN_TIMEOUT_MS,
          "انتهت مهلة تسجيل الدخول. يرجى التحقق من اتصال الإنترنت."
        );
        
        // If they logged in successfully and didn't have a password set in Firestore, save it now!
        if (!adminRecord.password) {
          await updateAdminPassword(email, password);
        }
        setSuccessMsg("تم تسجيل الدخول بنجاح!");
      } catch (err: any) {
        console.warn("Firebase Auth sign-in failed, checking auto-provisioning...", err.code);
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          // Auto-provision user in Firebase Auth using system password
          try {
            await withTimeout(
              createUserWithEmailAndPassword(auth, email, "MosqueAdminSecretPass2026!"),
              LOGIN_TIMEOUT_MS,
              "انتهت مهلة تفعيل الحساب."
            );
            // Save entered password to Firestore
            await updateAdminPassword(email, password);
            setSuccessMsg("تم تفعيل حسابك وتسجيل الدخول بنجاح!");
          } catch (createErr: any) {
            console.error("Auto-provisioning failed:", createErr);
            setLoginError('فشل تفعيل الحساب في نظام الحماية: ' + (createErr.message || 'خطأ غير معروف'));
          }
        } else {
          setLoginError(err.message || 'فشل تسجيل الدخول. تأكد من صحة الحساب وكلمة المرور.');
        }
      }
    } catch (e: any) {
      console.error(e);
      setLoginError(e.message || 'حدث خطأ غير متوقع أثناء الاتصال بالخادم.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Google Login - Firebase only (no mock)
  const handleGoogleLogin = async () => {
    setLoginError('');
    
    if (!isFirebaseConfigured()) {
      setLoginError('Firebase غير مهيأ. يرجى إعداد ملف .env.local أولاً.');
      return;
    }
    
    setIsLoggingIn(true);
    try {
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      
      const result = await withTimeout(
        signInWithPopup(auth, provider),
        LOGIN_TIMEOUT_MS,
        "انتهت مهلة تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى."
      );
      
      const email = result.user?.email;
      if (!email) {
        throw new Error("تعذر الحصول على البريد الإلكتروني من حساب Google.");
      }
      
      // Check if email exists in Firestore admins collection
      const adminRecord = await withTimeout(
        checkAdminEmail(email),
        LOGIN_TIMEOUT_MS,
        "انتهت مهلة التحقق من صلاحيات المشرف. يرجى المحاولة مرة أخرى."
      );
      
      if (!adminRecord) {
        await signOut(auth);
        setLoginError('عذراً، هذا الحساب الإلكتروني ليس مشرفاً مسجلاً في النظام.');
        return;
      }
      
      setSuccessMsg(`أهلاً بك، تم تسجيل الدخول بنجاح عبر Google!`);
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/popup-closed-by-user') {
        setLoginError('تم إلغاء تسجيل الدخول.');
      } else if (e.code === 'auth/unauthorized-domain') {
        setLoginError('⚠️ نطاق التشغيل الحالي غير مصرح به في مشروع Firebase الخاص بك. للحل: يرجى الانتقال إلى Firebase Console -> Authentication -> Settings -> Authorized domains وإضافة النطاق الحالي (مثال: localhost أو عنوان IP الخاص بك).');
      } else {
        setLoginError(e.message || 'حدث خطأ أثناء تسجيل الدخول عبر Google.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Sign Out
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Firebase signOut failed:", e);
    }
    // onAuthStateChanged will handle setting isLoggedIn to false
    setIsLoggedIn(false);
    setCurrentAdminEmail('');
    setCurrentAdminRole('admin');
    setGeneral(null);
    setPrayer(null);
  };

  // Add new admin
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail) {
      setErrorMsg("يرجى إدخال البريد الإلكتروني للمشرف.");
      return;
    }
    setLoading(true);
    try {
      await addAdmin(newAdminEmail.trim(), newAdminRole, newAdminPassword);
      setSuccessMsg("تم إضافة المشرف الجديد بنجاح!");
      setNewAdminEmail('');
      setNewAdminPassword('123456');
      // Reload admins
      const updated = await getAdmins();
      setAdmins(updated);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "حدث خطأ أثناء إضافة المشرف.");
    } finally {
      setLoading(false);
    }
  };

  // Save modified admin password
  const handleSaveAdminPassword = async (email: string) => {
    const trimmedPass = editingAdminPassword.trim();
    if (trimmedPass.length < 6) {
      setErrorMsg("كلمة المرور يجب أن تكون من 6 أحرف/أرقام على الأقل.");
      return;
    }
    setLoading(true);
    try {
      await updateAdminPassword(email, trimmedPass);
      setSuccessMsg("تم تعديل كلمة مرور المشرف بنجاح!");
      setEditingAdminEmail(null);
      setEditingAdminPassword('');
      // Reload admins
      const updated = await getAdmins();
      setAdmins(updated);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "حدث خطأ أثناء تعديل كلمة المرور.");
    } finally {
      setLoading(false);
    }
  };

  // Save logged-in admin's own password
  const handleSaveMyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMyPasswordError('');
    setMyPasswordSuccess('');

    const newPass = myNewPassword.trim();
    const confPass = myConfirmPassword.trim();

    if (!newPass) {
      setMyPasswordError("يرجى إدخال كلمة المرور الجديدة.");
      return;
    }
    if (newPass.length < 6) {
      setMyPasswordError("يجب أن تكون كلمة المرور من 6 خانات على الأقل.");
      return;
    }
    if (newPass !== confPass) {
      setMyPasswordError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setIsSavingMyPassword(true);
    try {
      await updateAdminPassword(currentAdminEmail, newPass);
      setMyPasswordSuccess("تم تغيير كلمة المرور الخاصة بك بنجاح!");
      setMyNewPassword('');
      setMyConfirmPassword('');
      // Reload admins to sync view
      const updated = await getAdmins();
      setAdmins(updated);
      
      // Auto close modal after 2 seconds
      setTimeout(() => {
        setIsChangingPasswordModalOpen(false);
        setMyPasswordSuccess('');
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setMyPasswordError(err.message || "حدث خطأ أثناء تعديل كلمة المرور الخاصة بك.");
    } finally {
      setIsSavingMyPassword(false);
    }
  };


  // Delete admin
  const handleDeleteAdmin = async (email: string) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const activeEmail = (currentAdminEmail || '').trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg("البريد الإلكتروني غير صالح.");
      return;
    }
    if (cleanEmail === activeEmail) {
      setErrorMsg("لا يمكنك حذف حسابك النشط الذي تسجل به الدخول حالياً.");
      return;
    }
    if (!window.confirm(`هل أنت متأكد من حذف المشرف (${cleanEmail}) نهائياً؟`)) return;
    setLoading(true);
    try {
      await deleteAdmin(cleanEmail);
      setSuccessMsg("تم حذف المشرف بنجاح.");
      // Reload admins
      const updated = await getAdmins();
      setAdmins(updated);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "فشل حذف المشرف.");
    } finally {
      setLoading(false);
    }
  };

  // Save general settings
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!general) return;
    try {
      await saveGeneralSettings(general);
      setSuccessMsg("تم حفظ الإعدادات العامة للمسجد بنجاح!");
    } catch (e) {
      console.error(e);
      setErrorMsg("فشل حفظ الإعدادات، يرجى المحاولة مرة أخرى.");
    }
  };

  // Save prayer settings
  const handleSavePrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prayer) return;
    try {
      await savePrayerSettings(prayer);
      setSuccessMsg("تم حفظ إعدادات مواقيت الصلاة والموقع بنجاح!");
    } catch (e) {
      console.error(e);
      setErrorMsg("فشل حفظ التعديلات.");
    }
  };

  // Add announcement
  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnn.title || !newAnn.content) {
      setErrorMsg("يرجى ملء العنوان ونص الإعلان.");
      return;
    }
    try {
      await addAnnouncement({
        title: newAnn.title,
        content: newAnn.content,
        imageUrl: newAnn.imageUrl || "",
        createdAt: Date.now(),
        isActive: true
      });
      setSuccessMsg("تم نشر الإعلان الجديد بنجاح!");
      setNewAnn({ title: '', content: '', imageUrl: '' });
      // Reload announcements list
      const updated = await getAnnouncements(false);
      setAnnouncements(updated);
    } catch (e) {
      console.error(e);
      setErrorMsg("حدث خطأ أثناء إضافة الإعلان.");
    }
  };

  // Toggle announcement active status
  const handleToggleAnnActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateAnnouncement(id, { isActive: !currentStatus });
      // Update local state directly for speedy render
      setAnnouncements(prev => prev.map(ann => ann.id === id ? { ...ann, isActive: !currentStatus } : ann));
      setSuccessMsg("تم تعديل حالة الإعلان.");
    } catch (e) {
      console.error(e);
    }
  };

  // Delete announcement
  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الإعلان نهائياً؟")) return;
    try {
      await deleteAnnouncement(id);
      setAnnouncements(prev => prev.filter(item => item.id !== id));
      setSuccessMsg("تم حذف الإعلان.");
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch YouTube metadata dynamically using keyless oEmbed proxy
  const fetchYouTubeMeta = async (url: string): Promise<{ title: string; description: string; thumbnailUrl: string; sheikh: string } | null> => {
    if (!url) {
      setErrorMsg("الرجاء إدخال رابط يوتيوب أولاً.");
      return null;
    }
    const videoId = getYouTubeId(url);
    if (!videoId) {
      setErrorMsg("رابط اليوتيوب غير صالح.");
      return null;
    }
    
    setLoadingMeta(true);
    try {
      const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error("تعذر الاتصال بـ oEmbed API");
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      const fetchedTitle = data.title || "";
      const fetchedSheikh = data.author_name || "خطيب المسجد";
      const fetchedThumb = data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      const fetchedDesc = `خطبة/محاضرة منشورة على قناة: ${data.author_name || "مسجد سيد المرسلين"}`;
      
      // Update fields only if they are empty
      setNewLec(prev => ({
        ...prev,
        title: prev.title.trim() ? prev.title : fetchedTitle,
        sheikh: prev.sheikh === 'خطيب المسجد' ? fetchedSheikh : prev.sheikh,
        thumbnailUrl: prev.thumbnailUrl.trim() ? prev.thumbnailUrl : fetchedThumb,
        description: prev.description.trim() ? prev.description : fetchedDesc
      }));
      
      setSuccessMsg("تم جلب تفاصيل الفيديو وتعبئة الحقول بنجاح!");
      return { title: fetchedTitle, sheikh: fetchedSheikh, thumbnailUrl: fetchedThumb, description: fetchedDesc };
    } catch (err: any) {
      console.error("oEmbed fetch failed:", err);
      setErrorMsg("فشل جلب البيانات تلقائياً، يرجى ملء الحقول يدوياً.");
      return null;
    } finally {
      setLoadingMeta(false);
    }
  };

  // Add or Edit lecture
  const handleAddLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLec.youtubeUrl) {
      setErrorMsg("يرجى إدخال رابط اليوتيوب.");
      return;
    }
    
    const videoId = getYouTubeId(newLec.youtubeUrl);
    if (!videoId) {
      setErrorMsg("رابط اليوتيوب المدخل غير صالح.");
      return;
    }
    
    setLoading(true);
    try {
      let finalTitle = newLec.title;
      let finalDescription = newLec.description;
      let finalThumbnail = newLec.thumbnailUrl || getYouTubeThumbnail(newLec.youtubeUrl);
      let finalSheikh = newLec.sheikh;
      
      // If fields are empty, attempt to auto-fetch
      if (!finalTitle.trim() || !finalDescription.trim() || !newLec.thumbnailUrl.trim()) {
        const fetched = await fetchYouTubeMeta(newLec.youtubeUrl);
        if (fetched) {
          if (!finalTitle.trim()) finalTitle = fetched.title;
          if (!finalDescription.trim()) finalDescription = fetched.description;
          if (!newLec.thumbnailUrl.trim()) finalThumbnail = fetched.thumbnailUrl;
          if (finalSheikh === 'خطيب المسجد') finalSheikh = fetched.sheikh;
        }
      }
      
      // Fallback checking if still empty after fetch attempt
      if (!finalTitle.trim()) {
        finalTitle = `خطبة/محاضرة يوتيوب #${videoId}`;
      }
      if (!finalDescription.trim()) {
        finalDescription = "لم يتم إضافة تفاصيل لهذه المحاضرة.";
      }
      
      const lectureData = {
        title: finalTitle,
        sheikh: finalSheikh,
        youtubeUrl: newLec.youtubeUrl,
        description: finalDescription,
        thumbnailUrl: finalThumbnail,
        mp3Url: newLec.mp3Url.trim() || "",
        categoryIds: newLec.categoryIds
      };
      
      if (editingLectureId) {
        await updateLecture(editingLectureId, lectureData);
        setSuccessMsg("تم تعديل المحاضرة بنجاح!");
        setEditingLectureId(null);
      } else {
        await addLecture({
          ...lectureData,
          createdAt: Date.now()
        });
        setSuccessMsg("تمت إضافة المحاضرة/الخطبة بنجاح!");
      }
      
      setNewLec({ 
        title: '', 
        sheikh: 'خطيب المسجد', 
        youtubeUrl: '', 
        description: '', 
        thumbnailUrl: '', 
        mp3Url: '',
        categoryIds: []
      });
      
      // Reload lectures list
      const updated = await getLectures();
      setLectures(updated);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "حدث خطأ أثناء حفظ المحاضرة.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditLecture = (lec: Lecture) => {
    setEditingLectureId(lec.id);
    setNewLec({
      title: lec.title,
      sheikh: lec.sheikh,
      youtubeUrl: lec.youtubeUrl,
      description: lec.description,
      thumbnailUrl: lec.thumbnailUrl || '',
      mp3Url: lec.mp3Url || '',
      categoryIds: lec.categoryIds || []
    });
    setActiveTab('lectures');
  };

  const handleCancelEditLecture = () => {
    setEditingLectureId(null);
    setNewLec({
      title: '',
      sheikh: 'خطيب المسجد',
      youtubeUrl: '',
      description: '',
      thumbnailUrl: '',
      mp3Url: '',
      categoryIds: []
    });
  };

  // Delete lecture
  const handleDeleteLecture = async (id: string) => {
    if (!window.confirm("هل تريد بالتأكيد حذف هذه المحاضرة؟")) return;
    try {
      await deleteLecture(id);
      setLectures(prev => prev.filter(item => item.id !== id));
      setSuccessMsg("تم حذف المحاضرة بنجاح.");
    } catch (e) {
      console.error(e);
    }
  };

  // --- CATEGORY ACTIONS ---
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name.trim()) {
      setErrorMsg("يرجى إدخال اسم التصنيف.");
      return;
    }
    setLoading(true);
    try {
      const slug = newCategory.slug.trim() || generateSlug(newCategory.name.trim());
      await addCategory({
        name: newCategory.name.trim(),
        slug,
        sortOrder: newCategory.sortOrder,
        createdAt: Date.now()
      });
      setSuccessMsg("تم إضافة التصنيف بنجاح!");
      setNewCategory({ name: '', slug: '', sortOrder: 999 });
      const updated = await getCategories();
      setCategories(updated);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "حدث خطأ أثناء إضافة التصنيف.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
    setEditingCategorySlug(cat.slug);
    setEditingCategorySortOrder(cat.sortOrder ?? 999);
  };

  const handleSaveCategory = async (id: string) => {
    if (!editingCategoryName.trim()) {
      setErrorMsg("اسم التصنيف لا يمكن أن يكون فارغاً.");
      return;
    }
    setLoading(true);
    try {
      const slug = editingCategorySlug.trim() || generateSlug(editingCategoryName.trim());
      await updateCategory(id, {
        name: editingCategoryName.trim(),
        slug,
        sortOrder: editingCategorySortOrder
      });
      setSuccessMsg("تم تعديل التصنيف بنجاح!");
      setEditingCategoryId(null);
      const updated = await getCategories();
      setCategories(updated);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "فشل تعديل التصنيف.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التصنيف؟")) return;
    setLoading(true);
    try {
      await deleteCategory(id);
      setSuccessMsg("تم حذف التصنيف بنجاح.");
      const updated = await getCategories();
      setCategories(updated);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "حدث خطأ أثناء حذف التصنيف.");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER INITIAL AUTH CHECK LOADING ---
  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
          <span className="text-xs text-zinc-500">جاري التحقق من حالة تسجيل الدخول...</span>
        </div>
      </div>
    );
  }

  // --- RENDER LOGIN IF NOT AUTHENTICATED ---
  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-4 dark:bg-zinc-950">
        <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 shadow-xl border border-zinc-200/50 dark:bg-zinc-900 dark:border-zinc-800/50 animate-fade-in">
          <div className="flex flex-col items-center text-center mb-8">
            <img 
              src="/logo.png" 
              alt="شعار مسجد سيد المرسلين" 
              className="h-16 w-16 object-contain rounded-2xl shadow-lg bg-white dark:bg-zinc-800 p-1.5 border border-zinc-200/50 dark:border-zinc-700/50"
            />
            <h2 className="text-2xl font-black text-zinc-900 mt-4 dark:text-white">بوابة المشرفين</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">الرجاء تسجيل الدخول لتحديث مواقيت الصلاة والخطب والتعميمات</p>
          </div>

          {!isFirebaseConfigured() && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 p-3 rounded-lg mb-4 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>تنبيه: Firebase غير مهيأ. يرجى إعداد ملف <code className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1 rounded">.env.local</code> بمتغيرات Firebase المطلوبة.</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">البريد الإلكتروني للمشرف</label>
              <input 
                type="email" 
                placeholder="your-email@example.com"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500"
                required
                disabled={isLoggingIn}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">كلمة المرور</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-emerald-500"
                required
                disabled={isLoggingIn}
              />
            </div>

            {loginError && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400 p-2.5 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}



            <button 
              type="submit" 
              className="mt-2 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                <span>تسجيل الدخول</span>
              )}
            </button>

            <div className="relative my-2 flex py-1 items-center">
              <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
              <span className="flex-shrink mx-3 text-[10px] font-bold text-zinc-400 uppercase">أو</span>
              <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-zinc-200 bg-white py-3 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" width="24" height="24">
                <g transform="matrix(1, 0, 0, 1, 0, 0)">
                  <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.4C21.68,11.83 21.56,11.43 21.35,11.1z" fill="#4285F4" />
                  <path d="M12,20.8c2.38,0 4.38,-0.78 5.84,-2.12l-3.3,-2.58c-0.91,0.61 -2.08,0.98 -3.3,0.98 -2.54,0 -4.69,-1.72 -5.46,-4.02H2.38v2.66C3.9,18.06 7.69,20.8 12,20.8z" fill="#34A853" />
                  <path d="M6.54,13.06c-0.2,-0.61 -0.31,-1.25 -0.31,-1.9c0,-0.65 0.11,-1.29 0.31,-1.9V6.6H2.38C1.57,8.21 1.11,10.02 1.11,12c0,1.98 0.46,3.79 1.27,5.4L6.54,13.06z" fill="#FBBC05" />
                  <path d="M12,6.12c1.29,0 2.45,0.44 3.36,1.31l2.52,-2.52C16.37,3.48 14.38,2.7 12,2.7c-4.31,0 -8.1,2.74 -9.62,6.13l4.16,3.23C7.31,7.84 9.46,6.12 12,6.12z" fill="#EA4335" />
                </g>
              </svg>
              <span>الدخول باستخدام Google</span>
            </button>
          </form>

          {/* Firebase configuration info */}
          <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800/80 text-[10px] text-zinc-400 dark:text-zinc-500 text-center leading-relaxed">
            <p>يتطلب تسجيل الدخول حساب Firebase مفعّل ومسجل كمشرف في النظام.</p>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER LOADER ON FETCHING ---
  if (loading || !general || !prayer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
          <span className="text-xs text-zinc-500">جاري تحميل لوحة التحكم...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950 md:flex-row font-sans">
      
      {/* 1. Notifications Center */}
      <div className="fixed top-5 left-5 z-50 flex flex-col gap-2 max-w-sm w-full px-4 md:px-0">
        {successMsg && (
          <Toast
            message={successMsg}
            type="success"
            onClose={() => setSuccessMsg('')}
          />
        )}
        {errorMsg && (
          <Toast
            message={errorMsg}
            type="error"
            onClose={() => setErrorMsg('')}
          />
        )}
      </div>

      {/* 2. Admin Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 flex flex-col shrink-0 border-l border-zinc-200 dark:border-zinc-800">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img 
              src={general.logoUrl || '/logo.png'} 
              alt="شعار المسجد" 
              className="h-8 w-8 object-contain rounded-lg bg-emerald-50 dark:bg-white/10 p-0.5"
            />
            <div>
              <h2 className="font-extrabold text-sm text-zinc-900 dark:text-white truncate max-w-[140px]">{general.mosqueName}</h2>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">لوحة المشرفين</span>
            </div>
          </div>
        </div>

        {/* Logged-in Admin Profile Section */}
        {currentAdminEmail && (
          <div className="p-4 mx-4 my-3 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shrink-0 shadow-inner">
                {currentAdminEmail.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate" title={currentAdminEmail}>
                  {currentAdminEmail}
                </p>
                <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full mt-0.5 ${
                  currentAdminRole === 'super_admin' 
                    ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' 
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                }`}>
                  {currentAdminRole === 'super_admin' ? 'مشرف عام' : 'مشرف'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsChangingPasswordModalOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold py-2 rounded-xl transition-all cursor-pointer shadow-sm border border-zinc-200/50 dark:border-none"
            >
              <Key className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
              <span>تغيير كلمة المرور الخاصة بي</span>
            </button>
          </div>
        )}

        {/* Tab Switchers */}
        <nav className="flex-1 p-4 flex flex-col gap-1.5">
          <button 
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'general' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10' 
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>الإعدادات العامة</span>
          </button>

          <button 
            onClick={() => setActiveTab('prayer')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'prayer' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10' 
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>إعدادات الصلاة والموقع</span>
          </button>

          <button 
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'announcements' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10' 
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>إدارة الإعلانات والتنبيهات</span>
          </button>

          <button 
            onClick={() => setActiveTab('lectures')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'lectures' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10' 
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>إدارة الخطب والمحاضرات</span>
          </button>

          <button 
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'categories' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10' 
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Tags className="w-4 h-4" />
            <span>إدارة التصنيفات</span>
          </button>

          <button 
            onClick={() => setActiveTab('admins')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'admins' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10' 
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>إدارة المشرفين</span>
          </button>
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
          <Link 
            href="/"
            className="flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200/50 dark:border-none transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span>عرض موقع المسجد</span>
          </Link>

          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/60 text-red-700 dark:text-red-400 py-2.5 rounded-xl text-xs font-semibold border border-red-100 dark:border-red-900/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* 3. Main Dashboard Work Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-5xl mx-auto w-full flex flex-col gap-6">
        
        {/* Top Control Bar with Theme Toggle */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200/50 dark:border-zinc-800/50 shrink-0">
          <div>
            <h2 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">لوحة الإشراف والمتابعة</h2>
            <h1 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white mt-0.5">لوحة التحكم والتهيئة</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>

        
        {/* Tab 1: General Settings */}
        {activeTab === 'general' && (
          <div className="animate-fade-in flex flex-col gap-6">
            <div>
              <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white">الإعدادات العامة للمسجد</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">تحديث اسم المسجد، والوصف التعريفي، وروابط منصات التواصل الرسمية التابعة للمسجد.</p>
            </div>

            <form onSubmit={handleSaveGeneral} className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 dark:text-zinc-400">اسم المسجد الرسمي</label>
                  <input 
                    type="text" 
                    value={general.mosqueName}
                    onChange={e => setGeneral({ ...general, mosqueName: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 dark:text-zinc-400">هاتف التواصل</label>
                  <input 
                    type="text" 
                    value={general.contactPhone}
                    onChange={e => setGeneral({ ...general, contactPhone: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 dark:text-zinc-400">البريد الإلكتروني للتواصل</label>
                  <input 
                    type="email" 
                    value={general.contactEmail || ''}
                    onChange={e => setGeneral({ ...general, contactEmail: e.target.value })}
                    placeholder="example@mosque.com"
                    className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 dark:text-zinc-400">الوصف التعريفي للمسجد</label>
                <textarea 
                  rows={4}
                  value={general.description}
                  onChange={e => setGeneral({ ...general, description: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 p-4 text-sm focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  required
                />
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800/60 pt-4">
                <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 mb-4">روابط المنصات والمجموعات الرسمية</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">قناة اليوتيوب الرسمية</label>
                    <input 
                      type="url" 
                      value={general.youtubeChannel}
                      onChange={e => setGeneral({ ...general, youtubeChannel: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">رابط مجموعة الواتساب</label>
                    <input 
                      type="url" 
                      value={general.whatsappLink}
                      onChange={e => setGeneral({ ...general, whatsappLink: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">صفحة الفيسبوك</label>
                    <input 
                      type="url" 
                      value={general.facebookLink}
                      onChange={e => setGeneral({ ...general, facebookLink: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">رابط البث المباشر (يوتيوب/فيسبوك)</label>
                    <input 
                      type="url" 
                      placeholder="رابط البث المباشر النشط"
                      value={general.liveStreamUrl}
                      onChange={e => setGeneral({ ...general, liveStreamUrl: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">حساب تيك توك (TikTok)</label>
                    <input 
                      type="url" 
                      placeholder="https://tiktok.com/@..."
                      value={general.tiktokLink || ''}
                      onChange={e => setGeneral({ ...general, tiktokLink: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button 
                  type="submit" 
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ التغييرات</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Prayer Config Settings */}
        {activeTab === 'prayer' && (
          <div className="animate-fade-in flex flex-col gap-6">
            <div>
              <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white">إعدادات مواقيت الصلاة والموقع</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">تعديل طريقة الحساب التلقائية والموقع الجغرافي أو إدخال أوقات الصلاة يدوياً بالكامل.</p>
            </div>

            <form onSubmit={handleSavePrayer} className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
              
              {/* Toggle Manual Override */}
              <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-800/80">
                <div>
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">التحكم اليدوي الكامل</h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5">تفعيل هذا الخيار يعطل الحسابات الفلكية التلقائية بناء على الموقع ويستخدم الأوقات المكتوبة بالأسفل.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPrayer({ ...prayer, useManualTimes: !prayer.useManualTimes })}
                  className="focus:outline-none"
                >
                  {prayer.useManualTimes ? (
                    <ToggleRight className="w-12 h-8 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="w-12 h-8 text-zinc-400" />
                  )}
                </button>
              </div>

              {/* SECTION A: AUTOMATIC CALCULATIONS */}
              {!prayer.useManualTimes ? (
                <div className="flex flex-col gap-5 animate-fade-in">
                  <h4 className="font-bold text-sm text-emerald-700 dark:text-emerald-400 border-b border-zinc-100 dark:border-zinc-800 pb-2">بيانات الموقع الجغرافي وحساب الفلك</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">خط العرض (Latitude)</label>
                      <input 
                        type="number" 
                        step="any"
                        value={prayer.latitude}
                        onChange={e => setPrayer({ ...prayer, latitude: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">خط الطول (Longitude)</label>
                      <input 
                        type="number" 
                        step="any"
                        value={prayer.longitude}
                        onChange={e => setPrayer({ ...prayer, longitude: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">طريقة الحساب الفلكي</label>
                      <select
                        value={prayer.calculationMethod}
                        onChange={e => setPrayer({ ...prayer, calculationMethod: e.target.value as any })}
                        className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                      >
                        <option value="UmmAlQura">جامعة أم القرى (مكة المكرمة)</option>
                        <option value="Egyptian">الهيئة العامة المصرية للمساحة</option>
                        <option value="MWL">رابطة العالم الإسلامي</option>
                        <option value="Karachi">جامعة العلوم الإسلامية بكراتشي</option>
                        <option value="NorthAmerica">الجمعية الإسلامية لأمريكا الشمالية (ISNA)</option>
                        <option value="Kuwait">دولة الكويت</option>
                        <option value="Qatar">دولة قطر</option>
                        <option value="Singapore">سنغافورة</option>
                        <option value="Moonsighting">رؤية الهلال</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">المذهب الفقهي (لصلاة العصر)</label>
                      <select
                        value={prayer.madhab}
                        onChange={e => setPrayer({ ...prayer, madhab: e.target.value as any })}
                        className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                      >
                        <option value="Shafi">جمهور الفقهاء (الشافعي، المالكي، الحنبلي)</option>
                        <option value="Hanafi">المذهب الحنفي</option>
                      </select>
                    </div>
                  </div>

                  {/* MINUTE OFFSETS */}
                  <div className="mt-2">
                    <h5 className="font-bold text-xs text-zinc-600 dark:text-zinc-400 mb-3">تعديلات الدقائق المخصصة (Offsets +/-)</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                      {['Fajr', 'Shuruq', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((key) => {
                        const offsets = { ...prayer.manualOffsets };
                        return (
                          <div key={key} className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/40 text-center">
                            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1">
                              {key === 'Fajr' ? 'الفجر' : key === 'Shuruq' ? 'الشروق' : key === 'Dhuhr' ? 'الظهر' : key === 'Asr' ? 'العصر' : key === 'Maghrib' ? 'المغرب' : 'العشاء'}
                            </span>
                            <input 
                              type="number" 
                              value={offsets[key as keyof typeof offsets] || 0}
                              onChange={e => {
                                const newOffsets = { ...prayer.manualOffsets };
                                newOffsets[key as keyof typeof offsets] = parseInt(e.target.value) || 0;
                                setPrayer({ ...prayer, manualOffsets: newOffsets });
                              }}
                              className="w-16 text-center text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 rounded px-1 py-1"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                // SECTION B: MANUAL TIMES EDITOR
                <div className="flex flex-col gap-4 animate-fade-in">
                  <h4 className="font-bold text-sm text-emerald-700 dark:text-emerald-400 border-b border-zinc-100 dark:border-zinc-800 pb-2">كتابة مواقيت الصلاة اليدوية (صيغة 24 ساعة، مثل: 13:45)</h4>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {['Fajr', 'Shuruq', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((key) => {
                      const times = { ...prayer.manualTimes };
                      return (
                        <div key={key} className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/40 text-center">
                          <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1">
                            {key === 'Fajr' ? 'الفجر' : key === 'Shuruq' ? 'الشروق' : key === 'Dhuhr' ? 'الظهر' : key === 'Asr' ? 'العصر' : key === 'Maghrib' ? 'المغرب' : 'العشاء'}
                          </label>
                          <input 
                            type="text" 
                            placeholder="04:30"
                            value={times[key as keyof typeof times] || ''}
                            onChange={e => {
                              const newTimes = { ...prayer.manualTimes };
                              newTimes[key as keyof typeof times] = e.target.value;
                              setPrayer({ ...prayer, manualTimes: newTimes });
                            }}
                            className="w-20 text-center text-xs font-mono font-bold bg-white dark:bg-zinc-900 border border-zinc-200 rounded px-1 py-1"
                            required
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-4">
                <button 
                  type="submit" 
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ مواقيت الصلاة</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Announcements Manager */}
        {activeTab === 'announcements' && (
          <div className="animate-fade-in flex flex-col gap-6">
            <div>
              <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white">إدارة الإعلانات والتنبيهات</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">نشر إعلانات جديدة للمصلين، أو تعطيل/تفعيل الإعلانات المنشورة وتعديلها.</p>
            </div>

            {/* Create Announcement Form */}
            <form onSubmit={handleAddAnnouncement} className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
              <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">إضافة إعلان وتنبيه جديد</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">عنوان الإعلان</label>
                  <input 
                    type="text" 
                    placeholder="مثال: صلاة عيد الفطر المبارك"
                    value={newAnn.title}
                    onChange={e => setNewAnn({ ...newAnn, title: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">رابط صورة توضيحية (اختياري)</label>
                  <input 
                    type="url" 
                    placeholder="رابط الصورة المباشر"
                    value={newAnn.imageUrl}
                    onChange={e => setNewAnn({ ...newAnn, imageUrl: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">نص الإعلان بالتفصيل</label>
                <textarea 
                  rows={3}
                  placeholder="اكتب تفاصيل الإعلان هنا للمصلين..."
                  value={newAnn.content}
                  onChange={e => setNewAnn({ ...newAnn, content: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 p-4 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  required
                />
              </div>

              <div className="flex justify-end mt-2">
                <button 
                  type="submit" 
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>نشر الإعلان</span>
                </button>
              </div>
            </form>

            {/* List Announcements */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-zinc-150 dark:border-zinc-800/50">
                <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">الإعلانات والتعميمات المنشورة حالياً</h4>
              </div>

              {announcements.length > 0 ? (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        {ann.imageUrl && (
                          <img 
                            src={ann.imageUrl} 
                            alt={ann.title} 
                            className="w-16 h-12 object-cover rounded-lg bg-zinc-800 shrink-0 border border-zinc-200 dark:border-zinc-700"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${ann.isActive ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}></span>
                            <h5 className="font-bold text-sm text-zinc-900 dark:text-white">{ann.title}</h5>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1">{ann.content}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleAnnActive(ann.id, ann.isActive)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            ann.isActive 
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400' 
                              : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}
                        >
                          {ann.isActive ? 'نشط' : 'معطل'}
                        </button>

                        <button
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 transition-colors"
                          title="حذف الإعلان"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-500">لا توجد إعلانات منشورة بعد.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Lectures Manager */}
        {activeTab === 'lectures' && (
          <div className="animate-fade-in flex flex-col gap-6">
            <div>
              <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white">إدارة الخطب والمحاضرات</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">تسجيل الخطب الأسبوعية والدروس وربطها بقناة يوتيوب المسجد الرسمية.</p>
            </div>

            {/* Create/Edit Lecture Form */}
            <form onSubmit={handleAddLecture} className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
              <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                {editingLectureId ? 'تعديل المحاضرة الحالية' : 'إضافة درس/خطبة جديدة'}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">رابط الفيديو من اليوتيوب</label>
                  <div className="flex gap-2">
                    <input 
                      type="url" 
                      placeholder="https://youtu.be/..."
                      value={newLec.youtubeUrl}
                      onChange={e => setNewLec({ ...newLec, youtubeUrl: e.target.value })}
                      onBlur={() => {
                        if (newLec.youtubeUrl && (!newLec.title.trim() || !newLec.description.trim())) {
                          fetchYouTubeMeta(newLec.youtubeUrl);
                        }
                      }}
                      className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => fetchYouTubeMeta(newLec.youtubeUrl)}
                      className="shrink-0 bg-zinc-850 hover:bg-zinc-850 text-white font-bold text-[10px] px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 border border-zinc-700 hover:bg-zinc-800"
                      disabled={loadingMeta}
                    >
                      {loadingMeta ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span>جلب تلقائي</span>
                      )}
                    </button>
                  </div>
                  <span className="text-[9px] text-zinc-400 mt-1 block">يدعم روابط shorts/ و youtu.be/ و watch?v=</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">عنوان الخطبة/الدرس (اختياري، يتم جلبه تلقائياً)</label>
                  <input 
                    type="text" 
                    placeholder="مثال: خطبة الجمعة - فضل طاعة الوالدين"
                    value={newLec.title}
                    onChange={e => setNewLec({ ...newLec, title: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">اسم الشيخ/المحاضر</label>
                  <input 
                    type="text" 
                    value={newLec.sheikh}
                    onChange={e => setNewLec({ ...newLec, sheikh: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">ملاحظة/تفاصيل موجزة (اختياري، يتم جلبه تلقائياً)</label>
                  <input 
                    type="text" 
                    placeholder="اكتب ملاحظة أو وصف بسيط هنا..."
                    value={newLec.description}
                    onChange={e => setNewLec({ ...newLec, description: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">رابط صورة المعاينة المصغرة (اختياري، يتم جلبه تلقائياً)</label>
                  <input 
                    type="url" 
                    placeholder="سيتم ملء هذا الحقل تلقائياً عند إدخال رابط يوتيوب صالح"
                    value={newLec.thumbnailUrl}
                    onChange={e => setNewLec({ ...newLec, thumbnailUrl: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">رابط الصوت MP3 مباشر (اختياري)</label>
                  <input 
                    type="url" 
                    placeholder="رابط مباشر من أرشيف الإنترنت أو غيره..."
                    value={newLec.mp3Url}
                    onChange={e => setNewLec({ ...newLec, mp3Url: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>

                {/* Categories Multi-Select Checkboxes */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 dark:text-zinc-400">التصنيفات المرتبطة</label>
                  {categories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => {
                        const checked = newLec.categoryIds.includes(cat.id);
                        return (
                          <label key={cat.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer select-none transition-all ${
                            checked 
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-400' 
                              : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900'
                          }`}>
                            <input 
                              type="checkbox"
                              checked={checked}
                              className="hidden"
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                const updatedIds = isChecked
                                  ? [...newLec.categoryIds, cat.id]
                                  : newLec.categoryIds.filter(id => id !== cat.id);
                                setNewLec({ ...newLec, categoryIds: updatedIds });
                              }}
                            />
                            <span>{cat.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400">لا توجد تصنيفات بعد. أضفها أولاً من تبويب إدارة التصنيفات.</p>
                  )}
                </div>
              </div>

              {/* YouTube Thumbnail Realtime Preview */}
              {(newLec.thumbnailUrl || (newLec.youtubeUrl && getYouTubeId(newLec.youtubeUrl))) && (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-150 dark:border-zinc-800/80 flex items-center gap-4">
                  <img 
                    src={newLec.thumbnailUrl || getYouTubeThumbnail(newLec.youtubeUrl)} 
                    alt="Preview" 
                    className="w-24 aspect-video object-cover rounded-lg bg-zinc-800 shrink-0" 
                  />
                  <div>
                    <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-max">
                      <YoutubeIcon className="w-3 h-3 fill-current" />
                      معاينة الصورة المصغرة
                    </span>
                    <p className="text-[10px] text-zinc-400 mt-1">يتم الكشف وتحديث الصورة المصغرة للفيديو تلقائياً.</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-2">
                {editingLectureId && (
                  <button 
                    type="button"
                    onClick={handleCancelEditLecture}
                    className="flex items-center gap-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
                  >
                    <span>إلغاء التعديل</span>
                  </button>
                )}
                <button 
                  type="submit" 
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-colors"
                >
                  {editingLectureId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{editingLectureId ? 'تحديث المحاضرة' : 'إضافة المحاضرة'}</span>
                </button>
              </div>
            </form>

            {/* List Lectures */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-zinc-150 dark:border-zinc-800/50">
                <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">الخطب والمحاضرات المسجلة حالياً</h4>
              </div>

              {lectures.length > 0 ? (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {lectures.map((lec) => (
                    <div key={lec.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                      <div className="flex items-center gap-4">
                        <img 
                          src={lec.thumbnailUrl || getYouTubeThumbnail(lec.youtubeUrl)} 
                          alt={lec.title} 
                          className="w-16 md:w-20 aspect-video object-cover rounded-lg bg-zinc-800 shrink-0" 
                        />
                        <div>
                          <h5 className="font-bold text-xs md:text-sm text-zinc-900 dark:text-white leading-snug line-clamp-1">{lec.title}</h5>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[10px] text-zinc-400 font-medium">بصوت/إلقاء: {lec.sheikh}</span>
                            {lec.categoryIds && lec.categoryIds.length > 0 && (
                              <div className="flex gap-1">
                                {lec.categoryIds.map(cId => {
                                  const cat = categories.find(c => c.id === cId);
                                  return cat ? (
                                    <span key={cId} className="text-[9px] bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
                                      {cat.name}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => handleEditLecture(lec)}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 transition-colors"
                          title="تعديل الدرس"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLecture(lec.id)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 transition-colors"
                          title="حذف الدرس"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-500">لا توجد محاضرات مسجلة بعد.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab Categories Manager */}
        {activeTab === 'categories' && (
          <div className="animate-fade-in flex flex-col gap-6">
            <div>
              <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white">إدارة تصنيفات المحاضرات</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">تحديد وتعديل التصنيفات المختلفة لتسهيل البحث والفرز للمحاضرات والخطب.</p>
            </div>

            {/* Create Category Form */}
            <form onSubmit={handleAddCategory} className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
              <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">إضافة تصنيف جديد</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">اسم التصنيف</label>
                  <input 
                    type="text" 
                    placeholder="مثال: خطب الجمعة، التلاوات..."
                    value={newCategory.name}
                    onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">الرابط اللطيف (Slug) - اختياري (يتم توليده تلقائياً)</label>
                  <input 
                    type="text" 
                    placeholder="مثال: friday-sermons"
                    value={newCategory.slug}
                    onChange={e => setNewCategory({ ...newCategory, slug: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">ترتيب العرض (Sort Order)</label>
                  <input 
                    type="number" 
                    min="1"
                    placeholder="1"
                    value={newCategory.sortOrder || ''}
                    onChange={e => setNewCategory({ ...newCategory, sortOrder: parseInt(e.target.value) || 999 })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-2">
                <button 
                  type="submit" 
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة التصنيف</span>
                </button>
              </div>
            </form>

            {/* List Categories */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-zinc-150 dark:border-zinc-800/50 flex justify-between items-center">
                <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">التصنيفات المتاحة حالياً</h4>
                <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-bold dark:bg-zinc-800 dark:text-zinc-400">
                  {categories.length} تصنيف
                </span>
              </div>

              {categories.length > 0 ? (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {categories.map((cat) => (
                    <div key={cat.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                      {editingCategoryId === cat.id ? (
                        /* Inline Edit Form */
                        <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
                          <div className="flex-1">
                            <input 
                              type="text" 
                              value={editingCategoryName}
                              onChange={e => setEditingCategoryName(e.target.value)}
                              className="w-full rounded-xl border border-emerald-500 px-3 py-2 text-xs focus:outline-none dark:bg-zinc-950"
                              placeholder="اسم التصنيف"
                              required
                            />
                          </div>
                          <div className="flex-1">
                            <input 
                              type="text" 
                              value={editingCategorySlug}
                              onChange={e => setEditingCategorySlug(e.target.value)}
                              className="w-full rounded-xl border border-emerald-500 px-3 py-2 text-xs focus:outline-none dark:bg-zinc-950"
                              placeholder="الرابط اللطيف (Slug)"
                            />
                          </div>
                          <div className="w-20">
                            <input 
                              type="number" 
                              min="1"
                              value={editingCategorySortOrder}
                              onChange={e => setEditingCategorySortOrder(parseInt(e.target.value) || 999)}
                              className="w-full rounded-xl border border-emerald-500 px-3 py-2 text-xs focus:outline-none dark:bg-zinc-950"
                              placeholder="ترتيب"
                            />
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSaveCategory(cat.id)}
                              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>حفظ</span>
                            </button>
                            <button
                              onClick={() => setEditingCategoryId(null)}
                              className="flex items-center gap-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-bold text-xs px-3 py-2 rounded-xl transition-all dark:bg-zinc-800 dark:text-zinc-300"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>إلغاء</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Standard View Row */
                        <>
                          <div className="flex-1">
                            <h5 className="font-bold text-sm text-zinc-900 dark:text-white leading-snug">{cat.name}</h5>
                            <span className="text-[10px] text-zinc-400 font-medium block mt-1">الرابط اللطيف (Slug): {cat.slug} · الترتيب: {cat.sortOrder ?? 999}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                              onClick={() => handleEditCategory(cat)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 transition-colors"
                              title="تعديل التصنيف"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 transition-colors"
                              title="حذف التصنيف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-500">لا توجد تصنيفات معرفة بعد.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Admins Manager */}
        {activeTab === 'admins' && (
          <div className="animate-fade-in flex flex-col gap-6">
            <div>
              <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white">إدارة المشرفين وصلاحيات الوصول</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">إضافة مشرفين جدد للمسجد وتحديد صلاحياتهم (مشرف عام / مشرف عادي) لحماية وتحديث محتوى الموقع.</p>
            </div>

            {/* Create Admin Form */}
            <form onSubmit={handleAddAdmin} className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
              <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                إضافة مشرف جديد للمسجد
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">البريد الإلكتروني للمشرف</label>
                  <input 
                    type="email" 
                    placeholder="example@gmail.com"
                    value={newAdminEmail}
                    onChange={e => setNewAdminEmail(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">كلمة المرور الافتراضية</label>
                  <input 
                    type="text" 
                    placeholder="123456"
                    value={newAdminPassword}
                    onChange={e => setNewAdminPassword(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 dark:text-zinc-400">صلاحية الوصول</label>
                  <select
                    value={newAdminRole}
                    onChange={e => setNewAdminRole(e.target.value as any)}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <option value="admin">مشرف (إدارة المحتوى والإعلانات)</option>
                    <option value="super_admin">مشرف عام (Super Admin)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end mt-2">
                <button 
                  type="submit" 
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-colors"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>إضافة المشرف الجديد</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* List Admins */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-zinc-150 dark:border-zinc-800/50 flex justify-between items-center">
                <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  المشرفون المسجلون حالياً
                </h4>
                <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-bold dark:bg-zinc-800 dark:text-zinc-400">
                  {admins.length} مشرفين
                </span>
              </div>

              {admins.length > 0 ? (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {admins.map((adm) => (
                    <div key={adm.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                      {editingAdminEmail === adm.email ? (
                        /* Inline Admin Password Editor */
                        <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
                          <div className="flex-1">
                            <span className="text-[10px] text-emerald-600 font-bold block mb-1">تعديل كلمة مرور المشرف: ({adm.email})</span>
                            <input 
                              type="text" 
                              value={editingAdminPassword}
                              onChange={e => setEditingAdminPassword(e.target.value)}
                              className="w-full rounded-xl border border-emerald-500 px-3 py-2 text-xs focus:outline-none dark:bg-zinc-950 dark:text-white"
                              placeholder="كلمة المرور الجديدة (6 أحرف/أرقام على الأقل)"
                              required
                            />
                          </div>
                          <div className="flex gap-1 items-end">
                            <button
                              onClick={() => handleSaveAdminPassword(adm.email)}
                              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>حفظ</span>
                            </button>
                            <button
                              onClick={() => {
                                setEditingAdminEmail(null);
                                setEditingAdminPassword('');
                              }}
                              className="flex items-center gap-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-bold text-xs px-3 py-2 rounded-xl transition-all dark:bg-zinc-800 dark:text-zinc-300"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>إلغاء</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Standard View Row */
                        <>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-sm text-zinc-900 dark:text-white leading-snug">{adm.email || 'بدون بريد'}</h5>
                              {adm.email && currentAdminEmail && adm.email.toLowerCase() === currentAdminEmail.toLowerCase() && (
                                <span className="text-[8px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-bold animate-pulse">أنت حالياً</span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5">
                              <span className="text-[10px] text-zinc-400 font-medium">
                                الدور: {adm.role === 'super_admin' ? 'مشرف عام (Super Admin)' : 'مشرف (Admin)'}
                              </span>
                              {currentAdminRole === 'super_admin' && (
                                <span className="text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-lg border border-zinc-200/40 dark:border-zinc-700/40 font-mono">
                                  كلمة المرور: <span className="font-bold text-emerald-600 dark:text-emerald-400">{adm.password || '123456'}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {currentAdminRole === 'super_admin' && (
                              <button
                                onClick={() => {
                                  setEditingAdminEmail(adm.email);
                                  setEditingAdminPassword(adm.password || '123456');
                                }}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 transition-colors"
                                title="تعديل كلمة المرور"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteAdmin(adm.email)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                adm.email && currentAdminEmail && adm.email.toLowerCase() === currentAdminEmail.toLowerCase() 
                                  ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600'
                                  : 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400'
                              }`}
                              title="حذف المشرف"
                              disabled={!!(adm.email && currentAdminEmail && adm.email.toLowerCase() === currentAdminEmail.toLowerCase())}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-500">لا يوجد مشرفين مسجلين بعد.</div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* 4. Change Password Modal (For Logged-in Admin) */}
      {isChangingPasswordModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans"
          onClick={() => {
            setIsChangingPasswordModalOpen(false);
            setMyNewPassword('');
            setMyConfirmPassword('');
            setMyPasswordError('');
            setMyPasswordSuccess('');
          }}
        >
          <div 
            className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/80 rounded-3xl p-6 shadow-2xl w-full max-w-md flex flex-col gap-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => {
                setIsChangingPasswordModalOpen(false);
                setMyNewPassword('');
                setMyConfirmPassword('');
                setMyPasswordError('');
                setMyPasswordSuccess('');
              }}
              className="absolute top-4 left-4 p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/10 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-white leading-snug">تغيير كلمة المرور الخاصة بي</h3>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">تغيير كلمة مرور المشرف الحالي: {currentAdminEmail}</p>
              </div>
            </div>

            {myPasswordError && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl p-3 flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{myPasswordError}</span>
              </div>
            )}

            {myPasswordSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl p-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{myPasswordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveMyPassword} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">كلمة المرور الجديدة</label>
                <input 
                  type="password"
                  value={myNewPassword}
                  onChange={(e) => setMyNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none"
                  placeholder="أدخل 6 أحرف/أرقام على الأقل"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">تأكيد كلمة المرور الجديدة</label>
                <input 
                  type="password"
                  value={myConfirmPassword}
                  onChange={(e) => setMyConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none"
                  placeholder="أعد إدخال كلمة المرور لتأكيدها"
                  required
                />
              </div>

              <div className="flex gap-2.5 mt-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                <button
                  type="submit"
                  disabled={isSavingMyPassword}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-lg hover:shadow-emerald-600/10 disabled:opacity-50"
                >
                  {isSavingMyPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>حفظ كلمة المرور الجديدة</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPasswordModalOpen(false);
                    setMyNewPassword('');
                    setMyConfirmPassword('');
                    setMyPasswordError('');
                    setMyPasswordSuccess('');
                  }}
                  className="bg-zinc-150 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Accessibility Widget */}
      <AccessibilityWidget />

    </div>
  );
}
