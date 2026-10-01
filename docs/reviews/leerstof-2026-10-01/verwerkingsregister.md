# Verwerkingsregister integrale leerstofcontrole

## Versies en statussen

- Beoordeelde baseline: `26ed1c61ac41bfa5365de5eb01b80a3d047b98f3`.
- Lokale taakbasis: `07eb4edddb31cb7abe139751ed6bb5d2e0bc189f`.
- Laatste door de opdrachtgever bevestigde `main`: `47c1cb0dd64ef47da740e79a946757dd7a866daa`. De eenmalige controle van de echte remote mislukte met `CONNECT tunnel failed, response 403`; deze commit ontbreekt lokaal. De taakbranch blijft daarom gebaseerd op `07eb4edddb31cb7abe139751ed6bb5d2e0bc189f` en een conflictcontrole tegen de actuele hoofdbranch blijft een concrete integratieblokkade. De lokale `main` wordt niet als actueel gepresenteerd.
- **Aangepast**: concrete implementatie aanwezig.
- **Al juist/behouden**: gecontroleerde bestaande passage niet herschreven.
- **Deels aangepast**: een controleerbare verbetering is aanwezig, maar het volledige reviewcriterium is nog niet aantoonbaar afgerond.
- **Bronblokkade**: noodzakelijke zelfstandige bron ontbreekt; niet uit geheugen aangevuld.

## College 1–3

| ID | Status | Vindplaats en verwerking | Bron/verificatie |
|---|---|---|---|
| C12C3-01 | Aangepast | `decision-trees.json` innovatie; `c12-inno-toegang` en antwoordlagen: voordelen plus kosten ter verwerving van die voordelen; art. 12bc blijft afzonderlijke voortbrengingskostendrempel. | Wet-pdf p31/33; gerichte boomtest. |
| C12C3-02 | Aangepast | `c12-bp-stichting` en stichtingboom: art. 6 lid 2 blokkeert het lichaam, art. 5 blijft apart. | Wet-pdf p5–7; boomroute gevalideerd. |
| C12C3-03 | Aangepast | Carry-backboom noemt geen “strengere” toets meer en scheidt grens en referentieperiode. | Wet p89–90; slides p51/54. |
| C12C3-04 | Aangepast | `c12-winst-vv`/`c12-winst-giften`: casus-11-correcties, negatieve onttrekking en statutaire bijdrage; aansluiting €1.170.000/€1.150.000. | Oefenbundel p10; uitwerking p6; regressietest. |
| C12C3-05 | Aangepast | `c12-winst-aftrek`: zakelijkheid en jaarwinsttoerekening bij afkoop toekomstig tantième afzonderlijk. | Oefenbundel p9; uitwerking p5. |
| C12C3-06 | Aangepast | `c12-winst-vpb-commissaris`: afgerond €1.062.000 naast exact €1.061.924. | Oefenbundel p8; uitwerking p4. |
| C12C3-07 | Aangepast | Carry-forwardboom: alleen nieuwe werkzaamheden in samenhang met belangwijziging uitgesloten; voornemen gekoppeld aan 30%-grens binnen drie jaar. | Art. 20a lid 5, wet p89. |
| C12C3-08 | Aangepast | `c12-winst-aftrek` en wetsvenster: aandelen-/optiebeloning volgens art. 10 lid 1(j), zonder overgeneralisatie. | Slides p30; wet p21; popovertest. |
| C12C3-09 | Aangepast | `c3-earn-berekening` en earningsboom: geactiveerde rente zichtbaar in gecorrigeerde-winstformule. | Art. 15b, wet p75–76. |
| C12C3-10 | Aangepast | De bevestigde dubbele uitlegblokken bij overheid, verlies, giften, innovatiebox, zakelijke rente, samenloop en earningsstripping zijn uit de zichtbare overlay verwijderd; unieke vergelijkingsfactoren zijn in de canonieke basisuitleg geïntegreerd. Feiten en eenheden staan vóór de berekening. | Colleges C1/2 en C3, oefenuitwerkingen; build vergelijkt alle alinea’s met de leesgids; regressietest op feitenvolgorde. |

## College 4–7

