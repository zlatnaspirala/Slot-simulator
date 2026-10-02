# slot-simulator 1.0.0

 Dinamic 'slot mashine' construction and simulate play/payouts.

## BackOffice
 - MongoDB
 - NodeJS

## Client (reactjs/vanilla JS)
 - `app` folder is reactjs app
   Must be "app" because it is hardcoded in next.
 - public/vanilla is JS native variant

```js
npm i
npm run dev
```


# Vanilla JS variant

The main application uses React + TypeScript because it provides a productive component architecture for the configurator/admin workflow.

A parallel vanilla JavaScript preview lives at `public/vanilla/`.

## Performance note

**Vanilla JS is the ultimate performance-oriented option.** It has less framework/runtime overhead and is useful for a lightweight slot preview, benchmark client, embedded demo, or very high-frequency visual updates.

For the configurator itself, React is retained because the application is an admin/editor workflow with many dynamic controls, forms, tables, configuration panels, and stateful views.

The authoritative RTP calculation and large simulations belong on the backend. The client preview should never be treated as the source of truth for game mathematics.