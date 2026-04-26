import { useState, useEffect, useRef } from 'react';
import { MapPin, Car, Footprints as Walk, MessageCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

declare global {
  interface Window {
    kakao: any;
  }
}

interface MapConfig {
  title: string;
  address: string;
  parking: string;
  walkInfo: string;
  lat: number;
  lng: number;
  buttonText: string;
  buttonLink: string;
  kakaoApiKey: string;
}

export default function ContactMap({ config }: { config?: MapConfig }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  
  const title = config?.title || "스튜디오 오시는 길";
  const address = config?.address || "경기도 고양시 일산동구 정발산동... \n(상세 주소는 예약 확정 시 안내 드립니다)";
  const parking = config?.parking || "스튜디오 건물 내 1대 주차 가능하며, 도보 3분 거리에 공영주차장이 위치해 있습니다.";
  const walkInfo = config?.walkInfo || "정발산역 1번 출구에서 밤가시마을 공원을 따라 걷는 쾌적한 산책로를 권장합니다.";
  const buttonText = config?.buttonText || "상담 및 신청하기";
  const buttonLink = config?.buttonLink || "";
  const kakaoApiKey = config?.kakaoApiKey?.trim() || "";

  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setScriptError(false);
  }, [kakaoApiKey]);

  useEffect(() => {
    if (!kakaoApiKey) return;

    const scriptId = 'kakao-map-script';
    let existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    // Fix: If key changed, we must reload the script
    if (existingScript && !existingScript.src.includes(`appkey=${kakaoApiKey}`)) {
      existingScript.remove();
      existingScript = null;
      if (window.kakao) {
        try {
          delete (window as any).kakao;
        } catch (e) {}
      }
    }

    // If there was a script error previously, remove the old script tag to allow a fresh attempt
    if (scriptError && existingScript) {
      existingScript.remove();
      existingScript = null;
    }

    const initMap = () => {
      if (!mapRef.current) return;
      
      try {
        if (!window.kakao || !window.kakao.maps) {
          return;
        }

        const container = mapRef.current;
        const lat = config?.lat || 37.66;
        const lng = config?.lng || 126.77;
        
        const options = {
          center: new window.kakao.maps.LatLng(lat, lng),
          level: 3
        };
        
        const map = new window.kakao.maps.Map(container, options);
        
        // Add Marker
        const markerPosition = new window.kakao.maps.LatLng(lat, lng);
        const marker = new window.kakao.maps.Marker({
          position: markerPosition
        });
        marker.setMap(map);

        // Add Zoom Control
        const zoomControl = new window.kakao.maps.ZoomControl();
        map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);
        
        setIsLoaded(true);

        const handleResize = () => {
          map.relayout();
          const newCenter = new window.kakao.maps.LatLng(config?.lat || lat, config?.lng || lng);
          map.setCenter(newCenter);
        };

        window.addEventListener('resize', handleResize);
        cleanupRef.current = () => window.removeEventListener('resize', handleResize);
      } catch (error) {
        console.error("Error initializing Kakao Map:", error);
      }
    };

    if (!existingScript) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&libraries=services&autoload=false`;
      script.async = true;
      script.onload = () => {
        if (window.kakao && window.kakao.maps) {
          window.kakao.maps.load(initMap);
        }
      };
      script.onerror = () => {
        console.error("Failed to load Kakao Map script");
        setScriptError(true);
        setIsLoaded(false);
      };
      document.head.appendChild(script);
    } else {
      setScriptError(false);
      if (window.kakao && window.kakao.maps) {
        // Check if Map is already available, otherwise load it
        if (window.kakao.maps.Map) {
          initMap();
        } else {
          window.kakao.maps.load(initMap);
        }
      } else {
        const checkInterval = setInterval(() => {
          if (window.kakao && window.kakao.maps && window.kakao.maps.Map) {
            initMap();
            clearInterval(checkInterval);
          } else if (window.kakao && window.kakao.maps) {
            window.kakao.maps.load(initMap);
            clearInterval(checkInterval);
          }
        }, 100);
        setTimeout(() => clearInterval(checkInterval), 3000);
      }
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [kakaoApiKey, config?.lat, config?.lng]);

  return (
    <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-5 gap-12">
      <div className="md:col-span-3">
        <div className="aspect-[16/9] w-full bg-neutral-100 rounded-sm overflow-hidden border border-brand-accent/10 relative">
          <div ref={mapRef} className="w-full h-full" />
          
          {!kakaoApiKey && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 gap-4 bg-neutral-50 px-8 text-center">
              <MapPin className="w-12 h-12 opacity-20" />
              <div className="space-y-1">
                <p className="text-sm font-medium">카카오 지도 API 키가 설정되지 않았습니다.</p>
                <p className="text-[10px] opacity-60">관리자 페이지에서 API 키를 입력하면 지도가 활성화됩니다.</p>
              </div>
            </div>
          )}
          
          {kakaoApiKey && !isLoaded && !scriptError && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-50">
              <div className="w-6 h-6 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {scriptError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 gap-4 bg-red-50/50 px-8 text-center backdrop-blur-[2px]">
              <AlertCircle className="w-10 h-10 opacity-30" />
              <div className="space-y-2">
                <p className="text-sm font-bold text-red-900">지도 스크립트 로드 실패</p>
                <div className="text-[10px] text-red-700/80 space-y-1">
                  <p>카카오 개발자 콘솔에 본 사이트 도메인이 등록되었는지 확인해 주세요.</p>
                  <p className="font-mono bg-white/50 p-1 rounded tracking-tighter select-all">{window.location.origin}</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-2 h-8 border-red-200 text-red-600 hover:bg-red-50 text-[10px] uppercase tracking-widest px-4"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="w-3 h-3 mr-2" />
                  새로고침
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="md:col-span-2 space-y-12">
        <div>
          <h3 className="text-3xl font-serif mb-6 italic">{title}</h3>
          <p className="text-neutral-600 text-sm leading-loose whitespace-pre-line">
            {address}
          </p>
        </div>

        <div className="space-y-8">
          <div className="flex gap-4">
            <div className="bg-brand-accent/10 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
              <Car className="w-4 h-4 text-brand-accent" />
            </div>
            <div>
              <h5 className="font-medium text-sm mb-1 uppercase tracking-wider">주차 안내</h5>
              <p className="text-xs text-neutral-500 leading-normal">
                {parking}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-brand-accent/10 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
              <Walk className="w-4 h-4 text-brand-accent" />
            </div>
            <div>
              <h5 className="font-medium text-sm mb-1 uppercase tracking-wider">도보 이동</h5>
              <p className="text-xs text-neutral-500 leading-normal">
                {walkInfo}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-brand-accent/10">
          <Button 
            onClick={() => buttonLink && window.open(buttonLink, '_blank')}
            className={`w-full rounded-none bg-brand-ink text-brand-warm hover:bg-white h-14 uppercase tracking-widest gap-2 shadow-xl shadow-brand-ink/10 transition-all hover:scale-[1.03] active:scale-95 ${!buttonLink ? 'opacity-30 grayscale' : ''}`}
          >
            <MessageCircle className="w-4 h-4 fill-brand-warm" />
            {buttonText}
          </Button>
          {!buttonLink && (
            <p className="text-[9px] text-center mt-3 text-neutral-500 uppercase tracking-widest">설정에서 링크를 입력해 주세요</p>
          )}
        </div>
      </div>
    </div>
  );
}