| ID | Status | Vindplaats en verwerking | Bron/verificatie |
|---|---|---|---|
| C4567-01 | Aangepast | DVS-boom begint met FBI-aandeelhouder; gewone aandeelhouderroute blijft bereikbaar. | Art. 13 lid 8, wet p38; routetest. |
| C4567-02 | Aangepast | Vorderingenboom bevat ondernemingsoverdracht schuldenaar en bewijsregel lid 4. | Art. 13b leden 3–4, wet p43. |
| C4567-03 | Aangepast | Ontvoegingsboom toetst liquidatie in zicht vóór openingsbalans, ook zonder art. 15ai. | Art. 15aj lid 3, wet p72; routetest. |
| C4567-04 | Aangepast | Latere waardeaangroei gekoppeld aan art. 15aj lid 2; lid 3 uitsluitend liquidatie in zicht. | Wet p71–72. |
| C4567-05 | Aangepast | FE-verliesboom bepaalt eerst teken; negatieve route en chronologie toegevoegd. | Uitwerking C6/7 p7; art. 15ae/15ah/20. |
| C4567-06 | Aangepast | Recall, hoofdtekst en antwoord onderscheiden deelnemingsboekwaarde, activabasis en opgeofferd bedrag (560.000/360.000). | Art. 14 lid 3, wet p54; uitwerking C5 p3. |
| C4567-07 | Aangepast | Vraag/antwoord gebruikt besluit tot gehele/nagenoeg gehele staking en correcte bewijsmaatstaf. | Art. 13d lid 14(c), wet p49. |
| C4567-08 | Aangepast | Bevestigde dubbele voorbeelden bij vordering, bezitsperiode, DVS-omzetting, fusievormen, art. 15ai-rekenen en FE-verliesvoorbeelden zijn niet langer als tweede overlay zichtbaar. De canonieke bodies behouden voorwaarden, uitzonderingen en bedragen; de overige aanvullingen voegen aantoonbaar een ander begrip of bronperspectief toe. | Colleges C4–7 en uitwerkingen; 107-sectiebuild, leesgidscontrole en gerichte inhoudstests. |
| C4567-09 | Aangepast | `c67-verlies-carryback` bevat geïntegreerde negatieve FE-casus: −700, carry-back 275, restant 425. | Oefenbundel p29; uitwerking p7; regressietest. |
| C4567-10 | Aangepast | `c45-dvs-basis`: bonusaandelen nihil/uitsmeren kostprijs; geen automatische kostprijsverhoging. | Oefenbundel p22; uitwerking C5 p4. |
| C4567-11 | Aangepast | `c67-voeg-ontvoegbalans`: gewone reserveverdeling leden 1/4 versus vrijval lid 3. | Wet p71–72; wetsvenstertest. |

## College 8–9

| ID | Status | Vindplaats en verwerking | Bron/verificatie |
|---|---|---|---|
| C89-01 | Aangepast | Grondslag `c8-hyb-secundair`: uitsluiting in lid 1 tweede zin; dubbel-inkomenbeperking in lid 2. | Wet p27; buildvalidatie. |
| C89-02 | Aangepast | Hybride-ontvangerboom toetst volledig/gedeeltelijk/niet gedekt dubbel inkomen vóór uitkomst. | Art. 12ab lid 2 jo. 12aa lid 3; routetest. |
| C89-03 | Aangepast | `c8-tp-methoden`: directe/indirecte/operationele kosten, verschotten, financiering, grondstoffen en onvervuilde noemer. | Van Egdom p8–15. |
| C89-04 | Aangepast | `c8-tp-rekenen`: TNMM 100 − 88,5 − 8 = 3,5; correctie +1,5. | Van Egdom p15; regressietest. |
| C89-05 | Aangepast | Methodevoorkeur, ex ante/ex post, commodity-CUP en Berry ratio toegevoegd met auteurslabel. | Van Egdom p2–5,17–18,21. |
| C89-06 | Aangepast | `c9-ht-convenanten`/`voordelen`: FD-route, self-assessment, opting out, kosten en historische 2020-context. | Russo/Huiskers-Stoop p3–16. |
| C89-07 | Aangepast | `c9-tp-strategie`: gedragen versus afgedragen belasting als Gribnau-argument, niet als wettelijke regel. | Gribnau p3–4/8. |
| C89-08 | Aangepast | `c9-eth-juridisch`: cliëntfunctie, informatie, pleitbaar standpunt en auteursverwachting uit 2018. | Albert p3/5/7. |
| C89-09 | Aangepast | TP-figuur gebruikt verkoopprijs concernwinkel aan onafhankelijke afnemer. | Slides p6/8; figuurtest. |

## Samenhang en presentatie

