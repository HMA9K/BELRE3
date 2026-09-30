# BELRE3 Assistent

De assistent is ingericht voor de volledige leeromgeving. De server accepteert de geheime productievariabele `OPENAI_API_KEY` of de bestaande Cloudflare-binding `BELRE3 Assistent`. De standaardnaam heeft voorrang als beide zijn ingesteld. De actuele configuratiestatus staat op `/api/study-status`; daarnaast is een geslaagde antwoordproef nodig om de modelverbinding te bevestigen.

Op 30 september 2026 is de productieverbinding geactiveerd met de bestaande geheime binding. Vijf echte modelproeven zijn geslaagd; zie de controle hieronder.

## Gebruik en indeling

- Eén gesprek blijft in hetzelfde tabblad bestaan bij navigeren tussen alle oorspronkelijke pagina's, MC-vragen en tentamens. De context verandert mee; een lopend antwoord blijft gekoppeld aan de vraag waarbij het is aangevraagd.
- De bovenkant van het paneel volgt de onderkant van de actuele paginabanner. De banner blijft over de volle breedte staan. Dit geldt ook voor mobiel, een kort scherm, scrollen en veranderende lettergrootte.
- Op desktop deelt de inhoud de beschikbare ruimte met een verstelbaar paneel. Op mobiel opent de assistent onder de banner, met een sluitknop naar de pagina. De vraag en het gesprek blijven bewaard.
- Bij MC-vragen ontvangt de server de actuele keuze en de eigen geschreven uitwerking. Bij tentamens ontvangt hij de actuele editorinhoud en ondersteunde invoervelden. Samengestelde onderwerp- en collegereeksen blijven gekoppeld aan de originele bronvraag en bronrevisie. Tekeningen worden alleen als aanwezig gemeld, niet inhoudelijk beoordeeld.
- De server haalt casus, keuzes, correcte antwoord-ID en oefenmodel zelf uit de gecontroleerde vragenbank. Een revisiecontrole voorkomt dat oude pogingen stilzwijgend met gewijzigde modellen worden vergeleken.
- Een advies wijzigt geen opgeslagen antwoord of score. De vijf voorwaardelijke oefenmodellen behouden hun expliciete aannames.

## Bronnen en gesprek

De bronafbakening is exact `oefenen/content/sources.json`: 55 geselecteerde PDF's met 716 fysieke pagina's. `assistant/sources/pages.json` bevat de tekst per pagina. Bij 22 beeldpagina's is lokaal OCR toegepast; twee overige tekstloze pagina's zijn visueel als leeg gecontroleerd. `ocr-pages.json` koppelt elke aanvulling aan de volledige PDF-hash. Het extractiescript accepteert een instelbare bronmap en verwijdert persoonlijke downloadvermeldingen uit de tekstkopie.

De zoekfunctie selecteert passages uit alle documenten met woordweging en kan op verzoek een exacte PDF-pagina ophalen. Dit is een lokale tekstindex, geen semantische vectorindex. Het model krijgt relevante passages en kan maximaal twee aanvullende zoekrondes uitvoeren. Een beschikbaar document is niet hetzelfde als een volledig gelezen document. Klikbare citaties moeten verwijzen naar werkelijk opgehaalde pagina's.

De officiële vraagcontext en bronpassages zijn gegevens, geen opdrachten. De instructies onderscheiden historische uitwerkingen van oefenmodellen voor 2026. Vakinhoud wordt niet aangevuld met externe websites.

Berichten, concept, open toestand en paneelbreedte blijven in `sessionStorage`. De laatste twintig berichten, met maximaal 18.000 tekens, vormen de vervolgcontext. De gebruiker stemt eerst in met verzending van bericht, paginacontext en eigen antwoord naar OpenAI. De Responses API wordt aangeroepen met `store: false`. De applicatiedatabase bevat alleen gebruikstellers; geen gesprekken of ruwe IP-adressen.

## Toegang en beheer

