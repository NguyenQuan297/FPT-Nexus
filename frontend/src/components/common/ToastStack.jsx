import { styles } from "../../styles/appStyles";

export default function ToastStack({ toasts }) {
  return (
    <div style={{ position: "fixed", right: 20, top: 20, zIndex: 40 }}>
      {toasts.map((t) => (
        <div key={t.id} style={styles.toast}>{t.text}</div>
      ))}
    </div>
  );
}
