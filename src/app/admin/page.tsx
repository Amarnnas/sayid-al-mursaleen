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
  deleteLecture,
  getYouTubeId,
  getYouTubeThumbnail,
  getAdmins,
  addAdmin,
  deleteAdmin,
  checkAdminEmail,
  isFirebaseConfigured
} from '../../lib/firebase/db';
import { GeneralSettings, PrayerSettings, Announcement, Lecture, Admin } from '../../lib/types';
import { auth } from '../../lib/firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Toast from '../../components/Toast';
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
  Timer
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
  const [activeTab, setActiveTab] = useState<'general' | 'prayer' | 'announcements' | 'lectures' | 'admins'>('general');

  // --- Settings States ---
  const [general, setGeneral] = useState<GeneralSettings | null>(null);
  const [prayer, setPrayer] = useState<PrayerSettings | null>(null);
  
  // --- Lists States ---
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  
  // --- Form Insertion States ---
  const [newAnn, setNewAnn] = useState({ title: '', content: '', imageUrl: '' });
  const [newLec, setNewLec] = useState({ title: '', sheikh: 'خطيب المسجد', youtubeUrl: '', description: '', thumbnailUrl: '' });
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'super_admin' | 'admin'>('admin');

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
      try {
        const genData = await getGeneralSettings();
        const prayData = await getPrayerSettings();
        const annData = await getAnnouncements(false); // get both active and inactive
        const lecData = await getLectures();
        const admData = await getAdmins();

        setGeneral(genData);
        setPrayer(prayData);
        setAnnouncements(annData);
        setLectures(lecData);
        setAdmins(admData);
      } catch (e) {
        console.error("Failed fetching admin data:", e);
        setErrorMsg("حدث خطأ أثناء تحميل بيانات المسجد.");
      } finally {
        setLoading(false);
      }
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

  // Handle Sign In - Firebase Auth only (no mock/demo)
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
    
    // Real Firebase Auth Flow
    setIsLoggingIn(true);
    try {
      // Check if email is in Firestore admins collection with timeout
      const adminRecord = await withTimeout(
        checkAdminEmail(email),
        LOGIN_TIMEOUT_MS,
        "فشلت عملية التحقق من حساب المشرف بسبب انتهاء مهلة الاتصال بالخادم. يرجى التحقق من الشبكة."
      );
      
      if (!adminRecord) {
        setLoginError('عذراً، هذا البريد الإلكتروني غير مسجل كمشرف في النظام.');
        setIsLoggingIn(false);
        return;
      }
      
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      
      try {
        await withTimeout(
          signInWithEmailAndPassword(auth, email, password),
          LOGIN_TIMEOUT_MS,
          "انتهت مهلة تسجيل الدخول. يرجى التحقق من اتصال الإنترنت وحالة خادم Firebase."
        );
        setSuccessMsg("تم تسجيل الدخول بنجاح!");
      } catch (err: any) {
        console.warn("Sign-in failed with error code:", err.code);
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-email') {
          setShowActivationConfirm(true);
        } else {
          setLoginError(err.message || 'فشل تسجيل الدخول. تأكد من صحة البريد الإلكتروني وكلمة المرور.');
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
      } else {
        setLoginError(e.message || 'حدث خطأ أثناء تسجيل الدخول عبر Google.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // First-Time account registration & password activation
  const handleFirstTimeActivate = async () => {
    const email = username.trim();
    setLoginError('');
    setShowActivationConfirm(false);
    setIsLoggingIn(true);
    
    try {
      const adminRecord = await withTimeout(
        checkAdminEmail(email),
        LOGIN_TIMEOUT_MS,
        "انتهت مهلة التحقق من صلاحيات تفعيل الحساب."
      );
      
      if (!adminRecord) {
        setLoginError('عذراً، هذا البريد الإلكتروني غير مصرح له بالدخول.');
        setIsLoggingIn(false);
        return;
      }
      
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      await withTimeout(
        createUserWithEmailAndPassword(auth, email, password),
        LOGIN_TIMEOUT_MS,
        "انتهت مهلة إنشاء وتفعيل الحساب. يرجى المحاولة مرة أخرى."
      );
      setSuccessMsg("تم تفعيل حسابك وتعيين كلمة المرور بنجاح!");
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setLoginError('هذا الحساب مفعل مسبقاً، كلمة المرور المدخلة غير صحيحة.');
      } else {
        setLoginError(err.message || 'تعذر تفعيل الحساب. يرجى إدخال كلمة مرور تتكون من 6 أحرف على الأقل.');
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
      await addAdmin(newAdminEmail.trim(), newAdminRole);
      setSuccessMsg("تم إضافة المشرف الجديد بنجاح!");
      setNewAdminEmail('');
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

  // Delete admin
  const handleDeleteAdmin = async (email: string) => {
    if (email.toLowerCase() === currentAdminEmail.toLowerCase()) {
      setErrorMsg("لا يمكنك حذف حسابك النشط الذي تسجل به الدخول حالياً.");
      return;
    }
    if (!window.confirm(`هل أنت متأكد من حذف المشرف (${email}) نهائياً؟`)) return;
    setLoading(true);
    try {
      await deleteAdmin(email);
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
        imageUrl: newAnn.imageUrl || undefined,
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

  // Add lecture
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
      
      await addLecture({
        title: finalTitle,
        sheikh: finalSheikh,
        youtubeUrl: newLec.youtubeUrl,
        description: finalDescription,
        createdAt: Date.now(),
        thumbnailUrl: finalThumbnail
      });
      
      setSuccessMsg("تمت إضافة المحاضرة/الخطبة بنجاح!");
      setNewLec({ title: '', sheikh: 'خطيب المسجد', youtubeUrl: '', description: '', thumbnailUrl: '' });
      
      // Reload lectures list
      const updated = await getLectures();
      setLectures(updated);
    } catch (e) {
      console.error(e);
      setErrorMsg("فشل إضافة المحاضرة.");
    } finally {
      setLoading(false);
    }
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
              <label className="block text-xs font-bold text-zinc-500 mb-1.5 dark:text-zinc-400">البريد الإلكتروني للمشرف</label>
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
              <label className="block text-xs font-bold text-zinc-500 mb-1.5 dark:text-zinc-400">كلمة المرور</label>
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

            {showActivationConfirm && (
              <div className="flex flex-col gap-2.5 bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400 text-xs">
                <p className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  هل تود تفعيل هذا الحساب وتعيين كلمة المرور؟
                </p>
                <p className="text-[10px] leading-relaxed">البريد الإلكتروني مصرح له بالدخول، ولكن لم يتم تفعيل حسابه بعد بكلمة مرور. هل تود استخدام كلمة المرور المدخلة لتفعيل حسابك الآن؟</p>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={handleFirstTimeActivate}
                    disabled={isLoggingIn}
                    className="bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    نعم، تفعيل وتعيين كلمة المرور
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowActivationConfirm(false)}
                    className="bg-zinc-200 text-zinc-700 font-bold px-3 py-1.5 rounded-lg hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
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
      <aside className="w-full md:w-64 bg-zinc-900 text-zinc-300 flex flex-col shrink-0 border-l border-zinc-800">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img 
              src={general.logoUrl || '/logo.png'} 
              alt="شعار المسجد" 
              className="h-8 w-8 object-contain rounded-lg bg-white/10 p-0.5"
            />
            <div>
              <h2 className="font-extrabold text-sm text-white truncate max-w-[140px]">{general.mosqueName}</h2>
              <span className="text-[10px] text-zinc-400 font-medium">لوحة المشرفين</span>
            </div>
          </div>
        </div>

        {/* Tab Switchers */}
        <nav className="flex-1 p-4 flex flex-col gap-1.5">
          <button 
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'general' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10' 
                : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
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
                : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
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
                : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
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
                : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>إدارة الخطب والمحاضرات</span>
          </button>

          <button 
            onClick={() => setActiveTab('admins')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'admins' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10' 
                : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>إدارة المشرفين</span>
          </button>
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-zinc-800 flex flex-col gap-2">
          <Link 
            href="/"
            className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2.5 rounded-xl text-xs font-semibold transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span>عرض موقع المسجد</span>
          </Link>

          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 bg-red-950/30 hover:bg-red-950/60 text-red-400 py-2.5 rounded-xl text-xs font-semibold border border-red-900/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* 3. Main Dashboard Work Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-5xl mx-auto w-full">
        
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
                  <label className="block text-xs font-bold text-zinc-500 mb-2 dark:text-zinc-400">اسم المسجد الرسمي</label>
                  <input 
                    type="text" 
                    value={general.mosqueName}
                    onChange={e => setGeneral({ ...general, mosqueName: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-2 dark:text-zinc-400">هاتف التواصل</label>
                  <input 
                    type="text" 
                    value={general.contactPhone}
                    onChange={e => setGeneral({ ...general, contactPhone: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-2 dark:text-zinc-400">الوصف التعريفي للمسجد</label>
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
                    <label className="block text-xs font-bold text-zinc-500 mb-1.5 dark:text-zinc-400">قناة اليوتيوب الرسمية</label>
                    <input 
                      type="url" 
                      value={general.youtubeChannel}
                      onChange={e => setGeneral({ ...general, youtubeChannel: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1.5 dark:text-zinc-400">رابط مجموعة الواتساب</label>
                    <input 
                      type="url" 
                      value={general.whatsappLink}
                      onChange={e => setGeneral({ ...general, whatsappLink: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1.5 dark:text-zinc-400">صفحة الفيسبوك</label>
                    <input 
                      type="url" 
                      value={general.facebookLink}
                      onChange={e => setGeneral({ ...general, facebookLink: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1.5 dark:text-zinc-400">رابط البث المباشر (يوتيوب/فيسبوك)</label>
                    <input 
                      type="url" 
                      placeholder="رابط البث المباشر النشط"
                      value={general.liveStreamUrl}
                      onChange={e => setGeneral({ ...general, liveStreamUrl: e.target.value })}
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
                      <label className="block text-xs font-bold text-zinc-500 mb-1.5 dark:text-zinc-400">خط العرض (Latitude)</label>
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
                      <label className="block text-xs font-bold text-zinc-500 mb-1.5 dark:text-zinc-400">خط الطول (Longitude)</label>
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
                      <label className="block text-xs font-bold text-zinc-500 mb-1.5 dark:text-zinc-400">طريقة الحساب الفلكي</label>
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
                      <label className="block text-xs font-bold text-zinc-500 mb-1.5 dark:text-zinc-400">المذهب الفقهي (لصلاة العصر)</label>
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
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5 dark:text-zinc-400">عنوان الإعلان</label>
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
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5 dark:text-zinc-400">رابط صورة توضيحية (اختياري)</label>
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
                <label className="block text-xs font-bold text-zinc-500 mb-1.5 dark:text-zinc-400">نص الإعلان بالتفصيل</label>
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
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${ann.isActive ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}></span>
                          <h5 className="font-bold text-sm text-zinc-900 dark:text-white">{ann.title}</h5>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1">{ann.content}</p>
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

            {/* Create Lecture Form */}
            <form onSubmit={handleAddLecture} className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
              <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">إضافة درس/خطبة جديدة</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5 dark:text-zinc-400">رابط الفيديو من اليوتيوب</label>
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
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5 dark:text-zinc-400">عنوان الخطبة/الدرس (اختياري، يتم جلبه تلقائياً)</label>
                  <input 
                    type="text" 
                    placeholder="مثال: خطبة الجمعة - فضل طاعة الوالدين"
                    value={newLec.title}
                    onChange={e => setNewLec({ ...newLec, title: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5 dark:text-zinc-400">اسم الشيخ/المحاضر</label>
                  <input 
                    type="text" 
                    value={newLec.sheikh}
                    onChange={e => setNewLec({ ...newLec, sheikh: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5 dark:text-zinc-400">ملاحظة/تفاصيل موجزة (اختياري، يتم جلبه تلقائياً)</label>
                  <input 
                    type="text" 
                    placeholder="اكتب ملاحظة أو وصف بسيط هنا..."
                    value={newLec.description}
                    onChange={e => setNewLec({ ...newLec, description: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5 dark:text-zinc-400">رابط صورة المعاينة المصغرة (اختياري، يتم جلبه تلقائياً)</label>
                  <input 
                    type="url" 
                    placeholder="سيتم ملء هذا الحقل تلقائياً عند إدخال رابط يوتيوب صالح"
                    value={newLec.thumbnailUrl}
                    onChange={e => setNewLec({ ...newLec, thumbnailUrl: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  />
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

              <div className="flex justify-end mt-2">
                <button 
                  type="submit" 
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة المحاضرة</span>
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
                          <span className="text-[10px] text-zinc-400 font-medium block mt-1">بصوت/إلقاء: {lec.sheikh}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteLecture(lec.id)}
                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 transition-colors self-end sm:self-center"
                        title="حذف الدرس"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-500">لا توجد محاضرات مسجلة بعد.</div>
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5 dark:text-zinc-400">البريد الإلكتروني للمشرف (بريد Google أو بريد صالح للتفعيل)</label>
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
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5 dark:text-zinc-400">صلاحية الوصول</label>
                  <select
                    value={newAdminRole}
                    onChange={e => setNewAdminRole(e.target.value as any)}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <option value="admin">مشرف (إدارة المحتوى والإعلانات والمواقيت)</option>
                    <option value="super_admin">مشرف عام (إدارة المشرفين + صلاحيات كاملة)</option>
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
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${adm.role === 'super_admin' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'}`}>
                          {adm.role === 'super_admin' ? <ShieldCheck className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-sm text-zinc-900 dark:text-white leading-snug">{adm.email}</h5>
                            {adm.email.toLowerCase() === currentAdminEmail.toLowerCase() && (
                              <span className="text-[8px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-bold animate-pulse">أنت حالياً</span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400 font-medium block mt-1">
                            الدور: {adm.role === 'super_admin' ? 'مشرف عام (Super Admin)' : 'مشرف (Admin)'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteAdmin(adm.email)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          adm.email.toLowerCase() === currentAdminEmail.toLowerCase() 
                            ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600'
                            : 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400'
                        }`}
                        title="حذف المشرف"
                        disabled={adm.email.toLowerCase() === currentAdminEmail.toLowerCase()}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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

    </div>
  );
}
