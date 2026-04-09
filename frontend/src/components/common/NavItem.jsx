import { styles } from "../../styles/appStyles";

export default function NavItem({ active, onClick, label }) {
  return <button style={{ ...styles.navItem, ...(active ? styles.navItemActive : {}) }} onClick={onClick}>{label}</button>;
}
