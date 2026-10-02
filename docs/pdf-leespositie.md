# Leespositie van PDF's

De PDF-reader bewaart per bronbestand de pagina en leespositie lokaal. Bij het sluiten van het uitwerkingpaneel heeft de reader tijdelijk een breedte en hoogte van nul. Een berekening voor inhoudsbreedte mag dan niet worden uitgevoerd, ook niet als het ophalen van tekstgrenzen al was begonnen. Daarmee blijven de zoom en leespositie bij heropenen behouden.

Bij opnieuw aanmaken of herladen van de reader worden de opgeslagen paginacoördinaten één keer toegepast nadat alle pagina-afmetingen bekend zijn en de inhoudsbreedte aan de echte paneelbreedte is aangepast. Tussentijdse opstartposities overschrijven het opgeslagen leespunt niet. Expliciet naar een bronpagina gaan heeft voorrang op dit herstel. De bestaande opslag van arceringen en de opruiming van ongebruikte readers blijven behouden.

De browserregressie in `tests/pdf-position-browser.cjs` controleert tentamen- en uitwerking-PDF's op desktop en mobiel: sluiten, Escape, sluiten tijdens een lopende breedteberekening, opnieuw aanmaken na opruiming en herladen. Hiervoor worden uitsluitend tijdelijke browserprofielen gebruikt. De bestaande opruimtimer wordt binnen de test versneld.

Bronnen: [reader](https://github.com/HMA9K/BELRE3/blob/main/oefenen/pdf-reader/web/reader.mjs) en [inhoudsbreedte](https://github.com/HMA9K/BELRE3/blob/main/oefenen/pdf-reader/web/content-view.mjs).
