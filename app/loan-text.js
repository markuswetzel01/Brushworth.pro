// Brushworth.pro · Text des Leihvertrags (DE/EN). Wird von der Web-App und (als Kopie) von Code.gs genutzt.
// d: { artist, name, addr, from, to, value, buy, fee } – Datums- und Betragswerte bereits formatiert ('' = leer)
function loanText(lang, d) {
  const blank = '____________________';
  const v = x => x || blank;
  if (lang === 'en') return {
    title: 'Loan Agreement', sub: 'for a work of art',
    between: 'between', and: 'and',
    lender: 'Lender', borrower: 'Borrower', address: 'Address',
    lenderNote: '(hereinafter “Lender”)', borrowerNote: '(hereinafter “Borrower”)',
    work: ['Catalogue no.', 'Title', 'Artist', 'Year', 'Medium', 'Support', 'Dimensions'],
    s: [
      ['1. Object of the loan', 'The Lender lends the following work to the Borrower:'],
      ['2. Loan period', `The loan begins on ${v(d.from)} and ends on ${v(d.to)}. Any extension must be agreed in writing (email is sufficient). The Lender may recall the work early with 14 days’ notice.`],
      ['3. Use', 'The work will be displayed only in the Borrower’s premises at the address above. Moving it to another location, passing it on to third parties or exhibiting it publicly requires the Lender’s prior consent.'],
      ['4. Care', 'The Borrower will handle the work with care, protect it from direct sunlight, moisture, heat and smoke, and will not alter, clean, varnish or reframe it. Any damage or loss must be reported to the Lender immediately.'],
      ['5. Liability and insurance', `From handover until return, the Borrower is liable for loss of and damage to the work, irrespective of fault, up to the agreed value of ${v(d.value)}. The Borrower is asked to cover the work under their own insurance for this period.`],
      ['6. Transport', 'Transport, hanging and return are the Borrower’s responsibility, at the Borrower’s cost and risk, unless agreed otherwise.'],
      ['7. Loan fee', d.fee ? `The loan fee for the whole loan period is ${d.fee}.` : 'The loan is free of charge.'],
      ['8. Option to purchase', (d.buy ? `During the loan period the Borrower may purchase the work for ${d.buy}.` : 'If the Borrower wishes to purchase the work, the price will be agreed separately.')
        + (d.fee ? ' Any loan fee already paid will be credited against the purchase price.' : '') + ' Ownership passes on receipt of full payment. If the work is not purchased, it must be returned at the end of the loan period.'],
      ['9. Rights', 'Ownership and copyright remain with the Lender. Photographs of the work may be published only with the Lender’s consent.'],
      ['10. Final provisions', 'Changes and additions must be made in writing (email is sufficient). German law applies. Should any provision be invalid, the remainder of this agreement remains in effect.']
    ],
    condition: 'Condition at handover', sigPlace: 'Place, date', sigLender: 'Lender', sigBorrower: 'Borrower',
    file: 'Loan agreement', foot: a => 'Loan agreement · ' + a
  };
  return {
    title: 'Leihvertrag', sub: 'über ein Kunstwerk',
    between: 'zwischen', and: 'und',
    lender: 'Leihgeber', borrower: 'Leihnehmer', address: 'Anschrift',
    lenderNote: '(nachfolgend „Leihgeber“)', borrowerNote: '(nachfolgend „Leihnehmer“)',
    work: ['Werknummer', 'Titel', 'Künstler', 'Jahr', 'Technik', 'Untergrund', 'Maße'],
    s: [
      ['§ 1 Leihgegenstand', 'Der Leihgeber überlässt dem Leihnehmer das folgende Werk zur Leihe:'],
      ['§ 2 Leihdauer', `Die Leihe beginnt am ${v(d.from)} und endet am ${v(d.to)}. Eine Verlängerung bedarf der Textform (E-Mail genügt). Der Leihgeber kann das Werk mit einer Frist von 14 Tagen vorzeitig zurückverlangen.`],
      ['§ 3 Verwendung', 'Das Werk wird ausschließlich in den Räumen des Leihnehmers unter der oben genannten Anschrift gezeigt. Ein Ortswechsel, die Weitergabe an Dritte und eine öffentliche Ausstellung sind nur mit vorheriger Zustimmung des Leihgebers erlaubt.'],
      ['§ 4 Sorgfalt', 'Der Leihnehmer behandelt das Werk pfleglich, schützt es vor direkter Sonne, Feuchtigkeit, Hitze und Rauch und nimmt keine Veränderungen, Reinigungen oder Neurahmungen vor. Schäden oder Verlust meldet er dem Leihgeber unverzüglich.'],
      ['§ 5 Haftung und Versicherung', `Der Leihnehmer haftet von der Übergabe bis zur Rückgabe für Verlust und Beschädigung des Werks, auch ohne Verschulden, bis zur Höhe des vereinbarten Werts von ${v(d.value)}. Er wird gebeten, das Werk für diesen Zeitraum über eine eigene Versicherung abzusichern.`],
      ['§ 6 Transport', 'Transport, Aufhängung und Rückgabe übernimmt der Leihnehmer auf eigene Kosten und eigenes Risiko, sofern nichts anderes vereinbart ist.'],
      ['§ 7 Leihgebühr', d.fee ? `Die Leihgebühr für die gesamte Leihdauer beträgt ${d.fee}.` : 'Die Leihe ist unentgeltlich.'],
      ['§ 8 Kaufoption', (d.buy ? `Der Leihnehmer kann das Werk während der Leihdauer zum Preis von ${d.buy} erwerben.` : 'Möchte der Leihnehmer das Werk erwerben, wird der Preis gesondert vereinbart.')
        + (d.fee ? ' Eine bereits gezahlte Leihgebühr wird auf den Kaufpreis angerechnet.' : '') + ' Das Eigentum geht mit vollständiger Zahlung über. Wird das Werk nicht gekauft, ist es zum Ende der Leihdauer zurückzugeben.'],
      ['§ 9 Rechte', 'Eigentum und Urheberrecht verbleiben beim Leihgeber. Fotos des Werks dürfen nur mit Zustimmung des Leihgebers veröffentlicht werden.'],
      ['§ 10 Schlussbestimmungen', 'Änderungen und Ergänzungen bedürfen der Textform (E-Mail genügt). Es gilt deutsches Recht. Ist eine Bestimmung unwirksam, bleibt der Vertrag im Übrigen wirksam.']
    ],
    condition: 'Zustand bei Übergabe', sigPlace: 'Ort, Datum', sigLender: 'Leihgeber', sigBorrower: 'Leihnehmer',
    file: 'Leihvertrag', foot: a => 'Leihvertrag · ' + a
  };
}
