# Verwerkingsregister integrale leerstofcontrole

## Versies en statussen

- Beoordeelde baseline: `26ed1c61ac41bfa5365de5eb01b80a3d047b98f3`.
- Lokale taakbasis: `07eb4edddb31cb7abe139751ed6bb5d2e0bc189f`.
- Laatste extern gemelde `main`: `35770edaf28e76fcf8745f6cf93447a282c46e1c`; deze commit is door netwerkblokkade niet op te halen en ontbreekt lokaal. Een conflictcontrole tegen die versie is daarom nog open.
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
| C12C3-10 | Deels aangepast | Gerichte dubbele passages zijn door aanvullende kernblokken en presentatie-eigenaarschap verbeterd; geen automatische inkorting. Een handmatige alinea-voor-alinea eindredactie van alle genoemde doublures is nog niet browsermatig vastgesteld. | Authoring/buildtests; visuele controle open. |

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
| C4567-08 | Deels aangepast | Gerichte secties kregen geïntegreerde aanvullingen; systematische vervanging van alle 38 append-secties is niet uitgevoerd omdat dit zonder volledige visuele vergelijking risico op inhoudsverlies geeft. | Build- en structuurtests; browsercontrole open. |
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
| SAM-01 | Aangepast | `summary-presentation.mjs`: veertien benoemde kernblokken blijven in Begrijpen. | Structuurtests; visuele controle open. |
| SAM-02 | Deels aangepast | Blok-eigenaarschap voorkomt dat benoemde kernstof als voorbeeld verhuist. Niet alle vier rekenvoorbeelden zijn in een echte browser afzonderlijk visueel doorlopen. | DOM/buildtests; browsercontrole open. |
| SAM-03 | Deels aangepast | `c12-bp-stelsel` volledig doorlopend herschreven; andere gerichte doublures verbeterd. Volledige redactionele integratie van alle 107 secties is niet aangetoond. | Nieuwe openingstest; visuele eindredactie open. |
| SAM-04 | Aangepast | Volledige grondslag eenmaal in Onderbouwen; oefenfase linkt terug. | `summary.mjs`; tests geslaagd. |
| SAM-05 | Aangepast | Aanpak/antwoord in leerfase standaard gesloten en direct bereikbaar. | DOM-code en tests; browserinteractie nog open. |
| SAM-06 | Aangepast | Compact lokaal overzicht begrip/hoofdregel/toepassing/link; volledig college achter uitklapper; mobiele overflow-CSS. | CSS/DOM-tests; echte mobiele screenshot ontbreekt. |
| SAM-07 | Aangepast | 107 afzonderlijke `learningGoal`-velden; `examTip` alleen antwoordcontrole. | Integrale regressietest. |
| SAM-08 | Al juist/behouden | Bestaande gecombineerde verdieping is niet verwijderd. Geen aanvullende authoringwijziging uitgevoerd. | Inhoud bleef via build behouden; visuele positionering niet opnieuw vastgesteld. |
| SAM-09 | Niet afgerond | DVS-sectievolgorde is niet structureel herschikt; stabiele IDs zijn behouden. Een herordening vereist aanvullende navigatie-/voortgangscontrole tegen actuele main. | Geen bronblokkade; implementatiepunt open. |
| SAM-10 | Deels aangepast | Kernmethodeblok blijft in Begrijpen en TP-kostenbasis is aangevuld; volledige interne methodevolgorde niet browsermatig bevestigd. | Structuurtests; visuele controle open. |
| SAM-11 | Niet afgerond | Art. 8ba–8bd-inhoud bleef behouden, maar de volledige gevraagde zichtbare herschikking is niet afzonderlijk geïmplementeerd. | Geen bronblokkade; implementatiepunt open. |
| SAM-12 | Deels aangepast | FD/HT-definities en route zijn aangevuld; volledige volgorde convenantdefinitie → vormen → auteursverdieping niet visueel vastgesteld. | Inhoudstest; browsercontrole open. |
| SAM-13 | Deels aangepast | Brugteksten tussen colleges en nieuwe bronvolgorde voor `c12-bp-stelsel`; overige openingen zijn inhoudelijk gescand maar niet allemaal herschreven. | College C1/2 p2–6; nieuwe openingstest. |
| SAM-14 | Deels aangepast | Negatieve FE-casus volledig toegevoegd; afzonderlijke ronde-voor-ronde herverdelingstabel is niet aanvullend herschreven. | C4567-09 test; restant open. |
| SAM-15 | Niet afgerond | Geen nieuwe collegebrede integrerende-casuslinks toegevoegd. Alleen bestaande oefenroutes bleven beschikbaar. | Geen bronblokkade; implementatiepunt open. |
| SAM-16 | Deels aangepast | Geen nieuwe interne productietaal; pagina blijft Leerstof. Bestaande leerlingtekst is niet volledig op productietaal doorgelicht. | Zoek-/browsercontrole open. |

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
