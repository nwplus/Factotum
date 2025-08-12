/**
 * ID hints are linked to the Discord developer bot account.
 * Since we have separate dev and prod bot accounts, we need separate id hints.
 */

const devIdHints = {
  clearChat: "1402483606294630420",
  initBot: "1381884387972612129",
  startAddMembers: "1402483614603542649",
  startLoadQuestions: "1402483616302366791",
  startOrganizerCheckIn: "1402483603123863672",
  startPronouns: "1386121970944442559",
  startReport: "1402483690331705406",
  startTickets: "1402483611156086924",
  startTrivia: "1386423290645712967",
  startVerification: "1385475309876412540",
};

const prodIdHints = {
  clearChat: "1404733924453912677",
  initBot: "1404734015310925864",
  startAddMembers: "1404733927901495358",
  startLoadQuestions: "1404733929919090730",
  startOrganizerCheckIn: "1404733921614102548",
  startPronouns: "1404734013884858410",
  startReport: "1404734008872665128",
  startTickets: "1404733926160728084",
  startTrivia: "1404734018066448448",
  startVerification: "1404734012332965969",
};

export const idHints =
  process.env.NODE_ENV === "production" ? prodIdHints : devIdHints;
