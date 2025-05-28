import React from "react";
import { useAuth } from "./GoogleAuthContext";
import GoogleLoginForm from "./GoogleLoginForm";

interface GoogleProtectedRouteProps {
  children: React.ReactNode;
}

const GoogleProtectedRoute: React.FC<GoogleProtectedRouteProps> = ({
  children,
}) => {
  const { isAuthenticated, isLoading } = useAuth();

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
          Loading...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <GoogleLoginForm />;
  }

  return <>{children}</>;
};

export default GoogleProtectedRoute;
