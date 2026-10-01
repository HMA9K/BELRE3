# BELRE3 beheren en publiceren

De hoofdbranch `main` van [HMA9K/BELRE3](https://github.com/HMA9K/BELRE3) is de bron voor de openbare leeromgeving. Cloudflare Pages bouwt deze branch automatisch. Het productieadres is [belre3.pages.dev](https://belre3.pages.dev/).

## Vaste route

1. Haal de actuele openbare hoofdbranch op. Maak per taak een afzonderlijke branch en een eigen werkboom vanaf die versie. Gebruik een bestaande werkboom alleen wanneer die bij dezelfde taak hoort en geen andere werkzaamheden bevat.
2. Bewaar inhoud en wijzigingen van andere taken. Neem geen oude lokale hoofdbranch over als die achterloopt op de openbare versie of nog historische persoonsgegevens bevat.
3. Voer `npm test` en een schone build met `npm run build:site` uit. Gebruik `BELRE_BUILD_OUTPUT` voor een afzonderlijke uitvoermap wanneer de standaardmap al bestaat.
4. Controleer gewijzigde bestanden, namen, documentmetadata, nieuwe commit-auteurs en commitberichten. Gebruik uitsluitend het projectpseudoniem en het bestaande GitHub-noreplyadres.
5. Push de taakbranch en open een pull request. Controleer vlak vóór samenvoegen opnieuw de openbare `main`. Bij nieuwe commits: werk de branch bij en herhaal de controles die door die wijziging worden geraakt.
6. Voeg samen via GitHub. Cloudflare Pages gebruikt buildopdracht `npm run build:site`, uitvoermap `dist`, Node 22 en de bestaande productiebindings. Rechtstreekse uploads behoren niet tot de normale publicatieroute.
7. Controleer afzonderlijk de GitHub-commit, de Cloudflare-productiepublicatie en de live bestanden. Een geslaagde push bewijst geen geslaagde build. Meld afwijkingen voordat een taak wordt afgevinkt.

## Meetservice en privacy

Het meetadres is [leeromgeving-statistieken.hma9k.workers.dev](https://leeromgeving-statistieken.hma9k.workers.dev/). `tools/install-analytics.cjs` voegt de bestaande gebruiksmeting en privacybediening toe aan de schone sitebuild. Het adres is instelbaar met `STUDY_METRICS_ORIGIN`; de privacy-installer is vastgezet met een SHA-256-controle. Een ontbrekende of gewijzigde installer blokkeert de build.

Toegangscodes, API-sleutels, ondertekeningsgeheimen en meetgegevens staan buiten Git. De bestaande D1-database en geheime Cloudflare-bindings worden bij adreswijzigingen behouden. Lokale bronstukken en herstelkopieën blijven lokaal; zij worden niet door `dist` gepubliceerd.

## Werkafspraken

- Eén taak heeft één branch, één werkboom en een afgebakende wijziging. Vermeld taak, branch, basiscommit, gewijzigde bestanden, uitgevoerde controles en resterende punten in de pull request.
- Controleer vóór wijzigen en publiceren welke andere branches en werkbomen actief zijn. Wijzig of ruim de werkboom van een andere taak niet op.
- Synchroniseer via de actuele openbare Git-geschiedenis. Kopieer geen volledige oude website of oude commits terug om een klein verschil op te lossen.
- Houd de meting, privacybediening en assistentbindings aanwezig. Pas gedeelde onderdelen alleen toe op de omgevingen waarvoor de taak geldt.
- Werk de takenlijst pas bij nadat het beschreven resultaat met bewijs is vastgesteld. Houd voorstellen en geparkeerd werk afzonderlijk herkenbaar.

Bronnen: [BELRE3](https://github.com/HMA9K/BELRE3), [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/) en [Cloudflare workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).
