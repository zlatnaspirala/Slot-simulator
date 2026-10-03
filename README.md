# slot-simulator 1.0.0

### Done list
 - Dinamic slot mashine construction and simulation.
 - Active server provider

## BackOffice
 - MongoDB
 - NodeJS

## Client (reactjs/vanilla JS)
 - `app` folder is reactjs app (must be "app" because it is hardcoded in next).
 - `vanilla` is JS native variant

### Install
```js
npm i
```

### Run reactjs
```js
npm run dev
```

### Run vanillajs
```js
npm run dev:vanilla
```

### Run backend
```js
npm run dev:backend
```

## Note's

**Vanilla JS is the ultimate performance-oriented option.** It has less framework/runtime overhead and is useful for a lightweight slot preview, benchmark client, embedded demo, or very high-frequency visual updates.

The authoritative RTP calculation and large simulations belong on the backend. The client preview should never be treated as the source of truth for game mathematics.