# VB TippLiga VPS deploy

## Futtatás VPS-en

1. Masold fel a teljes `outputs` mappat a VPS-re, peldaul ide:

   ```bash
   /opt/vb-tippelde
   ```

2. Inditsd el a Node szervert:

   ```bash
   cd /opt/vb-tippelde
   PORT=3000 node server.js
   ```

3. Caddy konfiguracio

   Ehhez az apphoz az ajanlott megoldas az, hogy Caddy minden kerest a Node szerverre proxyz. A `server.js` kiszolgalja a statikus fajlokat es az API-t is, igy kisebb a hibalehetoseg:

   ```caddy
   tippelde.szlncz.hu {
     encode gzip
     reverse_proxy 127.0.0.1:3000
   }
   ```

   Ha Caddy statikusan szolgaltatja ki a fajlokat, akkor az API kereseket kulon kell a Node szerverre proxyzni. Pelda:

   ```caddy
   tippelde.szlncz.hu {
     encode gzip
     root * /opt/vb-tippelde

     handle /api/* {
       reverse_proxy 127.0.0.1:3000
     }

     handle {
       file_server
     }
   }
   ```

   Fontos: ha a belepesnel `404` jon a `/api/login` keresre, akkor Caddy nem proxyzza az API utvonalat a Node szerverre, vagy a Node szerver nem azon a porton fut. Ilyenkor a statikus oldal betolt, de a felhasznalok, tippek es eredmenyek nem lesznek globalisan mentve.

4. Gyors VPS diagnosztika

   Ellenorizd, hogy a Node app kozvetlenul valaszol-e:

   ```bash
   curl -i http://127.0.0.1:3000/api/state
   ```

   Ha ez nem ad `200 OK` valaszt, akkor a Node app nem fut, rossz porton fut, vagy nem abbol a mappabol indult, ahol a `server.js` van.

   Ellenorizd a publikus API-t is:

   ```bash
   curl -i https://tippelde.szlncz.hu/api/state
   ```

   Ha a lokalis `127.0.0.1:3000` valaszol, de a publikus URL `404`, akkor Caddy konfiguracios gond van: a `/api/*` keresek nem mennek at a Node szerverre.

   Belepes teszt:

   ```bash
   curl -i -X POST https://tippelde.szlncz.hu/api/login \
     -H "content-type: application/json" \
     --data '{"name":"<admin-nev>","password":"<admin-jelszo>"}'
   ```

## Adattarolas

Az app ket helyre ment:

- bongeszoben `localStorage`-ba, hogy helyben is megmaradjon az allapot,
- VPS-en a Node szerveren keresztul JSON fajlba.

A szerveroldali fo adatfajl:

```text
/opt/vb-tippelde/data/state.json
```

Ebben van minden fontos adat: felhasznalok, jelszo hash-ek, meccsek, tippek, eredmenybekuldesek, jovahagyott eredmenyek es admin allapotok.

Fontos: jelenleg nincs beépített automatikus backup a kodban. Az automatikus mentest kulon kell futtatni a VPS-en, peldaul `cron` segitsegevel.

## Backup javaslat

Hozz letre kulon backup mappat:

```bash
sudo mkdir -p /var/backups/vb-tippliga
sudo chown -R $USER:$USER /var/backups/vb-tippliga
```

Kezi backup parancs:

```bash
cp /opt/vb-tippelde/data/state.json \
  /var/backups/vb-tippliga/state-$(date +%F-%H%M).json
```

Napi automatikus backup `cron`-nal:

```bash
crontab -e
```

Add hozza ezt a sort, peldaul minden nap 23:00-kor:

```cron
0 23 * * * cp /opt/vb-tippelde/data/state.json /var/backups/vb-tippliga/state-$(date +\%F-\%H\%M).json
```

Meccsnapokon erdemes surubb mentest hasznalni, peldaul 2 orankent:

```cron
0 */2 * * * cp /opt/vb-tippelde/data/state.json /var/backups/vb-tippliga/state-$(date +\%F-\%H\%M).json
```

## Regi backupok takaritasa

Pelda: 30 napnal regebbi backupok torlese naponta 23:30-kor:

```cron
30 23 * * * find /var/backups/vb-tippliga -name 'state-*.json' -type f -mtime +30 -delete
```