| ID | Status | Vindplaats en verwerking | Verificatie/restpunt |
|---|---|---|---|
| SAM-01 | Aangepast | `summary-presentation.mjs`: veertien benoemde kernblokken blijven in Begrijpen. | Structuurtests geslaagd; browsercontrole niet uitgevoerd doordat Playwright en een browserbinary ontbreken. |
| SAM-02 | Aangepast | Oplossings-overlays zijn verwijderd bij de vier benoemde rekenvoorbeelden. Feiten en eenheid openen nu de canonieke body; tabellen en conclusies volgen daarna. | Presentatie-/buildtests controleren paragraafeigenaarschap en de feitenvolgorde; browsercontrole afzonderlijk geregistreerd. |
| SAM-03 | Aangepast | `c12-bp-stelsel` volgt kader → klassiek stelsel → vier vragen; de FE is alleen vooruitwijzing. In de expliciet gemelde doubluresecties is de aanvullende uitleg in de canonieke body geïntegreerd of als dubbel blok verwijderd. De generator staat daarom bewust ook nul aanvullende alinea’s toe wanneer de basisbody compleet is. | Slides C1/2 p2–6; alle 107 bodies/leesgidsen bouwen; zoekcontrole op dubbelformuleringen. |
| SAM-04 | Aangepast | Volledige grondslag eenmaal in Onderbouwen; oefenfase linkt terug. | `summary.mjs`; tests geslaagd. |
| SAM-05 | Aangepast | Aanpak/antwoord in leerfase standaard gesloten en direct bereikbaar. | DOM-code en tests geslaagd; browserinteractie niet uitgevoerd doordat Playwright en een browserbinary ontbreken. |
| SAM-06 | Aangepast | Elk van de 20 onderwerpen heeft twee of drie eigen korte kernroutes met directe sectielink. Het langere collegeblok is optioneel en verwijst expliciet naar de volledige leerstof; College 3 herhaalt zichtbaar alleen kwalificatie, aftrekroute en samenloop. | Data- en DOM-test op 20 compacte overzichten; mobiele browsercontrole afzonderlijk geregistreerd. |
| SAM-07 | Aangepast | Alle 107 secties hebben een expliciet, uniek vaardigheidsdoel met bepalen, onderscheiden, berekenen of onderbouwen; de generieke titel-fallback is uit builder en renderer verwijderd. `examTip` blijft antwoordcontrole. | Test eist 107 unieke doelen en verbiedt de sjabloontekst “uitleggen en toepassen”. |
| SAM-08 | Aangepast | De basisformule en eenvoudige vermogensvergelijking staan eerst. De combinatieposten zijn expliciet gelabeld “Verdieping na college 6 en 7” en linken naar liquidatieverlies, voeging/ontvoeging en FE-verlies. | Oefenuitwerkingen C1/2 en gerichte buildcontrole op werkende `data-summary-jump`-doelen. |
| SAM-09 | Aangepast | De zichtbare DVS-volgorde is basis → meesleep/meetrek → drie kwalificatietoetsen → vervolg bij geen DVS → kosten → vordering → omzetting. Alle sectie-ID’s bleven gelijk. | Art. 13-route uit college C4/5; regressietest controleert dat `toetsen` vóór `kosten` staat. |
| SAM-10 | Aangepast | `c8-tp-analyse` eindigt met de feitenanalyse en verwijst vooruit. `c8-tp-methoden` definieert eerst CUP, resale, cost-plus, TNMM en profit split; pas daarna volgen de keuzes uit oefencasus 6 en de resultatenrekening. De tweede toepassingstabel blijft bij het voorbeeld en niet bij het kernblok. | Van Egdom p2–21; regressietest controleert methodevolgorde en scheiding analyse/toepassing. |
| SAM-11 | Aangepast | Het kernoverzicht toont art. 8ba → 8bb → 8bc → 8bd. De verdiepende 8bc/8bd-blokken zijn toepassingsvoorbeelden ná deze route; de ATAD2-afbakening en ene art. 35-bronnotitie blijven staan. | Wet Vpb p12–13 en bronafbakening OWP; volgordetest. |
| SAM-12 | Aangepast | De canonieke HT-body definieert eerst HT, drie pijlers, convenantvormen, TCF/BCF en metatoezicht. Historische auteurskritiek, self-assessment en FD-verdieping zijn als toepassing daarna geplaatst. | College 9 en Russo/Huiskers-Stoop p3–16; presentatiefasetest. |
| SAM-13 | Aangepast | Alle college- en onderwerpopeningen zijn op de zichtbare leerroute gecontroleerd. C12 opent volgens slides p2–6; C8 volgt de programmavolgorde TP → mismatch → internationaal; de bestaande brugteksten benoemen telkens voorkennis en het nieuwe analyseniveau. “Samenvatting” en dubbele “Pas pas” zijn uit leerlingtekst verwijderd. | Onderwijsprogramma p7–8 en colleges; zoekcontrole en openingsregressietest. |
| SAM-14 | Aangepast | De broncasus 2014 sluit € 2,7 mln FE-winst, € 1,9 mln oude pandreserve, € 0,7 mln Sonetwinst en € 2 mln belastbaar bedrag aan. De herverdeling toont eerste aanbod, eerste benutting, tweede aanbod, aanvullende benutting en de onbenutte € 9,5 mln. | Brontentamen 24 juni 2014 opgave 4; college-uitwerking art. 12 Besluit FE; rekentests. |
| SAM-15 | Aangepast | Elk van de zes colleges heeft een integrerende route met vier of vijf directe links naar bestaande secties. Iedere link opent daar de reeds brongebonden tentamenvraag en het volledige antwoord; er zijn geen nieuwe fiscale feiten of regels verzonnen. | Onderwijsprogramma p5 en bestaande `exam-practice`/`worked-answers`; builder valideert minimaal vier stappen per college. |
| SAM-16 | Aangepast | Leerlingtekst gebruikt “leerstof” in plaats van “samenvatting”, “aangeleverde uitwerking” in plaats van interne controletaal en bevat geen aangetroffen dubbele woorden. Auditvelden mogen historische redactietermen behouden omdat zij niet worden gerenderd. | `rg`-controle op dubbele woorden en productietermen in gerenderde authoringvelden. |

