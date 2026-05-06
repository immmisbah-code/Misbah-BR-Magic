import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileSpreadsheet, UserPlus, LogIn, Mail, Share2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Toaster, toast } from 'sonner';

type AuthMode = 'login' | 'signup';

interface AuthGateProps {
  onLoginSuccess: (user: any) => void;
}

// Local Storage Helper
const AUTH_KEY = 'br_magic_users';
const SESSION_KEY = 'br_magic_session';

const getStoredUsers = () => {
  const usersStr = localStorage.getItem(AUTH_KEY);
  let users = usersStr ? JSON.parse(usersStr) : [];
  
  // Ensure master account Misbah is always present
  const masterAccount = { 
    username: 'Misbah', 
    password: 'Mas*1686', 
    name: 'Misbah',
    status: 'approved'
  };

  const hasMaster = users.some((u: any) => u.username === masterAccount.username);
  if (!hasMaster) {
    users.unshift(masterAccount);
    localStorage.setItem(AUTH_KEY, JSON.stringify(users));
  }
  
  return users;
};

const saveUser = (user: any) => {
  const users = getStoredUsers();
  users.push(user);
  localStorage.setItem(AUTH_KEY, JSON.stringify(users));
};

export const LoginGate = ({ onLoginSuccess }: AuthGateProps) => {
  const [mode, setMode] = React.useState<AuthMode>('login');
  const [isLoading, setIsLoading] = React.useState(false);
  
  // Login State
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  
  // Signup State
  const [userData, setUserData] = React.useState({
    name: '',
    age: '',
    profession: '',
    education: '',
    dob: '',
    sex: 'male' as 'male' | 'female' | 'other',
    address: '',
    email: '',
    username: '',
    password: ''
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate slight delay
    setTimeout(() => {
      const users = getStoredUsers();
      const user = users.find((u: any) => u.username === username && u.password === password);

      if (user) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        toast.success(`Welcome back, ${user.name}!`);
        onLoginSuccess(user);
      } else {
        toast.error('Invalid credentials');
      }
      setIsLoading(false);
    }, 500);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const users = getStoredUsers();
      
      // Validation
      if (users.find((u: any) => u.username === userData.username || u.username === userData.email)) {
        toast.error('Username or email already exists');
        setIsLoading(false);
        return;
      }

      const newUser = {
        ...userData,
        username: userData.username || userData.email, // Use email as fallback
        status: 'approved' // Automatically approved for this version
      };

      saveUser(newUser);
      toast.success('Account created successfully! You can now login.');
      setMode('login');
      setUsername(newUser.username);
      setIsLoading(false);
    }, 800);
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: "Misbah's BR Magic",
        text: 'Automate your bank reconciliation with BR Magic!',
        url: url,
      }).catch(() => {
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center p-6 font-sans">
      <Toaster position="top-center" richColors />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl"
      >
        <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] overflow-hidden rounded-[2.5rem] bg-white">
          <CardHeader className="pt-10 pb-6 px-10 text-center">
            <motion.div 
              whileHover={{ rotate: 5, scale: 1.1 }}
              className="bg-[#2ca01c] p-4 rounded-2xl shadow-xl shadow-emerald-100 w-fit mx-auto mb-4"
            >
              <FileSpreadsheet className="w-8 h-8 text-white" />
            </motion.div>
            <CardTitle className="text-3xl font-bold text-[#393a3d]">
              {mode === 'login' ? 'Authorization' : 'New Account'}
            </CardTitle>
            <CardDescription className="text-sm font-medium mt-2">
              {mode === 'login' ? "Welcome to Misbah's BR Magic" : "Join our secure reconciliation system"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-10 pb-10">
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email / Username</Label>
                  <Input 
                    required
                    placeholder="Enter your email or username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 rounded-xl border-slate-100 bg-slate-50 focus:bg-white transition-all focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Password</Label>
                  <Input 
                    required
                    type="password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl border-slate-100 bg-slate-50 focus:bg-white transition-all focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="space-y-4">
                  <Button 
                    disabled={isLoading}
                    type="submit" 
                    className="w-full h-14 bg-[#393a3d] hover:bg-black text-white font-bold text-lg rounded-2xl shadow-lg transition-all active:scale-[0.98]"
                  >
                    {isLoading ? 'Processing...' : 'Secure Login'}
                  </Button>
                  
                  <button 
                    type="button"
                    onClick={() => {
                      setUsername('Misbah');
                      setPassword('Mas*1686');
                      toast.info('Master credentials auto-filled');
                    }}
                    className="w-full py-3 rounded-xl border border-dashed border-slate-200 text-[10px] font-bold text-slate-400 hover:border-emerald-500 hover:text-emerald-600 transition-all uppercase tracking-widest"
                  >
                    Quick-Access (Misbah)
                  </button>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                  <button 
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-xs font-bold text-slate-400 hover:text-[#2ca01c] flex items-center gap-1 transition-colors"
                  >
                    <UserPlus className="w-3 h-3" /> Create Account
                  </button>
                  <button 
                    type="button"
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Help Center
                  </button>
                </div>
              </form>
            )}

            {mode === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Full Name</Label>
                    <Input required value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} className="h-10 rounded-lg"/>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Email</Label>
                    <Input required type="email" value={userData.email} onChange={e => setUserData({...userData, email: e.target.value})} className="h-10 rounded-lg"/>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Age</Label>
                    <Input required type="number" value={userData.age} onChange={e => setUserData({...userData, age: e.target.value})} className="h-10 rounded-lg"/>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-400">DOB</Label>
                    <Input required type="date" value={userData.dob} onChange={e => setUserData({...userData, dob: e.target.value})} className="h-10 rounded-lg"/>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Sex</Label>
                    <select 
                      value={userData.sex} 
                      onChange={e => setUserData({...userData, sex: e.target.value as any})}
                      className="w-full h-10 px-3 rounded-lg border border-slate-100 bg-slate-50 text-sm"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Profession</Label>
                    <Input required value={userData.profession} onChange={e => setUserData({...userData, profession: e.target.value})} className="h-10 rounded-lg"/>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Education</Label>
                    <Input required value={userData.education} onChange={e => setUserData({...userData, education: e.target.value})} className="h-10 rounded-lg"/>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Address</Label>
                  <Input required value={userData.address} onChange={e => setUserData({...userData, address: e.target.value})} className="h-10 rounded-lg"/>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-[#2ca01c]">Desired Username</Label>
                    <Input required value={userData.username} onChange={e => setUserData({...userData, username: e.target.value})} className="h-10 rounded-lg border-emerald-100 placeholder:text-slate-300" placeholder="Optional if using email"/>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-[#2ca01c]">Desired Password</Label>
                    <Input required type="password" value={userData.password} onChange={e => setUserData({...userData, password: e.target.value})} className="h-10 rounded-lg border-emerald-100"/>
                  </div>
                </div>

                <Button 
                  disabled={isLoading}
                  type="submit" 
                  className="w-full h-12 bg-[#2ca01c] hover:bg-emerald-700 text-white font-bold rounded-xl mt-4"
                >
                  {isLoading ? 'Creating Account...' : 'Complete Registration'}
                </Button>
                
                <button 
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 pt-2"
                >
                  <LogIn className="w-3 h-3" /> Back to Login
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Floating Share Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleShare}
        className="fixed bottom-8 right-8 z-[60] bg-[#2ca01c] text-white p-4 rounded-full shadow-2xl shadow-emerald-200 hover:bg-[#248a18] transition-all flex items-center gap-2 group"
      >
        <Share2 className="w-5 h-5" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-bold text-sm whitespace-nowrap">
          Share with Friends
        </span>
      </motion.button>
    </div>
  );
};