## Kulso backup

Ne csak ugyanazon a VPS-en legyen mentes. Idonkent masold ki a backupokat kulso tarhelyre is, peldaul:

- masik szerver,
- Hetzner Storage Box,
- S3-kompatibilis tarhely,
- Google Drive / Dropbox / sajat gep.

Minimum javaslat:

- napi helyi backup a VPS-en,
- meccsnapokon 2 orankenti backup,
- heti kulso backup,
- nagyobb admin muvelet elott kezi export az appbol.

Az app Admin feluleten van `Adatok exportalasa JSON-kent` gomb is. Ez kezi biztonsagi mentesnek jo.

## Visszaallitas backupbol

1. Allitsd le a Node szervert.

2. Mentsd el a jelenlegi allapotot, mielott felulirod:

   ```bash
   cp /opt/vb-tippelde/data/state.json \
     /opt/vb-tippelde/data/state-before-restore-$(date +%F-%H%M).json
   ```

3. Masold vissza a kivalasztott backupot:

   ```bash
   cp /var/backups/vb-tippliga/state-2026-06-08-2300.json \
     /opt/vb-tippelde/data/state.json
   ```

4. Inditsd ujra a Node szervert.

## Jelszavak tarolasa

A jelszavak nem kerulnek olvashato formaban a `state.json` fajlba. Az app minden jelszot egyedi salt + PBKDF2-SHA-256 hash formaban tarol:

- `passwordSalt`
- `passwordHash`
- `passwordVersion`
- `passwordIterations`

Plaintext `password` mezot a kliens mentés elott torol, es a szerver is kidobja mentéskor, ha veletlenul beerkezne.

Fontos: ez csaladi/barati hasznalatra mar sokkal jobb, mint a sima szoveges jelszo, de tovabbra sem banki szintu auth rendszer. Ha nagyobb kornek nyitod meg, erdemes kesobb szerveroldali session kezelest, HTTPS-t, rate limitet es SQLite/adatbazis alapu tarolast hasznalni.

## Felhasznalok letrehozasa

A nyilvanos regisztracio ki van kapcsolva. Az alap rendszeradmin a szerver kodjaba epitett virtualis felhasznalo, nem a `state.json` resze. Emiatt teljes adatnullazas utan is van admin belepesi lehetoseg.

Ez az alap admin nem jatekos: nem szerepel a tabellaban, nem tippel, es csak adminisztracios feladatokra valo. Az admin feluleten lehet uj felhasznalokat letrehozni ideiglenes jelszoval, es ott lehet nekik admin jogot adni vagy elvenni.

Az alap admin fixen a kodba van epitve, nem kornyezeti valtozobol es nem a `state.json`-bol jon. Ez azert van igy, hogy teljesen ures `data` mappa es hianyzo `state.json` mellett is legyen mivel belepni.

Az admin altal letrehozott felhasznaloknak az elso belepes utan kotelezo jelszot modositaniuk, mielott barmit csinalhatnanak az appban. Admin jelszo-visszaallitas utan ugyanigy kotelezo lesz az uj jelszo megvaltoztatasa.

## Elfelejtett jelszo

Az app nem kuld automatikus emailt. A felhasznalo a belepesi oldalon tud jelszo-visszaallitast kerni, ez az admin feluleten jelenik meg. Az admin ott uj jelszot allithat be, vagy lezarhatja a kerest.

Az uj jelszo ilyenkor is csak hash-elve kerul mentésre.

## Meccs ertesitesek

Az app tud bongeszo/PWA ertesitest kerni a meccsek kezdete elott 1 oraval. Ez a bongeszo Notification API-jat es a service workert hasznalja.

Fontos korlat: ez nem teljes erteku szerveroldali push rendszer. Akkor mukodik megbizhatoan, ha a felhasznalo engedelyezte az ertesiteseket es az appot idonkent megnyitja / telepitett PWA-kent hasznalja. Valodi hatter-pushhoz kesobb kulon push subscription, VAPID kulcsok es szerveroldali push kuldes kellene.

## CSV import

CSV import mukodik a bongeszoben es a Node szerveres verzioban is. A `csoport` oszlop opcionális, tehat csoportnev nelkuli CSV export is feltoltheto.