## G1 en aanvullende concretisering

| Bevinding | Status | Verwerking | Bron/verificatie |
|---|---|---|---|
| G1 bronruis | Aangepast | Generator bewaart specifieke art. 2, 7 en 15-verwijzingen en één globale wetlink; stelselantwoord heeft vijf refs in plaats van 98. | `tools/build-summary.mjs`; regressietest. |
| G1 casusantwoord | Aangepast | Vraag, aanpak, grondslag en antwoord gebruiken dezelfde feiten. Vestiging is aanname; art. 2 lid 1(a), art. 7 leden 1–3 en uitsluitend in aanvullende FE-variant art. 15 lid 1 staan bij de conclusies. | Wet-pdf p2,9,60; antwoordtest. |
| G1 aandeelhouder | Bronblokkade | Particuliere aandeelhouder is afzonderlijk en vormt geen FE. Zelfstandige Wet IB 2001 ontbreekt; geen box-2-wetscitaat verzonnen. | College p3 ondersteunt klassiek stelsel; primaire IB-grondslag ontbreekt. |

## Overige bronblokkades

| Ontbrekende bron | Gevolg en motivering |
|---|---|
| Voorgeschreven leerboek 2025/2026 | Geen claim dat iedere boekparagraaf onafhankelijk volledig is geverifieerd. |
| Volledige AWR, Wet IB en arresten | Alleen door colleges/uitwerkingen gedragen uitleg; geen zelfstandig wets- of arrestonderzoek suggereren. |
| BVDB, verdragen en EU-regels | Internationale uitleg begrensd tot aangeleverde bronnen; geen externe actualisering. |
| Besluit fiscale eenheid 2003 | Negatieve salderingsroute steunt op aangeleverde uitwerking; niet tot volledige Besluit-dekking generaliseren. |
| Aangewezen-landenregeling | Geen ongefundeerde landenlijst of algemene uitsluiting toegevoegd. |
| Art. 35 als zelfstandige tekst | Wetselectie eindigt bij art. 29i; bronverschil OWP/slides blijft zichtbaar, artikel niet gereconstrueerd. |

## Reeds inhoudelijk juist en behouden

De 50%-grens bij kwalificerende beleggingsdeelneming, DVS-heffingsberekening 4.420/5.000, innovatiebox 9/H, FE-vermogenssprong −230.000, art. 13d lid 11, art. 15ai-rekenuitkomsten, FE-ruimte 35,5 mln, CFC-nettobenadering, verdragsvoorrang en bronbelastingcasussen waren al juist en zijn niet als nieuwe correctie herschreven.

## Technische oplevering en nog open integratie

- Structuurbehoud wordt geautomatiseerd gecontroleerd: 107 secties, 25 beslisbomen en 7 figuren.
- `node tools/build-summary.mjs`: geslaagd. `npm test`: 101/101 geslaagd. `git diff --check`: geslaagd. Privacy-/metadatazoekactie: geen privépad, geheim of niet-projectadres in de taakdiff aangetroffen.
- `npm run build:site` bouwde de volledige site-uitvoer (1079 vragen, 55 brondocumenten en 716 bronpagina’s), maar de verplichte externe privacy-installer kon in deze omgeving niet worden opgehaald (`fetch failed`). De onderliggende `npm run build` was geslaagd; de netwerkafhankelijke eindstap is een omgevingswaarschuwing, geen geslaagde volledige sitebuild.
- Een echte browsercontrole is alleen als geslaagd geregistreerd wanneer een beschikbare browserdriver de gebouwde pagina opent. Ontbreekt Playwright of een browserbinary, dan blijft dit een omgevingswaarschuwing en geen geslaagde smoketest.
- Integratie met de door de opdrachtgever gemelde actuele `main` (`47c1cb0dd64ef47da740e79a946757dd7a866daa`) is niet lokaal uitgevoerd omdat de enige toegestane remotecontrole HTTP 403 gaf. Daardoor zijn de gemelde conflictresolutie en een actuele Cloudflare-preview nog afhankelijk van de native PR-update. Dit is geen inhoudelijke bronblokkade en geen reden om de oudere lokale `main` als actueel te presenteren.
