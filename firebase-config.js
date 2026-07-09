// ============================================================
// CONFIGURAÇÃO DA FIREBASE
// ------------------------------------------------------------
// Substitui os valores abaixo pelos da tua consola Firebase:
// https://console.firebase.google.com > Definições do projeto > Geral
// > As tuas apps > Configuração do SDK
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyCp_LrozcXA4uxY8Szdas-o_eQcTZLsrYc",
  authDomain: "financas-47e84.firebaseapp.com",
  projectId: "financas-47e84",
  storageBucket: "financas-47e84.firebasestorage.app",
  messagingSenderId: "833657139591",
  appId: "1:833657139591:web:17dd4652bba35803546322"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
