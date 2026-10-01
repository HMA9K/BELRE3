# BELRE3 oefenomgeving

De zelfstandige ingang is `oefenen/index.html`. De bestaande BELRE3-pagina krijgt alleen twee links naar deze ingang. De bestaande samenvatting, oefenbundel en artikelweergave gebruiken hun eigen code en opmaak.

## Lokale voorbereiding

Benodigd: Python 3.10 of nieuwer en Node.js 20 of nieuwer. Er zijn geen te installeren pakketafhankelijkheden.

```sh
python tools/import-content.py --source <map-met-uitgepakte-aanlevering>
node --test tests/*.test.cjs tests/*.test.mjs
python tools/serve-preview.py
```

Open vervolgens [de lokale oefenomgeving](http://127.0.0.1:8768/oefenen/). Gebruik een lokale webserver; rechtstreeks openen met een bestand-URL ondersteunt het laden van de vragenbank niet.

### Bekijken op een telefoon

`127.0.0.1` verwijst altijd naar het apparaat waarop de browser draait. Voor een telefoon op hetzelfde wifi-netwerk start je de preview met het lokale IPv4-adres en subnet van de computer:

```sh
python tools/serve-preview.py --bind <computer-ip> --port 8769 --allow-network <lokaal-subnet>
```

Open op de telefoon `http://<computer-ip>:8769/oefenen/`. De computer en previewserver moeten aanblijven. De Windows-firewall en het wifi-netwerk moeten deze verbinding toestaan. De server wijzigt geen firewallinstellingen. Alleen applicatiebestanden worden aangeboden; Git, gereedschappen, documentatie, uitvoermappen en mapoverzichten blijven afgeschermd. Buiten dit wifi-netwerk is een afzonderlijk voorbereide online preview nodig.

De importer controleert alle SHA-256-hashes uit het aanleveringsmanifest, de afgebakende bronselectie, vraag-ID's, antwoordopties, paginaverwijzingen, puntentotalen, casusafhankelijkheden en vrijgavestatussen. Alle controles gebeuren voordat de vragenbank wordt bijgewerkt.

## Bronnen en inhoud

De aanlevering bevat 628 MC-vragen, 336 geselecteerde open vragen en 57 bronpaden met 55 unieke PDF-bestanden. Alleen de geselecteerde bronmappen en vier geselecteerde losse PDF's worden toegelaten. De importer controleert het bronarchief met SHA-256 `83e207643cecef4555fa26a1954d2cd58af7958ef30763994cd0d711c53f0c7d`.

Na de redactie van 30 september 2026 bevatten nieuwe oefenreeksen 594 MC-vragen: 448 syllabusvragen, 53 MC-tentamenvarianten en 93 korte vragen. Er zijn 20 nieuwe samengestelde of uitgebreide tentamenvarianten toegevoegd en 54 overlappende of beperkte deelvragen vervallen. De oorspronkelijke categorieën zijn niet omgelabeld. Alle 19 onderwerpen blijven vertegenwoordigd.

De lokale uitbreiding van 1 oktober 2026 voegt vijf korte kennistoetsen toe aan elk van de 19 onderwerpen in de MC-selectie: 95 nieuwe vragen en in totaal 689 actieve vragen, waaronder 188 korte vragen. Elke nieuwe vraag toetst één afgebakende regel of berekening en heeft vier antwoordkeuzes, uitleg, bronpagina's en waar toepasselijk wetsverwijzingen. De langste nieuwe vraag telt 29 woorden. De oefenbasis en antwoordmodellen zijn vastgelegd in `content-authoring/mc-short-questions.json`. De importer past deze uitbreiding na de eerdere redactie toe. Beide eerdere vragenbankversies blijven hervatbaar; hun vraaginhoud, volgorde en eerste scores worden behouden.

`content-authoring/mc-curation.json` bevat per vervallen vraag de reden en actieve opvolgers, en per nieuwe variant de volledige vraag, bronpagina's, wetsverwijzingen, rekencontroles en expliciete wijzigingen ten opzichte van het brontentamen. De importer past deze beslissingen na verificatie van de oorspronkelijke aanlevering toe. De 49 open modellen in afwachting van controle zijn niet gebruikt als basis voor de nieuwe varianten. `docs/mc-kwaliteit.json` beschrijft de omvang en controles van deze redactieronde.

De gecontroleerde runtimebestanden en 55 PDF-publicatiekopieën staan in `oefenen/content/` en worden met de applicatie gepubliceerd. De oorspronkelijke bronbestanden en aanleveringspakketten blijven buiten de repository. `oefenen/config.mjs` bevat het instelbare bronadres; de PDF-lezer accepteert uitsluitend bronnen op dezelfde origin. De bestaande Cloudflare Pages-publicatie via `main` en de bestaande privacy- en meetinstellingen blijven behouden.

| Onderdeel | Werking |
| --- | --- |
| MC-vragen | Syllabusvragen, MC-tentamenvarianten of korte vragen; daarnaast basis, toepassing of tentamenniveau; filter per onderwerp |
| MC-voortgang | Eerste gecontroleerde keuze blijft bewaard; per keer wordt één vraag gerenderd |
| Tentamens | 15 BELRE3-tentamens; Tax 2 staat afzonderlijk onder aanvullend materiaal |
| Historische bron | Ongewijzigde PDF, afzonderlijk van het oefenmodel voor 2026 |
| Antwoordmodel | 336 modellen voor handmatige vergelijking, waarvan 5 uitsluitend onder expliciete oefenaannames |
| Modelreview | De 49 oorspronkelijk geblokkeerde modellen zijn gekoppeld aan de afzonderlijke inhoudelijke review |
| Gedeeltelijke selectie | Standaard zonder klok; oorspronkelijke cesuur wordt niet toegepast |
| Antwoordinvoer | Teksteditor, journaalpost, balans of tekenruimte, passend bij de vraag |

Casusjaren worden niet verschoven. De importer gebruikt de expliciete Vpb-selectie, casus-ID's en eerdere vraagteksten uit de aanlevering. Eerdere modelantwoorden worden niet als casuscontext opgenomen. Tabellen en schema's blijven in de oorspronkelijke PDF beschikbaar.

Twee aangeleverde presentatiecodes zijn aangepast: `belre3-20161220-s2-qa` en `belre3-20211122-s1-q2` vragen om een toelichting over balansopname en krijgen een teksteditor. `belre3-20250611-s6-q26` vraagt om twee balansen en krijgt twee tabellen. De oorspronkelijke presentatiecode en vraagtekst blijven behouden.

## Hergebruik en opslag

De bediening, klok, pogingopslag, casussplitter, antwoordeditor, journaalpostcomponent, rekenmachine en PDF-lezer zijn overgenomen uit CAFA2, revisie `93d3a4de49fe0f53c72cc44847723cd7abde45cb`. De bronhashes per bestand staan in `oefenen/cafa2-provenance.json`; licentiebestanden van meegeleverde onderdelen blijven aanwezig.

BELRE3-aanpassingen betreffen de cursusnamen en opslagnamen, inhoudsadapter, catalogusselectie, modelvrijgave, MC-controller, balans- en tekeninvoer en bronknoppen. De nieuwe omgeving gebruikt Arial. De oorspronkelijke BELRE3-lettertypen blijven intact.

Pogingen bewaren een zelfstandige kopie van het tentamen. Een latere inhoudsimport vervangt bestaande antwoorden of modellen in die poging niet. Nieuwe pogingen gebruiken de nieuwe bank. MC-pogingen bewaren hun bankrevisie en worden niet stilzwijgend beoordeeld met een gewijzigde bank. Back-ups kunnen vanuit beide omgevingen worden gedownload. Browseropslag is geen synchronisatie tussen apparaten.

Voor MC-reeksen uit de oorspronkelijke publicatie blijven alle 628 oorspronkelijke vraagobjecten, inclusief antwoordopties, IDs en uitleg, beschikbaar. De 54 vervallen vragen staan uitsluitend nog in de compatibiliteitscollectie en worden nooit aan een nieuwe reeks toegevoegd. Een expliciete lijst koppelt de oude bankrevisie aan haar oorspronkelijke vraag-IDs. Onbekende revisies of toegevoegde vragen in een oude reeks worden niet stilzwijgend geaccepteerd; opgeslagen antwoorden blijven dan wel bij Voortgang en in de back-up aanwezig.

De oorspronkelijke lijst van 49 controlepunten blijft ongewijzigd in de aanlevering. `content-authoring/exam-model-review.json` bevat de aangeleverde inhoudelijke beoordeling: 44 definitieve oefenmodellen en 5 modellen onder expliciete aannames. `exam-model-review-release.json` legt de goedgekeurde vraag-IDs, bronhash en inhoudelijke controlehashes vast. De importer controleert deze aparte laag na de oorspronkelijke import. Een andere bronbank, gewijzigd reviewbestand, onjuiste berekening, ongeldige bronpagina of tegenstrijdige vrijgavestatus blokkeert de import voordat runtimebestanden worden geschreven.

De vijf oefenmodellen met aannames tonen die aannames zowel bij de vraag als boven het antwoordmodel. Ontbrekende gegevens blijven apart geregistreerd. De beoordeling blijft handmatig en de oorspronkelijke casussen, punten en historische PDFs blijven behouden. Zie [de verwerking van de modelreview](modelreview-49.md).

## Verificatie

Het verrekenprijsschema uit College 8 heeft klikbare partijen en methoden met korte uitleg en gemarkeerde vergelijkingspijlen. Zie [het interactieve schema en de bronafbakening](interactief-verrekenprijsschema.md).

De oorspronkelijke casussen hebben een afzonderlijk beoordeelde opmaak met passende koppen, alinea’s, nadruk en financiële tabellen. Bij bestaande pogingen wordt deze alleen gebruikt wanneer de oorspronkelijke casustekst overeenkomt. Zie [de casusopmaak en broncontrole](casus-opmaak.md).

De tests controleren de geërfde klok- en poginglogica, MC-filters en scorebehoud, modelvrijgave, geïmporteerde bronintegriteit en behoud van de bestaande BELRE3-pagina. De volledige-banktest gebruikt de gecontroleerde publicatiekopieën in de repository. De afzonderlijke Python-tests controleren de toegangssleutel, vervaltijd en bestandsafbakening van de lokale previewserver.

De fiscale inhoud is gebaseerd op de aangeleverde review, de geselecteerde cursusbronnen en de aangeleverde wettekst. De technische controles bewijzen de koppeling, berekeningen en behoud van overige inhoud; zij zijn geen afzonderlijke bevestiging van iedere fiscale uitleg. Deze modellen zijn bedoeld voor het oefenen van de broncasussen met de vermelde uitgangspunten.

Bronnen: de geselecteerde lokale bronbestanden, het gecontroleerde overdrachtspakket en de genoemde CAFA2-revisie. [BELRE3-repository](https://github.com/hma9k/BELRE3).

De nummering, vaste leesvolgorde, actuele leesplek en kleurgebruik staan beschreven in [Leesstructuur](leesstructuur.md).

De MC-keuze staat boven Verder oefenen. Vraagtype, moeilijkheid, hoorcollege en onderwerp zijn vinkvakjes met meerdere keuzes per groep. Zonder vinkjes geldt alles; de groepen beperken elkaar. Onderwerpen volgen de gekozen colleges. Het aantal voor een gemengde toetsreeks blijft één keuze. Bestaande reeksen behouden hun vragen en antwoorden.

Bij open tentamenvragen kies je het hoorcollege rechtstreeks met een keuzerondje. Er is steeds één college geselecteerd; de keuze voor het hele college, de onderwerpen en de beschikbare brontentamens volgen die selectie. De drie stappen gebruiken compacte keuzevakken en kleinere tussenruimten, met dezelfde lettergrootte. Op smalle schermen staan de collegekeuzes in twee rijen.
