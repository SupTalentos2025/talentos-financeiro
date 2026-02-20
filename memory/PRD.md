# Talentos Financeiro - PRD (Product Requirements Document)

## Overview
Sistema de Gestão Financeira Multi-Empresas desenvolvido para pequenos e médios negócios no Brasil. Agora disponível como **PWA (Progressive Web App)** para uso mobile.

## Problem Statement
App financeiro "Talentos" transformado em app mobile:
- PWA instalável no celular
- Bottom navigation nativa
- Botão FAB para vendas rápidas
- Funciona offline
- Compartilhamento nativo

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Radix UI, Recharts
- **Backend**: FastAPI, Motor (MongoDB async)
- **Database**: MongoDB
- **Auth**: Sessions + Google OAuth
- **PWA**: Service Worker, Web App Manifest

## User Personas
1. **Micro Empreendedor**: Dono de pequena loja que precisa controlar vendas pelo celular
2. **Vendedor Mobile**: Precisa registrar vendas rapidamente em qualquer lugar

## Core Requirements (Implemented)
- [x] Autenticação (email/senha + Google OAuth)
- [x] Multi-empresas por CNPJ
- [x] Dashboard com estatísticas em tempo real
- [x] CRUD completo de Produtos, Vendas e Contas
- [x] Sistema de Notificações
- [x] Exportação de dados em CSV
- [x] Relatórios visuais

## PWA Features (Implemented 20/02/2026)
- [x] **Web App Manifest** - Instalável no celular
- [x] **Service Worker** - Cache e funcionamento offline
- [x] **Página Offline** - Experiência offline amigável
- [x] **Bottom Navigation** - Navegação nativa mobile
- [x] **FAB Button** - Botão central para venda rápida
- [x] **Install Banner** - Prompt de instalação
- [x] **Share API** - Compartilhamento nativo
- [x] **Safe Areas** - Suporte a notch/iPhone
- [x] **Touch Feedback** - Animações de toque
- [x] **Responsive Design** - Layout adaptativo

## Mobile UX Features
- Bottom nav com 5 abas: Início, Vendas, +Vender, Produtos, Contas
- Botão FAB verde central para registrar venda rapidamente
- Header compacto com menu hamburguer
- Cards empilhados verticalmente
- Modals otimizados para touch

## P0 Features (Critical) - Done
- [x] Login/Cadastro mobile-friendly
- [x] Criar empresa
- [x] Registrar vendas com FAB
- [x] Bottom navigation
- [x] Dashboard responsivo

## P1 Features (Important) - Done
- [x] PWA instalável
- [x] Offline support
- [x] Notificações
- [x] Exportação

## P2 Features (Backlog)
- [ ] Push notifications
- [ ] Leitor de código de barras
- [ ] Integração WhatsApp
- [ ] Sincronização offline completa
- [ ] Modo escuro/claro

## Test Results
- Backend: 96.2% (25/26 tests)
- Frontend: 85%
- PWA Core: 100%

## Next Tasks
1. Implementar push notifications
2. Adicionar leitor de código de barras
3. Sincronização offline avançada
