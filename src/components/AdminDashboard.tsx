import { useState, useEffect } from 'react';
import { 
  X, 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Settings, 
  Image as ImageIcon,
  MessageSquare,
  Plus,
  Lock,
  Mail,
  RefreshCw,
  Save,
  Globe,
  MapPin,
  Edit,
  Trash2,
  Upload,
  Award,
  Coffee,
  Camera,
  Heart,
  History,
  AlignLeft,
  AlignRight,
  Mic,
  Search,
  ChevronUp,
  ChevronDown,
  Instagram,
  Calendar,
  AlertCircle,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { collection, query, getDocs, updateDoc, doc, getDoc, setDoc, addDoc, deleteDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
} from "@/components/ui/dialog";
import { updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { toast } from 'sonner';
import { AppConfig } from '@/types';
import { handleFirestoreError, OperationType, onQuotaError } from '@/lib/firestore-errors';

const compressImage = (base64Str: string, maxWidth = 1200, maxHeight = 1200, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64Str);
  });
};

export default function AdminDashboard({ onExit }: { onExit: () => void }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [orders, setOrders] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [scheduleImages, setScheduleImages] = useState<any[]>([]);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [editingReview, setEditingReview] = useState<any | null>(null);
  const [isClassSaving, setIsClassSaving] = useState(false);
  const [isReviewSaving, setIsReviewSaving] = useState(false);

  // Account settings state
  const [newEmail, setNewEmail] = useState(auth.currentUser?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Listen for quota errors
    const unsubscribeQuota = onQuotaError((isExceeded) => {
      setIsQuotaExceeded(isExceeded);
      if (isExceeded) {
        toast.error("Firestore 할당량이 초과되었습니다. 일부 데이터가 표시되지 않거나 저장이 실패할 수 있습니다.");
      }
    });

    const fetchData = async () => {
      try {
        const isAdminCheck = await getDoc(doc(db, 'admins', auth.currentUser?.uid || 'none'));
        const isUserAdmin = isAdminCheck.exists();
        setIsAdmin(isUserAdmin);

        if (isUserAdmin) {
          const qOrders = query(collection(db, 'orders'));
          const snapOrders = await getDocs(qOrders);
          setOrders(snapOrders.docs.map(d => ({ id: d.id, ...d.data() })));
        }

        const qClasses = query(collection(db, 'classes'));
        const snapClasses = await getDocs(qClasses);
        setClasses(snapClasses.docs.map(d => ({ id: d.id, ...d.data() })));

        const qReviews = query(collection(db, 'reviews'));
        const snapReviews = await getDocs(qReviews);
        setReviews(snapReviews.docs.map(d => ({ id: d.id, ...d.data() })));

        const qSchedule = query(collection(db, 'schedule_images'), orderBy('createdAt', 'desc'));
        const snapSchedule = await getDocs(qSchedule);
        setScheduleImages(snapSchedule.docs.map(d => ({ id: d.id, ...d.data() })));

        const qGallery = query(collection(db, 'sns_gallery'), orderBy('createdAt', 'desc'));
        const snapGallery = await getDocs(qGallery);
        setGalleryImages(snapGallery.docs.map(d => ({ id: d.id, ...d.data() })));

        const [configDoc, mediaDoc, heroDoc, aboutDoc] = await Promise.all([
          getDoc(doc(db, 'config', 'main')),
          getDoc(doc(db, 'config', 'media')),
          getDoc(doc(db, 'config', 'hero')),
          getDoc(doc(db, 'config', 'about'))
        ]);
        
        if (configDoc.exists()) {
          const mainData = configDoc.data() as AppConfig;
          const mediaData = mediaDoc.exists() ? mediaDoc.data() : { freeRecipeMedia: mainData.freeRecipeMedia };
          const heroData = heroDoc.exists() ? heroDoc.data() : { hero: mainData.hero };
          const aboutData = aboutDoc.exists() ? aboutDoc.data() : { about: mainData.about };
          
          setConfig({
            ...mainData,
            freeRecipeMedia: (mediaData as any).freeRecipeMedia || mainData.freeRecipeMedia,
            hero: (heroData as any).hero || (heroData as any) || mainData.hero,
            about: (aboutData as any).about || (aboutData as any) || mainData.about
          });
        } else {
          // Default config if none exists
          const defaultConfig: AppConfig = {
            hero: {
              title: "프랑스에서 유학한\n프로 셰프의 감각적인 공간",
              subtitle: "L'ecole Caku Baking Studio",
              image: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&q=80&w=2000"
            },
            about: {
              title: "18년의 업력, \n최고 수준의 베이킹 아카이빙",
              content: "레꼴케이쿠는 단순한 베이킹 스튜디오를 넘어, 18년간 축적된 최고 수준의 브랜드 자산을 공유하는 공간입니다. 프랑스 에꼴 르노뜨르 유학파 셰프 함정임의 감각이 담긴 레시피와 클래스를 통해 깊이 있는 디저트 세계를 경험해 보세요.",
              image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1000"
            },
            gnbMenus: [
              { title: 'ABOUT', path: '#about' },
              { title: 'SCHEDULE', path: '#schedule' },
              { title: 'CLASSES', path: '#classes' },
              { title: 'ARCHIVE', path: '#archive' },
              { title: 'RECIPE', path: '#recipes' },
              { title: 'CONTACT', path: '#contact' },
            ],
            logo: {
              text: "L'ecole Caku",
              circleText: "LC",
              imageUrl: ""
            },
            footer: {
              title: "L'ecole Caku",
              address: "레꼴케이쿠 베이킹 스튜디오 | 대표: 함정임",
              copyright: "© 2026 L'ecole Caku. All Rights Reserved."
            },
            socialLinks: {
              instagram: "lecole_caku",
              youtube: "",
              blog: ""
            },
            themeColor: "#D4C7B0",
            mapInfo: {
              title: "스튜디오 오시는 길",
              lat: 37.66,
              lng: 126.77,
              address: "경기도 고양시 일산동구 정발산동...",
              parking: "스튜디오 건물 내 1대 주차 가능하며, 도보 3분 거리에 공영주차장이 위치해 있습니다.",
              walkInfo: "정발산역 1번 출구에서 밤가시마을 공원을 따라 걷는 쾌적한 산책로를 권장합니다.",
              buttonText: "상담 및 신청하기",
              buttonLink: "",
              kakaoApiKey: ""
            },
            classList: {
              title: "시그니처 베이킹 클래스",
              subtitle: "BAKING CLASSES"
            },
            schedule: {
              title: "이달의 클래스 스케줄",
              subtitle: "SCHEDULE",
              images: [
                "https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800"
              ]
            },
            reviews: {
              title: "Cinematic Moments",
              subtitle: "Student Stories"
            },
            freeRecipeMedia: {
              title: "무료 레시피 미디어",
              subtitle: "WATCH ON YOUTUBE →",
              videos: [
                { id: '1', title: '바닐라 빈 가득한 까눌레 레시피', description: "L'ecole Caku Free Recipe", youtubeUrl: 'https://www.youtube.com/watch?v=5f-_7n8WreM' },
                { id: '2', title: '실패 없는 딸기 쇼트케이크', description: "L'ecole Caku Free Recipe", youtubeUrl: 'https://www.youtube.com/watch?v=5f-_7n8WreM' },
                { id: '3', title: '초보자를 위한 마카롱 꼬끄 정복', description: "L'ecole Caku Free Recipe", youtubeUrl: 'https://www.youtube.com/watch?v=5f-_7n8WreM' },
              ]
            },
            history: {
              title: "18 Years of Heritage",
              subtitle: "Brand Narrative",
              items: [
                {
                  year: "2008",
                  title: "Le Cordon Bleu / Ecole Lenotre",
                  description: "프랑스 최고의 요리 학교 디플로마 취득 및 유학",
                  icon: 'Globe',
                  side: 'left'
                },
                {
                  year: "2012",
                  title: "첫 번째 베이킹 도서 출간",
                  description: "'손쉽게 즐기는 프랑스 디저트' 베스트셀러 등극",
                  side: 'right',
                  link: { text: "구매처 바로가기 →", url: "https://www.yes24.com" },
                  icon: 'Book'
                }
              ]
            }
          };
          setConfig(defaultConfig);
          const { freeRecipeMedia, hero, about, ...mainConfig } = defaultConfig;
          await Promise.all([
            setDoc(doc(db, 'config', 'main'), mainConfig),
            setDoc(doc(db, 'config', 'media'), { freeRecipeMedia }),
            setDoc(doc(db, 'config', 'hero'), { hero }),
            setDoc(doc(db, 'config', 'about'), { about })
          ]);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'admin-fetch-data');
      }
    };
    fetchData();

    return () => {
      unsubscribeQuota();
    };
  }, []);

  const findCoordinates = () => {
    if (!config?.mapInfo.address) {
      toast.error("주소를 먼저 입력해 주세요.");
      return;
    }
    if (!config?.mapInfo.kakaoApiKey) {
      toast.error("카카오 API 키를 먼저 입력해 주세요.");
      return;
    }

    const kakaoKey = config.mapInfo.kakaoApiKey.trim();
    const scriptId = 'kakao-map-script';
    let existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    // If key changed, we must reload the script
    if (existingScript && !existingScript.src.includes(`appkey=${kakaoKey}`)) {
      existingScript.remove();
      existingScript = null;
      if (window.kakao) {
        // We can't fully delete it because other parts might use it, but we can try to force reload
        try {
          delete (window as any).kakao;
        } catch (e) {}
      }
    }

    const performSearch = () => {
      if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
        toast.error("카카오 지도 서비스를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.addressSearch(config.mapInfo.address, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const newLat = parseFloat(result[0].y);
          const newLng = parseFloat(result[0].x);
          setConfig({
            ...config,
            mapInfo: {
              ...config.mapInfo,
              lat: newLat,
              lng: newLng
            }
          });
          toast.success("좌표를 성공적으로 찾았습니다. 하단의 'Commit Changes'를 눌러 저장해 주세요.");
        } else {
          toast.error("좌표를 찾을 수 없습니다. 주소를 확인해 주세요.");
        }
      });
    };

    if (!existingScript) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&libraries=services&autoload=false`;
      script.async = true;
      script.onload = () => {
        window.kakao.maps.load(performSearch);
      };
      script.onerror = () => {
        toast.error("카카오 지도 스크립트 로드에 실패했습니다. (1) 도메인 등록 (2) JavaScript 키 사용여부를 확인해 주세요.");
      };
      document.head.appendChild(script);
    } else {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(performSearch);
      } else {
        toast.error("지도를 초기화하는 중입니다. 잠시 후 다시 시도해 주세요.");
      }
    }
  };

  const handleUpdateConfig = async () => {
    if (!config) return;
    setIsSavingConfig(true);
    try {
      const { freeRecipeMedia, hero, about, ...mainConfig } = config;
      
      // DEPRECATION: Remove galleryImages if they somehow ended up here
      if ((mainConfig as any).instagramFeed?.galleryImages) {
        delete (mainConfig as any).instagramFeed.galleryImages;
      }
      
      // Basic size check for individual documents (1MB limit)
      const pieces = [
        { name: 'Main Config', data: mainConfig },
        { name: 'Media Config', data: { freeRecipeMedia } },
        { name: 'Hero Config', data: { hero } },
        { name: 'About Config', data: { about } }
      ];

      for (const piece of pieces) {
        const size = JSON.stringify(piece.data).length;
        if (size > 1000000) {
          toast.error(`${piece.name} 용량이 1MB를 초과합니다. 이미지를 더 작은 파일로 교체하거나 해상도를 조절해 주세요.`);
          setIsSavingConfig(false);
          return;
        }
      }
      
      await Promise.all([
        setDoc(doc(db, 'config', 'main'), mainConfig),
        setDoc(doc(db, 'config', 'media'), { freeRecipeMedia }),
        setDoc(doc(db, 'config', 'hero'), { hero }),
        setDoc(doc(db, 'config', 'about'), { about })
      ]);
      
      toast.success("사이트 설정이 저장되었습니다.");
    } catch (error: any) {
      if (error.message?.includes('permission') || error.code === 'permission-denied') {
        toast.error("관리자 권한이 없습니다. 계정 설정에서 관리자 등록을 확인해 주세요.");
      } else {
        handleFirestoreError(error, OperationType.WRITE, 'config/save');
        toast.error("저장에 실패했습니다.");
      }
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && config) {
      if (file.size > 2 * 1024 * 1024) { // 2MB Limit for Firestore
        toast.error("Logo icon image is too large. Please use a file smaller than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 400, 400, 0.8);
        setConfig({
          ...config, 
          logo: {
            ...(config.logo || {text: '', circleText: ''}), 
            imageUrl: compressed
          }
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !currentPassword) {
      toast.error("현재 비밀번호를 입력해야 변경이 가능합니다.");
      return;
    }

    setIsUpdating(true);
    try {
      // Re-authenticate first
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update Email if changed
      if (newEmail !== auth.currentUser.email) {
        await updateEmail(auth.currentUser, newEmail);
        toast.success("이메일(아이디)이 변경되었습니다.");
      }

      // Update Password if provided
      if (newPassword) {
        await updatePassword(auth.currentUser, newPassword);
        toast.success("비밀번호가 변경되었습니다.");
      }

      setNewPassword("");
      setCurrentPassword("");
    } catch (error: any) {
      console.error(error);
      toast.error("변경에 실패했습니다. 현재 비밀번호를 다시 확인해 주세요.");
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleClass = async (id: string, active: boolean) => {
    try {
      await updateDoc(doc(db, 'classes', id), { isActive: !active });
      setClasses(classes.map(c => c.id === id ? { ...c, isActive: !active } : c));
      toast.success("상태가 업데이트되었습니다.");
    } catch (e) {
      toast.error("업데이트 실패");
    }
  };

  const handleAddClass = async () => {
    try {
      const newClass = {
        title: "새로운 베이킹 클래스",
        price: 150000,
        isActive: false,
        thumbnail: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&q=80&w=2000",
        description: "클래스 설명을 입력해주세요.",
        category: "Baking",
        capacity: 4,
        dates: ["2026-05-01"],
        isSoldOut: false
      };
      const docRef = await addDoc(collection(db, 'classes'), newClass);
      setClasses([{ id: docRef.id, ...newClass }, ...classes]);
      toast.success("새로운 클래스가 추가되었습니다.");
      setEditingClass({ id: docRef.id, ...newClass }); // Open edit dialog immediately
    } catch (e) {
      toast.error("클래스 추가 실패");
    }
  };

  const handleSaveClass = async () => {
    if (!editingClass) return;
    setIsClassSaving(true);
    try {
      const { id, ...data } = editingClass;
      await updateDoc(doc(db, 'classes', id), data);
      setClasses(classes.map(c => c.id === id ? editingClass : c));
      toast.success("클래스 정보가 저장되었습니다.");
      setEditingClass(null);
    } catch (e) {
      toast.error("저장 실패");
    } finally {
      setIsClassSaving(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm("정말 이 클래스를 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, 'classes', id));
      setClasses(classes.filter(c => c.id !== id));
      toast.success("클래스가 삭제되었습니다.");
    } catch (e) {
      toast.error("삭제 실패");
    }
  };
  
  const handleAddReview = async () => {
    try {
      const newReview = {
        author: "익명 수강생",
        content: "수강평 내용을 입력해주세요.",
        isDisplayed: true,
        createdAt: new Date()
      };
      const docRef = await addDoc(collection(db, 'reviews'), newReview);
      setReviews([{ id: docRef.id, ...newReview }, ...reviews]);
      toast.success("새 수강평이 추가되었습니다.");
      setEditingReview({ id: docRef.id, ...newReview });
    } catch (e) {
      toast.error("수강평 추가 실패");
    }
  };

  const handleSaveReview = async () => {
    if (!editingReview) return;
    setIsReviewSaving(true);
    try {
      const { id, ...data } = editingReview;
      await updateDoc(doc(db, 'reviews', id), data);
      setReviews(reviews.map(r => r.id === id ? editingReview : r));
      toast.success("수강평이 저장되었습니다.");
      setEditingReview(null);
    } catch (e) {
      toast.error("저장 실패");
    } finally {
      setIsReviewSaving(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!confirm("정말 이 수강평을 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, 'reviews', id));
      setReviews(reviews.filter(r => r.id !== id));
      toast.success("수강평이 삭제되었습니다.");
    } catch (e) {
      toast.error("삭제 실패");
    }
  };

  const toggleReviewVisibility = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'reviews', id), { isDisplayed: !current });
      setReviews(reviews.map(r => r.id === id ? { ...r, isDisplayed: !current } : r));
      toast.success("노출 상태가 변경되었습니다.");
    } catch (e) {
      toast.error("상태 변경 실패");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB Limit for Base64 storage in Firestore
        toast.error("이미지 크기가 너무 큽니다. (2MB 이하 권장)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 1200, 1200, 0.7);
        setEditingClass({ ...editingClass, thumbnail: compressed });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-50 text-neutral-900 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-68 bg-white border-r border-neutral-200 p-8 flex flex-col gap-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-brand-accent flex items-center justify-center">
              <span className="text-[10px] text-brand-accent font-serif italic">LC</span>
            </div>
            <h2 className="text-lg font-serif font-light tracking-[0.2em] italic text-brand-accent">CMS</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onExit} className="hover:bg-neutral-100 text-neutral-400 rounded-full"><X className="w-4 h-4" /></Button>
        </div>
        
        <nav className="space-y-2">
          {[
            { icon: LayoutDashboard, label: "Overview", tab: "overview" },
            { icon: Globe, label: "Site Content", tab: "site-content" },
            { icon: History, label: "History & Timeline", tab: "history" },
            { icon: Calendar, label: "Classes & Schedule", tab: "class-schedule" },
            { icon: Play, label: "Free Recipe Media", tab: "free-recipes" },
            { icon: MessageSquare, label: "Review Management", tab: "reviews" },
            { icon: Users, label: "Registrations", tab: "orders" },
            { icon: Settings, label: "Account Profile", tab: "settings" },
          ].map((item) => (
            <button 
              key={item.label}
              onClick={() => setActiveTab(item.tab)}
              className={`w-full flex items-center text-left gap-4 px-5 py-4 text-[10px] uppercase tracking-[0.2em] font-medium rounded-sm transition-all duration-300 ${
                activeTab === item.tab 
                ? 'bg-neutral-900 text-white shadow-lg shadow-neutral-900/10' 
                : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <item.icon className={`w-4 h-4 flex-shrink-0 ${activeTab === item.tab ? 'text-brand-accent' : 'text-neutral-400'}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-8 border-t border-neutral-100">
          <p className="text-[8px] uppercase tracking-widest text-neutral-400 text-center">Version 1.2.0 Build 2026</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12 bg-neutral-50 relative">
        {isQuotaExceeded && (
          <div className="mb-8 bg-red-50 border border-red-200 p-4 rounded-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-red-900">Firestore Quota Exceeded</h4>
              <p className="text-xs text-red-700">The daily free tier limit for Firestore reads has been reached. Most management features will be unavailable until the quota resets (at 4PM KST).</p>
            </div>
          </div>
        )}
        <div className="max-w-6xl mx-auto">
          <header className="flex justify-between items-end mb-16">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-brand-accent mb-2">Management Archive</p>
              <h1 className="text-4xl font-serif italic font-light text-neutral-900">L'ecole <span className="text-neutral-600">Caku</span></h1>
            </div>
            {(activeTab === 'classes' || activeTab === 'class-schedule') && (
              <Button onClick={handleAddClass} className="bg-neutral-900 text-white uppercase tracking-widest gap-3 font-bold hover:bg-neutral-800 transition-colors h-12 px-8">
                <Plus className="w-5 h-5" />
                Add New Class
              </Button>
            )}
            {activeTab === 'reviews' && (
              <Button onClick={handleAddReview} className="bg-neutral-900 text-white uppercase tracking-widest gap-3 font-bold hover:bg-neutral-800 transition-colors h-12 px-8">
                <Plus className="w-5 h-5" />
                Add New Review
              </Button>
            )}
            {activeTab === 'history' && (
              <Button 
                onClick={() => setConfig({
                  ...config!, 
                  history: {
                    ...(config!.history || { title: '', subtitle: '', items: [] }),
                    items: [{ year: '2024', title: 'New Event', description: 'Description here', icon: 'Globe', side: 'left' }, ...(config!.history?.items || [])]
                  }
                })}
                className="bg-neutral-900 text-white uppercase tracking-widest gap-3 font-bold hover:bg-neutral-800 transition-colors h-12 px-8"
              >
                <Plus className="w-5 h-5" />
                Add New Event
              </Button>
            )}
          </header>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-12">
            <TabsContent value="overview" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="bg-white border-neutral-100 text-neutral-900 shadow-sm hover:border-brand-accent/30 transition-colors">
                  <CardHeader><CardTitle className="text-[10px] uppercase tracking-[0.3em] font-light text-neutral-400">Live Orders</CardTitle></CardHeader>
                  <CardContent><p className="text-5xl font-serif italic text-neutral-900">{orders.length}</p></CardContent>
                </Card>
                <Card className="bg-white border-neutral-100 text-neutral-900 shadow-sm hover:border-brand-accent/30 transition-colors">
                  <CardHeader><CardTitle className="text-[10px] uppercase tracking-[0.3em] font-light text-neutral-400">Active Sessions</CardTitle></CardHeader>
                  <CardContent><p className="text-5xl font-serif italic text-neutral-900">{classes.filter(c => c.isActive).length}</p></CardContent>
                </Card>
                <Card className="bg-white border-neutral-100 text-neutral-900 shadow-sm hover:border-brand-accent/30 transition-colors">
                  <CardHeader><CardTitle className="text-[10px] uppercase tracking-[0.3em] font-light text-neutral-400">Community Feedback</CardTitle></CardHeader>
                  <CardContent><p className="text-5xl font-serif italic text-neutral-900">12</p></CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="site-content" className="mt-0">
              {!config ? (
                <div className="p-20 text-center opacity-50 uppercase tracking-[0.5em] text-xs">Initializing Database...</div>
              ) : (
                <div className="space-y-12">
                  <div className="flex justify-between items-center bg-white p-8 rounded-sm border border-neutral-100 shadow-sm">
                    <div className="flex gap-10 items-center">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-widest text-brand-accent mb-1">Configuration</span>
                        <h3 className="text-xl font-serif italic text-neutral-900">Global Interface</h3>
                      </div>
                      <div className="h-10 w-px bg-neutral-100" />
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] px-3">LIVE SYNC</Badge>
                        <p className="text-[10px] text-neutral-400 uppercase tracking-widest">Everything is synced to cloud</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        onClick={handleUpdateConfig} 
                        disabled={isSavingConfig}
                        className="bg-neutral-900 text-white font-bold uppercase tracking-widest gap-3 h-11 px-8 hover:bg-neutral-800"
                      >
                        {isSavingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Commit Changes
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start">
                    {/* Navigation & Branding Card - Prominent at the top */}
                    <Card className="bg-white border-neutral-100 text-neutral-900 shadow-sm overflow-hidden group hover:border-brand-accent/50 transition-colors col-span-full mb-4">
                      <div className="h-1 bg-brand-accent opacity-10 group-hover:opacity-100 transition-opacity" />
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Globe className="w-4 h-4 text-brand-accent" />
                          <CardTitle className="text-xs uppercase tracking-[0.3em] font-light text-neutral-400">Navigation & Branding</CardTitle>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-light translate-y-[-4px]">Main navigation menu labels, paths, and logo settings.</p>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-neutral-50 pt-8 mt-4">
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Main Logo Text (Website Title)</Label>
                            <Input 
                              value={config.logo?.text || ""}
                              onChange={(e) => setConfig({...config, logo: {...(config.logo || {text: '', circleText: ''}), text: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm font-medium"
                              placeholder="e.g. L'ecole Caku"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Logo Icon Text</Label>
                              <Input 
                                value={config.logo?.circleText || ""}
                                onChange={(e) => setConfig({...config, logo: {...(config.logo || {text: '', circleText: ''}), circleText: e.target.value}})}
                                className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm uppercase"
                                placeholder="e.g. LC"
                                maxLength={3}
                              />
                            </div>
                            <div className="space-y-3">
                              <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Icon Preview</Label>
                              <div className="w-12 h-12 rounded-full bg-brand-ink text-white flex items-center justify-center text-[10px] font-bold">
                                {config.logo?.circleText || "LC"}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Logo Icon Image (Replaces Text)</Label>
                            <div className="grid grid-cols-[1fr,48px] gap-3">
                              <div className="flex flex-col gap-2">
                                <Input 
                                  value={config.logo?.imageUrl || ""}
                                  onChange={(e) => setConfig({...config, logo: {...(config.logo || {text: '', circleText: ''}), imageUrl: e.target.value}})}
                                  className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-xs font-mono"
                                  placeholder="Paste image URL..."
                                />
                                <div className="flex gap-2">
                                  <input 
                                    type="file" 
                                    id="logo-upload" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                  />
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-[10px] uppercase tracking-widest h-8"
                                    onClick={() => document.getElementById('logo-upload')?.click()}
                                  >
                                    <Upload className="w-3 h-3 mr-2" /> Upload Icon
                                  </Button>
                                </div>
                              </div>
                              <div className="w-12 h-12 rounded border border-neutral-100 bg-neutral-50 flex items-center justify-center overflow-hidden shrink-0">
                                {config.logo?.imageUrl ? (
                                  <img src={config.logo.imageUrl} className="w-full h-full object-contain" />
                                ) : (
                                  <div className="text-[10px] text-neutral-300 uppercase">OFF</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div className="flex justify-between items-center">
                            <Label className="text-[9px] uppercase tracking-widest text-brand-accent font-semibold underline underline-offset-4 decoration-brand-accent/30">GNB Navigation Menus</Label>
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  const defaults = [
                                    { title: 'ABOUT', path: '#about', isActive: true },
                                    { title: 'SCHEDULE', path: '#schedule', isActive: true },
                                    { title: 'CLASSES', path: '#classes', isActive: true },
                                    { title: 'REVIEWS', path: '#reviews', isActive: true },
                                    { title: 'ARCHIVE', path: '#archive', isActive: true },
                                    { title: 'RECIPE', path: '#recipes', isActive: true },
                                    { title: 'CONTACT', path: '#contact', isActive: true },
                                  ];
                                  setConfig({...config, gnbMenus: defaults});
                                  toast.info("기본 메뉴로 초기화되었습니다.");
                                }}
                                className="text-[9px] uppercase tracking-widest text-neutral-400 h-6 hover:text-brand-accent"
                              >
                                <RefreshCw className="w-3 h-3 mr-1" /> Reset Defaults
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setConfig({...config, gnbMenus: [...(config.gnbMenus || []), {title: 'NEW MENU', path: '#', isActive: true}]})}
                                className="text-[9px] uppercase tracking-widest text-brand-accent h-6 font-bold"
                              >
                                <Plus className="w-3 h-3 mr-1" /> Add Item
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2 scrollbar-hide border-y border-neutral-50 py-4">
                            {(config.gnbMenus && config.gnbMenus.length > 0) ? (config.gnbMenus || []).map((menu, idx) => (
                              <div key={idx} className="flex gap-2 items-center bg-neutral-50 p-2 rounded-sm border border-neutral-100 group/nav">
                                <div className="flex flex-col gap-0.5 opacity-0 group-hover/nav:opacity-100 transition-opacity">
                                  <button 
                                    disabled={idx === 0}
                                    onClick={() => {
                                      const newMenus = [...config.gnbMenus];
                                      [newMenus[idx - 1], newMenus[idx]] = [newMenus[idx], newMenus[idx - 1]];
                                      setConfig({...config, gnbMenus: newMenus});
                                    }}
                                    className="text-neutral-400 hover:text-brand-accent disabled:opacity-20"
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </button>
                                  <button 
                                    disabled={idx === config.gnbMenus.length - 1}
                                    onClick={() => {
                                      const newMenus = [...config.gnbMenus];
                                      [newMenus[idx + 1], newMenus[idx]] = [newMenus[idx], newMenus[idx + 1]];
                                      setConfig({...config, gnbMenus: newMenus});
                                    }}
                                    className="text-neutral-400 hover:text-brand-accent disabled:opacity-20"
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="flex-1 grid grid-cols-[100px,1fr,40px] gap-2 items-center">
                                  <Input 
                                    value={menu.title}
                                    onChange={(e) => {
                                      const newMenus = [...config.gnbMenus];
                                      newMenus[idx].title = e.target.value;
                                      setConfig({...config, gnbMenus: newMenus});
                                    }}
                                    className="bg-white border-neutral-200 h-9 text-xs font-bold uppercase"
                                    placeholder="Menu Label"
                                  />
                                  <Input 
                                    value={menu.path}
                                    onChange={(e) => {
                                      const newMenus = [...config.gnbMenus];
                                      newMenus[idx].path = e.target.value;
                                      setConfig({...config, gnbMenus: newMenus});
                                    }}
                                    className="bg-white border-neutral-200 h-9 text-xs font-mono"
                                    placeholder="Path (#about)"
                                  />
                                  <div className="flex flex-col items-center gap-1">
                                    <Switch 
                                      checked={menu.isActive !== false} 
                                      onCheckedChange={(val) => {
                                        const newMenus = [...config.gnbMenus];
                                        newMenus[idx].isActive = val;
                                        setConfig({...config, gnbMenus: newMenus});
                                      }}
                                      className="scale-75"
                                    />
                                    <span className="text-[6px] uppercase tracking-[0.2em] font-bold text-neutral-400 leading-none">
                                      {menu.isActive !== false ? 'ON' : 'OFF'}
                                    </span>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => {
                                    const newMenus = config.gnbMenus.filter((_m, i) => i !== idx);
                                    setConfig({...config, gnbMenus: newMenus});
                                  }}
                                  className="h-8 w-8 text-neutral-300 hover:text-red-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )) : (
                              <div className="py-12 border border-dashed border-neutral-200 rounded-sm text-center bg-neutral-50/50">
                                <Globe className="w-6 h-6 text-neutral-200 mx-auto mb-3" />
                                <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-3">No Custom Navigation</p>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => {
                                    const defaults = [
                                      { title: 'ABOUT', path: '#about', isActive: true },
                                      { title: 'SCHEDULE', path: '#schedule', isActive: true },
                                      { title: 'CLASSES', path: '#classes', isActive: true },
                                      { title: 'REVIEWS', path: '#reviews', isActive: true },
                                      { title: 'ARCHIVE', path: '#archive', isActive: true },
                                      { title: 'RECIPE', path: '#recipes', isActive: true },
                                      { title: 'CONTACT', path: '#contact', isActive: true },
                                    ];
                                    setConfig({...config, gnbMenus: defaults});
                                  }}
                                  className="h-8 text-[9px] uppercase tracking-widest"
                                >
                                  Load Default Menu
                                </Button>
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-400 font-light flex items-center gap-2">
                             <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                             상단 메뉴 라벨을 수정하면 즉시 메인 페이지 메뉴명이 바뀝니다.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* SEO Settings Card */}
                    <Card className="bg-white border-neutral-100 text-neutral-900 shadow-sm overflow-hidden group hover:border-brand-accent/50 transition-colors col-span-full">
                      <div className="h-1 bg-brand-accent opacity-10 group-hover:opacity-100 transition-opacity" />
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Search className="w-4 h-4 text-brand-accent" />
                          <CardTitle className="text-xs uppercase tracking-[0.3em] font-light text-neutral-400">SEO & Metadata</CardTitle>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-light translate-y-[-4px]">Search engine optimization settings for better visibility.</p>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-neutral-50 pt-8 mt-4">
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Site Title (Browser Tab Title)</Label>
                            <Input 
                              value={config.seo?.title || ""}
                              onChange={(e) => setConfig({...config, seo: {...(config.seo || {title: '', description: '', keywords: ''}), title: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                              placeholder="e.g. L'ecole Caku | 프리미엄 베이킹 스튜디오"
                            />
                            <p className="text-[9px] text-neutral-400">사이트의 공식 명칭이며, 브라우저 탭에 표시됩니다.</p>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Meta Description</Label>
                            <Textarea 
                              value={config.seo?.description || ""}
                              onChange={(e) => setConfig({...config, seo: {...(config.seo || {title: '', description: '', keywords: ''}), description: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent min-h-[100px] text-sm resize-none"
                              placeholder="Describe your studio for search engines..."
                            />
                            <p className="text-[9px] text-neutral-400">검색 엔진 결과에서 사이트 이름 아래에 표시되는 설명글입니다. (권장: 150자 내외)</p>
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Keywords (Comma Separated)</Label>
                            <Input 
                              value={config.seo?.keywords || ""}
                              onChange={(e) => setConfig({...config, seo: {...(config.seo || {title: '', description: '', keywords: ''}), keywords: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                              placeholder="e.g. 베이킹, 일산클래스, 디저트, 카페창업"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">OG Image (Social Share Preview)</Label>
                            <div className="grid grid-cols-[1fr,64px] gap-3">
                              <div className="flex flex-col gap-2">
                                <Input 
                                  value={config.seo?.ogImage || ""}
                                  onChange={(e) => setConfig({...config, seo: {...(config.seo || {title: '', description: '', keywords: ''}), ogImage: e.target.value}})}
                                  className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-10 text-xs font-mono"
                                  placeholder="Image URL or upload below..."
                                />
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onload = async (rv) => {
                                          const base64 = rv.target?.result as string;
                                          const compressed = await compressImage(base64, 1200, 1200, 0.8);
                                          setConfig({
                                            ...config,
                                            seo: {
                                              ...(config.seo || {title: '', description: '', keywords: ''}),
                                              ogImage: compressed
                                            }
                                          });
                                          toast.success("SEO 이미지가 업로드되었습니다.");
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                    className="hidden"
                                    id="seo-og-upload"
                                  />
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 text-[10px] w-full border-dashed border-neutral-200 hover:border-brand-accent hover:bg-brand-accent/5"
                                    onClick={() => document.getElementById('seo-og-upload')?.click()}
                                  >
                                    <Upload className="w-3 h-3 mr-2" /> Upload Image
                                  </Button>
                                </div>
                              </div>
                              <div className="w-16 h-[76px] rounded border border-neutral-100 bg-neutral-50 flex items-center justify-center overflow-hidden shrink-0">
                                {config.seo?.ogImage ? (
                                  <img src={config.seo.ogImage} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="text-[8px] text-neutral-300">NO IMG</div>
                                )}
                              </div>
                            </div>
                            <p className="text-[9px] text-neutral-400">카카오톡, 인스타그램 등 공유 시 나타나는 썸네일 이미지입니다. 직접 업로드하거나 URL을 입력할 수 있습니다.</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Hero Section Card */}
                    <Card className="bg-white border-neutral-100 text-neutral-900 shadow-sm overflow-hidden group hover:border-brand-accent/50 transition-colors">
                      <div className="h-1 bg-brand-accent opacity-10 group-hover:opacity-100 transition-opacity" />
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <ImageIcon className="w-4 h-4 text-brand-accent" />
                          <CardTitle className="text-xs uppercase tracking-[0.3em] font-light text-neutral-400">Hero Section</CardTitle>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-light translate-y-[-4px]">Landing page visual and headline settings.</p>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-3">
                          <Label className="text-[9px] uppercase tracking-widest text-brand-accent font-semibold">Headline Typography</Label>
                          <Textarea 
                            value={config.hero.title || ""}
                            onChange={(e) => setConfig({...config, hero: {...config.hero, title: e.target.value}})}
                            className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-24 text-sm font-light leading-relaxed"
                            placeholder="Enter main headline..."
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Subtitle Label</Label>
                          <Input 
                            value={config.hero.subtitle || ""}
                            onChange={(e) => setConfig({...config, hero: {...config.hero, subtitle: e.target.value}})}
                            className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Visual Asset</Label>
                          <div className="grid grid-cols-[1fr,48px] gap-3">
                            <div className="space-y-2">
                              <Input 
                                  value={config.hero.image || ""}
                                  onChange={(e) => setConfig({...config, hero: {...config.hero, image: e.target.value}})}
                                  className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-xs font-mono"
                                  placeholder="Image URL or Base64..."
                              />
                              <label className="flex items-center justify-center gap-2 h-10 border-2 border-dashed border-neutral-200 rounded-sm hover:bg-neutral-50 cursor-pointer transition-colors">
                                <Plus className="w-3 h-3 text-neutral-400" />
                                <span className="text-[9px] uppercase tracking-widest text-neutral-400">Upload Local Image</span>
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      if (file.size > 2 * 1024 * 1024) {
                                        toast.error("이미지 크기가 너무 큽니다. (2MB 이하 권장)");
                                        return;
                                      }
                                      const reader = new FileReader();
                                      reader.onloadend = async () => {
                                        const compressed = await compressImage(reader.result as string, 1920, 1080, 0.6);
                                        setConfig({...config, hero: {...config.hero, image: compressed}});
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                            <div className="w-12 h-12 rounded bg-neutral-100 p-1 border border-neutral-200 flex-shrink-0 relative group/img">
                                <img src={config.hero.image} className="w-full h-full object-cover opacity-80" />
                                <Button 
                                  size="icon"
                                  variant="destructive"
                                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity"
                                  onClick={() => setConfig({...config, hero: {...config.hero, image: ""}})}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* About Section Card */}
                    <Card className="bg-white border-neutral-100 text-neutral-900 shadow-sm overflow-hidden group hover:border-brand-accent/50 transition-colors">
                      <div className="h-1 bg-brand-accent opacity-10 group-hover:opacity-100 transition-opacity" />
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <MessageSquare className="w-4 h-4 text-brand-accent" />
                          <CardTitle className="text-xs uppercase tracking-[0.3em] font-light text-neutral-400">Story Section</CardTitle>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-light translate-y-[-4px]">About studio introduction copy and image.</p>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-brand-accent font-semibold">Intro Heading - Line 1</Label>
                            <Input 
                              value={config.about.title?.split('\n')[0] || ""}
                              onChange={(e) => {
                                const parts = (config.about.title || "").split('\n');
                                parts[0] = e.target.value;
                                setConfig({...config, about: {...config.about, title: parts.join('\n')}});
                              }}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                              placeholder="Line 1 of title..."
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-brand-accent font-semibold">Intro Heading - Line 2</Label>
                            <Input 
                              value={config.about.title?.split('\n')[1] || ""}
                              onChange={(e) => {
                                const parts = (config.about.title || "").split('\n');
                                while (parts.length < 2) parts.push("");
                                parts[1] = e.target.value;
                                setConfig({...config, about: {...config.about, title: parts.join('\n')}});
                              }}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                              placeholder="Line 2 of title..."
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Detailed Narrative</Label>
                          <Textarea 
                            value={config.about.content || ""}
                            onChange={(e) => setConfig({...config, about: {...config.about, content: e.target.value}})}
                            className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-40 text-sm font-light leading-relaxed scrollbar-hide"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Section Quote</Label>
                          <Textarea 
                            value={config.about.quote || ""}
                            onChange={(e) => setConfig({...config, about: {...config.about, quote: e.target.value}})}
                            className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-20 text-sm font-light italic"
                            placeholder="Enter section quote..."
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Chef Name Display</Label>
                          <Input 
                            value={config.about.chefName || ""}
                            onChange={(e) => setConfig({...config, about: {...config.about, chefName: e.target.value}})}
                            className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                            placeholder="e.g. Chef Ham Jeong-im"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Profile Image Asset</Label>
                          <div className="grid grid-cols-[1fr,48px] gap-3">
                            <div className="space-y-2">
                              <Input 
                                  value={config.about.image || ""}
                                  onChange={(e) => setConfig({...config, about: {...config.about, image: e.target.value}})}
                                  className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-xs font-mono"
                                  placeholder="Image URL or Base64..."
                              />
                              <label className="flex items-center justify-center gap-2 h-10 border-2 border-dashed border-neutral-200 rounded-sm hover:bg-neutral-50 cursor-pointer transition-colors">
                                <Plus className="w-3 h-3 text-neutral-400" />
                                <span className="text-[9px] uppercase tracking-widest text-neutral-400">Upload Local Image</span>
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      if (file.size > 2 * 1024 * 1024) {
                                        toast.error("이미지 크기가 너무 큽니다. (2MB 이하 권장)");
                                        return;
                                      }
                                      const reader = new FileReader();
                                      reader.onloadend = async () => {
                                        const compressed = await compressImage(reader.result as string, 1200, 1200, 0.6);
                                        setConfig({...config, about: {...config.about, image: compressed}});
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                            <div className="w-12 h-12 rounded bg-neutral-100 p-1 border border-neutral-200 flex-shrink-0 relative group/img">
                                <img src={config.about.image} className="w-full h-full object-cover opacity-80" />
                                <Button 
                                  size="icon"
                                  variant="destructive"
                                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity"
                                  onClick={() => setConfig({...config, about: {...config.about, image: ""}})}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Cinematic Reviews Section Card */}
                    <Card className="bg-white border-neutral-100 text-neutral-900 shadow-sm overflow-hidden group hover:border-brand-accent/50 transition-colors">
                      <div className="h-1 bg-brand-accent opacity-10 group-hover:opacity-100 transition-opacity" />
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <MessageSquare className="w-4 h-4 text-brand-accent" />
                          <CardTitle className="text-xs uppercase tracking-[0.3em] font-light text-neutral-400">Reviews Section</CardTitle>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-light translate-y-[-4px]">Cinematic reviews section headings.</p>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-3">
                          <Label className="text-[9px] uppercase tracking-widest text-brand-accent font-semibold">Sub-title (Label)</Label>
                          <Input 
                            value={config.reviews?.subtitle || ""}
                            onChange={(e) => setConfig({...config, reviews: {...(config.reviews || {title: '', subtitle: ''}), subtitle: e.target.value}})}
                            className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Section Main Title</Label>
                          <Input 
                            value={config.reviews?.title || ""}
                            onChange={(e) => setConfig({...config, reviews: {...(config.reviews || {title: '', subtitle: ''}), title: e.target.value}})}
                            className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Geolocation Card */}
                    <Card className="bg-white border-neutral-100 text-neutral-900 shadow-sm md:col-span-2 overflow-hidden group hover:border-brand-accent/50 transition-colors">
                      <div className="h-1 bg-brand-accent opacity-10 group-hover:opacity-100 transition-opacity" />
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <MapPin className="w-4 h-4 text-brand-accent" />
                          <CardTitle className="text-xs uppercase tracking-[0.3em] font-light text-neutral-400">Geolocation Center</CardTitle>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-light translate-y-[-4px]">Map coordinates and arrival instructions.</p>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-brand-accent font-semibold">지도 섹션 제목 (Section Title)</Label>
                            <Input 
                              value={config.mapInfo.title || ""}
                              onChange={(e) => setConfig({...config, mapInfo: {...config.mapInfo, title: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                              placeholder="e.g. 스튜디오 오시는 길"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">지도 표시 주소 (Address)</Label>
                            <div className="flex gap-2">
                              <Input 
                                value={config.mapInfo.address || ""}
                                onChange={(e) => setConfig({...config, mapInfo: {...config.mapInfo, address: e.target.value}})}
                                className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm flex-1"
                                placeholder="서울 서대문구 연희맛로 24..."
                              />
                              <Button 
                                onClick={findCoordinates}
                                type="button"
                                variant="outline"
                                className="h-12 border-neutral-100 hover:border-brand-accent hover:text-brand-accent text-[10px] uppercase tracking-widest px-4 shrink-0 transition-colors"
                              >
                                <Search className="w-3 h-3 mr-2" />
                                좌표 찾기
                              </Button>
                            </div>
                            <p className="text-[9px] text-neutral-400">주소 입력 후 '좌표 찾기' 버튼을 누르면 아래 위도/경도가 자동 입력됩니다.</p>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">주차 정보 (Parking)</Label>
                            <Textarea 
                              value={config.mapInfo.parking || ""}
                              onChange={(e) => setConfig({...config, mapInfo: {...config.mapInfo, parking: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-24 text-sm font-light"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-[#FEE500] bg-black px-2 py-1 inline-block font-bold">카카오 지도 설정 가이드 (Setup Guide)</Label>
                            <div className="bg-neutral-50 p-4 rounded-sm border border-neutral-100 space-y-4">
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-neutral-800">1. JavaScript 키를 사용하세요</p>
                                <p className="text-[9px] text-neutral-500 leading-relaxed">
                                  카카오 개발자 콘솔의 4가지 앱 키 중 반드시 <strong className="text-brand-accent">'JavaScript 키'</strong>를 입력해야 합니다. (Admin이나 REST API 키는 작동하지 않습니다.)
                                </p>
                              </div>
                              
                              <div className="space-y-2 pt-2 border-t border-neutral-200">
                                <p className="text-[10px] font-bold text-neutral-800">2. 도메인 등록 (필수)</p>
                                <p className="text-[9px] text-neutral-500 leading-relaxed">
                                  아래 주소들을 <strong className="text-neutral-700">플랫폼 &gt; Web &gt; 사이트 도메인</strong>에 반드시 등록해 주세요:
                                </p>
                                <div className="space-y-2">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[8px] text-neutral-400 uppercase">현재 도메인:</span>
                                    <code className="text-[9px] bg-white p-1.5 px-2 rounded border border-neutral-200 break-all select-all font-mono text-brand-ink">{window.location.origin}</code>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[8px] text-neutral-400 uppercase">공유용 도메인:</span>
                                    <code className="text-[9px] bg-white p-1.5 px-2 rounded border border-neutral-200 break-all select-all font-mono text-brand-ink">{window.location.origin.replace('-dev-', '-pre-')}</code>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-1 pt-2 border-t border-neutral-200">
                                <p className="text-[10px] font-bold text-neutral-800">3. 여전히 오류가 발생하나요?</p>
                                <p className="text-[9px] text-neutral-500 leading-relaxed">
                                  지도가 계속 나오지 않는다면, 브라우저의 <strong className="text-neutral-700">개발자 도구 (F12) &gt; Console</strong> 탭에서 어떤 오류가 발생하는지 확인해 주세요. 90% 이상이 'Domain mismatch' 혹은 'Invalid Key' 관련 오류입니다.
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">카카오 API JavaScript 키 (Kakao JS Key)</Label>
                            <Input 
                              value={config.mapInfo.kakaoApiKey || ""}
                              onChange={(e) => setConfig({...config, mapInfo: {...config.mapInfo, kakaoApiKey: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm font-mono"
                              placeholder="JavaScript 키를 입력하세요"
                            />
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">지도 하단 버튼 명칭 (Button Text)</Label>
                            <Input 
                              value={config.mapInfo.buttonText || ""}
                              onChange={(e) => setConfig({...config, mapInfo: {...config.mapInfo, buttonText: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">지도 하단 버튼 링크 (Button Link)</Label>
                            <Input 
                              value={config.mapInfo.buttonLink || ""}
                              onChange={(e) => setConfig({...config, mapInfo: {...config.mapInfo, buttonLink: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                              placeholder="예: 카카오톡 채널 링크 등"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Walking Guide</Label>
                            <Textarea 
                              value={config.mapInfo.walkInfo || ""}
                              onChange={(e) => setConfig({...config, mapInfo: {...config.mapInfo, walkInfo: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-24 text-sm font-light"
                            />
                          </div>
                          <div className="flex gap-4">
                            <div className="space-y-3 flex-1">
                              <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Coordinate: LAT</Label>
                              <Input 
                                type="number"
                                value={config.mapInfo.lat || 0}
                                onChange={(e) => setConfig({...config, mapInfo: {...config.mapInfo, lat: parseFloat(e.target.value)}})}
                                className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm font-mono"
                              />
                            </div>
                            <div className="space-y-3 flex-1">
                              <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Coordinate: LNG</Label>
                              <Input 
                                type="number"
                                value={config.mapInfo.lng || 0}
                                onChange={(e) => setConfig({...config, mapInfo: {...config.mapInfo, lng: parseFloat(e.target.value)}})}
                                className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>


                    {/* Footer & Social Section Card */}
                    <Card className="bg-white border-neutral-100 text-neutral-900 shadow-sm md:col-span-2 overflow-hidden group hover:border-brand-accent/50 transition-colors">
                      <div className="h-1 bg-brand-accent opacity-10 group-hover:opacity-100 transition-opacity" />
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Settings className="w-4 h-4 text-brand-accent" />
                          <CardTitle className="text-xs uppercase tracking-[0.3em] font-light text-neutral-400">Footer & Social Links</CardTitle>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-light translate-y-[-4px]">Global footer information and social media links.</p>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Footer Brand Title</Label>
                            <Input 
                              value={config.footer?.title || ""}
                              onChange={(e) => setConfig({...config, footer: {...(config.footer || {}), title: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                              placeholder="e.g. L'ecole Caku"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Business Info / Address</Label>
                            <Textarea 
                              value={config.footer?.address || ""}
                              onChange={(e) => setConfig({...config, footer: {...(config.footer || {}), address: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-20 text-sm font-light"
                              placeholder="Company info, address, representative, etc."
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Copyright Text</Label>
                            <Input 
                              value={config.footer?.copyright || ""}
                              onChange={(e) => setConfig({...config, footer: {...(config.footer || {}), copyright: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                              placeholder="© 2026 L'ecole Caku. All Rights Reserved."
                            />
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Instagram Handle / URL</Label>
                            <Input 
                              value={config.socialLinks.instagram || ""}
                              onChange={(e) => setConfig({...config, socialLinks: {...config.socialLinks, instagram: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm font-mono"
                              placeholder="e.g. lecole_caku"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">YouTube URL</Label>
                            <Input 
                              value={config.socialLinks.youtube || ""}
                              onChange={(e) => setConfig({...config, socialLinks: {...config.socialLinks, youtube: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm font-mono"
                              placeholder="https://youtube.com/..."
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Blog URL</Label>
                            <Input 
                              value={config.socialLinks.blog || ""}
                              onChange={(e) => setConfig({...config, socialLinks: {...config.socialLinks, blog: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm font-mono"
                              placeholder="https://naver.com/..."
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">GitHub URL</Label>
                            <Input 
                              value={config.socialLinks.github || ""}
                              onChange={(e) => setConfig({...config, socialLinks: {...config.socialLinks, github: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm font-mono"
                              placeholder="https://github.com/..."
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Instagram Feed & Blog Section */}
                    <Card className="bg-white border-neutral-100 text-neutral-900 shadow-sm overflow-hidden group hover:border-brand-accent/50 transition-colors col-span-full">
                      <div className="h-1 bg-[#E1306C] opacity-10 group-hover:opacity-100 transition-opacity" />
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Instagram className="w-4 h-4 text-[#E1306C]" />
                          <CardTitle className="text-xs uppercase tracking-[0.3em] font-light text-neutral-400">Menu Board & SNS Gallery</CardTitle>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-light translate-y-[-4px]">Configure the manual menu board or Instagram feed integration.</p>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-[#E1306C] font-semibold">Instagram Username</Label>
                            <Input 
                              value={config.instagramFeed?.username || ""}
                              onChange={(e) => setConfig({...config, instagramFeed: {...(config.instagramFeed || {title: '', blogTitle: '', blogLinkText: '', blogLink: ''}), username: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                              placeholder="e.g. @lecole_caku"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Section Subtitle</Label>
                            <Input 
                              value={config.instagramFeed?.title || ""}
                              onChange={(e) => setConfig({...config, instagramFeed: {...(config.instagramFeed || {username: '', blogTitle: '', blogLinkText: '', blogLink: ''}), title: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                              placeholder="e.g. LATEST FROM INSTAGRAM"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-[#E1306C] font-semibold">Instagram Access Token</Label>
                            <Input 
                              type="password"
                              value={config.instagramFeed?.accessToken || ""}
                              onChange={(e) => setConfig({...config, instagramFeed: {...(config.instagramFeed || {username: '', title: '', blogTitle: '', blogLinkText: '', blogLink: ''}), accessToken: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm font-mono"
                              placeholder="Enter Instagram Basic Display Access Token..."
                            />
                            <p className="text-[9px] text-neutral-400 leading-relaxed uppercase tracking-tighter">
                              토큰이 설정되지 않으면 기본 이미지가 노출됩니다. 토큰은 Meta for Developers에서 발급받은 '기본 디스플레이 API' 액세스 토큰이어야 합니다.
                            </p>
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Blog Title</Label>
                            <Input 
                              value={config.instagramFeed?.blogTitle || ""}
                              onChange={(e) => setConfig({...config, instagramFeed: {...(config.instagramFeed || {username: '', title: '', blogLinkText: '', blogLink: ''}), blogTitle: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                              placeholder="e.g. 함셰프의 베이킹 일기"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Blog Link Text</Label>
                            <Input 
                              value={config.instagramFeed?.blogLinkText || ""}
                              onChange={(e) => setConfig({...config, instagramFeed: {...(config.instagramFeed || {username: '', title: '', blogTitle: '', blogLink: ''}), blogLinkText: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                              placeholder="e.g. Naver Blog 바로가기 →"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Blog URL</Label>
                            <Input 
                              value={config.instagramFeed?.blogLink || ""}
                              onChange={(e) => setConfig({...config, instagramFeed: {...(config.instagramFeed || {username: '', title: '', blogTitle: '', blogLinkText: ''}), blogLink: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm font-mono"
                              placeholder="https://blog.naver.com/..."
                            />
                          </div>
                        </div>

                        <div className="space-y-6 col-span-full border-t border-neutral-100 pt-10 mt-4">
                           <div className="flex justify-between items-center mb-4">
                             <div className="space-y-1">
                               <Label className="text-[10px] uppercase tracking-widest text-[#E1306C] font-semibold">Manual Gallery (Menu Board)</Label>
                               <p className="text-[9px] text-neutral-400">직접 업로드한 이미지가 있는 경우 인스타그램 피드 대신 노출됩니다.</p>
                             </div>
                             <Label className="cursor-pointer">
                               <div className="flex items-center gap-2 bg-neutral-900 text-white px-4 py-2 rounded-sm text-[10px] uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors">
                                 <Plus className="w-3 h-3" /> Add Image
                               </div>
                               <input 
                                 type="file" 
                                 className="hidden" 
                                 accept="image/*"
                                 onChange={(e) => {
                                   const file = e.target.files?.[0];
                                   if (file) {
                                     if (file.size > 2 * 1024 * 1024) {
                                       toast.error("이미지 크기가 너무 큽니다. (2MB 이하 권장)");
                                       return;
                                     }
                                     const reader = new FileReader();
                                     reader.onloadend = async () => {
                                       const compressed = await compressImage(reader.result as string, 1000, 1000, 0.7);
                                       try {
                                         const docRef = await addDoc(collection(db, 'sns_gallery'), {
                                           url: compressed,
                                           createdAt: new Date()
                                         });
                                         setGalleryImages([{ id: docRef.id, url: compressed, createdAt: new Date() }, ...galleryImages]);
                                         toast.success("이미지가 성공적으로 추가되었습니다.");
                                       } catch (error) {
                                         handleFirestoreError(error, OperationType.WRITE, 'sns_gallery');
                                       }
                                     };
                                     reader.readAsDataURL(file);
                                   }
                                 }}
                               />
                             </Label>
                           </div>
                           
                           <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                             {galleryImages.map((img, idx) => (
                               <div key={img.id || idx} className="aspect-square relative group bg-neutral-50 rounded border border-neutral-100 overflow-hidden">
                                 <img src={img.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                   <Button 
                                     size="icon" 
                                     variant="destructive" 
                                     className="w-8 h-8 rounded-full"
                                     onClick={async () => {
                                       if (confirm("이미지를 삭제하시겠습니까?")) {
                                         try {
                                           await deleteDoc(doc(db, 'sns_gallery', img.id));
                                           setGalleryImages(galleryImages.filter(g => g.id !== img.id));
                                           toast.success("이미지가 삭제되었습니다.");
                                         } catch (error) {
                                           handleFirestoreError(error, OperationType.DELETE, 'sns_gallery');
                                         }
                                       }
                                     }}
                                   >
                                     <Trash2 className="w-4 h-4" />
                                   </Button>
                                 </div>
                               </div>
                             ))}
                             {galleryImages.length === 0 && (
                               <div className="col-span-full py-12 border-2 border-dashed border-neutral-100 rounded flex flex-col items-center justify-center text-neutral-300 gap-2">
                                 <ImageIcon className="w-8 h-8 opacity-20" />
                                 <span className="text-[10px] uppercase tracking-widest font-medium opacity-50">No Manual Images Uploaded</span>
                               </div>
                             )}
                           </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-0">
               {!config ? (
                <div className="p-20 text-center opacity-50 uppercase tracking-[0.5em] text-xs">Initializing Database...</div>
              ) : (
                <div className="space-y-12">
                   <div className="flex justify-between items-center bg-white p-8 rounded-sm border border-neutral-100 shadow-sm">
                    <div className="flex gap-10 items-center">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-widest text-brand-accent mb-1">Configuration</span>
                        <h3 className="text-xl font-serif italic text-neutral-900">Brand History & Timeline</h3>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        onClick={handleUpdateConfig} 
                        disabled={isSavingConfig}
                        className="bg-neutral-900 text-white font-bold uppercase tracking-widest gap-3 h-11 px-8 hover:bg-neutral-800"
                      >
                        {isSavingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Timeline
                      </Button>
                    </div>
                  </div>

                  <Card className="bg-white border-neutral-100 text-neutral-900 shadow-sm overflow-hidden group hover:border-brand-accent/50 transition-colors">
                      <div className="h-1 bg-brand-accent opacity-10 group-hover:opacity-100 transition-opacity" />
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <History className="w-4 h-4 text-brand-accent" />
                          <CardTitle className="text-xs uppercase tracking-[0.3em] font-light text-neutral-400">Global Settings</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Section Title</Label>
                            <Input 
                              value={config.history?.title || ""}
                              onChange={(e) => setConfig({...config, history: {...(config.history || {title: '', subtitle: '', items: []}), title: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                              placeholder="e.g. 18 Years of Heritage"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Section Subtitle</Label>
                            <Input 
                              value={config.history?.subtitle || ""}
                              onChange={(e) => setConfig({...config, history: {...(config.history || {title: '', subtitle: '', items: []}), subtitle: e.target.value}})}
                              className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                              placeholder="e.g. Brand Narrative"
                            />
                          </div>
                        </div>
                      </CardContent>
                  </Card>

                  <div className="space-y-6">
                    {(config.history?.items || []).map((item, idx) => (
                      <div key={idx} className="p-6 bg-white rounded-sm border border-neutral-100 space-y-6 relative group/item shadow-sm">
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            disabled={idx === 0}
                            onClick={() => {
                              const newItems = [...config.history!.items];
                              [newItems[idx - 1], newItems[idx]] = [newItems[idx], newItems[idx - 1]];
                              setConfig({...config, history: {...config.history!, items: newItems}});
                            }}
                            className="h-8 w-8 text-neutral-300 hover:text-brand-accent disabled:opacity-30"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            disabled={idx === config.history!.items.length - 1}
                            onClick={() => {
                              const newItems = [...config.history!.items];
                              [newItems[idx + 1], newItems[idx]] = [newItems[idx], newItems[idx + 1]];
                              setConfig({...config, history: {...config.history!, items: newItems}});
                            }}
                            className="h-8 w-8 text-neutral-300 hover:text-brand-accent disabled:opacity-30"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              if(!confirm("정말 삭제하시겠습니까?")) return;
                              const newItems = config.history!.items.filter((_, i) => i !== idx);
                              setConfig({...config, history: {...config.history!, items: newItems}});
                            }}
                            className="h-8 w-8 text-neutral-300 hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Year</Label>
                            <Input 
                              value={item.year}
                              onChange={(e) => {
                                const newItems = [...config.history!.items];
                                newItems[idx].year = e.target.value;
                                setConfig({...config, history: {...config.history!, items: newItems}});
                              }}
                              className="bg-neutral-50 border-neutral-100 h-10 text-sm font-serif"
                            />
                          </div>
                          <div className="md:col-span-2 space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Title</Label>
                            <Input 
                              value={item.title}
                              onChange={(e) => {
                                const newItems = [...config.history!.items];
                                newItems[idx].title = e.target.value;
                                setConfig({...config, history: {...config.history!, items: newItems}});
                              }}
                              className="bg-neutral-50 border-neutral-100 h-10 text-sm"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Side Alignment</Label>
                            <div className="flex gap-2">
                              <Button 
                                variant={item.side === 'left' ? 'default' : 'outline'}
                                size="sm"
                                className="flex-1 h-10 text-[10px] uppercase"
                                onClick={() => {
                                  const newItems = [...config.history!.items];
                                  newItems[idx].side = 'left';
                                  setConfig({...config, history: {...config.history!, items: newItems}});
                                }}
                              >
                                <AlignLeft className="w-4 h-4 mr-2" /> Left
                              </Button>
                              <Button 
                                variant={item.side === 'right' ? 'default' : 'outline'}
                                size="sm"
                                className="flex-1 h-10 text-[10px] uppercase"
                                onClick={() => {
                                  const newItems = [...config.history!.items];
                                  newItems[idx].side = 'right';
                                  setConfig({...config, history: {...config.history!, items: newItems}});
                                }}
                              >
                                Right <AlignRight className="w-4 h-4 ml-2" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Description</Label>
                          <Textarea 
                            value={item.description}
                            onChange={(e) => {
                              const newItems = [...config.history!.items];
                              newItems[idx].description = e.target.value;
                              setConfig({...config, history: {...config.history!, items: newItems}});
                            }}
                            className="bg-neutral-50 border-neutral-100 h-20 text-sm font-light leading-relaxed"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Icon Selection</Label>
                            <div className="flex flex-wrap gap-2">
                              {(['Globe', 'Book', 'Award', 'Coffee', 'Camera', 'Heart'] as const).map((iconName) => {
                                const IconMap: Record<string, any> = { Globe, Book: BookOpen, Award, Coffee, Camera, Heart };
                                const IconComp = IconMap[iconName];
                                return (
                                  <Button 
                                    key={iconName}
                                    variant={item.icon === iconName ? 'default' : 'outline'}
                                    size="icon"
                                    className="w-10 h-10"
                                    onClick={() => {
                                      const newItems = [...config.history!.items];
                                      newItems[idx].icon = iconName;
                                      setConfig({...config, history: {...config.history!, items: newItems}});
                                    }}
                                  >
                                    <IconComp className="w-4 h-4" />
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Optional Link</Label>
                              <Switch 
                                checked={!!item.link}
                                onCheckedChange={(checked) => {
                                  const newItems = [...config.history!.items];
                                  newItems[idx].link = checked ? { text: '구매처 바로가기 →', url: '' } : undefined;
                                  setConfig({...config, history: {...config.history!, items: newItems}});
                                }}
                              />
                            </div>
                            {item.link && (
                              <div className="grid grid-cols-2 gap-2">
                                <Input 
                                  value={item.link.text}
                                  onChange={(e) => {
                                    const newItems = [...config.history!.items];
                                    newItems[idx].link!.text = e.target.value;
                                    setConfig({...config, history: {...config.history!, items: newItems}});
                                  }}
                                  className="bg-neutral-50 border-neutral-100 h-10 text-xs"
                                  placeholder="Link Text"
                                />
                                <Input 
                                  value={item.link.url}
                                  onChange={(e) => {
                                    const newItems = [...config.history!.items];
                                    newItems[idx].link!.url = e.target.value;
                                    setConfig({...config, history: {...config.history!, items: newItems}});
                                  }}
                                  className="bg-neutral-50 border-neutral-100 h-10 text-xs"
                                  placeholder="Link URL"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="class-schedule" className="mt-0 space-y-12">
               {!config ? (
                <div className="p-20 text-center opacity-50 uppercase tracking-[0.5em] text-xs">Initializing Database...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Schedule Section Card (Moved here) */}
                    <Card className="bg-white border-neutral-100 text-neutral-900 shadow-sm overflow-hidden group hover:border-brand-accent/50 transition-colors">
                      <div className="h-1 bg-brand-accent opacity-10 group-hover:opacity-100 transition-opacity" />
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Calendar className="w-4 h-4 text-brand-accent" />
                          <CardTitle className="text-xs uppercase tracking-[0.3em] font-light text-neutral-400">Schedule Section</CardTitle>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-light translate-y-[-4px]">Main section headings and images for class schedule.</p>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-3">
                          <Label className="text-[9px] uppercase tracking-widest text-brand-accent font-semibold">Sub-title (Label)</Label>
                          <Input 
                            value={config.schedule?.subtitle || ""}
                            onChange={(e) => setConfig({...config, schedule: {...(config.schedule || {title: '', subtitle: '', images: []}), subtitle: e.target.value}})}
                            className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Section Main Title</Label>
                          <Input 
                            value={config.schedule?.title || ""}
                            onChange={(e) => setConfig({...config, schedule: {...(config.schedule || {title: '', subtitle: '', images: []}), title: e.target.value}})}
                            className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Schedule Images</Label>
                          <div className="grid grid-cols-2 gap-3">
                            {scheduleImages.map((img, idx) => (
                              <div key={img.id} className="relative group/img aspect-video rounded overflow-hidden border border-neutral-100">
                                <img src={img.url} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <Button 
                                    variant="destructive" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={async () => {
                                      if (!confirm("이 이미지를 삭제하시겠습니까?")) return;
                                      try {
                                        await deleteDoc(doc(db, 'schedule_images', img.id));
                                        setScheduleImages(scheduleImages.filter(i => i.id !== img.id));
                                        toast.success("이미지가 삭제되었습니다.");
                                      } catch (e) {
                                        toast.error("삭제 실패");
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            <label className="aspect-video rounded border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-neutral-50 transition-colors">
                              <Plus className="w-6 h-6 text-neutral-300" />
                              <span className="text-[8px] uppercase tracking-widest text-neutral-400">Add Image</span>
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*" 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 2 * 1024 * 1024) {
                                      toast.error("이미지 크기가 너무 큽니다. (2MB 이하 권장)");
                                      return;
                                    }
                                    const reader = new FileReader();
                                    reader.onloadend = async () => {
                                      try {
                                        const compressed = await compressImage(reader.result as string, 1200, 1200, 0.7);
                                        const imageData = {
                                          url: compressed,
                                          createdAt: new Date()
                                        };
                                        const docRef = await addDoc(collection(db, 'schedule_images'), imageData);
                                        setScheduleImages([...scheduleImages, { id: docRef.id, ...imageData }]);
                                        toast.success("이미지가 추가되었습니다.");
                                      } catch (err) {
                                        toast.error("이미지 업로드 실패");
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }} 
                              />
                            </label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Class List Section Card (Moved here) */}
                    <Card className="bg-white border-neutral-100 text-neutral-900 shadow-sm overflow-hidden group hover:border-brand-accent/50 transition-colors">
                      <div className="h-1 bg-brand-accent opacity-10 group-hover:opacity-100 transition-opacity" />
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <BookOpen className="w-4 h-4 text-brand-accent" />
                          <CardTitle className="text-xs uppercase tracking-[0.3em] font-light text-neutral-400">Class List Section</CardTitle>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-light translate-y-[-4px]">Main section headings for class listings.</p>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-3">
                          <Label className="text-[9px] uppercase tracking-widest text-brand-accent font-semibold">Sub-title (Label)</Label>
                          <Input 
                            value={config.classList?.subtitle || ""}
                            onChange={(e) => setConfig({...config, classList: {...(config.classList || {title: '', subtitle: ''}), subtitle: e.target.value}})}
                            className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Section Main Title</Label>
                          <Input 
                            value={config.classList?.title || ""}
                            onChange={(e) => setConfig({...config, classList: {...(config.classList || {title: '', subtitle: ''}), title: e.target.value}})}
                            className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-12 text-sm"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm uppercase tracking-widest text-neutral-400 font-medium">Class Management List</h3>
                      <Button 
                        onClick={handleUpdateConfig} 
                        disabled={isSavingConfig}
                        className="bg-white text-neutral-900 border border-neutral-200 font-bold uppercase tracking-widest gap-3 h-10 px-6 hover:bg-neutral-50 shadow-sm"
                      >
                        {isSavingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Section Config
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {classes.map(c => (
                        <div key={c.id} className="bg-white p-6 rounded-sm flex items-center justify-between border border-neutral-100 hover:border-brand-accent/20 transition-all group shadow-sm">
                          <div className="flex items-center gap-6">
                            <div className="w-20 h-20 rounded bg-neutral-50 border border-neutral-100 overflow-hidden flex-shrink-0 relative">
                              {c.thumbnail ? (
                                <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-neutral-50">
                                  <ImageIcon className="w-6 h-6 text-neutral-200" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-1">
                              <p className="text-[8px] uppercase tracking-widest text-neutral-300 font-mono mb-1">{c.id.substring(0, 8)}</p>
                              <h4 className="font-serif text-xl italic group-hover:text-brand-accent transition-colors text-neutral-900">{c.title}</h4>
                              <p className="text-[10px] text-neutral-400 uppercase tracking-[0.2em] mt-1">KRW {c.price?.toLocaleString()} / Seat</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-3">
                            <Badge variant="outline" className={`text-[8px] uppercase tracking-widest px-3 py-1 ${c.isActive ? 'border-brand-accent text-brand-accent' : 'border-neutral-200 text-neutral-400'}`}>
                              {c.isActive ? 'Active Store' : 'Draft Mode'}
                            </Badge>
                            <div className="flex items-center gap-3">
                              <span className="text-[9px] uppercase tracking-widest opacity-30 text-neutral-900">Sold Out</span>
                              <Switch 
                                checked={c.isSoldOut || false} 
                                onCheckedChange={() => {
                                  const newStatus = !(c.isSoldOut || false);
                                  updateDoc(doc(db, 'classes', c.id), { isSoldOut: newStatus });
                                  setClasses(classes.map(cl => cl.id === c.id ? { ...cl, isSoldOut: newStatus } : cl));
                                }} 
                                className="data-[state=checked]:bg-red-500 h-5 w-10 ml-2"
                              />
                              <div className="w-px h-4 bg-neutral-100 mx-2" />
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setEditingClass(c)}
                                className="h-8 w-8 text-neutral-400 hover:text-brand-accent"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteClass(c.id)}
                                className="h-8 w-8 text-neutral-400 hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <Switch 
                                checked={c.isActive} 
                                onCheckedChange={() => toggleClass(c.id, c.isActive)} 
                                className="data-[state=checked]:bg-brand-accent h-5 w-10 ml-2"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Dialog open={!!editingClass} onOpenChange={(open) => !open && setEditingClass(null)}>
                <DialogContent className="max-w-2xl bg-white">
                  <DialogHeader>
                    <DialogTitle className="font-serif italic text-2xl">Edit Class Details</DialogTitle>
                  </DialogHeader>
                  {editingClass && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest">Class Title</Label>
                          <Input 
                            value={editingClass.title || ""} 
                            onChange={(e) => setEditingClass({...editingClass, title: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest">Price (KRW)</Label>
                          <Input 
                            type="number" 
                            value={editingClass.price || 0} 
                            onChange={(e) => setEditingClass({...editingClass, price: parseInt(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest">Capacity (People)</Label>
                          <Input 
                            type="number" 
                            value={editingClass.capacity || 4} 
                            onChange={(e) => setEditingClass({...editingClass, capacity: parseInt(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest">Dates (Comma separated)</Label>
                          <Input 
                            value={editingClass.dates?.join(', ') || ''} 
                            placeholder="2026-05-01, 2026-05-02"
                            onChange={(e) => setEditingClass({...editingClass, dates: e.target.value.split(',').map(s => s.trim())})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest">Category</Label>
                          <Input 
                            value={editingClass.category || ""} 
                            onChange={(e) => setEditingClass({...editingClass, category: e.target.value})}
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-neutral-50 rounded border border-neutral-100">
                          <Label className="text-[10px] uppercase tracking-widest font-semibold text-red-600">Sold Out Status</Label>
                          <Switch 
                            checked={editingClass.isSoldOut || false} 
                            onCheckedChange={(checked) => setEditingClass({ ...editingClass, isSoldOut: checked })}
                            className="data-[state=checked]:bg-red-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest">Thumbnail Image</Label>
                          <div className="flex flex-col gap-4">
                            {editingClass.thumbnail ? (
                              <div className="relative aspect-video rounded overflow-hidden border border-neutral-100 group">
                                <img 
                                  src={editingClass.thumbnail} 
                                  className="w-full h-full object-cover" 
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <Button 
                                    variant="destructive" 
                                    size="sm" 
                                    className="h-8 px-3 text-[10px] uppercase"
                                    onClick={() => setEditingClass({ ...editingClass, thumbnail: '' })}
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" /> Remove
                                  </Button>
                                  <label className="bg-white text-black h-8 px-3 flex items-center rounded text-[10px] uppercase cursor-pointer hover:bg-neutral-100 transition-colors">
                                    <Upload className="w-3 h-3 mr-1" /> Replace
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                  </label>
                                </div>
                              </div>
                            ) : (
                              <label className="aspect-video rounded border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-neutral-50 transition-colors">
                                <Plus className="w-6 h-6 text-neutral-300" />
                                <span className="text-[10px] uppercase tracking-widest text-neutral-400">Click to Upload Image</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                              </label>
                            )}
                            <div className="space-y-1">
                              <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Or External URL</Label>
                              <Input 
                                value={editingClass.thumbnail || ""} 
                                onChange={(e) => setEditingClass({...editingClass, thumbnail: e.target.value})}
                                placeholder="https://..."
                                className="h-8 text-[10px]"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest">Description</Label>
                          <Textarea 
                            className="h-32"
                            value={editingClass.description || ""} 
                            onChange={(e) => setEditingClass({...editingClass, description: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingClass(null)}>Cancel</Button>
                    <Button 
                      onClick={handleSaveClass} 
                      disabled={isClassSaving}
                      className="bg-neutral-900 text-white"
                    >
                      {isClassSaving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="free-recipes" className="mt-0 space-y-12">
              {!config ? (
                <div className="p-20 text-center opacity-50 uppercase tracking-[0.5em] text-xs">Initializing Database...</div>
              ) : (
                <div className="space-y-12">
                  <Card className="bg-white border-neutral-100 text-neutral-900 shadow-sm overflow-hidden group hover:border-brand-accent/50 transition-colors">
                    <div className="h-1 bg-brand-accent opacity-10 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Play className="w-4 h-4 text-brand-accent" />
                          <CardTitle className="text-xs uppercase tracking-[0.3em] font-light text-neutral-400">Section Settings</CardTitle>
                        </div>
                        <Button 
                          onClick={handleUpdateConfig} 
                          disabled={isSavingConfig}
                          size="sm"
                          className="bg-neutral-900 text-white font-bold uppercase tracking-widest gap-2 h-8 px-4 hover:bg-neutral-800 shadow-sm text-[9px]"
                        >
                          {isSavingConfig ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          Save Settings
                        </Button>
                      </div>
                      <p className="text-[10px] text-neutral-400 font-light mt-2">Update main title and YouTube redirect label.</p>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-[9px] uppercase tracking-widest text-brand-accent font-semibold">Main Title</Label>
                        <Input 
                          value={config.freeRecipeMedia?.title || ""}
                          onChange={(e) => setConfig({...config, freeRecipeMedia: {...(config.freeRecipeMedia || {title: '', subtitle: '', videos: []}), title: e.target.value}})}
                          className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-10 text-sm"
                          placeholder="무료 레시피 미디어"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Action Label</Label>
                        <Input 
                          value={config.freeRecipeMedia?.subtitle || ""}
                          onChange={(e) => setConfig({...config, freeRecipeMedia: {...(config.freeRecipeMedia || {title: '', subtitle: '', videos: []}), subtitle: e.target.value}})}
                          className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-10 text-sm"
                          placeholder="WATCH ON YOUTUBE →"
                        />
                      </div>
                      <div className="space-y-3 md:col-span-2">
                        <Label className="text-[9px] uppercase tracking-widest text-neutral-400">YouTube Channel/Main Link</Label>
                        <Input 
                          value={config.freeRecipeMedia?.youtubeLink || ""}
                          onChange={(e) => setConfig({...config, freeRecipeMedia: {...(config.freeRecipeMedia || {title: '', subtitle: '', videos: []}), youtubeLink: e.target.value}})}
                          className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-10 text-sm"
                          placeholder="https://youtube.com/@lecole_caku"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-serif text-neutral-900">Manage Videos</h3>
                        <p className="text-xs text-neutral-400 mt-1">Add, edit, or remove featured YouTube videos.</p>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => {
                          const newVideo = { 
                            id: Math.random().toString(36).substr(2, 9), 
                            title: 'New Video Title', 
                            description: 'L\'ecole Caku Free Recipe',
                            youtubeUrl: '' 
                          };
                          const currentVideos = config.freeRecipeMedia?.videos || [];
                          setConfig({
                            ...config, 
                            freeRecipeMedia: {
                              ...(config.freeRecipeMedia || {title: '무료 레시피 미디어', subtitle: 'WATCH ON YOUTUBE →', videos: []}),
                              videos: [...currentVideos, newVideo]
                            }
                          });
                        }}
                        className="bg-brand-accent text-white hover:bg-brand-accent/90 gap-2 h-9 px-4 text-[10px] uppercase tracking-widest font-bold"
                      >
                        <Plus className="w-3 h-3" />
                        Add New Video
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {(config.freeRecipeMedia?.videos || []).map((video, idx) => (
                        <Card key={video.id} className="bg-white border-neutral-100 overflow-hidden">
                          <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                              <div className="md:col-span-1 space-y-3">
                                <Label className="text-[9px] uppercase tracking-widest text-neutral-400 block mb-2">Video Preview</Label>
                                <div className="aspect-video bg-neutral-100 rounded-sm overflow-hidden relative group">
                                  {video.thumbnail || video.youtubeUrl ? (
                                    <img 
                                      src={video.thumbnail || `https://img.youtube.com/vi/${video.youtubeUrl.split('v=')[1]?.split('&')[0] || video.youtubeUrl.split('/').pop()}/hqdefault.jpg`}
                                      className="w-full h-full object-cover"
                                      alt="Thumbnail"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <ImageIcon className="w-6 h-6 text-neutral-300" />
                                    </div>
                                  )}
                                  <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          if (file.size > 2 * 1024 * 1024) {
                                            toast.error("이미지 크기가 너무 큽니다. (2MB 이하 권장)");
                                            return;
                                          }
                                          const reader = new FileReader();
                                          reader.onloadend = async () => {
                                            const compressed = await compressImage(reader.result as string, 800, 600, 0.7);
                                            const newVideos = [...(config.freeRecipeMedia?.videos || [])];
                                            newVideos[idx] = { ...video, thumbnail: compressed };
                                            setConfig({ ...config, freeRecipeMedia: { ...config.freeRecipeMedia!, videos: newVideos } });
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                    <Camera className="w-5 h-5 text-white" />
                                  </label>
                                  {video.thumbnail && (
                                    <button 
                                      onClick={() => {
                                        const newVideos = [...(config.freeRecipeMedia?.videos || [])];
                                        newVideos[idx] = { ...video, thumbnail: "" };
                                        setConfig({ ...config, freeRecipeMedia: { ...config.freeRecipeMedia!, videos: newVideos } });
                                      }}
                                      className="absolute top-2 right-2 p-1 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                <p className="text-[8px] text-neutral-400 text-center">Click to upload custom thumbnail</p>
                              </div>
                              <div className="md:col-span-3 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Video Title</Label>
                                    <Input 
                                      value={video.title}
                                      onChange={(e) => {
                                        const newVideos = [...(config.freeRecipeMedia?.videos || [])];
                                        newVideos[idx] = { ...video, title: e.target.value };
                                        setConfig({ ...config, freeRecipeMedia: { ...config.freeRecipeMedia!, videos: newVideos } });
                                      }}
                                      className="border-neutral-100 focus:border-brand-accent h-9 text-xs"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-[9px] uppercase tracking-widest text-neutral-400">YouTube URL</Label>
                                    <Input 
                                      value={video.youtubeUrl}
                                      onChange={(e) => {
                                        const newVideos = [...(config.freeRecipeMedia?.videos || [])];
                                        newVideos[idx] = { ...video, youtubeUrl: e.target.value };
                                        setConfig({ ...config, freeRecipeMedia: { ...config.freeRecipeMedia!, videos: newVideos } });
                                      }}
                                      placeholder="https://www.youtube.com/watch?v=..."
                                      className="border-neutral-100 focus:border-brand-accent h-9 text-xs"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-end justify-between gap-4">
                                  <div className="flex-1 space-y-2">
                                    <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Description/Label</Label>
                                    <Input 
                                      value={video.description}
                                      onChange={(e) => {
                                        const newVideos = [...(config.freeRecipeMedia?.videos || [])];
                                        newVideos[idx] = { ...video, description: e.target.value };
                                        setConfig({ ...config, freeRecipeMedia: { ...config.freeRecipeMedia!, videos: newVideos } });
                                      }}
                                      className="border-neutral-100 focus:border-brand-accent h-9 text-xs"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <div className="flex flex-col gap-1">
                                      <Button 
                                        variant="outline" 
                                        size="icon" 
                                        disabled={idx === 0}
                                        onClick={() => {
                                          const newVideos = [...(config.freeRecipeMedia?.videos || [])];
                                          [newVideos[idx-1], newVideos[idx]] = [newVideos[idx], newVideos[idx-1]];
                                          setConfig({ ...config, freeRecipeMedia: { ...config.freeRecipeMedia!, videos: newVideos } });
                                        }}
                                        className="h-8 w-8 rounded-full border-neutral-100 text-neutral-400 hover:text-neutral-900"
                                      >
                                        <ChevronUp className="w-3 h-3" />
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="icon"
                                        disabled={idx === (config.freeRecipeMedia?.videos || []).length - 1}
                                        onClick={() => {
                                          const newVideos = [...(config.freeRecipeMedia?.videos || [])];
                                          [newVideos[idx], newVideos[idx+1]] = [newVideos[idx+1], newVideos[idx]];
                                          setConfig({ ...config, freeRecipeMedia: { ...config.freeRecipeMedia!, videos: newVideos } });
                                        }}
                                        className="h-8 w-8 rounded-full border-neutral-100 text-neutral-400 hover:text-neutral-900"
                                      >
                                        <ChevronDown className="w-3 h-3" />
                                      </Button>
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => {
                                        const newVideos = (config.freeRecipeMedia?.videos || []).filter(v => v.id !== video.id);
                                        setConfig({ ...config, freeRecipeMedia: { ...config.freeRecipeMedia!, videos: newVideos } });
                                      }}
                                      className="h-8 w-8 text-neutral-300 hover:text-red-500 hover:bg-red-50 self-center"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="mt-0 space-y-12">
              {!config ? (
                <div className="p-20 text-center opacity-50 uppercase tracking-[0.5em] text-xs">Initializing Database...</div>
              ) : (
                <Card className="bg-white border-neutral-100 text-neutral-900 shadow-sm overflow-hidden group hover:border-brand-accent/50 transition-colors max-w-2xl">
                  <div className="h-1 bg-brand-accent opacity-10 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-4 h-4 text-brand-accent" />
                        <CardTitle className="text-xs uppercase tracking-[0.3em] font-light text-neutral-400">Review Section Settings</CardTitle>
                      </div>
                      <Button 
                        onClick={handleUpdateConfig} 
                        disabled={isSavingConfig}
                        size="sm"
                        className="bg-neutral-900 text-white font-bold uppercase tracking-widest gap-2 h-8 px-4 hover:bg-neutral-800 shadow-sm text-[9px]"
                      >
                        {isSavingConfig ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Save Settings
                      </Button>
                    </div>
                    <p className="text-[10px] text-neutral-400 font-light mt-2">Main section headings for student reviews.</p>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-[9px] uppercase tracking-widest text-brand-accent font-semibold">Sub-title (Label)</Label>
                      <Input 
                        value={config.reviews?.subtitle || ""}
                        onChange={(e) => setConfig({...config, reviews: {...(config.reviews || {title: '', subtitle: ''}), subtitle: e.target.value}})}
                        className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-10 text-sm"
                        placeholder="STUDENT STORIES"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Section Main Title</Label>
                      <Input 
                        value={config.reviews?.title || ""}
                        onChange={(e) => setConfig({...config, reviews: {...(config.reviews || {title: '', subtitle: ''}), title: e.target.value}})}
                        className="bg-neutral-50 border-neutral-100 focus:border-brand-accent h-10 text-sm"
                        placeholder="Cinematic Moments"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 gap-6">
                {reviews.map(r => (
                  <div key={r.id} className="bg-white p-6 rounded-sm flex items-center justify-between border border-neutral-100 hover:border-brand-accent/20 transition-all group shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] uppercase tracking-widest text-brand-accent font-bold">{r.author}</span>
                        <div className="w-1 h-1 rounded-full bg-neutral-200" />
                        <span className="text-[10px] text-neutral-400 uppercase tracking-widest">{new Date(r.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}</span>
                      </div>
                      <p className="font-serif italic text-lg text-neutral-800 leading-relaxed max-w-3xl">“{r.content}”</p>
                    </div>
                    <div className="flex flex-col items-end gap-3 ml-12">
                      <Badge variant="outline" className={`text-[8px] uppercase tracking-widest px-3 py-1 ${r.isDisplayed ? 'border-brand-accent text-brand-accent' : 'border-neutral-200 text-neutral-400'}`}>
                        {r.isDisplayed ? 'Visible' : 'Hidden'}
                      </Badge>
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setEditingReview(r)}
                          className="h-8 w-8 text-neutral-400 hover:text-brand-accent"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteReview(r.id)}
                          className="h-8 w-8 text-neutral-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Switch 
                          checked={r.isDisplayed} 
                          onCheckedChange={() => toggleReviewVisibility(r.id, r.isDisplayed)} 
                          className="data-[state=checked]:bg-brand-accent h-5 w-10 ml-2"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Dialog open={!!editingReview} onOpenChange={(open) => !open && setEditingReview(null)}>
                <DialogContent className="max-w-xl bg-white">
                  <DialogHeader>
                    <DialogTitle className="font-serif italic text-2xl">Edit Review Content</DialogTitle>
                  </DialogHeader>
                  {editingReview && (
                    <div className="space-y-6 py-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest font-semibold">Author Name</Label>
                        <Input 
                          value={editingReview.author || ""} 
                          onChange={(e) => setEditingReview({...editingReview, author: e.target.value})}
                          placeholder="e.g. Lee Min-ah"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest font-semibold">Review Content</Label>
                        <Textarea 
                          className="h-40 font-serif italic text-lg leading-relaxed"
                          value={editingReview.content || ""} 
                          onChange={(e) => setEditingReview({...editingReview, content: e.target.value})}
                          placeholder="“Enter the review text here...”"
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-neutral-50 rounded border border-neutral-100">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase tracking-widest font-semibold">Display Status</Label>
                          <p className="text-[9px] text-neutral-400 uppercase tracking-widest">Toggle visibility on main page</p>
                        </div>
                        <Switch 
                          checked={editingReview.isDisplayed} 
                          onCheckedChange={(checked) => setEditingReview({ ...editingReview, isDisplayed: checked })}
                          className="data-[state=checked]:bg-brand-accent"
                        />
                      </div>
                    </div>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingReview(null)}>Cancel</Button>
                    <Button 
                      onClick={handleSaveReview} 
                      disabled={isReviewSaving}
                      className="bg-neutral-900 text-white"
                    >
                      {isReviewSaving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Commit Review
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="orders" className="mt-0">
              <div className="bg-white rounded-sm border border-neutral-100 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-neutral-50 border-b border-neutral-100">
                    <tr>
                      <th className="p-6 text-[9px] uppercase tracking-[0.3em] font-light text-neutral-400">Registrant</th>
                      <th className="p-6 text-[9px] uppercase tracking-[0.3em] font-light text-neutral-400">Contact Info</th>
                      <th className="p-6 text-[9px] uppercase tracking-[0.3em] font-light text-neutral-400">Category</th>
                      <th className="p-6 text-[9px] uppercase tracking-[0.3em] font-light text-neutral-400">Process State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                        <tr><td colSpan={4} className="p-20 text-center text-[10px] uppercase tracking-widest opacity-30 text-neutral-900">No transaction records found</td></tr>
                    ) : orders.map(o => (
                      <tr key={o.id} className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors group">
                        <td className="p-6">
                            <div className="flex flex-col">
                                <span className="text-sm font-serif italic text-brand-accent group-hover:text-neutral-900 transition-colors">{o.customerName}</span>
                                <span className="text-[9px] text-neutral-300 font-mono mt-1 uppercase">ID: {o.id.substring(0, 6)}</span>
                            </div>
                        </td>
                        <td className="p-6 text-[11px] text-neutral-500 tracking-wider">{o.phone}</td>
                        <td className="p-6"><Badge variant="outline" className="text-[8px] uppercase tracking-widest border-brand-accent/20 text-brand-accent h-6 px-3">{o.type}</Badge></td>
                        <td className="p-6">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                                <span className="text-[10px] uppercase tracking-[0.2em] font-light text-neutral-600">{o.status}</span>
                            </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="md:col-span-1 space-y-4">
                  <h3 className="text-xl font-serif italic text-brand-accent">Authority Control</h3>
                  <p className="text-xs text-neutral-400 leading-loose font-light">
                    Update your security credentials and system access points. Changes require immediate re-authentication of the administrator session.
                  </p>
                </div>
                <Card className="bg-white border-neutral-100 text-neutral-900 shadow-sm md:col-span-2 overflow-hidden">
                   <div className="h-1 bg-brand-accent" />
                   <CardHeader className="p-8">
                     <CardTitle className="text-xs uppercase tracking-[0.3em] font-light text-neutral-400">Security Layers</CardTitle>
                   </CardHeader>
                   <CardContent className="p-10 pt-0">
                      {!isAdmin && (
                        <div className="bg-amber-50 border border-amber-100 p-8 rounded-sm mb-10 flex flex-col md:flex-row items-center justify-between gap-8 animate-in fade-in slide-in-from-top-4 duration-700">
                          <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                <h4 className="text-[10px] uppercase tracking-[0.3em] text-amber-800 font-bold">Privilege Alert</h4>
                              </div>
                              <p className="text-[11px] text-amber-700 leading-relaxed font-light">현재 관리자(Admin) 권한이 활성화되지 않았습니다. 사이트 설정을 수정하려면 아래 버튼을 통해 본인 계정을 관리자 DB에 등록하십시오.</p>
                          </div>
                          <Button 
                            onClick={async () => {
                              try {
                                await setDoc(doc(db, 'admins', auth.currentUser?.uid || ''), {
                                  email: auth.currentUser?.email,
                                  createdAt: new Date()
                                });
                                setIsAdmin(true);
                                toast.success("관리자 권한이 승인되었습니다. 이제 모든 기능을 사용할 수 있습니다.");
                              } catch (err) {
                                toast.error("관리자 등록에 실패했습니다. (보안 규칙 확인 필요)");
                              }
                            }}
                            className="whitespace-nowrap bg-amber-600 hover:bg-amber-700 text-white border-0 text-[10px] uppercase tracking-[0.4em] font-bold h-12 px-8 rounded-none shadow-lg shadow-amber-900/10"
                          >
                            Initialize Admin
                          </Button>
                        </div>
                      )}
                      <form onSubmit={handleUpdateAccount} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Security Email Address</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
                              <Input 
                                type="email" 
                                value={newEmail} 
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="bg-neutral-50 border-neutral-100 pl-12 h-14 text-sm focus:border-brand-accent transition-all"
                              />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase tracking-widest text-neutral-400">Update Password Token</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
                              <Input 
                                type="password" 
                                value={newPassword} 
                                placeholder="Min. 8 Chars"
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="bg-neutral-50 border-neutral-100 pl-12 h-14 text-sm focus:border-brand-accent transition-all"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-10 border-t border-neutral-100">
                          <Label className="text-[10px] uppercase tracking-[0.3em] text-brand-accent mb-4 block font-bold">Verification Component Required</Label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-accent/40" />
                            <Input 
                              type="password" 
                              value={currentPassword} 
                              placeholder="Enter current password to finalize changes"
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="bg-neutral-50 border-brand-accent/10 pl-14 h-16 text-sm focus:border-brand-accent transition-all placeholder:text-[10px] placeholder:tracking-widest uppercase"
                              required
                            />
                          </div>
                        </div>

                        <Button 
                          type="submit" 
                          disabled={isUpdating}
                          className="w-full bg-neutral-900 text-white font-bold uppercase tracking-[0.3em] h-16 hover:bg-brand-accent hover:text-brand-ink text-xs shadow-sm transition-all"
                        >
                          {isUpdating ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Deploy Security Updates"}
                        </Button>
                      </form>
                   </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>

  );
}

