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
  "rkhirbat@gmail.com",
  "david@insideoptions.io",
  "roland@insideoptions.io",
  "broc@insideoptions.io",
  "josephle.mcse@gmail.com",
  "dchau2401@gmail.com",
];

const AuthContext = createContext<AuthContextType | null>(null);

// Google Auth Provider
export const GoogleAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeGoogleAuth = async () => {
      try {
        // Wait for Google API to load
        await new Promise<void>((resolve) => {
          if (window.google) {
            resolve();
          } else {
            const checkGoogle = setInterval(() => {
              if (window.google) {
                clearInterval(checkGoogle);
                resolve();
              }
            }, 100);

            setTimeout(() => {
              clearInterval(checkGoogle);
              resolve();
            }, 10000);
          }
        });

        // Initialize Google Auth
        if (window.google && window.google.accounts) {
          window.google.accounts.id.initialize({
            client_id:
              "608251487888-svu2qkjsjqtbptqe2je14b9a2paqovg6.apps.googleusercontent.com",
            callback: handleGoogleResponse,
            auto_select: false,
          });
        }

        // Check if user is already signed in
        const savedUser = localStorage.getItem("googleUser");
        if (savedUser) {
          try {
            const userData = JSON.parse(savedUser);
            if (
              userData.email &&
              AUTHORIZED_EMAILS.includes(userData.email.toLowerCase())
            ) {
              setUser(userData);
            } else {
              localStorage.removeItem("googleUser");
            }
          } catch (error) {
            localStorage.removeItem("googleUser");
          }
        }
      } catch (error) {
        console.error("Error initializing Google Auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeGoogleAuth();
  }, []);

  const handleGoogleResponse = (response: any) => {
    try {
      console.log("Google response:", response);

      if (!response.credential) {
        throw new Error("No credential received from Google");
      }

      // Decode the JWT token
      const decodedToken = JSON.parse(atob(response.credential.split(".")[1]));
      console.log("Decoded token:", decodedToken);

      const userData: User = {
        id: decodedToken.sub,
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture || "",
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
      console.log("User authenticated successfully");
    } catch (error) {
      console.error("Error handling Google response:", error);
      alert("Authentication failed. Please try again.");
    }
  };

  const signInWithGoogle = () => {
    console.log("Starting Google Sign-In...");

    if (window.google && window.google.accounts) {
      // Simple approach - just prompt for sign-in
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log(
            "Prompt not displayed, user may need to click sign-in button manually"
          );
          // The user will need to click the actual sign-in button
        }
      });
    } else {
      alert(
        "Google Sign-In is not available. Please refresh the page and try again."
      );
    }
  };

  const signOut = () => {
    console.log("Signing out...");
    setUser(null);
    localStorage.removeItem("googleUser");

    if (window.google && window.google.accounts) {
      window.google.accounts.id.disableAutoSelect();
    }
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

// Add Google types to window
declare global {
  interface Window {
    google: any;
  }
}
