# Project Guidelines

## Git & PRs
- Never include "Co-Authored-By" Claude stamps in commits or PRs.

## Mobile Sidebar Pattern
- On desktop (md+), sidebars render inline as flex panels alongside the main content.
- On mobile (<md), sidebars become slide-out drawers with a backdrop overlay and close-on-click-outside behavior.
- Use the `open` / `onClose` prop pattern: the parent controls visibility state, the sidebar component renders both the desktop inline version (hidden on mobile) and the mobile drawer variant (hidden on desktop).
- Mobile drawers should animate in/out using CSS keyframes (`slide-in-left` / `slide-out-left` defined in `index.css`).
- Always include a semi-transparent backdrop (`bg-black/40`) behind mobile drawers that closes the drawer on tap.
- Examples: `IntentPanel.tsx` (chat intent drawer), `PlatformSidebar.tsx` (content platform picker), `LeadDetailSidebar.tsx` (pipeline lead details).
