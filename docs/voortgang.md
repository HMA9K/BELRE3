# Centrale studievoortgang

Lokale uitbreiding, opgenomen in de lopende wijzigingenbundel. Nog niet gepubliceerd.

De ingang **Voortgang** opent `#voortgang/onderwerpen` in de oefenomgeving. Het overzicht volgt de 19 onderwerpen uit `oefenen/content/mc.json` en groepeert die onder de zes collegebundels. De bestaande MC-resultaten en tentamenresultaten blijven afzonderlijk bereikbaar.

## Betekenis van de tellingen

| Onderdeel | Beschikbaar | Beantwoord of bestudeerd |
| --- | --- | --- |
| MC en korte vragen | De 689 actieve vragen in de huidige bank | Een geldige antwoordkeuze, inclusief een eerdere eerste keuze bij opnieuw proberen. Eén telling per vraag, over alle opgeslagen reeksen. |
| Open tentamenvragen | De 336 gekoppelde bronvragen: 323 BELRE3 en 13 aanvullende Tax 2-vragen | Een ingevuld antwoord volgens dezelfde definitie als de tentamenomgeving, inclusief tekst, tekening en invoertabellen. Eén telling per oorspronkelijke bronvraag, over volledige tentamens en onderwerpselecties. |
| Leerstof | De 19 onderwerpen | Een expliciete studiemarkering. Alleen een pagina openen geeft geen markering. |

De indeling van open vragen volgt de bestaande bronopgavekoppelingen in `oefenen/content/course-map.json`. Een gemengde bronopgave kan meerdere onderwerpen bevatten. Die vragen tellen bij elk gekoppeld onderwerp mee; de totaaltelling gebruikt unieke bronvragen. College- en onderwerptellingen kunnen daarom niet zonder meer worden opgeteld.

Afgeronde én lopende pogingen tellen mee. Beantwoord betekent oefenactiviteit, geen beheersingsscore. Scores en antwoorden blijven in de bestaande resultaatpagina's staan. Oude vragen die niet meer in de actieve MC-bank staan, blijven in die resultaten bewaard en worden niet aan de huidige dekking toegevoegd.

## Markeren en bewaren

- `js/study-progress.mjs` bewaart expliciete markeringen onder de nieuwe sleutel `belre3-study-progress-v1`. Bestaande MC-, tentamen- en PDF-opslag wordt niet gemigreerd of overschreven door het overzicht.
- In de leeruitleg kan een tekstonderdeel per onderwerp worden afgevinkt. De drie onderwerpen die samen de tekst over winst en vermogensvergelijking delen, houden afzonderlijke markeringen.
- Voeging/ontvoeging omvat ook het tabblad antimisbruik. College 9 omvat de tabbladen toezicht, fiscale strategie en ethiek. Het centrale overzicht toont gedeeltelijke voortgang totdat alle bijbehorende tekstonderdelen zijn afgevinkt. Afvinken in het centrale overzicht markeert alle onderdelen van dat onderwerp.
- Markeringen worden vóór iedere wijziging opnieuw gelezen, zodat andere onderwerpen en wijzigingen uit andere tabbladen behouden blijven. De zichtbare voortgang reageert op wijzigingen uit andere pagina's en tabbladen.
- Beide bestaande opslagformaten voor tentamenpogingen worden alleen gelezen. Onleesbare opslag geeft een expliciete melding en geen misleidende nultelling. Niet-opgeslagen markeringen worden teruggedraaid in de bediening; eerder opgeslagen gegevens blijven behouden.
- De koppelingen **MC oefenen** en **Open vragen** kiezen meteen het betreffende onderwerp. Bij onderwerpen zonder bronopgave wordt geen lege oefenreeks aangeboden.

## Gecontroleerd

- `tests/course-progress.test.mjs`: unieke tellingen, historische MC-pogingen, herhalen, bronvraagidentiteit, gemengde opgaven, antwoordvormen, beide opslagformaten, volledige koppeling van alle 20 leestabbladen, gedeeltelijke markeringen en onleesbare of geblokkeerde opslag.
- Bestaande gerichte controles voor vraagselectie, tentamenopslag, bronkoppelingen, leeruitleg, wetsvensters en assistent blijven slagen.
- Browsercontrole op een afzonderlijke lokale testoorsprong: bestaande MC-keuze meegenomen; een ingevuld tentamenantwoord meegenomen en tijdelijke testtekst daarna verwijderd; centrale en tekstgebonden markeringen gesynchroniseerd; gedeeltelijk en volledig afvinken; navigatie met browserterug; onderwerpkeuze voor beide oefenvormen; mobiele kaarten op 393 pixels zonder horizontale overflow.
- Geen wijziging aan CAFA2 en geen commit of push uitgevoerd.
