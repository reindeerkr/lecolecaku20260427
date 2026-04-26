import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GithubAuthProvider
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { toast } from "sonner";
import { Github } from "lucide-react";

export default function LoginModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("관리자로 로그인되었습니다.");
      onSuccess();
    } catch (error: any) {
      toast.error("로그인 정보를 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setIsLoading(true);
    try {
      const provider = new GithubAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success("GitHub 계정으로 로그인되었습니다.");
      onSuccess();
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        toast.error("Firebase Console에서 GitHub 로그인을 활성화해야 합니다.");
      } else {
        toast.error("GitHub 로그인에 실패했습니다: " + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Add to admins collection to grant access based on firestore.rules
      await setDoc(doc(db, "admins", user.uid), {
        email: user.email,
        createdAt: new Date().toISOString()
      });

      toast.success("관리자 계정이 성공적으로 생성되었습니다.");
      onSuccess();
    } catch (error: any) {
      toast.error("계정 생성에 실패했습니다: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] border-white/10 bg-neutral-950 text-white p-0 overflow-hidden shadow-2xl">
        <div className="p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="font-serif italic text-2xl text-brand-accent">CMS Access</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-neutral-900 border border-white/5 mb-8">
              <TabsTrigger value="login" className="text-[10px] uppercase tracking-widest data-[state=active]:bg-brand-accent data-[state=active]:text-brand-ink">Login</TabsTrigger>
              <TabsTrigger value="register" className="text-[10px] uppercase tracking-widest data-[state=active]:bg-brand-accent data-[state=active]:text-brand-ink">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">ID / Email</Label>
                  <Input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-neutral-900 border-white/10 h-12 focus:border-brand-accent transition-colors" 
                    placeholder="name@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Password</Label>
                  <Input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-neutral-900 border-white/10 h-12 focus:border-brand-accent transition-colors"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-12 bg-brand-accent hover:bg-white text-brand-ink font-bold uppercase tracking-widest mt-6 transition-all"
                >
                  {isLoading ? "Processing..." : "Sign In"}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10"></span>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-neutral-950 px-2 text-neutral-500 tracking-widest">Or continue with</span>
                  </div>
                </div>

                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleGithubLogin}
                  disabled={isLoading}
                  className="w-full h-12 border-white/10 hover:bg-white/5 text-white font-medium gap-3"
                >
                  <Github className="w-4 h-4" />
                  GitHub Account
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">New Admin Email</Label>
                  <Input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-neutral-900 border-white/10 h-12 focus:border-brand-accent transition-colors" 
                    placeholder="admin@caku.co.kr"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Set Password</Label>
                  <Input 
                    type="password" 
                    value={password} 
                    placeholder="Min. 6 characters"
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-neutral-900 border-white/10 h-12 focus:border-brand-accent transition-colors"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-12 border border-brand-accent text-brand-accent hover:bg-brand-accent hover:text-brand-ink font-bold uppercase tracking-widest mt-6 transition-all bg-transparent"
                >
                  {isLoading ? "Creating..." : "Create Authority"}
                </Button>
                <p className="text-[9px] text-neutral-600 text-center mt-4">
                  첫 계정 생성 시 관리자 권한이 즉시 부여됩니다.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
