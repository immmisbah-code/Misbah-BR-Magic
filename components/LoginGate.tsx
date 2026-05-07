import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface LoginGateProps {
  onLogin: (username: string, pass: string) => void;
}

export const LoginGate = ({ onLogin }: LoginGateProps) => {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showForgotMsg, setShowForgotMsg] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] overflow-hidden rounded-[2.5rem] bg-white">
          <CardHeader className="pt-12 pb-8 px-10 text-center">
            <motion.div 
              whileHover={{ rotate: 5, scale: 1.1 }}
              className="bg-[#2ca01c] p-4 rounded-2xl shadow-xl shadow-emerald-100 w-fit mx-auto mb-6"
            >
              <FileSpreadsheet className="w-8 h-8 text-white" />
            </motion.div>
            <CardTitle className="text-3xl font-bold text-[#393a3d]">Authorization</CardTitle>
            <CardDescription className="text-sm font-medium mt-2">Welcome to Misbah's BR Magic</CardDescription>
          </CardHeader>
          <CardContent className="px-10 pb-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Username</Label>
                <Input 
                  type="text" 
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Password</Label>
                <Input 
                  type="password" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-all font-medium"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-14 bg-[#393a3d] hover:bg-black text-white font-bold text-lg rounded-2xl shadow-lg transition-all active:scale-[0.98]"
              >
                Verify Access
              </Button>
              <div className="text-center">
                <button 
                  type="button"
                  onClick={() => setShowForgotMsg(true)}
                  className="text-xs font-bold text-slate-400 hover:text-[#2ca01c] transition-colors"
                >
                  Forgot access key?
                </button>
              </div>
            </form>

            <AnimatePresence>
              {showForgotMsg && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6"
                >
                  <Alert className="bg-blue-50 border-blue-100 rounded-2xl">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-[11px] text-blue-800 font-medium">
                      Please contact the administrator at <span className="font-bold underline">n2m@tuta.io</span> for password recovery.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowForgotMsg(false)}
                    className="w-full mt-2 text-[10px] uppercase font-black text-slate-400 hover:text-slate-600"
                  >
                    Close Notification
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
