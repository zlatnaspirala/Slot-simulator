# Vanilla JS variant

The main application uses React + TypeScript because it provides a productive component architecture for the configurator/admin workflow.

A parallel vanilla JavaScript preview lives at `public/vanilla/`.

## Performance note

**Vanilla JS is the ultimate performance-oriented option when the UI does not need a framework.** It has less framework/runtime overhead and is useful for a lightweight slot preview, benchmark client, embedded demo, or very high-frequency visual updates.

For the configurator itself, React is retained because the application is an admin/editor workflow with many dynamic controls, forms, tables, configuration panels, and stateful views.

The authoritative RTP calculation and large simulations belong on the backend. The client preview should never be treated as the source of truth for game mathematics.
