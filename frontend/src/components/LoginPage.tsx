import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { Building2, KeyRound, User, Eye, EyeOff, Loader2, Info } from "lucide-react";

export function LoginPage() {
  const { login } = useStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await login(username, password);
      toast.success("Logged in successfully!");
    } catch (err: any) {
      setError(err.message || "Invalid username or password.");
      toast.error(err.message || "Login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutofill = () => {
    setUsername("sagar_menat");
    setPassword("Test@123");
    setError(null);
    toast.info("Demo credentials loaded!");
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Decorative blurred background elements */}
      <div className="absolute -top-40 -left-40 h-[350px] w-[350px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-[350px] w-[350px] rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
      
      <Card className="w-full max-w-md border border-border/40 bg-card/60 backdrop-blur-md shadow-2xl relative z-10 transition-all duration-300">
        <CardHeader className="space-y-2 text-center pb-8 border-b border-border/10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform duration-300 hover:scale-105">
            <Building2 className="h-6 w-6 animate-pulse" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground mt-4">
            ACME Compensation Portal
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            Please log in with your HR Manager credentials
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5 pt-6">
            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive animate-in fade-in slide-in-from-top-1">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="font-medium leading-relaxed">{error}</div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="hr_manager"
                  className="pl-9 h-10 border-input bg-background/50 hover:bg-background/80 focus:bg-background transition-colors"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="relative">
                <KeyRound className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-9 pr-10 h-10 border-input bg-background/50 hover:bg-background/80 focus:bg-background transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pb-6 pt-2">
            <Button
              type="submit"
              className="w-full h-10 font-medium tracking-wide transition-all shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/25 cursor-pointer disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Log In"
              )}
            </Button>

            <div className="w-full border-t border-border/10 my-1" />

            {/* Premium Demo Credentials Helper */}
            <div className="w-full rounded-xl border border-primary/15 bg-primary/5 p-4 text-center transition-all duration-300 hover:border-primary/30 hover:bg-primary/10">
              <p className="text-xs font-semibold text-primary mb-1">Development Assistant</p>
              <p className="text-[10px] text-muted-foreground leading-normal mb-3">
                Quick-access seeded manager credentials
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 border-primary/20 hover:border-primary bg-background hover:bg-primary hover:text-primary-foreground font-medium transition-all"
                onClick={handleAutofill}
                disabled={isLoading}
              >
                Autofill Credentials
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
