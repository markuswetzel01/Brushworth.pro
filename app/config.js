// Brushworth.pro · Konfiguration
// CLIENT_ID: OAuth-Client-ID aus der Google Cloud Console (Typ Webanwendung).
// Leer = App startet in der Testansicht mit Beispieldaten.
const CONFIG = {
  CLIENT_ID: '740146781977-9ca3f5sbk7pjouvtb10qnfp3lgb5pq7v.apps.googleusercontent.com',
  // Gumroad product_id der Beta (kostenlos, 30 Plätze). Beta-Schlüssel gelten bis BETA_END.
  GUMROAD_BETA_PRODUCT_ID: 'aTTE63iRFdgjp6IJ0auvBQ==',
  BETA_END: '2027-06-30',
  // Gumroad product_id der Vollversion (folgt). Leer = noch nicht im Verkauf.
  GUMROAD_FULL_PRODUCT_ID: '',
  VERSION: '1.2.0-beta'
};
const LICENSE_REQUIRED = !!(CONFIG.GUMROAD_BETA_PRODUCT_ID || CONFIG.GUMROAD_FULL_PRODUCT_ID);
const betaOver = () => new Date().toISOString().slice(0, 10) > CONFIG.BETA_END;
