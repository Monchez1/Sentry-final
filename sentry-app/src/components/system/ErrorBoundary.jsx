import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[SENTRY ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily: "Inter, system-ui, sans-serif",
          background: "#F8F9FB",
          color: "#18181b",
        }}>
          <div style={{
            background: "white",
            borderRadius: "24px",
            padding: "2rem",
            maxWidth: "400px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚠️</div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: "14px", color: "#71717a", marginBottom: "20px" }}>
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#FF6B35",
                color: "white",
                border: "none",
                borderRadius: "12px",
                padding: "10px 28px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
