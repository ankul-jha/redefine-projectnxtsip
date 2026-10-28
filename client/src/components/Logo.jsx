import { BRAND } from '../brand.js';
import styles from './Logo.module.css';

export default function Logo() {
  return <img className={styles.logo} src={BRAND.logo.wordmark} alt={BRAND.name} width="720" height="229" />;
}
