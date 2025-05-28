import React, { useEffect, useState } from "react";
import { useAuth } from "./GoogleAuthContext";

const GoogleLoginForm: React.FC = () => {
  const { signInWithGoogle, isLoading } = useAuth();
  const [googleButtonRendered, setGoogleButtonRendered] = useState(false);

  useEffect(() => {
    // Render Google Sign-In button when component mounts
    if (window.google && !isLoading) {
      const buttonDiv = document.getElementById("google-signin-button");
      if (buttonDiv && !googleButtonRendered) {
        try {
          window.google.accounts.id.renderButton(buttonDiv, {
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "rectangular",
            width: 300,
          });
          setGoogleButtonRendered(true);
        } catch (error) {
          console.error("Error rendering Google button:", error);
          setGoogleButtonRendered(false);
        }
      }
    }
  }, [isLoading, googleButtonRendered]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f7f8fc",
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "#4b5563",
            fontSize: "1.1rem",
          }}
        >
          Loading authentication...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f7f8fc",
        padding: "1rem",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "3rem 2rem",
          borderRadius: "12px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          width: "100%",
          maxWidth: "400px",
          textAlign: "center",
        }}
      >
        <div style={{ marginBottom: "2rem" }}>
          <h1
            style={{
              color: "#1f2937",
              fontSize: "1.875rem",
              fontWeight: "700",
              marginBottom: "0.5rem",
            }}
          >
            SPX Program Webapps
          </h1>
          <p
            style={{
              color: "#6b7280",
              fontSize: "1rem",
              margin: 0,
            }}
          >
            InsideOptions LLC
          </p>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <h2
            style={{
              color: "#374151",
              fontSize: "1.25rem",
              fontWeight: "600",
              marginBottom: "1rem",
            }}
          >
            Sign in to continue
          </h2>
          <p
            style={{
              color: "#6b7280",
              fontSize: "0.875rem",
              marginBottom: "1.5rem",
            }}
          >
            Use your Google account to access Webapps
          </p>
        </div>

        {/* Google Sign-In Button Container */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "2rem",
          }}
        >
          <div id="google-signin-button"></div>
        </div>

        {/* Fallback button - only show if Google button failed to render */}
        {!googleButtonRendered && (
          <button
            onClick={signInWithGoogle}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              width: "100%",
              padding: "0.75rem 1rem",
              backgroundColor: "white",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "#374151",
              transition: "all 0.2s",
              marginBottom: "1.5rem",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#f9fafb";
              e.currentTarget.style.borderColor = "#9ca3af";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "white";
              e.currentTarget.style.borderColor = "#d1d5db";
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path
                fill="#4285F4"
                d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"
              />
              <path
                fill="#34A853"
                d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-2.7.75 4.8 4.8 0 0 1-4.52-3.36H1.83v2.07A8 8 0 0 0 8.98 17z"
              />
              <path
                fill="#FBBC05"
                d="M4.46 10.41a4.8 4.8 0 0 1-.25-1.41c0-.49.09-.97.25-1.41V5.52H1.83a8 8 0 0 0-.86 3.48c0 1.28.31 2.49.86 3.48l2.63-2.07z"
              />
              <path
                fill="#EA4335"
                d="M8.98 4.24c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1 8 8 0 0 0 1.83 5.52L4.46 7.6A4.8 4.8 0 0 1 8.98 4.24z"
              />
            </svg>
            Sign in with Google
          </button>
        )}

        <div
          style={{
            padding: "1rem",
            backgroundColor: "#f0f9ff",
            borderRadius: "8px",
            border: "1px solid #bfdbfe",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              color: "#1e40af",
              fontWeight: "500",
              marginBottom: "0.25rem",
            }}
          >
            🔒 Authorized Access Only
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#3730a3",
              lineHeight: "1.4",
            }}
          >
            Only authorized email addresses can access this application. Contact
            your administrator if you need access.
          </div>
        </div>

        <div
          style={{
            marginTop: "2rem",
            paddingTop: "1rem",
            borderTop: "1px solid #e5e7eb",
            fontSize: "0.75rem",
            color: "#9ca3af",
          }}
        >
          Secure authentication powered by Google
        </div>
      </div>
    </div>
  );
};

export default GoogleLoginForm;
