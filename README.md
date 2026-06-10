# VB TippLiga

Ez az alkalmazás PHP backenddel fut, és helyben a beépített PHP fejlesztői szerverrel lehet elindítani.

## Indítás localhoston

1. Nyiss egy terminált a projekt gyökérkönyvtárában:


2. Indítsd el a PHP szervert:

   ```bash
   php -S 127.0.0.1:8787 router.php
   ```

3. Nyisd meg böngészőben:

   ```text
   http://127.0.0.1:8787/
   ```

## Miért kell a `router.php`?

A `router.php` kezeli a helyi kiszolgálást, és tiltja a `data/` mappában lévő érzékeny fájlok közvetlen elérését, például a `state.json` letöltését.

## Előfeltétel

A gépen legyen telepítve PHP. Gyors ellenőrzés:

```bash
php -v
```

Ha a `8787` port foglalt, használhatsz másikat is, például:

```bash
php -S 127.0.0.1:8000 router.php
```

és akkor ezt az URL-t nyisd meg:

```text
http://127.0.0.1:8000/
```
