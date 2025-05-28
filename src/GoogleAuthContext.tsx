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

        // Check if user is already signed in
        const savedUser = localStorage.getItem("googleUser");
        if (savedUser) {
          try {
            const userData = JSON.parse(savedUser);
            console.log("Restored user data:", userData);

            // Validate user data structure
            if (userData.email && userData.name && userData.id) {
              if (AUTHORIZED_EMAILS.includes(userData.email.toLowerCase())) {
                setUser(userData);
              } else {
                console.log("User email not authorized:", userData.email);
                localStorage.removeItem("googleUser");
              }
            } else {
              console.log("Invalid user data structure, clearing...");
              localStorage.removeItem("googleUser");
            }
          } catch (error) {
            console.error("Error parsing saved user data:", error);
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
      console.log("Google response received:", response);

      if (!response || !response.credential) {
        throw new Error("No credential received from Google");
      }

      // Decode the JWT token to get user info
      const parts = response.credential.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT token format");
      }

      const decodedToken = JSON.parse(atob(parts[1]));
      console.log("Decoded token:", decodedToken);

      // Validate required fields
      if (!decodedToken.sub || !decodedToken.email || !decodedToken.name) {
        throw new Error("Missing required user information from Google");
      }

      const userData: User = {
        id: decodedToken.sub,
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture || "",
      };

      console.log("Processed user data:", userData);

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
      alert(
        `Authentication failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }. Please try again.`
      );
    }
  };

  const signInWithGoogle = () => {
    console.log("Starting Google Sign-In process...");

    // Clear any existing auth data
    localStorage.removeItem("googleUser");
    setUser(null);

    // Create a full-screen overlay with Google Sign-In
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
    `;

    const container = document.createElement("div");
    container.style.cssText = `
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      text-align: center;
      max-width: 400px;
      width: 90%;
    `;

    const title = document.createElement("h2");
    title.textContent = "Sign in with Google";
    title.style.cssText = "margin-bottom: 1rem; color: #333;";

    const buttonContainer = document.createElement("div");
    buttonContainer.id = "google-signin-container";
    buttonContainer.style.marginBottom = "1rem";

    const closeButton = document.createElement("button");
    closeButton.textContent = "Cancel";
    closeButton.style.cssText = `
      background: #f1f3f4;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      color: #333;
    `;
    closeButton.onclick = () => {
      console.log("Sign-in cancelled by user");
      document.body.removeChild(overlay);
    };

    container.appendChild(title);
    container.appendChild(buttonContainer);
    container.appendChild(closeButton);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Initialize and render Google button
    if (window.google && window.google.accounts) {
      try {
        console.log("Initializing Google Sign-In API...");

        window.google.accounts.id.initialize({
          client_id:
            "608251487888-svu2qkjsjqtbptqe2je14b9a2paqovg6.apps.googleusercontent.com",
          callback: (response: any) => {
            console.log("Google callback triggered");
            document.body.removeChild(overlay);
            handleGoogleResponse(response);
          },
          auto_select: false,
        });

        window.google.accounts.id.renderButton(buttonContainer, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "rectangular",
          width: 300,
        });

        console.log("Google Sign-In button rendered successfully");
      } catch (error) {
        console.error("Error setting up Google Sign-In:", error);
        document.body.removeChild(overlay);
        alert(
          "Failed to initialize Google Sign-In. Please refresh the page and try again."
        );
      }
    } else {
      console.log("Google API not available, using fallback redirect method");
      document.body.removeChild(overlay);

      const clientId =
        "608251487888-svu2qkjsjqtbptqe2je14b9a2paqovg6.apps.googleusercontent.com";
      const redirectUri = window.location.origin;
      const scope = "openid email profile";

      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=token&` +
        `prompt=select_account`;

      console.log("Redirecting to Google OAuth:", authUrl);
      window.location.href = authUrl;
    }
  };

  const signOut = () => {
    console.log("Signing out user...");
    setUser(null);
    localStorage.removeItem("googleUser");

    // Sign out from Google
    if (window.google && window.google.accounts) {
      try {
        window.google.accounts.id.disableAutoSelect();
      } catch (error) {
        console.log("Error disabling Google auto-select:", error);
      }
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
