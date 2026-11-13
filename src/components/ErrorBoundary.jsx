import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // In production, wire this to an error-reporting service.
    console.error("Far & Near crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            background: "#0a201a",
            color: "#fdf9f2",
            fontFamily: "Poppins, sans-serif",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "22px", fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p style={{ color: "rgba(253,249,242,0.7)", maxWidth: "360px" }}>
            Try refreshing the page. If this keeps happening, let us know
            what you were doing.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#fdf9f2",
              color: "#16332b",
              border: "none",
              borderRadius: "999px",
              padding: "12px 24px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
