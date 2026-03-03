import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getIframeBridgeScript, handleIframeMessage } from "@/lib/iframe-bridge";
import { supabase } from "@/integrations/supabase/client";

// FlowSync Auth v4 — Mobile Ready
// Architecture: srcdoc iframe

const FULL_HTML: string = "<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FlowSync – Authentification</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --indigo: #6366f1; --violet: #8b5cf6; --indigo-light: #a5b4fc;
      --bg: #07070f; --card: rgba(12,12,22,0.92);
      --border: rgba(255,255,255,0.07); --text: #f1f1f5;
      --muted: rgba(255,255,255,0.38);
      --input-bg: rgba(255,255,255,0.04); --input-border: rgba(255,255,255,0.09);
    }
    body { font-family: 'Inter', -apple-system, sans-serif; background: var(--bg); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; overflow: hidden; position: relative; }
    .bg-mesh { position: fixed; inset: 0; z-index: 0; overflow: hidden; }
    .orb { position: absolute; border-radius: 50%; filter: blur(80px); animation: drift 14s ease-in-out infinite; }
    .orb-1 { width: 700px; height: 700px; background: radial-gradient(circle, rgba(99,102,241,.22) 0%, transparent 70%); top: -200px; left: -200px; animation-delay: 0s; }
    .orb-2 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(139,92,246,.18) 0%, transparent 70%); bottom: -100px; right: -150px; animation-delay: -5s; }
    .orb-3 { width: 380px; height: 380px; background: radial-gradient(circle, rgba(79,70,229,.15) 0%, transparent 70%); top: 50%; left: 50%; transform: translate(-50%,-50%); animation-delay: -10s; }
    @keyframes drift { 0%,100% { opacity:.4; transform: scale(1) translate(0,0); } 50% { opacity:.9; transform: scale(1.06) translate(18px,-14px); } }
    .grid-overlay { position: fixed; inset: 0; z-index: 0; background-image: linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px), linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px); background-size: 60px 60px; mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%); }
    #toast { position: fixed; top: 24px; left: 50%; transform: translateX(-50%) translateY(-14px); background: rgba(10,10,22,.97); color: var(--text); padding: 11px 18px 11px 13px; border-radius: 50px; font-size: 13.5px; font-weight: 500; z-index: 999; display: flex; align-items: center; gap: 9px; box-shadow: 0 12px 40px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.07); white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity .25s, transform .25s; }
    #toast.show { opacity: 1; transform: translateX(-50%) translateY(0); pointer-events: auto; }
    .toast-icon { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px; font-weight: 700; }
    .toast-icon.success { background: rgba(74,222,128,.15); color: #4ade80; }
    .toast-icon.error { background: rgba(248,113,113,.15); color: #f87171; }
    .layout { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 440px; max-width: 900px; width: 100%; border-radius: 28px; overflow: hidden; box-shadow: 0 40px 120px rgba(0,0,0,.72), 0 0 0 1px var(--border); }
    .promo { background: linear-gradient(145deg, #0d0d20 0%, #120f38 100%); border-right: 1px solid var(--border); padding: 52px 44px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; }
    .promo::before { content: ''; position: absolute; top: -80px; left: -80px; width: 320px; height: 320px; background: radial-gradient(circle, rgba(99,102,241,.28) 0%, transparent 70%); pointer-events: none; }
    .promo::after { content: ''; position: absolute; bottom: -60px; right: -60px; width: 260px; height: 260px; background: radial-gradient(circle, rgba(139,92,246,.22) 0%, transparent 70%); pointer-events: none; }
    .promo-logo { display: flex; align-items: center; gap: 11px; position: relative; z-index: 1; }
    .logo-icon { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg,#6366f1,#8b5cf6); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 22px rgba(99,102,241,.45); }
    .logo-name { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -.5px; }
    .promo-body { position: relative; z-index: 1; }
    .promo-headline { font-size: 32px; font-weight: 800; color: #fff; line-height: 1.2; letter-spacing: -.8px; margin-bottom: 16px; }
    .promo-headline span { background: linear-gradient(135deg,#a5b4fc,#c4b5fd); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .promo-desc { font-size: 14.5px; color: rgba(255,255,255,.48); line-height: 1.7; margin-bottom: 36px; }
    .features { display: flex; flex-direction: column; gap: 14px; }
    .feature { display: flex; align-items: center; gap: 13px; }
    .feature-dot { width: 34px; height: 34px; border-radius: 10px; background: rgba(99,102,241,.13); border: 1px solid rgba(99,102,241,.22); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 15px; }
    .feature-text { font-size: 13.5px; color: rgba(255,255,255,.62); font-weight: 500; }
    .promo-avatars { display: flex; align-items: center; gap: 11px; position: relative; z-index: 1; }
    .avatars { display: flex; }
    .av { width: 32px; height: 32px; border-radius: 50%; border: 2px solid #0d0d20; margin-left: -8px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; }
    .av:first-child { margin-left: 0; }
    .av-1 { background: linear-gradient(135deg,#f97316,#ef4444); }
    .av-2 { background: linear-gradient(135deg,#06b6d4,#3b82f6); }
    .av-3 { background: linear-gradient(135deg,#8b5cf6,#ec4899); }
    .av-4 { background: linear-gradient(135deg,#10b981,#06b6d4); }
    .av-count { width: 32px; height: 32px; border-radius: 50%; margin-left: -8px; background: rgba(99,102,241,.25); border: 2px solid #0d0d20; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: var(--indigo-light); }
    .promo-social-proof { font-size: 12.5px; color: rgba(255,255,255,.38); font-weight: 500; }
    .promo-social-proof strong { color: rgba(255,255,255,.75); }
    .card { background: var(--card); padding: 44px 40px; backdrop-filter: blur(30px); display: flex; flex-direction: column; }
    .tabs { display: flex; background: rgba(255,255,255,.04); border: 1px solid var(--border); border-radius: 13px; padding: 4px; margin-bottom: 32px; gap: 3px; }
    .tab-btn { flex: 1; padding: 9px; border-radius: 10px; font-size: 13.5px; font-weight: 600; cursor: pointer; border: 1px solid transparent; background: transparent; color: var(--muted); transition: all .22s cubic-bezier(.4,0,.2,1); font-family: inherit; }
    .tab-btn.active { background: rgba(99,102,241,.18); border-color: rgba(99,102,241,.3); color: var(--indigo-light); box-shadow: 0 2px 12px rgba(99,102,241,.15); }
    .panel { display: none; flex-direction: column; flex: 1; }
    .panel.active { display: flex; }
    .panel-title { font-size: 27px; font-weight: 800; color: var(--text); letter-spacing: -.6px; margin-bottom: 5px; }
    .panel-sub { font-size: 14px; color: var(--muted); margin-bottom: 28px; }
    .google-btn { width: 100%; padding: 13px; border-radius: 12px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); color: var(--text); font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 14px; transition: all .2s; font-family: inherit; letter-spacing: -.1px; }
    .google-btn:hover { background: rgba(255,255,255,.09); border-color: rgba(255,255,255,.18); transform: translateY(-1px); box-shadow: 0 6px 22px rgba(0,0,0,.3); }
    .sso-row { display: flex; gap: 10px; margin-bottom: 20px; }
    .sso-btn { flex: 1; padding: 10px; border-radius: 10px; background: rgba(255,255,255,.04); border: 1px solid var(--input-border); color: var(--muted); font-size: 13px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; transition: all .2s; font-family: inherit; }
    .sso-btn:hover { background: rgba(255,255,255,.08); color: var(--text); border-color: rgba(255,255,255,.18); }
    .separator { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .sep-line { flex: 1; height: 1px; background: var(--input-border); }
    .sep-text { font-size: 12px; color: rgba(255,255,255,.25); font-weight: 500; }
    .field { margin-bottom: 15px; }
    .field label { display: block; font-size: 12px; font-weight: 600; color: rgba(255,255,255,.45); margin-bottom: 7px; letter-spacing: .4px; text-transform: uppercase; }
    .input-wrap { position: relative; }
    .input-wrap svg.input-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,.2); pointer-events: none; transition: color .2s; }
    .field input { width: 100%; padding: 12px 38px 12px 40px; border-radius: 11px; background: var(--input-bg); border: 1px solid var(--input-border); color: var(--text); font-size: 14px; outline: none; transition: all .22s; font-family: inherit; }
    .field input::placeholder { color: rgba(255,255,255,.2); }
    .field input:focus { border-color: rgba(99,102,241,.55); box-shadow: 0 0 0 3px rgba(99,102,241,.1); background: rgba(99,102,241,.04); }
    .input-wrap:focus-within svg.input-icon { color: rgba(165,180,252,.45); }
    .pw-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: rgba(255,255,255,.25); padding: 2px; display: flex; align-items: center; transition: color .2s; }
    .pw-toggle:hover { color: rgba(255,255,255,.55); }
    .pw-strength { margin-top: 8px; }
    .strength-bars { display: flex; gap: 4px; margin-bottom: 5px; }
    .strength-bar { height: 3px; flex: 1; border-radius: 10px; background: rgba(255,255,255,.07); transition: background .3s; }
    .strength-bar.w { background: #f87171; } .strength-bar.f { background: #fb923c; } .strength-bar.g { background: #facc15; } .strength-bar.s { background: #4ade80; }
    .strength-label { font-size: 11px; color: var(--muted); font-weight: 500; }
    .forgot { text-align: right; margin-top: -6px; margin-bottom: 20px; }
    .forgot a { font-size: 12.5px; font-weight: 500; color: rgba(99,102,241,.8); text-decoration: none; transition: color .2s; }
    .forgot a:hover { color: var(--indigo-light); }
    .check-row { display: flex; align-items: flex-start; gap: 9px; margin-bottom: 20px; cursor: pointer; }
    .check-row input[type=checkbox] { display: none; }
    .custom-check { width: 17px; height: 17px; border-radius: 5px; border: 1.5px solid var(--input-border); background: var(--input-bg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .2s; margin-top: 1px; }
    .check-row input:checked ~ .custom-check { background: var(--indigo); border-color: var(--indigo); }
    .check-mark { display: none; }
    .check-row input:checked ~ .custom-check .check-mark { display: block; }
    .check-label { font-size: 13px; color: var(--muted); line-height: 1.5; }
    .check-label a { color: rgba(99,102,241,.8); text-decoration: none; }
    .check-label a:hover { text-decoration: underline; }
    .submit-btn { width: 100%; padding: 14px; border-radius: 12px; background: linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%); border: none; color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; letter-spacing: -.1px; transition: all .22s; font-family: inherit; position: relative; overflow: hidden; }
    .submit-btn::after { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,.1) 0%, transparent 55%); pointer-events: none; }
    .submit-btn:hover { transform: translateY(-1.5px); box-shadow: 0 8px 28px rgba(99,102,241,.45); }
    .submit-btn:active { transform: translateY(0); box-shadow: none; }
    .submit-btn:disabled { opacity: .65; cursor: default; transform: none; box-shadow: none; }
    .spinner { display: inline-block; width: 15px; height: 15px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .65s linear infinite; vertical-align: middle; margin-right: 7px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .footer-link { text-align: center; margin-top: 20px; font-size: 13.5px; color: var(--muted); }
    .footer-link a { color: rgba(99,102,241,.85); text-decoration: none; font-weight: 600; transition: color .2s; }
    .footer-link a:hover { color: var(--indigo-light); }
    @media (max-width: 720px) { .layout { grid-template-columns: 1fr; } .promo { display: none; } .card { padding: 34px 26px; border-radius: 28px; } }
  </style>
</head>
<body>

<div class="bg-mesh">
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="orb orb-3"></div>
</div>
<div class="grid-overlay"></div>

<div id="toast">
  <div class="toast-icon" id="toast-icon">✓</div>
  <span id="toast-msg"></span>
</div>

<div class="layout">

  <!-- PROMO PANEL -->
  <div class="promo">
    <div class="promo-logo">
      <div class="logo-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      </div>
      <span class="logo-name">FlowSync</span>
    </div>

    <div class="promo-body">
      <h1 class="promo-headline">Ton fitness,<br><span>transformé.</span></h1>
      <p class="promo-desc">Suivi sport, nutrition et habitudes en un seul lieu — science-based, personnalisé, motivant. Décuple tes résultats.</p>
      <div class="features">
        <div class="feature"><div class="feature-dot">🏋️</div><span class="feature-text">+200 exercices avec calories live</span></div>
        <div class="feature"><div class="feature-dot">🥗</div><span class="feature-text">Journal nutritionnel complet</span></div>
        <div class="feature"><div class="feature-dot">✅</div><span class="feature-text">Système d'habitudes durable</span></div>
        <div class="feature"><div class="feature-dot">📈</div><span class="feature-text">Score global & progressions</span></div>
      </div>
    </div>

    <div class="promo-avatars">
      <div class="avatars">
        <div class="av av-1">M</div><div class="av av-2">S</div><div class="av av-3">A</div><div class="av av-4">J</div>
        <div class="av-count">+2k</div>
      </div>
      <p class="promo-social-proof">Rejoint par <strong>+2 000 sportifs</strong> cette semaine</p>
    </div>
  </div>

  <!-- AUTH CARD -->
  <div class="card">
    <div class="tabs">
      <button class="tab-btn active" id="tab-login" onclick="switchTab('login')">Connexion</button>
      <button class="tab-btn" id="tab-register" onclick="switchTab('register')">Inscription</button>
    </div>

    <!-- LOGIN -->
    <div class="panel active" id="panel-login">
      <p class="panel-title">Bon retour 💪</p>
      <p class="panel-sub">Content de te voir sur FlowSync. Reprends tes objectifs!</p>

      <button class="google-btn" onclick="fakeOAuth(this, 'Connecté via Google ✓')">
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.6 32.9 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.5 6.5 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.5 6.5 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.2-5.5l-6.6-5.4C29.6 35 26.9 36 24 36c-5.2 0-9.5-3.1-11.3-7.5l-6.5 5C9.5 39.5 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.6 5.4C42.3 35.8 44 30.2 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
        Continuer avec Google
      </button>

      <div class="sso-row">
        <button class="sso-btn" onclick="showToast('GitHub SSO simulé ✓','success')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
          GitHub
        </button>
        <button class="sso-btn" onclick="showToast('Apple SSO connecté 🍎','success')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 13.5c-.91 2.018-2.997 3.428-5.05 3.428-2.054 0-4.138-1.41-5.05-3.428M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m-2.5-10c0 1.38-1.12 2.5-2.5 2.5S4 11.38 4 10s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5m10 0c0 1.38-1.12 2.5-2.5 2.5s-2.5-1.12-2.5-2.5 1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5"/></svg>
          Apple
        </button>
      </div>

      <div class="separator"><div class="sep-line"></div><span class="sep-text">ou par email</span><div class="sep-line"></div></div>

      <div class="field">
        <label>Email</label>
        <div class="input-wrap">
          <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <input type="email" id="login-email" placeholder="vous@exemple.com" autocomplete="email"/>
        </div>
      </div>
      <div class="field">
        <label>Mot de passe</label>
        <div class="input-wrap">
          <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          <input type="password" id="login-pass" placeholder="••••••••" autocomplete="current-password"/>
          <button class="pw-toggle" type="button" onclick="togglePw('login-pass',this)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>

      <div class="forgot"><a href="#">Mot de passe oublié ?</a></div>
      <button class="submit-btn" id="login-btn" onclick="handleLogin()">Se connecter</button>
      <p class="footer-link">Pas encore de compte ? <a href="#" onclick="switchTab('register');return false;">Inscription gratuite →</a></p>
    </div>

    <!-- REGISTER -->
    <div class="panel" id="panel-register">
      <p class="panel-title">Commence ton journey 🚀</p>
      <p class="panel-sub">Rejoins FlowSync — ton coach fitness personnel.</p>

      <button class="google-btn" onclick="fakeOAuth(this, 'Compte créé via Google 🚀')">
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.6 32.9 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.5 6.5 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.5 6.5 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.2-5.5l-6.6-5.4C29.6 35 26.9 36 24 36c-5.2 0-9.5-3.1-11.3-7.5l-6.5 5C9.5 39.5 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.6 5.4C42.3 35.8 44 30.2 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
        S'inscrire avec Google
      </button>

      <div class="field">
        <label>Email</label>
        <div class="input-wrap">
          <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <input type="email" id="reg-email" placeholder="vous@exemple.com" autocomplete="email"/>
        </div>
      </div>
      <div class="field">
        <label>Mot de passe</label>
        <div class="input-wrap">
          <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          <input type="password" id="reg-pass" placeholder="Min. 6 caractères" autocomplete="new-password" oninput="checkStrength(this.value)"/>
          <button class="pw-toggle" type="button" onclick="togglePw('reg-pass',this)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <div class="pw-strength" id="pw-strength" style="display:none">
          <div class="strength-bars">
            <div class="strength-bar" id="sb1"></div><div class="strength-bar" id="sb2"></div>
            <div class="strength-bar" id="sb3"></div><div class="strength-bar" id="sb4"></div>
          </div>
          <span class="strength-label" id="strength-label"></span>
        </div>
      </div>

      <label class="check-row">
        <input type="checkbox" id="reg-terms"/>
        <div class="custom-check">
          <svg class="check-mark" width="9" height="9" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <span class="check-label">J'accepte les <a href="#">CGU</a> et la <a href="#">politique de confidentialité</a></span>
      </label>

      <button class="submit-btn" id="reg-btn" onclick="handleRegister()">Créer mon compte gratuitement</button>
      <p class="footer-link">Déjà un compte ? <a href="#" onclick="switchTab('login');return false;">← Se connecter</a></p>
    </div>
  </div>
</div>

<script>
  let toastTimer = null;

  function showToast(msg, type) {
    const toast = document.getElementById('toast');
    const icon  = document.getElementById('toast-icon');
    document.getElementById('toast-msg').textContent = msg;
    icon.className = 'toast-icon ' + type;
    icon.textContent = type === 'error' ? '✕' : '✓';
    toast.style.border = `1px solid ${type==='error'?'rgba(248,113,113,.22)':'rgba(99,102,241,.22)'}`;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  function switchTab(t) {
    ['login','register'].forEach(id => {
      document.getElementById('tab-'+id).classList.toggle('active', id===t);
      document.getElementById('panel-'+id).classList.toggle('active', id===t);
    });
  }

  function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()); }

  function togglePw(id, btn) {
    const inp = document.getElementById(id);
    inp.type = inp.type==='password' ? 'text' : 'password';
    btn.style.opacity = inp.type==='text' ? '.7' : '1';
  }

  const SL = [
    null,
    {label:'Très faible', cls:'w', bars:1},
    {label:'Faible', cls:'f', bars:2},
    {label:'Correct', cls:'g', bars:3},
    {label:'Fort 🔒', cls:'s', bars:4}
  ];
  function checkStrength(pw) {
    const wrap = document.getElementById('pw-strength');
    wrap.style.display = pw.length ? 'block' : 'none';
    let sc = 0;
    if (pw.length >= 6) sc++;
    if (pw.length >= 10) sc++;
    if (/[A-Z]/.test(pw) && /\d/.test(pw)) sc++;
    if (/[^A-Za-z0-9]/.test(pw)) sc++;
    const lvl = SL[sc] || SL[1];
    [1,2,3,4].forEach(i => {
      document.getElementById('sb'+i).className = 'strength-bar' + (i<=lvl.bars ? ' '+lvl.cls : '');
    });
    document.getElementById('strength-label').textContent = lvl.label;
  }

  function withLoading(btnId, label, fn) {
    const btn = document.getElementById(btnId);
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Patientez…';
    setTimeout(() => { btn.disabled = false; btn.textContent = label; fn(); }, 1100);
  }

  function fakeOAuth(btn, msg) {
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Redirection…';
    setTimeout(() => { btn.disabled = false; btn.innerHTML = orig; showToast(msg, 'success'); }, 1200);
  }

  function handleLogin() {
    const email = document.getElementById('login-email').value;
    const pass  = document.getElementById('login-pass').value;
    if (!validEmail(email)) return showToast('Adresse email invalide.', 'error');
    if (!pass)              return showToast('Mot de passe requis.', 'error');
    withLoading('login-btn', 'Se connecter', () => showToast('Connexion réussie ! À toi de jouer 🔥', 'success'));
  }

  function handleRegister() {
    const email = document.getElementById('reg-email').value;
    const pass  = document.getElementById('reg-pass').value;
    const terms = document.getElementById('reg-terms').checked;
    if (!validEmail(email)) return showToast('Adresse email invalide.', 'error');
    if (pass.length < 6)    return showToast('Mot de passe trop court (6 caractères min).', 'error');
    if (!terms)             return showToast('Veuillez accepter les CGU pour continuer.', 'error');
    withLoading('reg-btn', 'Créer mon compte gratuitement', () => showToast('Compte créé ! Montre ce que tu sais faire 💪', 'success'));
  }
</script>
</body>
</html>";

export default function FlowSyncAuth() {
  const ref = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();

  const onNavigate = useCallback((page: string) => {
    if (page === 'dashboard' || page === '/dashboard') navigate('/dashboard');
    else if (page === '/' || page === 'landing') navigate('/');
    else navigate(page);
  }, [navigate]);

  // Only redirect on OAuth callback (not on signup which requires email confirmation)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Check if this is an OAuth sign-in (has provider_token or came from URL with access_token)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const isOAuthCallback = hashParams.has('access_token') || hashParams.has('provider_token');
        if (isOAuthCallback) {
          navigate('/dashboard');
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcdoc = FULL_HTML;

    const handleMessage = (e: MessageEvent) => {
      handleIframeMessage(e, onNavigate);
    };

    const iframe = ref.current;
    const onLoad = () => {
      if (iframe.contentWindow && iframe.contentDocument) {
        // Inject the FlowSync bridge
        const script = iframe.contentDocument.createElement('script');
        script.textContent = getIframeBridgeScript();
        iframe.contentDocument.body.appendChild(script);

        // Inject auth integration script that hooks into forms
        const authScript = iframe.contentDocument.createElement('script');
        authScript.textContent = getAuthIntegrationScript();
        iframe.contentDocument.body.appendChild(authScript);
      }
    };

    iframe.addEventListener('load', onLoad);
    window.addEventListener('message', handleMessage);

    return () => {
      iframe.removeEventListener('load', onLoad);
      window.removeEventListener('message', handleMessage);
    };
  }, [onNavigate]);

  return (
    <iframe
      ref={ref}
      sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
      style={{ width:"100%", height:"100vh", border:"none", display:"block" }}
      title="FlowSync Auth"
    />
  );
}

// Script that integrates auth forms with FlowSync bridge
function getAuthIntegrationScript(): string {
  return `
(function() {
  // Wait for FlowSync bridge to be available
  function waitForBridge(cb, attempts) {
    if (window.FlowSync) { cb(); return; }
    if (attempts > 50) { console.error('FlowSync bridge not found'); return; }
    setTimeout(function() { waitForBridge(cb, (attempts || 0) + 1); }, 100);
  }
  
  waitForBridge(function() {
    // Find forms and override their submit behavior
    // The auth page has login and signup forms with .btn submit buttons
    
    // Helper to show alerts in the page
    function showAlert(container, type, msg) {
      // Remove existing alerts
      container.querySelectorAll('.alert').forEach(function(a) { a.remove(); });
      var div = document.createElement('div');
      div.className = 'alert ' + type;
      div.innerHTML = '<span class="alert-icon">' + (type === 'err' ? '⚠️' : '✅') + '</span><span>' + msg + '</span>';
      // Insert at top of card
      var card = container.closest('.card');
      if (card) {
        var hd = card.querySelector('.hd');
        if (hd) hd.after(div);
        else card.prepend(div);
      }
    }
    
    // Helper to set button loading state
    function setLoading(btn, loading) {
      if (loading) {
        btn.classList.add('loading');
        btn.disabled = true;
      } else {
        btn.classList.remove('loading');
        btn.disabled = false;
      }
    }
    
    // Override all form submits
    document.querySelectorAll('form').forEach(function(form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        var emailInput = form.querySelector('input[type="email"], input[name="email"]');
        var passwordInput = form.querySelector('input[type="password"], input[name="password"]');
        var fullNameInput = form.querySelector('input[name="fullName"], input[name="full_name"], input[name="name"]');
        var submitBtn = form.querySelector('.btn, button[type="submit"]');
        
        if (!emailInput || !passwordInput) return;
        
        var email = emailInput.value.trim();
        var password = passwordInput.value;
        
        if (!email || !password) {
          showAlert(form, 'err', 'Veuillez remplir tous les champs');
          return;
        }
        
        setLoading(submitBtn, true);
        
        // Determine if this is login or signup based on form context
        var isSignup = form.closest('#page-signup, .page-signup, [data-page="signup"]') !== null
          || form.querySelector('input[name="fullName"], input[name="full_name"], input[name="name"]') !== null
          || (form.querySelectorAll('input[type="password"]').length > 1);
        
        if (isSignup) {
          var fullName = fullNameInput ? fullNameInput.value.trim() : '';
          FlowSync.auth.signUp({ email: email, password: password, fullName: fullName })
            .then(function(res) {
              setLoading(submitBtn, false);
              showAlert(form, 'ok', 'Compte créé avec succès ! Redirection...');
              setTimeout(function() {
                FlowSync.navigate('/dashboard?onboarding=true');
              }, 1200);
            })
            .catch(function(err) {
              setLoading(submitBtn, false);
              showAlert(form, 'err', err.message || 'Erreur lors de l\\'inscription');
            });
        } else {
          FlowSync.auth.signIn({ email: email, password: password })
            .then(function(res) {
              setLoading(submitBtn, false);
              showAlert(form, 'ok', 'Connexion réussie ! Redirection...');
              setTimeout(function() {
                FlowSync.navigate('/dashboard');
              }, 1000);
            })
            .catch(function(err) {
              setLoading(submitBtn, false);
              showAlert(form, 'err', err.message || 'Email ou mot de passe incorrect');
            });
        }
      });
    });
    
    // Also hook any non-form submit buttons
    document.querySelectorAll('.btn').forEach(function(btn) {
      if (btn.closest('form')) return; // Already handled
      var text = (btn.textContent || '').toLowerCase();
      if (text.includes('connexion') || text.includes('login') || text.includes('se connecter') || text.includes('inscription') || text.includes('créer')) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          // Find nearest inputs
          var container = btn.closest('.card, .page, section') || document.body;
          var emailInput = container.querySelector('input[type="email"], input[name="email"]');
          var passwordInput = container.querySelector('input[type="password"], input[name="password"]');
          
          if (!emailInput || !passwordInput) return;
          
          var email = emailInput.value.trim();
          var password = passwordInput.value;
          
          if (!email || !password) {
            showAlert(container, 'err', 'Veuillez remplir tous les champs');
            return;
          }
          
          setLoading(btn, true);
          
          var isSignup = text.includes('inscription') || text.includes('créer') || text.includes('sign up');
          
          if (isSignup) {
            var nameInput = container.querySelector('input[name="fullName"], input[name="full_name"], input[name="name"]');
            FlowSync.auth.signUp({ email: email, password: password, fullName: nameInput ? nameInput.value : '' })
              .then(function() {
                setLoading(btn, false);
                showAlert(container, 'ok', 'Compte créé ! Redirection...');
                setTimeout(function() { FlowSync.navigate('/dashboard?onboarding=true'); }, 1200);
              })
              .catch(function(err) {
                setLoading(btn, false);
                showAlert(container, 'err', err.message);
              });
          } else {
            FlowSync.auth.signIn({ email: email, password: password })
              .then(function() {
                setLoading(btn, false);
                showAlert(container, 'ok', 'Connexion réussie ! Redirection...');
                setTimeout(function() { FlowSync.navigate('/dashboard'); }, 1000);
              })
              .catch(function(err) {
                setLoading(btn, false);
                showAlert(container, 'err', err.message);
              });
          }
        });
      }
    });
    
    // Hook Google sign-in buttons
    document.querySelectorAll('.sbtn').forEach(function(btn) {
      var text = (btn.textContent || '').toLowerCase();
      if (text.includes('google')) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          btn.classList.add('loading');
          FlowSync.auth.googleSignIn()
            .then(function() {
              // OAuth will redirect, so nothing else to do
            })
            .catch(function(err) {
              btn.classList.remove('loading');
              var container = btn.closest('.card') || document.body;
              showAlert(container, 'err', err.message || 'Erreur Google Sign-In');
            });
        });
      }
    });
    
    console.log('[FlowSync] Auth integration loaded');
  });
})();
`;
}