De standaardperiode is gratis tot **woensdag 7 oktober 2026 om 00:00 uur in Europe/Amsterdam**, dus tot en met dinsdag 6 oktober. De instelbare servergrens is `2026-10-06T22:00:00.000Z`. De server controleert deze grens bij ieder verzoek, ook bij eerder afgegeven sessies. Daarna is de beheerderscode vereist.

| Instelling | Waarde of functie |
| --- | --- |
| `OPENAI_API_KEY` of `BELRE3 Assistent` | Geheime API-sleutel in Cloudflare Pages Production; de waarde blijft uitsluitend op de server |
| `OPENAI_MODEL` | `gpt-6-sol`, overeenkomstig de gecontroleerde CAFA2-configuratie |
| `OPENAI_REASONING_EFFORT` | `medium` |
| `STUDY_ASSISTANT_ENABLED` | `true` in productie; preview blijft uitgeschakeld |
| `STUDY_SESSION_SECRET` | Geheim voor ondertekende sessies |
| `STUDY_ACCESS_CODE` | Geheime beheerderscode voor toegang na de gratis periode |
| `STUDY_FREE_UNTIL` | Instelbaar einde van gratis toegang |
| `STUDY_DB` | D1-binding voor gebruikstellers, schema in `assistant/server/schema.sql` |
| `STUDY_DAILY_LIMIT` | Standaard 200 verzoeken per UTC-dag voor de hele omgeving |
| `STUDY_IP_DAILY_LIMIT` | Standaard 60 verzoeken per UTC-dag per gehashte IP-identificatie |
| `STUDY_GLOBAL_MINUTE_LIMIT` | Standaard 30 vragen per minuut voor de hele omgeving; optioneel instelbaar |
| `STUDY_IP_MINUTE_LIMIT` | Standaard 12 vragen per minuut per gehashte IP-identificatie, ook na het starten van een nieuwe sessie; optioneel instelbaar |

Daarnaast gelden zes vragen per sessie per minuut en acht aanmeldpogingen per IP-identificatie per kwartier. De korte limieten worden in D1 afgedwongen voordat een betaalde modelaanroep plaatsvindt. Een nieuwe sessie omzeilt de limiet per IP-identificatie niet. Bij een bereikte limiet geeft de server HTTP 429 met `Retry-After`; het bestaande dagbudget blijft van kracht. Een sessie duurt maximaal acht uur. Het modelverzoek heeft een totale wachttijdgrens van negentig seconden. Sessiecookies zijn ondertekend, `HttpOnly`, `Secure` en `SameSite=Strict`. Foutmeldingen bevatten geen sleutels of providerverzoeken. De noodschakelaar `STUDY_ASSISTANT_ENABLED=false` stopt alle nieuwe modelaanroepen. Een gedeelde toegangscode kan nog steeds worden doorgegeven; afzonderlijke codes per gebruiker zijn daarvoor de latere oplossing.

## Bouw en activering

1. Voer `npm run build` uit vanuit een schoon checkout. De build controleert bronhashes, paginatelling en onderwerpindeling, genereert de vraagcatalogus en maakt `dist` uitsluitend met websitebestanden. Voor een afzonderlijke lokale controlemappenset kan `BELRE_BUILD_OUTPUT` naar een nog niet bestaande uitvoermap verwijzen. Brontekstindex, beheerbestanden, tests en servercode staan niet in de openbare bestandenmap.
2. Laat Cloudflare Pages eerst `node tools/build-assistant.mjs` uitvoeren. Behoud de bestaande stappen voor bezoekstatistieken en privacy, maar laat die `dist` verwerken. Gebruik `dist` als uitvoermap.
3. Gebruik Node 22 en de voorbereide productieconfiguratie met de D1-binding, compatibiliteitsdatum `2026-09-30` en `nodejs_compat`. Voeg de API-sleutel als geheim toe, zonder hem in broncode, rapporten of gesprekken op te nemen.
4. Controleer de actuele openbare commit en voer eerst echte modelproeven uit: bronvraag, MC-keuze, actueel eigen tentamenantwoord, voorwaardelijk model en contextwisseling. Controleer ook bronlinks, gebruikslimieten en het einde van gratis toegang voordat de functie als actief wordt aangekondigd.

