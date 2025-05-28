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

            // Timeout after 10 seconds
            setTimeout(() => {
              clearInterval(checkGoogle);
              resolve();
            }, 10000);
          }
        });

        // Initialize Google Auth if API is loaded
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
            if (AUTHORIZED_EMAILS.includes(userData.email.toLowerCase())) {
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
      // Decode the JWT token to get user info
      const decodedToken = JSON.parse(atob(response.credential.split(".")[1]));

      const userData: User = {
        id: decodedToken.sub,
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture,
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
      console.error("Error handling Google response:", error);
      alert("Authentication failed. Please try again.");
    }
  };

  const signInWithGoogle = () => {
    if (window.google && window.google.accounts) {
      // Re-initialize to ensure fresh state
      window.google.accounts.id.initialize({
        client_id:
          "608251487888-svu2qkjsjqtbptqe2je14b9a2paqovg6.apps.googleusercontent.com",
        callback: handleGoogleResponse,
        auto_select: false,
      });

      // Try the prompt method first
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // If prompt doesn't work, try rendering a button
          const tempDiv = document.createElement("div");
          tempDiv.style.position = "fixed";
          tempDiv.style.top = "50%";
          tempDiv.style.left = "50%";
          tempDiv.style.transform = "translate(-50%, -50%)";
          tempDiv.style.zIndex = "9999";
          tempDiv.style.backgroundColor = "white";
          tempDiv.style.padding = "20px";
          tempDiv.style.borderRadius = "8px";
          tempDiv.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
          document.body.appendChild(tempDiv);

          try {
            window.google.accounts.id.renderButton(tempDiv, {
              theme: "outline",
              size: "large",
              text: "signin_with",
              shape: "rectangular",
            });

            // Add a close button
            const closeBtn = document.createElement("button");
            closeBtn.textContent = "×";
            closeBtn.style.position = "absolute";
            closeBtn.style.top = "5px";
            closeBtn.style.right = "10px";
            closeBtn.style.border = "none";
            closeBtn.style.background = "none";
            closeBtn.style.fontSize = "20px";
            closeBtn.style.cursor = "pointer";
            closeBtn.onclick = () => {
              if (document.body.contains(tempDiv)) {
                document.body.removeChild(tempDiv);
              }
            };
            tempDiv.appendChild(closeBtn);
          } catch (error) {
            console.error("Error creating Google button:", error);
            if (document.body.contains(tempDiv)) {
              document.body.removeChild(tempDiv);
            }
            alert(
              "Google Sign-In is not available. Please refresh the page and try again."
            );
          }
        }
      });
    } else {
      console.error("Google API not loaded");
      alert(
        "Google Sign-In is not available. Please refresh the page and try again."
      );
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem("googleUser");

    // Sign out from Google
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
