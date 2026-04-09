import { motion } from "motion/react";

const LOGO_SRC = "/logo FSC.png";

export default function BrandLogo({ variant = "sidebar" }) {
  const isLogin = variant === "login";

  if (isLogin) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <img
          src={LOGO_SRC}
          alt="FPT Schools"
          style={{
            width: 320,
            maxWidth: "90%",
            height: "auto",
            display: "block",
            marginBottom: 0,
          }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 6,
        padding: "28px 4px 24px",
        borderBottom: "1px solid rgba(148,163,184,0.12)",
        position: "relative",
        zIndex: 1,
      }}
    >
      <img
        src={LOGO_SRC}
        alt="FPT Schools"
        style={{
          width: 160,
          height: "auto",
          display: "block",
          marginBottom: 12,
        }}
      />
      <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "0.04em", textAlign: "center", lineHeight: 1.3 }}>
        FPT SCHOOL<br />Hải Phòng
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
        <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>Nexus CRM Platform</span>
      </div>
    </motion.div>
  );
}
