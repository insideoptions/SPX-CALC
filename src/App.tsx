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
            shape: "pill",
            width: 280,
            logo_alignment: "left",
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
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "white",
            fontSize: "1.2rem",
            animation: "pulse 2s ease-in-out infinite",
          }}
        >
          <div
            style={{
              width: "50px",
              height: "50px",
              border: "3px solid rgba(255, 255, 255, 0.3)",
              borderTopColor: "white",
              borderRadius: "50%",
              margin: "0 auto 1rem",
              animation: "spin 1s linear infinite",
            }}
          ></div>
          Loading authentication...
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
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
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "1rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated background elements */}
      <div
        style={{
          position: "absolute",
          width: "300px",
          height: "300px",
          background:
            "radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)",
          borderRadius: "50%",
          top: "-100px",
          right: "-100px",
          animation: "float 20s ease-in-out infinite",
        }}
      ></div>
      <div
        style={{
          position: "absolute",
          width: "200px",
          height: "200px",
          background:
            "radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)",
          borderRadius: "50%",
          bottom: "-50px",
          left: "-50px",
          animation: "float 15s ease-in-out infinite reverse",
        }}
      ></div>

      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          padding: "3rem 2.5rem",
          borderRadius: "24px",
          boxShadow:
            "0 20px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.2)",
          width: "100%",
          maxWidth: "420px",
          textAlign: "center",
          position: "relative",
          animation: "slideUp 0.5s ease-out",
        }}
      >
        {/* Logo/Icon */}
        <div
          style={{
            width: "60px",
            height: "60px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
            boxShadow: "0 10px 20px rgba(102, 126, 234, 0.3)",
            transform: "rotate(-5deg)",
            transition: "transform 0.3s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "rotate(0deg) scale(1.05)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = "rotate(-5deg) scale(1)")
          }
        >
          <span
            style={{
              color: "white",
              fontSize: "24px",
              fontWeight: "bold",
              transform: "rotate(5deg)",
            }}
          >
            SPX
          </span>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <h1
            style={{
              color: "#1a1a1a",
              fontSize: "2rem",
              fontWeight: "800",
              marginBottom: "0.5rem",
              letterSpacing: "-0.5px",
            }}
          >
            SPX Program Webapps
          </h1>
          <p
            style={{
              color: "#6b7280",
              fontSize: "0.95rem",
              margin: 0,
              fontWeight: "500",
            }}
          >
            InsideOptions LLC
          </p>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <h2
            style={{
              color: "#374151",
              fontSize: "1.5rem",
              fontWeight: "600",
              marginBottom: "0.75rem",
              letterSpacing: "-0.3px",
            }}
          >
            Welcome back
          </h2>
          <p
            style={{
              color: "#6b7280",
              fontSize: "0.95rem",
              marginBottom: "2rem",
              lineHeight: "1.5",
            }}
          >
            Sign in with your Google account to continue
          </p>
        </div>

        {/* Google Sign-In Button Container */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "2rem",
            minHeight: "50px",
          }}
        >
          <div
            id="google-signin-button"
            style={{
              transition: "transform 0.2s ease",
              cursor: "pointer",
            }}
          ></div>
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
              padding: "0.875rem 1.5rem",
              backgroundColor: "white",
              border: "2px solid #e5e7eb",
              borderRadius: "100px",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "600",
              color: "#374151",
              transition: "all 0.3s ease",
              marginBottom: "1.5rem",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f9fafb";
              e.currentTarget.style.borderColor = "#9ca3af";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "white";
              e.currentTarget.style.borderColor = "#e5e7eb";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.05)";
            }}
          >
            <svg width="20" height="20" viewBox="0 0 18 18">
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
            padding: "1.25rem",
            background: "linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)",
            borderRadius: "16px",
            border: "1px solid rgba(147, 197, 253, 0.3)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "16px 16px 0 0",
            }}
          ></div>
          <div
            style={{
              fontSize: "0.875rem",
              color: "#4338ca",
              fontWeight: "600",
              marginBottom: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>🔒</span>
            Authorized Access Only
          </div>
          <div
            style={{
              fontSize: "0.813rem",
              color: "#4c1d95",
              lineHeight: "1.5",
              opacity: 0.9,
            }}
          >
            Only authorized email addresses can access this application. Contact
            your administrator if you need access.
          </div>
        </div>

        <div
          style={{
            marginTop: "2rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid rgba(229, 231, 235, 0.5)",
            fontSize: "0.813rem",
            color: "#9ca3af",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <span style={{ opacity: 0.7 }}>🛡️</span>
          Secure authentication powered by Google
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -30px) scale(1.05);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.95);
          }
        }
        #google-signin-button > div {
          transition: transform 0.2s ease !important;
        }
        #google-signin-button:hover > div {
          transform: translateY(-2px) !important;
        }
      `}</style>
    </div>
  );
};

export default GoogleLoginForm;