Voor een lokale weergave zonder modelverbinding: `python tools/serve-preview.py --port 8769`, daarna `/index.html`. De browserscripts accepteren alleen een lokale URL. Een bewuste paginaverversing herstelt het gesprek uit hetzelfde tabblad; gewone interne navigatie ververst de assistent niet.

## Controle op 30 september 2026

Er zijn 21 Node-controles en 14 Python-controles geslaagd. De browsercontrole in Chrome gebruikt herkenbare voorbeeldantwoorden en controleert navigatie tijdens een lopend verzoek, MC-keuze, actuele TinyMCE-inhoud, PDF openen/sluiten, rekenmachine, hulpmiddelenmenu en gespreksherstel. Er zijn bovendien 44 uitlijningscontroles uitgevoerd op de acht oorspronkelijke pagina's en vijf oefenroutes bij 1440, 1024 en 393 pixels breed, plus scrollen, verslepen en een kort scherm. De vraag- en tentamenroutes worden aanvullend tijdens de gebruikstest gecontroleerd. Het assistentpaneel gebruikt Arial.

Deze controles bewijzen de bediening en bronkoppeling. Echte modelproeven moeten afzonderlijk slagen voordat de verbinding als werkend wordt gemeld. Er is nog geen fysieke iPhone/Safari-controle gedaan.

### Echte modelproeven na activering

De openbare omgeving op commit `ad9ce4f04c8f2d8e49a3ed41c52a2045ae442d76` is gecontroleerd met vijf echte antwoorden via de ingestelde modeldienst. Alle verzoeken eindigden met HTTP 200. De gemeten antwoordtijd lag tussen 2,6 en 12,9 seconden. De gebruikte testinvoer was uitsluitend synthetisch en bevatte geen persoonlijke gegevens.

| Proef | Vastgesteld resultaat |
| --- | --- |
| Bronvraag tijdens navigeren | Antwoord bleef aan de oorspronkelijke pagina gekoppeld; de actuele paginacontext veranderde mee. |
| MC-vraag met onjuiste keuze | Getoonde antwoordletter en uitleg kwamen overeen met de canonieke vraag; interne optie-ID werd niet met de getoonde letter verwisseld. |
| Eigen tentamenuitwerking | De actuele editorinhoud werd beoordeeld; de correctie kwam overeen met het oefenmodel en de eigen tekst bleef ongewijzigd. |
| Voorwaardelijk oefenmodel | Beide aanvullende aannames en de onzekerheid zonder die aannames werden benoemd. |
| Nieuwe vraag na een andere casus | De actuele vraag werd beantwoord zonder feiten uit de eerdere casus over te nemen. |

Alle geretourneerde bronlinks verwezen naar bestaande PDF-bestanden met een specifieke pagina. De browser meldde geen JavaScript-fouten. De live status bevestigde 55 brondocumenten en gratis toegang tot de bestaande servergrens. Sessiegeheim, beheerderscode, databasebinding en gebruikslimieten zijn bij activering behouden. Deze steekproef bevestigt de verbinding en de geteste situaties; zij vervangt geen inhoudelijke controle van alle vragen.

## Technische bronnen

- [CAFA2 op gecontroleerde commit 93d3a4d](https://github.com/HMA9K/CAFA2/tree/93d3a4de49fe0f53c72cc44847723cd7abde45cb): vormgeving, veilige tekstweergave en servercontroles als basis.
- [OpenAI: conversation state](https://developers.openai.com/api/docs/guides/conversation-state) en [function calling](https://developers.openai.com/api/docs/guides/function-calling): vervolgcontext en gecontroleerde bronzoekacties.
- [Cloudflare: Pages Functions bindings](https://developers.cloudflare.com/pages/functions/bindings/) en [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/): geheime configuratie, databasebinding en begrensde serververzoeken.
