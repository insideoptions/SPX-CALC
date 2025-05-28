import React, { createContext, useContext, useEffect, useState } from "react";

// Types
interface User {
  email: string;
  name: string;
  picture: string;
  id: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithGoogle: () => void;
  signOut: () => void;
}

// YOUR AUTHORIZED EMAILS
const AUTHORIZED_EMAILS = [
  "michael@insideoptions.io",
  "michaelarroz@gmail.com",
  "michael@spxprogram.com",
  // Add more authorized emails here as needed
];

const AuthContext = createContext<AuthContextType | null>(null);

// Google Auth Provider with Redirect Flow
export const GoogleAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if we're returning from Google OAuth
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");

        if (code) {
          // We have an authorization code, exchange it for user info
          await handleAuthCode(code);
          // Clean up the URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        } else {
          // Check if user is already signed in
          const savedUser = localStorage.getItem("googleUser");
          if (savedUser) {
            try {
              const userData = JSON.parse(savedUser);
              if (AUTHORIZED_EMAILS.includes(userData.email.toLowerCase())) {
                setUser(userData);
              } else {
                localStorage.removeItem("googleUser");
              }
            } catch (error) {
              localStorage.removeItem("googleUser");
            }
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const handleAuthCode = async (code: string) => {
    try {
      // In a real implementation, you'd exchange the code for tokens on your backend
      // For now, we'll use the Google API to get user info
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code: code,
          client_id:
            "608251487888-svu2qkjsjqtbptqe2je14b9a2paqovg6.apps.googleusercontent.com",
          client_secret: "", // This should be on your backend in production
          redirect_uri: window.location.origin,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to exchange code for token");
      }

      const tokenData = await tokenResponse.json();

      // Get user info using the access token
      const userResponse = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`
      );

      if (!userResponse.ok) {
        throw new Error("Failed to get user info");
      }

      const googleUser = await userResponse.json();

      const userData: User = {
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
      };

      // Check if email is authorized
      if (!AUTHORIZED_EMAILS.includes(userData.email.toLowerCase())) {
        alert(
          "Your email is not authorized to access this application. Please contact the administrator."
        );
        return;
      }

      // Save user data
      setUser(userData);
      localStorage.setItem("googleUser", JSON.stringify(userData));
    } catch (error) {
      console.error("Error handling auth code:", error);
      alert("Authentication failed. Please try again.");
    }
  };

  const signInWithGoogle = () => {
    const clientId =
      "608251487888-svu2qkjsjqtbptqe2je14b9a2paqovg6.apps.googleusercontent.com";
    const redirectUri = window.location.origin;
    const scope = "openid email profile";

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=select_account`;

    window.location.href = authUrl;
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem("googleUser");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within a GoogleAuthProvider");
  }
  return context;
};

// Add types for window
declare global {
  interface Window {
    google: any;
  }
}
